import mongoose, { Document, Model, Schema } from 'mongoose';
import { IMiscellaneousSale } from '../types';

export type MiscellaneousSaleDocument = Document & IMiscellaneousSale;

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
  },
  { _id: false },
);

const MiscellaneousSaleSchema = new Schema<MiscellaneousSaleDocument>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    salesDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    activityId: {
      type: String,
      required: [true, 'Business Activity is required.'],
      index: true,
    },
    activityName: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [0.01, 'Amount must be greater than zero.'],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other', ''],
      default: 'Cash',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
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
    collection: 'miscellaneous_sales',
  },
);

MiscellaneousSaleSchema.index({ salesDate: -1, createdAt: -1 });
MiscellaneousSaleSchema.index({ activityId: 1, salesDate: -1 });

export const MiscellaneousSaleModel: Model<MiscellaneousSaleDocument> =
  mongoose.models.MiscellaneousSale ||
  mongoose.model<MiscellaneousSaleDocument>(
    'MiscellaneousSale',
    MiscellaneousSaleSchema,
  );

export const sharedMiscellaneousSaleMemoryStore = new Map<
  string,
  IMiscellaneousSale
>();
