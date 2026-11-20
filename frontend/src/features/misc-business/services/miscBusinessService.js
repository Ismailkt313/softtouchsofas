import api from '../../../services/api';
import { clearStoredSession } from '../../auth';

export function roundMoney(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(roundMoney(amount));
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function extractMiscApiError(
  error,
  fallbackMessage = 'Unable to complete the request.',
) {
  const status = error?.response?.status || 0;
  const data = error?.response?.data;

  if (status === 401) {
    clearStoredSession();
  }

  const fieldErrors =
    data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)
      ? data.errors
      : null;

  let message = '';
  if (typeof data?.message === 'string' && data.message.trim()) {
    message = data.message.trim();
  } else if (fieldErrors) {
    const firstMsg = Object.values(fieldErrors).find(
      (val) => typeof val === 'string' && val.trim(),
    );
    if (firstMsg) {
      message = firstMsg.trim();
    }
  } else if (error?.code === 'ECONNABORTED') {
    message = 'The server took too long to respond. Please try again.';
  } else if (!error?.response && error?.message) {
    message = 'Unable to reach the server. Check your connection and try again.';
  }

  return {
    status,
    message: message || fallbackMessage,
    fieldErrors,
    rawError: error,
  };
}

export function normalizeActivity(raw = {}) {
  return {
    id: String(raw.id || raw._id || ''),
    name: String(raw.name || ''),
    description: String(raw.description || ''),
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    createdBy: String(raw.createdBy || ''),
    createdByName: String(raw.createdByName || ''),
    updatedBy: String(raw.updatedBy || ''),
    updatedByName: String(raw.updatedByName || ''),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

export function normalizeSale(raw = {}) {
  return {
    id: String(raw.id || raw._id || ''),
    referenceNumber: String(raw.referenceNumber || ''),
    salesDate: raw.salesDate || null,
    activityId: String(raw.activityId || ''),
    activityName: String(raw.activityName || ''),
    customerName: String(raw.customerName || ''),
    invoiceNumber: String(raw.invoiceNumber || ''),
    description: String(raw.description || ''),
    amount: roundMoney(raw.amount || 0),
    paymentMethod: String(raw.paymentMethod || 'Cash'),
    notes: String(raw.notes || ''),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    status: raw.status === 'cancelled' ? 'cancelled' : 'active',
    createdBy: String(raw.createdBy || ''),
    createdByName: String(raw.createdByName || ''),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

export function normalizePurchase(raw = {}) {
  return {
    id: String(raw.id || raw._id || ''),
    referenceNumber: String(raw.referenceNumber || ''),
    purchaseDate: raw.purchaseDate || null,
    activityId: String(raw.activityId || ''),
    activityName: String(raw.activityName || ''),
    supplierName: String(raw.supplierName || ''),
    invoiceNumber: String(raw.invoiceNumber || ''),
    description: String(raw.description || ''),
    amount: roundMoney(raw.amount || 0),
    paymentMethod: String(raw.paymentMethod || 'Cash'),
    notes: String(raw.notes || ''),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    status: raw.status === 'cancelled' ? 'cancelled' : 'active',
    createdBy: String(raw.createdBy || ''),
    createdByName: String(raw.createdByName || ''),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

export const miscBusinessService = {
  // ==========================================
  // ACTIVITIES
  // ==========================================
  async fetchActivities(params = {}) {
    try {
      const res = await api.get('/api/misc-business/activities', { params });
      const data = res.data || {};
      return {
        items: Array.isArray(data.items) ? data.items.map(normalizeActivity) : [],
        total: Number(data.total || 0),
        page: Number(data.page || 1),
        limit: Number(data.limit || 10),
        totalPages: Number(data.totalPages || 1),
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load business activities.');
    }
  },

  async fetchActiveActivities() {
    try {
      const res = await api.get('/api/misc-business/activities/active');
      const list = res.data?.activities || [];
      return list.map(normalizeActivity);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load active activities.');
    }
  },

  async fetchActivityById(id) {
    try {
      const res = await api.get(`/api/misc-business/activities/${id}`);
      return normalizeActivity(res.data?.activity);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load activity details.');
    }
  },

  async createActivity(payload) {
    try {
      const res = await api.post('/api/misc-business/activities', payload);
      return normalizeActivity(res.data?.activity);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to create business activity.');
    }
  },

  async updateActivity(id, payload) {
    try {
      const res = await api.put(`/api/misc-business/activities/${id}`, payload);
      return normalizeActivity(res.data?.activity);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to update business activity.');
    }
  },

  async deleteActivity(id) {
    try {
      const res = await api.delete(`/api/misc-business/activities/${id}`);
      return res.data;
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to delete business activity.');
    }
  },

  async fetchActivitySummary(id, params = {}) {
    try {
      const res = await api.get(`/api/misc-business/activities/${id}/summary`, {
        params,
      });
      const data = res.data || {};
      return {
        activityId: data.activityId,
        activityName: data.activityName,
        activity: data.activity ? normalizeActivity(data.activity) : null,
        totalSales: roundMoney(data.totalSales || 0),
        totalPurchases: roundMoney(data.totalPurchases || 0),
        netProfit: roundMoney(data.netProfit || 0),
        salesCount: Number(data.salesCount || 0),
        purchasesCount: Number(data.purchasesCount || 0),
        recentSales: Array.isArray(data.recentSales)
          ? data.recentSales.map(normalizeSale)
          : [],
        recentPurchases: Array.isArray(data.recentPurchases)
          ? data.recentPurchases.map(normalizePurchase)
          : [],
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load activity summary.');
    }
  },

  // ==========================================
  // SALES
  // ==========================================
  async fetchSales(params = {}) {
    try {
      const res = await api.get('/api/misc-business/sales', { params });
      const data = res.data || {};
      return {
        items: Array.isArray(data.items) ? data.items.map(normalizeSale) : [],
        total: Number(data.total || 0),
        page: Number(data.page || 1),
        limit: Number(data.limit || 10),
        totalPages: Number(data.totalPages || 1),
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load miscellaneous sales.');
    }
  },

  async fetchSaleById(id) {
    try {
      const res = await api.get(`/api/misc-business/sales/${id}`);
      return normalizeSale(res.data?.sale);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load sales details.');
    }
  },

  async createSale(payload) {
    try {
      const res = await api.post('/api/misc-business/sales', payload);
      return normalizeSale(res.data?.sale);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to record miscellaneous sale.');
    }
  },

  async updateSale(id, payload) {
    try {
      const res = await api.put(`/api/misc-business/sales/${id}`, payload);
      return normalizeSale(res.data?.sale);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to update miscellaneous sale.');
    }
  },

  async deleteSale(id) {
    try {
      const res = await api.delete(`/api/misc-business/sales/${id}`);
      return res.data;
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to delete miscellaneous sale.');
    }
  },

  async fetchSalesSummary(params = {}) {
    try {
      const res = await api.get('/api/misc-business/sales/summary', { params });
      const data = res.data || {};
      return {
        totalSales: roundMoney(data.totalSales || 0),
        totalSalesCount: Number(data.totalSalesCount || 0),
        salesThisMonth: roundMoney(data.salesThisMonth || 0),
        averageTransactionValue: roundMoney(data.averageTransactionValue || 0),
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load sales summary.');
    }
  },

  // ==========================================
  // PURCHASES
  // ==========================================
  async fetchPurchases(params = {}) {
    try {
      const res = await api.get('/api/misc-business/purchases', { params });
      const data = res.data || {};
      return {
        items: Array.isArray(data.items) ? data.items.map(normalizePurchase) : [],
        total: Number(data.total || 0),
        page: Number(data.page || 1),
        limit: Number(data.limit || 10),
        totalPages: Number(data.totalPages || 1),
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load miscellaneous purchases.');
    }
  },

  async fetchPurchaseById(id) {
    try {
      const res = await api.get(`/api/misc-business/purchases/${id}`);
      return normalizePurchase(res.data?.purchase);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load purchase details.');
    }
  },

  async createPurchase(payload) {
    try {
      const res = await api.post('/api/misc-business/purchases', payload);
      return normalizePurchase(res.data?.purchase);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to record miscellaneous purchase.');
    }
  },

  async updatePurchase(id, payload) {
    try {
      const res = await api.put(`/api/misc-business/purchases/${id}`, payload);
      return normalizePurchase(res.data?.purchase);
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to update miscellaneous purchase.');
    }
  },

  async deletePurchase(id) {
    try {
      const res = await api.delete(`/api/misc-business/purchases/${id}`);
      return res.data;
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to delete miscellaneous purchase.');
    }
  },

  async fetchPurchasesSummary(params = {}) {
    try {
      const res = await api.get('/api/misc-business/purchases/summary', { params });
      const data = res.data || {};
      return {
        totalPurchases: roundMoney(data.totalPurchases || 0),
        totalPurchasesCount: Number(data.totalPurchasesCount || 0),
        purchasesThisMonth: roundMoney(data.purchasesThisMonth || 0),
        averageTransactionValue: roundMoney(data.averageTransactionValue || 0),
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load purchases summary.');
    }
  },

  // ==========================================
  // OVERVIEW & REPORTS
  // ==========================================
  async fetchOverviewSummary(params = {}) {
    try {
      const res = await api.get('/api/misc-business/overview', { params });
      const data = res.data || {};
      return {
        totalIncome: roundMoney(data.totalIncome || 0),
        totalExpenses: roundMoney(data.totalExpenses || 0),
        netProfit: roundMoney(data.netProfit || 0),
        profitMargin: Number(data.profitMargin || 0),
        totalActivitiesCount: Number(data.totalActivitiesCount || 0),
        totalSalesCount: Number(data.totalSalesCount || 0),
        totalPurchasesCount: Number(data.totalPurchasesCount || 0),
        salesThisMonth: roundMoney(data.salesThisMonth || 0),
        purchasesThisMonth: roundMoney(data.purchasesThisMonth || 0),
        activityBreakdown: Array.isArray(data.activityBreakdown)
          ? data.activityBreakdown.map((ab) => ({
              activityId: ab.activityId,
              activityName: ab.activityName,
              status: ab.status,
              totalSales: roundMoney(ab.totalSales || 0),
              totalPurchases: roundMoney(ab.totalPurchases || 0),
              netProfit: roundMoney(ab.netProfit || 0),
              salesCount: Number(ab.salesCount || 0),
              purchasesCount: Number(ab.purchasesCount || 0),
            }))
          : [],
        recentSales: Array.isArray(data.recentSales)
          ? data.recentSales.map(normalizeSale)
          : [],
        recentPurchases: Array.isArray(data.recentPurchases)
          ? data.recentPurchases.map(normalizePurchase)
          : [],
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to load overview financial metrics.');
    }
  },

  async fetchReports(params = {}) {
    try {
      const res = await api.get('/api/misc-business/reports', { params });
      const data = res.data || {};
      return {
        totalIncome: roundMoney(data.totalIncome || 0),
        totalExpenses: roundMoney(data.totalExpenses || 0),
        netProfit: roundMoney(data.netProfit || 0),
        profitMargin: Number(data.profitMargin || 0),
        totalActivitiesCount: Number(data.totalActivitiesCount || 0),
        totalSalesCount: Number(data.totalSalesCount || 0),
        totalPurchasesCount: Number(data.totalPurchasesCount || 0),
        activityBreakdown: Array.isArray(data.activityBreakdown)
          ? data.activityBreakdown.map((ab) => ({
              activityId: ab.activityId,
              activityName: ab.activityName,
              status: ab.status,
              totalSales: roundMoney(ab.totalSales || 0),
              totalPurchases: roundMoney(ab.totalPurchases || 0),
              netProfit: roundMoney(ab.netProfit || 0),
              salesCount: Number(ab.salesCount || 0),
              purchasesCount: Number(ab.purchasesCount || 0),
            }))
          : [],
      };
    } catch (err) {
      throw extractMiscApiError(err, 'Failed to generate financial reports.');
    }
  },
};

export default miscBusinessService;
