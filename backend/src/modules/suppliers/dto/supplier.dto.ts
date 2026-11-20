import {
  CreateSupplierDto,
  ListSuppliersDto,
  UpdateSupplierDto,
} from '../types';
import {
  normalizeSupplierName,
} from '../models/supplier.model';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

export function validateCreateSupplierDto(
  rawBody: unknown,
): ValidationResult<CreateSupplierDto> {
  const errors: Record<string, string> = {};

  if (!rawBody || typeof rawBody !== 'object') {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const body = rawBody as Record<string, unknown>;
  const cleanName = normalizeSupplierName(body.name);

  if (!cleanName) {
    errors.name = 'Supplier name is required.';
  } else if (cleanName.length < 2) {
    errors.name = 'Supplier name must be at least 2 characters.';
  } else if (cleanName.length > 200) {
    errors.name = 'Supplier name cannot exceed 200 characters.';
  }

  const contactPerson =
    typeof body.contactPerson === 'string'
      ? body.contactPerson.trim().slice(0, 150)
      : '';
  const phone =
    typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) : '';
  const email =
    typeof body.email === 'string' ? body.email.trim().slice(0, 150) : '';
  const address =
    typeof body.address === 'string' ? body.address.trim().slice(0, 500) : '';
  const gstNumber =
    typeof body.gstNumber === 'string'
      ? body.gstNumber.trim().toUpperCase().slice(0, 50)
      : '';
  const notes =
    typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : '';

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      name: cleanName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      notes,
    },
  };
}

export function validateUpdateSupplierDto(
  rawBody: unknown,
): ValidationResult<UpdateSupplierDto> {
  const errors: Record<string, string> = {};

  if (!rawBody || typeof rawBody !== 'object') {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const body = rawBody as Record<string, unknown>;
  const value: UpdateSupplierDto = {};

  if (body.name !== undefined) {
    const cleanName = normalizeSupplierName(body.name);
    if (!cleanName) {
      errors.name = 'Supplier name cannot be empty.';
    } else if (cleanName.length < 2) {
      errors.name = 'Supplier name must be at least 2 characters.';
    } else if (cleanName.length > 200) {
      errors.name = 'Supplier name cannot exceed 200 characters.';
    } else {
      value.name = cleanName;
    }
  }

  if (body.contactPerson !== undefined) {
    value.contactPerson =
      typeof body.contactPerson === 'string'
        ? body.contactPerson.trim().slice(0, 150)
        : '';
  }

  if (body.phone !== undefined) {
    value.phone =
      typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) : '';
  }

  if (body.email !== undefined) {
    value.email =
      typeof body.email === 'string' ? body.email.trim().slice(0, 150) : '';
  }

  if (body.address !== undefined) {
    value.address =
      typeof body.address === 'string' ? body.address.trim().slice(0, 500) : '';
  }

  if (body.gstNumber !== undefined) {
    value.gstNumber =
      typeof body.gstNumber === 'string'
        ? body.gstNumber.trim().toUpperCase().slice(0, 50)
        : '';
  }

  if (body.notes !== undefined) {
    value.notes =
      typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : '';
  }

  if (body.isActive !== undefined) {
    value.isActive = Boolean(body.isActive);
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value,
  };
}

export function validateListSuppliersDto(
  query: Record<string, unknown>,
): ValidationResult<ListSuppliersDto> {
  let page = 1;
  if (query.page !== undefined && query.page !== '') {
    const parsedPage = Number.parseInt(String(query.page), 10);
    if (Number.isInteger(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  let limit = 20;
  if (query.limit !== undefined && query.limit !== '') {
    const parsedLimit = Number.parseInt(String(query.limit), 10);
    if (Number.isInteger(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
      limit = parsedLimit;
    }
  }

  let search: string | undefined;
  if (typeof query.search === 'string' && query.search.trim()) {
    search = query.search.trim().slice(0, 150);
  }

  const includeInactive =
    query.includeInactive === true ||
    query.includeInactive === 'true' ||
    query.includeInactive === '1';

  return {
    isValid: true,
    errors: {},
    value: {
      page,
      limit,
      search,
      includeInactive,
    },
  };
}
