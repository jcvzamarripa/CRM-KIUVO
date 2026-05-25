import React, { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { APP_ENV, APP_NAME } from '../../lib/supabase'

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

// ── Field row ────────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
      <div style={{ flex: '0 0 200px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', readOnly = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        background: readOnly ? 'var(--bg-secondary)' : 'var(--bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--r-md)', fontSize: 13,
        color: readOnly ? 'var(--fg-secondary)' : 'var(--fg)',
        outline: 'none', fontFamily: 'inherit',
      }}
    />
  )
}

// ── Badge de ambiente ────────────────────────────────────────────────────────
const ENV_COLORS = {
  development: { bg: '#EBF2FB', color: '#185FA5', label: 'Development' },
  staging:     { bg: '#FEF3E2', color: '#854F0B', label: 'Staging' },
  production:  { bg: '#E8F8F2', color: '#1D9E75', label: 'Production' },
}

export default function SettingsView({ dark, onToggleDark }) {
  const { user, profile } = useAuth()

  // Profile form state
  const [fullName,  setFullName]  = useState('')
  const [initials,  setInitials]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')   // '' | 'ok' | 'error'

  // Team settings
  const [weeklyGoal, setWeeklyGoal] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalMsg,    setGoalMsg]    = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setInitials(profile.initials  ?? '')
      setWeeklyGoal(String(profile.weekly_goal ?? 100000))
    }
  }, [profile])

  // Auto-derive initials from name
  const handleNameChange = (e) => {
    const val = e.target.value
    setFullName(val)
    const parts = val.trim().split(/\s+/)
    if (parts.length >= 2) {
      setInitials((parts[0][0] + parts[1][0]).toUpperCase())
    } else if (parts[0]) {
      setInitials(parts[0].slice(0, 2).toUpperCase())
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, initials })
      .eq('id', user.id)
    setSaving(false)
    setSaveMsg(error ? 'error' : 'ok')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleSaveGoal = async () => {
    const val = parseInt(weeklyGoal, 10)
    if (!val || val < 0) return
    setGoalSaving(true)
    setGoalMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({ weekly_goal: val })
      .eq('id', user.id)
    setGoalSaving(false)
    setGoalMsg(error ? 'error' : 'ok')
    setTimeout(() => setGoalMsg(''), 3000)
  }

  const envCfg = ENV_COLORS[APP_ENV] ?? ENV_COLORS.development

  return (
    <div style={{ overflowY: 'auto', padding: '20px 28px 40px', flex: 1 }}>

      {/* ── Perfil ── */}
      <Section
        title="Perfil de administrador"
        description="Nombre e iniciales que aparecen en el panel"
      >
        <Field label="Nombre completo" hint="Se muestra en la barra lateral y en reportes">
          <Input value={fullName} onChange={handleNameChange} placeholder="Ej. Juan García" />
        </Field>
        <Field label="Iniciales" hint="2 letras para el avatar cuando no hay foto">
          <Input
            value={initials}
            onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="JG"
          />
        </Field>
        <Field label="Correo" hint="Tu correo de acceso (no editable)">
          <Input value={user?.email ?? ''} readOnly />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              padding: '9px 20px', background: 'var(--kiuvo-blue)', color: '#fff',
              borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
              opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon name="device-floppy" size={15} color="#fff" />
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </button>
          {saveMsg === 'ok' && (
            <span style={{ fontSize: 12, color: 'var(--success-fg)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="circle-check" size={14} color="var(--success)" /> Guardado correctamente
            </span>
          )}
          {saveMsg === 'error' && (
            <span style={{ fontSize: 12, color: 'var(--danger-fg)' }}>Error al guardar. Intenta de nuevo.</span>
          )}
        </div>
      </Section>

      {/* ── Meta semanal ── */}
      <Section
        title="Meta del equipo"
        description="Objetivo de ventas semanal visible en el dashboard"
      >
        <Field label="Meta semanal (MXN)" hint="Suma de cierres que el equipo debe alcanzar por semana">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="number"
              value={weeklyGoal}
              onChange={e => setWeeklyGoal(e.target.value)}
              placeholder="100000"
            />
            <button
              onClick={handleSaveGoal}
              disabled={goalSaving}
              style={{
                padding: '9px 18px', background: 'var(--kiuvo-blue)', color: '#fff',
                borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
                opacity: goalSaving ? 0.7 : 1, flexShrink: 0,
              }}
            >
              {goalSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {goalMsg === 'ok' && (
            <div style={{ fontSize: 12, color: 'var(--success-fg)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="circle-check" size={13} color="var(--success)" /> Meta actualizada
            </div>
          )}
          {goalMsg === 'error' && (
            <div style={{ fontSize: 12, color: 'var(--danger-fg)', marginTop: 6 }}>Error al guardar.</div>
          )}
        </Field>
      </Section>

      {/* ── Apariencia ── */}
      <Section title="Apariencia" description="Personaliza la interfaz del panel">
        <Field label="Tema" hint="Claro u oscuro para el panel de administración">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Claro', icon: 'sun', value: false },
              { label: 'Oscuro', icon: 'moon', value: true },
            ].map(opt => {
              const on = dark === opt.value
              return (
                <button
                  key={opt.label}
                  onClick={() => !on && onToggleDark?.()}
                  style={{
                    padding: '9px 18px', borderRadius: 'var(--r-md)',
                    background: on ? 'var(--kiuvo-blue)' : 'var(--bg-secondary)',
                    border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                    color: on ? '#fff' : 'var(--fg-secondary)',
                    fontSize: 13, fontWeight: on ? 500 : 400,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon name={opt.icon} size={14} color={on ? '#fff' : 'var(--fg-secondary)'} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* ── Sistema ── */}
      <Section title="Sistema" description="Información del entorno y versión">
        <Field label="Ambiente">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: envCfg.bg, color: envCfg.color,
            fontSize: 12, fontWeight: 600, letterSpacing: 0.4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: envCfg.color }} />
            {envCfg.label}
          </span>
        </Field>
        <Field label="Aplicación" hint="Nombre configurado en variables de entorno">
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{APP_NAME}</span>
        </Field>
        <Field label="Base de datos" hint="Backend de datos y autenticación">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>Supabase (PostgreSQL)</span>
          </div>
        </Field>
        <Field label="Mapa" hint="Proveedor de mapas y geocodificación">
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>OpenStreetMap + Leaflet</span>
        </Field>
      </Section>

    </div>
  )
}
