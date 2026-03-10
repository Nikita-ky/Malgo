import { useState, useEffect, useCallback } from 'react'
import { getIndicators, getMultipleSeries, triggerSync, getSyncStatus } from '../api'

export function useMacroData() {
  const [indicators, setIndicators]   = useState({})
  const [categories, setCategories]   = useState({})
  const [seriesData, setSeriesData]   = useState({})
  const [syncStatus, setSyncStatus]   = useState({})
  const [loading, setLoading]         = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [error, setError]             = useState(null)

  // Load indicator registry on mount
  useEffect(() => {
    getIndicators()
      .then(r => {
        setIndicators(r.data.indicators)
        setCategories(r.data.categories)
      })
      .catch(e => setError(e.message))
  }, [])

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    try {
      const r = await getSyncStatus()
      setSyncStatus(r.data)
    } catch {}
  }, [])

  useEffect(() => { loadSyncStatus() }, [])

  // Fetch data for selected series
  const loadSeries = useCallback(async (ids) => {
    if (!ids.length) return
    setLoading(true)
    setError(null)
    try {
      const r = await getMultipleSeries(ids)
      setSeriesData(prev => ({ ...prev, ...r.data }))
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Manual sync trigger
  const syncNow = useCallback(async (ids = null) => {
    setSyncing(true)
    try {
      await triggerSync(ids)
      // Poll for data every 3s for 30s
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        if (ids) await loadSeries(ids)
        await loadSyncStatus()
        if (attempts >= 10) clearInterval(poll)
      }, 3000)
    } catch (e) {
      setError('Sync failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }, [loadSeries, loadSyncStatus])

  return {
    indicators, categories,
    seriesData, syncStatus,
    loading, syncing, error,
    loadSeries, syncNow, loadSyncStatus,
  }
}
