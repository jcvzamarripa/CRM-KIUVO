import React, { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// ── hook ─────────────────────────────────────────────────────────────────────
function useAlerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setAlerts([]); setLoading(false); return }

    async function load() {
      const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString()
      const cutoff21 = new Date(Date.now() - 21 * 86400000).toISOString()

      // Single query: get all prospect counts we need
      const { data: prox } = await supabase
        .from('prospects')
        .select('id, stage_id, health, last_contact_at, value, days_in_stage')

      if (!prox) { setLoading(false); return }

      const stuck      = prox.filter(p => p.health === 'red').length
      const atRisk     = prox.filter(p => p.health === 'amber').length
      const reactivate = prox.filter(p => p.last_contact_at && p.last_contact_at < cutoff60).length
      const stalePot   = prox.filter(p => p.last_contact_at && p.last_contact_at < cutoff60)
                             .reduce((s, p) => s + (Number(p.value) || 0), 0)

      // Count tomorrow's agenda events
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowISO = tomorrow.toISOString().slice(0, 10)
      const { count: tomorrowCitas } = await supabase
        .from('agenda_events')
        .select('id', { count: 'exact', head: true })
        .eq('date', tomorrowISO)

      const list = []

      if (stuck > 0) {
        list.push({
          kind: 'red',
          icon: 'alert-circle',
          title: `${stuck} prospecto${stuck !== 1 ? 's' : ''} estancado${stuck !== 1 ? 's' : ''}`,
          sub: '>21 días en la misma etapa · requieren acción',
          action: 'Ver pipeline',
        })
      }

      if (reactivate > 0) {
        const kLabel = stalePot >= 1000 ? `$${(stalePot / 1000).toFixed(0)}k` : stalePot > 0 ? `$${stalePot}` : ''
        list.push({
          kind: 'red',
          icon: 'history',
          title: `${reactivate} cliente${reactivate !== 1 ? 's' : ''} a reactivar`,
          sub: `>60 días sin contacto${kLabel ? ` · ${kLabel} potencial` : ''}`,
          action: 'Reactivar',
        })
      }

      if (atRisk > 0) {
        list.push({
          kind: 'amber',
          icon: 'eye-exclamation',
          title: `${atRisk} prospecto${atRisk !== 1 ? 's' : ''} en riesgo`,
          sub: 'Salud ámbar · requieren seguimiento',
          action: 'Ver pipeline',
        })
      }

      if (tomorrowCitas > 0) {
        list.push({
          kind: 'info',
          icon: 'calendar-event',
          title: `${tomorrowCitas} cita${tomorrowCitas !== 1 ? 's' : ''} mañana`,
          sub: `Programada${tomorrowCitas !== 1 ? 's' : ''} en la agenda`,
          action: 'Ver agenda',
        })
      }

      setAlerts(list)
      setLoading(false)
    }

    load()
  }, [])

  return { alerts, loading }
}

// ── styles ────────────────────────────────────────────────────────────────────
const TONE = {
  red:   { bg: 'var(--danger-bg)',       border: 'var(--danger-border)',  fg: 'var(--danger)',     pill: '#E24B4A18', pillFg: 'var(--danger)' },
  amber: { bg: 'var(--warning-bg)',      border: 'var(--warning-border)', fg: 'var(--warning-fg)', pill: '#EF9F2718', pillFg: 'var(--warning-fg)' },
  info:  { bg: 'var(--kiuvo-blue-soft)', border: 'var(--kiuvo-blue-mid)', fg: 'var(--kiuvo-blue)', pill: '#185FA518', pillFg: 'var(--kiuvo-blue)' },
}
const BADGE_LABEL = { red: 'Urgente', amber: 'Atención', info: 'Info' }

// ── component ─────────────────────────────────────────────────────────────────
export default function AlertsPanel() {
  const [hovered, setHovered]  = useState(null)
  const { alerts, loading }    = useAlerts()
  const urgentes = alerts.filter(a => a.kind === 'red').length

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
        {urgentes > 0 && (
          <span style={{
            padding: '3px 8px', borderRadius: 'var(--r-full)',
            background: 'var(--danger-bg)', color: 'var(--danger)',
            fontSize: 11, fontWeight: 600,
          }}>
            {urgentes} urgente{urgentes !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
            Verificando alertas…
          </div>
        ) : alerts.length === 0 ? (
          <div style={{
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8, color: 'var(--fg-tertiary)',
          }}>
            <div style={{ fontSize: 28, opacity: 0.5 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Todo en orden</div>
            <div style={{ fontSize: 11 }}>No hay alertas operativas en este momento.</div>
          </div>
        ) : (
          alerts.map((a, i) => {
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
                  borderBottom: i < alerts.length - 1 ? '0.5px solid var(--border)' : 'none',
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
          })
        )}
      </div>
    </div>
  )
}
