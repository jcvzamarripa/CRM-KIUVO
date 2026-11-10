const GOOD_ACCURACY_M = 30

/**
 * Lee la ubicación con GPS de alta precisión. Sigue afinando hasta lograr
 * ≤ 30 m o agotar `settleMs`, y entrega la mejor lectura obtenida.
 * Rechaza con { code } de GeolocationPositionError (1 = permiso denegado).
 */
export function getPosition({ settleMs = 8000, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject({ code: 0 }); return }

    let best = null
    let watchId = null
    let settleTimer = null

    const finish = () => {
      clearTimeout(settleTimer)
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
      watchId = null
    }

    watchId = navigator.geolocation.watchPosition(
      pos => {
        const reading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }
        if (!best || reading.accuracy < best.accuracy) best = reading
        if (best.accuracy <= GOOD_ACCURACY_M) { finish(); resolve(best) }
      },
      err => {
        finish()
        if (best) resolve(best)
        else reject({ code: err?.code ?? 0 })
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    )

    settleTimer = setTimeout(() => {
      if (!best) return // sin lectura aún: que decida el timeout del propio GPS
      finish()
      resolve(best)
    }, settleMs)
  })
}

export function distanceM(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null
  const rad = d => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(h)))
}

export function fmtDistance(m) {
  if (m == null) return ''
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}
