import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'

// ─── Gamification data ────────────────────────────────────────────────────────
// Starts empty — will be populated from DB when gamification table is built.
const SELLER_GAME = {}

const LEVEL_CFG = {
  Bronce:  { color: '#CD7F32', bg: '#CD7F3218', next: 500  },
  Plata:   { color: '#8B9DC3', bg: '#8B9DC318', next: 1000 },
  Oro:     { color: '#EF9F27', bg: '#EF9F2718', next: 2000 },
  Platino: { color: '#185FA5', bg: '#185FA518', next: 5000 },
  Diamante:{ color: '#7C5CBF', bg: '#7C5CBF18', next: null },
}

const BADGES_CATALOG = [
  { id: 'primer-cierre', emoji: '🏆', label: 'Primer Cierre',    color: '#EF9F27', desc: 'Primera venta cerrada'              },
  { id: '10-cierres',    emoji: '💎', label: '10 Cierres',       color: '#185FA5', desc: '10 ventas acumuladas'               },
  { id: '7-dias',        emoji: '🔥', label: 'Racha 7 días',     color: '#E24B4A', desc: '7 días consecutivos con actividad'  },
  { id: 'meta-mensual',  emoji: '🎯', label: 'Meta del Mes',     color: '#1D9E75', desc: 'Meta mensual 100% alcanzada'        },
  { id: 'mejor-semana',  emoji: '⚡', label: 'Mejor Semana',     color: '#7C5CBF', desc: 'Mayor número de cierres en una semana' },
  { id: 'top-mes',       emoji: '👑', label: 'Top Vendedor',     color: '#EF9F27', desc: 'Primer lugar del ranking mensual'   },
  { id: 'visitador',     emoji: '📍', label: 'Visitador Pro',    color: '#378ADD', desc: '50 visitas registradas'             },
  { id: 'mejor-conv',    emoji: '🚀', label: 'Mejor Conversión', color: '#D85A30', desc: 'Mayor tasa de conversión del equipo'},
]

const CHALLENGES = [
  { id: 1, title: 'Semana de Fuego',     desc: 'Cierra 3 ventas antes del viernes',    prog: 1, total: 3,   reward: 200, days: 3, icon: 'flame',   color: '#E24B4A' },
  { id: 2, title: 'Visitador Estrella',  desc: 'Registra 10 visitas en los próximos 5 días', prog: 7, total: 10, reward: 150, days: 5, icon: 'map-pin', color: '#185FA5' },
  { id: 3, title: 'Meta del Mes',        desc: 'Alcanza el 100% de tu meta mensual',   prog: 82, total: 100, reward: 500, days: 9, icon: 'target',  color: '#1D9E75' },
  { id: 4, title: 'Maestro del Pipeline',desc: 'Avanza 5 prospectos de etapa',         prog: 2, total: 5,   reward: 120, days: 7, icon: 'layout-kanban', color: '#7C5CBF' },
]

const POINTS_RULES = [
  { action: 'Visita registrada',     pts: 10,  icon: 'map-pin',      color: '#185FA5' },
  { action: 'Prospecto calificado',  pts: 20,  icon: 'user-plus',    color: '#378ADD' },
  { action: 'Cotización enviada',    pts: 30,  icon: 'file-text',    color: '#EF9F27' },
  { action: 'Avance de etapa',       pts: 40,  icon: 'arrow-right',  color: '#7C5CBF' },
  { action: 'Cierre de venta',       pts: 100, icon: 'trophy',       color: '#1D9E75' },
  { action: 'Meta semanal alcanzada',pts: 150, icon: 'check',        color: '#1D9E75' },
  { action: 'Meta mensual alcanzada',pts: 500, icon: 'target',       color: '#EF9F27' },
]

// Metas y actuals por vendedor — starts empty, populated from DB.
const DEFAULT_METAS = {}
const ACTUALS = {}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = n => '$' + n.toLocaleString('es-MX')
const pct  = (a, b) => Math.round((a / b) * 100)
// sellerColor / sellerName receive the sellers list from the enclosing component
const sellerColor = (sellers, init) => sellers.find(s => s.init === init)?.color || '#888'
const sellerName  = (sellers, init) => sellers.find(s => s.init === init)?.name  || init
// Safe lookup into hardcoded gamification maps
const gameOf   = init => SELLER_GAME[init]   || { pts: 0, level: 'Bronce', rank: 99, prev: 99, streak: 0, xpNext: 500, badges: [] }
const metaOf   = init => DEFAULT_METAS[init] || { ventas: 80000, prospectos: 20, visitas: 25 }
// actualOf uses real seller data when available; falls back to ACTUALS (now empty)
const actualOf = (init, sellers = []) => {
  const s = sellers.find(sl => sl.init === init)
  return ACTUALS[init] || {
    ventas:     s?.current   || 0,
    prospectos: s?.prospects || 0,
    visitas:    0,
  }
}

// ─── Editable cell ────────────────────────────────────────────────────────────
function EditableCell({ value, onSave, format = 'number', prefix = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(String(value))
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    const n = parseInt(draft.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > 0) onSave(n)
    setEditing(false)
  }

  const display = format === 'money' ? fmt(value) : prefix + value.toLocaleString('es-MX')

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={commit}
          style={{
            width: 90, padding: '3px 7px', fontSize: 12,
            border: '1.5px solid var(--kiuvo-blue)', borderRadius: 'var(--r-sm)',
            background: 'var(--bg)', color: 'var(--fg)',
          }}
        />
        <button onClick={commit} style={{ color: 'var(--success)', padding: 2 }}>
          <Icon name="check" size={13} />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        cursor: 'pointer', padding: '2px 6px', borderRadius: 'var(--r-sm)',
        transition: 'background 0.1s',
        fontSize: 13, fontWeight: 600, color: 'var(--fg)',
      }}
      title="Clic para editar"
    >
      {display}
      <Icon name="pencil" size={11} color="var(--fg-tertiary)" />
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgBar({ value, max, color = 'var(--kiuvo-blue)', h = 5 }) {
  const p = Math.min(pct(value, max), 100)
  return (
    <div style={{ height: h, borderRadius: h, background: 'var(--bg-secondary)', overflow: 'hidden', minWidth: 60 }}>
      <div style={{
        height: '100%', width: `${p}%`, borderRadius: h,
        background: p >= 100 ? 'var(--success)' : p >= 70 ? color : 'var(--warning)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

// ─── Metas Tab ────────────────────────────────────────────────────────────────
function MetasTab({ sellers = [] }) {
  const [period,        setPeriod]        = useState('Mes')
  // Initialize metas from real seller goals (goal_amount from profiles)
  const [metas,         setMetas]         = useState({})
  const [dirty,         setDirty]         = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [teamGoalCustom,setTeamGoalCustom]= useState(null)   // null = suma de metas individuales
  const [editingTeam,   setEditingTeam]   = useState(false)
  const [teamDraft,     setTeamDraft]     = useState('')
  const teamInputRef = useRef(null)

  useEffect(() => { if (editingTeam) teamInputRef.current?.focus() }, [editingTeam])

  // Seed metas from real seller data when sellers load
  useEffect(() => {
    if (!sellers.length) return
    setMetas(prev => {
      const next = { ...prev }
      sellers.forEach(s => {
        if (!next[s.init]) {
          next[s.init] = {
            ventas:     s.goal     || 80000,
            prospectos: DEFAULT_METAS[s.init]?.prospectos || 20,
            visitas:    DEFAULT_METAS[s.init]?.visitas    || 25,
          }
        }
      })
      return next
    })
  }, [sellers])

  function updateMeta(init, field, val) {
    setMetas(m => ({ ...m, [init]: { ...m[init], [field]: val } }))
    setDirty(true)
    setSaved(false)
  }

  function handleSave() {
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function openTeamEdit() {
    const cur = teamGoalCustom ?? sumIndividual
    setTeamDraft(String(cur))
    setEditingTeam(true)
  }

  function commitTeamGoal() {
    const n = parseInt(teamDraft.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > 0) {
      setTeamGoalCustom(n === sumIndividual ? null : n)
      setDirty(true)
      setSaved(false)
    }
    setEditingTeam(false)
  }

  const sorted = [...sellers].sort((a, b) => {
    const pa = pct(actualOf(a.init, sellers).ventas, metas[a.init]?.ventas || metaOf(a.init).ventas)
    const pb = pct(actualOf(b.init, sellers).ventas, metas[b.init]?.ventas || metaOf(b.init).ventas)
    return pb - pa
  })

  const sumIndividual = sellers.reduce((s, sl) => s + (metas[sl.init]?.ventas || metaOf(sl.init).ventas), 0)
  const teamGoal      = teamGoalCustom ?? sumIndividual
  const teamActual    = sellers.reduce((s, sl) => s + actualOf(sl.init, sellers).ventas, 0)
  const avgCompl    = sorted.length ? Math.round(sorted.reduce((s, sl) => {
    const m = metas[sl.init]?.ventas || metaOf(sl.init).ventas
    return s + pct(actualOf(sl.init, sellers).ventas, m)
  }, 0) / sorted.length) : 0
  const topSeller   = sorted[0]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sub-toolbar */}
      <div style={{
        padding: '10px 20px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Period */}
        <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2, gap: 1 }}>
          {['Semana','Mes','Trimestre','Año'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '4px 12px', fontSize: 11,
              fontWeight: period === p ? 500 : 400,
              color: period === p ? 'var(--fg)' : 'var(--fg-secondary)',
              background: period === p ? 'var(--surface)' : 'transparent',
              borderRadius: 'var(--r-sm)',
              border: period === p ? '0.5px solid var(--border)' : 'none',
            }}>{p}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Save state */}
        {saved && (
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--success)', fontWeight:500 }}>
            <Icon name="check" size={14} color="var(--success)" />
            Cambios guardados
          </div>
        )}
        {dirty && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--warning-fg)' }}>Hay cambios sin guardar</span>
            <button
              onClick={handleSave}
              style={{
                padding:'6px 16px', fontSize:12, fontWeight:600,
                background:'var(--kiuvo-blue)', color:'#fff',
                borderRadius:'var(--r-md)',
                boxShadow:'0 2px 8px #185FA530',
              }}
            >Guardar cambios</button>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        {/* KPI summary row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>

          {/* ── Meta total equipo (editable) ── */}
          <div style={{
            background:'var(--surface)',
            border: `0.5px solid ${editingTeam ? 'var(--kiuvo-blue)' : teamGoalCustom ? 'var(--warning-border)' : 'var(--border)'}`,
            borderRadius:'var(--r-lg)', padding:'14px 16px',
            transition:'border-color 0.15s',
            position:'relative',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, color:'var(--fg-secondary)' }}>Meta total equipo</span>
                {teamGoalCustom && (
                  <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:'var(--r-full)', background:'var(--warning-bg)', color:'var(--warning-fg)' }}>
                    personalizada
                  </span>
                )}
              </div>
              <div style={{ width:28, height:28, borderRadius:'var(--r-md)', background:'var(--kiuvo-blue-soft)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="target" size={14} color="var(--kiuvo-blue)" />
              </div>
            </div>

            {editingTeam ? (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:13, color:'var(--fg-secondary)' }}>$</span>
                <input
                  ref={teamInputRef}
                  value={teamDraft}
                  onChange={e => setTeamDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitTeamGoal(); if (e.key === 'Escape') setEditingTeam(false) }}
                  onBlur={commitTeamGoal}
                  style={{
                    flex:1, padding:'4px 8px', fontSize:18, fontWeight:700,
                    border:'1.5px solid var(--kiuvo-blue)', borderRadius:'var(--r-sm)',
                    background:'var(--bg)', color:'var(--fg)',
                  }}
                />
                <button onClick={commitTeamGoal} style={{ color:'var(--success)', flexShrink:0 }}>
                  <Icon name="check" size={16} color="var(--success)" />
                </button>
              </div>
            ) : (
              <div
                onClick={openTeamEdit}
                style={{ display:'inline-flex', alignItems:'center', gap:7, cursor:'pointer', marginBottom:2 }}
                title="Clic para editar la meta global"
              >
                <span style={{ fontSize:22, fontWeight:700, color:'var(--fg)' }}>{fmt(teamGoal)}</span>
                <Icon name="pencil" size={13} color="var(--fg-tertiary)" />
              </div>
            )}

            <div style={{ fontSize:10, color:'var(--fg-tertiary)' }}>
              {period} actual
              {teamGoalCustom && sumIndividual !== teamGoalCustom && (
                <span style={{ marginLeft:6, color:'var(--fg-tertiary)' }}>
                  · suma individual: {fmt(sumIndividual)}
                </span>
              )}
            </div>

            {/* Reset link */}
            {teamGoalCustom && !editingTeam && (
              <button
                onClick={() => { setTeamGoalCustom(null); setDirty(true) }}
                style={{ position:'absolute', bottom:10, right:14, fontSize:9, color:'var(--fg-tertiary)', textDecoration:'underline' }}
              >
                Restablecer
              </button>
            )}
          </div>

          {/* ── Otros 3 KPIs ── */}
          {[
            { label:'Alcanzado hasta hoy',   value: fmt(teamActual),  sub: `${pct(teamActual, teamGoal)}% del objetivo`, icon:'trending-up', color:'var(--success)' },
            { label:'Cumplimiento promedio', value: `${avgCompl}%`,   sub: 'del equipo · este mes', icon:'chart-bar', color: avgCompl >= 80 ? 'var(--success)' : avgCompl >= 60 ? 'var(--warning)' : 'var(--danger)' },
            { label:'Mejor vendedor',        value: topSeller ? sellerName(sellers, topSeller.init).split(' ')[0] : '—', sub: topSeller ? `${pct(actualOf(topSeller.init, sellers).ventas, metas[topSeller.init]?.ventas || metaOf(topSeller.init).ventas)}% de cumplimiento` : '', icon:'trophy', color:'#EF9F27' },
          ].map(c => (
            <div key={c.label} style={{
              background:'var(--surface)', border:'0.5px solid var(--border)',
              borderRadius:'var(--r-lg)', padding:'14px 16px',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, color:'var(--fg-secondary)' }}>{c.label}</span>
                <div style={{ width:28, height:28, borderRadius:'var(--r-md)', background: c.color + '18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={c.icon} size={14} color={c.color} />
                </div>
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--fg)', marginBottom:2 }}>{c.value}</div>
              <div style={{ fontSize:10, color:'var(--fg-tertiary)' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Metas table */}
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
          {/* Table header */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'220px repeat(3, 1fr)',
            padding:'10px 16px',
            borderBottom:'0.5px solid var(--border)',
            background:'var(--bg-secondary)',
          }}>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--fg-tertiary)' }}>VENDEDOR</div>
            {[
              { label:'VENTAS ($)', icon:'trending-up' },
              { label:'PROSPECTOS', icon:'users' },
              { label:'VISITAS',    icon:'map-pin' },
            ].map(h => (
              <div key={h.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Icon name={h.icon} size={11} color="var(--fg-tertiary)" />
                <span style={{ fontSize:11, fontWeight:500, color:'var(--fg-tertiary)' }}>{h.label}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {sorted.map((sl, i) => {
            const g  = { ...metaOf(sl.init), ...metas[sl.init] }
            const a  = actualOf(sl.init, sellers)
            const sclr = sellerColor(sellers, sl.init)
            const ventasPct = pct(a.ventas, g.ventas)

            return (
              <div key={sl.init} style={{
                display:'grid', gridTemplateColumns:'220px repeat(3, 1fr)',
                padding:'14px 16px',
                borderBottom: i < sorted.length - 1 ? '0.5px solid var(--border)' : 'none',
                alignItems:'center',
              }}>
                {/* Seller */}
                <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                  <div style={{
                    width:34, height:34, borderRadius:'50%', flexShrink:0,
                    background: sclr + '22', color: sclr,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, border:`1.5px solid ${sclr}44`,
                  }}>{sl.init}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{sl.name}</div>
                    <div style={{
                      fontSize:10, fontWeight:500,
                      color: ventasPct >= 100 ? 'var(--success)' : ventasPct >= 70 ? 'var(--warning-fg)' : 'var(--danger)',
                      marginTop:1,
                    }}>{ventasPct}% cumplimiento</div>
                  </div>
                </div>

                {/* Ventas */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom:4 }}>
                    <EditableCell value={g.ventas} format="money" onSave={v => updateMeta(sl.init, 'ventas', v)} />
                    <span style={{ fontSize:11, color:'var(--fg-secondary)' }}>{fmt(a.ventas)}</span>
                  </div>
                  <ProgBar value={a.ventas} max={g.ventas} color={sclr} />
                </div>

                {/* Prospectos */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <EditableCell value={g.prospectos} onSave={v => updateMeta(sl.init, 'prospectos', v)} />
                    <span style={{ fontSize:11, color:'var(--fg-secondary)' }}>{a.prospectos} reales</span>
                  </div>
                  <ProgBar value={a.prospectos} max={g.prospectos} color={sclr} />
                </div>

                {/* Visitas */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <EditableCell value={g.visitas} onSave={v => updateMeta(sl.init, 'visitas', v)} />
                    <span style={{ fontSize:11, color:'var(--fg-secondary)' }}>{a.visitas} reales</span>
                  </div>
                  <ProgBar value={a.visitas} max={g.visitas} color={sclr} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Nota */}
        <div style={{ marginTop:12, fontSize:11, color:'var(--fg-tertiary)', display:'flex', alignItems:'center', gap:5 }}>
          <Icon name="pencil" size={12} color="var(--fg-tertiary)" />
          Haz clic en cualquier valor de meta para editarlo directamente.
        </div>
      </div>
    </div>
  )
}

// ─── Podium card ──────────────────────────────────────────────────────────────
function PodiumCard({ seller, game, pos, sellers = [] }) {
  const sclr  = sellerColor(sellers, seller.init)
  const lcfg  = LEVEL_CFG[game.level]
  const heights = { 1: 90, 2: 70, 3: 56 }
  const medals  = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
      {/* Medal */}
      <div style={{ fontSize: pos === 1 ? 28 : 22, marginBottom:6 }}>{medals[pos]}</div>

      {/* Avatar */}
      <div style={{
        width: pos === 1 ? 52 : 42, height: pos === 1 ? 52 : 42,
        borderRadius:'50%',
        background: sclr + '22', color: sclr,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: pos === 1 ? 14 : 11, fontWeight:700,
        border:`2.5px solid ${sclr}`,
        boxShadow:`0 4px 14px ${sclr}40`,
        marginBottom:6,
      }}>{seller.init}</div>

      <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)', textAlign:'center' }}>{seller.name.split(' ')[0]}</div>

      <div style={{
        fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:'var(--r-full)',
        background: lcfg.bg, color: lcfg.color, margin:'4px 0',
      }}>{game.level}</div>

      <div style={{ fontSize:15, fontWeight:700, color:'var(--fg)' }}>{game.pts.toLocaleString()} pts</div>

      {/* Streak */}
      {game.streak > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'#E24B4A', marginTop:3 }}>
          🔥 {game.streak} días
        </div>
      )}

      {/* Podium base */}
      <div style={{
        marginTop:10, width:'100%',
        height: heights[pos],
        background: pos === 1
          ? 'linear-gradient(180deg, #EF9F2740 0%, #EF9F2720 100%)'
          : pos === 2
            ? 'linear-gradient(180deg, #8B9DC330 0%, #8B9DC318 100%)'
            : 'linear-gradient(180deg, #CD7F3230 0%, #CD7F3218 100%)',
        borderRadius:'var(--r-md) var(--r-md) 0 0',
        border:`0.5px solid ${pos === 1 ? '#EF9F2750' : pos === 2 ? '#8B9DC340' : '#CD7F3240'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:20, fontWeight:800,
        color: pos === 1 ? '#EF9F27' : pos === 2 ? '#8B9DC3' : '#CD7F32',
      }}>{pos}</div>
    </div>
  )
}

// ─── Gamification Tab ─────────────────────────────────────────────────────────
function GameTab({ sellers = [] }) {
  const [showRules,     setShowRules]     = useState(false)
  const [newChallenge,  setNewChallenge]  = useState(false)
  const [bonusSeller,   setBonusSeller]   = useState(null)
  const [challenges,    setChallenges]    = useState(CHALLENGES)

  const ranked = [...sellers].sort((a, b) => gameOf(b.init).pts - gameOf(a.init).pts)
  const top3   = ranked.slice(0, 3)

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [ranked[1], ranked[0], ranked[2]]

  function removeChallenge(id) {
    setChallenges(c => c.filter(ch => ch.id !== id))
  }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', gap:0 }}>

      {/* ── Left: Podium + Ranking ── */}
      <div style={{ flex:'0 0 55%', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Podium */}
          <div style={{
            background:'var(--surface)', border:'0.5px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'20px 16px 0',
            marginBottom:16, overflow:'hidden',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>🏆 Ranking del período</div>
              <span style={{ fontSize:11, color:'var(--fg-tertiary)' }}>Mayo 2026</span>
            </div>

            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              {podiumOrder.map((sl, i) => {
                const pos = i === 0 ? 2 : i === 1 ? 1 : 3
                return <PodiumCard key={sl.init} seller={sl} game={gameOf(sl.init)} pos={pos} sellers={sellers} />
              })}
            </div>
          </div>

          {/* Full ranking table */}
          <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            <div style={{
              padding:'12px 16px', borderBottom:'0.5px solid var(--border)',
              background:'var(--bg-secondary)',
              display:'grid', gridTemplateColumns:'32px 1fr 90px 80px 70px 100px',
              gap:8, fontSize:10, fontWeight:500, color:'var(--fg-tertiary)',
            }}>
              <div>#</div><div>VENDEDOR</div><div>NIVEL</div><div>PUNTOS</div><div>RACHA</div><div>INSIGNIAS</div>
            </div>

            {ranked.map((sl, i) => {
              const g    = gameOf(sl.init)
              const lcfg = LEVEL_CFG[g.level] || LEVEL_CFG.Bronce
              const sclr = sellerColor(sellers, sl.init)
              const delta = g.prev - g.rank  // positive = moved up
              const xpPct = Math.round((g.pts / g.xpNext) * 100)

              return (
                <div key={sl.init} style={{
                  display:'grid', gridTemplateColumns:'32px 1fr 90px 80px 70px 100px',
                  gap:8, padding:'12px 16px', alignItems:'center',
                  borderBottom: i < ranked.length - 1 ? '0.5px solid var(--border)' : 'none',
                  background: i === 0 ? '#EF9F2706' : 'transparent',
                }}>
                  {/* Rank + delta */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <span style={{ fontSize:14, fontWeight:700, color: i === 0 ? '#EF9F27' : 'var(--fg)' }}>{g.rank}</span>
                    {delta !== 0 && (
                      <span style={{ fontSize:9, color: delta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                      </span>
                    )}
                  </div>

                  {/* Seller info + XP bar */}
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background: sclr + '22', color: sclr,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, fontWeight:700, border:`1.5px solid ${sclr}44`,
                      }}>{sl.init}</div>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--fg)' }}>{sl.name}</div>
                    </div>
                    {/* XP bar */}
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ flex:1, height:3, borderRadius:2, background:'var(--bg-secondary)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${xpPct}%`, background: lcfg.color, borderRadius:2 }} />
                      </div>
                      <span style={{ fontSize:9, color:'var(--fg-tertiary)', whiteSpace:'nowrap' }}>{g.pts}/{g.xpNext}</span>
                    </div>
                  </div>

                  {/* Level */}
                  <div style={{
                    padding:'3px 8px', borderRadius:'var(--r-full)', textAlign:'center',
                    background: lcfg.bg, color: lcfg.color,
                    fontSize:10, fontWeight:600,
                  }}>{g.level}</div>

                  {/* Points */}
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--fg)' }}>
                    {g.pts.toLocaleString()}
                    <span style={{ fontSize:9, color:'var(--fg-tertiary)', display:'block' }}>puntos</span>
                  </div>

                  {/* Streak */}
                  <div style={{ fontSize:12, display:'flex', alignItems:'center', gap:3 }}>
                    {g.streak > 0 ? (
                      <><span style={{ fontSize:14 }}>🔥</span><span style={{ fontWeight:600, color:'#E24B4A' }}>{g.streak}d</span></>
                    ) : (
                      <span style={{ color:'var(--fg-tertiary)' }}>—</span>
                    )}
                  </div>

                  {/* Badges */}
                  <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                    {g.badges.slice(0, 4).map(bid => {
                      const b = BADGES_CATALOG.find(x => x.id === bid)
                      return b ? (
                        <span key={bid} title={b.label} style={{ fontSize:14, cursor:'default' }}>{b.emoji}</span>
                      ) : null
                    })}
                    {g.badges.length > 4 && (
                      <span style={{ fontSize:10, color:'var(--fg-tertiary)', alignSelf:'center' }}>+{g.badges.length - 4}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Points rules */}
          <div style={{ marginTop:14 }}>
            <button
              onClick={() => setShowRules(r => !r)}
              style={{
                display:'flex', alignItems:'center', gap:6, fontSize:12,
                color:'var(--kiuvo-blue)', fontWeight:500,
              }}
            >
              <Icon name="alert-circle" size={13} color="var(--kiuvo-blue)" />
              {showRules ? 'Ocultar' : 'Ver'} tabla de puntos
              <Icon name={showRules ? 'chevron-right' : 'chevron-right'} size={12} style={{ transform: showRules ? 'rotate(90deg)' : 'rotate(0)', transition:'transform 0.15s' }} />
            </button>

            {showRules && (
              <div style={{
                marginTop:8, background:'var(--surface)', border:'0.5px solid var(--border)',
                borderRadius:'var(--r-lg)', overflow:'hidden',
              }}>
                {POINTS_RULES.map((r, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'9px 16px',
                    borderBottom: i < POINTS_RULES.length - 1 ? '0.5px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:26, height:26, borderRadius:'var(--r-sm)',
                        background: r.color + '18',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <Icon name={r.icon} size={13} color={r.color} />
                      </div>
                      <span style={{ fontSize:12, color:'var(--fg)' }}>{r.action}</span>
                    </div>
                    <span style={{
                      fontSize:12, fontWeight:700, color: r.color,
                      padding:'2px 8px', borderRadius:'var(--r-full)',
                      background: r.color + '14',
                    }}>+{r.pts} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Challenges + Badges ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 20px' }}>

          {/* Active challenges */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>Retos activos</div>
                <div style={{ fontSize:11, color:'var(--fg-secondary)' }}>{challenges.length} en curso · aplican a todos</div>
              </div>
              <button
                onClick={() => setNewChallenge(true)}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'6px 12px', fontSize:12, fontWeight:500,
                  background:'var(--kiuvo-blue)', color:'#fff',
                  borderRadius:'var(--r-md)',
                  boxShadow:'0 2px 8px #185FA530',
                }}
              >
                <Icon name="plus" size={13} color="#fff" />
                Nuevo reto
              </button>
            </div>

            {/* New challenge form */}
            {newChallenge && (
              <NewChallengeForm
                onSave={ch => { setChallenges(c => [...c, { ...ch, id: Date.now(), prog: 0 }]); setNewChallenge(false) }}
                onCancel={() => setNewChallenge(false)}
              />
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {challenges.map(ch => (
                <div key={ch.id} style={{
                  background:'var(--surface)', border:'0.5px solid var(--border)',
                  borderRadius:'var(--r-lg)', padding:'14px 16px',
                  borderLeft:`3px solid ${ch.color}`,
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:30, height:30, borderRadius:'var(--r-md)', flexShrink:0,
                        background: ch.color + '18',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <Icon name={ch.icon} size={15} color={ch.color} />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)' }}>{ch.title}</div>
                        <div style={{ fontSize:11, color:'var(--fg-secondary)', marginTop:1 }}>{ch.desc}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <div style={{
                        fontSize:11, fontWeight:700, color: ch.color,
                        padding:'2px 8px', borderRadius:'var(--r-full)',
                        background: ch.color + '18',
                      }}>+{ch.reward} pts</div>
                      <button
                        onClick={() => removeChallenge(ch.id)}
                        style={{ color:'var(--fg-tertiary)', padding:2 }}
                        title="Eliminar reto"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'var(--fg-tertiary)' }}>
                          {typeof ch.total === 'number' && ch.total <= 100 && ch.prog > 10
                            ? `${ch.prog}%`
                            : `${ch.prog} / ${ch.total}`}
                        </span>
                        <span style={{ fontSize:10, color:'var(--fg-tertiary)' }}>⏱ {ch.days}d restantes</span>
                      </div>
                      <div style={{ height:6, borderRadius:3, background:'var(--bg-secondary)', overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:3,
                          width: `${Math.min((ch.prog / ch.total) * 100, 100)}%`,
                          background: ch.color,
                          transition:'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges catalog */}
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Insignias</div>
            <div style={{ fontSize:11, color:'var(--fg-secondary)', marginBottom:12 }}>Logros desbloqueables del equipo</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {BADGES_CATALOG.map(b => {
                const earnedBy = sellers.filter(s => gameOf(s.init).badges.includes(b.id))
                return (
                  <div key={b.id} style={{
                    background:'var(--surface)', border:'0.5px solid var(--border)',
                    borderRadius:'var(--r-md)', padding:'10px 12px',
                    display:'flex', gap:10, alignItems:'center',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:'var(--r-md)', flexShrink:0,
                      background: earnedBy.length > 0 ? b.color + '18' : 'var(--bg-secondary)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:18,
                      filter: earnedBy.length === 0 ? 'grayscale(1) opacity(0.4)' : 'none',
                    }}>{b.emoji}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color: earnedBy.length > 0 ? 'var(--fg)' : 'var(--fg-tertiary)' }}>{b.label}</div>
                      <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.desc}</div>
                      {/* Who has it */}
                      {earnedBy.length > 0 && (
                        <div style={{ display:'flex', gap:3, marginTop:5 }}>
                          {earnedBy.map(s => (
                            <div key={s.init} style={{
                              width:16, height:16, borderRadius:'50%',
                              background: sellerColor(sellers, s.init) + '30', color: sellerColor(sellers, s.init),
                              fontSize:7, fontWeight:700,
                              display:'flex', alignItems:'center', justifyContent:'center',
                            }}>{s.init}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── New Challenge Form ────────────────────────────────────────────────────────
function NewChallengeForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [desc,  setDesc]  = useState('')
  const [total, setTotal] = useState('5')
  const [reward,setReward]= useState('100')
  const [days,  setDays]  = useState('7')
  const [icon,  setIcon]  = useState('target')
  const [color, setColor] = useState('#185FA5')

  const ICON_OPTS = [
    { v:'target',       l:'Meta'    },
    { v:'flame',        l:'Fuego'   },
    { v:'map-pin',      l:'Visita'  },
    { v:'trophy',       l:'Trofeo'  },
    { v:'layout-kanban',l:'Pipeline'},
    { v:'users',        l:'Equipo'  },
  ]
  const COLOR_OPTS = ['#185FA5','#1D9E75','#EF9F27','#E24B4A','#7C5CBF','#378ADD']

  function handleSave() {
    if (!title.trim()) return
    onSave({ title, desc, total: parseInt(total)||5, reward: parseInt(reward)||100, days: parseInt(days)||7, icon, color })
  }

  return (
    <div style={{
      background:'var(--bg-secondary)', border:'1.5px solid var(--kiuvo-blue)',
      borderRadius:'var(--r-lg)', padding:16, marginBottom:12,
    }}>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)', marginBottom:12 }}>Nuevo reto</div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <input placeholder="Título del reto" value={title} onChange={e => setTitle(e.target.value)}
          style={{ padding:'7px 10px', fontSize:12, borderRadius:'var(--r-md)', border:'0.5px solid var(--border)', background:'var(--surface)', color:'var(--fg)' }} />
        <input placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)}
          style={{ padding:'7px 10px', fontSize:12, borderRadius:'var(--r-md)', border:'0.5px solid var(--border)', background:'var(--surface)', color:'var(--fg)' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginBottom:3 }}>Objetivo (total)</div>
            <input type="number" value={total} onChange={e => setTotal(e.target.value)}
              style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:'var(--r-sm)', border:'0.5px solid var(--border)', background:'var(--surface)', color:'var(--fg)' }} />
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginBottom:3 }}>Recompensa (pts)</div>
            <input type="number" value={reward} onChange={e => setReward(e.target.value)}
              style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:'var(--r-sm)', border:'0.5px solid var(--border)', background:'var(--surface)', color:'var(--fg)' }} />
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginBottom:3 }}>Días para completar</div>
            <input type="number" value={days} onChange={e => setDays(e.target.value)}
              style={{ width:'100%', padding:'6px 8px', fontSize:12, borderRadius:'var(--r-sm)', border:'0.5px solid var(--border)', background:'var(--surface)', color:'var(--fg)' }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginBottom:4 }}>Ícono</div>
            <div style={{ display:'flex', gap:5 }}>
              {ICON_OPTS.map(o => (
                <button key={o.v} onClick={() => setIcon(o.v)} title={o.l} style={{
                  width:28, height:28, borderRadius:'var(--r-sm)',
                  border: icon === o.v ? '1.5px solid var(--kiuvo-blue)' : '0.5px solid var(--border)',
                  background: icon === o.v ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon name={o.v} size={13} color={icon === o.v ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--fg-tertiary)', marginBottom:4 }}>Color</div>
            <div style={{ display:'flex', gap:5 }}>
              {COLOR_OPTS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width:20, height:20, borderRadius:'50%', background:c,
                  border: color === c ? `2px solid var(--fg)` : '2px solid transparent',
                  boxSizing:'border-box',
                }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button onClick={onCancel} style={{ padding:'6px 14px', fontSize:12, color:'var(--fg-secondary)', borderRadius:'var(--r-md)', border:'0.5px solid var(--border)', background:'var(--surface)' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'6px 14px', fontSize:12, fontWeight:600, background:'var(--kiuvo-blue)', color:'#fff', borderRadius:'var(--r-md)' }}>Crear reto</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main GoalsView ───────────────────────────────────────────────────────────
export default function GoalsView() {
  const { sellers } = useSellers()
  const [tab, setTab] = useState('metas')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      {/* Tab bar */}
      <div style={{
        display:'flex', alignItems:'center', gap:2,
        padding:'0 20px',
        borderBottom:'0.5px solid var(--border)',
        background:'var(--surface)', flexShrink:0,
      }}>
        {[
          { id:'metas',         icon:'target',    label:'Metas'        },
          { id:'gamificacion',  icon:'trophy',    label:'Gamificación' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'12px 16px',
              fontSize:13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--kiuvo-blue)' : '2px solid transparent',
              marginBottom:-1,
              transition:'color 0.12s',
            }}
          >
            <Icon name={t.icon} size={15} color={tab === t.id ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)'} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'metas'        && <MetasTab sellers={sellers} />}
      {tab === 'gamificacion' && <GameTab  sellers={sellers} />}
    </div>
  )
}
