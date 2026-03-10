import { useMemo } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const fmt = (n) => {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

const fmtDate = (d) => {
  if (!d) return ''
  return d.slice(0, 7)
}

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0D0D1A', border: `1px solid ${color}40`,
      borderRadius: 6, padding: '8px 12px', fontSize: 11, fontFamily: 'IBM Plex Mono',
    }}>
      <div style={{ color: '#64748B', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CotChart({ contractId, meta, observations, loading }) {
  const color = meta?.color || '#22D3EE'

  // Last 104 weeks (2 years) for display, full for stats
  const recent = useMemo(() => observations.slice(-104), [observations])
  const last = observations[observations.length - 1]
  const prev = observations[observations.length - 2]

  const netChange = last && prev ? last.net_spec - prev.net_spec : null
  const trend = netChange > 0 ? '↑' : netChange < 0 ? '↓' : '—'
  const trendColor = netChange > 0 ? '#34D399' : netChange < 0 ? '#F87171' : '#64748B'

  // 52-week percentile of net_spec
  const last52 = observations.slice(-52).map(o => o.net_spec)
  const min52 = Math.min(...last52)
  const max52 = Math.max(...last52)
  const pct = last && max52 !== min52
    ? Math.round(((last.net_spec - min52) / (max52 - min52)) * 100)
    : null

  if (loading) return (
    <div style={cardStyle(color)}>
      <div style={{ color: '#1E293B', fontFamily: 'IBM Plex Mono', fontSize: 11, padding: 20 }}>Loading…</div>
    </div>
  )

  if (!observations.length) return (
    <div style={cardStyle(color)}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', fontFamily: 'IBM Plex Mono' }}>{contractId}</div>
        <div style={{ fontSize: 10, color: '#1E293B', marginTop: 4 }}>No data</div>
      </div>
    </div>
  )

  return (
    <div style={cardStyle(color)}>
      {/* Header */}
      <div style={{ padding: '10px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#475569', letterSpacing: '.06em' }}>
            {contractId}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginTop: 1 }}>
            {meta?.label || contractId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'IBM Plex Mono', lineHeight: 1 }}>
            {fmt(last?.net_spec)}
          </div>
          <div style={{ fontSize: 10, color: trendColor, fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
            {trend} {netChange !== null ? fmt(Math.abs(netChange)) : ''}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 80, padding: '0 4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={`grad-${contractId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="#1E293B" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip color={color} />} />
            <Area
              type="monotone"
              dataKey="net_spec"
              name="Net Spec"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${contractId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer stats */}
      <div style={{
        padding: '6px 14px 10px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
      }}>
        <Stat label="Long" value={fmt(last?.spec_long)} color="#34D399" />
        <Stat label="Short" value={fmt(last?.spec_short)} color="#F87171" />
        <Stat label="52w %ile" value={pct !== null ? `${pct}%` : '—'} color={
          pct === null ? '#475569' : pct > 75 ? '#34D399' : pct < 25 ? '#F87171' : '#94A3B8'
        } />
        <Stat label="OI" value={fmt(last?.open_interest)} color="#94A3B8" />
        <Stat label="Date" value={last?.date?.slice(0, 10) || '—'} color="#475569" />
        <Stat label={meta?.cat || ''} value="" color="#475569" />
      </div>
    </div>
  )
}

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono', letterSpacing: '.04em' }}>{label}</div>
    <div style={{ fontSize: 11, color, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>{value}</div>
  </div>
)

const cardStyle = (color) => ({
  background: '#0A0A18',
  border: `1px solid ${color}20`,
  borderRadius: 10,
  overflow: 'hidden',
  transition: 'border-color .2s',
})
