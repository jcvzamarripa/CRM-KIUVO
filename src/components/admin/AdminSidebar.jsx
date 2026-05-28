import React from 'react'
import Icon from '../shared/Icon'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: 'layout-dashboard' },
  { id: 'pipeline',   label: 'Embudo',        icon: 'layout-kanban' },
  { id: 'prospects',  label: 'Prospectos',    icon: 'users' },
  { id: 'map',        label: 'Mapa',          icon: 'map-2' },
  { id: 'quotes',     label: 'Cotizaciones',  icon: 'file-text' },
  { id: 'agenda',     label: 'Agenda',        icon: 'calendar' },
  { id: 'products',   label: 'Productos',     icon: 'package' },
  { id: 'team',       label: 'Equipo',        icon: 'users-group' },
  { id: 'reports',      label: 'Reportes',    icon: 'chart-bar' },
  { id: 'activities',   label: 'Actividades', icon: 'history' },
  { id: 'goals',        label: 'Metas',       icon: 'target'          },
  { id: 'production',   label: 'Producción',  icon: 'clipboard-list'  },
]

export default function AdminSidebar({ active = 'dashboard', onChange }) {
  const { profile, signOut } = useAuth()
  const initials   = profile?.initials  || 'AD'
  const name       = profile?.full_name || 'Administrador'
  const avatarColor = profile?.avatar_color || '#185FA5'

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Brand ── */}
      <div style={{ padding: '20px 20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--kiuvo-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          boxShadow: '0 2px 8px #185FA540',
        }}>K</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.2, color: 'var(--fg)' }}>KIUVO</div>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1 }}>CRM · Panel Admin</div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'var(--border)', margin: '0 16px 10px' }} />

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
        {NAV_ITEMS.map(it => {
          const on = active === it.id
          return (
            <button
              key={it.id}
              onClick={() => onChange?.(it.id)}
              title={it.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 'var(--r-md)',
                background: on ? 'var(--kiuvo-blue)' : 'transparent',
                color: on ? '#fff' : 'var(--fg-secondary)',
                fontSize: 13, fontWeight: on ? 500 : 400,
                textAlign: 'left', transition: 'background 0.12s, color 0.12s',
                position: 'relative',
              }}
            >
              {/* Icono con fondo suave cuando está inactivo */}
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: on ? 'rgba(255,255,255,0.18)' : 'var(--bg-secondary)',
                transition: 'background 0.12s',
              }}>
                <Icon name={it.icon} size={15} color={on ? '#fff' : 'var(--fg-secondary)'} />
              </span>
              <span>{it.label}</span>

              {/* Indicador activo */}
              {on && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Settings ── */}
      <div style={{ padding: '10px 10px 0', borderTop: '0.5px solid var(--border)' }}>
        {(() => {
          const on = active === 'settings'
          return (
            <button
              onClick={() => onChange?.('settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 'var(--r-md)', width: '100%', textAlign: 'left',
                background: on ? 'var(--kiuvo-blue)' : 'transparent',
                color: on ? '#fff' : 'var(--fg-secondary)', fontSize: 13,
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                background: on ? 'rgba(255,255,255,0.18)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name="settings" size={15} color={on ? '#fff' : 'var(--fg-secondary)'} />
              </span>
              Configuración
            </button>
          )
        })()}
      </div>

      {/* ── User ── */}
      <div style={{ padding: '12px 14px 16px', borderTop: '0.5px solid var(--border)', marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: avatarColor + '22', color: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, border: `1.5px solid ${avatarColor}44`,
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials
            }
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--fg)' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1 }}>Administrador</div>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-md)',
              background: 'var(--danger-bg)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.12s',
            }}
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
