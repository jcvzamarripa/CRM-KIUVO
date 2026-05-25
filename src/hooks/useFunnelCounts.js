import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STAGES } from '../constants/stages'

export function useFunnelCounts() {
  const { user } = useAuth()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('prospects')
      .select('stage_id, health')
      .eq('owner_id', user.id)

    // Build per-stage counts from the flat list
    const map = {}
    STAGES.forEach(s => { map[s.id] = { count: 0, risk: 0, stuck: 0 } })
    data?.forEach(p => {
      const s = map[p.stage_id]
      if (!s) return
      s.count++
      if (p.health === 'amber') s.risk++
      if (p.health === 'red')   s.stuck++
    })

    setRows(STAGES.map(s => ({ id: s.id, ...map[s.id] })))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Realtime — reload counts on any prospect change for this user
  useEffect(() => {
    const ch = supabase
      .channel(`funnel-counts-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prospects',
        filter: `owner_id=eq.${user.id}`,
      }, load)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user.id, load])

  return { rows, loading }
}
