import Icon from '../shared/Icon'
import { Card, Pill } from '../ui'

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
      <path d={areaPath} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function KPICard({ label, value, sub, delta, deltaKind, accent, sparkline }) {
  const deltaTone = deltaKind === 'good' ? 'success' : deltaKind === 'bad' ? 'coral' : undefined
  return (
    <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {accent && <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
        <span className="k-muted" style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="k-num" style={{ fontSize: 32 }}>{value}</div>
        {delta && (
          <Pill tone={deltaTone}>
            <Icon name={deltaKind === 'bad' ? 'arrow-down-right' : 'arrow-up-right'} size={13} />
            {delta}
          </Pill>
        )}
      </div>
      {sub && <div className="k-dim" style={{ fontSize: 13 }}>{sub}</div>}
      {sparkline && <div style={{ marginTop: 2 }}><Sparkline data={sparkline} color={accent || 'var(--brand)'} /></div>}
    </Card>
  )
}
