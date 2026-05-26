import React from 'react'
import Icon from '../shared/Icon'

const KIND_TYPE = {
  inactivity:      'warning',
  pending_visit:   'danger',
  agenda_reminder: 'info',
  quote_status:    'success',
}

const KIND_ACTION = {
  inactivity:      { screen: 'embudo',  label: 'Ver en embudo' },
  pending_visit:   { screen: 'agenda',  label: 'Ver agenda' },
  agenda_reminder: { screen: 'agenda',  label: 'Ver agenda' },
  quote_status:    { screen: 'embudo',  stage: 'cotizacion', label: 'Ver cotización' },
}

const TYPE = {
  warning: { bg: 'var(--warning-bg)',       border: 'var(--warning-border)',    dot: 'var(--warning)',      iconBg: '#FAC775',               iconColor: 'var(--warning-fg)',      icon: 'alert-triangle' },
  danger:  { bg: 'var(--danger-bg)',        border: 'var(--danger-border)',     dot: 'var(--danger)',       iconBg: '#FACACA',               iconColor: 'var(--danger)',          icon: 'alert-circle'   },
  success: { bg: 'var(--success-bg)',       border: 'var(--success)',           dot: 'var(--success)',      iconBg: '#B8E3D2',               iconColor: 'var(--success)',         icon: 'circle-check'   },
  info:    { bg: 'var(--kiuvo-blue-soft)',  border: 'var(--kiuvo-blue-mid)',    dot: 'var(--kiuvo-blue)',   iconBg: 'var(--kiuvo-blue-mid)', iconColor: 'var(--kiuvo-blue-deep)', icon: 'info-circle'    },
}

function fmtTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)     return 'ahora'
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'ayer'
  return `hace ${Math.floor(diff / 86400)} días`
}

function TypeIcon({ type, size = 16 }) {
  const t = TYPE[type] ?? TYPE.info
  const icons = {
    'alert-triangle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    'alert-circle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    'circle-check': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
      </svg>
    ),
    'info-circle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icons[t.icon]}
    </div>
  )
}

function SkeletonItem() {
  return (
    <div style={{ padding: '12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: '60%', height: 12, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        <div style={{ width: '90%', height: 11, borderRadius: 4, background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  )
}

export default function NotificationsPanel({ onClose, onNavigate, items, loading, unreadCount, markRead, markAll, dismiss, dismissRead }) {
  function handleTap(n) {
    const action = KIND_ACTION[n.kind]
    if (action) {
      // Dismiss on tap when there's a navigation action (it's been "attended")
      dismiss?.(n.id)
      onNavigate?.(action)
      onClose()
    } else {
      markRead(n.id)
    }
  }

  function handleDismiss(e, id) {
    e.stopPropagation()
    dismiss?.(id)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '88%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Notificaciones</div>
            {unreadCount > 0 && (
              <span style={{
                minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
                background: '#E24B4A', color: '#fff', fontSize: 11, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAll} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>
                Marcar todo leído
              </button>
            )}
            {items.some(n => n.read) && (
              <button onClick={dismissRead} style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontWeight: 500 }}>
                Limpiar leídas
              </button>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-secondary)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--fg-secondary)',
            }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            [1, 2, 3].map(i => <SkeletonItem key={i} />)
          ) : items.length === 0 ? (
            <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--fg-tertiary)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div style={{ fontSize: 13 }}>Sin notificaciones por ahora</div>
            </div>
          ) : (
            items.map(n => {
              const type = KIND_TYPE[n.kind] ?? 'info'
              const t    = TYPE[type]
              return (
                <button
                  key={n.id}
                  onClick={() => handleTap(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px',
                    background: n.read ? 'var(--surface)' : t.bg,
                    border: `0.5px solid ${n.read ? 'var(--border)' : t.border}`,
                    borderRadius: 'var(--r-md)', textAlign: 'left',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {!n.read && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.dot }} />
                  )}
                  <TypeIcon type={type} size={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{fmtTime(n.created_at)}</div>
                        <button
                          onClick={e => handleDismiss(e, n.id)}
                          style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: 'var(--bg-secondary)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--fg-tertiary)', padding: 0, cursor: 'pointer',
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                    {KIND_ACTION[n.kind] && (
                      <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: t.iconColor }}>
                        {KIND_ACTION[n.kind].label}
                        <Icon name="chevron-right" size={12} color={t.iconColor} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
