// Fotos pendientes de subir. Van en IndexedDB porque no caben en localStorage.

const DB_NAME = 'kiuvo-photos'
const STORE = 'photos'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const putPhoto    = (key, blob) => run('readwrite', s => s.put(blob, key))
export const getPhoto    = key => run('readonly', s => s.get(key))
export const deletePhoto = key => run('readwrite', s => s.delete(key))
