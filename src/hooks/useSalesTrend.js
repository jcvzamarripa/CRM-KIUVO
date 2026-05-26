import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_SALES_TREND } from '../constants/mockData'

/**
 * Returns a sparkline array of daily win amounts for the last `days` days.
 * Shape: number[] — one value per day (0 if no sales that day).
 */
export function useSalesTrend({ days = 14 } = {}) {
  const [trend,   setTrend]   = useState(MOCK_SALES_TREND)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setTrend(MOCK_SALES_TREND)
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

      const { data, error } = await supabase
        .from('activities')
        .select('created_at, details')
        .eq('kind', 'win')
        .gte('created_at', fromISO)
        .lte('created_at', toISO + 'T23:59:59Z')

      if (error || !data) {
        setTrend(MOCK_SALES_TREND)
        setLoading(false)
        return
      }

      // Build ISO-date → total map
      const byDay = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * 86400000)
        byDay[d.toISOString().slice(0, 10)] = 0
      }

      for (const ev of data) {
        const d = ev.created_at.slice(0, 10)
        if (d in byDay) byDay[d] += (ev.details?.value || 0)
      }

      const arr = Object.values(byDay)

      // If all zeros (no real data yet), fall back to mock so sparkline isn't blank
      const hasData = arr.some(v => v > 0)
      setTrend(hasData ? arr : MOCK_SALES_TREND)
      setLoading(false)
    }

    load()
  }, [days])

  return { trend, loading }
}
