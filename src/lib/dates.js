// Fechas en hora local del teléfono. toISOString() es UTC y en México
// cambia de día a las 6 pm.

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(n, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + n)
  return d
}

export function dayStartISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

export function monthStartISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM-DD' → "Hoy", "Mañana", "Ayer" o "12 nov" */
export function relativeDay(dateStr) {
  if (!dateStr) return ''
  if (dateStr === localDateStr()) return 'Hoy'
  if (dateStr === localDateStr(addDays(1))) return 'Mañana'
  if (dateStr === localDateStr(addDays(-1))) return 'Ayer'
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
