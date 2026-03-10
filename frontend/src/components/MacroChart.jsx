import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const fmt = (v) => {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return Number(v).toFixed(2)
}

export default function MacroChart({ seriesId, meta, observations = [], loading }) {
  const latest = observations.at(-1)
  const prev   = observations.at(-2)
  const delta  = latest && prev && prev.value !== 0
    ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
    : null
  const isUp   = delta !== null && delta >= 0
  const color  = meta?.color || '#60A5FA'

  return (
    <div style={{
      background: '#0A0A12',
      border: `1px solid ${color}28`,
      borderTop: `2px solid ${color}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative', overflow: 'hidden',
      minHeight: 190,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${color}07, transparent 60%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'IBM Plex Mono', color: color, letterSpacing: '.1em', opacity: .75 }}>
            {meta?.cat?.toUpperCase()} · {seriesId}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginTop: 2, fontFamily: 'IBM Plex Sans' }}>
            {meta?.label || seriesId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {loading && <div style={{ fontSize: 11, color: '#475569', fontFamily: 'IBM Plex Mono' }}>loading…</div>}
          {!loading && latest && (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>
                {fmt(latest.value)}
              </div>
              {delta !== null && (
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: isUp ? '#34D399' : '#F87171' }}>
                  {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}%
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      {observations.length > 0 && (
        <ResponsiveContainer width="100%" height={88}>
          <LineChart data={observations} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: '#0D0D1A', border: `1px solid ${color}40`,
                borderRadius: 6, fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#E2E8F0'
              }}
              labelStyle={{ color: '#64748B' }}
              formatter={(v) => [fmt(v), meta?.unit || '']}
            />
            <ReferenceLine y={0} stroke="#2D2D4A" strokeWidth={1} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!loading && observations.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 12, fontFamily: 'IBM Plex Mono' }}>
          No data — click Sync ↑
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'IBM Plex Mono', color: '#1E293B' }}>
        <span>{meta?.unit} · {meta?.freq}</span>
        <span>{latest?.date}</span>
      </div>
    </div>
  )
}
