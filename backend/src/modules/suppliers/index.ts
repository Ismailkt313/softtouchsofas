import { Router } from 'express';
import { requireAnyPermission, verifyToken } from '../../middleware/auth';
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
  requireAnyPermission(['suppliers.view', 'purchases.view']),
  supplierController.list,
);
supplierRouter.post(
  '/',
  requireAnyPermission(['suppliers.create', 'purchases.create']),
  supplierController.create,
);
supplierRouter.get(
  '/:id/purchases',
  requireAnyPermission(['suppliers.view', 'purchases.view']),
  supplierController.getPurchases,
);
supplierRouter.get(
  '/:id',
  requireAnyPermission(['suppliers.view', 'purchases.view']),
  supplierController.getById,
);
supplierRouter.patch(
  '/:id',
  requireAnyPermission(['suppliers.edit', 'purchases.edit']),
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
