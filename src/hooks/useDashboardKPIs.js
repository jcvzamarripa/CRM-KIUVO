import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Empty KPIs placeholder ────────────────────────────────────────────────────
function emptyKPIs() {
  return {
    salesTotal: {
      value: '$0',
      delta: '',
      deltaKind: '',
      sub: 'sin ventas registradas',
    },
    prospectosActivos: {
      value: '0',
      delta: '',
      deltaKind: '',
      sub: 'en seguimiento activo',
    },
    tasaConversion: {
      value: '0.0%',
      delta: '',
      deltaKind: '',
      sub: 'prospectos → cierre',
    },
    ticketPromedio: {
      value: '—',
      delta: '',
      deltaKind: '',
      sub: 'ticket promedio · este mes',
    },
    cierresMes: {
      value: '0',
      delta: '',
      deltaKind: '',
      sub: 'este mes',
    },
    cotizacionesPendientes: {
      value: '0',
      delta: '',
      deltaKind: '',
      sub: 'cotizaciones enviadas',
    },
    cumplimientoSeguimiento: {
      value: '0%',
      delta: '',
      deltaKind: '',
      sub: 'prospectos con ≥ 1 visita',
    },
  }
}

// ─── Supabase live queries ─────────────────────────────────────────────────────
async function fetchSupabaseKPIs() {
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    activeRes,
    cierresMesRes,
    cierresPrevRes,
    salesTotalRes,
    salesPrevRes,
    cotsPendRes,
    cotsPrevRes,
    convRes,
  ] = await Promise.all([
    // 1. Prospectos activos
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true }),

    // 2. Cierres este mes (desde tabla sales)
    supabase
      .from('sales')
      .select('id, amount')
      .gte('closed_at', monthStart),

    // 3. Cierres mes anterior (para delta)
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .gte('closed_at', prevMonthStart)
      .lt('closed_at', monthStart),

    // 4. Total ventas acumuladas (all-time)
    supabase
      .from('sales')
      .select('amount'),

    // 5. Total ventas mes anterior (para delta)
    supabase
      .from('sales')
      .select('amount')
      .gte('closed_at', prevMonthStart)
      .lt('closed_at', monthStart),

    // 6. Cotizaciones enviadas
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote'),

    // 7. Cotizaciones mes anterior
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),

    // 8. Total ventas ganadas (para tasa conversión)
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true }),
  ])

  // ── Prospectos activos ──────────────────────────────────────────────────────
  const activeCount = activeRes.count ?? 0

  // ── Cierres del mes ─────────────────────────────────────────────────────────
  const cierresMesData  = cierresMesRes.data || []
  const cierresMesCount = cierresMesData.length
  const cierresMesValue = cierresMesData.reduce((s, p) => s + Number(p.amount || 0), 0)
  const cierresPrevCount= cierresPrevRes.count ?? 0
  const cierresDeltaNum = cierresPrevCount > 0
    ? Math.round(((cierresMesCount - cierresPrevCount) / cierresPrevCount) * 100)
    : null
  const cierresDelta = cierresDeltaNum != null
    ? `${cierresDeltaNum >= 0 ? '+' : ''}${cierresDeltaNum}%`
    : ''

  // ── Ventas totales acumuladas ────────────────────────────────────────────────
  const allSalesData   = salesTotalRes.data || []
  const salesTotalAmt  = allSalesData.reduce((s, r) => s + Number(r.amount || 0), 0)
  const prevSalesData  = salesPrevRes.data || []
  const prevSalesAmt   = prevSalesData.reduce((s, r) => s + Number(r.amount || 0), 0)
  const salesDeltaNum  = prevSalesAmt > 0
    ? Math.round(((cierresMesValue - prevSalesAmt) / prevSalesAmt) * 100)
    : null
  const salesDelta = salesDeltaNum != null
    ? `${salesDeltaNum >= 0 ? '+' : ''}${salesDeltaNum}%`
    : ''

  // ── Cotizaciones ─────────────────────────────────────────────────────────────
  const cotsPendCount = cotsPendRes.count ?? 0
  const cotsPrevCount = cotsPrevRes.count ?? 0
  const cotsDeltaNum  = cotsPrevCount > 0 ? cotsPendCount - cotsPrevCount : null
  const cotsDelta     = cotsDeltaNum != null
    ? `${cotsDeltaNum >= 0 ? '+' : ''}${cotsDeltaNum}`
    : ''

  // ── Tasa de conversión ───────────────────────────────────────────────────────
  const totalWins = convRes.count ?? 0
  const tasaNum   = activeCount > 0
    ? ((totalWins / (activeCount + totalWins)) * 100).toFixed(1)
    : '0.0'

  // ── Ticket promedio ──────────────────────────────────────────────────────────
  const ticketNum = cierresMesCount > 0 ? cierresMesValue / cierresMesCount : 0
  const ticketFmt = ticketNum > 0 ? `$${(ticketNum / 1000).toFixed(1)}k` : '—'

  const fmtTotal = n => n >= 1000000
    ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`

  return {
    salesTotal: {
      value:     fmtTotal(salesTotalAmt),
      delta:     salesDelta,
      deltaKind: salesDeltaNum != null ? (salesDeltaNum >= 0 ? 'good' : 'bad') : '',
      sub:       `${cierresMesCount} cierre${cierresMesCount !== 1 ? 's' : ''} este mes`,
    },
    prospectosActivos: {
      value: String(activeCount),
      delta: '',
      deltaKind: '',
      sub: 'en seguimiento activo',
    },
    tasaConversion: {
      value: `${tasaNum}%`,
      delta: '',
      deltaKind: '',
      sub: 'prospectos → cierre',
    },
    ticketPromedio: {
      value: ticketFmt,
      delta: '',
      deltaKind: '',
      sub: 'ticket promedio · este mes',
    },
    cierresMes: {
      value: String(cierresMesCount),
      delta: cierresDelta,
      deltaKind: cierresDeltaNum != null ? (cierresDeltaNum >= 0 ? 'good' : 'bad') : '',
      sub: cierresMesValue > 0
        ? `${fmtTotal(cierresMesValue)} cerrado este mes`
        : 'este mes',
    },
    cotizacionesPendientes: {
      value: String(cotsPendCount),
      delta: cotsDelta,
      deltaKind: cotsDeltaNum != null ? (cotsDeltaNum > 0 ? 'bad' : 'good') : '',
      sub: 'cotizaciones enviadas',
    },
    cumplimientoSeguimiento: {
      value: `0%`,
      delta: '',
      deltaKind: '',
      sub: 'prospectos con ≥ 1 visita',
    },
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useDashboardKPIs() {
  const [kpis, setKpis]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setKpis(emptyKPIs())
      setLoading(false)
      return
    }

    fetchSupabaseKPIs()
      .then(liveData => {
        setKpis(liveData)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useDashboardKPIs]', err)
        setError(err)
        setKpis(emptyKPIs())
        setLoading(false)
      })
  }, [])

  return { kpis, loading, error }
}
