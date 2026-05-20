import React, { useState } from 'react'
import Icon from '../shared/Icon'

const PERIODS = ['Hoy', 'Semana', 'Mes', 'Trimestre', 'Personalizado']

export default function AdminTopBar({ title = 'Dashboard', subtitle = 'Semana del 12 al 18 de mayo' }) {
  const [period, setPeriod] = useState('Semana')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 28px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-md)', minWidth: 220, color: 'var(--fg-tertiary)',
          cursor: 'text',
        }}>
          <Icon name="search" size={14} />
          <span style={{ fontSize: 12 }}>Buscar prospecto, empresa…</span>
        </div>
        {/* Period selector */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2,
        }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 12px', fontSize: 12,
              fontWeight: period === p ? 500 : 400,
              color: period === p ? 'var(--fg)' : 'var(--fg-secondary)',
              background: period === p ? 'var(--bg-secondary)' : 'transparent',
              borderRadius: 'var(--r-sm)',
            }}>{p}</button>
          ))}
        </div>
        <button style={{
          padding: '7px 12px', background: 'var(--kiuvo-blue)', color: '#fff',
          borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="download" size={13} />
          Exportar
        </button>
      </div>
    </div>
  )
}
