import api from '../../../services/api'
import { getStoredSession } from '../../auth'

export const PROJECT_STATUS_OPTIONS = [
  'In Progress',
  'Under Review',
  'Completed',
]

export const PAYMENT_STATUS_OPTIONS = [
  'Unpaid',
  'Partially Paid',
  'Fully Paid',
]

export const PAYMENT_METHOD_OPTIONS = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Card',
  'Other',
]

export const PROJECT_CATEGORY_OPTIONS = [
  'Modular Sofa',
  'Curtains',
  'Armchair',
  'Bespoke Interior',
]

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PERCENT_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function hasActiveAuthToken() {
  const session = getStoredSession()
  return Boolean(session?.token || session?.accessToken)
}

export function isAdminUser(user) {
  if (!user || !user.role) {
    return false
  }
  return String(user.role).trim().toLowerCase().replace(/\s+/g, '_') === 'admin'
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return '—'
  }
  return CURRENCY_FORMATTER.format(num)
}

export function formatPercentage(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return '0%'
  }
  return `${PERCENT_FORMATTER.format(num)}%`
}

export function formatProjectDate(dateInput) {
  if (!dateInput) {
    return '—'
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number)
    const local = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(local)
  }
  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    const datePart = dateInput.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-').map(Number)
      const local = new Date(y, m - 1, d)
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(local)
    }
  }
  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function toProjectDateInputValue(value) {
  if (!value) {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }

  if (typeof value === 'string' && value.includes('T')) {
    const datePart = value.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatProjectDateTime(dateInput) {
  if (!dateInput) {
    return '—'
  }
  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

export function formatActivityTypeLabel(activityType) {
  switch (activityType) {
    case 'project_created':
      return 'Project created'
    case 'project_updated':
      return 'Project details updated'
    case 'purchase_voucher_created':
      return 'Purchase voucher recorded'
    case 'purchase_voucher_updated':
      return 'Purchase voucher updated'
    case 'purchase_voucher_deleted':
      return 'Purchase voucher removed'
    case 'expense_voucher_created':
      return 'Expense voucher recorded'
    case 'expense_voucher_updated':
      return 'Expense voucher updated'
    case 'expense_voucher_deleted':
      return 'Expense voucher removed'
    default:
      return 'Recorded activity'
  }
}

export function normalizeProject(raw = {}) {
  const warningThresholdPercent =
    Number(
      raw.costThresholdState?.warningThresholdPercent ??
        raw.costAlertThresholdPercent ??
        80,
    ) || 80

  const clientContactValue =
    typeof raw.clientContact === 'string'
      ? raw.clientContact.trim()
      : typeof raw.clientPhone === 'string'
        ? raw.clientPhone.trim()
        : typeof raw.clientEmail === 'string'
          ? raw.clientEmail.trim()
          : ''

  return {
    id: String(raw.id || raw._id || ''),
    projectId: String(raw.projectId || '').trim(),
    name: String(raw.name || '').trim() || 'Untitled Project',
    clientName: String(raw.clientName || '').trim() || '—',
    clientContact: clientContactValue,
    hasClientContactField:
      raw.clientContact !== undefined ||
      raw.clientPhone !== undefined ||
      raw.clientEmail !== undefined,
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim()
        : 'Modular Sofa',
    status: PROJECT_STATUS_OPTIONS.includes(raw.status)
      ? raw.status
      : 'In Progress',
    description: typeof raw.description === 'string' ? raw.description : '',
    materialsUsed: Array.isArray(raw.materialsUsed) ? raw.materialsUsed : [],
    creationDate: raw.creationDate || raw.createdAt || null,
    contractValue:
      raw.contractValue !== null &&
      raw.contractValue !== undefined &&
      Number.isFinite(Number(raw.contractValue))
        ? Number(raw.contractValue)
        : null,
    totalReceived: Number.isFinite(Number(raw.totalReceived))
      ? Number(raw.totalReceived)
      : 0,
    outstandingBalance:
      raw.outstandingBalance !== null &&
      raw.outstandingBalance !== undefined &&
      Number.isFinite(Number(raw.outstandingBalance))
        ? Number(raw.outstandingBalance)
        : null,
    paymentStatus:
      raw.paymentStatus ||
      (Number(raw.totalReceived) > 0
        ? Number(raw.contractValue) > 0 &&
          Number(raw.totalReceived) >= Number(raw.contractValue)
          ? 'Fully Paid'
          : 'Partially Paid'
        : 'Unpaid'),
    excessPayment: Number.isFinite(Number(raw.excessPayment))
      ? Number(raw.excessPayment)
      : 0,
    lastPaymentDate: raw.lastPaymentDate || null,
    totalPurchases: Number.isFinite(Number(raw.totalPurchases))
      ? Number(raw.totalPurchases)
      : 0,
    totalOtherExpenses: Number.isFinite(Number(raw.totalOtherExpenses))
      ? Number(raw.totalOtherExpenses)
      : 0,
    totalCost: Number.isFinite(Number(raw.totalCost))
      ? Number(raw.totalCost)
      : 0,
    estimatedProfit:
      raw.estimatedProfit !== null &&
      raw.estimatedProfit !== undefined &&
      Number.isFinite(Number(raw.estimatedProfit))
        ? Number(raw.estimatedProfit)
        : null,
    costPercentage:
      raw.costPercentage !== null &&
      raw.costPercentage !== undefined &&
      Number.isFinite(Number(raw.costPercentage))
        ? Number(raw.costPercentage)
        : null,
    estimatedProfitMargin:
      raw.estimatedProfitMargin !== null &&
      raw.estimatedProfitMargin !== undefined &&
      Number.isFinite(Number(raw.estimatedProfitMargin))
        ? Number(raw.estimatedProfitMargin)
        : null,
    profitType: raw.profitType || 'estimated',
    isAudited: Boolean(raw.isAudited),
    costAlertThresholdPercent:
      Number.isFinite(Number(raw.costAlertThresholdPercent)) &&
      Number(raw.costAlertThresholdPercent) > 0
        ? Number(raw.costAlertThresholdPercent)
        : warningThresholdPercent,
    costThresholdState: {
      warningCrossed: Boolean(raw.costThresholdState?.warningCrossed),
      exceededCrossed: Boolean(raw.costThresholdState?.exceededCrossed),
      warningThresholdPercent,
    },
    lastActivityAt: raw.lastActivityAt || raw.updatedAt || raw.createdAt || null,
    lastActivityType: raw.lastActivityType || 'project_created',
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export function normalizeFinancialSummary(rawSummary = {}, rawIntegrations = {}) {
  const warningThresholdPercent =
    Number(
      rawSummary.costThresholdState?.warningThresholdPercent ??
        rawSummary.costAlertThresholdPercent ??
        80,
    ) || 80

  return {
    id: String(rawSummary.id || rawSummary._id || ''),
    projectId: String(rawSummary.projectId || '').trim(),
    name: String(rawSummary.name || '').trim(),
    clientName: String(rawSummary.clientName || '').trim(),
    status: PROJECT_STATUS_OPTIONS.includes(rawSummary.status)
      ? rawSummary.status
      : 'In Progress',
    creationDate: rawSummary.creationDate || rawSummary.createdAt || null,
    contractValue:
      rawSummary.contractValue !== null &&
      rawSummary.contractValue !== undefined &&
      Number.isFinite(Number(rawSummary.contractValue))
        ? Number(rawSummary.contractValue)
        : null,
    totalReceived: Number.isFinite(Number(rawSummary.totalReceived))
      ? Number(rawSummary.totalReceived)
      : 0,
    outstandingBalance:
      rawSummary.outstandingBalance !== null &&
      rawSummary.outstandingBalance !== undefined &&
      Number.isFinite(Number(rawSummary.outstandingBalance))
        ? Number(rawSummary.outstandingBalance)
        : null,
    paymentStatus:
      rawSummary.paymentStatus ||
      (Number(rawSummary.totalReceived) > 0
        ? Number(rawSummary.contractValue) > 0 &&
          Number(rawSummary.totalReceived) >= Number(rawSummary.contractValue)
          ? 'Fully Paid'
          : 'Partially Paid'
        : 'Unpaid'),
    excessPayment: Number.isFinite(Number(rawSummary.excessPayment))
      ? Number(rawSummary.excessPayment)
      : 0,
    lastPaymentDate: rawSummary.lastPaymentDate || null,
    totalPurchases: Number.isFinite(Number(rawSummary.totalPurchases))
      ? Number(rawSummary.totalPurchases)
      : 0,
    totalOtherExpenses: Number.isFinite(Number(rawSummary.totalOtherExpenses))
      ? Number(rawSummary.totalOtherExpenses)
      : 0,
    totalCost: Number.isFinite(Number(rawSummary.totalCost))
      ? Number(rawSummary.totalCost)
      : 0,
    estimatedProfit:
      rawSummary.estimatedProfit !== null &&
      rawSummary.estimatedProfit !== undefined &&
      Number.isFinite(Number(rawSummary.estimatedProfit))
        ? Number(rawSummary.estimatedProfit)
        : null,
    costPercentage:
      rawSummary.costPercentage !== null &&
      rawSummary.costPercentage !== undefined &&
      Number.isFinite(Number(rawSummary.costPercentage))
        ? Number(rawSummary.costPercentage)
        : null,
    estimatedProfitMargin:
      rawSummary.estimatedProfitMargin !== null &&
      rawSummary.estimatedProfitMargin !== undefined &&
      Number.isFinite(Number(rawSummary.estimatedProfitMargin))
        ? Number(rawSummary.estimatedProfitMargin)
        : null,
    profitType: rawSummary.profitType || 'estimated',
    isAudited: Boolean(rawSummary.isAudited),
    costAlertThresholdPercent:
      Number.isFinite(Number(rawSummary.costAlertThresholdPercent)) &&
      Number(rawSummary.costAlertThresholdPercent) > 0
        ? Number(rawSummary.costAlertThresholdPercent)
        : warningThresholdPercent,
    costThresholdState: {
      warningCrossed: Boolean(rawSummary.costThresholdState?.warningCrossed),
      exceededCrossed: Boolean(rawSummary.costThresholdState?.exceededCrossed),
      warningThresholdPercent,
    },
    financialSummaryUpdatedAt: rawSummary.financialSummaryUpdatedAt || null,
    integrations: {
      purchaseModuleIntegrated: Boolean(
        rawIntegrations?.purchaseModuleIntegrated,
      ),
      expenseModuleIntegrated: Boolean(rawIntegrations?.expenseModuleIntegrated),
      schedulerConfigured: Boolean(rawIntegrations?.schedulerConfigured),
    },
  }
}

export function normalizeCostAlert(raw = {}) {
  return {
    id: String(raw.id || raw._id || ''),
    projectRecordId: String(raw.projectRecordId || ''),
    projectId: String(raw.projectId || raw.projectCode || '').trim(),
    projectName: String(raw.projectName || '').trim(),
    thresholdType: raw.thresholdType === 'critical' ? 'critical' : 'warning',
    thresholdPercent: Number.isFinite(Number(raw.thresholdPercent))
      ? Number(raw.thresholdPercent)
      : 80,
    contractValue: Number.isFinite(Number(raw.contractValue))
      ? Number(raw.contractValue)
      : 0,
    totalCost: Number.isFinite(Number(raw.totalCost))
      ? Number(raw.totalCost)
      : 0,
    costPercentage: Number.isFinite(Number(raw.costPercentage))
      ? Number(raw.costPercentage)
      : 0,
    message: String(raw.message || '').trim(),
    status: raw.status === 'resolved' ? 'resolved' : 'active',
    triggeredAt: raw.triggeredAt || null,
    resolvedAt: raw.resolvedAt || null,
    resolvedReason: raw.resolvedReason || null,
  }
}

export function deduplicateCostAlerts(alerts = []) {
  const seenIds = new Set()
  const seenActiveKeys = new Set()
  const result = []

  for (const raw of alerts) {
    const item = normalizeCostAlert(raw)
    if (item.id && seenIds.has(item.id)) {
      continue
    }
    if (item.status === 'active') {
      const activeKey = `${item.projectId || item.projectRecordId}::${item.thresholdType}`
      if (seenActiveKeys.has(activeKey)) {
        continue
      }
      seenActiveKeys.add(activeKey)
    }
    if (item.id) {
      seenIds.add(item.id)
    }
    result.push(item)
  }

  return result
}

export function normalizeActivityWarning(raw = {}) {
  return {
    id: String(raw.id || raw._id || ''),
    projectRecordId: String(raw.projectRecordId || ''),
    projectId: String(raw.projectId || raw.projectCode || '').trim(),
    projectName: String(raw.projectName || '').trim(),
    projectStatus: String(raw.projectStatus || 'In Progress'),
    lastActivityAt: raw.lastActivityAt || null,
    inactiveDays: Number.isFinite(Number(raw.inactiveDays))
      ? Number(raw.inactiveDays)
      : 0,
    inactivityThresholdDays: Number.isFinite(
      Number(raw.inactivityThresholdDays),
    )
      ? Number(raw.inactivityThresholdDays)
      : 14,
    message: String(raw.message || '').trim(),
    status: raw.status === 'resolved' ? 'resolved' : 'active',
    triggeredAt: raw.triggeredAt || null,
    resolvedAt: raw.resolvedAt || null,
    resolvedReason: raw.resolvedReason || null,
  }
}

export function deduplicateActivityWarnings(warnings = []) {
  const seenIds = new Set()
  const seenActiveProjects = new Set()
  const result = []

  for (const raw of warnings) {
    const item = normalizeActivityWarning(raw)
    if (item.id && seenIds.has(item.id)) {
      continue
    }
    if (item.status === 'active') {
      const activeKey = item.projectId || item.projectRecordId
      if (activeKey && seenActiveProjects.has(activeKey)) {
        continue
      }
      if (activeKey) {
        seenActiveProjects.add(activeKey)
      }
    }
    if (item.id) {
      seenIds.add(item.id)
    }
    result.push(item)
  }

  return result
}

function buildApiError(error, fallbackMessage) {
  const status = error?.response?.status
  const data = error?.response?.data
  const message =
    (typeof data?.message === 'string' && data.message.trim()) ||
    fallbackMessage

  const wrapped = new Error(message, { cause: error })
  wrapped.status = status
  wrapped.fieldErrors =
    data?.errors && typeof data.errors === 'object' ? data.errors : null
  wrapped.code = data?.code || null
  return wrapped
}

export const wrapProjectApiError = buildApiError

function sanitizeProjectWritePayload(input = {}) {
  const payload = {
    name: String(input.name ?? '').trim(),
    clientName: String(input.clientName ?? '').trim(),
    category:
      typeof input.category === 'string' && input.category.trim()
        ? input.category.trim()
        : PROJECT_CATEGORY_OPTIONS[0],
    description:
      typeof input.description === 'string' ? input.description.trim() : '',
  }

  if (input.contractValue !== undefined) {
    if (
      input.contractValue === null ||
      input.contractValue === '' ||
      Number.isNaN(Number(input.contractValue))
    ) {
      payload.contractValue = null
    } else {
      payload.contractValue = Number(input.contractValue)
    }
  }

  if (
    input.creationDate !== undefined &&
    input.creationDate !== null &&
    String(input.creationDate).trim() !== ''
  ) {
    payload.creationDate = String(input.creationDate).trim()
  }

  if (typeof input.status === 'string' && input.status.trim() !== '') {
    payload.status = input.status.trim()
  }

  if (
    input.costAlertThresholdPercent !== undefined &&
    input.costAlertThresholdPercent !== null &&
    String(input.costAlertThresholdPercent).trim() !== ''
  ) {
    payload.costAlertThresholdPercent = Number(input.costAlertThresholdPercent)
  }

  return payload
}

export async function fetchProjectCategories() {
  try {
    const response = await api.get('/api/projects/categories')
    const rawCategories = response?.data?.categories || response?.data || []
    if (Array.isArray(rawCategories)) {
      const mapped = rawCategories.map((c) =>
        typeof c === 'object' && c?.name ? c.name : String(c).trim(),
      )
      const set = new Set([...PROJECT_CATEGORY_OPTIONS, ...mapped])
      return Array.from(set).filter(Boolean)
    }
    return [...PROJECT_CATEGORY_OPTIONS]
  } catch (err) {
    return [...PROJECT_CATEGORY_OPTIONS]
  }
}

export async function createProjectCategory(name) {
  try {
    const cleanName = String(name || '').trim()
    const response = await api.post('/api/projects/categories', { name: cleanName })
    return response?.data?.category || response?.data
  } catch (error) {
    throw buildApiError(error, 'Failed to create project category.')
  }
}

export async function fetchProjects({
  page = 1,
  limit = 10,
  search = '',
  status = 'all',
  category = 'all',
} = {}) {
  const params = { page, limit }
  if (search && search.trim()) {
    params.search = search.trim()
  }
  if (status && status !== 'all') {
    params.status = status
  }
  if (category && category !== 'all') {
    params.category = category
  }

  try {
    const response = await api.get('/api/projects', { params })
    const rawItems = Array.isArray(response.data?.projects)
      ? response.data.projects
      : Array.isArray(response.data?.items)
        ? response.data.items
        : []

    return {
      projects: rawItems.map(normalizeProject),
      total: Number(response.data?.total ?? rawItems.length) || 0,
      page: Number(response.data?.page ?? page) || 1,
      limit: Number(response.data?.limit ?? limit) || limit,
      totalPages: Math.max(1, Number(response.data?.totalPages ?? 1) || 1),
    }
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to load projects from the server. Please check your connection and try again.',
    )
  }
}

export async function fetchProjectById(identifier) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project ID is required.')
  }

  try {
    const response = await api.get(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}`,
    )
    return normalizeProject(response.data?.project || response.data)
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to load the requested project details.',
    )
  }
}

export async function createProject(input) {
  try {
    const payload = sanitizeProjectWritePayload(input)
    const response = await api.post('/api/projects', payload)
    return normalizeProject(response.data?.project || response.data)
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to create project. Please review the form details and try again.',
    )
  }
}

export async function updateProject(identifier, input) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project identifier is required for updates.')
  }

  try {
    const payload = sanitizeProjectWritePayload(input)
    const response = await api.patch(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}`,
      payload,
    )
    return normalizeProject(response.data?.project || response.data)
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to save project changes. Please review your inputs and try again.',
    )
  }
}

export async function updateProjectStatus(identifier, status, options = {}) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project identifier is required for status updates.')
  }

  const normalizedStatus = String(status || '').trim()
  if (!PROJECT_STATUS_OPTIONS.includes(normalizedStatus)) {
    throw new Error(
      `Status must be one of: ${PROJECT_STATUS_OPTIONS.join(', ')}.`,
    )
  }

  try {
    const response = await api.patch(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}/status`,
      { status: normalizedStatus, ...(options.materialsUsed !== undefined ? { materialsUsed: options.materialsUsed } : {}) },
    )
    return normalizeProject(response.data?.project || response.data)
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to update project status. Please try again.',
    )
  }
}

export async function fetchProjectFinancialSummary(identifier) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project identifier is required.')
  }

  try {
    const response = await api.get(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}/financial-summary`,
    )
    return normalizeFinancialSummary(
      response.data?.summary || response.data,
      response.data?.integrations,
    )
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to load the project financial summary.',
    )
  }
}

export async function recalculateProjectFinancials(identifier) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project identifier is required.')
  }

  try {
    const response = await api.post(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}/recalculate-financials`,
    )
    return normalizeFinancialSummary(
      response.data?.summary || response.data,
      response.data?.integrations,
    )
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to recalculate project financial totals.',
    )
  }
}

export async function fetchProjectCostAlerts({
  page = 1,
  limit = 50,
  projectId,
  status = 'active',
  thresholdType,
} = {}) {
  const params = { page, limit }
  if (projectId) {
    params.projectId = projectId
  }
  if (status) {
    params.status = status
  }
  if (thresholdType) {
    params.thresholdType = thresholdType
  }

  try {
    const response = await api.get('/api/projects/alerts', { params })
    const rawAlerts = Array.isArray(response.data?.alerts)
      ? response.data.alerts
      : Array.isArray(response.data?.items)
        ? response.data.items
        : []

    const alerts = deduplicateCostAlerts(rawAlerts.map(normalizeCostAlert))
    return {
      alerts,
      total: Number(response.data?.total ?? alerts.length) || 0,
      page: Number(response.data?.page ?? page) || 1,
      totalPages: Math.max(1, Number(response.data?.totalPages ?? 1) || 1),
    }
  } catch (error) {
    throw buildApiError(error, 'Unable to load project cost threshold alerts.')
  }
}

export async function fetchSingleProjectCostAlerts(identifier) {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('A valid project identifier is required.')
  }

  try {
    const response = await api.get(
      `/api/projects/${encodeURIComponent(String(identifier).trim())}/alerts`,
    )
    const rawAlerts = Array.isArray(response.data?.alerts)
      ? response.data.alerts
      : []
    return {
      projectId: String(response.data?.projectId || identifier),
      alerts: deduplicateCostAlerts(rawAlerts.map(normalizeCostAlert)),
    }
  } catch (error) {
    throw buildApiError(error, 'Unable to load alerts for this project.')
  }
}

export async function fetchProjectActivityWarnings({
  page = 1,
  limit = 50,
  projectId,
  status = 'active',
  evaluate = true,
  inactivityDays,
} = {}) {
  const params = {
    page,
    limit,
    status,
    evaluate: String(Boolean(evaluate)),
  }
  if (projectId) {
    params.projectId = projectId
  }
  if (inactivityDays !== undefined && inactivityDays !== null) {
    params.inactivityDays = inactivityDays
  }

  try {
    const response = await api.get('/api/projects/activity-warnings', {
      params,
    })
    const rawWarnings = Array.isArray(response.data?.warnings)
      ? response.data.warnings
      : Array.isArray(response.data?.items)
        ? response.data.items
        : []

    const warnings = deduplicateActivityWarnings(
      rawWarnings.map(normalizeActivityWarning),
    )

    return {
      warnings,
      total: Number(response.data?.total ?? warnings.length) || 0,
      inactivityThresholdDays:
        Number(response.data?.inactivityThresholdDays) || 14,
      schedulerConfigured: Boolean(response.data?.schedulerConfigured),
    }
  } catch (error) {
    throw buildApiError(error, 'Unable to load project inactivity warnings.')
  }
}

export async function triggerActivityWarningsEvaluation({
  inactivityDays,
} = {}) {
  try {
    const body =
      inactivityDays !== undefined && inactivityDays !== null
        ? { inactivityDays: Number(inactivityDays) }
        : {}
    const response = await api.post(
      '/api/projects/activity-warnings/evaluate',
      body,
    )
    const rawWarnings = Array.isArray(response.data?.warnings)
      ? response.data.warnings
      : []

    return {
      evaluatedCount: Number(response.data?.evaluatedCount) || 0,
      newlyTriggeredCount: Number(response.data?.newlyTriggeredCount) || 0,
      activeWarningsCount: Number(response.data?.activeWarningsCount) || 0,
      inactivityThresholdDays:
        Number(response.data?.inactivityThresholdDays) || 14,
      schedulerConfigured: Boolean(response.data?.schedulerConfigured),
      warnings: deduplicateActivityWarnings(
        rawWarnings.map(normalizeActivityWarning),
      ),
    }
  } catch (error) {
    throw buildApiError(
      error,
      'Unable to evaluate project inactivity right now.',
    )
  }
}

export async function fetchProjectPayments(projectIdentifier) {
  if (!projectIdentifier) {
    throw new Error('Project identifier is required.')
  }
  try {
    const response = await api.get(
      `/api/projects/${encodeURIComponent(projectIdentifier)}/payments`,
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, 'Unable to load project client payments.')
  }
}

export async function recordProjectPayment(projectIdentifier, paymentPayload) {
  if (!projectIdentifier) {
    throw new Error('Project identifier is required.')
  }
  try {
    const response = await api.post(
      `/api/projects/${encodeURIComponent(projectIdentifier)}/payments`,
      paymentPayload,
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, 'Unable to record client payment.')
  }
}

export async function reverseProjectPayment(
  projectIdentifier,
  paymentId,
  reversalPayload,
) {
  if (!projectIdentifier || !paymentId) {
    throw new Error('Project and payment identifiers are required.')
  }
  try {
    const response = await api.post(
      `/api/projects/${encodeURIComponent(projectIdentifier)}/payments/${encodeURIComponent(paymentId)}/reverse`,
      reversalPayload,
    )
    return response.data
  } catch (error) {
    throw buildApiError(error, 'Unable to reverse client payment.')
  }
}
