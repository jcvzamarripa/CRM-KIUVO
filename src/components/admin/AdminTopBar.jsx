import React from 'react'
import Icon from '../shared/Icon'
import EnvBadge from '../shared/EnvBadge'

export default function AdminTopBar({ title = 'Dashboard', subtitle = '', dark, onToggleDark, onMenuClick }) {

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 24px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0, gap: 16,
    }}>
      {/* Hamburger — visible only on small screens via CSS */}
      <button
        className="admin-hamburger"
        onClick={onMenuClick}
        style={{
          width: 34, height: 34, borderRadius: 'var(--r-md)',
          border: '0.5px solid var(--border)', background: 'var(--surface)',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-secondary)', flexShrink: 0,
        }}
      >
        <Icon name="menu-2" size={18} />
      </button>

      {/* Title */}
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.3, lineHeight: 1.2 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <EnvBadge />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Search */}
        <div className="admin-topbar-search" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
          minWidth: 200, color: 'var(--fg-tertiary)', cursor: 'text',
        }}>
          <Icon name="search" size={14} />
          <span style={{ fontSize: 12 }}>Buscar…</span>
        </div>

        {/* Dark mode toggle */}
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              width: 34, height: 34, borderRadius: 'var(--r-md)',
              border: '0.5px solid var(--border)',
              background: dark ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: dark ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)',
              transition: 'background 0.15s, color 0.15s',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Doble icono con transición */}
            <span style={{
              position: 'absolute', transition: 'opacity 0.2s, transform 0.2s',
              opacity: dark ? 0 : 1, transform: dark ? 'rotate(20deg) scale(0.7)' : 'rotate(0) scale(1)',
            }}>
              <Icon name="moon" size={15} color="var(--fg-secondary)" />
            </span>
            <span style={{
              position: 'absolute', transition: 'opacity 0.2s, transform 0.2s',
              opacity: dark ? 1 : 0, transform: dark ? 'rotate(0) scale(1)' : 'rotate(-20deg) scale(0.7)',
            }}>
              <Icon name="sun" size={15} color="var(--kiuvo-blue)" />
            </span>
          </button>
        )}

      </div>
    </div>
  )
}
