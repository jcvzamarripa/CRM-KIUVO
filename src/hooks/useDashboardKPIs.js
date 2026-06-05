import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Fallback sin Supabase ─────────────────────────────────────────────────────
function emptyKPIs() {
  return {
    salesTotal:             { value: '$0',   delta: '', deltaKind: '', sub: '0 cierres este mes' },
    prospectosActivos:      { value: '0',    delta: '', deltaKind: '', sub: 'en seguimiento activo' },
    tasaConversion:         { value: '0.0%', delta: '', deltaKind: '', sub: 'prospectos → cierre' },
    ticketPromedio:         { value: '—',    delta: '', deltaKind: '', sub: 'ticket promedio · este mes' },
    cierresMes:             { value: '0',    delta: '', deltaKind: '', sub: 'este mes' },
    cotizacionesPendientes: { value: '0',    delta: '', deltaKind: '', sub: 'cotizaciones enviadas' },
    cumplimientoSeguimiento:{ value: '0%',   delta: '', deltaKind: '', sub: 'prospectos con ≥ 1 visita' },
  }
}

const fmtMXN = n =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}k`
  : `$${Math.round(n)}`

const pctDelta = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null
const deltaStr  = n => n == null ? '' : `${n >= 0 ? '+' : ''}${n}%`
const deltaKind = n => n == null ? '' : n >= 0 ? 'good' : 'bad'

// ─── Queries usando las tablas reales del schema ───────────────────────────────
// • prospects        → prospectos activos
// • quotes (total)   → ventas totales, ticket promedio, cierres (status='approved')
// • quotes (sent)    → cotizaciones pendientes (status='sent')
async function fetchKPIs() {
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    activeRes,        // prospects count
    cierresMesRes,    // approved quotes this month
    cierresPrevRes,   // approved quotes prev month
    cierresTotalRes,  // all approved quotes (ventas totales)
    cotSentRes,       // sent quotes (pendientes)
    cotSentPrevRes,   // sent quotes prev month
  ] = await Promise.all([
    // 1. Prospectos activos
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true }),

    // 2. Cierres este mes (aprobados) — usa created_at porque updated_at no tiene trigger
    supabase
      .from('quotes')
      .select('id, total')
      .eq('status', 'approved')
      .gte('created_at', monthStart),

    // 3. Cierres mes anterior
    supabase
      .from('quotes')
      .select('id, total')
      .eq('status', 'approved')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),

    // 4. Todas las ventas cerradas (acumulado)
    supabase
      .from('quotes')
      .select('id, total')
      .eq('status', 'approved'),

    // 5. Cotizaciones enviadas (pendientes de respuesta)
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent'),

    // 6. Cotizaciones enviadas mes anterior (para delta)
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),
  ])

  // ── Prospectos activos ──────────────────────────────────────────────────────
  const activeCount = activeRes.count ?? 0

  // ── Cierres del mes ─────────────────────────────────────────────────────────
  const cierresMes    = cierresMesRes.data  || []
  const cierresPrev   = cierresPrevRes.data || []
  const cierresCount  = cierresMes.length
  const cierresPrevCt = cierresPrev.length
  const cierresMonto  = cierresMes.reduce((s, q) => s + Number(q.total || 0), 0)
  const cierresPrevM  = cierresPrev.reduce((s, q) => s + Number(q.total || 0), 0)
  const cierresDelta  = pctDelta(cierresCount, cierresPrevCt)

  // ── Ventas totales acumuladas ────────────────────────────────────────────────
  const cierresAll    = cierresTotalRes.data || []
  const totalWins     = cierresAll.length
  const salesTotalAmt = cierresAll.reduce((s, q) => s + Number(q.total || 0), 0)
  const salesDelta    = pctDelta(cierresMonto, cierresPrevM)

  // ── Cotizaciones enviadas ────────────────────────────────────────────────────
  const cotPend     = cotSentRes.count  ?? 0
  const cotPrevCt   = cotSentPrevRes.count ?? 0
  const cotDeltaNum = cotPrevCt > 0 ? cotPend - cotPrevCt : null
  const cotDeltaStr = cotDeltaNum == null ? '' : `${cotDeltaNum >= 0 ? '+' : ''}${cotDeltaNum}`

  // ── Tasa de conversión ───────────────────────────────────────────────────────
  const pool    = activeCount + totalWins
  const tasaNum = pool > 0 ? ((totalWins / pool) * 100).toFixed(1) : '0.0'

  // ── Ticket promedio (mes actual) ─────────────────────────────────────────────
  const ticketNum = cierresCount > 0 ? cierresMonto / cierresCount : 0
  const ticketFmt = ticketNum > 0 ? fmtMXN(ticketNum) : '—'

  return {
    salesTotal: {
      value:     fmtMXN(salesTotalAmt),
      delta:     deltaStr(salesDelta),
      deltaKind: deltaKind(salesDelta),
      sub:       `${cierresCount} cierre${cierresCount !== 1 ? 's' : ''} este mes`,
    },
    prospectosActivos: {
      value:     String(activeCount),
      delta:     '',
      deltaKind: '',
      sub:       'en seguimiento activo',
    },
    tasaConversion: {
      value:     `${tasaNum}%`,
      delta:     '',
      deltaKind: '',
      sub:       'prospectos → cierre',
    },
    ticketPromedio: {
      value:     ticketFmt,
      delta:     '',
      deltaKind: '',
      sub:       'ticket promedio · este mes',
    },
    cierresMes: {
      value:     String(cierresCount),
      delta:     deltaStr(cierresDelta),
      deltaKind: deltaKind(cierresDelta),
      sub:       cierresMonto > 0 ? `${fmtMXN(cierresMonto)} este mes` : 'este mes',
    },
    cotizacionesPendientes: {
      value:     String(cotPend),
      delta:     cotDeltaStr,
      deltaKind: cotDeltaNum == null ? '' : cotDeltaNum <= 0 ? 'good' : 'bad',
      sub:       'cotizaciones enviadas',
    },
    cumplimientoSeguimiento: {
      value:     '0%',
      delta:     '',
      deltaKind: '',
      sub:       'prospectos con ≥ 1 visita',
    },
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useDashboardKPIs() {
  const [kpis,    setKpis]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setKpis(emptyKPIs())
      setLoading(false)
      return
    }

    fetchKPIs()
      .then(data => { setKpis(data); setLoading(false) })
      .catch(err  => {
        console.error('[useDashboardKPIs]', err)
        setError(err)
        setKpis(emptyKPIs())
        setLoading(false)
      })
  }, [])

  return { kpis, loading, error }
}
