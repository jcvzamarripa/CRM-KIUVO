import React, { useState, useRef } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Field, Label } from '../ui'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

const ACCENT_COLORS = ['#185FA5','#1D9E75','#EF9F27','#D85A30','#8B5CF6','#E24B4A']

export default function ProfileScreen({ onBack }) {
  const { user, profile, refreshProfile } = useAuth()

  const [name,        setName]        = useState(profile?.full_name    || '')
  const [position,    setPosition]    = useState(profile?.position     || '')
  const [accent,      setAccent]      = useState(profile?.avatar_color || '#185FA5')
  const [avatarUrl,   setAvatarUrl]   = useState(profile?.avatar_url   || null)
  const [photoFile,   setPhotoFile]   = useState(null)   // File selected, pending upload
  const [photoPreview, setPhotoPreview] = useState(null) // object URL for instant preview
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState(null)
  const fileRef = useRef(null)

  const canSave = isSupabaseConfigured && !!user

  const displayAvatar = photoPreview || avatarUrl
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    || (profile?.initials ?? '?')

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleCancelEdit() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setName(profile?.full_name    || '')
    setPosition(profile?.position || '')
    setAccent(profile?.avatar_color || '#185FA5')
    setAvatarUrl(profile?.avatar_url || null)
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)

    try {
      let newAvatarUrl = avatarUrl

      // Upload new photo to Storage if one was picked
      if (photoFile) {
        const ext  = photoFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        // Bust CDN cache so the new photo appears immediately
        newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          full_name:    name.trim() || profile?.full_name,
          initials:     name.trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || profile?.initials,
          position:     position.trim() || null,
          avatar_color: accent,
          avatar_url:   newAvatarUrl,
        })
        .eq('id', user.id)

      if (dbErr) throw dbErr

      // Refresh context so Dashboard/header picks up new name & avatar
      await refreshProfile()

      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      setAvatarUrl(newAvatarUrl)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      return
    }
    if (!canSave) { setAvatarUrl(null); return }
    setAvatarUrl(null)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    await refreshProfile()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 120 }}>

      {/* Header */}
      <div className="k-screenhead">
        <IconButton icon="arrow-left" label="Volver" onClick={onBack} />
        <div className="k-screenhead__title">Mi perfil</div>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 14px 24px', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 104, height: 104, borderRadius: '50%',
            background: displayAvatar ? 'transparent' : accent,
            boxShadow: `0 0 0 4px var(--bg), 0 0 0 7px ${accent}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, fontWeight: 700, color: 'var(--on-ink)',
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <IconButton
            icon="camera" label="Cambiar foto" variant="ink" iconSize={20}
            onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: -8, right: -12, boxShadow: '0 0 0 3px var(--bg)' }}
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {displayAvatar && (
          <Button variant="danger" size="sm" onClick={handleRemovePhoto} style={{ marginTop: 6 }}>Quitar foto</Button>
        )}

        {!editing && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div className="k-h1">{name || profile?.full_name}</div>
              <div style={{ fontSize: 15, color: 'var(--fg-secondary)', marginTop: 4 }}>
                {position || (profile?.role === 'admin' ? 'Administrador' : 'Vendedor de campo')}
              </div>
            </div>
            <Button variant="soft" icon="pencil" onClick={() => setEditing(true)} style={{ background: 'var(--surface)' }}>
              Editar perfil
            </Button>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '0 14px' }}>
          <Field label="Nombre completo">
            <input className="k-input" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </Field>
          <Field label="Cargo / Rol">
            <input className="k-input" value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej. Vendedor de campo" />
          </Field>

          <div className="k-field">
            <span className="k-field__label">Color de avatar</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Color ${c}`} aria-pressed={accent === c}
                  style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    boxShadow: accent === c ? '0 0 0 3px var(--bg), 0 0 0 6px var(--fg)' : 'none',
                  }} />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--coral-soft)', color: 'var(--coral-fg)', borderRadius: 'var(--r-md)', fontSize: 14 }}>
              {error}
            </div>
          )}

          {!canSave && (
            <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--surface)', color: 'var(--fg-secondary)', borderRadius: 'var(--r-md)', fontSize: 14 }}>
              Conecta Supabase para guardar cambios en la nube.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button variant="soft" onClick={handleCancelEdit} style={{ flex: 1, background: 'var(--surface)' }}>Cancelar</Button>
            <Button loading={saving} disabled={!canSave} onClick={handleSave} style={{ flex: 2 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}

      {saved && (
        <div style={{
          position: 'fixed', bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--on-ink)',
          padding: '12px 20px', borderRadius: 'var(--r-full)',
          fontSize: 14, fontWeight: 600, zIndex: 300, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-float)',
        }}>
          <Icon name="check" size={18} color="var(--accent)" />
          Perfil actualizado
        </div>
      )}
    </div>
  )
}
