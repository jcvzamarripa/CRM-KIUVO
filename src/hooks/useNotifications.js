import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Auto-discard notifications older than this many days
const MAX_AGE_DAYS = 7

export function useNotifications() {
  const { user } = useAuth()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString()

    // Delete stale notifications silently (fire and forget)
    supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .lt('created_at', cutoff)

    const { data } = await supabase
      .from('notifications')
      .select('id, kind, title, body, read, prospect_id, screen, stage, created_at')
      .eq('user_id', user.id)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(40)
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
        setItems(prev => [payload.new, ...prev.slice(0, 39)])
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user.id])

  // Mark read (no longer navigates — just visual update)
  const markRead = useCallback(async (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  // Dismiss one notification (delete from DB + remove from state)
  const dismiss = useCallback(async (id) => {
    setItems(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }, [])

  // Dismiss all read notifications
  const dismissRead = useCallback(async () => {
    setItems(prev => prev.filter(n => !n.read))
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true)
  }, [user.id])

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
    dismiss,
    dismissRead,
  }
}
