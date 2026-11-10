import Icon from '../shared/Icon'
import { useActivities } from '../../hooks/useActivities'
import { Card, Pill, Empty, Bone } from '../ui'

const KIND_ICON = {
  win:      { icon: 'trophy',         bg: 'var(--accent)',        fg: 'var(--accent-fg)' },
  visit:    { icon: 'map-pin',        bg: 'var(--info-bg)',       fg: 'var(--kiuvo-blue-deep)' },
  call:     { icon: 'phone',          bg: 'var(--bg-secondary)',  fg: 'var(--fg)' },
  whatsapp: { icon: 'brand-whatsapp', bg: 'var(--success-bg)',    fg: 'var(--success-fg)' },
  email:    { icon: 'mail',           bg: 'var(--bg-secondary)',  fg: 'var(--fg)' },
  quote:    { icon: 'file-text',      bg: 'var(--warning-bg)',    fg: 'var(--warning-fg)' },
  add:      { icon: 'user-plus',      bg: 'var(--accent-2-soft)', fg: 'var(--accent-2-fg)' },
  new:      { icon: 'user-plus',      bg: 'var(--accent-2-soft)', fg: 'var(--accent-2-fg)' },
  stage:    { icon: 'arrow-right',    bg: 'var(--coral-soft)',    fg: 'var(--coral-fg)' },
  msg:      { icon: 'brand-whatsapp', bg: 'var(--success-bg)',    fg: 'var(--success-fg)' },
}

export default function ActivityFeed() {
  const { activities, loading } = useActivities({ limit: 10 })

  return (
    <Card flush style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="k-h2">Actividad reciente</div>
        <Pill tone="success">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
          En vivo
        </Pill>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <Bone key={i} h={40} r="var(--r-md)" />)}
          </div>
        ) : activities.length === 0 ? (
          <Empty icon="history">Sin actividad reciente</Empty>
        ) : (
          activities.map((a, i) => {
            const k = KIND_ICON[a.kind] || KIND_ICON.visit
            return (
              <div key={a.id || i} style={{
                padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
                borderTop: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: k.bg, color: k.fg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={k.icon} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    <b style={{ fontWeight: 600 }}>{a.who}</b>{' '}
                    <span className="k-muted">{a.what}</span>{' '}
                    {a.target && <b style={{ fontWeight: 600 }}>{a.target}</b>}
                    {a.amount && <span className="k-muted"> · {a.amount}</span>}
                  </div>
                  <div className="k-dim" style={{ fontSize: 12, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
