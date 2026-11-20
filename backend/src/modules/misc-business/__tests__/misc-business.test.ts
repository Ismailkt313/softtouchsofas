import assert from 'node:assert';
import {
  MiscBusinessRepository,
  DuplicateActivityError,
  ActivityInUseError,
} from '../repository/misc-business.repository';
import { MiscBusinessService } from '../service/misc-business.service';

async function runTests() {
  console.log('--- Running Misc Business Unit Tests ---');

  const repo = new MiscBusinessRepository(
    undefined as any,
    undefined as any,
    undefined as any,
    new Map(),
    new Map(),
    new Map(),
  );
  const service = new MiscBusinessService(repo);

  // 1. Create Business Activity
  const act1 = await service.createActivity(
    { name: 'Cushion Refurbishing', description: 'Restoration and refilling' },
    { userId: 'u1', name: 'Admin' },
  );
  assert.strictEqual(act1.name, 'Cushion Refurbishing');
  assert.strictEqual(act1.status, 'active');
  assert.strictEqual(act1.normalizedName, 'cushion refurbishing');
  console.log('✓ Activity created successfully');

  // 2. Prevent case-insensitive duplicate activity
  let duplicateCaught = false;
  try {
    await service.createActivity({ name: '  cushion   refurbishing  ' });
  } catch (err) {
    duplicateCaught = err instanceof DuplicateActivityError;
  }
  assert.strictEqual(duplicateCaught, true, 'Should reject duplicate normalized activity name');
  console.log('✓ Duplicate activity prevention works');

  // 3. Create second activity
  const act2 = await service.createActivity({
    name: 'Curtain Dry Cleaning',
    description: 'On-site or laundry dry cleaning',
  });

  // 4. Create Sales with auto-sequencing MS-0001, MS-0002
  const sale1 = await service.createSale(
    {
      activityId: act1._id,
      customerName: 'Alice Smith',
      description: 'Refurbished 4 cushions',
      amount: 1500,
      paymentMethod: 'Cash',
      salesDate: new Date('2026-11-10'),
    },
    { userId: 'u1', name: 'Admin' },
  );
  assert.strictEqual(sale1.referenceNumber, 'MS-0001');
  assert.strictEqual(sale1.amount, 1500);
  assert.strictEqual(sale1.activityName, 'Cushion Refurbishing');

  const sale2 = await service.createSale({
    activityId: act2._id,
    customerName: 'Bob Jones',
    description: 'Dry cleaning 6 velvet curtains',
    amount: 3200,
    paymentMethod: 'Bank Transfer',
    salesDate: new Date('2026-11-15'),
  });
  assert.strictEqual(sale2.referenceNumber, 'MS-0002');
  console.log('✓ Sales auto-sequencing MS-0001, MS-0002 verified');

  // 5. Create Purchases with auto-sequencing MP-0001, MP-0002
  const purchase1 = await service.createPurchase({
    activityId: act1._id,
    supplierName: 'Foam & Fiber Depot',
    description: 'Silicone fiber filling 20kg',
    amount: 600,
    paymentMethod: 'Cash',
    purchaseDate: new Date('2026-11-05'),
  });
  assert.strictEqual(purchase1.referenceNumber, 'MP-0001');
  assert.strictEqual(purchase1.amount, 600);

  const purchase2 = await service.createPurchase({
    activityId: act2._id,
    supplierName: 'CleanChem Supplies',
    description: 'Dry cleaning solvent 5L',
    amount: 800,
    paymentMethod: 'UPI',
    purchaseDate: new Date('2026-11-12'),
  });
  assert.strictEqual(purchase2.referenceNumber, 'MP-0002');
  console.log('✓ Purchases auto-sequencing MP-0001, MP-0002 verified');

  // 6. Check Overview Summary
  const overview = await service.getOverviewSummary();
  assert.strictEqual(overview.totalIncome, 4700); // 1500 + 3200
  assert.strictEqual(overview.totalExpenses, 1400); // 600 + 800
  assert.strictEqual(overview.netProfit, 3300); // 4700 - 1400
  assert.strictEqual(overview.totalSalesCount, 2);
  assert.strictEqual(overview.totalPurchasesCount, 2);
  assert.strictEqual(overview.activityBreakdown.length, 2);
  console.log('✓ Overview summary financial calculations verified (Income: 4700, Expenses: 1400, Net: 3300)');

  // 7. Check Activity Summary
  const act1Summary = await service.getActivitySummary(act1._id);
  assert.ok(act1Summary);
  assert.strictEqual(act1Summary.totalSales, 1500);
  assert.strictEqual(act1Summary.totalPurchases, 600);
  assert.strictEqual(act1Summary.netProfit, 900);
  console.log('✓ Activity-wise financial summary verified');

  // 8. Prevent Deleting Activity with Transactions
  let deleteBlocked = false;
  try {
    await service.deleteActivity(act1._id);
  } catch (err) {
    deleteBlocked = err instanceof ActivityInUseError;
  }
  assert.strictEqual(deleteBlocked, true, 'Should prevent deletion of activity with transactions');
  console.log('✓ Activity deletion guard with transactions verified');

  // 9. Deactivate Activity
  const updatedAct1 = await service.updateActivity(act1._id, { status: 'inactive' });
  assert.strictEqual(updatedAct1?.status, 'inactive');
  console.log('✓ Activity deactivation verified');

  console.log('All Misc Business Unit Tests Passed Successfully! 🎉');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
