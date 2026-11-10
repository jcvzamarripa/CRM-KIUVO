import { supabase } from './supabase'
import { enqueue } from './offlineQueue'
import { putPhoto, getPhoto, deletePhoto } from './photoStore'

const DUPLICATE = '23505'

/**
 * Sube la foto, inserta la visita y la tarea de seguimiento.
 * Los ids los genera el teléfono, así que reintentar es seguro: lo que ya
 * existe en el servidor se toma como hecho.
 * Devuelve { verification, distance_m } calculados por el servidor (o null en un reintento).
 */
export async function sendCheckIn({ visit, task, photoBlob }) {
  let photo_path = null
  if (photoBlob) {
    const path = `${visit.seller_id}/${visit.id}.jpg`
    const { error } = await supabase.storage
      .from('visit-photos')
      .upload(path, photoBlob, { contentType: 'image/jpeg', upsert: false })
    if (error && !/exist|duplicate/i.test(error.message || '')) throw error
    photo_path = path
  }

  const { data, error } = await supabase
    .from('visits')
    .insert({ ...visit, photo_path })
    .select('verification, distance_m')
    .single()
  if (error && error.code !== DUPLICATE) throw error

  if (task) {
    const { error: taskErr } = await supabase.from('tasks').insert(task)
    if (taskErr && taskErr.code !== DUPLICATE) throw taskErr
  }

  return data || null
}

export async function queueCheckIn({ visit, task, photoBlob }) {
  let hasPhoto = false
  if (photoBlob) {
    try { await putPhoto(visit.id, photoBlob); hasPhoto = true } catch { /* sin IndexedDB: se envía sin foto */ }
  }
  enqueue({ type: 'CHECKIN', table: 'visits', payload: { visit, task, hasPhoto } })
}

export async function replayCheckIn(item) {
  const { visit, task, hasPhoto } = item.payload
  const photoBlob = hasPhoto ? await getPhoto(visit.id).catch(() => null) : null
  await sendCheckIn({ visit, task, photoBlob })
  if (hasPhoto) deletePhoto(visit.id).catch(() => {})
}
