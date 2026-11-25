import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * La ruta del vendedor que está usando la app.
 *
 * No filtra por vendedor: las reglas de la base ya hacen que cada quien
 * vea solo las suyas. Si el día de hoy no tiene ruta, agarra la pendiente
 * más próxima — el vendedor que se atrasó un día sigue teniendo trabajo
 * en lugar de una pantalla vacía.
 */
export function useMiRuta() {
  const [rutas,    setRutas]    = useState([])
  const [rutaId,   setRutaId]   = useState(null)
  const [paradas,  setParadas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const cargarRutas = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true); setError(null)

    const { data, error: err } = await supabase
      .from('v_mi_ruta')
      .select('*')
      .neq('status', 'cancelada')
      .order('fecha')

    if (err) { setError(err.message); setLoading(false); return }

    const lista = data || []
    setRutas(lista)

    // La de hoy; si no hay, la primera que siga pendiente
    const d = hoy()
    const elegida =
      lista.find(r => r.fecha === d && r.status !== 'terminada') ||
      lista.find(r => r.status !== 'terminada') ||
      lista[0]
    setRutaId(prev => prev || elegida?.id || null)
    setLoading(false)
  }, [])

  useEffect(() => { cargarRutas() }, [cargarRutas])

  // Las paradas de la ruta elegida, en orden de caminata
  useEffect(() => {
    if (!rutaId || !isSupabaseConfigured) { setParadas([]); return }
    let vigente = true
    supabase
      .from('v_paradas')
      .select('*')
      .eq('route_id', rutaId)
      .order('orden')
      .then(({ data, error: err }) => {
        if (!vigente) return
        if (err) { setError(err.message); return }
        setParadas(data || [])
      })
    return () => { vigente = false }
  }, [rutaId])

  /** Marca una parada con el resultado. outcome null la devuelve a pendiente. */
  const marcarParada = useCallback(async (stopId, outcome, notas) => {
    if (!isSupabaseConfigured) return { error: 'Sin conexión' }
    const { error: err } = await supabase.rpc('marcar_parada', {
      p_stop_id: stopId, p_outcome: outcome, p_notas: notas ?? null,
    })
    if (err) return { error: err.message }

    // Refleja el cambio de inmediato para que el vendedor no espere
    setParadas(prev => prev.map(p => p.id === stopId
      ? { ...p, status: outcome ? 'hecha' : 'pendiente', outcome }
      : p))
    setRutas(prev => prev.map(r => r.id === rutaId
      ? { ...r, hechas: Number(r.hechas) + (outcome ? 1 : -1) }
      : r))
    return {}
  }, [rutaId])

  /** Corrige el turno de un negocio. Lo que se marca en campo ya no se pisa. */
  const corregirTurno = useCallback(async (businessId, turnos) => {
    if (!isSupabaseConfigured) return { error: 'Sin conexión' }
    const { error: err } = await supabase.rpc('corregir_turno', {
      p_business_id: businessId, p_turnos: turnos,
    })
    if (err) return { error: err.message }
    return {}
  }, [])

  const ruta = rutas.find(r => r.id === rutaId) || null

  return {
    rutas, ruta, rutaId, setRutaId, paradas,
    loading, error, reload: cargarRutas,
    marcarParada, corregirTurno,
  }
}

export default useMiRuta
