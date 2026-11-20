import mongoose, { Model, Schema } from 'mongoose';
import { ISupplier } from '../types';

export function normalizeSupplierName(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizeSupplierKey(raw: unknown): string {
  return normalizeSupplierName(raw).toLowerCase();
}

export const sharedSupplierMemoryStore = new Map<string, ISupplier>();

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 50,
    },
    email: {
      type: String,
      trim: true,
      default: '',
      lowercase: true,
      maxlength: 150,
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: '',
      uppercase: true,
      maxlength: 50,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    createdByName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

SupplierSchema.pre('validate', function () {
  if (this.name) {
    this.name = normalizeSupplierName(this.name);
    this.normalizedName = normalizeSupplierKey(this.name);
  }
});

export const SupplierModel: Model<ISupplier> =
  (mongoose.models.Supplier as Model<ISupplier>) ||
  mongoose.model<ISupplier>('Supplier', SupplierSchema);
