import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { SupplierModel, sharedSupplierMemoryStore } from '../models/supplier.model';
import { SupplierRepository, DuplicateSupplierError } from '../repository/supplier.repository';
import { SupplierService } from '../service/supplier.service';
import { PurchaseVoucherModel, sharedPurchaseVoucherMemoryStore } from '../../purchases/models/purchase-voucher.model';

test('Supplier Module & Payment Status Tests', async (t) => {
  const repository = new SupplierRepository();
  const service = new SupplierService(repository);

  await t.test('1. Supplier creation and duplicate prevention', async () => {
    sharedSupplierMemoryStore.clear();

    const created = await service.createSupplier(
      {
        name: 'Royal Timber & Foams',
        contactPerson: 'Haris Kumar',
        phone: '+91 9876543210',
        email: 'sales@royaltimber.com',
        address: 'Industrial Area, Kozhikode',
        gstNumber: '32ABCDE1234F1Z5',
        notes: 'Primary teak supplier',
      },
      { id: 'admin-1', name: 'Admin Manager', email: 'admin@softtouchsofas.com' },
    );

    assert.equal(created.name, 'Royal Timber & Foams');
    assert.equal(created.phone, '+91 9876543210');
    assert.equal(created.financialSummary.totalPurchaseValue, 0);
    assert.equal(created.financialSummary.totalOutstandingAmount, 0);

    // Duplicate creation test (case-insensitive)
    await assert.rejects(
      async () => {
        await service.createSupplier(
          {
            name: 'royal timber & FOAMS',
            phone: '123',
          },
          { id: 'admin-1', name: 'Admin Manager', email: 'admin@softtouchsofas.com' },
        );
      },
      (err: any) => err instanceof DuplicateSupplierError || err.name === 'DuplicateSupplierError' || err.statusCode === 409,
    );
  });

  await t.test('2. Supplier financial summary reflects vouchers in real time', async () => {
    // Retrieve the supplier
    const suppliers = await service.listSuppliers({});
    const supplier = suppliers.items.find((s) => s.name === 'Royal Timber & Foams');
    assert.ok(supplier);

    const supId = supplier.id;

    // Simulate 2 vouchers: 1 Paid (10,000), 1 Unpaid (15,000)
    const now = new Date();
    const v1Id = new mongoose.Types.ObjectId().toHexString();
    const v2Id = new mongoose.Types.ObjectId().toHexString();

    sharedPurchaseVoucherMemoryStore.set(v1Id, {
      _id: v1Id,
      voucherNumber: 'PV-TEST-001',
      purchaseDate: now,
      supplierId: supId,
      supplierName: 'Royal Timber & Foams',
      normalizedSupplierName: 'royal timber & foams',
      supplierInvoiceNumber: 'INV-001',
      normalizedInvoiceNumber: 'inv-001',
      projectRecordId: null,
      projectCode: null,
      projectName: null,
      entryMethod: 'manual',
      lineItems: [],
      subtotal: 10000,
      discountAmount: 0,
      taxAmount: 0,
      otherCharges: 0,
      finalTotal: 10000,
      paymentStatus: 'Paid',
      paidAt: now,
      notes: '',
      attachments: [],
      status: 'active',
      revision: 1,
      stockSync: { applied: false, appliedRevision: 0, appliedLines: [], lastSyncedAt: null },
      clientRequestId: null,
      createdBy: 'admin',
      createdByName: 'Admin',
      updatedBy: 'admin',
      updatedByName: 'Admin',
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
    });

    sharedPurchaseVoucherMemoryStore.set(v2Id, {
      _id: v2Id,
      voucherNumber: 'PV-TEST-002',
      purchaseDate: now,
      supplierId: supId,
      supplierName: 'Royal Timber & Foams',
      normalizedSupplierName: 'royal timber & foams',
      supplierInvoiceNumber: 'INV-002',
      normalizedInvoiceNumber: 'inv-002',
      projectRecordId: null,
      projectCode: null,
      projectName: null,
      entryMethod: 'manual',
      lineItems: [],
      subtotal: 15000,
      discountAmount: 0,
      taxAmount: 0,
      otherCharges: 0,
      finalTotal: 15000,
      paymentStatus: 'Unpaid',
      paidAt: null,
      notes: '',
      attachments: [],
      status: 'active',
      revision: 1,
      stockSync: { applied: false, appliedRevision: 0, appliedLines: [], lastSyncedAt: null },
      clientRequestId: null,
      createdBy: 'admin',
      createdByName: 'Admin',
      updatedBy: 'admin',
      updatedByName: 'Admin',
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
    });

    // Check financial summary
    const updatedSupplier = await service.getSupplierById(supId);
    assert.equal(updatedSupplier.financialSummary.totalPurchaseValue, 25000);
    assert.equal(updatedSupplier.financialSummary.totalPaidAmount, 10000);
    assert.equal(updatedSupplier.financialSummary.totalOutstandingAmount, 15000);
    assert.equal(updatedSupplier.financialSummary.totalVouchersCount, 2);
    assert.equal(updatedSupplier.financialSummary.unpaidBillsCount, 1);

    // Test purchase history
    const history = await service.getSupplierPurchaseHistory(supId, { paymentStatus: 'Unpaid' });
    assert.equal(history.total, 1);
    assert.equal(history.items[0].voucherNumber, 'PV-TEST-002');
  });

  await t.test('3. Supplier update', async () => {
    const suppliers = await service.listSuppliers({});
    const supplier = suppliers.items[0];

    const updated = await service.updateSupplier(supplier.id, {
      phone: '+91 9999988888',
      contactPerson: 'Haris K.',
    });

    assert.equal(updated.phone, '+91 9999988888');
    assert.equal(updated.contactPerson, 'Haris K.');
  });

  await t.test('4. Supplier pagination and directory summary', async () => {
    // Add additional suppliers to test pagination
    for (let i = 1; i <= 5; i++) {
      await service.createSupplier(
        {
          name: `Test Vendor ${i}`,
          contactPerson: `Person ${i}`,
          phone: `+91 900000000${i}`,
        },
        { id: 'admin-1', name: 'Admin', email: 'admin@softtouchsofas.com' },
      );
    }

    // List with page 1, limit 2
    const p1 = await service.listSuppliers({ page: 1, limit: 2 });
    assert.equal(p1.items.length, 2);
    assert.equal(p1.page, 1);
    assert.equal(p1.limit, 2);
    assert.ok(p1.total >= 6);
    assert.ok(p1.totalPages >= 3);
    assert.ok(p1.summary);
    assert.ok(p1.summary.activeSuppliersCount >= 6);
    assert.ok(p1.summary.totalPurchases >= 25000);
    assert.ok(p1.summary.totalOutstandingCredit >= 15000);
    assert.ok(p1.summary.unpaidBillsCount >= 1);

    // List with page 2, limit 2
    const p2 = await service.listSuppliers({ page: 2, limit: 2 });
    assert.equal(p2.items.length, 2);
    assert.equal(p2.page, 2);
    assert.notEqual(p1.items[0].id, p2.items[0].id);
  });
});
