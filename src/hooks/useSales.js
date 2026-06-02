import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Hook para consultar ventas cerradas desde la tabla `sales`.
 *
 * @param {object} opts
 * @param {string}  [opts.sellerId]  – filtrar por vendedor UUID (null = todos)
 * @param {string}  [opts.dateFrom]  – ISO date  '2026-05-01'
 * @param {string}  [opts.dateTo]    – ISO date  '2026-05-31'
 * @param {number}  [opts.limit=500]
 */
export function useSales({ sellerId, dateFrom, dateTo, limit = 500 } = {}) {
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(true)
  const [totals,  setTotals]  = useState({ count: 0, amount: 0 })

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSales([])
      setTotals({ count: 0, amount: 0 })
      setLoading(false)
      return
    }

    setLoading(true)
    let q = supabase
      .from('sales')
      .select(`
        id, amount, notes, closed_at, created_at,
        seller:profiles ( id, full_name, initials, avatar_color ),
        prospect:prospects ( id, name, company )
      `)
      .order('closed_at', { ascending: false })
      .limit(limit)

    if (sellerId) q = q.eq('seller_id', sellerId)
    if (dateFrom) q = q.gte('closed_at', dateFrom)
    if (dateTo)   q = q.lte('closed_at', dateTo + 'T23:59:59Z')

    const { data, error } = await q
    if (error || !data) {
      console.warn('[useSales]', error?.message)
      setSales([])
      setTotals({ count: 0, amount: 0 })
      setLoading(false)
      return
    }

    const mapped = data.map(s => ({
      id:           s.id,
      amount:       Number(s.amount) || 0,
      notes:        s.notes || '',
      closed_at:    s.closed_at,
      seller_id:    s.seller?.id     || null,
      sellerName:   s.seller?.full_name    || 'Vendedor',
      sellerInit:   s.seller?.initials     || '?',
      sellerColor:  s.seller?.avatar_color || '#888',
      prospect_id:  s.prospect?.id   || null,
      prospectName: s.prospect?.name || '—',
    }))

    setSales(mapped)
    setTotals({
      count:  mapped.length,
      amount: mapped.reduce((sum, s) => sum + s.amount, 0),
    })
    setLoading(false)
  }, [sellerId, dateFrom, dateTo, limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: actualizar cuando se inserten nuevas ventas
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('sales-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { sales, loading, totals, reload: fetch }
}

/**
 * Devuelve totales de ventas por vendedor: { [seller_id]: { count, amount } }
 * Útil para TeamTable, GoalsView, ReportsView.
 */
export function useSalesBySeller({ dateFrom, dateTo } = {}) {
  const { sales, loading } = useSales({ dateFrom, dateTo, limit: 2000 })

  const bySeller = {}
  for (const s of sales) {
    if (!s.seller_id) continue
    if (!bySeller[s.seller_id]) bySeller[s.seller_id] = { count: 0, amount: 0 }
    bySeller[s.seller_id].count  += 1
    bySeller[s.seller_id].amount += s.amount
  }

  return { bySeller, loading }
}
