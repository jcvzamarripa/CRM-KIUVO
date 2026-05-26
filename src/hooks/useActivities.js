import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_ACTIVITY } from '../constants/mockData'

function fmtTime(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)     return 'ahora'
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'ayer'
  return `hace ${Math.floor(diff / 86400)} días`
}

const KIND_LABELS = {
  win:   'cerró venta en',
  visit: 'registró visita en',
  quote: 'envió cotización a',
  add:   'agregó prospecto',
  stage: 'avanzó etapa de',
  msg:   'envió mensaje a',
}

export function useActivities({ limit = 50 } = {}) {
  const [activities, setActivities] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setActivities(MOCK_ACTIVITY)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id, kind, details, created_at,
        seller:profiles!seller_id (full_name, initials, avatar_color),
        prospect:prospects!prospect_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) {
      setActivities(MOCK_ACTIVITY)
      setLoading(false)
      return
    }

    const mapped = data.map(a => {
      const prospectName = a.prospect?.name || a.details?.prospect_name || ''
      const amountNum = a.kind === 'win'   ? a.details?.value
                      : a.kind === 'quote' ? a.details?.total
                      : null
      const amount = amountNum
        ? `$${Number(amountNum).toLocaleString('es-MX')}`
        : a.kind === 'visit' && a.details?.visit_number
        ? `${a.details.visit_number}ª visita`
        : ''

      const dt = new Date(a.created_at)
      const dateISO = dt.toISOString().slice(0, 10)
      const timeStr = dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

      const detail = a.details?.note || a.details?.detail || ''

      return {
        id:          a.id,
        // ActivityFeed shape
        who:         a.seller?.full_name   || 'Vendedor',
        what:        KIND_LABELS[a.kind]   || a.kind,
        target:      prospectName,
        time:        fmtTime(a.created_at),
        // ActivitiesView shape
        sellerInit:  a.seller?.initials    || '?',
        sellerName:  a.seller?.full_name   || 'Vendedor',
        sellerColor: a.seller?.avatar_color || '#888',
        prospect:    prospectName,
        detail,
        amount,
        date:        dateISO,
        timeStr,
        kind:        a.kind,
        created_at:  a.created_at,
        details:     a.details || {},
      }
    })

    setActivities(mapped)
    setLoading(false)
  }, [limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: append new activities as they arrive
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('activities-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' },
        () => fetch()  // reload on new activity
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { activities, loading, reload: fetch }
}
