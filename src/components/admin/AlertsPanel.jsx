import React, { useState } from 'react'
import Icon from '../shared/Icon'

const ALERTS = [
  {
    kind: 'red',
    icon: 'alert-circle',
    title: '4 prospectos estancados',
    sub: '>21 días en la misma etapa · 3 vendedores',
    action: 'Ver prospectos',
  },
  {
    kind: 'red',
    icon: 'history',
    title: '12 clientes a reactivar',
    sub: '>60 días sin contacto · $186k potencial',
    action: 'Reactivar',
  },
  {
    kind: 'amber',
    icon: 'file-text',
    title: '6 cotizaciones por vencer',
    sub: 'Vencen en los próximos 3 días',
    action: 'Ver cotizaciones',
  },
  {
    kind: 'amber',
    icon: 'eye-exclamation',
    title: '9 prospectos en riesgo',
    sub: 'Faltan visitas mínimas de etapa',
    action: 'Ver pipeline',
  },
  {
    kind: 'info',
    icon: 'calendar-event',
    title: '23 citas mañana',
    sub: 'Distribuidas entre 5 vendedores',
    action: 'Ver agenda',
  },
]

const TONE = {
  red:   { bg: 'var(--danger-bg)',       border: 'var(--danger-border)',  fg: 'var(--danger)',     pill: '#E24B4A18', pillFg: 'var(--danger)' },
  amber: { bg: 'var(--warning-bg)',      border: 'var(--warning-border)', fg: 'var(--warning-fg)', pill: '#EF9F2718', pillFg: 'var(--warning-fg)' },
  info:  { bg: 'var(--kiuvo-blue-soft)', border: 'var(--kiuvo-blue-mid)',fg: 'var(--kiuvo-blue)', pill: '#185FA518', pillFg: 'var(--kiuvo-blue)' },
}

const BADGE_LABEL = { red: 'Urgente', amber: 'Atención', info: 'Info' }

export default function AlertsPanel() {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      gridColumn: 'span 6', background: 'var(--surface)',
      border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 'var(--r-md)',
            background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bell" size={15} color="var(--danger)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Alertas operativas</div>
            <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Requieren atención esta semana</div>
          </div>
        </div>
        <span style={{
          padding: '3px 8px', borderRadius: 'var(--r-full)',
          background: 'var(--danger-bg)', color: 'var(--danger)',
          fontSize: 11, fontWeight: 600,
        }}>
          {ALERTS.filter(a => a.kind === 'red').length} urgentes
        </span>
      </div>

      {/* Alert rows */}
      <div style={{ flex: 1 }}>
        {ALERTS.map((a, i) => {
          const t = TONE[a.kind]
          const isHovered = hovered === i
          return (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '11px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < ALERTS.length - 1 ? '0.5px solid var(--border)' : 'none',
                cursor: 'pointer',
                background: isHovered ? 'var(--bg-secondary)' : 'transparent',
                transition: 'background 0.12s',
              }}
            >
              {/* Icon chip */}
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0,
                background: t.bg, color: t.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `0.5px solid ${t.border}`,
                boxShadow: isHovered ? `0 2px 8px ${t.fg}22` : 'none',
                transition: 'box-shadow 0.15s',
              }}>
                <Icon name={a.icon} size={16} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.title}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 'var(--r-full)',
                    background: t.pill, color: t.pillFg,
                  }}>
                    {BADGE_LABEL[a.kind]}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{a.sub}</div>
              </div>

              {/* CTA on hover */}
              <div style={{
                fontSize: 11, fontWeight: 500, color: t.fg,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.15s',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {a.action}
                <Icon name="arrow-right" size={12} color={t.fg} />
              </div>

              <Icon
                name="chevron-right"
                size={15}
                color={isHovered ? t.fg : 'var(--fg-tertiary)'}
                style={{ flexShrink: 0, transition: 'color 0.12s' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
