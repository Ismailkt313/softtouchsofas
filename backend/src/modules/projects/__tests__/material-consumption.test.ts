import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { sharedProjectMemoryStore } from '../models/project.model';
import { sharedRawMaterialMemoryStore } from '../../raw-materials/models/raw-material.model';
import { sharedStockMovementMemoryStore } from '../../raw-materials/models/stock-movement.model';
import { ProjectMaterialConsumptionService } from '../service/material-consumption.service';
import { adjustStock } from '../../raw-materials/controller/stock-movement.controller';

async function run() {
  const service = new ProjectMaterialConsumptionService();
  const materialId = new mongoose.Types.ObjectId().toHexString();
  const projectId = `test_${new mongoose.Types.ObjectId().toHexString()}`;
  const material = { _id: materialId, name: 'Test foam', normalizedName: materialId, unit: 'Kilogram' as const, quantityOnHand: 100, isActive: true };
  const project: any = { _id: projectId, projectId: projectId.toUpperCase(), name: 'Test project', status: 'In Progress', materialsConsumptionRecorded: false, materialsUsed: [] };
  sharedRawMaterialMemoryStore.set(materialId, material as any); sharedProjectMemoryStore.set(projectId, project);
  const lines = [{ materialId, quantity: 25, notes: 'Seat cushions' }];
  const result: any = await service.complete(projectId, lines, 'tester@example.com');
  assert.equal(result.status, 'Completed'); assert.equal(material.quantityOnHand, 75);
  assert.equal(result.materialsUsed[0].quantity, 25);
  const move: any = sharedStockMovementMemoryStore.get(`project:${projectId}:${materialId}`);
  assert.equal(move.previousQuantity, 100); assert.equal(move.newQuantity, 75); assert.equal(move.performedBy, 'tester@example.com');
  await service.complete(projectId, lines, 'tester@example.com'); assert.equal(material.quantityOnHand, 75, 're-completion must not deduct twice');
  project.status = 'In Progress'; await service.complete(projectId, [{ materialId, quantity: 40 }], 'tester@example.com'); assert.equal(material.quantityOnHand, 75, 're-completion after reopening must not deduct twice');
  let adjustmentStatus = 0; let adjustmentResponse: any;
  await adjustStock({ params: { id: materialId }, body: { direction: 'increase', quantity: 5, reason: 'physical_count', notes: 'Counted 5 kg extra' }, user: { id: 'adjuster', email: 'adjuster@example.com', role: 'admin' } } as any, { status(code: number) { adjustmentStatus = code; return this; }, json(value: any) { adjustmentResponse = value; return this; } } as any);
  assert.equal(adjustmentStatus, 200); assert.equal(adjustmentResponse.rawMaterial.quantityOnHand, 80);
  const adjustment: any = [...sharedStockMovementMemoryStore.values()].find(item => item.materialId === materialId && item.movementType === 'stock_adjustment_increase');
  assert.equal(adjustment.previousQuantity, 75); assert.equal(adjustment.newQuantity, 80); assert.equal(adjustment.performedBy, 'adjuster@example.com'); assert.equal(adjustment.notes, 'Counted 5 kg extra'); assert.ok(adjustment.createdAt instanceof Date);

  const lowMaterialId = new mongoose.Types.ObjectId().toHexString(); const lowProjectId = `test_${new mongoose.Types.ObjectId().toHexString()}`;
  sharedRawMaterialMemoryStore.set(lowMaterialId, { ...material, _id: lowMaterialId, quantityOnHand: 5 } as any);
  sharedProjectMemoryStore.set(lowProjectId, { ...project, _id: lowProjectId, projectId: lowProjectId.toUpperCase(), status: 'In Progress', materialsConsumptionRecorded: false, materialsUsed: [] });
  await assert.rejects(() => service.complete(lowProjectId, [{ materialId: lowMaterialId, quantity: 6 }], 'tester'), /Insufficient stock/);
  assert.equal(sharedRawMaterialMemoryStore.get(lowMaterialId)?.quantityOnHand, 5);

  const concurrentMaterialId = new mongoose.Types.ObjectId().toHexString();
  sharedRawMaterialMemoryStore.set(concurrentMaterialId, { ...material, _id: concurrentMaterialId, quantityOnHand: 50 } as any);
  const projectIds = [0, 1].map(() => `test_${new mongoose.Types.ObjectId().toHexString()}`);
  for (const id of projectIds) sharedProjectMemoryStore.set(id, { ...project, _id: id, projectId: id.toUpperCase(), status: 'In Progress', materialsConsumptionRecorded: false, materialsUsed: [] });
  const outcomes = await Promise.allSettled(projectIds.map(id => service.complete(id, [{ materialId: concurrentMaterialId, quantity: 40 }], 'tester')));
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(sharedRawMaterialMemoryStore.get(concurrentMaterialId)?.quantityOnHand, 10);
  for (const id of [projectId, lowProjectId, ...projectIds]) sharedProjectMemoryStore.delete(id);
  for (const id of [materialId, lowMaterialId, concurrentMaterialId]) sharedRawMaterialMemoryStore.delete(id);
  console.log('✓ Project material consumption, audit trail, insufficient stock, duplicate and concurrent guards passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
