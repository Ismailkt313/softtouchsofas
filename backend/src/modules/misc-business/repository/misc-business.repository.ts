import mongoose, { Model } from 'mongoose';
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
import {
  BusinessActivityDocument,
  BusinessActivityModel,
  normalizeActivityName,
  sharedBusinessActivityMemoryStore,
} from '../models/business-activity.model';
import {
  MiscellaneousSaleDocument,
  MiscellaneousSaleModel,
  sharedMiscellaneousSaleMemoryStore,
} from '../models/miscellaneous-sale.model';
import {
  MiscellaneousPurchaseDocument,
  MiscellaneousPurchaseModel,
  sharedMiscellaneousPurchaseMemoryStore,
} from '../models/miscellaneous-purchase.model';
import { MiscPaginationQuery } from '../dto/query.dto';

export class DuplicateActivityError extends Error {
  constructor(name: string) {
    super(`Activity with name '${name}' already exists.`);
    this.name = 'DuplicateActivityError';
  }
}

export class ActivityInUseError extends Error {
  constructor(name: string) {
    super(
      `Cannot delete activity '${name}' because it has recorded transactions. Deactivate it instead.`,
    );
    this.name = 'ActivityInUseError';
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MiscBusinessRepository {
  constructor(
    private activityModel: Model<BusinessActivityDocument> = BusinessActivityModel,
    private saleModel: Model<MiscellaneousSaleDocument> = MiscellaneousSaleModel,
    private purchaseModel: Model<MiscellaneousPurchaseDocument> = MiscellaneousPurchaseModel,
    private activityMemory: Map<string, IBusinessActivity> = sharedBusinessActivityMemoryStore,
    private saleMemory: Map<string, IMiscellaneousSale> = sharedMiscellaneousSaleMemoryStore,
    private purchaseMemory: Map<string, IMiscellaneousPurchase> = sharedMiscellaneousPurchaseMemoryStore,
  ) {}

  private isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  // ==========================================
  // BUSINESS ACTIVITIES
  // ==========================================

  async findActivityById(id: string): Promise<IBusinessActivity | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;

    if (this.isDbConnected()) {
      if (mongoose.isValidObjectId(cleanId)) {
        const doc = await this.activityModel.findById(cleanId).lean().exec();
        if (doc) {
          const typed = doc as unknown as IBusinessActivity;
          return { ...typed, _id: String(typed._id) };
        }
      }
      return await this.findActivityByNormalizedName(cleanId);
    }

    const item = this.activityMemory.get(cleanId);
    if (item) return { ...item };
    return this.findActivityByNormalizedName(cleanId);
  }

  async findActivityByNormalizedName(
    name: string,
  ): Promise<IBusinessActivity | null> {
    const cleanKey = normalizeActivityName(name);
    if (!cleanKey) return null;

    if (this.isDbConnected()) {
      const doc = await this.activityModel
        .findOne({ normalizedName: cleanKey })
        .lean()
        .exec();
      if (!doc) return null;
      const typed = doc as unknown as IBusinessActivity;
      return { ...typed, _id: String(typed._id) };
    }

    for (const item of this.activityMemory.values()) {
      if (item.normalizedName === cleanKey) {
        return { ...item };
      }
    }
    return null;
  }

  async createActivity(
    data: Omit<IBusinessActivity, '_id' | 'createdAt' | 'updatedAt' | 'normalizedName'>,
  ): Promise<IBusinessActivity> {
    const normalizedName = normalizeActivityName(data.name);
    const existing = await this.findActivityByNormalizedName(normalizedName);
    if (existing) {
      throw new DuplicateActivityError(data.name);
    }

    const now = new Date();
    if (this.isDbConnected()) {
      const doc = await this.activityModel.create({
        ...data,
        normalizedName,
      });
      const typed = doc.toObject() as unknown as IBusinessActivity;
      const record = { ...typed, _id: String(typed._id) };
      this.activityMemory.set(record._id, record);
      return record;
    }

    const _id = new mongoose.Types.ObjectId().toString();
    const created: IBusinessActivity = {
      _id,
      name: data.name.trim(),
      normalizedName,
      description: data.description?.trim() || '',
      status: data.status || 'active',
      createdBy: data.createdBy || 'system',
      createdByName: data.createdByName || 'System',
      updatedBy: data.updatedBy || 'system',
      updatedByName: data.updatedByName || 'System',
      createdAt: now,
      updatedAt: now,
    };
    this.activityMemory.set(_id, created);
    return created;
  }

  async updateActivity(
    id: string,
    data: Partial<Omit<IBusinessActivity, '_id' | 'createdAt' | 'updatedAt' | 'normalizedName'>>,
  ): Promise<IBusinessActivity | null> {
    const cleanId = String(id || '').trim();
    const existing = await this.findActivityById(cleanId);
    if (!existing) return null;

    let normalizedName = existing.normalizedName;
    if (data.name && data.name.trim() !== existing.name) {
      normalizedName = normalizeActivityName(data.name);
      const duplicate = await this.findActivityByNormalizedName(normalizedName);
      if (duplicate && duplicate._id !== existing._id) {
        throw new DuplicateActivityError(data.name);
      }
    }

    const now = new Date();
    if (this.isDbConnected()) {
      const doc = await this.activityModel
        .findByIdAndUpdate(
          existing._id,
          {
            $set: {
              ...data,
              normalizedName,
              updatedAt: now,
            },
          },
          { new: true },
        )
        .lean()
        .exec();

      if (!doc) return null;
      const typed = doc as unknown as IBusinessActivity;
      const updated = { ...typed, _id: String(typed._id) };
      this.activityMemory.set(updated._id, updated);
      return updated;
    }

    const updated: IBusinessActivity = {
      ...existing,
      ...data,
      normalizedName,
      updatedAt: now,
    };
    this.activityMemory.set(existing._id, updated);
    return updated;
  }

  async deleteActivity(id: string): Promise<boolean> {
    const cleanId = String(id || '').trim();
    const existing = await this.findActivityById(cleanId);
    if (!existing) return false;

    // Check if transactions exist
    const hasSales = await this.hasTransactionsForActivity(existing._id);
    if (hasSales) {
      throw new ActivityInUseError(existing.name);
    }

    if (this.isDbConnected()) {
      await this.activityModel.findByIdAndDelete(existing._id).exec();
    }
    this.activityMemory.delete(existing._id);
    return true;
  }

  private async hasTransactionsForActivity(activityId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const saleCount = await this.saleModel.countDocuments({ activityId }).exec();
      if (saleCount > 0) return true;
      const purchaseCount = await this.purchaseModel.countDocuments({ activityId }).exec();
      return purchaseCount > 0;
    }

    for (const s of this.saleMemory.values()) {
      if (s.activityId === activityId) return true;
    }
    for (const p of this.purchaseMemory.values()) {
      if (p.activityId === activityId) return true;
    }
    return false;
  }

  async listActivities(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IBusinessActivity>> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    if (this.isDbConnected()) {
      const filter: Record<string, unknown> = {};
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ name: regex }, { description: regex }];
      }

      const [items, total] = await Promise.all([
        this.activityModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.activityModel.countDocuments(filter).exec(),
      ]);

      return {
        items: items.map((doc) => ({
          ...(doc as unknown as IBusinessActivity),
          _id: String((doc as unknown as IBusinessActivity)._id),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    let all = Array.from(this.activityMemory.values());
    if (status && status !== 'all') {
      all = all.filter((a) => a.status === status);
    }
    if (search) {
      const term = search.toLowerCase();
      all = all.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term),
      );
    }

    all.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = all.length;
    const paged = all.slice(skip, skip + limit);
    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAllActiveActivities(): Promise<IBusinessActivity[]> {
    if (this.isDbConnected()) {
      const items = await this.activityModel
        .find({ status: 'active' })
        .sort({ name: 1 })
        .lean()
        .exec();
      return items.map((doc) => ({
        ...(doc as unknown as IBusinessActivity),
        _id: String((doc as unknown as IBusinessActivity)._id),
      }));
    }

    return Array.from(this.activityMemory.values())
      .filter((a) => a.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ==========================================
  // REFERENCE NUMBER GENERATORS
  // ==========================================

  async generateNextSaleReference(): Promise<string> {
    let nextNum = 1;
    if (this.isDbConnected()) {
      const latest = await this.saleModel
        .findOne({ referenceNumber: /^MS-/i })
        .sort({ createdAt: -1, referenceNumber: -1 })
        .lean()
        .exec();
      if (latest && latest.referenceNumber) {
        const match = latest.referenceNumber.match(/^MS-(\d+)$/i);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
    } else {
      let maxNum = 0;
      for (const s of this.saleMemory.values()) {
        const match = s.referenceNumber.match(/^MS-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      nextNum = maxNum + 1;
    }
    return `MS-${String(nextNum).padStart(4, '0')}`;
  }

  async generateNextPurchaseReference(): Promise<string> {
    let nextNum = 1;
    if (this.isDbConnected()) {
      const latest = await this.purchaseModel
        .findOne({ referenceNumber: /^MP-/i })
        .sort({ createdAt: -1, referenceNumber: -1 })
        .lean()
        .exec();
      if (latest && latest.referenceNumber) {
        const match = latest.referenceNumber.match(/^MP-(\d+)$/i);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
    } else {
      let maxNum = 0;
      for (const p of this.purchaseMemory.values()) {
        const match = p.referenceNumber.match(/^MP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      nextNum = maxNum + 1;
    }
    return `MP-${String(nextNum).padStart(4, '0')}`;
  }

  // ==========================================
  // MISCELLANEOUS SALES
  // ==========================================

  async createSale(
    data: Omit<IMiscellaneousSale, '_id' | 'createdAt' | 'updatedAt' | 'referenceNumber'> & {
      referenceNumber?: string;
    },
  ): Promise<IMiscellaneousSale> {
    const referenceNumber =
      data.referenceNumber || (await this.generateNextSaleReference());
    const now = new Date();

    if (this.isDbConnected()) {
      const doc = await this.saleModel.create({
        ...data,
        referenceNumber,
      });
      const typed = doc.toObject() as unknown as IMiscellaneousSale;
      const record = { ...typed, _id: String(typed._id) };
      this.saleMemory.set(record._id, record);
      return record;
    }

    const _id = new mongoose.Types.ObjectId().toString();
    const created: IMiscellaneousSale = {
      _id,
      referenceNumber,
      salesDate: data.salesDate ? new Date(data.salesDate) : now,
      activityId: data.activityId,
      activityName: data.activityName,
      customerName: data.customerName || '',
      invoiceNumber: data.invoiceNumber || '',
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'Cash',
      notes: data.notes || '',
      attachments: data.attachments || [],
      status: data.status || 'active',
      createdBy: data.createdBy || 'system',
      createdByName: data.createdByName || 'System',
      updatedBy: data.updatedBy || 'system',
      updatedByName: data.updatedByName || 'System',
      createdAt: now,
      updatedAt: now,
    };
    this.saleMemory.set(_id, created);
    return created;
  }

  async findSaleById(id: string): Promise<IMiscellaneousSale | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;

    if (this.isDbConnected()) {
      if (mongoose.isValidObjectId(cleanId)) {
        const doc = await this.saleModel.findById(cleanId).lean().exec();
        if (doc) {
          const typed = doc as unknown as IMiscellaneousSale;
          return { ...typed, _id: String(typed._id) };
        }
      }
      const byRef = await this.saleModel
        .findOne({ referenceNumber: cleanId })
        .lean()
        .exec();
      if (byRef) {
        const typed = byRef as unknown as IMiscellaneousSale;
        return { ...typed, _id: String(typed._id) };
      }
      return null;
    }

    const item = this.saleMemory.get(cleanId);
    if (item) return { ...item };
    for (const s of this.saleMemory.values()) {
      if (s.referenceNumber.toLowerCase() === cleanId.toLowerCase()) {
        return { ...s };
      }
    }
    return null;
  }

  async updateSale(
    id: string,
    data: Partial<Omit<IMiscellaneousSale, '_id' | 'createdAt' | 'updatedAt' | 'referenceNumber'>>,
  ): Promise<IMiscellaneousSale | null> {
    const cleanId = String(id || '').trim();
    const existing = await this.findSaleById(cleanId);
    if (!existing) return null;

    const now = new Date();
    if (this.isDbConnected()) {
      const doc = await this.saleModel
        .findByIdAndUpdate(
          existing._id,
          {
            $set: {
              ...data,
              updatedAt: now,
            },
          },
          { new: true },
        )
        .lean()
        .exec();

      if (!doc) return null;
      const typed = doc as unknown as IMiscellaneousSale;
      const updated = { ...typed, _id: String(typed._id) };
      this.saleMemory.set(updated._id, updated);
      return updated;
    }

    const updated: IMiscellaneousSale = {
      ...existing,
      ...data,
      updatedAt: now,
    };
    this.saleMemory.set(existing._id, updated);
    return updated;
  }

  async deleteSale(id: string): Promise<boolean> {
    const cleanId = String(id || '').trim();
    const existing = await this.findSaleById(cleanId);
    if (!existing) return false;

    if (this.isDbConnected()) {
      await this.saleModel.findByIdAndDelete(existing._id).exec();
    }
    this.saleMemory.delete(existing._id);
    return true;
  }

  async listSales(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IMiscellaneousSale>> {
    const {
      page,
      limit,
      search,
      activityId,
      startDate,
      endDate,
      paymentMethod,
      status,
    } = query;
    const skip = (page - 1) * limit;

    if (this.isDbConnected()) {
      const filter: Record<string, unknown> = {};
      if (activityId) {
        filter.activityId = activityId;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (paymentMethod && paymentMethod !== 'all') {
        filter.paymentMethod = paymentMethod;
      }
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          dateFilter.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          dateFilter.$lte = e;
        }
        filter.salesDate = dateFilter;
      }
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        filter.$or = [
          { referenceNumber: regex },
          { customerName: regex },
          { invoiceNumber: regex },
          { description: regex },
          { activityName: regex },
        ];
      }

      const [items, total] = await Promise.all([
        this.saleModel
          .find(filter)
          .sort({ salesDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.saleModel.countDocuments(filter).exec(),
      ]);

      return {
        items: items.map((doc) => ({
          ...(doc as unknown as IMiscellaneousSale),
          _id: String((doc as unknown as IMiscellaneousSale)._id),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    let all = Array.from(this.saleMemory.values());
    if (activityId) {
      all = all.filter((s) => s.activityId === activityId);
    }
    if (status && status !== 'all') {
      all = all.filter((s) => s.status === status);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      all = all.filter((s) => s.paymentMethod === paymentMethod);
    }
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      all = all.filter((item) => new Date(item.salesDate) >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      all = all.filter((item) => new Date(item.salesDate) <= e);
    }
    if (search) {
      const term = search.toLowerCase();
      all = all.filter(
        (s) =>
          s.referenceNumber.toLowerCase().includes(term) ||
          s.customerName?.toLowerCase().includes(term) ||
          s.invoiceNumber?.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.activityName.toLowerCase().includes(term),
      );
    }

    all.sort(
      (a, b) =>
        new Date(b.salesDate).getTime() - new Date(a.salesDate).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = all.length;
    const paged = all.slice(skip, skip + limit);
    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ==========================================
  // MISCELLANEOUS PURCHASES
  // ==========================================

  async createPurchase(
    data: Omit<IMiscellaneousPurchase, '_id' | 'createdAt' | 'updatedAt' | 'referenceNumber'> & {
      referenceNumber?: string;
    },
  ): Promise<IMiscellaneousPurchase> {
    const referenceNumber =
      data.referenceNumber || (await this.generateNextPurchaseReference());
    const now = new Date();

    if (this.isDbConnected()) {
      const doc = await this.purchaseModel.create({
        ...data,
        referenceNumber,
      });
      const typed = doc.toObject() as unknown as IMiscellaneousPurchase;
      const record = { ...typed, _id: String(typed._id) };
      this.purchaseMemory.set(record._id, record);
      return record;
    }

    const _id = new mongoose.Types.ObjectId().toString();
    const created: IMiscellaneousPurchase = {
      _id,
      referenceNumber,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : now,
      activityId: data.activityId,
      activityName: data.activityName,
      supplierName: data.supplierName || '',
      invoiceNumber: data.invoiceNumber || '',
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'Cash',
      notes: data.notes || '',
      attachments: data.attachments || [],
      status: data.status || 'active',
      createdBy: data.createdBy || 'system',
      createdByName: data.createdByName || 'System',
      updatedBy: data.updatedBy || 'system',
      updatedByName: data.updatedByName || 'System',
      createdAt: now,
      updatedAt: now,
    };
    this.purchaseMemory.set(_id, created);
    return created;
  }

  async findPurchaseById(id: string): Promise<IMiscellaneousPurchase | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;

    if (this.isDbConnected()) {
      if (mongoose.isValidObjectId(cleanId)) {
        const doc = await this.purchaseModel.findById(cleanId).lean().exec();
        if (doc) {
          const typed = doc as unknown as IMiscellaneousPurchase;
          return { ...typed, _id: String(typed._id) };
        }
      }
      const byRef = await this.purchaseModel
        .findOne({ referenceNumber: cleanId })
        .lean()
        .exec();
      if (byRef) {
        const typed = byRef as unknown as IMiscellaneousPurchase;
        return { ...typed, _id: String(typed._id) };
      }
      return null;
    }

    const item = this.purchaseMemory.get(cleanId);
    if (item) return { ...item };
    for (const p of this.purchaseMemory.values()) {
      if (p.referenceNumber.toLowerCase() === cleanId.toLowerCase()) {
        return { ...p };
      }
    }
    return null;
  }

  async updatePurchase(
    id: string,
    data: Partial<Omit<IMiscellaneousPurchase, '_id' | 'createdAt' | 'updatedAt' | 'referenceNumber'>>,
  ): Promise<IMiscellaneousPurchase | null> {
    const cleanId = String(id || '').trim();
    const existing = await this.findPurchaseById(cleanId);
    if (!existing) return null;

    const now = new Date();
    if (this.isDbConnected()) {
      const doc = await this.purchaseModel
        .findByIdAndUpdate(
          existing._id,
          {
            $set: {
              ...data,
              updatedAt: now,
            },
          },
          { new: true },
        )
        .lean()
        .exec();

      if (!doc) return null;
      const typed = doc as unknown as IMiscellaneousPurchase;
      const updated = { ...typed, _id: String(typed._id) };
      this.purchaseMemory.set(updated._id, updated);
      return updated;
    }

    const updated: IMiscellaneousPurchase = {
      ...existing,
      ...data,
      updatedAt: now,
    };
    this.purchaseMemory.set(existing._id, updated);
    return updated;
  }

  async deletePurchase(id: string): Promise<boolean> {
    const cleanId = String(id || '').trim();
    const existing = await this.findPurchaseById(cleanId);
    if (!existing) return false;

    if (this.isDbConnected()) {
      await this.purchaseModel.findByIdAndDelete(existing._id).exec();
    }
    this.purchaseMemory.delete(existing._id);
    return true;
  }

  async listPurchases(
    query: MiscPaginationQuery,
  ): Promise<PaginatedResult<IMiscellaneousPurchase>> {
    const {
      page,
      limit,
      search,
      activityId,
      startDate,
      endDate,
      paymentMethod,
      status,
    } = query;
    const skip = (page - 1) * limit;

    if (this.isDbConnected()) {
      const filter: Record<string, unknown> = {};
      if (activityId) {
        filter.activityId = activityId;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (paymentMethod && paymentMethod !== 'all') {
        filter.paymentMethod = paymentMethod;
      }
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          dateFilter.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          dateFilter.$lte = e;
        }
        filter.purchaseDate = dateFilter;
      }
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        filter.$or = [
          { referenceNumber: regex },
          { supplierName: regex },
          { invoiceNumber: regex },
          { description: regex },
          { activityName: regex },
        ];
      }

      const [items, total] = await Promise.all([
        this.purchaseModel
          .find(filter)
          .sort({ purchaseDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.purchaseModel.countDocuments(filter).exec(),
      ]);

      return {
        items: items.map((doc) => ({
          ...(doc as unknown as IMiscellaneousPurchase),
          _id: String((doc as unknown as IMiscellaneousPurchase)._id),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    let all = Array.from(this.purchaseMemory.values());
    if (activityId) {
      all = all.filter((p) => p.activityId === activityId);
    }
    if (status && status !== 'all') {
      all = all.filter((p) => p.status === status);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      all = all.filter((p) => p.paymentMethod === paymentMethod);
    }
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      all = all.filter((item) => new Date(item.purchaseDate) >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      all = all.filter((item) => new Date(item.purchaseDate) <= e);
    }
    if (search) {
      const term = search.toLowerCase();
      all = all.filter(
        (p) =>
          p.referenceNumber.toLowerCase().includes(term) ||
          p.supplierName?.toLowerCase().includes(term) ||
          p.invoiceNumber?.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.activityName.toLowerCase().includes(term),
      );
    }

    all.sort(
      (a, b) =>
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = all.length;
    const paged = all.slice(skip, skip + limit);
    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ==========================================
  // SUMMARIES & FINANCIAL REPORTS
  // ==========================================

  async getSalesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscSalesSummary> {
    const query: MiscPaginationQuery = {
      page: 1,
      limit: 100000,
      activityId: filters?.activityId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      status: 'active',
    };
    const { items } = await this.listSales(query);

    const totalSales = items.reduce((sum, s) => sum + s.amount, 0);
    const totalTransactions = items.length;
    const averageTransactionValue =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Current month sales
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const salesThisMonth = items
      .filter((s) => {
        const d = new Date(s.salesDate);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      totalSales,
      totalSalesCount: totalTransactions,
      salesThisMonth,
      averageTransactionValue,
    };
  }

  async getPurchasesSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscPurchasesSummary> {
    const query: MiscPaginationQuery = {
      page: 1,
      limit: 100000,
      activityId: filters?.activityId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      status: 'active',
    };
    const { items } = await this.listPurchases(query);

    const totalPurchases = items.reduce((sum, p) => sum + p.amount, 0);
    const totalTransactions = items.length;
    const averageTransactionValue =
      totalTransactions > 0 ? totalPurchases / totalTransactions : 0;

    // Current month purchases
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const purchasesThisMonth = items
      .filter((p) => {
        const d = new Date(p.purchaseDate);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPurchases,
      totalPurchasesCount: totalTransactions,
      purchasesThisMonth,
      averageTransactionValue,
    };
  }

  async getOverviewSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    activityId?: string;
  }): Promise<MiscOverviewSummary> {
    const [salesResult, purchasesResult, activities] = await Promise.all([
      this.listSales({
        page: 1,
        limit: 100000,
        activityId: filters?.activityId,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: 'active',
      }),
      this.listPurchases({
        page: 1,
        limit: 100000,
        activityId: filters?.activityId,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: 'active',
      }),
      this.listActivities({ page: 1, limit: 1000 }),
    ]);

    const totalIncome = salesResult.items.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = purchasesResult.items.reduce((s, x) => s + x.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin =
      totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const salesThisMonth = salesResult.items
      .filter((s) => {
        const d = new Date(s.salesDate);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((sum, s) => sum + s.amount, 0);

    const purchasesThisMonth = purchasesResult.items
      .filter((p) => {
        const d = new Date(p.purchaseDate);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Activity breakdown map
    const breakdownMap = new Map<
      string,
      {
        activityId: string;
        activityName: string;
        status: 'active' | 'inactive';
        totalSales: number;
        totalPurchases: number;
        netProfit: number;
        salesCount: number;
        purchasesCount: number;
      }
    >();

    // Seed with existing activities
    for (const act of activities.items) {
      if (!filters?.activityId || act._id === filters.activityId) {
        breakdownMap.set(act._id, {
          activityId: act._id,
          activityName: act.name,
          status: act.status,
          totalSales: 0,
          totalPurchases: 0,
          netProfit: 0,
          salesCount: 0,
          purchasesCount: 0,
        });
      }
    }

    for (const s of salesResult.items) {
      const entry = breakdownMap.get(s.activityId) || {
        activityId: s.activityId,
        activityName: s.activityName,
        status: 'active' as const,
        totalSales: 0,
        totalPurchases: 0,
        netProfit: 0,
        salesCount: 0,
        purchasesCount: 0,
      };
      entry.salesCount += 1;
      entry.totalSales += s.amount;
      entry.netProfit += s.amount;
      breakdownMap.set(s.activityId, entry);
    }

    for (const p of purchasesResult.items) {
      const entry = breakdownMap.get(p.activityId) || {
        activityId: p.activityId,
        activityName: p.activityName,
        status: 'active' as const,
        totalSales: 0,
        totalPurchases: 0,
        netProfit: 0,
        salesCount: 0,
        purchasesCount: 0,
      };
      entry.purchasesCount += 1;
      entry.totalPurchases += p.amount;
      entry.netProfit -= p.amount;
      breakdownMap.set(p.activityId, entry);
    }

    const activityBreakdown = Array.from(breakdownMap.values()).sort(
      (a, b) => b.totalSales - a.totalSales,
    );

    const recentSales = salesResult.items.slice(0, 5);
    const recentPurchases = purchasesResult.items.slice(0, 5);

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      totalActivitiesCount: activities.total,
      totalSalesCount: salesResult.total,
      totalPurchasesCount: purchasesResult.total,
      salesThisMonth,
      purchasesThisMonth,
      activityBreakdown,
      recentSales,
      recentPurchases,
    };
  }

  async getActivitySummary(
    activityId: string,
    filters?: { startDate?: Date; endDate?: Date },
  ): Promise<MiscActivitySummary | null> {
    const activity = await this.findActivityById(activityId);
    if (!activity) return null;

    const [salesResult, purchasesResult] = await Promise.all([
      this.listSales({
        page: 1,
        limit: 100000,
        activityId: activity._id,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: 'active',
      }),
      this.listPurchases({
        page: 1,
        limit: 100000,
        activityId: activity._id,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: 'active',
      }),
    ]);

    const totalSales = salesResult.items.reduce((sum, s) => sum + s.amount, 0);
    const totalPurchases = purchasesResult.items.reduce((sum, p) => sum + p.amount, 0);
    const netProfit = totalSales - totalPurchases;

    return {
      activityId: activity._id,
      activityName: activity.name,
      activity,
      totalSales,
      totalPurchases,
      netProfit,
      salesCount: salesResult.total,
      purchasesCount: purchasesResult.total,
      recentSales: salesResult.items.slice(0, 5),
      recentPurchases: purchasesResult.items.slice(0, 5),
    };
  }
}

export const sharedMiscBusinessRepository = new MiscBusinessRepository();
