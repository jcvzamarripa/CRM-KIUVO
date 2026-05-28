import React, { useState, useRef } from 'react'
import Icon from '../shared/Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { rules } from '../../lib/validation'
import { enqueue } from '../../lib/offlineQueue'
import useOnlineStatus from '../../hooks/useOnlineStatus'

const EMPLOYEE_RANGES = ['1–10', '11–50', '51–200', '201–500', '500+']

function CameraIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3L14.5 4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function GpsPinIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z" />
      <circle cx="12" cy="9" r="2.5" />
      <line x1="12" y1="2" x2="12" y2="0.5" />
      <line x1="12" y1="21.5" x2="12" y2="23" />
      <line x1="2" y1="9" x2="0.5" y2="9" />
      <line x1="21.5" y1="9" x2="23" y2="9" />
    </svg>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px 10px 32px',
  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
  outline: 'none', fontFamily: 'inherit',
}

function Field({ icon, label, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <Icon
          name={icon} size={15}
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}
        />
        {children}
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

async function nominatimGeocode(address) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=es`,
    { headers: { 'User-Agent': 'KIUVO-CRM/1.0' } }
  )
  const data = await res.json()
  if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  return null
}

// ── LocationField ─────────────────────────────────────────────────
function LocationField({ value, onChange, onCoords }) {
  const [gpsState,  setGpsState]  = useState('idle') // idle | loading | done | error
  const [geocoding, setGeocoding] = useState(false)
  const [geocoded,  setGeocoded]  = useState(false)

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsState('error'); return }
    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'KIUVO-CRM/1.0' } }
          )
          const data = await res.json()
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          onChange(addr)
          setGpsState('done')
        } catch {
          onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          setGpsState('done')
        }
        onCoords?.({ lat, lng })
        setGeocoded(true)
      },
      () => setGpsState('error'),
      { timeout: 10000 }
    )
  }

  async function handleBlur() {
    if (!value.trim() || geocoding || gpsState === 'done') return
    setGeocoding(true)
    try {
      const coords = await nominatimGeocode(value)
      if (coords) { onCoords?.(coords); setGeocoded(true) }
    } catch {}
    setGeocoding(false)
  }

  function handleChange(e) {
    onChange(e.target.value)
    onCoords?.(null)
    setGeocoded(false)
    if (gpsState !== 'idle') setGpsState('idle')
  }

  const gpsColor = gpsState === 'done' ? 'var(--success)' : gpsState === 'error' ? 'var(--danger)' : 'var(--kiuvo-blue)'
  const gpsIcon  = gpsState === 'loading' ? 'loader' : gpsState === 'done' ? 'check' : gpsState === 'error' ? 'alert-circle' : null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 6 }}>
        UBICACIÓN
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Text input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="map-pin" size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }} />
          <input
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Dirección o usa el GPS →"
            style={inputStyle}
          />
        </div>

        {/* GPS button */}
        <button
          onClick={handleGPS}
          disabled={gpsState === 'loading'}
          title={gpsState === 'error' ? 'No se pudo obtener ubicación' : 'Usar mi ubicación actual'}
          style={{
            flexShrink: 0, width: 42, height: 42,
            borderRadius: 'var(--r-md)',
            border: `0.5px solid ${gpsState === 'error' ? 'var(--danger-border)' : gpsState === 'done' ? 'var(--success)' : 'var(--border)'}`,
            background: gpsState === 'done' ? 'var(--success-bg)' : gpsState === 'error' ? 'var(--danger-bg)' : 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: gpsColor,
            animation: gpsState === 'loading' ? 'spin 1s linear infinite' : 'none',
          }}
        >
          {gpsIcon
            ? <Icon name={gpsIcon} size={18} />
            : <GpsPinIcon size={18} color={gpsColor} />
          }
        </button>
      </div>

      {/* Geocoding status */}
      {geocoding && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: 'var(--fg-tertiary)' }}>
          <Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
          Buscando coordenadas…
        </div>
      )}
      {!geocoding && geocoded && gpsState !== 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: 'var(--success)' }}>
          <Icon name="map-pin" size={12} color="var(--success)" />
          Ubicación geocodificada
        </div>
      )}
      {gpsState === 'error' && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
          No se pudo obtener la ubicación. Escríbela manualmente.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── PhotoField ────────────────────────────────────────────────────
function PhotoField({ photo, onPhoto }) {
  const inputRef = useRef(null)

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onPhoto(url)
  }

  const handleRemove = () => {
    onPhoto(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
        FOTO DE FACHADA <span style={{ fontWeight: 400, opacity: 0.7 }}>(opcional)</span>
      </div>

      {photo ? (
        <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '0.5px solid var(--border)' }}>
          <img src={photo} alt="Fachada" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          <button
            onClick={handleRemove}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Icon name="x" size={14} />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 8, right: 8,
              padding: '5px 10px', borderRadius: 'var(--r-md)',
              background: 'rgba(0,0,0,0.55)', border: 'none',
              color: '#fff', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <CameraIcon size={12} color="#fff" />
            Cambiar
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', padding: '20px 0',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg-secondary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: 'var(--fg-tertiary)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--r-md)',
            background: 'var(--kiuvo-blue-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CameraIcon size={22} color="var(--kiuvo-blue)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>Tomar foto o elegir imagen</div>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>Fachada del negocio</div>
          </div>
        </button>
      )}

      {/* Hidden file input — capture="environment" abre la cámara trasera en móvil */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function NewProspectModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const [step, setStep]           = useState('form')
  const [form, setForm]           = useState({
    clientName: '', businessName: '', phone: '',
    email: '', location: '', employees: '', notes: '',
  })
  const [photo, setPhoto]         = useState(null)
  const [locCoords, setLocCoords] = useState(null)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [serverError, setServerError] = useState('')
  const [savedOffline, setSavedOffline] = useState(false)

  const set = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(e2 => { const n = { ...e2 }; delete n[key]; return n })
    if (serverError) setServerError('')
  }

  const validate = () => {
    const e = {}
    if (!form.clientName.trim())   e.clientName   = 'Requerido'
    if (!form.businessName.trim()) e.businessName = 'Requerido'

    // Phone: required AND must have valid format
    if (!form.phone.trim()) {
      e.phone = 'Requerido'
    } else {
      const phoneErr = rules.phone(form.phone)
      if (phoneErr) e.phone = phoneErr
    }

    // Email: optional, but if filled must be valid
    const emailErr = rules.email(form.email)
    if (emailErr) e.email = emailErr

    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    setServerError('')

    // Consolidate non-mapped fields into notes
    const notesParts = []
    if (form.clientName.trim())  notesParts.push('Contacto: ' + form.clientName.trim())
    if (form.employees)          notesParts.push('Empleados: ' + form.employees)
    if (form.notes.trim())       notesParts.push(form.notes.trim())

    const payload = {
      name:      form.businessName.trim(),
      company:   form.businessName.trim(),
      phone:     form.phone.trim(),
      email:     form.email.trim()    || null,
      address:   form.location.trim() || null,
      lat:       locCoords?.lat ?? null,
      lng:       locCoords?.lng ?? null,
      notes:     notesParts.length ? notesParts.join('\n') : null,
      owner_id:  user.id,
      stage_id:  'prospeccion',
      health:    'green',
      value:     0,
    }

    // ── Offline: enqueue locally ──────────────────────────────────────────
    if (!isOnline) {
      enqueue({ type: 'INSERT_PROSPECT', table: 'prospects', payload })
      setLoading(false)
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
      return
    }

    // ── Online: send to Supabase ──────────────────────────────────────────
    const { data, error } = await supabase.from('prospects').insert(payload).select().single()
    setLoading(false)

    if (error) {
      // Network failed despite being "online" — enqueue as fallback
      enqueue({ type: 'INSERT_PROSPECT', table: 'prospects', payload })
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
      return
    }

    onCreated?.(data)
    setStep('success')
    setTimeout(onClose, 1800)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '92%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {step === 'success' ? (
          <SuccessView name={form.businessName || form.clientName} hasPhoto={!!photo} offline={savedOffline} />
        ) : (
          <>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Nuevo prospecto</div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-secondary)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fg-secondary)',
              }}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 0' }}>

              <Field label="NOMBRE DEL CLIENTE *" icon="user" error={errors.clientName}>
                <input
                  value={form.clientName}
                  onChange={set('clientName')}
                  placeholder="Ej. Juan García"
                  style={{ ...inputStyle, borderColor: errors.clientName ? 'var(--danger)' : 'var(--border)' }}
                />
              </Field>

              <Field label="NOMBRE DEL NEGOCIO *" icon="building-store" error={errors.businessName}>
                <input
                  value={form.businessName}
                  onChange={set('businessName')}
                  placeholder="Ej. Ferretería García"
                  style={{ ...inputStyle, borderColor: errors.businessName ? 'var(--danger)' : 'var(--border)' }}
                />
              </Field>

              <Field label="TELÉFONO *" icon="phone" error={errors.phone}>
                <input
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="Ej. 442 123 4567"
                  type="tel"
                  inputMode="tel"
                  style={{ ...inputStyle, borderColor: errors.phone ? 'var(--danger)' : 'var(--border)' }}
                />
              </Field>

              <Field label="CORREO ELECTRÓNICO" icon="mail" error={errors.email}>
                <input
                  value={form.email}
                  onChange={set('email')}
                  placeholder="Ej. contacto@negocio.com"
                  type="email"
                  inputMode="email"
                  style={{ ...inputStyle, borderColor: errors.email ? 'var(--danger)' : 'var(--border)' }}
                />
              </Field>

              <LocationField
                value={form.location}
                onChange={loc => setForm(f => ({ ...f, location: loc }))}
                onCoords={setLocCoords}
              />

              {/* Employees */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                  NÚMERO DE EMPLEADOS
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EMPLOYEE_RANGES.map(r => {
                    const on = form.employees === r
                    return (
                      <button
                        key={r}
                        onClick={() => setForm(f => ({ ...f, employees: on ? '' : r }))}
                        style={{
                          padding: '7px 14px', borderRadius: 'var(--r-full)',
                          border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                          background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                          color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
                          fontSize: 13, fontWeight: on ? 500 : 400,
                        }}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 6 }}>
                  NOTAS <span style={{ fontWeight: 400, opacity: 0.7 }}>(opcional)</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Icon
                    name="file-text" size={15}
                    style={{ position: 'absolute', left: 11, top: 11, color: 'var(--fg-tertiary)', pointerEvents: 'none' }}
                  />
                  <textarea
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Observaciones, interés del cliente, contexto…"
                    rows={3}
                    style={{
                      ...inputStyle,
                      paddingTop: 10, paddingBottom: 10,
                      resize: 'none', verticalAlign: 'top', lineHeight: 1.45,
                    }}
                  />
                </div>
              </div>

              <PhotoField photo={photo} onPhoto={setPhoto} />

              <div style={{ height: 8 }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
              {serverError && (
                <div style={{
                  marginBottom: 10, padding: '10px 14px',
                  background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)',
                }}>
                  {serverError}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--kiuvo-blue)', color: '#fff',
                  borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
                  opacity: loading ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                )}
                {loading ? 'Guardando…' : 'Guardar prospecto'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SuccessView({ name, hasPhoto, offline }) {
  return (
    <div style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: offline ? '#FFF3E0' : '#EAF3DE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={offline ? 'cloud-off' : 'user-plus'} size={30} color={offline ? '#EF9F27' : '#3B6D11'} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>
        {offline ? 'Guardado sin conexión' : '¡Prospecto guardado!'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        {offline ? (
          <>
            <b style={{ color: 'var(--fg)' }}>{name}</b> está en cola.{' '}
            <span style={{ color: '#EF9F27' }}>Se sincronizará con el servidor al reconectar.</span>
          </>
        ) : (
          <>
            <b style={{ color: 'var(--fg)' }}>{name}</b> fue agregado a tu embudo en Prospección.
            {hasPhoto && <span> Foto de fachada adjunta.</span>}
          </>
        )}
      </div>
    </div>
  )
}
