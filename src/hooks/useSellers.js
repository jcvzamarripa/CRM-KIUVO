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

    // Traer perfiles de vendedores
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

    // Conteo de prospectos por vendedor
    const { data: prospectCounts } = await supabase
      .from('prospects')
      .select('owner_id')

    // Ventas totales (all-time) por vendedor — tabla sales puede no existir aún
    const { data: allSales } = await supabase
      .from('sales')
      .select('seller_id, amount')

    // Ventas del mes actual por vendedor → campo "current"
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const { data: monthlySales } = await supabase
      .from('sales')
      .select('seller_id, amount')
      .gte('closed_at', monthStart.toISOString())

    const prospectMap = {}
    ;(prospectCounts || []).forEach(p => {
      prospectMap[p.owner_id] = (prospectMap[p.owner_id] || 0) + 1
    })

    const wonMap = {}
    ;(allSales || []).forEach(s => {
      wonMap[s.seller_id] = (wonMap[s.seller_id] || 0) + Number(s.amount || 0)
    })

    const currentMap = {}
    ;(monthlySales || []).forEach(s => {
      currentMap[s.seller_id] = (currentMap[s.seller_id] || 0) + Number(s.amount || 0)
    })

    const mapped = profiles.map((p, i) => {
      const goal    = p.goal_amount || 100000
      const current = currentMap[p.id] || 0
      return {
        id:          p.id,
        name:        p.full_name,
        init:        p.initials,
        color:       p.avatar_color || COLORS[i % COLORS.length],
        goal,
        current,
        compliance:  goal > 0 ? Math.round((current / goal) * 100) : 0,
        prospects:   prospectMap[p.id] || 0,
        stuck:       0,
        won:         wonMap[p.id] || 0,
        position:    p.position || 'Vendedor',
      }
    })

    setSellers(mapped)
    setLoading(false)
  }

  return { sellers, loading, reload: fetchSellers }
}
