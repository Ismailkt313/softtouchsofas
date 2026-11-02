import api from '../../../services/api'

export async function fetchStockMovements(materialId, { page = 1, limit = 20, type = '', from = '', to = '' } = {}) {
  const response = await api.get(`/api/raw-materials/${encodeURIComponent(materialId)}/movements`, { params: { page, limit, ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) } })
  return response.data || { items: [], total: 0, page, limit, totalPages: 1 }
}

export async function submitStockAdjustment(materialId, payload) {
  const response = await api.post(`/api/raw-materials/${encodeURIComponent(materialId)}/adjustment`, payload)
  return response.data
}
