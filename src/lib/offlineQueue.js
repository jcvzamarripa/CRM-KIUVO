// ── Offline queue — localStorage-backed operation log ─────────────────────────
// Each item: { id, timestamp, type, table, payload }
// Consumers enqueue when Supabase is unreachable; OfflineBanner replays on reconnect.

const KEY = 'kiuvo_offline_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function enqueue({ type, table, payload }) {
  try {
    const queue = getQueue()
    const item = {
      id:        `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      table,
      payload,
    }
    queue.push(item)
    localStorage.setItem(KEY, JSON.stringify(queue))
    return item
  } catch (e) {
    console.warn('[offlineQueue] enqueue failed (storage unavailable):', e?.message)
    return null
  }
}

export function dequeue(id) {
  try {
    const next = getQueue().filter(i => i.id !== id)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('[offlineQueue] dequeue failed (storage unavailable):', e?.message)
  }
}

export function clearQueue() {
  try { localStorage.removeItem(KEY) } catch {}
}

export function getQueueCount() {
  return getQueue().length
}
