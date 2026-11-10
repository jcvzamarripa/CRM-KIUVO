/**
 * Abre la cámara (o la galería si no hay) y resuelve con el archivo elegido,
 * o null si el usuario cancela.
 * El input se crea en document.body: en iOS Safari los file inputs dentro de
 * contenedores con overflow:hidden no abren la cámara.
 */
export function pickPhoto() {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if ('capture' in HTMLInputElement.prototype) input.capture = 'environment'
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
    document.body.appendChild(input)

    let settled = false
    const done = file => {
      if (settled) return
      settled = true
      if (document.body.contains(input)) document.body.removeChild(input)
      resolve(file || null)
    }

    input.addEventListener('change', () => done(input.files?.[0]))
    input.addEventListener('cancel', () => done(null))
    input.click()
  })
}

/** Reduce la foto a JPEG de máx. `maxSide` px para que suba rápido con datos móviles. */
export async function compressImage(file, { maxSide = 1280, quality = 0.72 } = {}) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob || file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
