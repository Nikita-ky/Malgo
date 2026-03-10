import { useState } from 'react'

export default function Sidebar({ indicators, categories, selected, onToggle, onSelectAll, syncStatus }) {
  const [openCat, setOpenCat] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = Object.entries(indicators).filter(([id, info]) =>
    !search || info.label.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase())
  )

  const byCat = (cat) => filtered.filter(([, v]) => v.cat === cat)
  const catSelected = (cat) => byCat(cat).filter(([id]) => selected.has(id)).length

  return (
    <div style={{
      width: 240, flexShrink: 0, background: '#06060E',
      borderRight: '1px solid #0F1020',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'IBM Plex Sans',
      overflowY: 'auto',
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 8px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search indicators…"
          style={{
            width: '100%', background: '#0D0D1A', border: '1px solid #1A1A2E',
            borderRadius: 6, padding: '7px 10px', color: '#CBD5E1',
            fontSize: 12, fontFamily: 'IBM Plex Mono', outline: 'none',
          }}
        />
      </div>

      {/* Categories */}
      {Object.entries(categories).map(([cat, catInfo]) => {
        const items = byCat(cat)
        if (!items.length) return null
        const selCount = catSelected(cat)
        const isOpen = openCat === cat || !!search
        return (
          <div key={cat}>
            <div
              onClick={() => setOpenCat(isOpen && !search ? null : cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer',
                background: isOpen ? '#0D0D1A' : 'transparent',
                borderLeft: `3px solid ${isOpen ? catInfo.color : 'transparent'}`,
              }}
            >
              <span style={{ color: catInfo.color, fontSize: 13 }}>{catInfo.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#E2E8F0' : '#64748B', flex: 1 }}>{catInfo.label}</span>
              <span style={{
                fontSize: 10, fontFamily: 'IBM Plex Mono', padding: '1px 6px',
                borderRadius: 10, background: selCount ? `${catInfo.color}22` : '#0F1020',
                color: selCount ? catInfo.color : '#334155',
              }}>
                {selCount}/{items.length}
              </span>
              {!search && (
                <span style={{ fontSize: 10, color: '#334155' }}>{isOpen ? '▲' : '▼'}</span>
              )}
            </div>

            {isOpen && (
              <div style={{ paddingBottom: 4 }}>
                <div
                  onClick={() => onSelectAll(cat)}
                  style={{
                    fontSize: 10, fontFamily: 'IBM Plex Mono', color: catInfo.color,
                    padding: '3px 28px', cursor: 'pointer', opacity: .7,
                  }}
                >
                  {selCount === items.length ? '− deselect all' : '+ select all'}
                </div>
                {items.map(([id, info]) => {
                  const isSel = selected.has(id)
                  const lastFetched = syncStatus[id]?.last_fetched
                  return (
                    <div
                      key={id}
                      onClick={() => onToggle(id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 28px', cursor: 'pointer',
                        background: isSel ? `${info.color}0A` : 'transparent',
                      }}
                    >
                      <div style={{
                        width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                        border: `1.5px solid ${isSel ? info.color : '#1E293B'}`,
                        background: isSel ? info.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSel && <svg width={7} height={7} viewBox="0 0 7 7"><polyline points="1,3.5 2.8,5.5 6,1.5" stroke="#000" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: isSel ? '#E2E8F0' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {info.label}
                        </div>
                        <div style={{ fontSize: 9, fontFamily: 'IBM Plex Mono', color: '#1E293B' }}>
                          {id} · {info.freq}
                        </div>
                      </div>
                      {lastFetched && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} title="Has data" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
