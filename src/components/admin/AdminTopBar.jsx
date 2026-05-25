import React, { useState } from 'react'
import Icon from '../shared/Icon'
import EnvBadge from '../shared/EnvBadge'

const PERIODS = ['Hoy', 'Semana', 'Mes', 'Trimestre']

export default function AdminTopBar({ title = 'Dashboard', subtitle = '', dark, onToggleDark }) {
  const [period, setPeriod] = useState('Semana')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 24px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0, gap: 16,
    }}>
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
          minWidth: 200, color: 'var(--fg-tertiary)', cursor: 'text',
        }}>
          <Icon name="search" size={14} />
          <span style={{ fontSize: 12 }}>Buscar…</span>
        </div>

        {/* Period selector */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2, gap: 1,
        }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '5px 11px', fontSize: 12,
              fontWeight: period === p ? 500 : 400,
              color: period === p ? 'var(--fg)' : 'var(--fg-secondary)',
              background: period === p ? 'var(--bg)' : 'transparent',
              borderRadius: 'var(--r-sm)',
              border: period === p ? '0.5px solid var(--border)' : 'none',
              transition: 'background 0.12s',
            }}>{p}</button>
          ))}
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

        {/* Export */}
        <button style={{
          padding: '7px 14px', background: 'var(--kiuvo-blue)', color: '#fff',
          borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px #185FA530',
        }}>
          <Icon name="download" size={13} color="#fff" />
          Exportar
        </button>
      </div>
    </div>
  )
}
