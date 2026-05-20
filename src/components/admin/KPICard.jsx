import Icon from '../shared/Icon'

function Sparkline({ data, color, width = 200, height = 36 }) {
  if (!data?.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const areaPath = path + ` L${width},${height} L0,${height} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={areaPath} fill={color} opacity="0.10" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function KPICard({ label, value, sub, delta, deltaKind, accent, sparkline }) {
  const deltaColor = deltaKind === 'good' ? 'var(--success)' : deltaKind === 'bad' ? 'var(--danger)' : 'var(--fg-secondary)'
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />}
      <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {delta && (
          <div style={{ fontSize: 12, fontWeight: 500, color: deltaColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <Icon name={deltaKind === 'bad' ? 'arrow-down-right' : 'arrow-up-right'} size={12} />
            {delta}
          </div>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{sub}</div>}
      {sparkline && <div style={{ marginTop: 4 }}><Sparkline data={sparkline} color={accent || 'var(--kiuvo-blue)'} /></div>}
    </div>
  )
}
