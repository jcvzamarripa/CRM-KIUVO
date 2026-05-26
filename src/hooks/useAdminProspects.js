import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_PROSPECTS } from '../constants/mockData'

/**
 * Hook para obtener prospectos en el panel admin (todos los vendedores).
 * Retorna prospects con shape compatible con MOCK_PROSPECTS.
 */
export function useAdminProspects() {
  const [prospects, setProspects] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProspects(MOCK_PROSPECTS)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('prospects')
      .select(`
        id, name, company, phone, email, address,
        lat, lng, stage_id, value, notes,
        health, days_in_stage, last_contact_at,
        created_at, updated_at,
        owner:profiles!owner_id (
          id, full_name, initials, avatar_color
        ),
        visits:visits(count)
      `)
      .order('created_at', { ascending: false })

    if (error || !data) {
      setProspects(MOCK_PROSPECTS)
      setLoading(false)
      return
    }

    const mapped = data.map(p => ({
      id:      p.id,
      name:    p.name,
      company: p.company || '',
      contact: p.company || p.name,
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
      days:    p.days_in_stage || 0,
      last_contact_at: p.last_contact_at,
      created_at:      p.created_at,
      // Seller info
      owner:       p.owner?.initials  || '?',
      owner_id:    p.owner?.id        || null,
      owner_name:  p.owner?.full_name || 'Sin asignar',
      owner_color: p.owner?.avatar_color || '#888',
      // Visit count
      visits: p.visits?.[0]?.count ?? 0,
    }))

    setProspects(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { prospects, loading, reload: fetch }
}
