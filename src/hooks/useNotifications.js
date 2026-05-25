import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, kind, title, body, read, prospect_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)
    setItems(data ?? [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Realtime — new notifications pushed from DB triggers
  useEffect(() => {
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setItems(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user.id])

  const markRead = useCallback(async (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAll = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }, [user.id])

  return {
    items,
    loading,
    unreadCount: items.filter(n => !n.read).length,
    markRead,
    markAll,
  }
}
