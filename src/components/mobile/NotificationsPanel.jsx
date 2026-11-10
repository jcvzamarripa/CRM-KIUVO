import React from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Card, Empty, Bone } from '../ui'

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
  warning: { bg: 'var(--warning-bg)',    fg: 'var(--warning-fg)',      icon: 'alert-triangle' },
  danger:  { bg: 'var(--coral-soft)',    fg: 'var(--coral-fg)',        icon: 'alert-circle'   },
  success: { bg: 'var(--success-bg)',    fg: 'var(--success-fg)',      icon: 'circle-check'   },
  info:    { bg: 'var(--info-bg)',       fg: 'var(--kiuvo-blue-deep)', icon: 'info-circle'    },
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

function TypeIcon({ type }) {
  const t = TYPE[type] ?? TYPE.info
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={t.icon} size={20} />
    </div>
  )
}

function SkeletonItem() {
  return (
    <Card style={{ display: 'flex', gap: 12 }}>
      <Bone w={40} h={40} r="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bone w="60%" h={15} />
        <Bone w="90%" h={13} />
      </div>
    </Card>
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

  const hasRead = items.some(n => n.read)

  return (
    <Sheet full title={unreadCount > 0 ? `Notificaciones · ${unreadCount}` : 'Notificaciones'} onClose={onClose}>
      {(unreadCount > 0 || hasRead) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {unreadCount > 0 && <Button variant="soft" size="sm" icon="check" onClick={markAll}>Marcar todo leído</Button>}
          {hasRead && <Button variant="soft" size="sm" icon="trash" onClick={dismissRead}>Limpiar leídas</Button>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonItem key={i} />)
        ) : items.length === 0 ? (
          <Empty icon="bell">Sin notificaciones por ahora</Empty>
        ) : (
          items.map(n => {
            const type = KIND_TYPE[n.kind] ?? 'info'
            const t    = TYPE[type]
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleTap(n)}
                onKeyDown={e => { if (e.key === 'Enter') handleTap(n) }}
                className="k-card"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, cursor: 'pointer', opacity: n.read ? 0.72 : 1 }}
              >
                <TypeIcon type={type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!n.read && <span aria-label="Sin leer" style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--coral)', flexShrink: 0 }} />}
                    <div style={{ fontSize: 15, fontWeight: n.read ? 500 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.4, marginTop: 3 }}>{n.body}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--fg-tertiary)' }}>{fmtTime(n.created_at)}</span>
                    {KIND_ACTION[n.kind] && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 600, color: 'var(--fg)' }}>
                        {KIND_ACTION[n.kind].label}
                        <Icon name="chevron-right" size={15} />
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Descartar notificación"
                  onClick={e => handleDismiss(e, n.id)}
                  style={{ width: 44, height: 44, margin: '-6px -8px 0 0', flexShrink: 0, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </Sheet>
  )
}
