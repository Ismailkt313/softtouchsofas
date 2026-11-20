import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import {
  SupplierNotFoundError,
  SupplierService,
  SupplierValidationError,
} from '../service/supplier.service';
import { DuplicateSupplierError } from '../repository/supplier.repository';

export class SupplierController {
  constructor(private readonly supplierService: SupplierService = new SupplierService()) {}

  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof DuplicateSupplierError) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
      return;
    }
    if (error instanceof SupplierValidationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        errors: error.fieldErrors,
      });
      return;
    }
    if (error instanceof SupplierNotFoundError) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }
    next(error);
  }

  create = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const creator = {
        id: req.user?.id || req.user?.email || 'system',
        email: req.user?.email,
        name: req.user?.name || req.user?.email,
      };
      const supplier = await this.supplierService.createSupplier(
        req.body,
        creator,
      );
      res.status(201).json({
        message: 'Supplier created successfully.',
        supplier,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  update = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const supplier = await this.supplierService.updateSupplier(id, req.body);
      res.status(200).json({
        message: 'Supplier updated successfully.',
        supplier,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  getById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const supplier = await this.supplierService.getSupplierById(id);
      res.status(200).json({ supplier });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  list = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.supplierService.listSuppliers(
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  getPurchases = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const result = await this.supplierService.getSupplierPurchaseHistory(
        id,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };
}
