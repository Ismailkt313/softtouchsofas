import { MiscPaymentMethod } from '../types';
import { ValidationResult } from './activity.dto';

export interface CreateSaleDto {
  salesDate?: string | Date;
  activityId: string;
  customerName?: string;
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

export interface UpdateSaleDto {
  salesDate?: string | Date;
  activityId?: string;
  customerName?: string;
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

export function validateCreateSaleDto(
  data: unknown,
): ValidationResult<CreateSaleDto> {
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

  let salesDate: Date = new Date();
  if (payload.salesDate) {
    const parsed = new Date(payload.salesDate as string);
    if (Number.isNaN(parsed.getTime())) {
      errors.salesDate = 'Invalid sales date.';
    } else {
      salesDate = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  const saleValue: CreateSaleDto = {
    salesDate,
    activityId,
    customerName:
      typeof payload.customerName === 'string'
        ? payload.customerName.trim()
        : '',
    invoiceNumber:
      typeof payload.invoiceNumber === 'string'
        ? payload.invoiceNumber.trim()
        : '',
    description,
    amount: Math.round(amount * 100) / 100,
    paymentMethod,
    notes: typeof payload.notes === 'string' ? payload.notes.trim() : '',
    attachments: Array.isArray(payload.attachments)
      ? payload.attachments
      : [],
  };

  return {
    isValid: true,
    data: saleValue,
    value: saleValue,
  };
}

export function validateUpdateSaleDto(
  data: unknown,
): ValidationResult<UpdateSaleDto> {
  const errors: Record<string, string> = {};
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Invalid request payload.' } };
  }

  const payload = data as Record<string, unknown>;
  const value: UpdateSaleDto = {};

  if (payload.activityId !== undefined) {
    const actId =
      typeof payload.activityId === 'string' ? payload.activityId.trim() : '';
    if (!actId) {
      errors.activityId = 'Business Activity cannot be empty.';
    } else {
      value.activityId = actId;
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
      value.description = desc;
    }
  }

  if (payload.amount !== undefined) {
    const amt = Number(payload.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else {
      value.amount = Math.round(amt * 100) / 100;
    }
  }

  if (payload.paymentMethod !== undefined) {
    if (ALLOWED_PAYMENT_METHODS.includes(payload.paymentMethod as MiscPaymentMethod)) {
      value.paymentMethod = payload.paymentMethod as MiscPaymentMethod;
    } else {
      errors.paymentMethod = `Payment method must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`;
    }
  }

  if (payload.salesDate !== undefined) {
    const parsed = new Date(payload.salesDate as string);
    if (Number.isNaN(parsed.getTime())) {
      errors.salesDate = 'Invalid sales date.';
    } else {
      value.salesDate = parsed;
    }
  }

  if (payload.customerName !== undefined) {
    value.customerName =
      typeof payload.customerName === 'string' ? payload.customerName.trim() : '';
  }

  if (payload.invoiceNumber !== undefined) {
    value.invoiceNumber =
      typeof payload.invoiceNumber === 'string' ? payload.invoiceNumber.trim() : '';
  }

  if (payload.notes !== undefined) {
    value.notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';
  }

  if (payload.attachments !== undefined && Array.isArray(payload.attachments)) {
    value.attachments = payload.attachments;
  }

  if (payload.status !== undefined) {
    if (payload.status === 'active' || payload.status === 'cancelled') {
      value.status = payload.status;
    } else {
      errors.status = 'Status must be active or cancelled.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: value, value };
}
