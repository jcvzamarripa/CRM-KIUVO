import Icon from '../shared/Icon'
import { useActivities } from '../../hooks/useActivities'

const KIND_ICON = {
  win:   { icon: 'trophy',         color: 'var(--success)'     },
  visit: { icon: 'map-pin',        color: 'var(--kiuvo-blue)'  },
  quote: { icon: 'file-text',      color: 'var(--warning)'     },
  add:   { icon: 'user-plus',      color: 'var(--info)'        },
  stage: { icon: 'arrow-right',    color: '#D85A30'            },
  msg:   { icon: 'brand-whatsapp', color: 'var(--success)'     },
}

export default function ActivityFeed() {
  const { activities, loading } = useActivities({ limit: 10 })

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
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12 }}>Cargando…</div>
        ) : activities.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12 }}>Sin actividad reciente</div>
        ) : (
          activities.map((a, i) => {
            const k = KIND_ICON[a.kind] || KIND_ICON.visit
            return (
              <div key={a.id || i} style={{
                padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'flex-start',
                borderBottom: i < activities.length - 1 ? '0.5px solid var(--border)' : 'none',
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
                    {a.target && <b style={{ fontWeight: 500 }}>{a.target}</b>}
                    {a.amount && <span style={{ color: 'var(--fg-secondary)' }}> · {a.amount}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
