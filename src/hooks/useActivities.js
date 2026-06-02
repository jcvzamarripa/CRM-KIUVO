import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
  win:      'cerró venta en',
  visit:    'registró visita en',
  quote:    'envió cotización a',
  add:      'agregó prospecto',
  stage:    'avanzó etapa de',
  msg:      'envió mensaje a',
  call:     'llamó a',
  whatsapp: 'envió WhatsApp a',
  email:    'envió email a',
  new:      'agregó prospecto',
}

export function useActivities({ limit = 50 } = {}) {
  const [activities, setActivities] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    // Sellers write to the 'visits' table (VisitModal + Kanban actions).
    // Read from there to surface real seller activity.
    const { data, error } = await supabase
      .from('visits')
      .select(`
        id, kind, notes, created_at,
        seller:profiles ( full_name, initials, avatar_color ),
        prospect:prospects ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) {
      console.warn('[useActivities]', error?.message)
      setActivities([])
      setLoading(false)
      return
    }

    const mapped = data.map(v => {
      const prospectName = v.prospect?.name || ''
      const dt      = new Date(v.created_at)
      const dateISO = dt.toISOString().slice(0, 10)
      const timeStr = dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

      return {
        id:          v.id,
        // ActivityFeed shape
        who:         v.seller?.full_name    || 'Vendedor',
        what:        KIND_LABELS[v.kind]    || v.kind,
        target:      prospectName,
        time:        fmtTime(v.created_at),
        // ActivitiesView / ReportsView shape
        sellerInit:  v.seller?.initials     || '?',
        sellerName:  v.seller?.full_name    || 'Vendedor',
        sellerColor: v.seller?.avatar_color || '#888',
        prospect:    prospectName,
        detail:      v.notes || '',
        amount:      '',
        date:        dateISO,
        timeStr,
        kind:        v.kind,
        created_at:  v.created_at,
        details:     {},
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
      .channel('visits-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visits' },
        () => fetch()
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { activities, loading, reload: fetch }
}
