import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ── Shape mapper ──────────────────────────────────────────────────────────────
function mapEvent(ev) {
  return {
    id:       ev.id,
    date:     ev.date,
    start:    ev.start_time?.slice(0, 5) || '00:00',
    end:      ev.end_time?.slice(0, 5)   || '00:00',
    type:     ev.type     || 'visita',
    name:     ev.name     || '',
    contact:  ev.contact  || '',
    owner:    ev.seller?.initials || '?',
    seller_id:ev.seller_id || null,
    stage:    ev.stage    || '',
    address:  ev.address  || '',
    notes:    ev.notes    || '',
    created_at: ev.created_at,
  }
}

/**
 * Fetches agenda_events from Supabase.
 *
 * @param {object} opts
 * @param {string}  [opts.sellerId]  – filter by seller UUID (null = all events)
 * @param {string}  [opts.dateFrom]  – ISO date string  e.g. '2026-05-26'
 * @param {string}  [opts.dateTo]    – ISO date string
 * @param {number}  [opts.limit=200] – max rows
 */
export function useAgendaEvents({ sellerId, dateFrom, dateTo, limit = 200 } = {}) {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    let q = supabase
      .from('agenda_events')
      .select(`
        id, date, start_time, end_time, type, name, contact,
        seller_id, stage, address, notes, created_at,
        seller:profiles!seller_id (initials, full_name, avatar_color)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit)

    if (sellerId)  q = q.eq('seller_id', sellerId)
    if (dateFrom)  q = q.gte('date', dateFrom)
    if (dateTo)    q = q.lte('date', dateTo)

    const { data, error } = await q

    if (error || !data) {
      console.warn('[useAgendaEvents]', error?.message)
      setEvents([])
      setLoading(false)
      return
    }

    setEvents(data.map(mapEvent))
    setLoading(false)
  }, [sellerId, dateFrom, dateTo, limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: reload on any change
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('agenda-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_events' }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { events, loading, reload: fetch }
}

/**
 * Shortcut: today's agenda for the current seller.
 * @param {string} sellerId – profile UUID of the current user
 */
export function useTodayAgenda(sellerId) {
  const today = new Date().toISOString().slice(0, 10)
  return useAgendaEvents({ sellerId, dateFrom: today, dateTo: today })
}
