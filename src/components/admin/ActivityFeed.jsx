import Icon from '../shared/Icon'
import { MOCK_ACTIVITY } from '../../constants/mockData'

const KIND_ICON = {
  win:   { icon: 'trophy',        color: 'var(--success)' },
  visit: { icon: 'map-pin',       color: 'var(--kiuvo-blue)' },
  quote: { icon: 'file-text',     color: 'var(--warning)' },
  add:   { icon: 'user-plus',     color: 'var(--info)' },
  stage: { icon: 'arrow-right',   color: '#D85A30' },
  msg:   { icon: 'brand-whatsapp',color: 'var(--success)' },
}

export default function ActivityFeed() {
  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 4', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad reciente</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>En vivo</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--success)', fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
          activo
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {MOCK_ACTIVITY.map((a, i) => {
          const k = KIND_ICON[a.kind] || KIND_ICON.visit
          return (
            <div key={i} style={{
              padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'flex-start',
              borderBottom: i < MOCK_ACTIVITY.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: k.color + '18', color: k.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={k.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.45 }}>
                  <b style={{ fontWeight: 500 }}>{a.who}</b>{' '}
                  <span style={{ color: 'var(--fg-secondary)' }}>{a.what}</span>{' '}
                  <b style={{ fontWeight: 500 }}>{a.target}</b>
                  {a.amount && <span style={{ color: 'var(--fg-secondary)' }}> · {a.amount}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
