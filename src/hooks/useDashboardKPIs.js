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
    cotsPendRes,
    cotsPrevRes,
    convRes,
    cumplRes,
  ] = await Promise.all([
    // 1. Prospectos activos
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // 2. Cierres este mes
    supabase
      .from('prospects')
      .select('id, value')
      .eq('status', 'won')
      .gte('closed_at', monthStart),

    // 3. Cierres mes anterior (para delta)
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'won')
      .gte('closed_at', prevMonthStart)
      .lt('closed_at', monthStart),

    // 4. Cotizaciones pendientes (enviadas, sin respuesta)
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent'),

    // 5. Cotizaciones pendientes mes anterior (para delta)
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart),

    // 6. Todos los cerrados (won/lost) para tasa de conversión
    supabase
      .from('prospects')
      .select('id, status')
      .in('status', ['won', 'lost']),

    // 7. Cumplimiento: prospects active con visits >= 1
    supabase
      .from('prospects')
      .select('id, visits')
      .eq('status', 'active'),
  ])

  // ── Prospectos activos ──────────────────────────────────────────────────────
  const activeCount = activeRes.count ?? 0

  // ── Cierres del mes ─────────────────────────────────────────────────────────
  const cierresMesData  = cierresMesRes.data || []
  const cierresMesCount = cierresMesData.length
  const cierresMesValue = cierresMesData.reduce((s, p) => s + (p.value || 0), 0)
  const cierresPrevCount= cierresPrevRes.count ?? 0
  const cierresDeltaNum = cierresPrevCount > 0
    ? Math.round(((cierresMesCount - cierresPrevCount) / cierresPrevCount) * 100)
    : null
  const cierresDelta    = cierresDeltaNum != null
    ? `${cierresDeltaNum >= 0 ? '+' : ''}${cierresDeltaNum}%`
    : ''

  // ── Cotizaciones pendientes ─────────────────────────────────────────────────
  const cotsPendCount  = cotsPendRes.count ?? 0
  const cotsPrevCount  = cotsPrevRes.count ?? 0
  const cotsDeltaNum   = cotsPrevCount > 0 ? cotsPendCount - cotsPrevCount : null
  const cotsDelta      = cotsDeltaNum != null
    ? `${cotsDeltaNum >= 0 ? '+' : ''}${cotsDeltaNum}`
    : ''

  // ── Tasa de conversión ──────────────────────────────────────────────────────
  const allClosed  = convRes.data || []
  const wonCount   = allClosed.filter(p => p.status === 'won').length
  const totalClosed= allClosed.length
  const tasaNum    = totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) : '0.0'

  // ── Ticket promedio ─────────────────────────────────────────────────────────
  const ticketNum  = cierresMesCount > 0 ? cierresMesValue / cierresMesCount : 0
  const ticketFmt  = ticketNum > 0 ? `$${(ticketNum / 1000).toFixed(1)}k` : '—'

  // ── Cumplimiento de seguimiento ─────────────────────────────────────────────
  const allActive      = cumplRes.data || []
  const conVisitas     = allActive.filter(p => (p.visits || 0) >= 1).length
  const cumplimiento   = allActive.length > 0
    ? Math.round((conVisitas / allActive.length) * 100)
    : 0

  return {
    salesTotal: null, // sin tabla de ventas todavía — usa mock
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
      sub: 'prospección → cierre',
    },
    ticketPromedio: {
      value: ticketFmt,
      delta: '',
      deltaKind: '',
      sub: 'ticket promedio · ventas ganadas',
    },
    cierresMes: {
      value: String(cierresMesCount),
      delta: cierresDelta,
      deltaKind: cierresDeltaNum != null ? (cierresDeltaNum >= 0 ? 'good' : 'bad') : '',
      sub: cierresMesValue > 0
        ? `$${(cierresMesValue / 1000).toFixed(0)}k cerrado este mes`
        : 'este mes',
    },
    cotizacionesPendientes: {
      value: String(cotsPendCount),
      delta: cotsDelta,
      // more pending = worse (red), fewer = better (green)
      deltaKind: cotsDeltaNum != null ? (cotsDeltaNum > 0 ? 'bad' : 'good') : '',
      sub: 'esperando respuesta del cliente',
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
