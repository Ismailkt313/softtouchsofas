import mongoose, { Schema, Model, Types } from 'mongoose';

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Card',
  'Other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['valid', 'reversed'] as const;
export type PaymentRecordStatus = (typeof PAYMENT_STATUSES)[number];

export interface IProjectPayment {
  _id?: string | Types.ObjectId;
  projectId: string; // Project ID code e.g. "PRJ-0001"
  projectRefId: Types.ObjectId; // MongoDB _id of Project
  paymentReference: string; // Sequential identifier e.g. "PAY-0001"
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  status: PaymentRecordStatus;
  reversalReason?: string;
  reversedBy?: string;
  reversedByName?: string;
  reversedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectPaymentSchema = new Schema<IProjectPayment>(
  {
    projectId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    projectRefId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero.'],
    },
    paymentDate: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
      default: 'Bank Transfer',
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: String,
      required: true,
      trim: true,
    },
    recordedByName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: 'valid',
      index: true,
    },
    reversalReason: {
      type: String,
      trim: true,
      default: '',
    },
    reversedBy: {
      type: String,
      trim: true,
      default: '',
    },
    reversedByName: {
      type: String,
      trim: true,
      default: '',
    },
    reversedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'project_payments',
  },
);

ProjectPaymentSchema.index({ projectRefId: 1, status: 1, paymentDate: -1 });
ProjectPaymentSchema.index({ projectId: 1, status: 1 });

export const ProjectPaymentModel: Model<IProjectPayment> =
  mongoose.models.ProjectPayment ||
  mongoose.model<IProjectPayment>('ProjectPayment', ProjectPaymentSchema);

export const PROJECT_PAYMENT_COUNTER_ID = 'project_payment_code';

export function formatPaymentSequenceCode(seq: number): string {
  if (!Number.isInteger(seq) || seq <= 0) {
    throw new Error('Payment sequence number must be a positive integer.');
  }
  return `PAY-${String(seq).padStart(4, '0')}`;
}

export default ProjectPaymentModel;
