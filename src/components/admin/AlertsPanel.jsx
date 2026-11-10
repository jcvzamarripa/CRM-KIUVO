import React, { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { Card, Pill, Empty, Bone } from '../ui'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// ── hook ─────────────────────────────────────────────────────────────────────
function useAlerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setAlerts([]); setLoading(false); return }

    async function load() {
      const cutoff60 = new Date(Date.now() - 30 * 86400000).toISOString()
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
          sub: `>30 días sin contacto${kLabel ? ` · ${kLabel} potencial` : ''}`,
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
  red:   { bg: 'var(--coral-soft)',  fg: 'var(--coral-fg)',        pill: 'coral' },
  amber: { bg: 'var(--warning-bg)',  fg: 'var(--warning-fg)',      pill: 'warning' },
  info:  { bg: 'var(--info-bg)',     fg: 'var(--kiuvo-blue-deep)', pill: 'sky' },
}
const BADGE_LABEL = { red: 'Urgente', amber: 'Atención', info: 'Info' }

// ── component ─────────────────────────────────────────────────────────────────
export default function AlertsPanel() {
  const { alerts, loading } = useAlerts()
  const urgentes = alerts.filter(a => a.kind === 'red').length

  return (
    <Card flush style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="k-h2">Alertas</div>
          <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>Requieren atención esta semana</div>
        </div>
        {urgentes > 0 && <Pill tone="coral">{urgentes} urgente{urgentes !== 1 ? 's' : ''}</Pill>}
      </div>

      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map(i => <Bone key={i} h={44} r="var(--r-md)" />)}
          </div>
        ) : alerts.length === 0 ? (
          <Empty icon="circle-check">Todo en orden.<br />No hay alertas en este momento.</Empty>
        ) : (
          alerts.map((a, i) => {
            const t = TONE[a.kind]
            return (
              <div key={i} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                borderTop: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: t.bg, color: t.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={a.icon} size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</span>
                    <Pill tone={t.pill}>{BADGE_LABEL[a.kind]}</Pill>
                  </div>
                  <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
