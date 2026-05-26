import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_PROSPECTS, MOCK_SELLERS } from '../constants/mockData'

// ─── Mock fallback: compute KPIs from local mock data ─────────────────────────
function computeMockKPIs() {
  const active           = MOCK_PROSPECTS.length
  const cierreProspects  = MOCK_PROSPECTS.filter(p => p.stage === 'cierre')
  const cierresMesCount  = cierreProspects.length
  const cierresMesValue  = cierreProspects.reduce((s, p) => s + (p.value || 0), 0)
  const cotsPend         = MOCK_PROSPECTS.filter(p => p.stage === 'cotizacion').length
  const conVisitas       = MOCK_PROSPECTS.filter(p => p.visits >= 1).length
  const cumplimiento     = Math.round((conVisitas / MOCK_PROSPECTS.length) * 100)

  const totalWon = MOCK_SELLERS.reduce((s, v) => s + v.won, 0)

  const ticketNum  = cierresMesCount > 0 ? cierresMesValue / cierresMesCount : 0
  const ticketFmt  = ticketNum > 0 ? `$${(ticketNum / 1000).toFixed(1)}k` : '—'

  return {
    salesTotal: {
      value: `$${(totalWon / 1000).toFixed(0)}k`,
      delta: '+12%',
      deltaKind: 'good',
      sub: 'vs semana anterior',
    },
    prospectosActivos: {
      value: String(active),
      delta: '+8',
      deltaKind: 'good',
      sub: '34 nuevos esta semana',
    },
    tasaConversion: {
      value: '18.4%',
      delta: '+2.1pp',
      deltaKind: 'good',
      sub: 'prospección → cierre',
    },
    ticketPromedio: {
      value: ticketFmt,
      delta: '-3%',
      deltaKind: 'bad',
      sub: 'ventas ganadas',
    },
    cierresMes: {
      value: String(cierresMesCount),
      delta: '+2',
      deltaKind: 'good',
      sub: cierresMesValue > 0 ? `$${(cierresMesValue / 1000).toFixed(0)}k cerrado este mes` : 'este mes',
    },
    cotizacionesPendientes: {
      value: String(cotsPend),
      delta: '-1',
      deltaKind: 'bad',
      sub: 'esperando respuesta del cliente',
    },
    cumplimientoSeguimiento: {
      value: `${cumplimiento}%`,
      delta: '+4pp',
      deltaKind: 'good',
      sub: 'prospectos con ≥ 1 visita',
    },
  }
}

// ─── Supabase live queries ─────────────────────────────────────────────────────
async function fetchSupabaseKPIs() {
  const now           = new Date()
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart= new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    activeRes,
    cierresMesRes,
    cierresPrevRes,
    salesTotalRes,
    salesPrevRes,
    cotsPendRes,
    cotsPrevRes,
    convRes,
    cumplRes,
  ] = await Promise.all([
    // 1. Prospectos activos (sin stage 'cierre' ganado)
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

    // 4. Total ventas acumuladas (all-time) para KPI salesTotal
    supabase
      .from('sales')
      .select('amount'),

    // 5. Total ventas mes anterior (para delta de salesTotal)
    supabase
      .from('sales')
      .select('amount')
      .gte('closed_at', prevMonthStart)
      .lt('closed_at', monthStart),

    // 6. Cotizaciones pendientes (enviadas, sin respuesta)
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote'),

    // 7. Cotizaciones mes anterior (para delta)
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'quote')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),

    // 6. Todos los cerrados (won/lost) para tasa de conversión
    // 8. Tasa de conversión: total prospectos vs total sales
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true }),

    // 9. Cumplimiento: prospects con al menos 1 visita
    supabase
      .from('prospects')
      .select('id, visits:visits(count)'),
  ])

  // ── Prospectos activos ──────────────────────────────────────────────────────
  const activeCount = activeRes.count ?? 0

  // ── Cierres del mes (desde sales) ──────────────────────────────────────────
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

  // ── Ventas totales acumuladas ───────────────────────────────────────────────
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

  // ── Cotizaciones ────────────────────────────────────────────────────────────
  const cotsPendCount = cotsPendRes.count ?? 0
  const cotsPrevCount = cotsPrevRes.count ?? 0
  const cotsDeltaNum  = cotsPrevCount > 0 ? cotsPendCount - cotsPrevCount : null
  const cotsDelta     = cotsDeltaNum != null
    ? `${cotsDeltaNum >= 0 ? '+' : ''}${cotsDeltaNum}`
    : ''

  // ── Tasa de conversión: ventas / prospectos totales ─────────────────────────
  const totalWins  = convRes.count ?? 0
  const tasaNum    = activeCount > 0
    ? ((totalWins / (activeCount + totalWins)) * 100).toFixed(1)
    : '0.0'

  // ── Ticket promedio ─────────────────────────────────────────────────────────
  const ticketNum = cierresMesCount > 0 ? cierresMesValue / cierresMesCount : 0
  const ticketFmt = ticketNum > 0 ? `$${(ticketNum / 1000).toFixed(1)}k` : '—'

  // ── Cumplimiento de seguimiento (prospects con ≥1 visita) ──────────────────
  const allProspects  = cumplRes.data || []
  const conVisitas    = allProspects.filter(p => (p.visits?.[0]?.count ?? 0) >= 1).length
  const cumplimiento  = allProspects.length > 0
    ? Math.round((conVisitas / allProspects.length) * 100)
    : 0

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
      value: `${cumplimiento}%`,
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
      // No Supabase credentials → use mock immediately
      setKpis(computeMockKPIs())
      setLoading(false)
      return
    }

    fetchSupabaseKPIs()
      .then(liveData => {
        // Merge: null fields from Supabase fall back to mock values
        const mock = computeMockKPIs()
        const merged = { ...mock }
        for (const [key, val] of Object.entries(liveData)) {
          if (val !== null) merged[key] = val
        }
        setKpis(merged)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useDashboardKPIs]', err)
        setError(err)
        setKpis(computeMockKPIs())
        setLoading(false)
      })
  }, [])

  return { kpis, loading, error }
}
