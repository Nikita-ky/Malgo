import { useState, useEffect } from 'react'
import MacroChart from './components/MacroChart'
import CotChart from './components/CotChart'
import Sidebar from './components/Sidebar'
import { useMacroData } from './hooks/useMacroData'
import { useCotData } from './hooks/useCotData'

const DEFAULT_MACRO = new Set([
  'UNRATE','CPIAUCSL','CPILFESL','FEDFUNDS','T10Y2Y',
  'M2SL','PAYEMS','GDPC1','RRPONTSYD','WALCL','MTSDS133FMS','NFCI',
])

const DEFAULT_COT = new Set(['EUR','JPY','GBP','10Y','SP500','GOLD'])

export default function App() {
  const [tab, setTab] = useState('macro')

  const {
    indicators, categories, seriesData, syncStatus: macroSyncStatus,
    loading: macroLoading, syncing: macroSyncing, error: macroError,
    loadSeries, syncNow,
  } = useMacroData()

  const [selected, setSelected] = useState(DEFAULT_MACRO)
  const [activeCat, setActiveCat] = useState('ALL')
  const [cols, setCols] = useState(3)

  useEffect(() => {
    if (Object.keys(indicators).length > 0) {
      loadSeries([...DEFAULT_MACRO])
    }
  }, [Object.keys(indicators).length])

  const {
    cotContracts, cotCats, cotData, loading: cotLoading, syncing: cotSyncing,
    error: cotError, loadCot, syncCot,
  } = useCotData()

  const [cotSelected, setCotSelected] = useState(DEFAULT_COT)
  const [activeCotCat, setActiveCotCat] = useState('ALL')
  const [cotCols, setCotCols] = useState(3)

  useEffect(() => {
    if (tab === 'cot' && cotSelected.size > 0) {
      loadCot([...cotSelected])
    }
  }, [tab])

  const toggleIndicator = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const selectAll = (cat) => {
    const ids = Object.entries(indicators).filter(([,v]) => v.cat === cat).map(([k]) => k)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => allSel ? n.delete(id) : n.add(id)); return n })
  }
  const toggleCot = (id) => {
    setCotSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const displayedMacro = [...selected].filter(id => activeCat === 'ALL' || indicators[id]?.cat === activeCat)
  const displayedCot = [...cotSelected].filter(id => activeCotCat === 'ALL' || cotContracts[id]?.cat === activeCotCat)

  const catCounts = Object.keys(categories).reduce((acc, cat) => {
    acc[cat] = [...selected].filter(id => indicators[id]?.cat === cat).length; return acc
  }, {})
  const cotCatCounts = Object.keys(cotCats).reduce((acc, cat) => {
    acc[cat] = [...cotSelected].filter(id => cotContracts[id]?.cat === cat).length; return acc
  }, {})

  const curCols = tab === 'macro' ? cols : cotCols
  const setCurCols = tab === 'macro' ? setCols : setCotCols

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#08080F', color:'#E2E8F0', fontFamily:'IBM Plex Sans' }}>

      <div style={{ padding:'0 20px', height:52, display:'flex', alignItems:'center', gap:16, borderBottom:'1px solid #0F1020', flexShrink:0, background:'#06060E' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#3B82F6,#6366F1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>◈</div>
          <span style={{ fontSize:16, fontWeight:700, letterSpacing:'-.02em' }}>mAlgo</span>
        </div>

        <div style={{ display:'flex', gap:2, background:'#0A0A18', padding:'3px', borderRadius:7, border:'1px solid #0F1020' }}>
          <button onClick={() => setTab('macro')} style={tabBtnStyle(tab==='macro','#3B82F6')}>📊 Macro</button>
          <button onClick={() => setTab('cot')}   style={tabBtnStyle(tab==='cot',  '#22D3EE')}>📋 COT</button>
        </div>

        <div style={{ display:'flex', gap:4, marginLeft:4, overflowX:'auto' }}>
          {tab === 'macro' ? (
            <>
              <button onClick={() => setActiveCat('ALL')} style={catTabStyle(activeCat==='ALL','#60A5FA')}>All ({selected.size})</button>
              {Object.entries(categories).map(([cat, info]) => catCounts[cat] > 0 && (
                <button key={cat} onClick={() => setActiveCat(cat)} style={catTabStyle(activeCat===cat, info.color)}>{info.icon} {info.label} ({catCounts[cat]})</button>
              ))}
            </>
          ) : (
            <>
              <button onClick={() => setActiveCotCat('ALL')} style={catTabStyle(activeCotCat==='ALL','#22D3EE')}>All ({cotSelected.size})</button>
              {Object.entries(cotCats).map(([cat, info]) => cotCatCounts[cat] > 0 && (
                <button key={cat} onClick={() => setActiveCotCat(cat)} style={catTabStyle(activeCotCat===cat, info.color)}>{info.icon} {info.label} ({cotCatCounts[cat]})</button>
              ))}
            </>
          )}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {(tab==='macro' ? macroError : cotError) && (
            <span style={{ fontSize:11, color:'#F87171', fontFamily:'IBM Plex Mono' }}>⚠ {tab==='macro' ? macroError : cotError}</span>
          )}
          <div style={{ display:'flex', gap:3 }}>
            {[2,3,4].map(n => (
              <button key={n} onClick={() => setCurCols(n)}
                style={{ ...smallBtn, background: curCols===n ? '#1E293B':'transparent', color: curCols===n ? '#94A3B8':'#334155' }}>
                {n}col
              </button>
            ))}
          </div>
          {tab === 'macro' ? (
            <>
              <button onClick={() => loadSeries([...selected])} disabled={macroLoading} style={{ ...actionBtn, background:'#1E293B', color:'#94A3B8' }}>
                {macroLoading ? '…' : '⟳ Load'}
              </button>
              <button onClick={() => syncNow([...selected])} disabled={macroSyncing} style={{ ...actionBtn, background: macroSyncing?'#1A2744':'#172554', color: macroSyncing?'#60A5FA':'#93C5FD', border:'1px solid #1E3A5F' }}>
                {macroSyncing ? '⟳ Syncing…' : '↓ Sync FRED'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => loadCot([...cotSelected])} disabled={cotLoading} style={{ ...actionBtn, background:'#1E293B', color:'#94A3B8' }}>
                {cotLoading ? '…' : '⟳ Load'}
              </button>
              <button onClick={() => syncCot([...cotSelected])} disabled={cotSyncing} style={{ ...actionBtn, background: cotSyncing?'#0E2A2A':'#0A2020', color: cotSyncing?'#22D3EE':'#67E8F9', border:'1px solid #164E4E' }}>
                {cotSyncing ? '⟳ Syncing…' : '↓ Sync COT'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {tab === 'macro' ? (
          <Sidebar indicators={indicators} categories={categories} selected={selected} onToggle={toggleIndicator} onSelectAll={selectAll} syncStatus={macroSyncStatus} />
        ) : (
          <CotSidebar contracts={cotContracts} cats={cotCats} selected={cotSelected} onToggle={toggleCot} cotData={cotData} />
        )}

        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {tab === 'macro' ? (
            <>
              {displayedMacro.length === 0 && <Empty />}
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12 }}>
                {displayedMacro.map(id => {
                  const sd = seriesData[id]
                  return <MacroChart key={id} seriesId={id} meta={{ ...indicators[id], ...(sd?.meta||{}) }} observations={sd?.observations||[]} loading={macroLoading && !sd} />
                })}
              </div>
              <StatusBar items={['Source: FRED (stlouisfed.org)', 'Data from: 2000-01-01', `Series loaded: ${Object.keys(seriesData).length}`, `Selected: ${selected.size}`]} />
            </>
          ) : (
            <>
              {displayedCot.length === 0 && <Empty />}
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${cotCols}, 1fr)`, gap:12 }}>
                {displayedCot.map(id => {
                  const d = cotData[id]
                  return <CotChart key={id} contractId={id} meta={cotContracts[id]} observations={d?.observations||[]} loading={cotLoading && !d} />
                })}
              </div>
              <StatusBar items={['Source: CFTC COT', 'Weekly data since 2000', `Contracts loaded: ${Object.keys(cotData).length}`, `Selected: ${cotSelected.size}`]} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CotSidebar({ contracts, cats, selected, onToggle, cotData }) {
  return (
    <div style={{ width:220, background:'#06060E', borderRight:'1px solid #0F1020', display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0 }}>
      <div style={{ padding:'12px 14px 8px', fontSize:10, fontFamily:'IBM Plex Mono', color:'#1E3A5F', letterSpacing:'.08em' }}>COT CONTRACTS</div>
      {Object.entries(cats).map(([cat, catInfo]) => {
        const ids = Object.entries(contracts).filter(([,v]) => v.cat === cat).map(([k]) => k)
        return (
          <div key={cat}>
            <div style={{ padding:'6px 14px 4px', fontSize:9, fontFamily:'IBM Plex Mono', color:catInfo.color, letterSpacing:'.1em' }}>{catInfo.icon} {catInfo.label}</div>
            {ids.map(id => {
              const c = contracts[id]
              const obs = cotData[id]?.observations
              const last = obs?.[obs.length-1]
              const isSel = selected.has(id)
              return (
                <div key={id} onClick={() => onToggle(id)} style={{
                  padding:'5px 14px', cursor:'pointer',
                  background: isSel ? `${c.color}10` : 'transparent',
                  borderLeft: `2px solid ${isSel ? c.color : 'transparent'}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  transition:'all .1s',
                }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color: isSel ? '#E2E8F0':'#475569' }}>{id}</div>
                    <div style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono' }}>{c.label}</div>
                  </div>
                  {last && (
                    <div style={{ fontSize:9, fontFamily:'IBM Plex Mono', color: last.net_spec>0 ? '#34D399':'#F87171' }}>
                      {last.net_spec>0?'+':''}{(last.net_spec/1000).toFixed(0)}k
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const Empty = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60%', color:'#1E293B', fontFamily:'IBM Plex Mono', fontSize:13 }}>
    Select contracts in the sidebar →
  </div>
)

const StatusBar = ({ items }) => (
  <div style={{ marginTop:20, padding:'8px 12px', background:'#06060E', borderRadius:8, border:'1px solid #0F1020', display:'flex', gap:20, flexWrap:'wrap' }}>
    {items.map((l,i) => <span key={i} style={{ fontSize:10, fontFamily:'IBM Plex Mono', color:'#1E293B' }}>{l}</span>)}
  </div>
)

const tabBtnStyle = (active, color) => ({
  padding:'4px 14px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
  fontFamily:'IBM Plex Sans', background: active ? `${color}20`:'transparent', color: active ? color:'#334155', transition:'all .15s',
})
const catTabStyle = (active, color) => ({
  padding:'4px 10px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
  fontFamily:'IBM Plex Sans', background: active ? `${color}18`:'transparent',
  border:`1px solid ${active ? color+'60':'transparent'}`, color: active ? color:'#475569', transition:'all .15s',
})
const actionBtn = { padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'IBM Plex Sans', transition:'all .15s' }
const smallBtn = { padding:'3px 8px', borderRadius:4, fontSize:10, cursor:'pointer', border:'1px solid #1A1A2E', fontFamily:'IBM Plex Mono', transition:'all .1s' }
