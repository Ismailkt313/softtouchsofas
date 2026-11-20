import mongoose, { Model } from 'mongoose';
import {
  CreateSupplierDto,
  ISupplier,
  ListSuppliersDto,
  PaginatedResult,
  SupplierDirectorySummary,
  SupplierFinancialSummary,
  SupplierResponseDto,
  UpdateSupplierDto,
} from '../types';
import {
  SupplierRepository,
  DuplicateSupplierError,
} from '../repository/supplier.repository';
import {
  validateCreateSupplierDto,
  validateListSuppliersDto,
  validateUpdateSupplierDto,
} from '../dto/supplier.dto';
import {
  normalizeSupplierKey,
} from '../models/supplier.model';
import {
  PurchaseVoucherModel,
  sharedPurchaseVoucherMemoryStore,
} from '../../purchases/models/purchase-voucher.model';
import { IPurchaseVoucher } from '../../purchases/types';

export class SupplierNotFoundError extends Error {
  constructor(id: string) {
    super(`Supplier with id '${id}' was not found.`);
    this.name = 'SupplierNotFoundError';
  }
}

export class SupplierValidationError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'SupplierValidationError';
  }
}

export class SupplierService {
  constructor(
    private readonly supplierRepository: SupplierRepository = new SupplierRepository(),
    private readonly voucherModel: Model<IPurchaseVoucher> = PurchaseVoucherModel,
    private readonly voucherMemory: Map<string, IPurchaseVoucher> = sharedPurchaseVoucherMemoryStore,
  ) {}

  private isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async computeSupplierFinancials(
    supplierId: string,
    normalizedSupplierName: string,
  ): Promise<SupplierFinancialSummary> {
    if (this.isDbConnected()) {
      const matchConditions: Record<string, unknown>[] = [
        { normalizedSupplierName },
      ];
      if (mongoose.isValidObjectId(supplierId)) {
        matchConditions.push({ supplierId: new mongoose.Types.ObjectId(supplierId) });
        matchConditions.push({ supplierId: String(supplierId) });
      } else {
        matchConditions.push({ supplierId: String(supplierId) });
      }

      const stats = await this.voucherModel.aggregate([
        {
          $match: {
            status: 'active',
            $or: matchConditions,
          },
        },
        {
          $group: {
            _id: null,
            totalPurchaseValue: { $sum: '$finalTotal' },
            totalVouchersCount: { $sum: 1 },
            totalPaidAmount: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$finalTotal', 0],
              },
            },
            totalOutstandingAmount: {
              $sum: {
                $cond: [{ $ne: ['$paymentStatus', 'Paid'] }, '$finalTotal', 0],
              },
            },
            unpaidBillsCount: {
              $sum: {
                $cond: [{ $ne: ['$paymentStatus', 'Paid'] }, 1, 0],
              },
            },
          },
        },
      ]);

      if (stats.length > 0) {
        const row = stats[0];
        const totalPurchases = Math.round((row.totalPurchaseValue || 0) * 100) / 100;
        const totalPaid = Math.round((row.totalPaidAmount || 0) * 100) / 100;
        const totalOutstanding = Math.round((row.totalOutstandingAmount || 0) * 100) / 100;
        return {
          totalPurchaseValue: totalPurchases,
          totalPaidAmount: totalPaid,
          totalOutstandingAmount: totalOutstanding,
          totalVouchersCount: row.totalVouchersCount || 0,
          unpaidBillsCount: row.unpaidBillsCount || 0,
        };
      }

      return {
        totalPurchaseValue: 0,
        totalPaidAmount: 0,
        totalOutstandingAmount: 0,
        totalVouchersCount: 0,
        unpaidBillsCount: 0,
      };
    }

    let totalPurchaseValue = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let totalVouchersCount = 0;
    let unpaidBillsCount = 0;

    for (const v of this.voucherMemory.values()) {
      if (v.status !== 'active') continue;
      const matches =
        (v.supplierId && String(v.supplierId) === String(supplierId)) ||
        (v.normalizedSupplierName &&
          v.normalizedSupplierName === normalizedSupplierName);

      if (matches) {
        totalVouchersCount += 1;
        const amount = Number(v.finalTotal) || 0;
        totalPurchaseValue += amount;
        if (v.paymentStatus === 'Paid') {
          totalPaidAmount += amount;
        } else {
          totalOutstandingAmount += amount;
          unpaidBillsCount += 1;
        }
      }
    }

    return {
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      totalOutstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
      totalVouchersCount,
      unpaidBillsCount,
    };
  }

  private toResponseDto(
    supplier: ISupplier,
    financialSummary: SupplierFinancialSummary,
  ): SupplierResponseDto {
    return {
      id: String(supplier._id),
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive !== false,
      financialSummary,
      createdAt: supplier.createdAt ? new Date(supplier.createdAt).toISOString() : undefined,
      updatedAt: supplier.updatedAt ? new Date(supplier.updatedAt).toISOString() : undefined,
    };
  }

  async createSupplier(
    rawBody: unknown,
    creator: { id?: string; email?: string; name?: string },
  ): Promise<SupplierResponseDto> {
    const validation = validateCreateSupplierDto(rawBody);
    if (!validation.isValid || !validation.value) {
      throw new SupplierValidationError(
        'Validation failed for creating supplier.',
        validation.errors,
      );
    }

    const created = await this.supplierRepository.createSupplier({
      ...validation.value,
      normalizedName: normalizeSupplierKey(validation.value.name),
      isActive: true,
      createdBy: creator.email || creator.id || 'system',
      createdByName: creator.name || creator.email || 'System User',
    });

    const summary = await this.computeSupplierFinancials(
      String(created._id),
      created.normalizedName,
    );
    return this.toResponseDto(created, summary);
  }

  async updateSupplier(
    id: string,
    rawBody: unknown,
  ): Promise<SupplierResponseDto> {
    const validation = validateUpdateSupplierDto(rawBody);
    if (!validation.isValid || !validation.value) {
      throw new SupplierValidationError(
        'Validation failed for updating supplier.',
        validation.errors,
      );
    }

    const updated = await this.supplierRepository.updateSupplier(
      id,
      validation.value,
    );
    if (!updated) {
      throw new SupplierNotFoundError(id);
    }

    const summary = await this.computeSupplierFinancials(
      String(updated._id),
      updated.normalizedName,
    );
    return this.toResponseDto(updated, summary);
  }

  async getSupplierById(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findSupplierById(id);
    if (!supplier) {
      throw new SupplierNotFoundError(id);
    }

    const summary = await this.computeSupplierFinancials(
      String(supplier._id),
      supplier.normalizedName,
    );
    return this.toResponseDto(supplier, summary);
  }

  async getOverallSummary(): Promise<SupplierDirectorySummary> {
    if (this.isDbConnected()) {
      const [supplierCount, voucherStats] = await Promise.all([
        this.supplierRepository.countActiveSuppliers(),
        this.voucherModel.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              totalPurchases: { $sum: '$finalTotal' },
              totalOutstandingCredit: {
                $sum: {
                  $cond: [{ $ne: ['$paymentStatus', 'Paid'] }, '$finalTotal', 0],
                },
              },
              unpaidBillsCount: {
                $sum: {
                  $cond: [{ $ne: ['$paymentStatus', 'Paid'] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

      const stats = voucherStats[0] || {};
      return {
        activeSuppliersCount: supplierCount,
        totalPurchases: Math.round((stats.totalPurchases || 0) * 100) / 100,
        totalOutstandingCredit:
          Math.round((stats.totalOutstandingCredit || 0) * 100) / 100,
        unpaidBillsCount: stats.unpaidBillsCount || 0,
      };
    }

    let totalPurchases = 0;
    let totalOutstandingCredit = 0;
    let unpaidBillsCount = 0;
    for (const v of this.voucherMemory.values()) {
      if (v.status !== 'active') continue;
      const amt = Number(v.finalTotal) || 0;
      totalPurchases += amt;
      if (v.paymentStatus !== 'Paid') {
        totalOutstandingCredit += amt;
        unpaidBillsCount += 1;
      }
    }

    const activeSuppliersCount =
      await this.supplierRepository.countActiveSuppliers();
    return {
      activeSuppliersCount,
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      totalOutstandingCredit: Math.round(totalOutstandingCredit * 100) / 100,
      unpaidBillsCount,
    };
  }

  async listSuppliers(
    query: Record<string, unknown>,
  ): Promise<PaginatedResult<SupplierResponseDto>> {
    const validation = validateListSuppliersDto(query);
    const filters = validation.value || { page: 1, limit: 20 };

    const result = await this.supplierRepository.findSuppliers(filters);

    const [items, summary] = await Promise.all([
      Promise.all(
        result.items.map(async (supplier) => {
          const sSummary = await this.computeSupplierFinancials(
            String(supplier._id),
            supplier.normalizedName,
          );
          return this.toResponseDto(supplier, sSummary);
        }),
      ),
      this.getOverallSummary(),
    ]);

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      summary,
    };
  }

  async getSupplierPurchaseHistory(
    supplierId: string,
    query: {
      page?: number;
      limit?: number;
      paymentStatus?: string;
      fromDate?: string;
      toDate?: string;
    },
  ): Promise<PaginatedResult<IPurchaseVoucher>> {
    const supplier = await this.supplierRepository.findSupplierById(supplierId);
    if (!supplier) {
      throw new SupplierNotFoundError(supplierId);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const paymentStatus = query.paymentStatus;
    const fromDate = query.fromDate ? new Date(query.fromDate) : null;
    const toDate = query.toDate ? new Date(query.toDate) : null;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    if (this.isDbConnected()) {
      const matchConditions: Record<string, unknown>[] = [
        { normalizedSupplierName: supplier.normalizedName },
      ];
      if (mongoose.isValidObjectId(supplierId)) {
        matchConditions.push({ supplierId: new mongoose.Types.ObjectId(supplierId) });
        matchConditions.push({ supplierId: String(supplierId) });
      } else {
        matchConditions.push({ supplierId: String(supplierId) });
      }

      const filter: Record<string, unknown> = {
        status: 'active',
        $or: matchConditions,
      };

      if (paymentStatus && paymentStatus !== 'all') {
        if (paymentStatus === 'Unpaid') {
          filter.paymentStatus = { $ne: 'Paid' };
        } else {
          filter.paymentStatus = paymentStatus;
        }
      }

      if (fromDate || toDate) {
        const dateCond: Record<string, Date> = {};
        if (fromDate) dateCond.$gte = fromDate;
        if (toDate) dateCond.$lte = toDate;
        filter.purchaseDate = dateCond;
      }

      const [docs, total] = await Promise.all([
        this.voucherModel
          .find(filter)
          .sort({ purchaseDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.voucherModel.countDocuments(filter).exec(),
      ]);

      return {
        items: docs as unknown as IPurchaseVoucher[],
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    let items = Array.from(this.voucherMemory.values()).filter((v) => {
      if (v.status !== 'active') return false;
      const matches =
        (v.supplierId && String(v.supplierId) === String(supplierId)) ||
        (v.normalizedSupplierName &&
          v.normalizedSupplierName === supplier.normalizedName);
      if (!matches) return false;

      if (paymentStatus && paymentStatus !== 'all' && v.paymentStatus !== paymentStatus) {
        return false;
      }

      if (fromDate && new Date(v.purchaseDate).getTime() < fromDate.getTime()) {
        return false;
      }

      if (toDate && new Date(v.purchaseDate).getTime() > toDate.getTime()) {
        return false;
      }

      return true;
    });

    items.sort(
      (a, b) =>
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
    );

    const total = items.length;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated.map((d) => ({ ...d })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
