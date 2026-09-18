/**
 * saveFile — entrega un archivo generado en el navegador (PDF, CSV) sin
 * romper Safari en iPhone.
 *
 * El patrón clásico `<a href={blobUrl} download>` + click funciona en
 * Android y escritorio, pero en iOS Safari ignora `download` y NAVEGA la
 * pestaña del CRM al blob. En cuanto el blob se revoca —o iOS recarga la
 * pestaña tras liberar memoria— el vendedor queda atrapado en
 * "Error de WebKitBlobResource 1" y ya no ve la app.
 *
 * En iOS usamos la hoja de compartir nativa (Guardar en Archivos, WhatsApp,
 * Mail…), que nunca navega. La hoja exige un toque reciente: si el archivo
 * tardó en generarse y iOS ya no acepta el gesto, mostramos un botón para
 * que el vendedor dé un toque nuevo.
 *
 * @returns {Promise<'downloaded'|'shared'|'cancelled'|'dismissed'>}
 */

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS se anuncia como Mac de escritorio
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export async function saveFile(blob, filename) {
  if (isIOS()) return saveOnIOS(blob, filename)

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revocar de inmediato puede cortar la descarga en algunos navegadores
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}

async function saveOnIOS(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // NotAllowedError: el gesto del usuario expiró mientras se generaba
    }
  }
  return askForTap(file, filename)
}

/**
 * Tarjeta flotante con un botón: el toque del vendedor habilita la hoja de
 * compartir. Sin hoja de compartir (iOS < 15) abre el archivo en una pestaña
 * NUEVA, para que la del CRM nunca quede apuntando a un blob.
 */
function askForTap(file, filename) {
  return new Promise(resolve => {
    const root = document.createElement('div')
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', 'Archivo listo')
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'background:rgba(0,0,0,0.45)',
      'display:flex', 'align-items:flex-end', 'justify-content:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    ].join(';')

    const card = document.createElement('div')
    card.style.cssText = [
      'width:100%', 'max-width:480px', 'box-sizing:border-box',
      'background:#fff', 'color:#1C1B19',
      'border-radius:20px 20px 0 0',
      'padding:22px 20px calc(22px + env(safe-area-inset-bottom))',
      'display:flex', 'flex-direction:column', 'gap:12px',
    ].join(';')

    const title = document.createElement('div')
    title.textContent = 'Tu archivo está listo'
    title.style.cssText = 'font-size:17px;font-weight:600'

    const name = document.createElement('div')
    name.textContent = filename
    name.style.cssText = 'font-size:13px;color:#55544F;word-break:break-word'

    const primary = document.createElement('button')
    primary.type = 'button'
    primary.textContent = 'Guardar o compartir'
    primary.style.cssText = [
      'margin-top:6px', 'padding:14px', 'border:0', 'border-radius:12px',
      'background:#1C6EF2', 'color:#fff', 'font-size:15px', 'font-weight:600',
    ].join(';')

    const secondary = document.createElement('button')
    secondary.type = 'button'
    secondary.textContent = 'Cerrar'
    secondary.style.cssText = [
      'padding:10px', 'border:0', 'background:transparent',
      'color:#6E6D69', 'font-size:14px',
    ].join(';')

    let url = null
    const close = result => {
      root.remove()
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60_000)
      resolve(result)
    }

    primary.addEventListener('click', async () => {
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename })
          close('shared')
        } catch (err) {
          if (err?.name === 'AbortError') close('cancelled')
          // cualquier otro error: dejar la tarjeta para reintentar
        }
        return
      }
      url = URL.createObjectURL(file)
      window.open(url, '_blank')
      close('downloaded')
    })
    secondary.addEventListener('click', () => close('dismissed'))
    root.addEventListener('click', e => { if (e.target === root) close('dismissed') })

    card.append(title, name, primary, secondary)
    root.append(card)
    document.body.append(root)
  })
}
