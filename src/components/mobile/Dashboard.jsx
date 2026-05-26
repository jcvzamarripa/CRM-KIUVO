import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import StageDot from '../shared/StageDot'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { useTodayAgenda } from '../../hooks/useAgendaEvents'
import { useFunnelCounts } from '../../hooks/useFunnelCounts'
import { supabase } from '../../lib/supabase'

// ── Hook: datos reales del vendedor para el dashboard ─────────────
function useSellerDashboard(sellerId) {
  const [data, setData] = useState({
    monthlySales: 0,
    goal: 100000,
    todayVisits: 0,
    todayQuotes: 0,
    todayWins: 0,
    atRiskCount: 0,
    atRiskProspects: [],
    inactiveCount: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sellerId || !supabase) { setLoading(false); return }

    const today     = new Date().toISOString().slice(0, 10)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const days60ago  = new Date(Date.now() - 60 * 86400000).toISOString()

    const [profileRes, salesRes, activitiesTodayRes, atRiskRes, inactiveRes] = await Promise.all([
      // Meta del mes desde perfil
      supabase.from('profiles').select('goal_amount').eq('id', sellerId).single(),
      // Ventas del mes
      supabase.from('sales').select('amount').eq('seller_id', sellerId).gte('closed_at', monthStart),
      // Actividades de hoy
      supabase.from('activities').select('kind')
        .eq('seller_id', sellerId)
        .gte('created_at', today + 'T00:00:00Z')
        .lte('created_at', today + 'T23:59:59Z'),
      // Prospectos en riesgo (amber/red)
      supabase.from('prospects').select('id, name, stage_id, health, days_in_stage, last_contact_at')
        .eq('owner_id', sellerId)
        .in('health', ['amber', 'red'])
        .order('health', { ascending: true })
        .limit(5),
      // Prospectos inactivos +60 días
      supabase.from('prospects').select('id', { count: 'exact', head: true })
        .eq('owner_id', sellerId)
        .lt('last_contact_at', days60ago),
    ])

    const goal         = profileRes.data?.goal_amount || 100000
    const salesData    = salesRes.data || []
    const monthlySales = salesData.reduce((s, r) => s + Number(r.amount || 0), 0)
    const acts         = activitiesTodayRes.data || []
    const atRisk       = atRiskRes.data || []

    setData({
      monthlySales,
      goal,
      todayVisits: acts.filter(a => a.kind === 'visit').length,
      todayQuotes: acts.filter(a => a.kind === 'quote').length,
      todayWins:   acts.filter(a => a.kind === 'win').length,
      atRiskCount:     atRisk.length,
      atRiskProspects: atRisk,
      inactiveCount:   inactiveRes.count ?? 0,
    })
    setLoading(false)
  }, [sellerId])

  useEffect(() => { load() }, [load])
  return { ...data, loading }
}

function BellSvg({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX')

// ── Header ────────────────────────────────────────────────────────
function Header({ profile, onOpenNotifications, dark, onToggleDark, unreadCount = 0 }) {
  const name = profile?.full_name || 'Vendedor'
  const initials = profile?.initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buen día,' : hour < 18 ? 'Buenas tardes,' : 'Buenas noches,'

  return (
    <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{greeting}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          title={dark ? 'Modo claro' : 'Modo oscuro'}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '0.5px solid var(--border)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1,
          }}
        >
          {dark ? '☀️' : '🌙'}
        </button>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onOpenNotifications}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '0.5px solid var(--border)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)',
            }}
          >
            <BellSvg size={18} color="var(--fg)" />
          </button>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9,
              background: '#E24B4A', color: '#fff',
              fontSize: 10, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--bg)',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared pulse animation ────────────────────────────────────────
const PULSE_STYLE = `@keyframes dashPulse { 0%,100%{opacity:.35} 50%{opacity:.8} }`
function Bone({ w, h, r = 4, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'var(--bg-secondary)',
      animation: 'dashPulse 1.5s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

// ── MetaCardSkeleton ──────────────────────────────────────────────
function MetaCardSkeleton() {
  return (
    <>
      <style>{PULSE_STYLE}</style>
      <div style={{ margin: '0 16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w={80} h={10} />
            <Bone w={120} h={22} />
            <Bone w={90} h={9} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <Bone w={70} h={22} r={99} />
            <Bone w={60} h={9} />
          </div>
        </div>
        <Bone w="100%" h={8} r={4} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <Bone w={28} h={9} />
          <Bone w={80} h={9} />
        </div>
      </div>
    </>
  )
}

// ── DayStatsSkeleton ──────────────────────────────────────────────
function DayStatsSkeleton() {
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <Bone w={36} h={24} />
          <Bone w={64} h={10} />
        </div>
      ))}
    </div>
  )
}

// ── MetaCard ──────────────────────────────────────────────────────
function MetaCard({ monthlySales = 0, goal = 100000, loading = false }) {
  const pct  = goal > 0 ? Math.min(monthlySales / goal, 1) : 0
  const tone = pct >= 0.8 ? 'good' : pct >= 0.4 ? 'mid' : 'bad'

  const now      = new Date()
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = lastDay - now.getDate()

  const tones = {
    good: { bg: 'var(--success-bg)',      fg: 'var(--success-fg)', mid: '#B8E3D2',              fill: 'var(--success)',     deepText: 'var(--success-fg)' },
    mid:  { bg: 'var(--kiuvo-blue-soft)', fg: 'var(--kiuvo-blue)', mid: 'var(--kiuvo-blue-mid)', fill: 'var(--kiuvo-blue)', deepText: 'var(--kiuvo-blue-deep)' },
    bad:  { bg: '#FCEBEB',               fg: '#A32D2D',           mid: '#F0B6B6',              fill: '#A32D2D',           deepText: '#501313' },
  }
  const t = tones[tone]

  if (loading) return <MetaCardSkeleton />

  return (
    <div style={{ margin: '0 16px', padding: '14px 16px', background: t.bg, borderRadius: 'var(--r-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.fg, letterSpacing: 0.4 }}>META DEL MES</div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 500, color: t.deepText, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{fmt(monthlySales)}</span>
            <span style={{ fontSize: 12, color: t.fg }}>de {fmt(goal)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: t.fg }}>{daysLeft} días restantes</div>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: t.mid, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: t.fill, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: t.fg, fontWeight: 500 }}>
        {monthlySales === 0 ? '¡A cerrar el primer trato del mes!' : `${Math.round(pct * 100)}% de la meta`}
      </div>
    </div>
  )
}

// ── DayStats ──────────────────────────────────────────────────────
function DayStats({ visits = 0, quotes = 0, wins = 0 }) {
  const items = [
    { v: String(visits), l: 'Visitas hoy' },
    { v: String(quotes), l: 'Cotizaciones' },
    { v: String(wins),   l: 'Cierres' },
  ]
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map(it => (
        <div key={it.l} style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          padding: '12px 10px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4 }}>{it.v}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{it.l}</div>
        </div>
      ))}
    </div>
  )
}

// ── FollowupAlert ─────────────────────────────────────────────────
function FollowupAlert({ atRiskCount = 0, atRiskProspects = [], onOpen }) {
  if (atRiskCount === 0) return null  // nada pendiente → no mostrar

  const stuckCount = atRiskProspects.filter(p => p.health === 'red').length
  const riskCount  = atRiskProspects.filter(p => p.health === 'amber').length
  const subtitle   = [
    riskCount  > 0 ? `${riskCount} en riesgo`  : null,
    stuckCount > 0 ? `${stuckCount} estancado${stuckCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ margin: '0 16px', padding: 16, background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)', borderRadius: 'var(--r-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: 'var(--r-md)',
          background: '#FAC775', color: 'var(--warning-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="eye-exclamation" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warning-fg)' }}>Seguimiento pendiente</div>
          <div style={{ fontSize: 12, color: 'var(--warning-fg)', opacity: 0.85, marginTop: 2 }}>{subtitle}</div>
          <div style={{ marginTop: 10 }}>
            <button onClick={onOpen} style={{
              padding: '7px 12px', borderRadius: 'var(--r-md)',
              background: 'var(--warning-fg)', color: '#FFF8EB',
              fontSize: 12, fontWeight: 500,
            }}>Ver lista</button>
          </div>
        </div>
      </div>
      {atRiskProspects.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '0.5px solid var(--warning-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atRiskProspects.slice(0, 3).map(p => {
            const why = p.health === 'red'
              ? `${p.days_in_stage ?? '?'} días en ${STAGE_BY_ID[p.stage_id]?.label || p.stage_id}`
              : 'En seguimiento · requiere contacto'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.health === 'red' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--warning-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--warning-fg)', opacity: 0.8 }}>{why}</div>
                </div>
                <StageDot stage={p.stage_id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── QuickAction SVG icons ─────────────────────────────────────────
function IcoMapPin({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}
function IcoUserPlus({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}
function IcoFileText({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}
function IcoWhatsapp({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  )
}

// ── QuickActions ──────────────────────────────────────────────────
function QuickActions({ onRegisterVisit, onNewProspect, onQuote, onWhatsApp }) {
  const actions = [
    { label: 'Registrar visita', Ico: IcoMapPin,    bg: '#E6F1FB', fg: '#185FA5', onClick: onRegisterVisit },
    { label: 'Nuevo prospecto',  Ico: IcoUserPlus,  bg: '#EAF3DE', fg: '#3B6D11', onClick: onNewProspect },
    { label: 'Cotizar',          Ico: IcoFileText,  bg: '#FAEEDA', fg: '#854F0B', onClick: onQuote },
    { label: 'WhatsApp',         Ico: IcoWhatsapp,  bg: '#E1F5EE', fg: '#0F6E56', onClick: onWhatsApp },
  ]
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 12px',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-md)', textAlign: 'left',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r-sm)',
            background: a.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <a.Ico size={18} color={a.fg} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.label}</div>
        </button>
      ))}
    </div>
  )
}

// ── Helpers de agenda ─────────────────────────────────────────────
const TYPE_LABEL = {
  visita:     'Visita presencial',
  llamada:    'Llamada de seguimiento',
  cotizacion: 'Presentación de cotización',
  cierre:     'Cierre de venta',
  reunion:    'Reunión de equipo',
}
const TYPE_COLOR = {
  visita:     'var(--kiuvo-blue)',
  llamada:    '#D85A30',
  cotizacion: 'var(--warning)',
  cierre:     'var(--success)',
  reunion:    '#7C3AED',
}

function fmtEventTime(timeStr) {
  if (!timeStr) return { time: '—', ampm: '' }
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return { time: `${h12}:${String(m).padStart(2, '0')}`, ampm }
}

// ── Agenda ────────────────────────────────────────────────────────
function Agenda({ sellerId, onOpenAgenda, onOpenEvent }) {
  const { events, loading } = useTodayAgenda(sellerId)

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Agenda de hoy</div>
        <button onClick={onOpenAgenda} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver semana →</button>
      </div>
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center', fontSize: 12, color: 'var(--fg-tertiary)' }}>
          Cargando agenda…
        </div>
      ) : events.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center', fontSize: 12, color: 'var(--fg-tertiary)' }}>
          Sin citas para hoy 🎉
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(ev => {
            const stage = STAGE_BY_ID[ev.stage] || STAGE_BY_ID['prospeccion'] || {}
            const color = TYPE_COLOR[ev.type] || 'var(--kiuvo-blue)'
            const { time, ampm } = fmtEventTime(ev.start)
            return (
              <button key={ev.id} onClick={() => onOpenEvent && onOpenEvent(ev)} style={{
                width: '100%', textAlign: 'left',
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', padding: '10px 12px 10px 13px',
                display: 'flex', gap: 12, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: color }} />
                <div style={{ minWidth: 42, textAlign: 'left' }}>
                  <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4, lineHeight: 1 }}>{time}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{ampm}</div>
                </div>
                <div style={{ width: 0.5, background: 'var(--border)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                    <span style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 500, color,
                      background: color + '18',
                      padding: '2px 7px', borderRadius: 'var(--r-full)',
                    }}>{TYPE_LABEL[ev.type] || ev.type}</span>
                  </div>
                  {ev.contact && (
                    <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{ev.contact}</div>
                  )}
                  {ev.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--fg-tertiary)' }}>
                      <Icon name="map-pin" size={11} />
                      <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.address}</span>
                    </div>
                  )}
                </div>
                <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" style={{ flexShrink: 0, alignSelf: 'center' }} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── FunnelSummary ─────────────────────────────────────────────────
function FunnelSummary({ onOpenKanban }) {
  const { rows, loading } = useFunnelCounts()

  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Mi embudo</div>
        <button onClick={() => onOpenKanban()} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver kanban →</button>
      </div>
      <div className="card">
        {(loading ? STAGES.map(s => ({ id: s.id, count: null, risk: 0, stuck: 0 })) : rows).map((row, i) => {
          const s = STAGE_BY_ID[row.id]
          return (
            <button key={row.id} onClick={() => onOpenKanban(row.id)} style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
              background: 'transparent',
            }}>
              <StageDot stage={row.id} />
              <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.label}</span>
              <div style={{ flex: 1 }} />
              {!loading && row.risk > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 500, color: 'var(--warning-fg)',
                  background: 'var(--warning-bg)',
                  padding: '2px 6px', borderRadius: 'var(--r-full)',
                }}>
                  <Icon name="alert-triangle" size={11} />
                  {row.risk}
                </span>
              )}
              {!loading && row.stuck > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 500, color: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  padding: '2px 6px', borderRadius: 'var(--r-full)',
                }}>
                  <Icon name="alert-circle" size={11} />
                  {row.stuck}
                </span>
              )}
              {loading ? (
                <div style={{ width: 20, height: 14, borderRadius: 4, background: 'var(--bg-secondary)' }} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', minWidth: 18, textAlign: 'right' }}>{row.count}</span>
              )}
              <Icon name="chevron-right" size={14} color="var(--fg-tertiary)" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ReactivatorBanner ─────────────────────────────────────────────
function ReactivatorBanner({ inactiveCount = 0, onOpen }) {
  if (inactiveCount === 0) return null  // nada inactivo → no mostrar
  return (
    <button onClick={onOpen} style={{
      width: 'calc(100% - 32px)', margin: '0 16px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
      borderRadius: 'var(--r-lg)', textAlign: 'left',
    }}>
      <Icon name="alert-circle" size={20} color="var(--danger)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger-fg)' }}>Reactivador</div>
        <div style={{ fontSize: 11, color: 'var(--danger-fg-mid)' }}>
          {inactiveCount} cliente{inactiveCount > 1 ? 's' : ''} sin contacto +60 días
        </div>
      </div>
      <Icon name="chevron-right" size={18} color="var(--danger)" />
    </button>
  )
}

// ── Dashboard (main export) ───────────────────────────────────────
export default function Dashboard({ profile, dark, onToggleDark, onOpenKanban, onRegisterVisit, onNewProspect, onOpenNotifications, onQuote, onWhatsApp, onOpenAgenda, onOpenAgendaEvent, onOpenReactivador, unreadCount = 0 }) {
  const dash = useSellerDashboard(profile?.id)

  return (
    <div style={{ paddingBottom: 92, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg)', minHeight: '100%' }}>
      <Header profile={profile} onOpenNotifications={onOpenNotifications} dark={dark} onToggleDark={onToggleDark} unreadCount={unreadCount} />
      <MetaCard monthlySales={dash.monthlySales} goal={dash.goal} loading={dash.loading} />
      {dash.loading
        ? <DayStatsSkeleton />
        : <DayStats visits={dash.todayVisits} quotes={dash.todayQuotes} wins={dash.todayWins} />
      }
      <FollowupAlert atRiskCount={dash.atRiskCount} atRiskProspects={dash.atRiskProspects} onOpen={onOpenKanban} />
      <QuickActions onRegisterVisit={onRegisterVisit} onNewProspect={onNewProspect} onQuote={onQuote} onWhatsApp={onWhatsApp} />
      <Agenda sellerId={profile?.id} onOpenAgenda={onOpenAgenda} onOpenEvent={onOpenAgendaEvent} />
      <FunnelSummary onOpenKanban={onOpenKanban} />
      <ReactivatorBanner inactiveCount={dash.inactiveCount} onOpen={onOpenReactivador} />
      <div style={{ height: 4 }} />
    </div>
  )
}
