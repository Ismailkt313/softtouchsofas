import mongoose from 'mongoose';
import { isMongoTransactionSupported, isTransactionUnsupportedError } from '../../../config/db';
import { activityService } from '../../activity';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import { RawMaterialModel, sharedRawMaterialMemoryStore } from '../models/raw-material.model';
import { IStockMovement, StockMovementModel, sharedStockMovementMemoryStore } from '../models/stock-movement.model';
import { PurchaseStockMovementModel, sharedPurchaseStockMovementMemoryStore } from '../../purchases/models/purchase-stock-movement.model';

const adjustmentReasons = ['physical_count', 'damaged_material', 'supplier_return', 'correction', 'other'];
const locks = new Map<string, Promise<void>>();
async function serialized<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) || Promise.resolve(); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }); const chained = previous.then(() => gate); locks.set(id, chained); await previous;
  try { return await operation(); } finally { release(); if (locks.get(id) === chained) locks.delete(id); }
}
function finitePos(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0; }

export async function adjustStock(req: AuthenticatedRequest, res: Response): Promise<void> {
  const materialId = String(req.params.id || ''); let body = req.body || {};
  if (!mongoose.isValidObjectId(materialId)) { res.status(400).json({ message: 'A valid raw material ID is required.' }); return; }
  if (body.direction === undefined && (typeof body.quantityOnHand === 'number' || typeof body.quantityOnHand === 'string')) {
    const current = mongoose.connection.readyState === 1 ? await RawMaterialModel.findById(materialId).lean() : sharedRawMaterialMemoryStore.get(materialId);
    if (!current) { res.status(404).json({ message: 'Raw material not found.' }); return; }
    const target = Number(body.quantityOnHand); const previous = Number(current.quantityOnHand || 0);
    if (!Number.isFinite(target) || target < 0) { res.status(400).json({ message: 'Stock quantity must be non-negative.' }); return; }
    if (target === previous) { res.status(200).json({ message: 'Stock is unchanged.', rawMaterial: current }); return; }
    body = { direction: target > previous ? 'increase' : 'decrease', quantity: Math.abs(target - previous), reason: 'correction', notes: typeof body.reason === 'string' ? body.reason : '' };
  }
  const errors: Record<string, string> = {};
  if (!['increase', 'decrease'].includes(body.direction)) errors.direction = 'Choose increase or decrease.';
  if (!finitePos(body.quantity)) errors.quantity = 'Quantity must be greater than zero.';
  if (!adjustmentReasons.includes(body.reason)) errors.reason = 'Choose a permitted non-project adjustment reason.';
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 1000)) errors.notes = 'Notes must be 1000 characters or fewer.';
  if (Object.keys(errors).length) { res.status(400).json({ message: 'Validation failed.', errors }); return; }
  try {
    const result = await serialized(materialId, async () => {
      const delta = body.direction === 'increase' ? body.quantity : -body.quantity;
      if (mongoose.connection.readyState === 1) {
        if (isMongoTransactionSupported()) {
          try {
            const session = await mongoose.startSession(); let material: any;
            try { await session.withTransaction(async () => {
              material = await RawMaterialModel.findById(materialId).session(session);
              if (!material) throw new Error('NOT_FOUND');
              const old = Number(material.quantityOnHand || 0); if (old + delta < 0) throw new Error(`INSUFFICIENT:${material.name}:${old}`);
              const update = await RawMaterialModel.updateOne({ _id: materialId, quantityOnHand: old }, { $inc: { quantityOnHand: delta } }, { session });
              if (update.modifiedCount !== 1) throw new Error('CONCURRENT_STOCK');
              const movement: IStockMovement = { idempotencyKey: `adjustment:${new mongoose.Types.ObjectId().toHexString()}`, materialId, materialName: material.name, unit: material.unit, movementType: delta > 0 ? 'stock_adjustment_increase' : 'stock_adjustment_decrease', quantity: body.quantity, previousQuantity: old, newQuantity: old + delta, reason: body.reason, notes: body.notes?.trim() || '', performedBy: req.user?.email || req.user?.id || 'unknown', createdAt: new Date() };
              await StockMovementModel.create([movement], { session });
              material = { ...material.toObject(), quantityOnHand: old + delta };
            }); } finally { await session.endSession(); }
            return material;
          } catch (error) {
            if (!isTransactionUnsupportedError(error)) {
              throw error;
            }
          }
        }
        // Standalone MongoDB (serialized already locks materialId)
        let material = await RawMaterialModel.findById(materialId);
        if (!material) throw new Error('NOT_FOUND');
        const old = Number(material.quantityOnHand || 0); if (old + delta < 0) throw new Error(`INSUFFICIENT:${material.name}:${old}`);
        const update = await RawMaterialModel.updateOne({ _id: materialId, quantityOnHand: old }, { $inc: { quantityOnHand: delta } });
        if (update.modifiedCount !== 1) throw new Error('CONCURRENT_STOCK');
        const movement: IStockMovement = { idempotencyKey: `adjustment:${new mongoose.Types.ObjectId().toHexString()}`, materialId, materialName: material.name, unit: material.unit, movementType: delta > 0 ? 'stock_adjustment_increase' : 'stock_adjustment_decrease', quantity: body.quantity, previousQuantity: old, newQuantity: old + delta, reason: body.reason, notes: body.notes?.trim() || '', performedBy: req.user?.email || req.user?.id || 'unknown', createdAt: new Date() };
        await StockMovementModel.create([movement]);
        return { ...material.toObject(), quantityOnHand: old + delta };
      }
      const material = sharedRawMaterialMemoryStore.get(materialId);
      if (!material) throw new Error('NOT_FOUND');
      const old = Number(material.quantityOnHand || 0); if (old + delta < 0) throw new Error(`INSUFFICIENT:${material.name}:${old}`);
      material.quantityOnHand = old + delta; material.updatedAt = new Date();
      const idempotencyKey = `adjustment:${new mongoose.Types.ObjectId().toHexString()}`;
      sharedStockMovementMemoryStore.set(idempotencyKey, { _id: new mongoose.Types.ObjectId(), idempotencyKey, materialId, materialName: material.name, unit: material.unit, movementType: delta > 0 ? 'stock_adjustment_increase' : 'stock_adjustment_decrease', quantity: body.quantity, previousQuantity: old, newQuantity: old + delta, reason: body.reason, notes: body.notes?.trim() || '', performedBy: req.user?.email || req.user?.id || 'unknown', createdAt: new Date() });
      return material;
    });
    await activityService.recordSafe({ actionType: 'material.stock_adjusted', entityType: 'material', entityId: materialId, entityLabel: result.name, description: `Adjusted stock of ${result.name} by ${body.quantity} ${result.unit} (${body.direction}; ${body.reason}).`, actorId: req.user?.id || req.user?.email || 'unknown', actorName: req.user?.name || req.user?.email || 'Workspace User', actorRole: req.user?.role === 'admin' ? 'admin' : 'data_entry', targetPath: `/raw-materials?material=${encodeURIComponent(materialId)}` });
    res.status(200).json({ message: 'Stock adjustment recorded.', rawMaterial: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'NOT_FOUND') { res.status(404).json({ message: 'Raw material not found.' }); return; }
    if (message.startsWith('INSUFFICIENT:')) { const [, name, available] = message.split(':'); res.status(409).json({ message: `Insufficient stock for ${name}. Available: ${available}.` }); return; }
    if (message === 'CONCURRENT_STOCK') { res.status(409).json({ message: 'Stock changed concurrently. Refresh and try again.' }); return; }
    res.status(500).json({ message: 'Unable to record stock adjustment.' });
  }
}

export async function listMovements(req: Request, res: Response): Promise<void> {
  const materialId = String(req.params.id || ''); const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const type = typeof req.query.type === 'string' ? req.query.type : ''; const from = typeof req.query.from === 'string' ? new Date(req.query.from) : null; const to = typeof req.query.to === 'string' ? new Date(req.query.to) : null;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
  const generic = mongoose.connection.readyState === 1 ? await StockMovementModel.find({ materialId }).lean() : [...sharedStockMovementMemoryStore.values()].filter(x => x.materialId === materialId);
  const purchases = mongoose.connection.readyState === 1 ? await PurchaseStockMovementModel.find({ materialId }).lean() : [...sharedPurchaseStockMovementMemoryStore.values()].filter(x => x.materialId === materialId);
  const all = [...generic.map((m: any) => ({ id: String(m._id || m.idempotencyKey), movementType: m.movementType, quantity: m.quantity, previousQuantity: m.previousQuantity, newQuantity: m.newQuantity, reason: m.reason, notes: m.notes || '', projectId: m.projectId || '', projectName: m.projectName || '', voucherId: '', voucherNumber: '', performedBy: m.performedBy, createdAt: m.createdAt })), ...purchases.map((m: any) => ({ id: String(m._id), movementType: m.movementType, quantity: Math.abs(Number(m.quantityDelta)), previousQuantity: Number(m.resultingQuantityOnHand) - Number(m.quantityDelta), newQuantity: Number(m.resultingQuantityOnHand), reason: m.movementType === 'purchase_cancelled' ? 'Purchase voucher cancelled' : 'Posted purchase voucher', notes: '', projectId: '', projectName: '', voucherId: m.voucherId, voucherNumber: m.voucherNumber, performedBy: m.performedBy, createdAt: m.createdAt }))];
  const filtered = all.filter(m => (!type || m.movementType === type) && (!from || Number.isNaN(from.getTime()) || new Date(m.createdAt).getTime() >= from.getTime()) && (!to || Number.isNaN(to.getTime()) || new Date(m.createdAt).getTime() <= to.getTime())).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length; res.status(200).json({ items: filtered.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
}
