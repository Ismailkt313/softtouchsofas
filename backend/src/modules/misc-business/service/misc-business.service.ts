import {
  MiscBusinessRepository,
  sharedMiscBusinessRepository,
} from '../repository/misc-business.repository';
import {
  CreateActivityDto,
  UpdateActivityDto,
} from '../dto/activity.dto';
import {
  CreateSaleDto,
  UpdateSaleDto,
} from '../dto/sale.dto';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
} from '../dto/purchase.dto';
import { MiscPaginationQuery } from '../dto/query.dto';
import {
  IBusinessActivity,
  IMiscellaneousSale,
  IMiscellaneousPurchase,
  MiscOverviewSummary,
  MiscSalesSummary,
  MiscPurchasesSummary,
  MiscActivitySummary,
  PaginatedResult,
} from '../types';

export interface UserContext {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
}

export class MiscBusinessService {
  constructor(
    private repository: MiscBusinessRepository = sharedMiscBusinessRepository,
  ) {}

  // ==========================================
  // ACTIVITIES
  // ==========================================

  async createActivity(
    dto: CreateActivityDto,
    user?: UserContext,
  ): Promise<IBusinessActivity> {
    return this.repository.createActivity({
      name: dto.name,
      description: dto.description || '',
      status: dto.status || 'active',
      createdBy: user?.userId || 'system',
      createdByName: user?.name || user?.email || 'System',
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async updateActivity(
    id: string,
    dto: UpdateActivityDto,
    user?: UserContext,
  ): Promise<IBusinessActivity | null> {
    return this.repository.updateActivity(id, {
      ...dto,
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.repository.deleteActivity(id);
  }

  async getActivity(id: string): Promise<IBusinessActivity | null> {
    return this.repository.findActivityById(id);
  }

  async listActivities(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IBusinessActivity>> {
    return this.repository.listActivities(query);
  }

  async getAllActiveActivities(): Promise<IBusinessActivity[]> {
    return this.repository.getAllActiveActivities();
  }

  // ==========================================
  // SALES
  // ==========================================

  async createSale(
    dto: CreateSaleDto,
    user?: UserContext,
  ): Promise<IMiscellaneousSale> {
    const activity = await this.repository.findActivityById(dto.activityId);
    if (!activity) {
      throw new Error(`Business activity with ID '${dto.activityId}' not found.`);
    }

    const salesDate = dto.salesDate ? new Date(dto.salesDate) : new Date();

    return this.repository.createSale({
      salesDate,
      activityId: activity._id,
      activityName: activity.name,
      customerName: dto.customerName || '',
      invoiceNumber: dto.invoiceNumber || '',
      description: dto.description,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod || 'Cash',
      notes: dto.notes || '',
      attachments: dto.attachments || [],
      status: 'active',
      createdBy: user?.userId || 'system',
      createdByName: user?.name || user?.email || 'System',
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async updateSale(
    id: string,
    dto: UpdateSaleDto,
    user?: UserContext,
  ): Promise<IMiscellaneousSale | null> {
    const existing = await this.repository.findSaleById(id);
    if (!existing) return null;

    let activityName = existing.activityName;
    if (dto.activityId && dto.activityId !== existing.activityId) {
      const activity = await this.repository.findActivityById(dto.activityId);
      if (!activity) {
        throw new Error(`Business activity with ID '${dto.activityId}' not found.`);
      }
      activityName = activity.name;
    }

    const { salesDate, ...rest } = dto;
    return this.repository.updateSale(id, {
      ...rest,
      ...(salesDate ? { salesDate: new Date(salesDate) } : {}),
      ...(dto.activityId ? { activityName } : {}),
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async deleteSale(id: string): Promise<boolean> {
    return this.repository.deleteSale(id);
  }

  async getSale(id: string): Promise<IMiscellaneousSale | null> {
    return this.repository.findSaleById(id);
  }

  async listSales(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IMiscellaneousSale>> {
    return this.repository.listSales(query);
  }

  // ==========================================
  // PURCHASES
  // ==========================================

  async createPurchase(
    dto: CreatePurchaseDto,
    user?: UserContext,
  ): Promise<IMiscellaneousPurchase> {
    const activity = await this.repository.findActivityById(dto.activityId);
    if (!activity) {
      throw new Error(`Business activity with ID '${dto.activityId}' not found.`);
    }

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    return this.repository.createPurchase({
      purchaseDate,
      activityId: activity._id,
      activityName: activity.name,
      supplierName: dto.supplierName || '',
      invoiceNumber: dto.invoiceNumber || '',
      description: dto.description,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod || 'Cash',
      notes: dto.notes || '',
      attachments: dto.attachments || [],
      status: 'active',
      createdBy: user?.userId || 'system',
      createdByName: user?.name || user?.email || 'System',
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async updatePurchase(
    id: string,
    dto: UpdatePurchaseDto,
    user?: UserContext,
  ): Promise<IMiscellaneousPurchase | null> {
    const existing = await this.repository.findPurchaseById(id);
    if (!existing) return null;

    let activityName = existing.activityName;
    if (dto.activityId && dto.activityId !== existing.activityId) {
      const activity = await this.repository.findActivityById(dto.activityId);
      if (!activity) {
        throw new Error(`Business activity with ID '${dto.activityId}' not found.`);
      }
      activityName = activity.name;
    }

    const { purchaseDate, ...rest } = dto;
    return this.repository.updatePurchase(id, {
      ...rest,
      ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {}),
      ...(dto.activityId ? { activityName } : {}),
      updatedBy: user?.userId || 'system',
      updatedByName: user?.name || user?.email || 'System',
    });
  }

  async deletePurchase(id: string): Promise<boolean> {
    return this.repository.deletePurchase(id);
  }

  async getPurchase(id: string): Promise<IMiscellaneousPurchase | null> {
    return this.repository.findPurchaseById(id);
  }

  async listPurchases(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IMiscellaneousPurchase>> {
    return this.repository.listPurchases(query);
  }

  // ==========================================
  // SUMMARIES & REPORTS
  // ==========================================

  async getOverviewSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscOverviewSummary> {
    return this.repository.getOverviewSummary(filters);
  }

  async getSalesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscSalesSummary> {
    return this.repository.getSalesSummary(filters);
  }

  async getPurchasesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscPurchasesSummary> {
    return this.repository.getPurchasesSummary(filters);
  }

  async getActivitySummary(
    activityId: string,
    filters?: { startDate?: Date; endDate?: Date },
  ): Promise<MiscActivitySummary | null> {
    return this.repository.getActivitySummary(activityId, filters);
  }
}

export const sharedMiscBusinessService = new MiscBusinessService();
