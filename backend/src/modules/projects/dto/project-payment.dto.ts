import { PAYMENT_METHODS, PaymentMethod } from '../models/project-payment.model';

export interface CreateProjectPaymentDto {
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  isFullPaymentSettlement?: boolean;
}

export interface ReverseProjectPaymentDto {
  reason: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errors?: Record<string, string>;
}

export function validateCreateProjectPaymentDto(
  input: unknown,
): ValidationResult<CreateProjectPaymentDto> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object.' },
    };
  }

  const raw = input as Record<string, unknown>;

  // isFullPaymentSettlement flag
  const isFullPaymentSettlement = Boolean(raw.isFullPaymentSettlement);

  // Amount
  let amount = 0;
  if (!isFullPaymentSettlement || raw.amount !== undefined) {
    if (raw.amount === undefined || raw.amount === null || raw.amount === '') {
      errors.amount = 'Payment amount is required.';
    } else {
      const parsedAmount = Number(raw.amount);
      if (Number.isNaN(parsedAmount) || !Number.isFinite(parsedAmount)) {
        errors.amount = 'Payment amount must be a valid number.';
      } else if (parsedAmount <= 0) {
        errors.amount = 'Payment amount must be greater than zero.';
      } else {
        amount = Math.round(parsedAmount * 100) / 100;
      }
    }
  }

  // Payment Date
  let paymentDate: string | undefined;
  if (raw.paymentDate !== undefined && raw.paymentDate !== null && raw.paymentDate !== '') {
    if (typeof raw.paymentDate !== 'string') {
      errors.paymentDate = 'Payment date must be a valid ISO date string.';
    } else {
      const d = new Date(raw.paymentDate);
      if (Number.isNaN(d.getTime())) {
        errors.paymentDate = 'Invalid payment date format.';
      } else {
        paymentDate = d.toISOString();
      }
    }
  }

  // Payment Method
  let paymentMethod: PaymentMethod = 'Bank Transfer';
  if (raw.paymentMethod !== undefined && raw.paymentMethod !== null && raw.paymentMethod !== '') {
    if (typeof raw.paymentMethod !== 'string') {
      errors.paymentMethod = 'Payment method must be a string.';
    } else if (!PAYMENT_METHODS.includes(raw.paymentMethod as PaymentMethod)) {
      errors.paymentMethod = `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`;
    } else {
      paymentMethod = raw.paymentMethod as PaymentMethod;
    }
  }

  // Transaction Reference
  let transactionReference = '';
  if (raw.transactionReference !== undefined && raw.transactionReference !== null) {
    if (typeof raw.transactionReference !== 'string') {
      errors.transactionReference = 'Transaction reference must be a string.';
    } else {
      transactionReference = raw.transactionReference.trim().slice(0, 100);
    }
  }

  // Notes
  let notes = '';
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else {
      notes = raw.notes.trim().slice(0, 500);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    value: {
      amount,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
      isFullPaymentSettlement,
    },
  };
}

export function validateReverseProjectPaymentDto(
  input: unknown,
): ValidationResult<ReverseProjectPaymentDto> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object.' },
    };
  }

  const raw = input as Record<string, unknown>;

  if (
    raw.reason === undefined ||
    raw.reason === null ||
    typeof raw.reason !== 'string' ||
    !raw.reason.trim()
  ) {
    errors.reason = 'Reversal reason is required.';
  } else if (raw.reason.trim().length < 3) {
    errors.reason = 'Reversal reason must be at least 3 characters long.';
  } else if (raw.reason.trim().length > 300) {
    errors.reason = 'Reversal reason cannot exceed 300 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    value: {
      reason: (raw.reason as string).trim(),
    },
  };
}
