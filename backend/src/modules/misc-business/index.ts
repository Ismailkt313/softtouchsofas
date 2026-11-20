import { Router, Response, NextFunction } from 'express';
import { verifyToken } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types/auth';
import { PermissionKey } from '../permissions/service/permission.service-bridge';
import {
  MiscBusinessController,
  sharedMiscBusinessController,
} from './controller/misc-business.controller';
import {
  MiscBusinessService,
  sharedMiscBusinessService,
} from './service/misc-business.service';
import {
  MiscBusinessRepository,
  sharedMiscBusinessRepository,
} from './repository/misc-business.repository';

export function requireAnyPermission(keys: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }
    if (
      req.user.role === 'admin' ||
      (Array.isArray(req.user.permissions) &&
        keys.some((k) => req.user?.permissions?.includes(k)))
    ) {
      next();
      return;
    }
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource.',
    });
  };
}

export const miscBusinessRepository = sharedMiscBusinessRepository;
export const miscBusinessService = sharedMiscBusinessService;
export const miscBusinessController = sharedMiscBusinessController;

const miscBusinessRouter = Router();

miscBusinessRouter.use(verifyToken);

// ==========================================
// OVERVIEW & REPORTS
// ==========================================
miscBusinessRouter.get(
  '/overview',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getOverview,
);

miscBusinessRouter.get(
  '/reports',
  requireAnyPermission(['purchases.view', 'expenses.view', 'reports.view']),
  miscBusinessController.getReports,
);

// ==========================================
// BUSINESS ACTIVITIES
// ==========================================
miscBusinessRouter.get(
  '/activities/active',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getActiveActivities,
);

miscBusinessRouter.get(
  '/activities/:id/summary',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getActivitySummary,
);

miscBusinessRouter.get(
  '/activities/:id',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getActivity,
);

miscBusinessRouter.get(
  '/activities',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.listActivities,
);

miscBusinessRouter.post(
  '/activities',
  requireAnyPermission(['purchases.create', 'expenses.create']),
  miscBusinessController.createActivity,
);

miscBusinessRouter.put(
  '/activities/:id',
  requireAnyPermission(['purchases.edit', 'expenses.edit']),
  miscBusinessController.updateActivity,
);

miscBusinessRouter.delete(
  '/activities/:id',
  requireAnyPermission(['purchases.delete', 'expenses.delete']),
  miscBusinessController.deleteActivity,
);

// ==========================================
// MISCELLANEOUS SALES
// ==========================================
miscBusinessRouter.get(
  '/sales/summary',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getSalesSummary,
);

miscBusinessRouter.get(
  '/sales/:id',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getSale,
);

miscBusinessRouter.get(
  '/sales',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.listSales,
);

miscBusinessRouter.post(
  '/sales',
  requireAnyPermission(['purchases.create', 'expenses.create']),
  miscBusinessController.createSale,
);

miscBusinessRouter.put(
  '/sales/:id',
  requireAnyPermission(['purchases.edit', 'expenses.edit']),
  miscBusinessController.updateSale,
);

miscBusinessRouter.delete(
  '/sales/:id',
  requireAnyPermission(['purchases.delete', 'expenses.delete']),
  miscBusinessController.deleteSale,
);

// ==========================================
// MISCELLANEOUS PURCHASES
// ==========================================
miscBusinessRouter.get(
  '/purchases/summary',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getPurchasesSummary,
);

miscBusinessRouter.get(
  '/purchases/:id',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.getPurchase,
);

miscBusinessRouter.get(
  '/purchases',
  requireAnyPermission(['purchases.view', 'expenses.view', 'dashboard.view']),
  miscBusinessController.listPurchases,
);

miscBusinessRouter.post(
  '/purchases',
  requireAnyPermission(['purchases.create', 'expenses.create']),
  miscBusinessController.createPurchase,
);

miscBusinessRouter.put(
  '/purchases/:id',
  requireAnyPermission(['purchases.edit', 'expenses.edit']),
  miscBusinessController.updatePurchase,
);

miscBusinessRouter.delete(
  '/purchases/:id',
  requireAnyPermission(['purchases.delete', 'expenses.delete']),
  miscBusinessController.deletePurchase,
);

export {
  miscBusinessRouter,
  MiscBusinessController,
  MiscBusinessService,
  MiscBusinessRepository,
};

export * from './types';
export * from './models/business-activity.model';
export * from './models/miscellaneous-sale.model';
export * from './models/miscellaneous-purchase.model';

export default miscBusinessRouter;
