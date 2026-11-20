import mongoose, { Document, Model, Schema } from 'mongoose';
import { IBusinessActivity } from '../types';

export function normalizeActivityName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export type BusinessActivityDocument = Document & IBusinessActivity;

const BusinessActivitySchema = new Schema<BusinessActivityDocument>(
  {
    name: {
      type: String,
      required: [true, 'Activity name is required.'],
      trim: true,
      maxlength: [100, 'Activity name cannot exceed 100 characters.'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: { type: String, default: 'system' },
    createdByName: { type: String, default: 'System' },
    updatedBy: { type: String, default: 'system' },
    updatedByName: { type: String, default: 'System' },
  },
  {
    timestamps: true,
    collection: 'business_activities',
  },
);

BusinessActivitySchema.pre('validate', function () {
  if (this.name) {
    this.normalizedName = normalizeActivityName(this.name);
  }
});

BusinessActivitySchema.index({ normalizedName: 1 }, { unique: true });

export const BusinessActivityModel: Model<BusinessActivityDocument> =
  mongoose.models.BusinessActivity ||
  mongoose.model<BusinessActivityDocument>(
    'BusinessActivity',
    BusinessActivitySchema,
  );

export const sharedBusinessActivityMemoryStore = new Map<
  string,
  IBusinessActivity
>();
