import { useState, useEffect } from 'react'
import MacroChart from './components/MacroChart'
import Sidebar from './components/Sidebar'
import { useMacroData } from './hooks/useMacroData'

const DEFAULT_SELECTED = new Set([
  'UNRATE','CPIAUCSL','CPILFESL','FEDFUNDS','T10Y2Y',
  'M2SL','PAYEMS','GDPC1','RRPONTSYD','WALCL','MTSDS133FMS','NFCI',
])

export default function App() {
  const {
    indicators, categories, seriesData, syncStatus,
    loading, syncing, error, loadSeries, syncNow,
  } = useMacroData()

  const [selected, setSelected] = useState(DEFAULT_SELECTED)
  const [activeCat, setActiveCat] = useState('ALL')
  const [cols, setCols] = useState(3)

  // Load default series on first indicator load
  useEffect(() => {
    if (Object.keys(indicators).length > 0) {
      loadSeries([...DEFAULT_SELECTED])
    }
  }, [Object.keys(indicators).length])

  const toggleIndicator = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = (cat) => {
    const ids = Object.entries(indicators).filter(([, v]) => v.cat === cat).map(([k]) => k)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSel ? next.delete(id) : next.add(id))
      return next
    })
  }

  const handleLoadSelected = () => loadSeries([...selected])
  const handleSyncSelected = () => syncNow([...selected])

  const displayedIds = [...selected].filter(id => {
    if (activeCat === 'ALL') return true
    return indicators[id]?.cat === activeCat
  })

  const catCounts = Object.keys(categories).reduce((acc, cat) => {
    acc[cat] = [...selected].filter(id => indicators[id]?.cat === cat).length
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#08080F', color: '#E2E8F0', fontFamily: 'IBM Plex Sans' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        padding: '0 20px', height: 52,
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #0F1020', flexShrink: 0,
        background: '#06060E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg,#3B82F6,#6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>◈</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em' }}>mAlgo</span>
          <span style={{
            fontSize: 9, fontFamily: 'IBM Plex Mono', color: '#3B82F6',
            background: '#0F172A', padding: '2px 7px', borderRadius: 4,
            border: '1px solid #1E3A5F', letterSpacing: '.08em',
          }}>MACRO</span>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8, overflowX: 'auto' }}>
          <button
            onClick={() => setActiveCat('ALL')}
            style={tabStyle(activeCat === 'ALL', '#60A5FA')}
          >All ({selected.size})</button>
          {Object.entries(categories).map(([cat, info]) =>
            catCounts[cat] > 0 && (
              <button key={cat} onClick={() => setActiveCat(cat)} style={tabStyle(activeCat === cat, info.color)}>
                {info.icon} {info.label} ({catCounts[cat]})
              </button>
            )
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {error && <span style={{ fontSize: 11, color: '#F87171', fontFamily: 'IBM Plex Mono' }}>⚠ {error}</span>}

          {/* Grid cols */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setCols(n)}
                style={{ ...smallBtn, background: cols === n ? '#1E293B' : 'transparent', color: cols === n ? '#94A3B8' : '#334155' }}>
                {n}col
              </button>
            ))}
          </div>

          <button onClick={handleLoadSelected} disabled={loading}
            style={{ ...actionBtn, background: '#1E293B', color: '#94A3B8' }}>
            {loading ? '…' : '⟳ Load'}
          </button>

          <button onClick={handleSyncSelected} disabled={syncing}
            style={{ ...actionBtn, background: syncing ? '#1A2744' : '#172554', color: syncing ? '#60A5FA' : '#93C5FD', border: '1px solid #1E3A5F' }}>
            {syncing ? '⟳ Syncing…' : '↓ Sync FRED'}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <Sidebar
          indicators={indicators}
          categories={categories}
          selected={selected}
          onToggle={toggleIndicator}
          onSelectAll={selectAll}
          syncStatus={syncStatus}
        />

        {/* Chart grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {displayedIds.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#1E293B', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
              Select indicators in the sidebar →
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 12,
          }}>
            {displayedIds.map(id => {
              const sd = seriesData[id]
              return (
                <MacroChart
                  key={id}
                  seriesId={id}
                  meta={{ ...indicators[id], ...(sd?.meta || {}) }}
                  observations={sd?.observations || []}
                  loading={loading && !sd}
                />
              )
            })}
          </div>

          {/* Status bar */}
          <div style={{
            marginTop: 20, padding: '8px 12px', background: '#06060E',
            borderRadius: 8, border: '1px solid #0F1020',
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span style={statusLabel}>Source: FRED (stlouisfed.org)</span>
            <span style={statusLabel}>Data from: 2000-01-01</span>
            <span style={statusLabel}>Series loaded: {Object.keys(seriesData).length}</span>
            <span style={statusLabel}>Selected: {selected.size}</span>
            <span style={statusLabel}>Auto-sync: daily D / weekly W / monthly M</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const tabStyle = (active, color) => ({
  padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
  fontFamily: 'IBM Plex Sans',
  background: active ? `${color}18` : 'transparent',
  border: `1px solid ${active ? color + '60' : 'transparent'}`,
  color: active ? color : '#475569',
  transition: 'all .15s',
})

const actionBtn = {
  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: 'pointer', border: 'none', fontFamily: 'IBM Plex Sans',
  transition: 'all .15s',
}

const smallBtn = {
  padding: '3px 8px', borderRadius: 4, fontSize: 10,
  cursor: 'pointer', border: '1px solid #1A1A2E',
  fontFamily: 'IBM Plex Mono', transition: 'all .1s',
}

const statusLabel = {
  fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#1E293B',
}
