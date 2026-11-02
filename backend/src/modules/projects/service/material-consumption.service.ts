import mongoose from 'mongoose';
import { RawMaterialModel, sharedRawMaterialMemoryStore } from '../../raw-materials/models/raw-material.model';
import { StockMovementModel, sharedStockMovementMemoryStore } from '../../raw-materials/models/stock-movement.model';
import { ProjectModel, sharedProjectMemoryStore } from '../models/project.model';

export interface ConsumptionLineInput { materialId: string; quantity: number; notes?: string }
export class MaterialConsumptionError extends Error { constructor(message: string, public statusCode = 400) { super(message); this.name = 'MaterialConsumptionError'; } }
const locks = new Map<string, Promise<void>>();
async function lock<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
  const sorted = [...new Set(keys)].sort(); const releases: Array<() => void> = [];
  for (const key of sorted) {
    const prior = locks.get(key) || Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const chained = prior.then(() => gate, () => gate);
    locks.set(key, chained);
    await prior.catch(() => undefined);
    releases.push(() => { release(); if (locks.get(key) === chained) locks.delete(key); });
  }
  try { return await fn(); } finally { releases.reverse().forEach(release => release()); }
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export class ProjectMaterialConsumptionService {
  async complete(identifier: string, lines: ConsumptionLineInput[], actor: string) {
    const isDb = mongoose.connection.readyState === 1;
    if (isDb) {
      const session = await mongoose.startSession();
      try {
        let result: any;
        await session.withTransaction(async () => { result = await this.completeMongo(identifier, lines, actor, session); });
        return result;
      } finally { await session.endSession(); }
    }
    const project = [...sharedProjectMemoryStore.values()].find(p => String(p._id) === identifier || p.projectId.toLowerCase() === identifier.toLowerCase());
    if (!project) throw new MaterialConsumptionError('Project not found.', 404);
    const recordId = String(project._id);
    return lock([`project:${recordId}`, ...lines.map(l => `material:${l.materialId}`)], async () => {
      if (project.status === 'Completed') return project;
      if ((project as any).materialsConsumptionRecorded) { project.status = 'Completed'; project.updatedAt = new Date(); return project; }
      const aggregated = this.validateLines(lines);
      const updatedMaterials: Array<{ material: any; oldQty: number; qty: number }> = [];
      for (const [id, line] of aggregated) {
        const material = sharedRawMaterialMemoryStore.get(id);
        if (!material || !material.isActive) throw new MaterialConsumptionError(`Material ${id} is unavailable.`, 400);
        const oldQty = Number(material.quantityOnHand || 0);
        if (oldQty < line.quantity) throw new MaterialConsumptionError(`Insufficient stock for ${material.name}. Available ${oldQty} ${material.unit}; requested ${line.quantity}.`, 409);
        updatedMaterials.push({ material, oldQty, qty: line.quantity });
      }
      const now = new Date();
      for (const item of updatedMaterials) {
        item.material.quantityOnHand = round(item.oldQty - item.qty); item.material.updatedAt = now;
        const id = String(item.material._id);
        const req = aggregated.get(id)!;
        const movement = { _id: new mongoose.Types.ObjectId(), idempotencyKey: `project:${recordId}:${id}`, materialId: id, materialName: item.material.name, unit: item.material.unit, movementType: 'project_consumption' as const, quantity: item.qty, previousQuantity: item.oldQty, newQuantity: item.material.quantityOnHand, reason: 'Project material consumption', notes: req.notes || '', projectId: project.projectId, projectRecordId: recordId, projectName: project.name, performedBy: actor, createdAt: now };
        sharedStockMovementMemoryStore.set(movement.idempotencyKey, movement);
      }
      (project as any).materialsUsed = updatedMaterials.map(item => { const id = String(item.material._id); const req = aggregated.get(id)!; return { materialId: id, materialName: item.material.name, unit: item.material.unit, quantity: item.qty, notes: req.notes || '' }; });
      (project as any).materialsConsumptionRecorded = true; project.status = 'Completed'; project.updatedAt = now;
      return project;
    });
  }

  private validateLines(lines: ConsumptionLineInput[]) {
    if (!Array.isArray(lines)) throw new MaterialConsumptionError('Material lines must be an array.');
    const aggregated = new Map<string, { quantity: number; notes: string }>();
    for (const [index, line] of lines.entries()) {
      if (!line || typeof line.materialId !== 'string' || !/^[a-f\d]{24}$/i.test(line.materialId)) throw new MaterialConsumptionError(`Line ${index + 1}: choose a valid material.`);
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new MaterialConsumptionError(`Line ${index + 1}: quantity must be greater than zero.`);
      if (line.notes && (typeof line.notes !== 'string' || line.notes.length > 500)) throw new MaterialConsumptionError(`Line ${index + 1}: notes cannot exceed 500 characters.`);
      const current = aggregated.get(line.materialId) || { quantity: 0, notes: '' };
      current.quantity = round(current.quantity + line.quantity); current.notes = [current.notes, line.notes?.trim()].filter(Boolean).join('; ').slice(0, 500);
      aggregated.set(line.materialId, current);
    }
    return aggregated;
  }

  private async completeMongo(identifier: string, lines: ConsumptionLineInput[], actor: string, session: mongoose.ClientSession) {
    const projectFilter = mongoose.isValidObjectId(identifier)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(identifier) }, { projectId: identifier.toUpperCase() }] }
      : { projectId: identifier.toUpperCase() };
    const project = await ProjectModel.findOne(projectFilter).session(session);
    if (!project) throw new MaterialConsumptionError('Project not found.', 404);
    if (project.status === 'Completed') return project.toObject();
    if ((project as any).materialsConsumptionRecorded) {
      const reCompleted = await ProjectModel.findOneAndUpdate({ _id: project._id, status: { $ne: 'Completed' }, materialsConsumptionRecorded: true }, { $set: { status: 'Completed' } }, { new: true, session });
      return (reCompleted || project).toObject();
    }
    const aggregated = this.validateLines(lines);
    const docs = await RawMaterialModel.find({ _id: { $in: [...aggregated.keys()] }, isActive: true }).session(session);
    if (docs.length !== aggregated.size) throw new MaterialConsumptionError('One or more selected materials are unavailable.', 400);
    const records: any[] = [];
    const used: any[] = [];
    for (const material of docs) {
      const id = String(material._id); const line = aggregated.get(id)!; const oldQty = Number(material.quantityOnHand || 0);
      if (oldQty < line.quantity) throw new MaterialConsumptionError(`Insufficient stock for ${material.name}. Available ${oldQty} ${material.unit}; requested ${line.quantity}.`, 409);
      const update = await RawMaterialModel.updateOne({ _id: material._id, quantityOnHand: { $gte: line.quantity } }, { $inc: { quantityOnHand: -line.quantity } }, { session });
      if (update.modifiedCount !== 1) throw new MaterialConsumptionError(`Insufficient stock for ${material.name}; stock changed while completing this project.`, 409);
      const newQty = round(oldQty - line.quantity); const now = new Date();
      records.push({ idempotencyKey: `project:${project._id}:${id}`, materialId: id, materialName: material.name, unit: material.unit, movementType: 'project_consumption', quantity: line.quantity, previousQuantity: oldQty, newQuantity: newQty, reason: 'Project material consumption', notes: line.notes, projectId: project.projectId, projectRecordId: String(project._id), projectName: project.name, performedBy: actor, createdAt: now });
      used.push({ materialId: id, materialName: material.name, unit: material.unit, quantity: line.quantity, notes: line.notes });
    }
    if (records.length) await StockMovementModel.insertMany(records, { session, ordered: true });
    const updated = await ProjectModel.findOneAndUpdate({ _id: project._id, status: { $ne: 'Completed' }, materialsConsumptionRecorded: { $ne: true } }, { $set: { status: 'Completed', materialsUsed: used, materialsConsumptionRecorded: true } }, { new: true, session });
    if (!updated) throw new MaterialConsumptionError('Project was completed concurrently; no additional stock was deducted.', 409);
    return updated.toObject();
  }
}
