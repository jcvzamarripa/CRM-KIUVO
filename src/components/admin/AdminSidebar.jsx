import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: 'layout-dashboard', active: true },
  { id: 'pipeline',   label: 'Embudo',        icon: 'layout-kanban' },
  { id: 'prospects',  label: 'Prospectos',    icon: 'users' },
  { id: 'map',        label: 'Mapa',          icon: 'map-2' },
  { id: 'quotes',     label: 'Cotizaciones',  icon: 'file-text' },
  { id: 'agenda',     label: 'Agenda',        icon: 'calendar' },
  { id: 'products',   label: 'Productos',     icon: 'package' },
  { id: 'team',       label: 'Equipo',        icon: 'user-square' },
  { id: 'reports',    label: 'Reportes',      icon: 'chart-bar' },
]

export default function AdminSidebar({ active = 'dashboard', onChange }) {
  const { profile, signOut } = useAuth()
  const initials = profile?.initials || 'SC'
  const name = profile?.full_name || 'Administrador'

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '20px 0',
    }}>
      {/* Brand */}
      <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: 'var(--kiuvo-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
        }}>K</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0.3, color: 'var(--fg)' }}>KIUVO</div>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>CRM · Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
        {NAV_ITEMS.map(it => {
          const on = active === it.id
          return (
            <button key={it.id} onClick={() => onChange?.(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 'var(--r-md)',
              background: on ? 'var(--kiuvo-blue-soft)' : 'transparent',
              color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg-secondary)',
              fontSize: 13, fontWeight: on ? 500 : 400, textAlign: 'left',
            }}>
              <Icon name={it.icon} size={16} />
              <span>{it.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Settings */}
      <div style={{ padding: '12px 8px', borderTop: '0.5px solid var(--border)' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 'var(--r-md)',
          color: 'var(--fg-secondary)', fontSize: 13, width: '100%', textAlign: 'left',
        }}>
          <Icon name="settings" size={16} />
          <span>Configuración</span>
        </button>
      </div>

      {/* User */}
      <div style={{ padding: '10px 16px 0', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--fg)' }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--fg)' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>Administrador</div>
          </div>
          <button onClick={signOut} title="Cerrar sesión" style={{ color: 'var(--fg-tertiary)' }}>
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
