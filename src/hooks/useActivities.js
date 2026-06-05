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

// Mapeo de kind → texto legible para el feed
const KIND_LABELS = {
  visit:    'registró visita en',
  call:     'llamó a',
  whatsapp: 'envió WhatsApp a',
  email:    'envió email a',
  win:      'cerró venta en',
  quote:    'envió cotización a',
  add:      'agregó prospecto',
  stage:    'avanzó etapa de',
  msg:      'envió mensaje a',
  sent:     'envió cotización a',
  approved: 'cerró venta en',
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

    // Consulta 1: visits (sin 'kind' para evitar error si la columna no existe en la BD)
    const visitsPromise = supabase
      .from('visits')
      .select(`
        id, notes, created_at,
        seller:profiles ( full_name, initials, avatar_color ),
        prospect:prospects ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Consulta 2: quotes enviadas/aprobadas recientes
    const quotesPromise = supabase
      .from('quotes')
      .select(`
        id, status, total, created_at,
        seller:profiles ( full_name, initials, avatar_color ),
        prospect:prospects ( name )
      `)
      .in('status', ['sent', 'approved'])
      .order('created_at', { ascending: false })
      .limit(20)

    // Consulta 3: activities (CRM events — puede estar vacía)
    const activitiesPromise = supabase
      .from('activities')
      .select(`
        id, kind, created_at,
        seller:profiles ( full_name, initials, avatar_color ),
        prospect:prospects ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    const [visitsRes, quotesRes, activitiesRes] = await Promise.all([
      visitsPromise,
      quotesPromise,
      activitiesPromise,
    ])

    const items = []

    // Visits → siempre tratar como 'visit'
    for (const v of visitsRes.data || []) {
      items.push({
        id:          v.id + '-visit',
        kind:        'visit',
        who:         v.seller?.full_name  || 'Vendedor',
        what:        KIND_LABELS.visit,
        target:      v.prospect?.name    || '',
        time:        fmtTime(v.created_at),
        created_at:  v.created_at,
        sellerInit:  v.seller?.initials     || '?',
        sellerName:  v.seller?.full_name    || 'Vendedor',
        sellerColor: v.seller?.avatar_color || '#888',
        detail:      v.notes || '',
        amount:      '',
      })
    }

    // Quotes → kind basado en status
    for (const q of quotesRes.data || []) {
      const kind = q.status === 'approved' ? 'win' : 'quote'
      const amount = q.total > 0
        ? `$${q.total >= 1000 ? (q.total / 1000).toFixed(0) + 'k' : q.total}`
        : ''
      items.push({
        id:          q.id + '-quote',
        kind,
        who:         q.seller?.full_name  || 'Vendedor',
        what:        KIND_LABELS[q.status] || KIND_LABELS.quote,
        target:      q.prospect?.name    || '',
        time:        fmtTime(q.created_at),
        created_at:  q.created_at,
        sellerInit:  q.seller?.initials     || '?',
        sellerName:  q.seller?.full_name    || 'Vendedor',
        sellerColor: q.seller?.avatar_color || '#888',
        detail:      '',
        amount,
      })
    }

    // Activities table (CRM events — solo si tiene datos)
    for (const a of activitiesRes.data || []) {
      items.push({
        id:          a.id + '-act',
        kind:        a.kind || 'visit',
        who:         a.seller?.full_name  || 'Vendedor',
        what:        KIND_LABELS[a.kind] || a.kind,
        target:      a.prospect?.name   || '',
        time:        fmtTime(a.created_at),
        created_at:  a.created_at,
        sellerInit:  a.seller?.initials     || '?',
        sellerName:  a.seller?.full_name    || 'Vendedor',
        sellerColor: a.seller?.avatar_color || '#888',
        detail:      '',
        amount:      '',
      })
    }

    // Ordenar por fecha descendente y limitar
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setActivities(items.slice(0, limit))
    setLoading(false)
  }, [limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: refrescar al insertar visitas o quotes
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visits' },   () => fetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' },   () => fetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes' },   () => fetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities'},() => fetch())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { activities, loading, reload: fetch }
}
