import React, { useState } from 'react'
import Icon from '../shared/Icon'

const INITIAL = [
  {
    id: 1, read: false, type: 'warning',
    title: 'Seguimiento urgente',
    body: 'Refaccionaria El Bajío lleva 24 días en Presentación sin avance.',
    time: 'hace 5 min',
    action: { screen: 'embudo', stage: 'presentacion', label: 'Ver en embudo' },
  },
  {
    id: 2, read: false, type: 'warning',
    title: 'Sin contacto reciente',
    body: 'Materiales Pacífico lleva 11 días sin visita ni llamada.',
    time: 'hace 1 h',
    action: { screen: 'embudo', stage: 'cotizacion', label: 'Ver prospecto' },
  },
  {
    id: 3, read: false, type: 'info',
    title: 'Meta al 68%',
    body: 'Quedan 3 días para cerrar la semana. ¡Buen ritmo, sigue así!',
    time: 'hace 2 h',
    action: { screen: 'inicio', label: 'Ver dashboard' },
  },
  {
    id: 4, read: true, type: 'danger',
    title: 'Prospecto estancado',
    body: 'Plomería Industrial Vega no tiene visitas registradas desde que ingresó.',
    time: 'ayer',
    action: { screen: 'embudo', stage: 'prospeccion', label: 'Ver en embudo' },
  },
  {
    id: 5, read: true, type: 'success',
    title: '¡Cierre registrado!',
    body: 'Constructora ABC — $24,500 marcado como ganado.',
    time: 'ayer',
    action: { screen: 'embudo', stage: 'cierre', label: 'Ver cierre' },
  },
  {
    id: 6, read: true, type: 'info',
    title: 'Nueva cotización',
    body: 'Distribuidora Norte solicitó cotización por $42,800.',
    time: 'hace 2 días',
    action: { screen: 'embudo', stage: 'cotizacion', label: 'Ver cotización' },
  },
]

const TYPE = {
  warning: { bg: 'var(--warning-bg)',  border: 'var(--warning-border)', dot: 'var(--warning)',  iconBg: '#FAC775', iconColor: 'var(--warning-fg)', icon: 'alert-triangle' },
  danger:  { bg: 'var(--danger-bg)',   border: 'var(--danger-border)',  dot: 'var(--danger)',   iconBg: '#FACACA', iconColor: 'var(--danger)',    icon: 'alert-circle'   },
  success: { bg: 'var(--success-bg)',  border: 'var(--success)',        dot: 'var(--success)',  iconBg: '#B8E3D2', iconColor: 'var(--success)',   icon: 'circle-check'   },
  info:    { bg: 'var(--kiuvo-blue-soft)', border: 'var(--kiuvo-blue-mid)', dot: 'var(--kiuvo-blue)', iconBg: 'var(--kiuvo-blue-mid)', iconColor: 'var(--kiuvo-blue-deep)', icon: 'info-circle' },
}

// ── Inline SVG icons (CDN-independent) ───────────────────────────
function BellSvg({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function TypeIcon({ type, size = 16 }) {
  const t = TYPE[type]
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

export default function NotificationsPanel({ onClose, onNavigate }) {
  const [items, setItems] = useState(INITIAL)

  const unread = items.filter(n => !n.read).length

  const markRead = id => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAll  = () => setItems(prev => prev.map(n => ({ ...n, read: true })))

  function handleTap(n) {
    markRead(n.id)
    if (n.action) {
      onNavigate?.(n.action)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      {/* Panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '88%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Notificaciones</div>
            {unread > 0 && (
              <span style={{
                minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
                background: '#E24B4A', color: '#fff',
                fontSize: 11, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{unread}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unread > 0 && (
              <button onClick={markAll} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>
                Marcar todo leído
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
          {items.map(n => {
            const t = TYPE[n.type]
            return (
              <button
                key={n.id}
                onClick={() => handleTap(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 12px',
                  background: n.read ? 'var(--surface)' : t.bg,
                  border: `0.5px solid ${n.read ? 'var(--border)' : t.border}`,
                  borderRadius: 'var(--r-md)', textAlign: 'left',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Unread stripe */}
                {!n.read && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.dot }} />
                )}

                <TypeIcon type={n.type} size={16} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', flexShrink: 0 }}>{n.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                  {n.action && (
                    <div style={{
                      marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, color: t.iconColor,
                    }}>
                      {n.action.label}
                      <Icon name="chevron-right" size={12} color={t.iconColor} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
