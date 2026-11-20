import { MiscPaymentMethod } from '../types';
import { ValidationResult } from './activity.dto';

export interface CreatePurchaseDto {
  purchaseDate?: string | Date;
  activityId: string;
  supplierName?: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  paymentMethod?: MiscPaymentMethod;
  notes?: string;
  attachments?: Array<{
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;
}

export interface UpdatePurchaseDto {
  purchaseDate?: string | Date;
  activityId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  description?: string;
  amount?: number;
  paymentMethod?: MiscPaymentMethod;
  notes?: string;
  attachments?: Array<{
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;
  status?: 'active' | 'cancelled';
}

const ALLOWED_PAYMENT_METHODS: MiscPaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Card',
  'Other',
];

export function validateCreatePurchaseDto(
  data: unknown,
): ValidationResult<CreatePurchaseDto> {
  const errors: Record<string, string> = {};
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Invalid request payload.' } };
  }

  const payload = data as Record<string, unknown>;
  const activityId =
    typeof payload.activityId === 'string' ? payload.activityId.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const amount = Number(payload.amount);

  if (!activityId) {
    errors.activityId = 'Business Activity is required.';
  }

  if (!description) {
    errors.description = 'Description is required.';
  } else if (description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  }

  let paymentMethod: MiscPaymentMethod = 'Cash';
  if (payload.paymentMethod) {
    if (ALLOWED_PAYMENT_METHODS.includes(payload.paymentMethod as MiscPaymentMethod)) {
      paymentMethod = payload.paymentMethod as MiscPaymentMethod;
    } else {
      errors.paymentMethod = `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`;
    }
  }

  let purchaseDate: Date = new Date();
  if (payload.purchaseDate) {
    const parsed = new Date(payload.purchaseDate as string);
    if (Number.isNaN(parsed.getTime())) {
      errors.purchaseDate = 'Invalid purchase date.';
    } else {
      purchaseDate = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      activityId,
      description,
      amount,
      paymentMethod,
      purchaseDate,
      supplierName:
        typeof payload.supplierName === 'string'
          ? payload.supplierName.trim()
          : '',
      invoiceNumber:
        typeof payload.invoiceNumber === 'string'
          ? payload.invoiceNumber.trim()
          : '',
      notes: typeof payload.notes === 'string' ? payload.notes.trim() : '',
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments.filter(
            (a): a is { url: string; name: string; size?: number; mimeType?: string } =>
              Boolean(a && typeof a.url === 'string' && typeof a.name === 'string'),
          )
        : [],
    },
  };
}

export function validateUpdatePurchaseDto(
  data: unknown,
): ValidationResult<UpdatePurchaseDto> {
  const errors: Record<string, string> = {};
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Invalid request payload.' } };
  }

  const payload = data as Record<string, unknown>;
  const result: UpdatePurchaseDto = {};

  if (payload.activityId !== undefined) {
    const activityId =
      typeof payload.activityId === 'string' ? payload.activityId.trim() : '';
    if (!activityId) {
      errors.activityId = 'Business Activity is required.';
    } else {
      result.activityId = activityId;
    }
  }

  if (payload.description !== undefined) {
    const desc =
      typeof payload.description === 'string' ? payload.description.trim() : '';
    if (!desc) {
      errors.description = 'Description cannot be empty.';
    } else if (desc.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    } else {
      result.description = desc;
    }
  }

  if (payload.amount !== undefined) {
    const amt = Number(payload.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else {
      result.amount = amt;
    }
  }

  if (payload.paymentMethod !== undefined) {
    if (ALLOWED_PAYMENT_METHODS.includes(payload.paymentMethod as MiscPaymentMethod)) {
      result.paymentMethod = payload.paymentMethod as MiscPaymentMethod;
    } else {
      errors.paymentMethod = `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`;
    }
  }

  if (payload.purchaseDate !== undefined) {
    const parsed = new Date(payload.purchaseDate as string);
    if (Number.isNaN(parsed.getTime())) {
      errors.purchaseDate = 'Invalid purchase date.';
    } else {
      result.purchaseDate = parsed;
    }
  }

  if (payload.supplierName !== undefined) {
    result.supplierName =
      typeof payload.supplierName === 'string'
        ? payload.supplierName.trim()
        : '';
  }

  if (payload.invoiceNumber !== undefined) {
    result.invoiceNumber =
      typeof payload.invoiceNumber === 'string'
        ? payload.invoiceNumber.trim()
        : '';
  }

  if (payload.notes !== undefined) {
    result.notes =
      typeof payload.notes === 'string' ? payload.notes.trim() : '';
  }

  if (payload.attachments !== undefined) {
    result.attachments = Array.isArray(payload.attachments)
      ? payload.attachments.filter(
          (a): a is { url: string; name: string; size?: number; mimeType?: string } =>
            Boolean(a && typeof a.url === 'string' && typeof a.name === 'string'),
        )
      : [];
  }

  if (payload.status !== undefined) {
    if (payload.status === 'active' || payload.status === 'cancelled') {
      result.status = payload.status;
    } else {
      errors.status = 'Status must be active or cancelled.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: result };
}
