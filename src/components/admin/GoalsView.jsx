import React, { useState, useRef, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Card, Button, Pill, Avatar, Segmented, Empty, ProgressBar } from '../ui'

const PERIODS = ['Día', 'Semana', 'Mes', 'Trimestre', 'Año']

// ─── Period helpers ───────────────────────────────────────────────────────────
function getPeriodDates(period) {
  const today    = new Date()
  const toISO    = d => d.toISOString().slice(0, 10)
  const todayISO = toISO(today)
  if (period === 'Día') return { from: todayISO, to: todayISO }
  if (period === 'Semana') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    mon.setHours(0, 0, 0, 0)
    return { from: toISO(mon), to: todayISO }
  }
  if (period === 'Trimestre') {
    const m = today.getMonth()
    return { from: toISO(new Date(today.getFullYear(), m - (m % 3), 1)), to: todayISO }
  }
  if (period === 'Año') {
    return { from: `${today.getFullYear()}-01-01`, to: todayISO }
  }
  // Mes (default)
  return { from: todayISO.slice(0, 8) + '01', to: todayISO }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = n => '$' + n.toLocaleString('es-MX')
const pct  = (a, b) => Math.round((a / b) * 100)
const sellerName = (sellers, init) => sellers.find(s => s.init === init)?.name || init

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
      <input
        ref={inputRef}
        className="k-input k-input--sm"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        onBlur={commit}
        style={{ width: 120, minHeight: 36, padding: '4px 12px', fontWeight: 600 }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      title="Clic para editar"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minHeight: 36, padding: '0 12px', marginLeft: -12, borderRadius: 'var(--r-full)',
        background: 'var(--bg-secondary)',
      }}
    >
      <span className="k-num" style={{ fontSize: 16 }}>{display}</span>
      <Icon name="pencil" size={14} color="var(--fg-tertiary)" />
    </button>
  )
}

// ─── Meta + avance de una métrica ─────────────────────────────────────────────
function GoalCell({ goal, actual, actualLabel, format, onSave }) {
  const p = goal > 0 ? pct(actual, goal) : 0
  const color = p >= 100 ? 'var(--success)' : p >= 70 ? 'var(--primary-bg)' : 'var(--warning)'
  return (
    <div style={{ minWidth: 170 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingLeft: 12 }}>
        <EditableCell value={goal} format={format} onSave={onSave} />
        <span className="k-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{actualLabel}</span>
      </div>
      <ProgressBar value={actual} max={goal} color={color} height={6} />
    </div>
  )
}

// ─── Metas ────────────────────────────────────────────────────────────────────
function MetasTab({ sellers = [] }) {
  const [period,        setPeriod]        = useState('Mes')
  const [metas,         setMetas]         = useState({})   // { [init]: { ventas, prospectos, visitas } }
  const [actuals,       setActuals]       = useState({})   // { [sellerId]: { ventas, prospectos, visitas } }
  const [loadingGoals,  setLoadingGoals]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [dirty,         setDirty]         = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [saveError,     setSaveError]     = useState('')
  const [teamGoalCustom,setTeamGoalCustom]= useState(null)
  const [editingTeam,   setEditingTeam]   = useState(false)
  const [teamDraft,     setTeamDraft]     = useState('')
  const teamInputRef = useRef(null)

  useEffect(() => { if (editingTeam) teamInputRef.current?.focus() }, [editingTeam])

  // ── Load goals from DB when period or sellers change ──
  const loadGoals = useCallback(async () => {
    if (!isSupabaseConfigured || !sellers.length) return
    setLoadingGoals(true)

    const next = {}
    sellers.forEach(s => {
      next[s.init] = period === 'Día'
        ? { ventas: Math.round((s.goal || 100000) / 22), prospectos: 5, visitas: 15 }
        : { ventas: s.goal || 100000, prospectos: 20, visitas: 25 }
    })
    const { data } = await supabase
      .from('seller_goals')
      .select('seller_id, goal_ventas, goal_prospectos, goal_visitas')
      .in('seller_id', sellers.map(s => s.id))
      .eq('period', period)
    ;(data || []).forEach(g => {
      const sel = sellers.find(s => s.id === g.seller_id)
      if (!sel) return
      next[sel.init] = {
        // En "Mes" la meta de ventas vive en profiles.goal_amount (igual que TeamView)
        ventas:     period === 'Mes' ? next[sel.init].ventas : g.goal_ventas,
        prospectos: g.goal_prospectos,
        visitas:    g.goal_visitas,
      }
    })

    setMetas(next)
    setDirty(false)
    setLoadingGoals(false)
  }, [sellers, period])

  useEffect(() => { loadGoals() }, [loadGoals])

  // ── Load actuals for the selected period ──
  const loadActuals = useCallback(async () => {
    if (!isSupabaseConfigured || !sellers.length) return
    const { from, to } = getPeriodDates(period)
    const toEnd = to + 'T23:59:59Z'
    const sellerIds = sellers.map(s => s.id)

    const [{ data: salesData }, { data: prospectsData }, { data: visitsData }] = await Promise.all([
      supabase.from('quotes').select('seller_id, total')
        .eq('status', 'approved')
        .in('seller_id', sellerIds).gte('approved_at', from).lte('approved_at', toEnd),
      supabase.from('prospects').select('owner_id')
        .in('owner_id', sellerIds).gte('created_at', from).lte('created_at', toEnd),
      supabase.from('visits').select('seller_id').eq('kind', 'visit')
        .in('seller_id', sellerIds).gte('created_at', from).lte('created_at', toEnd),
    ])

    const ventasMap = {}; const prospectsMap = {}; const visitasMap = {}
    ;(salesData    || []).forEach(r => { ventasMap[r.seller_id]    = (ventasMap[r.seller_id]    || 0) + Number(r.total || 0) })
    ;(prospectsData|| []).forEach(r => { prospectsMap[r.owner_id]  = (prospectsMap[r.owner_id]  || 0) + 1 })
    ;(visitsData   || []).forEach(r => { visitasMap[r.seller_id]   = (visitasMap[r.seller_id]   || 0) + 1 })

    const next = {}
    sellers.forEach(s => {
      next[s.id] = {
        ventas:     ventasMap[s.id]    || 0,
        prospectos: prospectsMap[s.id] || 0,
        visitas:    visitasMap[s.id]   || 0,
      }
    })
    setActuals(next)
  }, [sellers, period])

  useEffect(() => { loadActuals() }, [loadActuals])

  function getActual(sellerId) {
    return actuals[sellerId] || { ventas: 0, prospectos: 0, visitas: 0 }
  }

  function updateMeta(init, field, val) {
    setMetas(m => ({ ...m, [init]: { ...m[init], [field]: val } }))
    setDirty(true)
    setSaved(false)
    setSaveError('')
  }

  async function handleSave() {
    if (!isSupabaseConfigured || !sellers.length) return
    setSaving(true)
    setSaveError('')
    const rows = sellers.map(s => ({
      seller_id:       s.id,
      period,
      goal_ventas:     metas[s.init]?.ventas     ?? 80000,
      goal_prospectos: metas[s.init]?.prospectos ?? 20,
      goal_visitas:    metas[s.init]?.visitas    ?? 25,
      updated_at:      new Date().toISOString(),
    }))
    // Siempre actualizar profiles.goal_amount para período Mes
    // (es la fuente de verdad que comparte TeamView)
    if (period === 'Mes') {
      const profileErrors = (
        await Promise.all(sellers.map(s =>
          supabase.from('profiles')
            .update({ goal_amount: metas[s.init]?.ventas ?? s.goal })
            .eq('id', s.id)
        ))
      ).filter(r => r.error)
      if (profileErrors.length) {
        setSaving(false)
        setSaveError('Error al guardar: ' + profileErrors[0].error.message)
        return
      }
    }

    // También intentar persistir en seller_goals (puede fallar si la tabla no existe aún)
    supabase.from('seller_goals')
      .upsert(rows, { onConflict: 'seller_id,period' })
      .then(() => {})

    setSaving(false)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function openTeamEdit() {
    setTeamDraft(String(teamGoalCustom ?? sumIndividual))
    setEditingTeam(true)
  }

  function commitTeamGoal() {
    const n = parseInt(teamDraft.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > 0) {
      setTeamGoalCustom(n === sumIndividual ? null : n)
      setDirty(true)
    }
    setEditingTeam(false)
  }

  const getMeta = init => metas[init] || { ventas: 80000, prospectos: 20, visitas: 25 }

  const sorted = [...sellers].sort((a, b) => {
    const pa = pct(getActual(a.id).ventas, getMeta(a.init).ventas)
    const pb = pct(getActual(b.id).ventas, getMeta(b.init).ventas)
    return pb - pa
  })

  const sumIndividual = sellers.reduce((s, sl) => s + getMeta(sl.init).ventas, 0)
  const teamGoal      = teamGoalCustom ?? sumIndividual
  const teamActual    = sellers.reduce((s, sl) => s + getActual(sl.id).ventas, 0)
  const avgCompl      = sorted.length ? Math.round(sorted.reduce((s, sl) => {
    return s + pct(getActual(sl.id).ventas, getMeta(sl.init).ventas)
  }, 0) / sorted.length) : 0
  const topSeller     = sorted[0]

  const kpis = [
    { label: 'Alcanzado hasta hoy',   value: fmt(teamActual), sub: `${teamGoal > 0 ? pct(teamActual, teamGoal) : 0}% del objetivo` },
    { label: 'Cumplimiento promedio', value: `${avgCompl}%`,  sub: `del equipo · ${period.toLowerCase()}`, tone: 'accent' },
    { label: 'Mejor vendedor',        value: topSeller ? sellerName(sellers, topSeller.init).split(' ')[0] : '—', sub: topSeller ? `${pct(getActual(topSeller.id).ventas, getMeta(topSeller.init).ventas)}% de cumplimiento` : '', tone: 'lilac' },
  ]

  return (
    <div className="sv-scroll" style={{ minWidth: 0 }}>
      {/* Periodo + guardado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Segmented size="lg" surface value={period} onChange={setPeriod} options={PERIODS.map(p => ({ id: p, label: p }))} />
        <div style={{ flex: 1 }} />
        {saveError && <Pill tone="coral" icon="alert-circle">{saveError}</Pill>}
        {saved && <Pill tone="success" icon="check">Cambios guardados</Pill>}
        {loadingGoals && <span className="k-dim" style={{ fontSize: 13 }}>Cargando metas…</span>}
        {dirty && !saving && <Pill tone="warning">Hay cambios sin guardar</Pill>}
        {(dirty || saving) && (
          <Button variant="accent" icon="check" loading={saving} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="sv-tiles">
        {/* Meta total equipo (editable) */}
        <Card tone="ink" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Meta total equipo</span>
            {teamGoalCustom && <Pill tone="on-ink">personalizada</Pill>}
          </div>

          {editingTeam ? (
            <input
              ref={teamInputRef}
              className="k-input k-input--sm"
              inputMode="numeric"
              value={teamDraft}
              onChange={e => setTeamDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitTeamGoal(); if (e.key === 'Escape') setEditingTeam(false) }}
              onBlur={commitTeamGoal}
              style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}
            />
          ) : (
            <button
              type="button"
              onClick={openTeamEdit}
              title="Clic para editar la meta global"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10 }}
            >
              <span className="k-num" style={{ fontSize: 30 }}>{fmt(teamGoal)}</span>
              <Icon name="pencil" size={16} color="var(--on-ink-muted)" />
            </button>
          )}

          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
            {period} actual
            {teamGoalCustom && sumIndividual !== teamGoalCustom && <> · suma individual: {fmt(sumIndividual)}</>}
          </div>

          {teamGoalCustom && !editingTeam && (
            <button
              type="button"
              onClick={() => { setTeamGoalCustom(null); setDirty(true) }}
              style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}
            >
              Restablecer
            </button>
          )}
        </Card>

        {kpis.map(c => (
          <Card key={c.label} tone={c.tone} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>{c.label}</div>
            <div className="k-num" style={{ fontSize: 30, marginTop: 10 }}>{c.value}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Metas por vendedor */}
      <Card flush>
        {sorted.length === 0 ? (
          <Empty icon="target">Aún no hay vendedores para asignar metas</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="k-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Ventas ($)</th>
                  <th>Prospectos</th>
                  <th>Visitas</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(sl => {
                  const g = getMeta(sl.init)
                  const a = getActual(sl.id)
                  const ventasPct = pct(a.ventas, g.ventas)
                  return (
                    <tr key={sl.init}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar initials={sl.init} color={sl.color} />
                          <div>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{sl.name}</div>
                            <div style={{ marginTop: 4 }}>
                              <Pill tone={ventasPct >= 100 ? 'success' : ventasPct >= 70 ? 'warning' : 'coral'}>
                                {ventasPct}% cumplimiento
                              </Pill>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <GoalCell goal={g.ventas} actual={a.ventas} actualLabel={fmt(a.ventas)} format="money"
                          onSave={v => updateMeta(sl.init, 'ventas', v)} />
                      </td>
                      <td>
                        <GoalCell goal={g.prospectos} actual={a.prospectos} actualLabel={`${a.prospectos} reales`}
                          onSave={v => updateMeta(sl.init, 'prospectos', v)} />
                      </td>
                      <td>
                        <GoalCell goal={g.visitas} actual={a.visitas} actualLabel={`${a.visitas} reales`}
                          onSave={v => updateMeta(sl.init, 'visitas', v)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="k-dim" style={{ marginTop: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="pencil" size={14} />
        Haz clic en cualquier valor de meta para editarlo. La meta de "Día" es la que ven los vendedores en su pantalla de inicio.
      </div>
    </div>
  )
}

// ─── Main GoalsView ───────────────────────────────────────────────────────────
export default function GoalsView() {
  const { sellers } = useSellers()
  return <MetasTab sellers={sellers} />
}
