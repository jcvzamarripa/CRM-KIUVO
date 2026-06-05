import React, { useState, useMemo, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { useActivities } from '../../hooks/useActivities'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { STAGES } from '../../constants/stages'

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
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
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

// ─── BarChart mini ────────────────────────────────────────────────────────────
function BarChart({ data, maxVal, color = 'var(--kiuvo-blue)', height = 140 }) {
  const max = maxVal || Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingBottom: 20, position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ width: '100%', minHeight: 3, height: `${(d.v / max) * (height - 20)}px`, background: d.v === 0 ? 'var(--border)' : color, borderRadius: '3px 3px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 0, fontSize: 10, color: 'var(--fg-tertiary)' }}>{d.d}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Seller row (expandible) ──────────────────────────────────────────────────
const KIND_ICON = {
  visit:    { icon: 'map-pin',        color: 'var(--kiuvo-blue)' },
  call:     { icon: 'phone',          color: '#D85A30' },
  whatsapp: { icon: 'brand-whatsapp', color: '#25D366' },
  email:    { icon: 'mail',           color: 'var(--info)' },
  quote:    { icon: 'file-text',      color: 'var(--warning)' },
  stage:    { icon: 'arrows-sort',    color: '#7C3AED' },
  win:      { icon: 'trophy',         color: 'var(--success)' },
  new:      { icon: 'user-plus',      color: '#EF9F27' },
}

function SellerRow({ s, expanded, onToggle, isLast }) {
  const pct = s.total > 0 ? Math.round((s.visits / Math.max(s.total, 1)) * 100) : 0
  const compColor = s.compliance >= 85 ? 'var(--success)' : s.compliance >= 75 ? 'var(--warning)' : 'var(--danger)'
  const tdBase = { padding: '11px 10px', borderBottom: isLast && !expanded ? 'none' : '0.5px solid var(--border)', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' }

  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer', background: expanded ? '#185FA508' : 'transparent', transition: 'background 0.12s' }}>
        {/* Vendedor */}
        <td style={{ ...tdBase, padding: '11px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{s.init}</div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--fg)', fontSize: 13 }}>{s.name}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1 }}>{s.total} acciones en el período</div>
            </div>
          </div>
        </td>
        {/* Visitas */}
        <td style={{ ...tdBase, textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: s.visits > 0 ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)' }}>{s.visits}</span>
        </td>
        {/* Llamadas */}
        <td style={{ ...tdBase, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: s.calls > 0 ? '#D85A30' : 'var(--fg-tertiary)' }}>{s.calls}</span>
        </td>
        {/* WA/Email */}
        <td style={{ ...tdBase, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: s.msgs > 0 ? '#25D366' : 'var(--fg-tertiary)' }}>{s.msgs}</span>
        </td>
        {/* Cotizaciones */}
        <td style={{ ...tdBase, textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: s.quotes > 0 ? 500 : 400, color: s.quotes > 0 ? 'var(--fg)' : 'var(--fg-tertiary)' }}>{s.quotes}</div>
          {s.quotedAmt > 0 && <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 1 }}>{fmt(s.quotedAmt)}</div>}
        </td>
        {/* Cierres */}
        <td style={{ ...tdBase, textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: s.wins > 0 ? 600 : 400, color: s.wins > 0 ? 'var(--success)' : 'var(--fg-tertiary)' }}>{s.wins}</div>
          {s.wonAmt > 0 && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 1 }}>{fmt(s.wonAmt)}</div>}
        </td>
        {/* Avances */}
        <td style={{ ...tdBase, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: s.stageAdv > 0 ? '#7C3AED' : 'var(--fg-tertiary)' }}>{s.stageAdv}</span>
        </td>
        {/* Nuevos */}
        <td style={{ ...tdBase, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: s.newProsp > 0 ? '#EF9F27' : 'var(--fg-tertiary)' }}>{s.newProsp}</span>
        </td>
        {/* Cumplimiento */}
        <td style={{ ...tdBase, textAlign: 'right', padding: '11px 14px' }}>
          <span style={{ padding: '3px 8px', borderRadius: 20, background: compColor + '18', color: compColor, fontSize: 11, fontWeight: 500 }}>
            {pctFmt(s.compliance)}
          </span>
        </td>
        {/* Expand icon */}
        <td style={{ ...tdBase, textAlign: 'center', width: 32, padding: '11px 8px' }}>
          <Icon name="chevron-down" size={14} color="var(--fg-tertiary)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </td>
      </tr>

      {/* ── Expanded detail ── */}
      {expanded && (
        <tr>
          <td colSpan={10} style={{ padding: '0 0 0 54px', background: '#185FA505', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
                Detalle de actividades · {s.total} {s.total === 1 ? 'registro' : 'registros'}
              </div>
              {s.acts.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>Sin actividad en este período</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {s.acts.map(a => {
                    const ki = KIND_ICON[a.kind] || KIND_ICON.visit
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 10px', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: ki.color + '18', color: ki.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Icon name={ki.icon} size={12} color={ki.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--fg)' }}>
                            <b style={{ fontWeight: 500 }}>{a.prospect}</b>
                            <span style={{ color: 'var(--fg-secondary)' }}> · {a.detail}</span>
                            {a.amount && <span style={{ color: 'var(--success)', fontWeight: 600 }}> · {a.amount}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.date} {a.time}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Export actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer' }}>
          <Icon name="download" size={13} />{csvLabel}
        </button>
        <button onClick={onExportXLS} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--success)', background: 'var(--success-bg)', color: 'var(--success)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          <Icon name="download" size={13} />{xlsLabel}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {COL_HEADERS.map((h, i) => (
                <th key={i} style={{ padding: `9px ${i === 0 || i === COL_HEADERS.length - 1 ? '14px' : '10px'}`, textAlign: h.align, fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)', letterSpacing: 0.3, textTransform: 'uppercase', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <SellerRow
                key={s.init}
                s={s}
                expanded={expanded === s.init}
                onToggle={() => toggle(s.init)}
                isLast={i === stats.length - 1}
              />
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 12, color: 'var(--fg)' }}>Totales del equipo</td>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: 'var(--kiuvo-blue)', fontSize: 15 }}>{totals.visits}</td>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#D85A30' }}>{totals.calls}</td>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#25D366' }}>{totals.msgs}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{totals.quotes}</div>
                {totals.quotedAmt > 0 && <div style={{ fontSize: 11, color: 'var(--warning)' }}>{fmt(totals.quotedAmt)}</div>}
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>{totals.wins}</div>
                {totals.wonAmt > 0 && <div style={{ fontSize: 11, color: 'var(--success)' }}>{fmt(totals.wonAmt)}</div>}
              </td>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#7C3AED' }}>{totals.stageAdv}</td>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#EF9F27' }}>{totals.newProsp}</td>
              <td style={{ padding: '10px 14px' }} />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
        <Icon name="chevron-down" size={11} /> Haz clic en una fila para ver el detalle de actividades del vendedor
      </div>
    </div>
  )
}

// ─── Tab: Ventas ──────────────────────────────────────────────────────────────
function VentasTab({ weeklyChart = [], monthlyChart = [] }) {
  const year = new Date().getFullYear()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ padding: '18px 20px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>Ventas por día</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 14 }}>Semana actual · Cierres ganados</div>
        <BarChart data={weeklyChart} color="var(--kiuvo-blue)" height={160} />
      </div>
      <div style={{ padding: '18px 20px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>Ventas por mes</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 14 }}>{year} · acumulado</div>
        <BarChart data={monthlyChart} color="var(--success)" height={160} />
      </div>
    </div>
  )
}

// ─── Tab: Embudo ──────────────────────────────────────────────────────────────
function EmbudoTab({ stageData = [] }) {
  const maxCount = Math.max(...stageData.map(s => s.count), 1)
  const hasData  = stageData.some(s => s.count > 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ padding: '18px 20px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>Distribución del pipeline</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 18 }}>Prospectos por etapa</div>
        {!hasData ? (
          <div style={{ textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13, padding: '20px 0' }}>Sin prospectos aún</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageData.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--fg)' }}>{s.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '18px 20px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>Tasas de conversión</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 18 }}>Entre etapas consecutivas</div>
        {!hasData ? (
          <div style={{ textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13, padding: '20px 0' }}>Sin datos suficientes</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stageData.slice(0, -1).map((s, i) => {
              const next = stageData[i + 1]
              const rate = s.count > 0 ? Math.round((next.count / s.count) * 100) : 0
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, fontSize: 11, color: 'var(--fg-secondary)', textAlign: 'right' }}>{s.label}</div>
                  <Icon name="arrow-right" size={12} color="var(--fg-tertiary)" />
                  <div style={{ width: 80, fontSize: 11, color: 'var(--fg-secondary)' }}>{next.label}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: next.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 36, fontSize: 12, fontWeight: 500, color: 'var(--fg)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rate}%</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 32px' }}>

      {/* ── Header: tabs + período ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)', borderBottom: `2px solid ${tab === t.id ? 'var(--kiuvo-blue)' : 'transparent'}`, marginBottom: -1, transition: 'color 0.12s' }}>
              <Icon name={t.icon} size={14} color={tab === t.id ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)'} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Período selector */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 10, alignItems: 'center' }}>
          <Icon name="calendar" size={13} color="var(--fg-tertiary)" />
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 12,
                border: `0.5px solid ${periodId === p.id ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                background: periodId === p.id ? 'var(--kiuvo-blue)' : 'transparent',
                color: periodId === p.id ? '#fff' : 'var(--fg-secondary)',
                cursor: 'pointer', fontWeight: periodId === p.id ? 500 : 400,
                transition: 'all 0.12s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs de resumen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total ganado',          value: fmt(totalWon),         sub: 'acumulado histórico',    icon: 'trophy',    color: 'var(--kiuvo-blue)' },
          { label: 'Meta total del equipo', value: fmt(totalGoal),        sub: 'objetivo mensual',       icon: 'target',    color: 'var(--success)' },
          { label: 'Cumplimiento promedio', value: pctFmt(avgCompliance), sub: 'seguimiento visitas',    icon: 'chart-bar', color: 'var(--warning)' },
          { label: 'Prospectos activos',    value: totalProspects,        sub: 'en pipeline total',      icon: 'users',     color: 'var(--info)' },
        ].map(c => (
          <div key={c.label} style={{ padding: '16px 18px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={c.icon} size={18} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Contenido del tab ── */}
      {tab === 'sellers' && (
        <SellerReportTab
          stats={stats}
          period={period}
          onExportCSV={handleCSV}
          onExportXLS={handleXLS}
          csvLabel={csvFlash ? '✓ Descargado' : 'Exportar CSV'}
          xlsLabel={xlsFlash ? '✓ Descargado' : 'Exportar Excel (.xls)'}
        />
      )}
      {tab === 'ventas' && <VentasTab weeklyChart={weeklyChart} monthlyChart={monthlyChart} />}
      {tab === 'embudo' && <EmbudoTab stageData={stageData} />}
    </div>
  )
}
