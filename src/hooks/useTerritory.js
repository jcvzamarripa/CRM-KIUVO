import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Zonas y sectores de cambaceo, con su polígono listo para dibujar.
 *
 * Las vistas v_zonas_mapa y v_sectores_mapa ya entregan el polígono
 * convertido a GeoJSON y el avance calculado, así que esto es una sola
 * consulta por tabla en lugar de una por sector.
 */
export function useTerritory() {
  const [zonas,    setZonas]    = useState([])
  const [sectores, setSectores] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const [zRes, sRes] = await Promise.all([
      supabase.from('v_zonas_mapa').select('*'),
      supabase.from('v_sectores_mapa').select('*'),
    ])

    if (zRes.error || sRes.error) {
      setError(zRes.error?.message || sRes.error?.message)
      setLoading(false)
      return
    }

    setZonas(zRes.data || [])
    setSectores(sRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /** Los negocios de un sector, con nombre, dirección y teléfono. */
  const cargarNegocios = useCallback(async sectorId => {
    if (!isSupabaseConfigured || !sectorId) return []
    const { data, error: err } = await supabase
      .from('v_negocios_sector')
      .select('*')
      .eq('sector_id', sectorId)
      .order('nombre')
    if (err) { console.warn('[useTerritory] negocios:', err.message); return [] }
    return data || []
  }, [])

  /** Las rutas de día de un sector. */
  const cargarRutas = useCallback(async sectorId => {
    if (!isSupabaseConfigured || !sectorId) return []
    const { data, error: err } = await supabase
      .from('v_rutas')
      .select('*')
      .eq('sector_id', sectorId)
      .order('fecha')
    if (err) { console.warn('[useTerritory] rutas:', err.message); return [] }
    return data || []
  }, [])

  /** Las paradas de una ruta, en el orden en que se caminan. */
  const cargarParadas = useCallback(async routeId => {
    if (!isSupabaseConfigured || !routeId) return []
    const { data, error: err } = await supabase
      .from('v_paradas')
      .select('*')
      .eq('route_id', routeId)
      .order('orden')
    if (err) { console.warn('[useTerritory] paradas:', err.message); return [] }
    return data || []
  }, [])

  /**
   * Parte un sector en rutas de día, en los tres turnos. Solo el admin.
   *
   * Empieza por la noche a propósito: un negocio abierto de noche casi
   * siempre abre también de tarde, pero no al revés. Si se reparte
   * primero la tarde, el turno nocturno queda vacío. Eso lo resuelve la
   * función de la base, aquí solo se la llama.
   */
  const generarRutas = useCallback(async (sectorCode, porDia = 35) => {
    if (!isSupabaseConfigured) return { error: 'Sin conexión a Supabase' }
    const { data, error: err } = await supabase.rpc('generar_rutas_completas', {
      p_code: sectorCode,
      p_por_dia: porDia,
    })
    if (err) return { error: err.message }
    return { resumen: data || [] }
  }, [])

  /** Asigna (o libera, con sellerId null) una ruta a un vendedor. */
  const asignarRuta = useCallback(async (routeId, sellerId) => {
    if (!isSupabaseConfigured) return { error: 'Sin conexión a Supabase' }
    const { error: err } = await supabase
      .from('routes')
      .update({ seller_id: sellerId, updated_at: new Date().toISOString() })
      .eq('id', routeId)
    if (err) return { error: err.message }
    return {}
  }, [])

  /** Asigna (o libera, con sellerId null) un sector a un vendedor. */
  const asignarSector = useCallback(async (sectorId, sellerId) => {
    if (!isSupabaseConfigured) return { error: 'Sin conexión a Supabase' }

    const { error: err } = await supabase
      .from('sectors')
      .update({ seller_id: sellerId, updated_at: new Date().toISOString() })
      .eq('id', sectorId)

    if (err) return { error: err.message }

    // Refleja el cambio de inmediato, sin esperar a recargar todo
    setSectores(prev => prev.map(s => s.id === sectorId ? { ...s, seller_id: sellerId } : s))
    return {}
  }, [])

  return {
    zonas, sectores, loading, error, reload: load, asignarSector,
    cargarNegocios, cargarRutas, cargarParadas, generarRutas, asignarRuta,
  }
}

export default useTerritory
