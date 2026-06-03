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

    const [{ data, error }, { data: visits }] = await Promise.all([
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
        .select('prospect_id'),
    ])

    if (error || !data) {
      console.warn('[useAdminProspects]', error?.message)
      setProspects([])
      setLoading(false)
      return
    }

    const visitCounts = {}
    visits?.forEach(v => { visitCounts[v.prospect_id] = (visitCounts[v.prospect_id] ?? 0) + 1 })

    const mapped = data.map(p => {
      const enteredAt = p.stage_entered_at ? new Date(p.stage_entered_at) : null
      const days = enteredAt
        ? Math.max(0, Math.floor((Date.now() - enteredAt.getTime()) / 86400000))
        : (p.days_in_stage ?? 0)

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
        value:   p.value   || 0,
        notes:   p.notes   || '',
        health:  p.health  || 'green',
        days,
        last:            fmtLast(p.last_contact_at),
        last_contact_at: p.last_contact_at,
        created_at:      p.created_at,
        owner:       p.owner?.initials  || '?',
        owner_id:    p.owner?.id        || null,
        owner_name:  p.owner?.full_name || 'Sin asignar',
        owner_color: p.owner?.avatar_color || '#888',
        visits: visitCounts[p.id] ?? 0,
      }
    })

    setProspects(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { prospects, loading, reload: fetch }
}
