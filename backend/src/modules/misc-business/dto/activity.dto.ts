export interface CreateActivityDto {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateActivityDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  value?: T;
  errors?: Record<string, string>;
}

export function validateCreateActivityDto(
  data: unknown,
): ValidationResult<CreateActivityDto> {
  const errors: Record<string, string> = {};
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Invalid request payload.' } };
  }

  const payload = data as Record<string, unknown>;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const status: 'active' | 'inactive' =
    payload.status === 'inactive' ? 'inactive' : 'active';

  if (!name) {
    errors.name = 'Activity name is required.';
  } else if (name.length > 100) {
    errors.name = 'Activity name cannot exceed 100 characters.';
  }

  if (description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  const actData = {
    name,
    description,
    status,
  };

  return {
    isValid: true,
    data: actData,
    value: actData,
  };
}

export function validateUpdateActivityDto(
  data: unknown,
): ValidationResult<UpdateActivityDto> {
  const errors: Record<string, string> = {};
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Invalid request payload.' } };
  }

  const payload = data as Record<string, unknown>;
  const value: UpdateActivityDto = {};

  if (payload.name !== undefined) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      errors.name = 'Activity name cannot be empty.';
    } else if (name.length > 100) {
      errors.name = 'Activity name cannot exceed 100 characters.';
    } else {
      value.name = name;
    }
  }

  if (payload.description !== undefined) {
    const description =
      typeof payload.description === 'string' ? payload.description.trim() : '';
    if (description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    } else {
      value.description = description;
    }
  }

  if (payload.status !== undefined) {
    if (payload.status === 'active' || payload.status === 'inactive') {
      value.status = payload.status;
    } else {
      errors.status = 'Status must be active or inactive.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: value, value };
}
