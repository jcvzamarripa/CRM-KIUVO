import React, { useState, useMemo, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { useActivities } from '../../hooks/useActivities'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { saveFile } from '../../lib/saveFile'
import { STAGES } from '../../constants/stages'
import { Card, Button, Pill, Avatar, Segmented, Empty, ProgressBar } from '../ui'

// ─── Períodos disponibles (calculados dinámicamente) ─────────────────────────
function buildPeriods() {
  const today  = new Date()
  const toISO  = d => d.toISOString().slice(0, 10)
  const todayS = toISO(today)
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const q90    = new Date(today); q90.setDate(today.getDate() - 90)
  return [
    { id: 'today',  label: 'Hoy',             from: todayS,                    to: todayS },
    { id: 'week',   label: 'Semana',           from: toISO(monday),             to: todayS },
    { id: 'month',  label: 'Mes',              from: todayS.slice(0, 8) + '01', to: todayS },
    { id: 'q90',    label: 'Trimestre',        from: toISO(q90),                to: todayS },
  ]
}
const PERIODS = buildPeriods()

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = n  => '$' + Math.round(n).toLocaleString('es-MX')
const pctFmt = n  => `${n}%`
const parseAmount = str => {
  if (!str) return 0
  const clean = str.replace(/[$,\s]/g, '')
  if (clean.toLowerCase().endsWith('k')) return (parseFloat(clean) || 0) * 1000
  return parseFloat(clean) || 0
}

// ─── Hook: gráficas de tendencias desde Supabase ─────────────────────────────
const WEEK_DAYS  = ['L','M','X','J','V','S','D']
const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function useReportCharts() {
  const [weeklyChart,  setWeeklyChart]  = useState(WEEK_DAYS.map(d  => ({ d, v: 0 })))
  const [monthlyChart, setMonthlyChart] = useState([])
  const [stageData,    setStageData]    = useState(STAGES.map(s => ({ label: s.label, count: 0, color: s.color })))
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    async function load() {
      const today   = new Date()
      const year    = today.getFullYear()
      const dow     = today.getDay()
      const mon     = new Date(today)
      mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
      mon.setHours(0, 0, 0, 0)
      const weekFrom  = mon.toISOString().slice(0, 10)
      const yearFrom  = `${year}-01-01`
      const todayISO  = today.toISOString().slice(0, 10)

      // 1. Ventas esta semana → por día
      const { data: weekSales } = await supabase
        .from('sales').select('amount, closed_at')
        .gte('closed_at', weekFrom).lte('closed_at', todayISO + 'T23:59:59Z')

      const byDay = [0,0,0,0,0,0,0]
      ;(weekSales || []).forEach(s => {
        const d = new Date(s.closed_at).getDay()
        byDay[d === 0 ? 6 : d - 1] += Number(s.amount) || 0
      })
      setWeeklyChart(WEEK_DAYS.map((d, i) => ({ d, v: byDay[i] })))

      // 2. Ventas este año → por mes
      const { data: yearSales } = await supabase
        .from('sales').select('amount, closed_at')
        .gte('closed_at', yearFrom).lte('closed_at', todayISO + 'T23:59:59Z')

      const byMonth = Array(12).fill(0)
      ;(yearSales || []).forEach(s => {
        byMonth[new Date(s.closed_at).getMonth()] += Number(s.amount) || 0
      })
      const currentMonth = today.getMonth()
      setMonthlyChart(
        byMonth.slice(0, currentMonth + 1).map((v, i) => ({ d: MONTH_ABBR[i], v }))
      )

      // 3. Prospectos por etapa
      const { data: prox } = await supabase.from('prospects').select('stage_id')
      const map = {}
      STAGES.forEach(s => { map[s.id] = 0 })
      ;(prox || []).forEach(p => { if (map[p.stage_id] !== undefined) map[p.stage_id]++ })
      setStageData(STAGES.map(s => ({ label: s.label, count: map[s.id], color: s.color })))

      setLoading(false)
    }

    load()
  }, [])

  return { weeklyChart, monthlyChart, stageData, loading }
}

// ─── Cálculo de estadísticas por vendedor ────────────────────────────────────
function computeSellerStats(sellers, activities, from, to, allQuotes = [], allProspects = []) {
  const inPeriod = activities.filter(a => a.date >= from && a.date <= to)

  // Cotizaciones reales del período por vendedor (tabla quotes)
  const quotesInPeriod = allQuotes.filter(q => {
    const d = q.createdAt?.slice(0, 10) || ''
    return d >= from && d <= to
  })

  // Prospectos nuevos del período por vendedor (tabla prospects)
  const prospectsInPeriod = allProspects.filter(p => {
    const d = p.created_at?.slice(0, 10) || ''
    return d >= from && d <= to
  })

  return sellers.map(seller => {
    const acts = inPeriod.filter(a => a.sellerInit === seller.init)
    const visits    = acts.filter(a => a.kind === 'visit').length
    const calls     = acts.filter(a => a.kind === 'call').length
    const msgs      = acts.filter(a => a.kind === 'whatsapp' || a.kind === 'email').length

    // Cotizaciones: usar datos reales de quotes si visits está vacío
    const quoteActs    = acts.filter(a => a.kind === 'quote')
    const quotesFromDB = quotesInPeriod.filter(q => q.sellerInit === seller.init)
    const quotes    = quoteActs.length > 0 ? quoteActs.length : quotesFromDB.length
    const quotedAmt = quoteActs.length > 0
      ? quoteActs.reduce((s, a) => s + parseAmount(a.amount), 0)
      : quotesFromDB.reduce((s, q) => s + (q.total || 0), 0)

    const winActs      = acts.filter(a => a.kind === 'win')
    const approvedDB   = quotesInPeriod.filter(q => q.sellerInit === seller.init && q.status === 'approved')
    const wins         = winActs.length > 0 ? winActs.length : approvedDB.length
    const wonAmt       = winActs.length > 0
      ? winActs.reduce((s, a) => s + parseAmount(a.amount), 0)
      : approvedDB.reduce((s, q) => s + (q.total || 0), 0)
    const stageAdv  = acts.filter(a => a.kind === 'stage').length

    // Nuevos prospectos: usar datos reales de prospects si visits está vacío
    const newFromActs = acts.filter(a => a.kind === 'new').length
    const newFromDB   = prospectsInPeriod.filter(p => p.owner_id === seller.id).length
    const newProsp    = newFromActs > 0 ? newFromActs : newFromDB

    const total = acts.length + (quoteActs.length === 0 ? quotesFromDB.length : 0) + (newFromActs === 0 ? newFromDB : 0)

    return { ...seller, visits, calls, msgs, quotes, quotedAmt, wins, wonAmt, stageAdv, newProsp, total, acts }
  })
}

// ─── Exports ─────────────────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  saveFile(blob, filename)
}

function exportSellerCSV(stats, periodLabel) {
  const esc = s => `"${String(s).replace(/"/g, '""')}"`
  const headers = ['Vendedor', 'Visitas', 'Llamadas', 'WA/Email', 'Cotizaciones', 'Monto cotizado', 'Cierres', 'Monto cerrado', 'Avances etapa', 'Nuevos prosp.', 'Total acciones']
  const rows = stats.map(s => [
    s.name, s.visits, s.calls, s.msgs, s.quotes,
    s.quotedAmt, s.wins, s.wonAmt, s.stageAdv, s.newProsp, s.total,
  ])
  const totals = ['TOTALES',
    stats.reduce((a, s) => a + s.visits, 0),
    stats.reduce((a, s) => a + s.calls, 0),
    stats.reduce((a, s) => a + s.msgs, 0),
    stats.reduce((a, s) => a + s.quotes, 0),
    stats.reduce((a, s) => a + s.quotedAmt, 0),
    stats.reduce((a, s) => a + s.wins, 0),
    stats.reduce((a, s) => a + s.wonAmt, 0),
    stats.reduce((a, s) => a + s.stageAdv, 0),
    stats.reduce((a, s) => a + s.newProsp, 0),
    stats.reduce((a, s) => a + s.total, 0),
  ]
  const lines = [
    `"Reporte por vendedor · ${periodLabel}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    totals.join(','),
  ]
  triggerDownload(
    new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
    `reporte_vendedores_${new Date().toISOString().slice(0, 10)}.csv`
  )
}

function exportSellerXLS(stats, periodLabel) {
  const thStyle = 'background:#185FA5;color:#fff;padding:6px 10px;font-weight:bold;border:1px solid #ccc;'
  const tdStyle = 'padding:5px 10px;border:1px solid #ddd;'
  const tdR     = tdStyle + 'text-align:right;'
  const headers = ['Vendedor', 'Visitas', 'Llamadas', 'WA/Email', 'Cotizaciones', 'Monto cotizado', 'Cierres', 'Monto cerrado', 'Avances etapa', 'Nuevos prosp.', 'Total acciones']

  const dataRows = stats.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f8ff'}">
      <td style="${tdStyle}">${s.name}</td>
      <td style="${tdR}">${s.visits}</td>
      <td style="${tdR}">${s.calls}</td>
      <td style="${tdR}">${s.msgs}</td>
      <td style="${tdR}">${s.quotes}</td>
      <td style="${tdR}">${s.quotedAmt > 0 ? fmt(s.quotedAmt) : '—'}</td>
      <td style="${tdR}">${s.wins}</td>
      <td style="${tdR}">${s.wonAmt > 0 ? fmt(s.wonAmt) : '—'}</td>
      <td style="${tdR}">${s.stageAdv}</td>
      <td style="${tdR}">${s.newProsp}</td>
      <td style="${tdR}">${s.total}</td>
    </tr>`).join('')

  const totalRow = `
    <tr style="background:#e8f0fe;font-weight:bold">
      <td style="${tdStyle}">TOTALES</td>
      ${[
        stats.reduce((a,s)=>a+s.visits,0),
        stats.reduce((a,s)=>a+s.calls,0),
        stats.reduce((a,s)=>a+s.msgs,0),
        stats.reduce((a,s)=>a+s.quotes,0),
        fmt(stats.reduce((a,s)=>a+s.quotedAmt,0)),
        stats.reduce((a,s)=>a+s.wins,0),
        fmt(stats.reduce((a,s)=>a+s.wonAmt,0)),
        stats.reduce((a,s)=>a+s.stageAdv,0),
        stats.reduce((a,s)=>a+s.newProsp,0),
        stats.reduce((a,s)=>a+s.total,0),
      ].map(v => `<td style="${tdR}">${v}</td>`).join('')}
    </tr>`

  const html = `<html><head><meta charset="utf-8">
    <style>body{font-family:Arial,sans-serif;font-size:12px} h2{color:#185FA5}</style>
    </head><body>
    <h2>Reporte por vendedor · KIUVO CRM</h2>
    <p style="color:#666">${periodLabel} · Generado ${new Date().toLocaleDateString('es-MX')}</p>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">
      <thead><tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>
      <tbody>${dataRows}${totalRow}</tbody>
    </table>
    </body></html>`

  triggerDownload(
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    `reporte_vendedores_${new Date().toISOString().slice(0, 10)}.xls`
  )
}

/// ─── BarChart mini ────────────────────────────────────────────────────────────
function BarChart({ data, maxVal, color = 'var(--primary-bg)', height = 140 }) {
  const max = maxVal || Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, paddingBottom: 22, position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} title={fmt(d.v)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ width: '100%', minHeight: 4, height: `${(d.v / max) * (height - 22)}px`, background: d.v === 0 ? 'var(--bg-tertiary)' : color, borderRadius: 6 }} />
          <div className="k-dim" style={{ position: 'absolute', bottom: 0, fontSize: 12 }}>{d.d}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Seller row (expandible) ──────────────────────────────────────────────────
const KIND_ICON = {
  visit:    'map-pin',
  call:     'phone',
  whatsapp: 'brand-whatsapp',
  email:    'mail',
  quote:    'file-text',
  stage:    'arrows-sort',
  win:      'trophy',
  new:      'user-plus',
}

function Count({ n, strong }) {
  return (
    <span className={strong ? 'k-num' : undefined} style={{ fontSize: strong ? 18 : 14, fontVariantNumeric: 'tabular-nums', color: n > 0 ? 'var(--fg)' : 'var(--fg-tertiary)' }}>
      {n}
    </span>
  )
}

function SellerRow({ s, expanded, onToggle }) {
  const compTone = s.compliance >= 85 ? 'success' : s.compliance >= 75 ? 'warning' : 'coral'

  return (
    <>
      <tr onClick={onToggle} aria-expanded={expanded}>
        {/* Vendedor */}
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar initials={s.init} color={s.color} size="sm" />
            <div>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.name}</div>
              <div className="k-dim" style={{ fontSize: 12, marginTop: 1 }}>{s.total} acciones en el período</div>
            </div>
          </div>
        </td>
        <td style={{ textAlign: 'center' }}><Count n={s.visits} strong /></td>
        <td style={{ textAlign: 'center' }}><Count n={s.calls} /></td>
        <td style={{ textAlign: 'center' }}><Count n={s.msgs} /></td>
        {/* Cotizaciones */}
        <td style={{ textAlign: 'right' }}>
          <Count n={s.quotes} />
          {s.quotedAmt > 0 && <div className="k-muted" style={{ fontSize: 12, marginTop: 1 }}>{fmt(s.quotedAmt)}</div>}
        </td>
        {/* Cierres */}
        <td style={{ textAlign: 'right' }}>
          <Count n={s.wins} strong />
          {s.wonAmt > 0 && <div style={{ fontSize: 12, color: 'var(--success-fg)', fontWeight: 600, marginTop: 1 }}>{fmt(s.wonAmt)}</div>}
        </td>
        <td style={{ textAlign: 'center' }}><Count n={s.stageAdv} /></td>
        <td style={{ textAlign: 'center' }}><Count n={s.newProsp} /></td>
        {/* Cumplimiento */}
        <td style={{ textAlign: 'right' }}>
          <Pill tone={compTone}>{pctFmt(s.compliance)}</Pill>
        </td>
        {/* Expand icon */}
        <td style={{ textAlign: 'center', width: 40 }}>
          <Icon name="chevron-down" size={18} color="var(--fg-tertiary)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </td>
      </tr>

      {/* ── Expanded detail ── */}
      {expanded && (
        <tr>
          <td colSpan={10} style={{ background: 'var(--bg-secondary)', padding: '14px 16px 16px' }}>
            <div className="k-label" style={{ marginBottom: 8 }}>
              Detalle de actividades · {s.total} {s.total === 1 ? 'registro' : 'registros'}
            </div>
            {s.acts.length === 0 ? (
              <div className="k-muted" style={{ fontSize: 14 }}>Sin actividad en este período</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {s.acts.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
                    <span className="k-avatar k-avatar--sm" style={{ background: 'var(--bg-secondary)', color: 'var(--fg)' }}>
                      <Icon name={KIND_ICON[a.kind] || KIND_ICON.visit} size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                        <b style={{ fontWeight: 600 }}>{a.prospect}</b>
                        {a.detail && <span className="k-muted"> · {a.detail}</span>}
                        {a.amount && <span style={{ color: 'var(--success-fg)', fontWeight: 600 }}> · {a.amount}</span>}
                      </div>
                      <div className="k-dim" style={{ fontSize: 12, marginTop: 2 }}>{a.date} {a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Tab: Por Vendedor ────────────────────────────────────────────────────────
function SellerReportTab({ stats, period, onExportCSV, onExportXLS, csvLabel, xlsLabel }) {
  const [expanded, setExpanded] = useState(null)
  const toggle = id => setExpanded(e => e === id ? null : id)

  const totals = {
    visits:     stats.reduce((a, s) => a + s.visits, 0),
    calls:      stats.reduce((a, s) => a + s.calls, 0),
    msgs:       stats.reduce((a, s) => a + s.msgs, 0),
    quotes:     stats.reduce((a, s) => a + s.quotes, 0),
    quotedAmt:  stats.reduce((a, s) => a + s.quotedAmt, 0),
    wins:       stats.reduce((a, s) => a + s.wins, 0),
    wonAmt:     stats.reduce((a, s) => a + s.wonAmt, 0),
    stageAdv:   stats.reduce((a, s) => a + s.stageAdv, 0),
    newProsp:   stats.reduce((a, s) => a + s.newProsp, 0),
    total:      stats.reduce((a, s) => a + s.total, 0),
  }

  const COL_HEADERS = [
    { label: 'Vendedor',       align: 'left'   },
    { label: 'Visitas',        align: 'center' },
    { label: 'Llamadas',       align: 'center' },
    { label: 'WA / Email',     align: 'center' },
    { label: 'Cotizaciones',   align: 'right'  },
    { label: 'Cierres',        align: 'right'  },
    { label: 'Avances etapa',  align: 'center' },
    { label: 'Nuevos prosp.',  align: 'center' },
    { label: 'Cumplimiento',   align: 'right'  },
    { label: '',               align: 'center' },
  ]
  const footCell = { borderTop: '1px solid var(--border-strong)', background: 'var(--bg-secondary)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Export actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="soft" size="sm" icon="download" onClick={onExportCSV}>{csvLabel}</Button>
        <Button variant="accent" size="sm" icon="download" onClick={onExportXLS}>{xlsLabel}</Button>
      </div>

      {/* Table */}
      <Card flush>
        {stats.length === 0 ? (
          <Empty icon="users">Aún no hay vendedores</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="k-table k-table--click" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  {COL_HEADERS.map((h, i) => <th key={i} style={{ textAlign: h.align }}>{h.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <SellerRow key={s.init} s={s} expanded={expanded === s.init} onToggle={() => toggle(s.init)} />
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr>
                  <td style={{ ...footCell, fontWeight: 700 }}>Totales del equipo</td>
                  <td style={{ ...footCell, textAlign: 'center' }}><Count n={totals.visits} strong /></td>
                  <td style={{ ...footCell, textAlign: 'center', fontWeight: 600 }}>{totals.calls}</td>
                  <td style={{ ...footCell, textAlign: 'center', fontWeight: 600 }}>{totals.msgs}</td>
                  <td style={{ ...footCell, textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{totals.quotes}</div>
                    {totals.quotedAmt > 0 && <div className="k-muted" style={{ fontSize: 12 }}>{fmt(totals.quotedAmt)}</div>}
                  </td>
                  <td style={{ ...footCell, textAlign: 'right' }}>
                    <Count n={totals.wins} strong />
                    {totals.wonAmt > 0 && <div style={{ fontSize: 12, color: 'var(--success-fg)', fontWeight: 600 }}>{fmt(totals.wonAmt)}</div>}
                  </td>
                  <td style={{ ...footCell, textAlign: 'center', fontWeight: 600 }}>{totals.stageAdv}</td>
                  <td style={{ ...footCell, textAlign: 'center', fontWeight: 600 }}>{totals.newProsp}</td>
                  <td style={footCell} />
                  <td style={footCell} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Hint */}
      <div className="k-dim" style={{ fontSize: 13, textAlign: 'center' }}>
        Haz clic en una fila para ver el detalle de actividades del vendedor
      </div>
    </div>
  )
}

const TWO_COL = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }

function ChartCard({ title, sub, children }) {
  return (
    <Card style={{ padding: 20 }}>
      <div className="k-h3">{title}</div>
      <div className="k-muted" style={{ fontSize: 13, marginTop: 2, marginBottom: 18 }}>{sub}</div>
      {children}
    </Card>
  )
}

// ─── Tab: Ventas ──────────────────────────────────────────────────────────────
function VentasTab({ weeklyChart = [], monthlyChart = [] }) {
  const year = new Date().getFullYear()
  return (
    <div style={TWO_COL}>
      <ChartCard title="Ventas por día" sub="Semana actual · Cierres ganados">
        <BarChart data={weeklyChart} height={170} />
      </ChartCard>
      <ChartCard title="Ventas por mes" sub={`${year} · acumulado`}>
        <BarChart data={monthlyChart} color="var(--accent-2)" height={170} />
      </ChartCard>
    </div>
  )
}

// ─── Tab: Embudo ──────────────────────────────────────────────────────────────
function EmbudoTab({ stageData = [] }) {
  const maxCount = Math.max(...stageData.map(s => s.count), 1)
  const hasData  = stageData.some(s => s.count > 0)
  return (
    <div style={TWO_COL}>
      <ChartCard title="Distribución del pipeline" sub="Prospectos por etapa">
        {!hasData ? (
          <Empty icon="users">Sin prospectos aún</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {stageData.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 14, marginBottom: 6 }}>
                  <span>{s.label}</span>
                  <span className="k-num" style={{ fontSize: 16 }}>{s.count}</span>
                </div>
                <ProgressBar value={s.count} max={maxCount} color={s.color} />
              </div>
            ))}
          </div>
        )}
      </ChartCard>
      <ChartCard title="Tasas de conversión" sub="Entre etapas consecutivas">
        {!hasData ? (
          <Empty icon="trending-up">Sin datos suficientes</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {stageData.slice(0, -1).map((s, i) => {
              const next = stageData[i + 1]
              const rate = s.count > 0 ? Math.round((next.count / s.count) * 100) : 0
              return (
                <div key={s.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6 }}>
                    <span className="k-muted">{s.label}</span>
                    <Icon name="arrow-right" size={14} color="var(--fg-tertiary)" />
                    <span className="k-muted" style={{ flex: 1 }}>{next.label}</span>
                    <span className="k-num" style={{ fontSize: 16 }}>{rate}%</span>
                  </div>
                  <ProgressBar value={rate} max={100} color={next.color} />
                </div>
              )
            })}
          </div>
        )}
      </ChartCard>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ReportsView() {
  const { sellers }                              = useSellers()
  const { activities }                           = useActivities({ limit: 500 })
  const { quotes: allQuotes }                    = useQuoteHistory({ sellerId: null, limit: 1000 })
  const { prospects: allProspects }              = useAdminProspects()
  const { weeklyChart, monthlyChart, stageData } = useReportCharts()
  const [tab,      setTab]      = useState('sellers')
  const [periodId, setPeriodId] = useState('week')
  const [csvFlash, setCsvFlash] = useState(false)
  const [xlsFlash, setXlsFlash] = useState(false)

  const period = PERIODS.find(p => p.id === periodId) || PERIODS[0]

  const stats = useMemo(
    () => computeSellerStats(sellers, activities, period.from, period.to, allQuotes, allProspects),
    [sellers, activities, period.from, period.to, allQuotes, allProspects]
  )

  const totalWon      = sellers.reduce((s, r) => s + (r.won || 0), 0)
  const totalGoal     = sellers.reduce((s, r) => s + (r.goal || 100000), 0)
  const avgCompliance = sellers.length ? Math.round(sellers.reduce((s, r) => s + (r.compliance || 0), 0) / sellers.length) : 0
  const totalProspects= sellers.reduce((s, r) => s + (r.prospects || 0), 0)

  function handleCSV() {
    exportSellerCSV(stats, period.label)
    setCsvFlash(true); setTimeout(() => setCsvFlash(false), 2200)
  }
  function handleXLS() {
    exportSellerXLS(stats, period.label)
    setXlsFlash(true); setTimeout(() => setXlsFlash(false), 2200)
  }

  const TABS = [
    { id: 'sellers', label: 'Por vendedor', icon: 'users' },
    { id: 'ventas',  label: 'Ventas',       icon: 'chart-bar' },
    { id: 'embudo',  label: 'Embudo',       icon: 'trending-up' },
  ]

  const KPIS = [
    { label: 'Total ganado',          value: fmt(totalWon),         sub: 'acumulado histórico', tone: 'ink' },
    { label: 'Meta total del equipo', value: fmt(totalGoal),        sub: 'objetivo mensual' },
    { label: 'Cumplimiento promedio', value: pctFmt(avgCompliance), sub: 'seguimiento visitas', tone: 'accent' },
    { label: 'Prospectos activos',    value: totalProspects,        sub: 'en pipeline total' },
  ]

  return (
    <div className="sv-scroll" style={{ minWidth: 0 }}>

      {/* ── Header: tabs + período ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
        <Segmented size="lg" surface options={TABS} value={tab} onChange={setTab} />
        <Segmented options={PERIODS.map(p => ({ id: p.id, label: p.label }))} value={periodId} onChange={setPeriodId} />
      </div>

      {/* ── KPIs de resumen ── */}
      <div className="sv-tiles">
        {KPIS.map(c => (
          <Card key={c.label} tone={c.tone} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>{c.label}</div>
            <div className="k-num" style={{ fontSize: 30, marginTop: 10 }}>{c.value}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Contenido del tab ── */}
      {tab === 'sellers' && (
        <SellerReportTab
          stats={stats}
          period={period}
          onExportCSV={handleCSV}
          onExportXLS={handleXLS}
          csvLabel={csvFlash ? 'Descargado' : 'Exportar CSV'}
          xlsLabel={xlsFlash ? 'Descargado' : 'Exportar Excel (.xls)'}
        />
      )}
      {tab === 'ventas' && <VentasTab weeklyChart={weeklyChart} monthlyChart={monthlyChart} />}
      {tab === 'embudo' && <EmbudoTab stageData={stageData} />}
    </div>
  )
}
