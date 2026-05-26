import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Returns a sparkline array of daily win amounts for the last `days` days.
 * Shape: number[] — one value per day (0 if no sales that day).
 * Falls back to all-zeros (not mock) when Supabase has no data yet.
 */
export function useSalesTrend({ days = 14 } = {}) {
  const zeros   = Array(days).fill(0)
  const [trend,   setTrend]   = useState(zeros)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setTrend(zeros)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)

      // Build date range
      const to   = new Date()
      const from = new Date(Date.now() - (days - 1) * 86400000)
      const fromISO = from.toISOString().slice(0, 10)
      const toISO   = to.toISOString().slice(0, 10)

      // Query the sales table (canonical source) for closed_at + amount
      const { data, error } = await supabase
        .from('sales')
        .select('closed_at, amount')
        .gte('closed_at', fromISO)
        .lte('closed_at', toISO + 'T23:59:59Z')

      if (error || !data) {
        setTrend(zeros)
        setLoading(false)
        return
      }

      // Build ISO-date → total map
      const byDay = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * 86400000)
        byDay[d.toISOString().slice(0, 10)] = 0
      }

      for (const s of data) {
        const d = s.closed_at.slice(0, 10)
        if (d in byDay) byDay[d] += Number(s.amount) || 0
      }

      setTrend(Object.values(byDay))
      setLoading(false)
    }

    load()
  }, [days])

  return { trend, loading }
}
