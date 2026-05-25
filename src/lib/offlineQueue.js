// ── Offline queue — localStorage-backed operation log ─────────────────────────
// Each item: { id, timestamp, type, table, payload }
// Consumers enqueue when Supabase is unreachable; OfflineBanner replays on reconnect.

const KEY = 'kiuvo_offline_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function enqueue({ type, table, payload }) {
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
}

export function dequeue(id) {
  const next = getQueue().filter(i => i.id !== id)
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearQueue() {
  localStorage.removeItem(KEY)
}

export function getQueueCount() {
  return getQueue().length
}
