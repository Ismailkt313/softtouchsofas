import mongoose, { Model, Schema } from 'mongoose';

export const DEFAULT_PROJECT_CATEGORIES: ReadonlyArray<string> = Object.freeze([
  'Modular Sofa',
  'Curtains',
  'Armchair',
  'Bespoke Interior',
]);

export function normalizeProjectCategoryName(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizeProjectCategoryKey(raw: unknown): string {
  return normalizeProjectCategoryName(raw).toLowerCase();
}

export interface IProjectCategory {
  _id?: string | mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  isPredefined: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const sharedProjectCategoryMemoryStore = new Map<
  string,
  IProjectCategory
>();

const ProjectCategorySchema = new Schema<IProjectCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    isPredefined: {
      type: Boolean,
      default: false,
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
  },
  {
    timestamps: true,
  },
);

ProjectCategorySchema.pre('validate', function () {
  if (this.name) {
    this.name = normalizeProjectCategoryName(this.name);
    this.normalizedName = normalizeProjectCategoryKey(this.name);
  }
});

export const ProjectCategoryModel: Model<IProjectCategory> =
  (mongoose.models.ProjectCategory as Model<IProjectCategory>) ||
  mongoose.model<IProjectCategory>('ProjectCategory', ProjectCategorySchema);
