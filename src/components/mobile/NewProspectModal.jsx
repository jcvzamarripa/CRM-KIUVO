import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Chip, Label } from '../ui'
import { compressImage } from '../../lib/photo'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { rules } from '../../lib/validation'
import { enqueue } from '../../lib/offlineQueue'
import useOnlineStatus from '../../hooks/useOnlineStatus'

const EMPLOYEE_RANGES = ['1–10', '11–50', '51–200', '201–500', '500+']

const ICON_INPUT = { paddingLeft: 46 }
const ICON_POS = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }
const HINT = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }
const errorRing = on => (on ? { boxShadow: 'inset 0 0 0 2px var(--coral)' } : null)

function IconField({ icon, label, children, error }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <Icon name={icon} size={18} style={ICON_POS} />
        {children}
      </div>
      {error && <div style={{ fontSize: 13, color: 'var(--coral-fg)', marginTop: 6 }}>{error}</div>}
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
  const [gpsState,  setGpsState]  = useState('idle') // idle | loading | done | error | denied
  const [geocoding, setGeocoding] = useState(false)
  const [geocoded,  setGeocoded]  = useState(false)

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsState('error'); return }
    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        // ── Guardar coords y marcar done INMEDIATAMENTE ──
        onCoords?.({ lat, lng })
        onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        setGpsState('done')
        setGeocoded(true)

        // ── Reverse geocode en segundo plano (sólo actualiza el texto) ──
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'KIUVO-CRM/1.0' } }
        )
          .then(r => r.json())
          .then(data => { if (data.display_name) onChange(data.display_name) })
          .catch(() => { /* mantiene las coordenadas como dirección */ })
      },
      err => {
        // code 1 = PERMISSION_DENIED, code 2 = UNAVAILABLE, code 3 = TIMEOUT
        setGpsState(err?.code === 1 ? 'denied' : 'error')
      },
      { timeout: 20000, maximumAge: 60000, enableHighAccuracy: false }
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

  const isGpsErr = gpsState === 'error' || gpsState === 'denied'
  const gpsIcon  = gpsState === 'loading' ? 'loader' : gpsState === 'done' ? 'check' : isGpsErr ? 'alert-circle' : 'current-location'
  const gpsBg    = gpsState === 'done' ? 'var(--success-bg)' : isGpsErr ? 'var(--coral-soft)' : 'var(--primary-bg)'
  const gpsFg    = gpsState === 'done' ? 'var(--success-fg)' : isGpsErr ? 'var(--coral-fg)' : 'var(--primary-fg)'
  const gpsTitle = isGpsErr ? 'No se pudo obtener ubicación' : 'Usar mi ubicación actual'

  return (
    <div style={{ marginBottom: 18 }}>
      <Label>Ubicación</Label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="map-pin" size={18} style={ICON_POS} />
          <input
            className="k-input"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Dirección o usa el GPS"
            style={ICON_INPUT}
          />
        </div>

        <button
          type="button"
          className="k-iconbtn"
          onClick={handleGPS}
          disabled={gpsState === 'loading'}
          aria-label={gpsTitle}
          title={gpsTitle}
          style={{ background: gpsBg, color: gpsFg }}
        >
          <span className={gpsState === 'loading' ? 'k-spin' : undefined} style={{ display: 'inline-flex' }}>
            <Icon name={gpsIcon} size={22} />
          </span>
        </button>
      </div>

      {geocoding && (
        <div style={{ ...HINT, color: 'var(--fg-tertiary)' }}>
          <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={14} /></span>
          Buscando coordenadas…
        </div>
      )}
      {!geocoding && geocoded && gpsState !== 'done' && (
        <div style={{ ...HINT, color: 'var(--success-fg)' }}>
          <Icon name="map-pin" size={14} />
          Ubicación encontrada
        </div>
      )}
      {gpsState === 'done' && (
        <div style={{ ...HINT, color: 'var(--success-fg)' }}>
          <Icon name="map-pin-check" size={14} />
          Ubicación tomada del GPS
        </div>
      )}
      {gpsState === 'denied' && (
        <div style={{ ...HINT, color: 'var(--coral-fg)' }}>
          Permiso de ubicación denegado. Actívalo en Ajustes → Privacidad → Ubicación.
        </div>
      )}
      {gpsState === 'error' && (
        <div style={{ ...HINT, color: 'var(--coral-fg)' }}>
          No se pudo obtener la ubicación. Intenta de nuevo o escríbela manualmente.
        </div>
      )}
    </div>
  )
}

// ── PhotoField ────────────────────────────────────────────────────
// El input se crea dinámicamente en document.body para evitar el bug de iOS Safari
// donde file inputs dentro de contenedores overflow:hidden no abren la cámara.
function PhotoField({ photo, onPhoto }) {
  function openPicker() {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      // capture solo si el dispositivo lo soporta (evita crash en algunos WebViews)
      if ('capture' in HTMLInputElement.prototype) input.capture = 'environment'
      input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
      document.body.appendChild(input)

      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (file) {
          try {
            const url = URL.createObjectURL(file)
            onPhoto(url, file)
          } catch {
            // URL.createObjectURL no soportado — mostrar nombre como fallback
            onPhoto(null)
          }
        }
        document.body.removeChild(input)
      })

      // Limpiar si el usuario cancela (focus regresa a la ventana)
      window.addEventListener('focus', function cleanup() {
        setTimeout(() => {
          if (document.body.contains(input)) document.body.removeChild(input)
        }, 500)
        window.removeEventListener('focus', cleanup)
      })

      input.click()
    } catch {
      /* Silenciar errores de apertura de picker en entornos sin soporte */
    }
  }

  const handleRemove = () => onPhoto(null)
  const overlayBtn = {
    position: 'absolute', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, borderRadius: 'var(--r-full)', background: 'rgba(0,0,0,0.6)', color: 'var(--on-ink)',
    fontSize: 14, fontWeight: 600,
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <Label>Foto de fachada (opcional)</Label>

      {photo ? (
        <div style={{ position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <img src={photo} alt="Fachada" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={handleRemove} aria-label="Quitar foto" style={{ ...overlayBtn, top: 8, right: 8, width: 44 }}>
            <Icon name="x" size={18} />
          </button>
          <button type="button" onClick={openPicker} style={{ ...overlayBtn, bottom: 8, right: 8, padding: '0 16px' }}>
            <Icon name="camera" size={16} />
            Cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          style={{
            width: '100%', minHeight: 128, padding: 16,
            borderRadius: 'var(--r-lg)', background: 'var(--surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <span className="k-iconbtn k-iconbtn--soft"><Icon name="camera" size={22} /></span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Tomar foto o elegir imagen</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>Fachada del negocio</div>
          </div>
        </button>
      )}
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
  const [photoFile, setPhotoFile] = useState(null)
  const [photoSaved, setPhotoSaved] = useState(false)
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

    // Phone: format check only when filled
    if (form.phone.trim()) {
      const phoneErr = rules.phone(form.phone)
      if (phoneErr) e.phone = phoneErr
    }

    // Email: format check only when filled
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
      name:      form.businessName.trim() || form.clientName.trim() || 'Sin nombre',
      company:   form.businessName.trim() || form.clientName.trim() || 'Sin nombre',
      phone:     form.phone.trim() || null,
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

    // ── Sin conexión o sin Supabase configurado: guardar en cola local ───────
    if (!isOnline || !isSupabaseConfigured) {
      enqueue({ type: 'INSERT_PROSPECT', table: 'prospects', payload })
      setLoading(false)
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
      return
    }

    // ── Online + Supabase configurado: enviar ─────────────────────────────
    try {
      const { data, error } = await supabase.from('prospects').insert(payload).select().single()

      if (error) throw error

      supabase.from('activities').insert({
        prospect_id: data.id, seller_id: user.id, kind: 'new',
      }).then(() => {})

      // En su propio try: si la foto falla, el prospecto ya existe y no debe re-encolarse
      if (photoFile) try {
        const compressed = await compressImage(photoFile)
        const path = `${data.id}/${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage
          .from('prospect-images')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('prospect-images').getPublicUrl(path)
          const { error: rowErr } = await supabase.from('prospect_images').insert({ prospect_id: data.id, url: publicUrl, path })
          setPhotoSaved(!rowErr)
        }
      } catch { /* el prospecto queda sin foto */ }

      onCreated?.(data)
      setStep('success')
      setTimeout(onClose, 1800)
    } catch {
      // Red falló o error de BD — encolar como fallback
      enqueue({ type: 'INSERT_PROSPECT', table: 'prospects', payload })
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <Sheet title={savedOffline ? 'Guardado' : 'Listo'} onClose={onClose}>
        <SuccessView name={form.businessName || form.clientName} hasPhoto={photoSaved} offline={savedOffline} />
      </Sheet>
    )
  }

  return (
    <Sheet
      full
      title="Nuevo prospecto"
      onClose={onClose}
      footer={
        <>
          {serverError && (
            <div style={{ marginBottom: 10, padding: '12px 16px', background: 'var(--coral-soft)', color: 'var(--coral-fg)', borderRadius: 'var(--r-md)', fontSize: 14 }}>
              {serverError}
            </div>
          )}
          <Button block size="lg" icon="user-plus" loading={loading} onClick={handleSubmit}>
            {loading ? 'Guardando…' : 'Guardar prospecto'}
          </Button>
        </>
      }
    >
      <IconField label="Nombre del cliente" icon="user-circle" error={errors.clientName}>
        <input
          className="k-input"
          value={form.clientName}
          onChange={set('clientName')}
          placeholder="Ej. Juan García"
          style={{ ...ICON_INPUT, ...errorRing(errors.clientName) }}
        />
      </IconField>

      <IconField label="Nombre del negocio" icon="building-store" error={errors.businessName}>
        <input
          className="k-input"
          value={form.businessName}
          onChange={set('businessName')}
          placeholder="Ej. Ferretería García"
          style={{ ...ICON_INPUT, ...errorRing(errors.businessName) }}
        />
      </IconField>

      <IconField label="Teléfono" icon="phone" error={errors.phone}>
        <input
          className="k-input"
          value={form.phone}
          onChange={set('phone')}
          placeholder="Ej. 442 123 4567"
          type="tel"
          inputMode="tel"
          style={{ ...ICON_INPUT, ...errorRing(errors.phone) }}
        />
      </IconField>

      <IconField label="Correo electrónico" icon="mail" error={errors.email}>
        <input
          className="k-input"
          value={form.email}
          onChange={set('email')}
          placeholder="Ej. contacto@negocio.com"
          type="email"
          inputMode="email"
          style={{ ...ICON_INPUT, ...errorRing(errors.email) }}
        />
      </IconField>

      <LocationField
        value={form.location}
        onChange={loc => setForm(f => ({ ...f, location: loc }))}
        onCoords={setLocCoords}
      />

      <div style={{ marginBottom: 18 }}>
        <Label>Número de empleados</Label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EMPLOYEE_RANGES.map(r => {
            const on = form.employees === r
            return (
              <Chip key={r} selected={on} onClick={() => setForm(f => ({ ...f, employees: on ? '' : r }))}>
                {r}
              </Chip>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Label>Notas (opcional)</Label>
        <textarea
          className="k-input"
          value={form.notes}
          onChange={set('notes')}
          placeholder="Observaciones, interés del cliente, contexto…"
          rows={3}
        />
      </div>

      <PhotoField photo={photo} onPhoto={(url, file) => { setPhoto(url); setPhotoFile(file || null) }} />
    </Sheet>
  )
}

function SuccessView({ name, hasPhoto, offline }) {
  return (
    <div style={{ padding: '12px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{
        width: 84, height: 84, borderRadius: '50%',
        background: offline ? 'var(--warning-bg)' : 'var(--accent)',
        color: offline ? 'var(--warning-fg)' : 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={offline ? 'cloud-off' : 'user-plus'} size={38} />
      </div>
      <div className="k-display" style={{ fontSize: 24, fontWeight: 700 }}>
        {offline ? 'Guardado sin conexión' : '¡Prospecto guardado!'}
      </div>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
        {offline ? (
          <>
            <b style={{ color: 'var(--fg)' }}>{name}</b> está en cola.{' '}
            <span style={{ color: 'var(--warning-fg)' }}>Se sincronizará con el servidor al reconectar.</span>
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
