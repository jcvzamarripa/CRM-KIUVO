import React from 'react'
import { IconButton } from '../ui'
import EnvBadge from '../shared/EnvBadge'

export default function AdminTopBar({ title = 'Dashboard', subtitle = '', dark, onToggleDark, onMenuClick }) {
  return (
    <div className="admin-topbar">
      {/* Menú — solo visible en pantallas chicas (CSS) */}
      <IconButton icon="menu-2" label="Abrir menú" className="admin-hamburger" onClick={onMenuClick} />

      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="k-h1">{title}</div>
          {subtitle && <div className="k-muted" style={{ fontSize: 14, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <EnvBadge />
      </div>

      {onToggleDark && (
        <IconButton
          icon={dark ? 'sun' : 'moon'}
          label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={onToggleDark}
        />
      )}
    </div>
  )
}
