import mongoose from 'mongoose';

export interface ISupplier {
  _id?: string | mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplierFinancialSummary {
  totalPurchaseValue: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  totalVouchersCount: number;
  unpaidBillsCount: number;
}

export interface SupplierResponseDto {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  notes: string;
  isActive: boolean;
  financialSummary: SupplierFinancialSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  isActive?: boolean;
}

export interface ListSuppliersDto {
  page: number;
  limit: number;
  search?: string;
  includeInactive?: boolean;
}

export interface SupplierDirectorySummary {
  activeSuppliersCount: number;
  totalPurchases: number;
  totalOutstandingCredit: number;
  unpaidBillsCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: SupplierDirectorySummary;
}
