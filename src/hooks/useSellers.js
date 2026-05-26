import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_SELLERS } from '../constants/mockData'

// Paleta de colores para asignar automáticamente
const COLORS = ['#185FA5', '#378ADD', '#D85A30', '#1D9E75', '#EF9F27', '#9B59B6', '#E74C3C', '#2ECC71']

/**
 * Hook para obtener la lista de vendedores desde Supabase.
 * Retorna sellers con el mismo shape que MOCK_SELLERS para compatibilidad.
 */
export function useSellers() {
  const [sellers,  setSellers]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSellers(MOCK_SELLERS)
      setLoading(false)
      return
    }
    fetchSellers()
  }, [])

  async function fetchSellers() {
    setLoading(true)

    // Traer perfiles de vendedores
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, initials, avatar_color, goal_amount, position')
      .eq('role', 'seller')
      .order('full_name')

    if (error || !profiles) {
      setSellers(MOCK_SELLERS)
      setLoading(false)
      return
    }

    // Traer conteos de prospectos por vendedor
    const { data: prospectCounts } = await supabase
      .from('prospects')
      .select('owner_id')

    // Traer actividades recientes
    const { data: activities } = await supabase
      .from('activities')
      .select('seller_id, kind, details, created_at')
      .eq('kind', 'win')

    const prospectMap = {}
    ;(prospectCounts || []).forEach(p => {
      prospectMap[p.owner_id] = (prospectMap[p.owner_id] || 0) + 1
    })

    const wonMap = {}
    ;(activities || []).forEach(a => {
      const amount = a.details?.value || 0
      wonMap[a.seller_id] = (wonMap[a.seller_id] || 0) + amount
    })

    const mapped = profiles.map((p, i) => ({
      id:          p.id,
      name:        p.full_name,
      init:        p.initials,
      color:       p.avatar_color || COLORS[i % COLORS.length],
      goal:        p.goal_amount  || 100000,
      current:     0,   // se calculará cuando haya tabla de ventas
      prospects:   prospectMap[p.id] || 0,
      compliance:  0,
      stuck:       0,
      won:         wonMap[p.id] || 0,
      position:    p.position || 'Vendedor',
    }))

    setSellers(mapped)
    setLoading(false)
  }

  return { sellers, loading, reload: fetchSellers }
}
