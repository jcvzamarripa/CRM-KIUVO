import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import StageDot from '../shared/StageDot'
import { Card, Pill, IconButton, ProgressRing, ProgressBar } from '../ui'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { useTodayAgenda } from '../../hooks/useAgendaEvents'
import { useFunnelCounts } from '../../hooks/useFunnelCounts'
import { useTasks } from '../../hooks/useTasks'
import { supabase } from '../../lib/supabase'
import { localDateStr, dayStartISO, monthStartISO, relativeDay } from '../../lib/dates'

const DEFAULT_DAILY = { visitas: 15, prospectos: 5 }

// ── Datos del día del vendedor ────────────────────────────────────
function useSellerDashboard(sellerId, refreshKey) {
  const [data, setData] = useState({
    monthlySales: 0, goal: 100000,
    dailyGoals: DEFAULT_DAILY,
    todayVisits: 0, todayVerified: 0, todayNew: 0, todayQuotes: 0, todayWins: 0,
    atRiskCount: 0, atRiskProspects: [], inactiveCount: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sellerId || !supabase) { setLoading(false); return }

    const dayStart   = dayStartISO()
    const monthStart = monthStartISO()
    const days30ago  = new Date(Date.now() - 30 * 86400000).toISOString()
    const count      = { count: 'exact', head: true }

    const [profileRes, goalsRes, salesRes, visitsRes, newRes, quotesRes, winsRes, atRiskRes, inactiveRes] = await Promise.all([
      supabase.from('profiles').select('goal_amount').eq('id', sellerId).single(),
      supabase.from('seller_goals').select('goal_visitas, goal_prospectos')
        .eq('seller_id', sellerId).eq('period', 'Día').maybeSingle(),
      supabase.from('quotes').select('total')
        .eq('seller_id', sellerId).eq('status', 'approved').gte('approved_at', monthStart),
      supabase.from('visits').select('verification')
        .eq('seller_id', sellerId).eq('kind', 'visit').gte('created_at', dayStart),
      supabase.from('prospects').select('id', count)
        .eq('owner_id', sellerId).gte('created_at', dayStart),
      supabase.from('quotes').select('id', count)
        .eq('seller_id', sellerId).gte('created_at', dayStart),
      supabase.from('quotes').select('id', count)
        .eq('seller_id', sellerId).eq('status', 'approved').gte('approved_at', dayStart),
      supabase.from('prospects').select('id, name, stage_id, health, days_in_stage, last_contact_at')
        .eq('owner_id', sellerId).in('health', ['amber', 'red'])
        .order('health', { ascending: true }).limit(5),
      supabase.from('prospects').select('id', count)
        .eq('owner_id', sellerId).lt('last_contact_at', days30ago),
    ])

    const visits = visitsRes.data || []
    const atRisk = atRiskRes.data || []

    setData({
      monthlySales: (salesRes.data || []).reduce((s, r) => s + Number(r.total || 0), 0),
      goal:         profileRes.data?.goal_amount || 100000,
      dailyGoals: {
        visitas:    goalsRes.data?.goal_visitas    || DEFAULT_DAILY.visitas,
        prospectos: goalsRes.data?.goal_prospectos || DEFAULT_DAILY.prospectos,
      },
      todayVisits:   visits.length,
      todayVerified: visits.filter(v => v.verification === 'verified' || v.verification === 'no_reference').length,
      todayNew:      newRes.count ?? 0,
      todayQuotes:   quotesRes.count ?? 0,
      todayWins:     winsRes.count ?? 0,
      atRiskCount:     atRisk.length,
      atRiskProspects: atRisk,
      inactiveCount:   inactiveRes.count ?? 0,
    })
    setLoading(false)
  }, [sellerId])

  useEffect(() => { load() }, [load, refreshKey])
  return { ...data, loading }
}

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX')

function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 4px 10px' }}>
      <div className="k-display" style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
      {action && (
        <button onClick={onAction} style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-secondary)', padding: '6px 0' }}>
          {action} →
        </button>
      )}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────
function Header({ profile, onOpenNotifications, dark, onToggleDark, unreadCount = 0 }) {
  const name = profile?.full_name || 'Vendedor'
  const first = name.split(' ')[0]
  const initials = profile?.initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const dateStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const today = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: 'var(--ink)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Hola, {first}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{today}</div>
      </div>
      <IconButton icon={dark ? 'sun' : 'moon'} label={dark ? 'Modo claro' : 'Modo oscuro'} onClick={onToggleDark} />
      <div style={{ position: 'relative' }}>
        <IconButton icon="bell" label="Notificaciones" onClick={onOpenNotifications} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
            background: 'var(--coral)', color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>
    </div>
  )
}

// ── Mi día: metas diarias ─────────────────────────────────────────
function DayCard({ dash }) {
  const { todayVisits, todayVerified, todayNew, dailyGoals, loading } = dash
  const left = Math.max(dailyGoals.visitas - todayVisits, 0)
  const unverified = todayVisits - todayVerified

  return (
    <Card tone="ink" style={{ borderRadius: 'var(--r-xl)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <ProgressRing value={todayVisits} max={dailyGoals.visitas} size={124} stroke={12}>
          <div className="k-display" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: 'var(--on-ink)' }}>
            {loading ? '–' : todayVisits}
          </div>
          <div style={{ fontSize: 13, color: 'var(--on-ink-muted)', marginTop: 2 }}>de {dailyGoals.visitas}</div>
        </ProgressRing>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--on-ink-muted)' }}>VISITAS HOY</div>
          <div className="k-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>
            {loading ? ' ' : left === 0 ? '¡Meta cumplida!' : `Te faltan ${left}`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <Pill tone="accent" icon="map-pin-check">{todayVerified} verificadas</Pill>
            {unverified > 0 && <Pill tone="on-ink" icon="alert-triangle">{unverified} sin verificar</Pill>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--on-ink-muted)' }}>Prospectos nuevos</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            {todayNew} <span style={{ fontWeight: 400, color: 'var(--on-ink-muted)' }}>/ {dailyGoals.prospectos}</span>
          </span>
        </div>
        <ProgressBar value={todayNew} max={dailyGoals.prospectos} color="var(--accent-2)" track="rgba(255,255,255,0.14)" />
      </div>
    </Card>
  )
}

function StatTiles({ dash, onOpenKanban }) {
  const tiles = [
    { v: dash.todayQuotes, l: 'Cotizaciones hoy' },
    { v: dash.todayWins,   l: 'Cierres hoy' },
    { v: dash.atRiskCount, l: 'En riesgo', onClick: () => onOpenKanban(), alert: dash.atRiskCount > 0 },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {tiles.map(t => {
        const Tag = t.onClick ? 'button' : 'div'
        return (
          <Tag key={t.l} onClick={t.onClick} className="k-card" style={{
            textAlign: 'left', padding: '14px 12px',
            background: t.alert ? 'var(--coral-soft)' : 'var(--surface)',
            color: t.alert ? 'var(--coral-fg)' : 'var(--fg)',
          }}>
            <div className="k-display" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{dash.loading ? '–' : t.v}</div>
            <div style={{ fontSize: 13, marginTop: 6, color: t.alert ? 'inherit' : 'var(--fg-secondary)', lineHeight: 1.25 }}>{t.l}</div>
          </Tag>
        )
      })}
    </div>
  )
}

// ── Tareas ────────────────────────────────────────────────────────
function Tasks({ sellerId, refreshKey }) {
  const { tasks, loading, toggle, add, remove, reload } = useTasks(sellerId)
  const [draft, setDraft] = useState('')
  const today = localDateStr()

  useEffect(() => { if (refreshKey) reload() }, [refreshKey, reload])

  const pending  = tasks.filter(t => !t.done_at && t.due_date <= today)
  const done     = tasks.filter(t => t.done_at)
  const upcoming = tasks.filter(t => !t.done_at && t.due_date > today)

  async function submit(e) {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    setDraft('')
    await add({ title })
  }

  const Row = ({ t }) => {
    const overdue = !t.done_at && t.due_date < today
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '8px 0' }}>
        <button className="k-check" role="checkbox" aria-checked={!!t.done_at} aria-label={t.title} onClick={() => toggle(t)}>
          <Icon name="check" size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 500, lineHeight: 1.3,
            textDecoration: t.done_at ? 'line-through' : 'none',
            color: t.done_at ? 'var(--fg-tertiary)' : 'var(--fg)',
          }}>{t.title}</div>
          {(overdue || t.due_date > today) && (
            <div style={{ marginTop: 4 }}>
              <Pill tone={overdue ? 'coral' : undefined}>{overdue ? `Vencida · ${relativeDay(t.due_date)}` : relativeDay(t.due_date)}</Pill>
            </div>
          )}
        </div>
        {t.created_by === sellerId && !t.done_at && (
          <button aria-label="Eliminar tarea" onClick={() => remove(t)} style={{ width: 40, height: 40, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <SectionHead title={`Pendientes${pending.length ? ` · ${pending.length}` : ''}`} />
      <Card>
        {loading ? (
          <div style={{ padding: '12px 0', color: 'var(--fg-tertiary)' }}>Cargando…</div>
        ) : pending.length + done.length === 0 ? (
          <div style={{ padding: '10px 0 14px', color: 'var(--fg-secondary)', fontSize: 15 }}>
            Sin pendientes para hoy. Al registrar una visita, el próximo paso aparece aquí.
          </div>
        ) : (
          <div style={{ marginBottom: 6 }}>
            {pending.map(t => <Row key={t.id} t={t} />)}
            {done.map(t => <Row key={t.id} t={t} />)}
          </div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
          <input className="k-input" value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Agregar tarea para hoy…" aria-label="Nueva tarea"
            style={{ background: 'var(--bg-secondary)', boxShadow: 'none' }} />
          <IconButton icon="plus" label="Agregar tarea" variant="ink" type="submit" disabled={!draft.trim()} />
        </form>
      </Card>

      {upcoming.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-secondary)', padding: '8px 4px', cursor: 'pointer' }}>
            Próximos 7 días · {upcoming.length}
          </summary>
          <Card style={{ marginTop: 6 }}>
            {upcoming.map(t => <Row key={t.id} t={t} />)}
          </Card>
        </details>
      )}
    </div>
  )
}

// ── Meta del mes ──────────────────────────────────────────────────
function MonthCard({ monthlySales = 0, goal = 100000, loading }) {
  const pct = goal > 0 ? Math.min(monthlySales / goal, 1) : 0
  const now = new Date()
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()

  return (
    <Card tone="lilac" style={{ borderRadius: 'var(--r-xl)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>META DEL MES</div>
        <span className="k-pill" style={{ background: 'rgba(20,16,46,0.12)', color: 'inherit' }}>{daysLeft} días restantes</span>
      </div>
      <div className="k-display" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, marginTop: 10 }}>
        {loading ? '–' : fmt(monthlySales)}
      </div>
      <div style={{ fontSize: 14, marginTop: 2, marginBottom: 12 }}>
        de {fmt(goal)} · {Math.round(pct * 100)}%
      </div>
      <ProgressBar value={monthlySales} max={goal} color="#14102E" track="rgba(20,16,46,0.18)" height={10} />
    </Card>
  )
}

// ── Acciones rápidas ──────────────────────────────────────────────
function QuickActions({ onNewProspect, onQuote, onWhatsApp, onActivity }) {
  const actions = [
    { label: 'Nuevo prospecto', icon: 'user-plus',      onClick: onNewProspect },
    { label: 'Cotizar',         icon: 'file-invoice',   onClick: onQuote },
    { label: 'WhatsApp',        icon: 'brand-whatsapp', onClick: onWhatsApp },
    { label: 'Llamada',         icon: 'phone',          onClick: onActivity },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span className="k-iconbtn k-iconbtn--lg"><Icon name={a.icon} size={24} /></span>
          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, textAlign: 'center' }}>{a.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Seguimiento pendiente ─────────────────────────────────────────
function FollowupAlert({ atRiskProspects = [], onOpen }) {
  if (atRiskProspects.length === 0) return null
  return (
    <div>
      <SectionHead title="Seguimiento pendiente" action="Ver lista" onAction={() => onOpen()} />
      <Card>
        {atRiskProspects.slice(0, 3).map((p, i) => {
          const red = p.health === 'red'
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
                  {red ? `${p.days_in_stage ?? '?'} días en ${STAGE_BY_ID[p.stage_id]?.label || p.stage_id}` : 'Requiere contacto'}
                </div>
              </div>
              <Pill tone={red ? 'coral' : 'warning'}>{red ? 'Estancado' : 'En riesgo'}</Pill>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────────────────
const TYPE_LABEL = { visita: 'Visita', llamada: 'Llamada', cotizacion: 'Cotización', cierre: 'Cierre', reunion: 'Reunión' }
const TYPE_TONE  = { visita: 'sky', llamada: 'coral', cotizacion: 'warning', cierre: 'success', reunion: 'lilac' }

function fmtEventTime(timeStr) {
  if (!timeStr) return { time: '—', ampm: '' }
  const [h, m] = timeStr.split(':').map(Number)
  return { time: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, ampm: h >= 12 ? 'PM' : 'AM' }
}

function Agenda({ sellerId, onOpenAgenda, onOpenEvent }) {
  const { events, loading } = useTodayAgenda(sellerId)
  const today = localDateStr()

  return (
    <div>
      <SectionHead title="Agenda" action="Ver semana" onAction={onOpenAgenda} />
      {loading ? (
        <Card style={{ color: 'var(--fg-tertiary)' }}>Cargando agenda…</Card>
      ) : events.length === 0 ? (
        <Card style={{ color: 'var(--fg-secondary)' }}>Sin citas en los próximos días</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(ev => {
            const { time, ampm } = fmtEventTime(ev.start)
            return (
              <button key={ev.id} onClick={() => onOpenEvent && onOpenEvent(ev)} className="k-card"
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, minHeight: 72 }}>
                <div style={{ minWidth: 54 }}>
                  <div className="k-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{time}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 3 }}>{ampm}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <Pill tone={TYPE_TONE[ev.type]}>{TYPE_LABEL[ev.type] || ev.type}</Pill>
                    {ev.date !== today && <Pill>{relativeDay(ev.date)}</Pill>}
                  </div>
                </div>
                <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Embudo ────────────────────────────────────────────────────────
function FunnelSummary({ onOpenKanban }) {
  const { rows, loading } = useFunnelCounts()
  const list = loading ? STAGES.map(s => ({ id: s.id, count: null, risk: 0, stuck: 0 })) : rows

  return (
    <div>
      <SectionHead title="Mi embudo" action="Abrir" onAction={() => onOpenKanban()} />
      <Card flush>
        {list.map((row, i) => (
          <button key={row.id} onClick={() => onOpenKanban(row.id)} style={{
            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
            minHeight: 54, padding: '0 16px', borderTop: i ? '1px solid var(--border)' : 'none',
          }}>
            <StageDot stage={row.id} />
            <span style={{ fontSize: 16, flex: 1 }}>{STAGE_BY_ID[row.id]?.label || row.id}</span>
            {!loading && row.risk > 0 && <Pill tone="warning" icon="alert-triangle">{row.risk}</Pill>}
            {!loading && row.stuck > 0 && <Pill tone="coral" icon="alert-circle">{row.stuck}</Pill>}
            <span className="k-display" style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
              {loading ? '–' : row.count}
            </span>
            <Icon name="chevron-right" size={18} color="var(--fg-tertiary)" />
          </button>
        ))}
      </Card>
    </div>
  )
}

function ReactivatorBanner({ inactiveCount = 0, onOpen }) {
  if (inactiveCount === 0) return null
  return (
    <button onClick={onOpen} className="k-card" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72 }}>
      <span className="k-iconbtn k-iconbtn--soft"><Icon name="history" size={22} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Reactivador</div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
          {inactiveCount} cliente{inactiveCount > 1 ? 's' : ''} sin contacto hace más de 30 días
        </div>
      </div>
      <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />
    </button>
  )
}

// ── Dashboard (main export) ───────────────────────────────────────
export default function Dashboard({
  profile, dark, onToggleDark, onOpenKanban, onRegisterVisit, onNewProspect, onOpenNotifications,
  onQuote, onWhatsApp, onOpenAgenda, onOpenAgendaEvent, onOpenReactivador, unreadCount = 0, refreshKey = 0,
}) {
  const dash = useSellerDashboard(profile?.id, refreshKey)

  return (
    <div style={{ padding: '14px 14px 170px', display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--bg)', minHeight: '100%' }}>
      <Header profile={profile} onOpenNotifications={onOpenNotifications} dark={dark} onToggleDark={onToggleDark} unreadCount={unreadCount} />
      <DayCard dash={dash} />
      <StatTiles dash={dash} onOpenKanban={onOpenKanban} />
      <Tasks sellerId={profile?.id} refreshKey={refreshKey} />
      <QuickActions onNewProspect={onNewProspect} onQuote={onQuote} onWhatsApp={onWhatsApp} onActivity={onRegisterVisit} />
      <MonthCard monthlySales={dash.monthlySales} goal={dash.goal} loading={dash.loading} />
      <FollowupAlert atRiskProspects={dash.atRiskProspects} onOpen={onOpenKanban} />
      <Agenda sellerId={profile?.id} onOpenAgenda={onOpenAgenda} onOpenEvent={onOpenAgendaEvent} />
      <FunnelSummary onOpenKanban={onOpenKanban} />
      <ReactivatorBanner inactiveCount={dash.inactiveCount} onOpen={onOpenReactivador} />
    </div>
  )
}
