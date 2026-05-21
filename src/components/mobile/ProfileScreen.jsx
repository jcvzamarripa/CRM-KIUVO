import React, { useState, useRef } from 'react'
import Icon from '../shared/Icon'

const AVATAR_KEY  = 'kiuvo_profile_avatar'   // base64 dataURL
const NAME_KEY    = 'kiuvo_profile_name'
const ROLE_KEY    = 'kiuvo_profile_role'

const ACCENT_COLORS = ['#185FA5','#1D9E75','#EF9F27','#D85A30','#8B5CF6','#E24B4A']

export default function ProfileScreen({ profile, onBack }) {
  const [name,    setName]    = useState(() => localStorage.getItem(NAME_KEY)    || profile?.full_name || 'Luis Ramírez')
  const [role,    setRole]    = useState(() => localStorage.getItem(ROLE_KEY)    || 'Vendedor de campo')
  const [avatar,  setAvatar]  = useState(() => localStorage.getItem(AVATAR_KEY) || null)
  const [accent,  setAccent]  = useState('#185FA5')
  const [editing, setEditing] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const fileRef = useRef(null)

  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setAvatar(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleSave() {
    localStorage.setItem(NAME_KEY, name)
    localStorage.setItem(ROLE_KEY, role)
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleRemovePhoto() {
    setAvatar(null)
    localStorage.removeItem(AVATAR_KEY)
  }

  const inputStyle = {
    width: '100%', padding: '11px 12px', boxSizing: 'border-box',
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 92 }}>

      {/* Header */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)', flexShrink: 0 }}>
          <Icon name="arrow-left" size={18} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)' }}>Mi perfil</div>
      </div>

      {/* Avatar section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 24px', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: avatar ? 'transparent' : accent,
            border: `3px solid ${accent}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 600, color: '#fff',
            boxShadow: `0 4px 20px ${accent}44`,
          }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--kiuvo-blue)', color: '#fff', border: '2px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={13} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {avatar && (
          <button onClick={handleRemovePhoto} style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>
            Quitar foto
          </button>
        )}

        {!editing && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 3 }}>{role}</div>
            </div>
            <button onClick={() => setEditing(true)} style={{
              padding: '8px 20px', borderRadius: 'var(--r-full)',
              border: '0.5px solid var(--border)', background: 'var(--surface)',
              fontSize: 13, fontWeight: 500, color: 'var(--fg)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="pencil" size={14} />
              Editar perfil
            </button>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Tu nombre" />
          </div>
          <div>
            <label style={labelStyle}>Rol / Cargo</label>
            <input value={role} onChange={e => setRole(e.target.value)} style={inputStyle} placeholder="Ej. Vendedor de campo" />
          </div>

          {/* Accent color */}
          <div>
            <label style={labelStyle}>Color de avatar</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map(c => (
                <button key={c} onClick={() => setAccent(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: accent === c ? '3px solid var(--fg)' : '3px solid transparent',
                  outline: accent === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
              border: '0.5px solid var(--border)', background: 'var(--surface)',
              fontSize: 14, fontWeight: 500, color: 'var(--fg)',
            }}>
              Cancelar
            </button>
            <button onClick={handleSave} style={{
              flex: 2, padding: '12px 0', borderRadius: 'var(--r-md)',
              background: 'var(--kiuvo-blue)', color: '#fff',
              fontSize: 14, fontWeight: 500,
            }}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* Stats cards */}
      {!editing && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: '0.5px', background: 'var(--border)', margin: '8px 0 16px' }} />
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 4 }}>RESUMEN</div>
          {[
            { label: 'Prospectos activos', value: '34', icon: 'users' },
            { label: 'Visitas este mes',   value: '22', icon: 'map-pin' },
            { label: 'Meta alcanzada',     value: '68%', icon: 'target' },
            { label: 'Nivel de racha',     value: 'Nivel 4 · 5 días', icon: 'flame' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '12px 14px', background: 'var(--surface)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--r-md)',
                background: 'var(--kiuvo-blue-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={item.icon} size={16} color="var(--kiuvo-blue)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginTop: 1 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save success toast */}
      {saved && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--success)', color: '#fff',
          padding: '10px 20px', borderRadius: 'var(--r-full)',
          fontSize: 13, fontWeight: 500, zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <Icon name="check" size={15} color="#fff" />
          Perfil actualizado
        </div>
      )}
    </div>
  )
}
