import mongoose, { Model } from 'mongoose';
import {
  ISupplier,
  ListSuppliersDto,
  PaginatedResult,
} from '../types';
import {
  normalizeSupplierKey,
  normalizeSupplierName,
  sharedSupplierMemoryStore,
  SupplierModel,
} from '../models/supplier.model';

export class DuplicateSupplierError extends Error {
  constructor(name: string) {
    super(`Supplier with name '${name}' already exists.`);
    this.name = 'DuplicateSupplierError';
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SupplierRepository {
  constructor(
    private supplierModel: Model<ISupplier> = SupplierModel,
    private supplierMemory: Map<string, ISupplier> = sharedSupplierMemoryStore,
  ) {}

  private isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async findSupplierById(id: string): Promise<ISupplier | null> {
    const cleanId = String(id || '').trim();
    if (!cleanId) return null;

    if (this.isDbConnected()) {
      if (mongoose.isValidObjectId(cleanId)) {
        const doc = await this.supplierModel.findById(cleanId).lean().exec();
        if (doc) {
          const typed = doc as unknown as ISupplier;
          return { ...typed, _id: String(typed._id) };
        }
      }
      return await this.findSupplierByNormalizedName(cleanId);
    }

    const item = this.supplierMemory.get(cleanId);
    if (item) return { ...item };
    return this.findSupplierByNormalizedName(cleanId);
  }

  async findSupplierByNormalizedName(
    normalizedName: string,
  ): Promise<ISupplier | null> {
    const cleanKey = normalizeSupplierKey(normalizedName);
    if (!cleanKey) return null;

    if (this.isDbConnected()) {
      const doc = await this.supplierModel
        .findOne({ normalizedName: cleanKey })
        .lean()
        .exec();
      if (!doc) return null;
      const typed = doc as unknown as ISupplier;
      return { ...typed, _id: String(typed._id) };
    }

    for (const item of this.supplierMemory.values()) {
      if (item.normalizedName === cleanKey) {
        return { ...item };
      }
    }
    return null;
  }

  async createSupplier(
    data: Omit<ISupplier, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ISupplier> {
    const cleanName = normalizeSupplierName(data.name);
    const normalizedName = normalizeSupplierKey(cleanName);

    const existing = await this.findSupplierByNormalizedName(normalizedName);
    if (existing) {
      throw new DuplicateSupplierError(existing.name);
    }

    if (this.isDbConnected()) {
      try {
        const created = await this.supplierModel.create({
          ...data,
          name: cleanName,
          normalizedName,
        });
        const plain = created.toObject() as unknown as ISupplier;
        return { ...plain, _id: String(created._id) };
      } catch (err: unknown) {
        const mongoError = err as { code?: number };
        if (mongoError?.code === 11000) {
          throw new DuplicateSupplierError(cleanName);
        }
        throw err;
      }
    }

    const id = new mongoose.Types.ObjectId().toHexString();
    const now = new Date();
    const record: ISupplier = {
      ...data,
      _id: id,
      name: cleanName,
      normalizedName,
      createdAt: now,
      updatedAt: now,
    };
    this.supplierMemory.set(id, record);
    return { ...record };
  }

  async updateSupplier(
    id: string,
    updates: Partial<ISupplier>,
  ): Promise<ISupplier | null> {
    const existing = await this.findSupplierById(id);
    if (!existing) return null;

    let cleanName = existing.name;
    let normalizedName = existing.normalizedName;

    if (updates.name && updates.name !== existing.name) {
      cleanName = normalizeSupplierName(updates.name);
      normalizedName = normalizeSupplierKey(cleanName);
      const duplicate = await this.findSupplierByNormalizedName(normalizedName);
      if (duplicate && String(duplicate._id) !== String(existing._id)) {
        throw new DuplicateSupplierError(duplicate.name);
      }
    }

    const nextData = {
      ...updates,
      name: cleanName,
      normalizedName,
      updatedAt: new Date(),
    };

    if (this.isDbConnected()) {
      try {
        const doc = await this.supplierModel
          .findByIdAndUpdate(id, { $set: nextData }, { returnDocument: 'after' })
          .lean()
          .exec();
        if (!doc) return null;
        const typed = doc as unknown as ISupplier;
        return { ...typed, _id: String(typed._id) };
      } catch (err: unknown) {
        const mongoError = err as { code?: number };
        if (mongoError?.code === 11000) {
          throw new DuplicateSupplierError(cleanName);
        }
        throw err;
      }
    }

    const updated = {
      ...existing,
      ...nextData,
    };
    this.supplierMemory.set(id, updated);
    return { ...updated };
  }

  async findSuppliers(
    filters: ListSuppliersDto,
  ): Promise<PaginatedResult<ISupplier>> {
    const page = Math.max(1, filters.page);
    const limit = Math.min(100, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    if (this.isDbConnected()) {
      const query: Record<string, unknown> = {};
      if (!filters.includeInactive) {
        query.isActive = true;
      }

      if (filters.search) {
        const rx = new RegExp(escapeRegex(filters.search), 'i');
        query.$or = [
          { name: rx },
          { contactPerson: rx },
          { phone: rx },
          { email: rx },
          { gstNumber: rx },
        ];
      }

      const [docs, total] = await Promise.all([
        this.supplierModel
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.supplierModel.countDocuments(query).exec(),
      ]);

      return {
        items: (docs as unknown as ISupplier[]).map((d) => ({
          ...d,
          _id: String(d._id),
        })),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    let items = Array.from(this.supplierMemory.values()).filter((item) =>
      filters.includeInactive ? true : item.isActive !== false,
    );

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.gstNumber && s.gstNumber.toLowerCase().includes(q)),
      );
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
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

  async countActiveSuppliers(): Promise<number> {
    if (this.isDbConnected()) {
      return await this.supplierModel.countDocuments({ isActive: true }).exec();
    }
    let count = 0;
    for (const s of this.supplierMemory.values()) {
      if (s.isActive !== false) count += 1;
    }
    return count;
  }
}
