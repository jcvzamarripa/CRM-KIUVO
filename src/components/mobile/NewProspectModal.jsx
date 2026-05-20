import React, { useState, useRef } from 'react'
import Icon from '../shared/Icon'

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

// ── LocationField ─────────────────────────────────────────────────
function LocationField({ value, onChange }) {
  const [gpsState, setGpsState] = useState('idle') // idle | loading | done | error

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsState('error')
      return
    }
    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`,
            { headers: { 'Accept-Language': 'es' } }
          )
          const data = await res.json()
          const addr = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          onChange(addr)
          setGpsState('done')
        } catch {
          onChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
          setGpsState('done')
        }
      },
      () => setGpsState('error'),
      { timeout: 10000 }
    )
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
            onChange={e => onChange(e.target.value)}
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
export default function NewProspectModal({ onClose }) {
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({
    clientName: '', businessName: '', phone: '',
    email: '', location: '', employees: '',
  })
  const [photo, setPhoto] = useState(null)
  const [errors, setErrors] = useState({})

  const set = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(e2 => { const n = { ...e2 }; delete n[key]; return n })
  }

  const validate = () => {
    const e = {}
    if (!form.clientName.trim())   e.clientName   = 'Requerido'
    if (!form.businessName.trim()) e.businessName = 'Requerido'
    if (!form.phone.trim())        e.phone        = 'Requerido'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
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
          <SuccessView name={form.businessName || form.clientName} hasPhoto={!!photo} />
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

              <Field label="CORREO ELECTRÓNICO" icon="mail">
                <input
                  value={form.email}
                  onChange={set('email')}
                  placeholder="Ej. contacto@negocio.com"
                  type="email"
                  inputMode="email"
                  style={inputStyle}
                />
              </Field>

              <LocationField
                value={form.location}
                onChange={loc => setForm(f => ({ ...f, location: loc }))}
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

              <PhotoField photo={photo} onPhoto={setPhoto} />

              <div style={{ height: 8 }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
              <button onClick={handleSubmit} style={{
                width: '100%', padding: '14px',
                background: 'var(--kiuvo-blue)', color: '#fff',
                borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
              }}>
                Guardar prospecto
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SuccessView({ name, hasPhoto }) {
  return (
    <div style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#EAF3DE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="user-plus" size={30} color="#3B6D11" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>
        ¡Prospecto guardado!
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        <b style={{ color: 'var(--fg)' }}>{name}</b> fue agregado a tu embudo en Prospección.
        {hasPhoto && <span> Foto de fachada adjunta.</span>}
      </div>
    </div>
  )
}
