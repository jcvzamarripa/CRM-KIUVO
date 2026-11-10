import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr, addDays, dayStartISO } from '../lib/dates'

/**
 * Tareas del vendedor: pendientes hasta 7 días adelante (incluye vencidas)
 * más las que completó hoy.
 */
export function useTasks(sellerId) {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sellerId || !supabase) { setLoading(false); return }
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, kind, due_date, done_at, prospect_id, created_by, prospect:prospects ( name )')
      .eq('seller_id', sellerId)
      .lte('due_date', localDateStr(addDays(7)))
      .or(`done_at.is.null,done_at.gte.${dayStartISO()}`)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) console.warn('[useTasks]', error.message)
    setTasks(data ?? [])
    setLoading(false)
  }, [sellerId])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (task) => {
    if (!supabase) return
    const done_at = task.done_at ? null : new Date().toISOString()
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, done_at } : t))
    const { error } = await supabase.from('tasks').update({ done_at }).eq('id', task.id)
    if (error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, done_at: task.done_at } : t))
  }, [])

  const add = useCallback(async ({ title, due_date = localDateStr(), prospect_id = null, kind = 'other' }) => {
    if (!supabase) return false
    const row = {
      id: crypto.randomUUID(),
      seller_id: sellerId, created_by: sellerId,
      title, due_date, prospect_id, kind,
    }
    setTasks(ts => [...ts, { ...row, done_at: null, prospect: null }])
    const { error } = await supabase.from('tasks').insert(row)
    if (error) { setTasks(ts => ts.filter(t => t.id !== row.id)); return false }
    return true
  }, [sellerId])

  const remove = useCallback(async (task) => {
    if (!supabase) return
    setTasks(ts => ts.filter(t => t.id !== task.id))
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) load()
  }, [load])

  return { tasks, loading, reload: load, toggle, add, remove }
}
