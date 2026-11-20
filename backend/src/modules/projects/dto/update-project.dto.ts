import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategory,
  ProjectStatus,
} from '../models/project.model';
import { normalizeStatusInput } from './update-status.dto';
import { ValidationResult } from './create-project.dto';

export interface UpdateProjectDto {
  name?: string;
  clientName?: string;
  category?: ProjectCategory;
  status?: ProjectStatus;
  description?: string;
  contractValue?: number | null;
  costAlertThresholdPercent?: number;
  creationDate?: Date;
}

const FORBIDDEN_MANUAL_ID_KEYS = [
  'projectId',
  'projectCode',
  'project_id',
  'project_code',
  'code',
  'id',
  '_id',
  'createdAt',
  'created_at',
] as const;

export function validateUpdateProjectDto(
  body: unknown,
): ValidationResult<UpdateProjectDto> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: {
        body: 'Request body must be a valid JSON object.',
      },
    };
  }

  const raw = body as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const updateValue: UpdateProjectDto = {};

  for (const key of FORBIDDEN_MANUAL_ID_KEYS) {
    if (raw[key] !== undefined) {
      errors[key] = `${key} is immutable and cannot be modified.`;
      break;
    }
  }

  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      errors.name = 'Project name must be a non-empty string.';
    } else if (raw.name.trim().length > 200) {
      errors.name = 'Project name cannot exceed 200 characters.';
    } else {
      updateValue.name = raw.name.trim();
    }
  }

  if (raw.clientName !== undefined) {
    if (typeof raw.clientName !== 'string' || !raw.clientName.trim()) {
      errors.clientName = 'Client name must be a non-empty string.';
    } else if (raw.clientName.trim().length > 200) {
      errors.clientName = 'Client name cannot exceed 200 characters.';
    } else {
      updateValue.clientName = raw.clientName.trim();
    }
  }

  if (raw.category !== undefined) {
    if (typeof raw.category === 'string') {
      const trimmedCategory = raw.category.trim();
      if (trimmedCategory.length >= 2 && trimmedCategory.length <= 100) {
        updateValue.category = trimmedCategory;
      } else {
        errors.category = 'Category must be between 2 and 100 characters.';
      }
    } else {
      errors.category = 'Category must be a string.';
    }
  }

  if (raw.status !== undefined) {
    const normalized = normalizeStatusInput(raw.status);
    if (normalized) {
      updateValue.status = normalized;
    } else {
      errors.status = `Status must be one of: ${PROJECT_STATUSES.join(', ')}.`;
    }
  }

  if (raw.description !== undefined) {
    if (typeof raw.description !== 'string') {
      errors.description = 'Description must be a string.';
    } else if (raw.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    } else {
      updateValue.description = raw.description.trim();
    }
  }

  if (raw.contractValue !== undefined) {
    if (raw.contractValue === null || raw.contractValue === '') {
      updateValue.contractValue = null;
    } else {
      const parsedContractValue =
        typeof raw.contractValue === 'number'
          ? raw.contractValue
          : typeof raw.contractValue === 'string' && raw.contractValue.trim() !== ''
            ? Number(raw.contractValue)
            : Number.NaN;

      if (!Number.isFinite(parsedContractValue) || parsedContractValue < 0) {
        errors.contractValue = 'Contract value must be a finite number greater than or equal to 0.';
      } else {
        updateValue.contractValue =
          Math.round((parsedContractValue + Number.EPSILON) * 100) / 100;
      }
    }
  }

  if (raw.creationDate !== undefined) {
    if (raw.creationDate === null || raw.creationDate === '') {
      errors.creationDate = 'Creation date cannot be empty.';
    } else if (raw.creationDate instanceof Date) {
      if (Number.isNaN(raw.creationDate.getTime())) {
        errors.creationDate = 'Creation date must be a valid date.';
      } else {
        updateValue.creationDate = raw.creationDate;
      }
    } else if (typeof raw.creationDate === 'string') {
      const trimmed = raw.creationDate.trim();
      const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1;
        const d = parseInt(match[3], 10);
        const parsed = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
        if (Number.isNaN(parsed.getTime())) {
          errors.creationDate = 'Creation date must be a valid date.';
        } else {
          updateValue.creationDate = parsed;
        }
      } else {
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
          errors.creationDate = 'Creation date must be a valid date.';
        } else {
          updateValue.creationDate = parsed;
        }
      }
    } else {
      errors.creationDate = 'Creation date must be a valid date.';
    }
  }

  if (raw.costAlertThresholdPercent !== undefined) {
    const parsedThreshold =
      typeof raw.costAlertThresholdPercent === 'number'
        ? raw.costAlertThresholdPercent
        : typeof raw.costAlertThresholdPercent === 'string' &&
            raw.costAlertThresholdPercent.trim() !== ''
          ? Number(raw.costAlertThresholdPercent)
          : Number.NaN;

    if (
      !Number.isFinite(parsedThreshold) ||
      parsedThreshold <= 0 ||
      parsedThreshold >= 100
    ) {
      errors.costAlertThresholdPercent =
        'Cost alert warning threshold must be greater than 0 and less than 100.';
    } else {
      updateValue.costAlertThresholdPercent =
        Math.round((parsedThreshold + Number.EPSILON) * 100) / 100;
    }
  }

  if (
    Object.keys(errors).length === 0 &&
    Object.keys(updateValue).length === 0
  ) {
    errors.body =
      'At least one editable project field (name, clientName, category, status, description, contractValue, costAlertThresholdPercent, or creationDate) must be provided.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    value: updateValue,
  };
}
