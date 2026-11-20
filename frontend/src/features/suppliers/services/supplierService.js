import api from '../../../services/api';
import { clearStoredSession } from '../../auth';
import { roundMoney } from '../../purchases/utils/purchaseMath';
import { normalizePurchaseVoucher } from '../../purchases/services/purchaseService';

export function normalizeSupplier(raw = {}) {
  const fin = raw.financialSummary || {};
  return {
    id: String(raw.id || raw._id || ''),
    name: String(raw.name || ''),
    contactPerson: String(raw.contactPerson || ''),
    phone: String(raw.phone || ''),
    email: String(raw.email || ''),
    address: String(raw.address || ''),
    gstNumber: String(raw.gstNumber || ''),
    notes: String(raw.notes || ''),
    isActive: raw.isActive !== false,
    financialSummary: {
      totalPurchaseValue: roundMoney(fin.totalPurchaseValue || 0),
      totalPaidAmount: roundMoney(fin.totalPaidAmount || 0),
      totalOutstandingAmount: roundMoney(fin.totalOutstandingAmount || 0),
      totalVouchersCount: Number(fin.totalVouchersCount || 0),
      unpaidBillsCount: Number(fin.unpaidBillsCount || 0),
    },
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

export function extractSupplierApiError(
  error,
  fallbackMessage = 'Unable to complete the supplier request.',
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

  const normalized = new Error(message || fallbackMessage);
  normalized.status = status;
  normalized.fieldErrors = fieldErrors;
  return normalized;
}

export async function fetchSuppliers({
  page = 1,
  limit = 20,
  search = '',
} = {}) {
  try {
    const params = { page, limit };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await api.get('/api/suppliers', { params });
    const data = response.data || {};
    const rawList = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.suppliers)
        ? data.suppliers
        : [];

    return {
      items: rawList.map(normalizeSupplier),
      total: Number(data.total ?? rawList.length) || 0,
      page: Number(data.page ?? page) || 1,
      limit: Number(data.limit ?? limit) || limit,
      totalPages: Math.max(1, Number(data.totalPages ?? 1) || 1),
      summary: data.summary
        ? {
            activeSuppliersCount: Number(data.summary.activeSuppliersCount || 0),
            totalPurchases: roundMoney(data.summary.totalPurchases || 0),
            totalOutstandingCredit: roundMoney(
              data.summary.totalOutstandingCredit || 0,
            ),
            unpaidBillsCount: Number(data.summary.unpaidBillsCount || 0),
          }
        : null,
    };
  } catch (error) {
    throw extractSupplierApiError(error, 'Unable to load suppliers from the server.');
  }
}

export async function fetchSupplierById(id) {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    throw new Error('A valid supplier identifier is required.');
  }
  try {
    const response = await api.get(`/api/suppliers/${encodeURIComponent(cleanId)}`);
    const data = response.data || {};
    const rawSupplier = data.supplier || data;
    return normalizeSupplier(rawSupplier);
  } catch (error) {
    throw extractSupplierApiError(error, 'Unable to load supplier details.');
  }
}

export async function fetchSupplierPurchases(id, {
  page = 1,
  limit = 20,
  search = '',
  paymentStatus = 'all',
  fromDate = '',
  toDate = '',
} = {}) {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    throw new Error('A valid supplier identifier is required.');
  }
  try {
    const params = { page, limit };
    if (search && search.trim()) params.search = search.trim();
    if (paymentStatus && paymentStatus !== 'all') params.paymentStatus = paymentStatus;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const response = await api.get(
      `/api/suppliers/${encodeURIComponent(cleanId)}/purchases`,
      { params },
    );
    const data = response.data || {};
    const rawList = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.vouchers)
        ? data.vouchers
        : [];

    return {
      items: rawList.map(normalizePurchaseVoucher),
      total: Number(data.total ?? rawList.length) || 0,
      page: Number(data.page ?? page) || 1,
      limit: Number(data.limit ?? limit) || limit,
      totalPages: Math.max(1, Number(data.totalPages ?? 1) || 1),
    };
  } catch (error) {
    throw extractSupplierApiError(error, 'Unable to load supplier purchases.');
  }
}

export async function createSupplier(payload) {
  try {
    const response = await api.post('/api/suppliers', payload);
    const data = response.data || {};
    const rawSupplier = data.supplier || data;
    return normalizeSupplier(rawSupplier);
  } catch (error) {
    throw extractSupplierApiError(error, 'Unable to create supplier.');
  }
}

export async function updateSupplier(id, payload) {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    throw new Error('A valid supplier identifier is required.');
  }
  try {
    const response = await api.patch(
      `/api/suppliers/${encodeURIComponent(cleanId)}`,
      payload,
    );
    const data = response.data || {};
    const rawSupplier = data.supplier || data;
    return normalizeSupplier(rawSupplier);
  } catch (error) {
    throw extractSupplierApiError(error, 'Unable to update supplier.');
  }
}
