import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Paleta de colores para asignar automáticamente
const COLORS = ['#185FA5', '#378ADD', '#D85A30', '#1D9E75', '#EF9F27', '#9B59B6', '#E74C3C', '#2ECC71']

/**
 * Hook para obtener la lista de vendedores desde Supabase.
 */
export function useSellers() {
  const [sellers,  setSellers]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSellers([])
      setLoading(false)
      return
    }
    fetchSellers()
  }, [])

  async function fetchSellers() {
    setLoading(true)

    // Perfiles de vendedores
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, initials, avatar_color, goal_amount, position')
      .eq('role', 'seller')
      .order('full_name')

    if (error || !profiles) {
      console.warn('[useSellers] profiles error:', error?.message)
      setSellers([])
      setLoading(false)
      return
    }

    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

    // Cotizaciones aprobadas (reemplaza tabla sales)
    const [
      { data: allQuotes },
      { data: prospectCounts },
      { data: lastVisits },
      { data: lastQuotes },
    ] = await Promise.all([
      supabase
        .from('quotes')
        .select('seller_id, total, created_at')
        .eq('status', 'approved'),
      supabase
        .from('prospects')
        .select('owner_id'),
      supabase
        .from('visits')
        .select('seller_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('quotes')
        .select('seller_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    // Mapa: prospectos por vendedor
    const prospectMap = {}
    ;(prospectCounts || []).forEach(p => {
      prospectMap[p.owner_id] = (prospectMap[p.owner_id] || 0) + 1
    })

    // Mapa: ganado total y del mes actual
    const wonMap     = {}
    const currentMap = {}
    ;(allQuotes || []).forEach(q => {
      const amt = Number(q.total || 0)
      wonMap[q.seller_id] = (wonMap[q.seller_id] || 0) + amt
      if (q.created_at >= monthStart.toISOString()) {
        currentMap[q.seller_id] = (currentMap[q.seller_id] || 0) + amt
      }
    })

    // Mapa: último acceso = max(última visita, última cotización)
    const lastSeenMap = {}
    const trackDate = (id, iso) => {
      if (!iso) return
      if (!lastSeenMap[id] || iso > lastSeenMap[id]) lastSeenMap[id] = iso
    }
    ;(lastVisits || []).forEach(v => trackDate(v.seller_id, v.created_at))
    ;(lastQuotes || []).forEach(q => trackDate(q.seller_id, q.created_at))

    function fmtLastSeen(iso) {
      if (!iso) return '—'
      const d    = new Date(iso)
      const now  = new Date()
      const diff = Math.floor((now - d) / 86400000)
      if (diff === 0) return 'Hoy'
      if (diff === 1) return 'Ayer'
      if (diff < 7)  return `Hace ${diff} días`
      return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    }

    const mapped = profiles.map((p, i) => {
      const goal    = p.goal_amount || 150000
      const current = currentMap[p.id] || 0
      return {
        id:         p.id,
        name:       p.full_name,
        init:       p.initials,
        color:      p.avatar_color || COLORS[i % COLORS.length],
        goal,
        current,
        compliance: goal > 0 ? Math.round((current / goal) * 100) : 0,
        prospects:  prospectMap[p.id] || 0,
        stuck:      0,
        won:        wonMap[p.id] || 0,
        position:   p.position || 'Vendedor',
        lastSeen:   fmtLastSeen(lastSeenMap[p.id]),
      }
    })

    setSellers(mapped)
    setLoading(false)
  }

  return { sellers, loading, reload: fetchSellers }
}
