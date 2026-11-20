import {
  normalizeProjectCategoryName,
  normalizeProjectCategoryKey,
} from '../models/project-category.model';

export interface CreateProjectCategoryDto {
  name: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

export function validateCreateProjectCategoryDto(
  rawBody: unknown,
): ValidationResult<CreateProjectCategoryDto> {
  const errors: Record<string, string> = {};

  if (!rawBody || typeof rawBody !== 'object') {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const body = rawBody as Record<string, unknown>;
  const cleanName = normalizeProjectCategoryName(body.name);

  if (!cleanName) {
    errors.name = 'Category name is required.';
  } else if (cleanName.length < 2) {
    errors.name = 'Category name must be at least 2 characters.';
  } else if (cleanName.length > 100) {
    errors.name = 'Category name cannot exceed 100 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      name: cleanName,
    },
  };
}
