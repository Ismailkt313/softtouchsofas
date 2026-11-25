import mongoose, { Types } from 'mongoose';
import {
  ProjectModel,
  IProject,
  sharedProjectMemoryStore,
} from '../models/project.model';
import {
  ProjectPaymentModel,
  IProjectPayment,
  PROJECT_PAYMENT_COUNTER_ID,
  formatPaymentSequenceCode,
  PaymentMethod,
} from '../models/project-payment.model';
import { ProjectCounterModel } from '../models/project-counter.model';
import {
  CreateProjectPaymentDto,
  ReverseProjectPaymentDto,
} from '../dto/project-payment.dto';
import { roundFinancialAmount } from './project-financial.service';

export interface ProjectPaymentSummary {
  contractValue: number | null;
  contractValueSet: boolean;
  totalReceived: number;
  outstandingBalance: number | null;
  excessPayment: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
  lastPaymentDate: Date | null;
  validPaymentCount: number;
}

export function calculateProjectPaymentMetrics(
  contractValue: number | null | undefined,
  validPayments: Array<{ amount: number; paymentDate?: Date }>,
): ProjectPaymentSummary {
  const totalReceived = roundFinancialAmount(
    validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  );

  const hasContractValue =
    contractValue !== null &&
    contractValue !== undefined &&
    !Number.isNaN(Number(contractValue)) &&
    Number(contractValue) > 0;

  const numericContractValue = hasContractValue
    ? roundFinancialAmount(Number(contractValue))
    : null;

  let latestPaymentDate: Date | null = null;
  for (const p of validPayments) {
    if (p.paymentDate) {
      const d = new Date(p.paymentDate);
      if (!latestPaymentDate || d.getTime() > latestPaymentDate.getTime()) {
        latestPaymentDate = d;
      }
    }
  }

  if (!hasContractValue) {
    return {
      contractValue: null,
      contractValueSet: false,
      totalReceived,
      outstandingBalance: null,
      excessPayment: 0,
      paymentStatus: totalReceived > 0 ? 'Partially Paid' : 'Unpaid',
      lastPaymentDate: latestPaymentDate,
      validPaymentCount: validPayments.length,
    };
  }

  const cv = numericContractValue!;

  if (totalReceived === 0) {
    return {
      contractValue: cv,
      contractValueSet: true,
      totalReceived: 0,
      outstandingBalance: cv,
      excessPayment: 0,
      paymentStatus: 'Unpaid',
      lastPaymentDate: null,
      validPaymentCount: validPayments.length,
    };
  }

  if (totalReceived < cv) {
    return {
      contractValue: cv,
      contractValueSet: true,
      totalReceived,
      outstandingBalance: roundFinancialAmount(cv - totalReceived),
      excessPayment: 0,
      paymentStatus: 'Partially Paid',
      lastPaymentDate: latestPaymentDate,
      validPaymentCount: validPayments.length,
    };
  }

  // totalReceived >= cv
  return {
    contractValue: cv,
    contractValueSet: true,
    totalReceived,
    outstandingBalance: 0,
    excessPayment: roundFinancialAmount(totalReceived - cv),
    paymentStatus: 'Fully Paid',
    lastPaymentDate: latestPaymentDate,
    validPaymentCount: validPayments.length,
  };
}

export class ProjectPaymentService {
  async getNextPaymentReference(): Promise<string> {
    const counter = await ProjectCounterModel.findByIdAndUpdate(
      PROJECT_PAYMENT_COUNTER_ID,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    return formatPaymentSequenceCode(counter.seq);
  }

  async resolveProject(identifier: string): Promise<IProject> {
    const trimmed = String(identifier || '').trim();
    if (!trimmed) {
      throw new Error('Project identifier is required.');
    }

    let project: IProject | null = null;
    if (Types.ObjectId.isValid(trimmed)) {
      project = await ProjectModel.findById(trimmed);
    }
    if (!project) {
      project = await ProjectModel.findOne({
        projectId: trimmed.toUpperCase(),
      });
    }

    if (!project) {
      throw new Error(`Project '${identifier}' not found.`);
    }

    return project;
  }

  async recalculateAndPersistProjectSummary(
    project: IProject,
  ): Promise<ProjectPaymentSummary> {
    try {
      const isObjectId = Types.ObjectId.isValid(String(project._id));
      const orClauses: Array<Record<string, unknown>> = [];
      if (project.projectId) {
        orClauses.push({ projectId: project.projectId.toUpperCase() });
      }
      if (isObjectId) {
        orClauses.push({ projectRefId: project._id });
      }
      const query: Record<string, unknown> = {
        status: 'valid',
        ...(orClauses.length > 0 ? { $or: orClauses } : {}),
      };

      const validPayments = await ProjectPaymentModel.find(query).select(
        'amount paymentDate',
      );

      const summary = calculateProjectPaymentMetrics(
        project.contractValue,
        validPayments,
      );

      const updateFilter: Record<string, unknown> = {};
      if (isObjectId && project.projectId) {
        updateFilter.$or = [
          { _id: project._id },
          { projectId: project.projectId.toUpperCase() },
        ];
      } else if (isObjectId) {
        updateFilter._id = project._id;
      } else if (project.projectId) {
        updateFilter.projectId = project.projectId.toUpperCase();
      }

      if (Object.keys(updateFilter).length > 0) {
        await ProjectModel.updateMany(updateFilter, {
          $set: {
            totalReceived: summary.totalReceived,
            outstandingBalance: summary.outstandingBalance,
            paymentStatus: summary.paymentStatus,
            excessPayment: summary.excessPayment,
            lastPaymentDate: summary.lastPaymentDate,
          },
        });
      }

      // Keep project instance updated in-place
      project.totalReceived = summary.totalReceived;
      project.outstandingBalance = summary.outstandingBalance;
      project.paymentStatus = summary.paymentStatus;
      project.excessPayment = summary.excessPayment;
      project.lastPaymentDate = summary.lastPaymentDate;

      // Keep sharedProjectMemoryStore synchronized
      const projectKey = String(project._id);
      const inMem =
        sharedProjectMemoryStore.get(projectKey) ||
        [...sharedProjectMemoryStore.values()].find(
          (p) =>
            p.projectId &&
            project.projectId &&
            p.projectId.toUpperCase() === project.projectId.toUpperCase(),
        );
      if (inMem) {
        inMem.totalReceived = summary.totalReceived;
        inMem.outstandingBalance = summary.outstandingBalance;
        inMem.paymentStatus = summary.paymentStatus;
        inMem.excessPayment = summary.excessPayment;
        inMem.lastPaymentDate = summary.lastPaymentDate;
      }

      return summary;
    } catch (err) {
      console.error('[ProjectPaymentService] Error persisting payment summary:', err);
      return calculateProjectPaymentMetrics(project.contractValue, []);
    }
  }

  async listPayments(identifier: string): Promise<{
    project: {
      id: string;
      projectId: string;
      name: string;
      clientName: string;
      contractValue: number | null;
      status: string;
    };
    summary: ProjectPaymentSummary;
    payments: Array<{
      id: string;
      paymentReference: string;
      amount: number;
      paymentDate: string;
      paymentMethod: PaymentMethod;
      transactionReference: string;
      notes: string;
      recordedBy: string;
      recordedByName: string;
      status: 'valid' | 'reversed';
      reversalReason?: string;
      reversedBy?: string;
      reversedByName?: string;
      reversedAt?: string;
      createdAt?: string;
    }>;
  }> {
    const project = await this.resolveProject(identifier);
    const isObjectId = Types.ObjectId.isValid(String(project._id));
    const findQuery: Record<string, unknown> = isObjectId
      ? {
          $or: [
            { projectRefId: project._id },
            { projectId: project.projectId.toUpperCase() },
          ],
        }
      : { projectId: project.projectId.toUpperCase() };

    const payments = await ProjectPaymentModel.find(findQuery).sort({
      paymentDate: -1,
      createdAt: -1,
    });

    const validPayments = payments.filter((p) => p.status === 'valid');
    const summary = calculateProjectPaymentMetrics(
      project.contractValue,
      validPayments,
    );

    return {
      project: {
        id: String(project._id),
        projectId: project.projectId,
        name: project.name,
        clientName: project.clientName,
        contractValue: project.contractValue ?? null,
        status: project.status,
      },
      summary,
      payments: payments.map((p) => ({
        id: String(p._id),
        paymentReference: p.paymentReference,
        amount: p.amount,
        paymentDate: p.paymentDate ? p.paymentDate.toISOString() : new Date().toISOString(),
        paymentMethod: p.paymentMethod,
        transactionReference: p.transactionReference || '',
        notes: p.notes || '',
        recordedBy: p.recordedBy,
        recordedByName: p.recordedByName,
        status: p.status,
        reversalReason: p.reversalReason || '',
        reversedBy: p.reversedBy || '',
        reversedByName: p.reversedByName || '',
        reversedAt: p.reversedAt ? p.reversedAt.toISOString() : undefined,
        createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
      })),
    };
  }

  async recordPayment(
    identifier: string,
    dto: CreateProjectPaymentDto,
    user: { id: string; name: string },
  ): Promise<{
    payment: IProjectPayment;
    summary: ProjectPaymentSummary;
  }> {
    const project = await this.resolveProject(identifier);

    // Calculate current summary before applying new payment
    const isObjectId = Types.ObjectId.isValid(String(project._id));
    const findQuery: Record<string, unknown> = {
      status: 'valid',
      ...(isObjectId
        ? {
            $or: [
              { projectRefId: project._id },
              { projectId: project.projectId.toUpperCase() },
            ],
          }
        : { projectId: project.projectId.toUpperCase() }),
    };

    const existingValidPayments = await ProjectPaymentModel.find(
      findQuery,
    ).select('amount paymentDate');

    const currentSummary = calculateProjectPaymentMetrics(
      project.contractValue,
      existingValidPayments,
    );

    let paymentAmount = dto.amount;

    if (dto.isFullPaymentSettlement) {
      if (!currentSummary.contractValueSet || currentSummary.contractValue === null) {
        throw new Error(
          'Contract Value is not set for this project. Please set a Contract Value before marking as Fully Paid.',
        );
      }
      if (
        currentSummary.outstandingBalance === null ||
        currentSummary.outstandingBalance <= 0
      ) {
        throw new Error(
          'This project has no remaining outstanding balance to settle.',
        );
      }
      paymentAmount = currentSummary.outstandingBalance;
    } else {
      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
      }

      // Check whether payment exceeds remaining outstanding balance
      if (
        currentSummary.contractValueSet &&
        currentSummary.outstandingBalance !== null
      ) {
        if (paymentAmount > currentSummary.outstandingBalance) {
          throw new Error(
            `Payment amount (₹${paymentAmount.toLocaleString(
              'en-IN',
            )}) cannot exceed the current outstanding balance (₹${currentSummary.outstandingBalance.toLocaleString(
              'en-IN',
            )}).`,
          );
        }
      }
    }

    // Auto-generate sequential reference
    const paymentReference = await this.getNextPaymentReference();

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    const payment = await ProjectPaymentModel.create({
      projectId: project.projectId,
      projectRefId: project._id,
      paymentReference,
      amount: roundFinancialAmount(paymentAmount),
      paymentDate,
      paymentMethod: dto.paymentMethod || 'Bank Transfer',
      transactionReference: dto.transactionReference || '',
      notes: dto.notes || (dto.isFullPaymentSettlement ? 'Final full payment settlement' : ''),
      recordedBy: user.id || 'system',
      recordedByName: user.name || 'System User',
      status: 'valid',
    });

    const updatedSummary = await this.recalculateAndPersistProjectSummary(project);

    return {
      payment,
      summary: updatedSummary,
    };
  }

  async reversePayment(
    identifier: string,
    paymentId: string,
    dto: ReverseProjectPaymentDto,
    user: { id: string; name: string },
  ): Promise<{
    payment: IProjectPayment;
    summary: ProjectPaymentSummary;
  }> {
    const project = await this.resolveProject(identifier);

    const isObjectId = Types.ObjectId.isValid(String(project._id));
    const findQuery: Record<string, unknown> = {
      _id: paymentId,
      ...(isObjectId
        ? {
            $or: [
              { projectRefId: project._id },
              { projectId: project.projectId.toUpperCase() },
            ],
          }
        : { projectId: project.projectId.toUpperCase() }),
    };

    const payment = await ProjectPaymentModel.findOne(findQuery);

    if (!payment) {
      throw new Error(`Payment '${paymentId}' not found for project '${project.projectId}'.`);
    }

    if (payment.status === 'reversed') {
      throw new Error('This payment has already been reversed.');
    }

    payment.status = 'reversed';
    payment.reversalReason = dto.reason;
    payment.reversedBy = user.id;
    payment.reversedByName = user.name;
    payment.reversedAt = new Date();
    await payment.save();

    const updatedSummary = await this.recalculateAndPersistProjectSummary(project);

    return {
      payment,
      summary: updatedSummary,
    };
  }
}

export const projectPaymentService = new ProjectPaymentService();
export default projectPaymentService;
