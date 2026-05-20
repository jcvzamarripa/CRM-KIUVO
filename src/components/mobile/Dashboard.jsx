import React, { useState } from 'react'
import Icon from '../shared/Icon'
import StageDot from '../shared/StageDot'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { MOCK_FUNNEL, MOCK_AGENDA } from '../../constants/mockData'

const fmt = n => '$' + n.toLocaleString('es-MX')

// ── Header ────────────────────────────────────────────────────────
function Header({ profile }) {
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
      <div style={{ position: 'relative' }}>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '0.5px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)',
        }}>
          <Icon name="bell" size={18} />
        </button>
        <span style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9,
          background: '#E24B4A', color: '#fff',
          fontSize: 10, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--bg)',
        }}>3</span>
      </div>
    </div>
  )
}

// ── MetaCard ──────────────────────────────────────────────────────
function MetaCard({ state = 'mid' }) {
  const goals = {
    on:  { current: 92400, pct: 0.92, racha: 8, nivel: 5, tone: 'good' },
    mid: { current: 68400, pct: 0.68, racha: 5, nivel: 4, tone: 'mid'  },
    red: { current: 28100, pct: 0.28, racha: 1, nivel: 2, tone: 'bad'  },
  }
  const g = goals[state] || goals.mid
  const goal = 100000
  const daysLeft = 3

  const tones = {
    good: { bg: 'var(--success-bg)',      fg: 'var(--success-fg)', deep: '#0A4A3B',            mid: '#B8E3D2',              fill: 'var(--success)',     deepText: 'var(--success-fg)' },
    mid:  { bg: 'var(--kiuvo-blue-soft)', fg: 'var(--kiuvo-blue)', deep: 'var(--kiuvo-blue-deep)', mid: 'var(--kiuvo-blue-mid)', fill: 'var(--kiuvo-blue)', deepText: 'var(--kiuvo-blue-deep)' },
    bad:  { bg: '#FCEBEB',               fg: '#A32D2D',           deep: '#501313',            mid: '#F0B6B6',              fill: '#A32D2D',           deepText: '#501313' },
  }
  const t = tones[g.tone]

  return (
    <div style={{ margin: '0 16px', padding: '14px 16px', background: t.bg, borderRadius: 'var(--r-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.fg, letterSpacing: 0.4 }}>META SEMANAL</div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 500, color: t.deepText, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{fmt(g.current)}</span>
            <span style={{ fontSize: 12, color: t.fg }}>de {fmt(goal)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 'var(--r-full)',
            background: t.mid, color: t.deepText, fontSize: 11, fontWeight: 500,
          }}>
            <Icon name="flame" size={12} />
            <span>Nivel {g.nivel}</span>
          </div>
          <div style={{ fontSize: 11, color: t.fg, marginTop: 4 }}>Racha: {g.racha} días</div>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: t.mid, overflow: 'hidden' }}>
        <div style={{ width: `${g.pct * 100}%`, height: '100%', background: t.fill, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.fg }}>
        <span style={{ fontWeight: 500 }}>{Math.round(g.pct * 100)}%</span>
        <span>{daysLeft} días restantes</span>
      </div>
    </div>
  )
}

// ── DayStats ──────────────────────────────────────────────────────
function DayStats() {
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {[
        { v: '5', l: 'Visitas hoy' },
        { v: '2', l: 'Cotizaciones' },
        { v: '1', l: 'Cierres' },
      ].map(it => (
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
function FollowupAlert({ hero = false, onOpen }) {
  if (hero) {
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
            <div style={{ fontSize: 12, color: 'var(--warning-fg)', opacity: 0.85, marginTop: 2 }}>
              2 prospectos en riesgo · 1 estancado
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button onClick={onOpen} style={{
                padding: '7px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--warning-fg)', color: '#FFF8EB',
                fontSize: 12, fontWeight: 500,
              }}>Ver lista</button>
              <button style={{
                padding: '7px 12px', borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--warning-border)', color: 'var(--warning-fg)',
                fontSize: 12, fontWeight: 500,
              }}>Recordar mañana</button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, borderTop: '0.5px solid var(--warning-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'Refaccionaria El Bajío',    why: '24 días en Presentación',    stage: 'presentacion', kind: 'red' },
            { name: 'Materiales Pacífico',       why: '11 días sin visita',         stage: 'cotizacion',  kind: 'amber' },
            { name: 'Plomería Industrial Vega',  why: 'Sin visitas registradas',    stage: 'prospeccion', kind: 'amber' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.kind === 'red' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--warning-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--warning-fg)', opacity: 0.8 }}>{p.why}</div>
              </div>
              <StageDot stage={p.stage} />
              <Icon name="chevron-right" size={14} color="var(--warning-fg)" style={{ opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <button onClick={onOpen} style={{
      width: 'calc(100% - 32px)', margin: '0 16px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)',
      borderRadius: 'var(--r-lg)', textAlign: 'left',
    }}>
      <Icon name="eye-exclamation" size={20} color="var(--warning-fg)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning-fg)' }}>Seguimiento pendiente</div>
        <div style={{ fontSize: 11, color: 'var(--warning-fg)', opacity: 0.85 }}>2 prospectos en riesgo · 1 estancado</div>
      </div>
      <Icon name="chevron-right" size={18} color="var(--warning-fg)" />
    </button>
  )
}

// ── QuickActions ──────────────────────────────────────────────────
function QuickActions({ onRegisterVisit, onNewProspect }) {
  const actions = [
    { label: 'Registrar visita', icon: 'map-pin',        bg: '#E6F1FB', fg: '#185FA5', onClick: onRegisterVisit },
    { label: 'Nuevo prospecto',  icon: 'user-plus',      bg: '#EAF3DE', fg: '#3B6D11', onClick: onNewProspect },
    { label: 'Cotizar',          icon: 'file-text',      bg: '#FAEEDA', fg: '#854F0B', onClick: null },
    { label: 'WhatsApp',         icon: 'brand-whatsapp', bg: '#E1F5EE', fg: '#0F6E56', onClick: null },
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
            background: a.bg, color: a.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={a.icon} size={18} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.label}</div>
        </button>
      ))}
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────────────────
function Agenda() {
  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Agenda de hoy</div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver semana →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MOCK_AGENDA.map((a, i) => {
          const stage = STAGE_BY_ID[a.stage]
          return (
            <div key={i} style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '10px 12px 10px 13px',
              display: 'flex', gap: 12, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: stage.color }} />
              <div style={{ minWidth: 42, textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4, lineHeight: 1 }}>{a.time}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.ampm}</div>
              </div>
              <div style={{ width: 0.5, background: 'var(--border)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 500, color: stage.color,
                    background: stage.color + '18',
                    padding: '2px 7px', borderRadius: 'var(--r-full)',
                  }}>{a.visit}ª visita</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{a.activity}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--fg-tertiary)' }}>
                  <Icon name="map-pin" size={11} />
                  <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.address}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── FunnelSummary ─────────────────────────────────────────────────
function FunnelSummary({ onOpenKanban }) {
  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Mi embudo</div>
        <button onClick={onOpenKanban} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver kanban →</button>
      </div>
      <div className="card">
        {MOCK_FUNNEL.map((row, i) => {
          const s = STAGE_BY_ID[row.id]
          return (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
            }}>
              <StageDot stage={row.id} />
              <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.label}</span>
              <div style={{ flex: 1 }} />
              {row.risk > 0 && (
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
              {row.stuck > 0 && (
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
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', minWidth: 18, textAlign: 'right' }}>{row.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ReactivatorBanner ─────────────────────────────────────────────
function ReactivatorBanner() {
  return (
    <button style={{
      width: 'calc(100% - 32px)', margin: '0 16px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
      borderRadius: 'var(--r-lg)', textAlign: 'left',
    }}>
      <Icon name="alert-circle" size={20} color="var(--danger)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger-fg)' }}>Reactivador</div>
        <div style={{ fontSize: 11, color: 'var(--danger-fg-mid)' }}>4 clientes sin contacto +60 días</div>
      </div>
      <Icon name="chevron-right" size={18} color="var(--danger)" />
    </button>
  )
}

// ── Dashboard (main export) ───────────────────────────────────────
export default function Dashboard({ profile, metaState = 'mid', alertHero = false, onOpenKanban, onRegisterVisit, onNewProspect }) {
  return (
    <div style={{ paddingBottom: 92, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg)', minHeight: '100%' }}>
      <Header profile={profile} />
      <MetaCard state={metaState} />
      <DayStats />
      <FollowupAlert hero={alertHero} onOpen={onOpenKanban} />
      <QuickActions onRegisterVisit={onRegisterVisit} onNewProspect={onNewProspect} />
      <Agenda />
      <FunnelSummary onOpenKanban={onOpenKanban} />
      <ReactivatorBanner />
      <div style={{ height: 4 }} />
    </div>
  )
}
