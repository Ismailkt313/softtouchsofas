import mongoose, { Model, Schema } from 'mongoose';
import { RAW_MATERIAL_UNITS, RawMaterialUnit } from './raw-material.model';

export type StockMovementType = 'project_consumption' | 'stock_adjustment_increase' | 'stock_adjustment_decrease';
export interface IStockMovement {
  _id?: string | mongoose.Types.ObjectId;
  idempotencyKey: string;
  materialId: string;
  materialName: string;
  unit: RawMaterialUnit;
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  notes: string;
  projectId?: string;
  projectRecordId?: string;
  projectName?: string;
  performedBy: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>({
  idempotencyKey: { type: String, required: true, unique: true, immutable: true },
  materialId: { type: String, required: true, index: true, immutable: true },
  materialName: { type: String, required: true, immutable: true },
  unit: { type: String, enum: RAW_MATERIAL_UNITS, required: true, immutable: true },
  movementType: { type: String, enum: ['project_consumption', 'stock_adjustment_increase', 'stock_adjustment_decrease'], required: true, immutable: true },
  quantity: { type: Number, required: true, min: 0, immutable: true },
  previousQuantity: { type: Number, required: true, min: 0, immutable: true },
  newQuantity: { type: Number, required: true, min: 0, immutable: true },
  reason: { type: String, required: true, immutable: true },
  notes: { type: String, default: '', maxlength: 1000, immutable: true },
  projectId: { type: String, default: '', immutable: true },
  projectRecordId: { type: String, default: '', index: true, immutable: true },
  projectName: { type: String, default: '', immutable: true },
  performedBy: { type: String, required: true, immutable: true },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { versionKey: false });
StockMovementSchema.index({ materialId: 1, createdAt: -1 });
StockMovementSchema.index({ projectRecordId: 1, movementType: 1 });
export const StockMovementModel: Model<IStockMovement> = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
export const sharedStockMovementMemoryStore = new Map<string, IStockMovement>();
