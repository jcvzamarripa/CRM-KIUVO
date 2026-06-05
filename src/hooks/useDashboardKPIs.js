import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Fallback cuando no hay Supabase ──────────────────────────────────────────
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

const pct = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : null
const deltaStr = n => n == null ? '' : `${n >= 0 ? '+' : ''}${n}%`
const deltaKind = n => n == null ? '' : n >= 0 ? 'good' : 'bad'

// ─── Consultas Supabase usando las tablas reales ───────────────────────────────
// • prospects  → prospectos activos
// • activities → kind: 'win' (cierres), 'quote' (cotizaciones), details.amount
// • visits     → visitas de campo
async function fetchSupabaseKPIs() {
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    activeRes,
    winsMonthRes,
    winsPrevRes,
    winsAllRes,
    quotesRes,
    quotesPrevRes,
  ] = await Promise.all([
    // 1. Total prospectos activos
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true }),

    // 2. Cierres este mes (kind = 'win')
    supabase
      .from('activities')
      .select('id, details')
      .eq('kind', 'win')
      .gte('created_at', monthStart),

    // 3. Cierres mes anterior (para delta)
    supabase
      .from('activities')
      .select('id, details')
      .eq('kind', 'win')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),

    // 4. Todos los cierres (ventas totales + tasa conversión)
    supabase
      .from('activities')
      .select('id, details')
      .eq('kind', 'win'),

    // 5. Cotizaciones enviadas
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote'),

    // 6. Cotizaciones mes anterior (para delta)
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),
  ])

  // ── Prospectos activos ──────────────────────────────────────────────────────
  const activeCount = activeRes.count ?? 0

  // ── Cierres este mes ────────────────────────────────────────────────────────
  const winsMonth      = winsMonthRes.data || []
  const cierresMes     = winsMonth.length
  const cierresMontoM  = winsMonth.reduce((s, a) => s + Number(a.details?.amount || 0), 0)

  const winsPrev       = winsPrevRes.data || []
  const cierresPrev    = winsPrev.length
  const cierresDelta   = pct(cierresMes, cierresPrev)

  // ── Ventas totales (acumuladas) ─────────────────────────────────────────────
  const winsAll        = winsAllRes.data || []
  const totalWins      = winsAll.length
  const salesTotalAmt  = winsAll.reduce((s, a) => s + Number(a.details?.amount || 0), 0)

  const prevMontoM     = winsPrev.reduce((s, a) => s + Number(a.details?.amount || 0), 0)
  const salesDelta     = pct(cierresMontoM, prevMontoM)

  // ── Cotizaciones ────────────────────────────────────────────────────────────
  const cotsPend       = quotesRes.count ?? 0
  const cotsPrev       = quotesPrevRes.count ?? 0
  const cotsDeltaNum   = cotsPrev > 0 ? cotsPend - cotsPrev : null
  const cotsDeltaStr   = cotsDeltaNum == null ? '' : `${cotsDeltaNum >= 0 ? '+' : ''}${cotsDeltaNum}`

  // ── Tasa de conversión ──────────────────────────────────────────────────────
  const pool    = activeCount + totalWins
  const tasaNum = pool > 0 ? ((totalWins / pool) * 100).toFixed(1) : '0.0'

  // ── Ticket promedio (mes actual) ────────────────────────────────────────────
  const ticketNum = cierresMes > 0 ? cierresMontoM / cierresMes : 0
  const ticketFmt = ticketNum > 0 ? fmtMXN(ticketNum) : '—'

  return {
    salesTotal: {
      value:     fmtMXN(salesTotalAmt),
      delta:     deltaStr(salesDelta),
      deltaKind: deltaKind(salesDelta),
      sub:       `${cierresMes} cierre${cierresMes !== 1 ? 's' : ''} este mes`,
    },
    prospectosActivos: {
      value:    String(activeCount),
      delta:    '',
      deltaKind:'',
      sub:      'en seguimiento activo',
    },
    tasaConversion: {
      value:    `${tasaNum}%`,
      delta:    '',
      deltaKind:'',
      sub:      'prospectos → cierre',
    },
    ticketPromedio: {
      value:    ticketFmt,
      delta:    '',
      deltaKind:'',
      sub:      'ticket promedio · este mes',
    },
    cierresMes: {
      value:     String(cierresMes),
      delta:     deltaStr(cierresDelta),
      deltaKind: deltaKind(cierresDelta),
      sub:       cierresMontoM > 0 ? `${fmtMXN(cierresMontoM)} este mes` : 'este mes',
    },
    cotizacionesPendientes: {
      value:     String(cotsPend),
      delta:     cotsDeltaStr,
      deltaKind: cotsDeltaNum == null ? '' : cotsDeltaNum <= 0 ? 'good' : 'bad',
      sub:       'cotizaciones enviadas',
    },
    cumplimientoSeguimiento: {
      value:    '0%',
      delta:    '',
      deltaKind:'',
      sub:      'prospectos con ≥ 1 visita',
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

    fetchSupabaseKPIs()
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
