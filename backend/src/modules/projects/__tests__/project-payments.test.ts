import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectDB } from '../../../config/db';
import { ProjectModel } from '../models/project.model';
import { ProjectPaymentModel } from '../models/project-payment.model';
import {
  calculateProjectPaymentMetrics,
  projectPaymentService,
} from '../service/project-payment.service';

async function runPaymentTests() {
  await connectDB();
  console.log('--- Starting Project Client Payments Test Suite ---');

  // Test 1: calculateProjectPaymentMetrics Unit Tests
  console.log('1. Testing calculateProjectPaymentMetrics calculation logic...');

  // 1a: Project without contract value
  const noCvUnpaid = calculateProjectPaymentMetrics(null, []);
  assert.strictEqual(noCvUnpaid.contractValueSet, false);
  assert.strictEqual(noCvUnpaid.contractValue, null);
  assert.strictEqual(noCvUnpaid.totalReceived, 0);
  assert.strictEqual(noCvUnpaid.outstandingBalance, null);
  assert.strictEqual(noCvUnpaid.paymentStatus, 'Unpaid');

  const noCvWithPayment = calculateProjectPaymentMetrics(null, [{ amount: 25000 }]);
  assert.strictEqual(noCvWithPayment.contractValueSet, false);
  assert.strictEqual(noCvWithPayment.totalReceived, 25000);
  assert.strictEqual(noCvWithPayment.outstandingBalance, null);
  assert.strictEqual(noCvWithPayment.paymentStatus, 'Partially Paid');

  // 1b: Project with contract value ₹1,00,000
  const cv100k = 100000;
  const initialUnpaid = calculateProjectPaymentMetrics(cv100k, []);
  assert.strictEqual(initialUnpaid.contractValueSet, true);
  assert.strictEqual(initialUnpaid.contractValue, 100000);
  assert.strictEqual(initialUnpaid.totalReceived, 0);
  assert.strictEqual(initialUnpaid.outstandingBalance, 100000);
  assert.strictEqual(initialUnpaid.excessPayment, 0);
  assert.strictEqual(initialUnpaid.paymentStatus, 'Unpaid');

  // 1c: Advance payment of ₹30,000
  const advance = calculateProjectPaymentMetrics(cv100k, [{ amount: 30000 }]);
  assert.strictEqual(advance.totalReceived, 30000);
  assert.strictEqual(advance.outstandingBalance, 70000);
  assert.strictEqual(advance.excessPayment, 0);
  assert.strictEqual(advance.paymentStatus, 'Partially Paid');

  // 1d: Cumulative multiple payments: ₹30,000 + ₹20,000 = ₹50,000
  const multiple = calculateProjectPaymentMetrics(cv100k, [
    { amount: 30000 },
    { amount: 20000 },
  ]);
  assert.strictEqual(multiple.totalReceived, 50000);
  assert.strictEqual(multiple.outstandingBalance, 50000);
  assert.strictEqual(multiple.excessPayment, 0);
  assert.strictEqual(multiple.paymentStatus, 'Partially Paid');

  // 1e: Full payment: ₹30,000 + ₹20,000 + ₹50,000 = ₹1,00,000
  const fullyPaid = calculateProjectPaymentMetrics(cv100k, [
    { amount: 30000 },
    { amount: 20000 },
    { amount: 50000 },
  ]);
  assert.strictEqual(fullyPaid.totalReceived, 100000);
  assert.strictEqual(fullyPaid.outstandingBalance, 0);
  assert.strictEqual(fullyPaid.excessPayment, 0);
  assert.strictEqual(fullyPaid.paymentStatus, 'Fully Paid');

  // 1f: Overpayment: contract value reduced to ₹80,000 with ₹1,00,000 received
  const overpaid = calculateProjectPaymentMetrics(80000, [
    { amount: 30000 },
    { amount: 20000 },
    { amount: 50000 },
  ]);
  assert.strictEqual(overpaid.totalReceived, 100000);
  assert.strictEqual(overpaid.outstandingBalance, 0);
  assert.strictEqual(overpaid.excessPayment, 20000);
  assert.strictEqual(overpaid.paymentStatus, 'Fully Paid');

  console.log('✓ Calculation logic passed all scenarios.');

  // Test 2: Database End-to-End Workflow
  console.log('2. Testing database payment creation, multiple advances, full settlement, and reversal...');

  const testProjectCode = `PRJ-TEST-${Date.now().toString().slice(-4)}`;
  const testProject = await ProjectModel.create({
    projectId: testProjectCode,
    name: 'Client Payment Test Project',
    clientName: 'Luxury Villa Client',
    category: 'Modular Sofa',
    status: 'In Progress',
    contractValue: 150000,
    costAlertThresholdPercent: 80,
    totalPurchases: 0,
    totalOtherExpenses: 0,
    totalCost: 0,
    createdBy: 'test_admin',
    costThresholdState: { warningCrossed: false, exceededCrossed: false, warningThresholdPercent: 80 },
    lastActivityAt: new Date(),
    lastActivityType: 'project_created',
  });

  const testUser = { id: 'usr_admin_test', name: 'Test Administrator' };

  // Step 2a: Record Advance Payment of ₹50,000
  const rec1 = await projectPaymentService.recordPayment(
    testProject.projectId,
    {
      amount: 50000,
      paymentMethod: 'Bank Transfer',
      transactionReference: 'NEFT-123456',
      notes: 'Initial advance booking payment',
    },
    testUser,
  );

  assert.strictEqual(rec1.summary.totalReceived, 50000);
  assert.strictEqual(rec1.summary.outstandingBalance, 100000);
  assert.strictEqual(rec1.summary.paymentStatus, 'Partially Paid');
  assert.ok(rec1.payment.paymentReference.startsWith('PAY-'));

  // Verify Project document was updated in MongoDB
  const projAfterRec1 = await ProjectModel.findById(testProject._id);
  assert.strictEqual(projAfterRec1?.totalReceived, 50000);
  assert.strictEqual(projAfterRec1?.outstandingBalance, 100000);
  assert.strictEqual(projAfterRec1?.paymentStatus, 'Partially Paid');

  // Step 2b: Record Intermediate Payment of ₹40,000
  const rec2 = await projectPaymentService.recordPayment(
    testProject.projectId,
    {
      amount: 40000,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-789012',
      notes: 'Second milestone payment',
    },
    testUser,
  );

  assert.strictEqual(rec2.summary.totalReceived, 90000);
  assert.strictEqual(rec2.summary.outstandingBalance, 60000);
  assert.strictEqual(rec2.summary.paymentStatus, 'Partially Paid');

  // Step 2c: Attempt payment exceeding outstanding balance (e.g. ₹70,000 > ₹60,000)
  await assert.rejects(
    async () => {
      await projectPaymentService.recordPayment(
        testProject.projectId,
        {
          amount: 70000,
          paymentMethod: 'Cash',
        },
        testUser,
      );
    },
    /cannot exceed the current outstanding balance/,
  );

  // Step 2d: Settle Final Balance using isFullPaymentSettlement
  const rec3 = await projectPaymentService.recordPayment(
    testProject.projectId,
    {
      isFullPaymentSettlement: true,
      amount: 0,
      paymentMethod: 'Cheque',
      transactionReference: 'CHQ-556677',
      notes: 'Final full payment settlement',
    },
    testUser,
  );

  assert.strictEqual(rec3.payment.amount, 60000);
  assert.strictEqual(rec3.summary.totalReceived, 150000);
  assert.strictEqual(rec3.summary.outstandingBalance, 0);
  assert.strictEqual(rec3.summary.paymentStatus, 'Fully Paid');

  // Verify Project in MongoDB is Fully Paid
  const projAfterRec3 = await ProjectModel.findById(testProject._id);
  assert.strictEqual(projAfterRec3?.totalReceived, 150000);
  assert.strictEqual(projAfterRec3?.outstandingBalance, 0);
  assert.strictEqual(projAfterRec3?.paymentStatus, 'Fully Paid');

  // Step 2e: List Payments for project
  const listResult = await projectPaymentService.listPayments(testProject.projectId);
  assert.strictEqual(listResult.payments.length, 3);
  assert.strictEqual(listResult.summary.paymentStatus, 'Fully Paid');
  assert.strictEqual(listResult.summary.totalReceived, 150000);

  // Step 2f: Reverse the second payment (₹40,000)
  const paymentToReverse = rec2.payment._id.toString();
  const revResult = await projectPaymentService.reversePayment(
    testProject.projectId,
    paymentToReverse,
    { reason: 'Client cheque bounce / reversed transaction' },
    testUser,
  );

  // Total should now be 150,000 - 40,000 = 110,000; outstanding 40,000; Partially Paid
  assert.strictEqual(revResult.payment.status, 'reversed');
  assert.strictEqual(revResult.payment.reversalReason, 'Client cheque bounce / reversed transaction');
  assert.strictEqual(revResult.summary.totalReceived, 110000);
  assert.strictEqual(revResult.summary.outstandingBalance, 40000);
  assert.strictEqual(revResult.summary.paymentStatus, 'Partially Paid');

  // Step 2g: Clean up test data
  await ProjectPaymentModel.deleteMany({ projectRefId: testProject._id });
  await ProjectModel.findByIdAndDelete(testProject._id);

  console.log('✓ All Project Client Payments End-to-End Tests Passed Successfully! 🎉');
  process.exit(0);
}

runPaymentTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
