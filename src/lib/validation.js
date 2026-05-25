// ── Shared validation helpers ──────────────────────────────────────────────────
// Returns null if valid, or a string error message if invalid.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Strip everything that's not a digit */
export const digitsOnly = s => String(s).replace(/\D/g, '')

export const rules = {
  /**
   * Required: value must be non-empty after trimming.
   * @param {string} v
   * @param {string} [label]
   */
  required(v, label = 'Este campo') {
    return v?.toString().trim() ? null : `${label} es requerido`
  },

  /**
   * Phone: optional field — if filled, must have 10 digits (MX mobile)
   * or 12 digits starting with 52 (international MX format).
   * @param {string} v
   */
  phone(v) {
    if (!v?.trim()) return null                      // field is optional
    const d = digitsOnly(v)
    if (d.length === 10) return null                 // 10-digit MX
    if (d.length === 12 && d.startsWith('52')) return null  // +52 + 10 digits
    return 'Ingresa un teléfono válido (10 dígitos)'
  },

  /**
   * Email: optional field — if filled, must match basic email pattern.
   * @param {string} v
   */
  email(v) {
    if (!v?.trim()) return null                      // field is optional
    return EMAIL_RE.test(v.trim()) ? null : 'Ingresa un correo electrónico válido'
  },

  /**
   * Numeric range: optional field — if filled, must be a number within [min, max].
   * @param {string|number} v
   * @param {number} min
   * @param {number} max
   * @param {string} [label]
   */
  numRange(v, min, max, label = 'El valor') {
    const str = String(v ?? '').trim()
    if (!str) return null                            // field is optional
    const n = parseFloat(str.replace(/[^0-9.\-]/g, ''))
    if (isNaN(n))  return `${label} debe ser un número`
    if (n < min)   return `${label} mínimo es ${min}`
    if (n > max)   return `${label} máximo es ${max.toLocaleString('es-MX')}`
    return null
  },
}

/**
 * Run a map of { fieldName: errorStringOrNull } and return only the ones
 * that have an error. Returns an empty object when everything is valid.
 *
 * Usage:
 *   const errs = collectErrors({
 *     name:  rules.required(form.name, 'Empresa'),
 *     phone: rules.phone(form.phone),
 *   })
 *   if (Object.keys(errs).length) { setErrors(errs); return }
 */
export function collectErrors(map) {
  return Object.fromEntries(
    Object.entries(map).filter(([, v]) => v !== null)
  )
}
