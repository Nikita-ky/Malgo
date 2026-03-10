import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export const getIndicators = () => api.get('/api/indicators')
export const getMultipleSeries = (ids, start = '2000-01-01') =>
  api.get('/api/series', { params: { ids: ids.join(','), start } })
export const getSeries = (id, start = '2000-01-01') =>
  api.get(`/api/series/${id}`, { params: { start } })
export const triggerSync = (series_ids = null) =>
  api.post('/api/sync', series_ids ? { series_ids } : {})
export const getSyncStatus = () => api.get('/api/sync/status')

export default api
