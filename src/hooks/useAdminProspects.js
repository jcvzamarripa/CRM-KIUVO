import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function fmtLast(ts) {
  if (!ts) return 'Sin contacto'
  const diff = Math.floor((Date.now() - new Date(ts)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7)  return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} sem.`
  return `Hace ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? 'es' : ''}`
}

export function useAdminProspects() {
  const [prospects, setProspects] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProspects([])
      setLoading(false)
      return
    }

    setLoading(true)

    const [{ data, error }, { data: visits }, { data: quotes }] = await Promise.all([
      supabase
        .from('prospects')
        .select(`
          id, name, company, contact, phone, email, address,
          lat, lng, stage_id, value, notes,
          health, days_in_stage, stage_entered_at, last_contact_at,
          created_at, updated_at,
          owner:profiles (
            id, full_name, initials, avatar_color
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('visits')
        .select('prospect_id, created_at'),
      // Última cotización por prospecto para mostrar valor si prospect.value = 0
      supabase
        .from('quotes')
        .select('prospect_id, total')
        .in('status', ['sent', 'approved'])
        .order('created_at', { ascending: false }),
    ])

    if (error || !data) {
      console.warn('[useAdminProspects]', error?.message)
      setProspects([])
      setLoading(false)
      return
    }

    // Visitas por prospecto (con fecha de la última)
    const visitCounts   = {}
    const lastVisitDate = {}
    for (const v of visits || []) {
      visitCounts[v.prospect_id]   = (visitCounts[v.prospect_id] ?? 0) + 1
      if (!lastVisitDate[v.prospect_id] || v.created_at > lastVisitDate[v.prospect_id]) {
        lastVisitDate[v.prospect_id] = v.created_at
      }
    }

    // Valor de la última cotización por prospecto (si prospect.value = 0)
    const quoteValue = {}
    for (const q of quotes || []) {
      if (!quoteValue[q.prospect_id]) quoteValue[q.prospect_id] = Number(q.total) || 0
    }

    const mapped = data.map(p => {
      const enteredAt = p.stage_entered_at ? new Date(p.stage_entered_at) : null
      const days = enteredAt
        ? Math.max(0, Math.floor((Date.now() - enteredAt.getTime()) / 86400000))
        : (p.days_in_stage ?? 0)

      // Último contacto: last_contact_at → última visita → created_at (fallback)
      const lastContact = p.last_contact_at
        || lastVisitDate[p.id]
        || p.created_at

      // Valor: campo del prospecto → última cotización enviada/aprobada → 0
      const value = (p.value && p.value > 0)
        ? p.value
        : (quoteValue[p.id] || 0)

      // Visitas: mínimo 1 si el prospecto ya fue registrado (implica contacto inicial)
      const visitCount = Math.max(1, visitCounts[p.id] ?? 0)

      return {
        id:      p.id,
        name:    p.name,
        company: p.company || '',
        contact: p.contact || p.company || p.name,
        phone:   p.phone   || '',
        email:   p.email   || '',
        address: p.address || '',
        lat:     p.lat,
        lng:     p.lng,
        stage:   p.stage_id || 'prospeccion',
        stage_id:p.stage_id || 'prospeccion',
        value,
        notes:   p.notes   || '',
        health:  p.health  || 'green',
        days,
        last:            fmtLast(lastContact),
        last_contact_at: lastContact,
        created_at:      p.created_at,
        owner:       p.owner?.initials     || '?',
        owner_id:    p.owner?.id           || null,
        owner_name:  p.owner?.full_name    || 'Sin asignar',
        owner_color: p.owner?.avatar_color || '#888',
        visits: visitCount,
      }
    })

    setProspects(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { prospects, loading, reload: fetch }
}
