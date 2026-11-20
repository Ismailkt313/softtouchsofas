export type MiscPaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'UPI'
  | 'Cheque'
  | 'Card'
  | 'Other';

export interface IBusinessActivity {
  _id: string;
  name: string;
  normalizedName: string;
  description: string;
  status: 'active' | 'inactive';
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMiscellaneousSale {
  _id: string;
  referenceNumber: string;
  salesDate: Date;
  activityId: string;
  activityName: string;
  customerName?: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  paymentMethod?: MiscPaymentMethod;
  notes?: string;
  attachments?: Array<{
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;
  status: 'active' | 'cancelled';
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMiscellaneousPurchase {
  _id: string;
  referenceNumber: string;
  purchaseDate: Date;
  activityId: string;
  activityName: string;
  supplierName?: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  paymentMethod?: MiscPaymentMethod;
  notes?: string;
  attachments?: Array<{
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;
  status: 'active' | 'cancelled';
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MiscOverviewSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalActivitiesCount: number;
  totalSalesCount: number;
  totalPurchasesCount: number;
  salesThisMonth: number;
  purchasesThisMonth: number;
  activityBreakdown: Array<{
    activityId: string;
    activityName: string;
    status: 'active' | 'inactive';
    totalSales: number;
    totalPurchases: number;
    netProfit: number;
    salesCount: number;
    purchasesCount: number;
  }>;
  recentSales: IMiscellaneousSale[];
  recentPurchases: IMiscellaneousPurchase[];
}

export interface MiscSalesSummary {
  totalSales: number;
  totalSalesCount: number;
  salesThisMonth: number;
  averageTransactionValue: number;
}

export interface MiscPurchasesSummary {
  totalPurchases: number;
  totalPurchasesCount: number;
  purchasesThisMonth: number;
  averageTransactionValue: number;
}

export interface MiscActivitySummary {
  activityId: string;
  activityName: string;
  activity?: IBusinessActivity;
  totalSales: number;
  totalPurchases: number;
  netProfit: number;
  salesCount: number;
  purchasesCount: number;
  recentSales?: IMiscellaneousSale[];
  recentPurchases?: IMiscellaneousPurchase[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
