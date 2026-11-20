import { Router } from 'express';
import { requirePermission, verifyToken } from '../../middleware/auth';
import { SupplierController } from './controller/supplier.controller';
import { SupplierRepository } from './repository/supplier.repository';
import { SupplierService } from './service/supplier.service';

export const supplierRepository = new SupplierRepository();
export const supplierService = new SupplierService(supplierRepository);
export const supplierController = new SupplierController(supplierService);

const supplierRouter = Router();

supplierRouter.use(verifyToken);

supplierRouter.get(
  '/',
  requirePermission('purchases.view'),
  supplierController.list,
);
supplierRouter.post(
  '/',
  requirePermission('purchases.create'),
  supplierController.create,
);
supplierRouter.get(
  '/:id/purchases',
  requirePermission('purchases.view'),
  supplierController.getPurchases,
);
supplierRouter.get(
  '/:id',
  requirePermission('purchases.view'),
  supplierController.getById,
);
supplierRouter.patch(
  '/:id',
  requirePermission('purchases.edit'),
  supplierController.update,
);

export {
  supplierRouter,
  SupplierController,
  SupplierService,
  SupplierRepository,
};
export * from './types';
export * from './models/supplier.model';

export default supplierRouter;
