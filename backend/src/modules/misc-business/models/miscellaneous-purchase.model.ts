import mongoose, { Document, Model, Schema } from 'mongoose';
import { IMiscellaneousPurchase } from '../types';

export type MiscellaneousPurchaseDocument = Document & IMiscellaneousPurchase;

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
  },
  { _id: false },
);

const MiscellaneousPurchaseSchema = new Schema<MiscellaneousPurchaseDocument>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    purchaseDate: {
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
    supplierName: {
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
    collection: 'miscellaneous_purchases',
  },
);

MiscellaneousPurchaseSchema.index({ purchaseDate: -1, createdAt: -1 });
MiscellaneousPurchaseSchema.index({ activityId: 1, purchaseDate: -1 });

export const MiscellaneousPurchaseModel: Model<MiscellaneousPurchaseDocument> =
  mongoose.models.MiscellaneousPurchase ||
  mongoose.model<MiscellaneousPurchaseDocument>(
    'MiscellaneousPurchase',
    MiscellaneousPurchaseSchema,
  );

export const sharedMiscellaneousPurchaseMemoryStore = new Map<
  string,
  IMiscellaneousPurchase
>();
