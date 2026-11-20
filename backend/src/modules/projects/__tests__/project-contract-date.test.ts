import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { ProjectModel, sharedProjectMemoryStore } from '../models/project.model';
import { ProjectRepository } from '../repository/project.repository';
import { ProjectService } from '../service/project.service';
import { validateCreateProjectDto } from '../dto/create-project.dto';
import { validateUpdateProjectDto } from '../dto/update-project.dto';
import { calculateProjectFinancialMetrics, evaluateCostThresholdTransitions } from '../service/project-financial.service';
import { determineProjectHealthStatus } from '../../reports/service/reports.service';

async function runContractAndDateTests() {
  console.log('--- Running Project Contract Value & Creation Date Verification Tests ---');

  // 1. Validation: Create without Contract Value
  console.log('1. Validating project creation DTO without contractValue...');
  const createWithoutContract = validateCreateProjectDto({
    name: 'Sofa Without Contract',
    clientName: 'Client Alpha',
    category: 'Modular Sofa',
    description: 'Initial consultation phase',
  });
  assert.equal(createWithoutContract.isValid, true);
  assert.equal(createWithoutContract.value?.contractValue, null);

  // 2. Validation: Create with Contract Value
  console.log('2. Validating project creation DTO with contractValue...');
  const createWithContract = validateCreateProjectDto({
    name: 'Luxury Villa Curtains',
    clientName: 'Client Beta',
    category: 'Curtains',
    contractValue: 75000.5,
  });
  assert.equal(createWithContract.isValid, true);
  assert.equal(createWithContract.value?.contractValue, 75000.5);

  // 3. Validation: Creation Date default vs manual selection
  console.log('3. Validating project creation DTO creationDate parsing...');
  const createWithManualDate = validateCreateProjectDto({
    name: 'Bespoke Lounge',
    clientName: 'Client Gamma',
    creationDate: '2026-05-15',
  });
  assert.equal(createWithManualDate.isValid, true);
  assert.ok(createWithManualDate.value?.creationDate instanceof Date);
  assert.equal(createWithManualDate.value?.creationDate.getUTCFullYear(), 2026);
  assert.equal(createWithManualDate.value?.creationDate.getUTCMonth(), 4); // 0-indexed May
  assert.equal(createWithManualDate.value?.creationDate.getUTCDate(), 15);

  // 4. Validation: Update DTO for clearing contract value and modifying creation date
  console.log('4. Validating update DTO contractValue clearing & creationDate updates...');
  const updateClearContract = validateUpdateProjectDto({
    contractValue: null,
  });
  assert.equal(updateClearContract.isValid, true);
  assert.equal(updateClearContract.value?.contractValue, null);

  const updateEmptyStringContract = validateUpdateProjectDto({
    contractValue: '',
  });
  assert.equal(updateEmptyStringContract.isValid, true);
  assert.equal(updateEmptyStringContract.value?.contractValue, null);

  const updateSetContract = validateUpdateProjectDto({
    contractValue: 120000,
  });
  assert.equal(updateSetContract.isValid, true);
  assert.equal(updateSetContract.value?.contractValue, 120000);

  const updateCreationDate = validateUpdateProjectDto({
    creationDate: '2026-04-10',
  });
  assert.equal(updateCreationDate.isValid, true);
  assert.ok(updateCreationDate.value?.creationDate instanceof Date);
  assert.equal(updateCreationDate.value?.creationDate.toISOString().slice(0, 10), '2026-04-10');

  // 5. Verification: Immutable createdAt rejected in update DTO
  console.log('5. Validating createdAt rejection in update DTO...');
  const updateAttemptCreatedAt = validateUpdateProjectDto({
    createdAt: '2020-01-01',
  });
  assert.equal(updateAttemptCreatedAt.isValid, false);
  assert.ok(updateAttemptCreatedAt.errors?.createdAt);

  // 6. Service Integration: Create project without contract value
  console.log('6. Testing ProjectService.createProject without contract value...');
  const repo = new ProjectRepository();
  const service = new ProjectService(repo);

  const proj1 = await service.createProject(
    {
      name: 'No Contract Project',
      clientName: 'Client X',
      category: 'Modular Sofa',
      status: 'In Progress',
      description: 'Scope pending agreement',
      contractValue: null,
      costAlertThresholdPercent: 80,
    },
    'admin@softtouchsofas.com',
  );
  assert.equal(proj1.contractValue, null);
  assert.equal(proj1.estimatedProfit, null);
  assert.equal(proj1.costPercentage, null);
  assert.equal(proj1.estimatedProfitMargin, null);
  assert.ok(proj1.creationDate instanceof Date || typeof proj1.creationDate === 'string');
  assert.ok(proj1.createdAt instanceof Date || typeof proj1.createdAt === 'string');

  // 7. Service Integration: Create project with manual creation date and contract value
  console.log('7. Testing ProjectService.createProject with contract value and specific creationDate...');
  const manualDate = new Date('2026-03-01T00:00:00.000Z');
  const proj2 = await service.createProject(
    {
      name: 'Contract & Date Project',
      clientName: 'Client Y',
      category: 'Armchair',
      status: 'In Progress',
      description: 'Signed contract',
      contractValue: 50000,
      creationDate: manualDate,
      costAlertThresholdPercent: 80,
    },
    'admin@softtouchsofas.com',
  );
  assert.equal(proj2.contractValue, 50000);
  assert.equal(proj2.estimatedProfit, 50000);
  const proj2CreationDate = new Date(proj2.creationDate!);
  assert.equal(proj2CreationDate.toISOString().slice(0, 10), '2026-03-01');

  // 8. Service Integration: Edit existing project's contract value & creation date
  console.log('8. Testing ProjectService.updateProject: updating contract value and creation date...');
  const initialCreatedAt = new Date(proj2.createdAt!).getTime();

  // Wait 10ms to ensure timestamps differ if createdAt were touched
  await new Promise((resolve) => setTimeout(resolve, 20));

  const updatedProj2 = await service.updateProject(proj2.id, {
    contractValue: 65000,
    creationDate: new Date('2026-03-15T00:00:00.000Z'),
  });
  assert.equal(updatedProj2.contractValue, 65000);
  assert.equal(new Date(updatedProj2.creationDate!).toISOString().slice(0, 10), '2026-03-15');
  assert.equal(new Date(updatedProj2.createdAt!).getTime(), initialCreatedAt, 'createdAt must NEVER change when editing project');

  // 9. Service Integration: Clear existing contract value on proj2
  console.log('9. Testing ProjectService.updateProject: clearing existing contract value...');
  const clearedProj2 = await service.updateProject(proj2.id, {
    contractValue: null,
  });
  assert.equal(clearedProj2.contractValue, null);
  assert.equal(clearedProj2.estimatedProfit, null);
  assert.equal(clearedProj2.costPercentage, null);
  assert.equal(clearedProj2.estimatedProfitMargin, null);
  assert.equal(new Date(clearedProj2.createdAt!).getTime(), initialCreatedAt, 'createdAt must remain unchanged');

  // 10. Financial calculations and health status for projects with missing contract values
  console.log('10. Testing financial metrics & health status when contractValue is null...');
  const metricsNoContract = calculateProjectFinancialMetrics({
    contractValue: null,
    totalPurchases: 15000,
    totalOtherExpenses: 5000,
  });
  assert.equal(metricsNoContract.contractValue, null);
  assert.equal(metricsNoContract.totalCost, 20000);
  assert.equal(metricsNoContract.estimatedProfit, null, 'Must NOT calculate as 0 - 20000 = -20000');
  assert.equal(metricsNoContract.costPercentage, null);
  assert.equal(metricsNoContract.estimatedProfitMargin, null);

  const healthNoContract = determineProjectHealthStatus({
    contractValue: null,
    totalCost: 20000,
    estimatedProfit: null,
    costPercentage: null,
    warningThresholdPercent: 80,
  });
  assert.equal(healthNoContract, 'neutral', 'Missing contract value must NOT display as loss/over-budget');

  const transitionsNoContract = evaluateCostThresholdTransitions({
    previousState: { warningCrossed: false, exceededCrossed: false, warningThresholdPercent: 80 },
    contractValue: null,
    totalCost: 20000,
  });
  assert.equal(transitionsNoContract.triggerCriticalAlert, false, 'Missing contract value must NOT trigger critical overrun');
  assert.equal(transitionsNoContract.triggerWarningAlert, false);

  // 11. Existing projects backward compatibility: project with contractValue = 0
  console.log('11. Testing existing project compatibility (contractValue = 0)...');
  const zeroMetrics = calculateProjectFinancialMetrics({
    contractValue: 0,
    totalPurchases: 1000,
    totalOtherExpenses: 0,
  });
  assert.equal(zeroMetrics.contractValue, 0);
  assert.equal(zeroMetrics.totalCost, 1000);
  assert.equal(zeroMetrics.estimatedProfit, -1000);

  console.log('✓ All Project Contract Value & Creation Date tests passed successfully!');
}

runContractAndDateTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
