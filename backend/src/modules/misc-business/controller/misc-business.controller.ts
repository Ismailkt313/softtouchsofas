import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import {
  MiscBusinessService,
  sharedMiscBusinessService,
} from '../service/misc-business.service';
import {
  DuplicateActivityError,
  ActivityInUseError,
} from '../repository/misc-business.repository';
import {
  validateCreateActivityDto,
  validateUpdateActivityDto,
} from '../dto/activity.dto';
import {
  validateCreateSaleDto,
  validateUpdateSaleDto,
} from '../dto/sale.dto';
import {
  validateCreatePurchaseDto,
  validateUpdatePurchaseDto,
} from '../dto/purchase.dto';
import { parseMiscQuery } from '../dto/query.dto';

export class MiscBusinessController {
  constructor(
    private readonly service: MiscBusinessService = sharedMiscBusinessService,
  ) {}

  private getUserContext(req: AuthenticatedRequest) {
    return {
      userId: req.user?.id || 'system',
      name: req.user?.name || req.user?.email || 'System',
      email: req.user?.email || '',
      role: req.user?.role || '',
    };
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  createActivity = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = validateCreateActivityDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid activity data.',
          errors: validation.errors,
        });
        return;
      }

      const activity = await this.service.createActivity(
        validation.data,
        this.getUserContext(req),
      );
      res.status(201).json({
        message: 'Business activity created successfully.',
        activity,
      });
    } catch (error) {
      if (error instanceof DuplicateActivityError) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  updateActivity = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const validation = validateUpdateActivityDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid update data.',
          errors: validation.errors,
        });
        return;
      }

      const activity = await this.service.updateActivity(
        id,
        validation.data,
        this.getUserContext(req),
      );

      if (!activity) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Business activity not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Business activity updated successfully.',
        activity,
      });
    } catch (error) {
      if (error instanceof DuplicateActivityError) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  deleteActivity = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const deleted = await this.service.deleteActivity(id);
      if (!deleted) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Business activity not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Business activity deleted successfully.',
      });
    } catch (error) {
      if (error instanceof ActivityInUseError) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  getActivity = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const activity = await this.service.getActivity(id);
      if (!activity) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Business activity not found.',
        });
        return;
      }

      res.status(200).json({ activity });
    } catch (error) {
      next(error);
    }
  };

  listActivities = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const result = await this.service.listActivities(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getActiveActivities = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const activities = await this.service.getAllActiveActivities();
      res.status(200).json({ activities });
    } catch (error) {
      next(error);
    }
  };

  getActivitySummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const summary = await this.service.getActivitySummary(id, {
        startDate: query.startDate,
        endDate: query.endDate,
      });

      if (!summary) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Business activity not found.',
        });
        return;
      }

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // SALES
  // ==========================================

  createSale = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = validateCreateSaleDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid sales data.',
          errors: validation.errors,
        });
        return;
      }

      const sale = await this.service.createSale(
        validation.data,
        this.getUserContext(req),
      );
      res.status(201).json({
        message: 'Miscellaneous sale recorded successfully.',
        sale,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSale = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const validation = validateUpdateSaleDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid sales update data.',
          errors: validation.errors,
        });
        return;
      }

      const sale = await this.service.updateSale(
        id,
        validation.data,
        this.getUserContext(req),
      );

      if (!sale) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous sale not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Miscellaneous sale updated successfully.',
        sale,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSale = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const deleted = await this.service.deleteSale(id);
      if (!deleted) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous sale not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Miscellaneous sale deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  getSale = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const sale = await this.service.getSale(id);
      if (!sale) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous sale not found.',
        });
        return;
      }

      res.status(200).json({ sale });
    } catch (error) {
      next(error);
    }
  };

  listSales = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const result = await this.service.listSales(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSalesSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const summary = await this.service.getSalesSummary({
        startDate: query.startDate,
        endDate: query.endDate,
        activityId: query.activityId,
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // PURCHASES
  // ==========================================

  createPurchase = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = validateCreatePurchaseDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid purchase data.',
          errors: validation.errors,
        });
        return;
      }

      const purchase = await this.service.createPurchase(
        validation.data,
        this.getUserContext(req),
      );
      res.status(201).json({
        message: 'Miscellaneous purchase recorded successfully.',
        purchase,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePurchase = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const validation = validateUpdatePurchaseDto(req.body);
      if (!validation.isValid || !validation.data) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid purchase update data.',
          errors: validation.errors,
        });
        return;
      }

      const purchase = await this.service.updatePurchase(
        id,
        validation.data,
        this.getUserContext(req),
      );

      if (!purchase) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous purchase not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Miscellaneous purchase updated successfully.',
        purchase,
      });
    } catch (error) {
      next(error);
    }
  };

  deletePurchase = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const deleted = await this.service.deletePurchase(id);
      if (!deleted) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous purchase not found.',
        });
        return;
      }

      res.status(200).json({
        message: 'Miscellaneous purchase deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  getPurchase = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = String(req.params.id || '').trim();
      const purchase = await this.service.getPurchase(id);
      if (!purchase) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Miscellaneous purchase not found.',
        });
        return;
      }

      res.status(200).json({ purchase });
    } catch (error) {
      next(error);
    }
  };

  listPurchases = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const result = await this.service.listPurchases(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getPurchasesSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const summary = await this.service.getPurchasesSummary({
        startDate: query.startDate,
        endDate: query.endDate,
        activityId: query.activityId,
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // OVERVIEW & REPORTS
  // ==========================================

  getOverview = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const summary = await this.service.getOverviewSummary({
        startDate: query.startDate,
        endDate: query.endDate,
        activityId: query.activityId,
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };

  getReports = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = parseMiscQuery(req.query as Record<string, unknown>);
      const summary = await this.service.getOverviewSummary({
        startDate: query.startDate,
        endDate: query.endDate,
        activityId: query.activityId,
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  };
}

export const sharedMiscBusinessController = new MiscBusinessController();
