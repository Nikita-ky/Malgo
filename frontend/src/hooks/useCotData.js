import { useState, useCallback } from 'react'
import api from '../api'

const COT_CONTRACTS = {
  EUR:    { label: 'Euro FX',        cat: 'CURRENCY',      color: '#22D3EE' },
  JPY:    { label: 'Japanese Yen',   cat: 'CURRENCY',      color: '#38BDF8' },
  GBP:    { label: 'British Pound',  cat: 'CURRENCY',      color: '#818CF8' },
  CAD:    { label: 'Canadian Dollar',cat: 'CURRENCY',      color: '#A78BFA' },
  CHF:    { label: 'Swiss Franc',    cat: 'CURRENCY',      color: '#C084FC' },
  AUD:    { label: 'Aus Dollar',     cat: 'CURRENCY',      color: '#E879F9' },
  MXN:    { label: 'Mexican Peso',   cat: 'CURRENCY',      color: '#F472B6' },
  '10Y':  { label: '10Y T-Note',     cat: 'RATES',         color: '#FB923C' },
  '5Y':   { label: '5Y T-Note',      cat: 'RATES',         color: '#FBBF24' },
  '2Y':   { label: '2Y T-Note',      cat: 'RATES',         color: '#FCD34D' },
  '30Y':  { label: '30Y T-Bond',     cat: 'RATES',         color: '#FDE68A' },
  SP500:  { label: 'S&P 500',        cat: 'EQUITY',        color: '#4ADE80' },
  NQ:     { label: 'Nasdaq 100',     cat: 'EQUITY',        color: '#86EFAC' },
  RUT:    { label: 'Russell 2000',   cat: 'EQUITY',        color: '#6EE7B7' },
  GOLD:   { label: 'Gold',           cat: 'COMMODITIES',   color: '#FDE047' },
  SILVER: { label: 'Silver',         cat: 'COMMODITIES',   color: '#D1D5DB' },
  COPPER: { label: 'Copper',         cat: 'COMMODITIES',   color: '#F97316' },
}

const COT_CATS = {
  CURRENCY:   { label: 'FX',         icon: '💱', color: '#22D3EE' },
  RATES:      { label: 'Rates',      icon: '📈', color: '#FB923C' },
  EQUITY:     { label: 'Equity',     icon: '📊', color: '#4ADE80' },
  COMMODITIES:{ label: 'Commodities',icon: '🥇', color: '#FDE047' },
}

export function useCotData() {
  const [cotData, setCotData]     = useState({})
  const [loading, setLoading]     = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [error, setError]         = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)

  const loadCot = useCallback(async (ids) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/cot?ids=${ids.join(',')}`)
      const data = res.data
      setCotData(prev => {
        const next = { ...prev }
        Object.entries(data).forEach(([id, d]) => {
          next[id] = d
        })
        return next
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const syncCot = useCallback(async (ids) => {
    setSyncing(true)
    setError(null)
    try {
      await api.post('/api/cot/sync', ids?.length ? { contract_ids: ids } : {})
      // Poll status
      const poll = setInterval(async () => {
        try {
          const s = await api.get('/api/cot/sync/status')
          setSyncStatus(s.data)
          if (!s.data.running) {
            clearInterval(poll)
            setSyncing(false)
            if (ids?.length) await loadCot(ids)
          }
        } catch { clearInterval(poll); setSyncing(false) }
      }, 3000)
    } catch (e) {
      setError(e.message)
      setSyncing(false)
    }
  }, [loadCot])

  return {
    cotContracts: COT_CONTRACTS,
    cotCats: COT_CATS,
    cotData,
    loading,
    syncing,
    error,
    syncStatus,
    loadCot,
    syncCot,
  }
}
