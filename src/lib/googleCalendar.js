const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
    document.head.appendChild(s)
  })
}

export async function initGoogleAuth() {
  await loadScript('https://accounts.google.com/gsi/client')
}

export function requestToken(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services no está disponible'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return }
        resolve(resp.access_token)
      },
      error_callback: (err) => reject(new Error(err.message || 'Error de autenticación')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export async function fetchCalendarList(token) {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  const data = await res.json()
  return data.items || []
}

export async function fetchEvents(token, calendarId = 'primary', from, to) {
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  const data = await res.json()
  return (data.items || []).map(item => {
    const start = new Date(item.start?.dateTime || item.start?.date + 'T00:00:00')
    const end   = new Date(item.end?.dateTime   || item.end?.date   + 'T00:00:00')
    const duration = Math.round((end - start) / 60000) || 60
    return {
      id: 'gc-' + item.id,
      title: item.summary || '(Sin título)',
      type: 'other',
      date: start,
      duration,
      activity: item.description || '',
      address: item.location || '',
      notes: item.description || '',
      stage: null,
      source: 'google',
      googleEventId: item.id,
      notified: false,
    }
  })
}

export async function createEvent(token, calendarId = 'primary', event) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const body = {
    summary: event.title,
    location: event.address || undefined,
    description: event.notes || undefined,
    start: { dateTime: event.date.toISOString(), timeZone: tz },
    end:   { dateTime: new Date(event.date.getTime() + (event.duration || 60) * 60000).toISOString(), timeZone: tz },
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`Create event failed ${res.status}`)
  return await res.json()
}
