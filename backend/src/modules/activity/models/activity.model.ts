import mongoose, { Model, Schema } from 'mongoose';
import {
  ACTIVITY_ACTION_TYPES,
  ACTIVITY_ENTITY_TYPES,
  ActivityActionType,
  ActivityActorRole,
  ActivityEntityType,
  ActivityVisibility,
} from '../types';

export interface IActivity {
  _id?: string | mongoose.Types.ObjectId;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
  description: string;
  actorId: string;
  actorName: string;
  actorRole: ActivityActorRole;
  projectRecordId: string | null;
  projectCode: string | null;
  projectName: string | null;
  visibility: ActivityVisibility;
  targetPath: string | null;
  timestamp: Date;
  createdAt?: Date;
}

export const ACTIVITY_RETENTION_DAYS = 60; // 2 months rolling backup/retention limit
export const ACTIVITY_RETENTION_SECONDS = ACTIVITY_RETENTION_DAYS * 24 * 60 * 60; // 5,184,000 seconds
export const ACTIVITY_RETENTION_MS = ACTIVITY_RETENTION_SECONDS * 1000;
export const ACTIVITY_CAPPED_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const ACTIVITY_CAPPED_MAX_DOCUMENTS = 50000; // max 50,000 documents

const ActivitySchema = new Schema<IActivity>(
  {
    actionType: {
      type: String,
      enum: ACTIVITY_ACTION_TYPES,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ACTIVITY_ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    entityLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    actorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'data_entry', 'public'],
      required: true,
      default: 'admin',
    },
    projectRecordId: {
      type: String,
      default: null,
      index: true,
    },
    projectCode: {
      type: String,
      default: null,
    },
    projectName: {
      type: String,
      default: null,
    },
    visibility: {
      type: String,
      enum: ['all', 'admin_only'],
      required: true,
      default: 'all',
      index: true,
    },
    targetPath: {
      type: String,
      default: null,
      maxlength: 260,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    capped: {
      size: ACTIVITY_CAPPED_SIZE_BYTES,
      max: ACTIVITY_CAPPED_MAX_DOCUMENTS,
    },
  },
);

ActivitySchema.index({ timestamp: -1, _id: -1 });
ActivitySchema.index({ visibility: 1, timestamp: -1 });
ActivitySchema.index({ entityType: 1, timestamp: -1 });
ActivitySchema.index({ actionType: 1, timestamp: -1 });
ActivitySchema.index({ actorId: 1, timestamp: -1 });
ActivitySchema.index({ projectRecordId: 1, timestamp: -1 });
ActivitySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: ACTIVITY_RETENTION_SECONDS },
);

export const ActivityModel: Model<IActivity> =
  mongoose.models.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema);

export const sharedActivityMemoryStore: Map<string, IActivity> = new Map();

export default ActivityModel;
