import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { APP_ENV, APP_NAME } from '../../lib/supabase'
import { Card, Button, Pill, Segmented } from '../ui'

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <Card style={{ marginBottom: 16, padding: 20 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="k-h2">{title}</div>
        {description && <div className="k-muted" style={{ fontSize: 13, marginTop: 4 }}>{description}</div>}
      </div>
      {children}
    </Card>
  )
}

// ── Field row ────────────────────────────────────────────────────────────────
function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '8px 16px', marginBottom: 18 }}>
      <div style={{ flex: '1 1 200px', maxWidth: 260 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{label}</div>
        {hint && <div className="k-dim" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flex: '2 1 260px', minWidth: 0 }}>{children}</div>
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
      className="k-input k-input--sm"
      style={readOnly ? { background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' } : undefined}
    />
  )
}

// ── Badge de ambiente ────────────────────────────────────────────────────────
const ENV_COLORS = {
  development: { tone: 'sky',     label: 'Development' },
  staging:     { tone: 'warning', label: 'Staging' },
  production:  { tone: 'success', label: 'Production' },
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
    <div className="sv-scroll">
      <div style={{ maxWidth: 860 }}>

      {/* ── Perfil ── */}
      <Section
        title="Perfil de administrador"
        description="Nombre e iniciales que aparecen en el panel"
      >
        <SettingRow label="Nombre completo" hint="Se muestra en la barra lateral y en reportes">
          <Input value={fullName} onChange={handleNameChange} placeholder="Ej. Juan García" />
        </SettingRow>
        <SettingRow label="Iniciales" hint="2 letras para el avatar cuando no hay foto">
          <Input
            value={initials}
            onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="JG"
          />
        </SettingRow>
        <SettingRow label="Correo" hint="Tu correo de acceso (no editable)">
          <Input value={user?.email ?? ''} readOnly />
        </SettingRow>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Button icon="check" loading={saving} onClick={handleSaveProfile}>
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </Button>
          {saveMsg === 'ok' && <Pill tone="success" icon="circle-check">Guardado correctamente</Pill>}
          {saveMsg === 'error' && <Pill tone="coral" icon="alert-circle">Error al guardar. Intenta de nuevo.</Pill>}
        </div>
      </Section>

      {/* ── Meta semanal ── */}
      <Section
        title="Meta del equipo"
        description="Objetivo de ventas semanal visible en el dashboard"
      >
        <SettingRow label="Meta semanal (MXN)" hint="Suma de cierres que el equipo debe alcanzar por semana">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="number"
              value={weeklyGoal}
              onChange={e => setWeeklyGoal(e.target.value)}
              placeholder="100000"
            />
            <Button size="sm" loading={goalSaving} onClick={handleSaveGoal}>
              {goalSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
          {goalMsg === 'ok' && <div style={{ marginTop: 8 }}><Pill tone="success" icon="circle-check">Meta actualizada</Pill></div>}
          {goalMsg === 'error' && <div style={{ marginTop: 8 }}><Pill tone="coral" icon="alert-circle">Error al guardar.</Pill></div>}
        </SettingRow>
      </Section>

      {/* ── Apariencia ── */}
      <Section title="Apariencia" description="Personaliza la interfaz del panel">
        <SettingRow label="Tema" hint="Claro u oscuro para el panel de administración">
          <Segmented
            value={dark ? 'dark' : 'light'}
            onChange={id => { if ((id === 'dark') !== !!dark) onToggleDark?.() }}
            options={[
              { id: 'light', label: 'Claro',  icon: 'sun' },
              { id: 'dark',  label: 'Oscuro', icon: 'moon' },
            ]}
          />
        </SettingRow>
      </Section>

      {/* ── Sistema ── */}
      <Section title="Sistema" description="Información del entorno y versión">
        <SettingRow label="Ambiente">
          <Pill tone={envCfg.tone}>{envCfg.label}</Pill>
        </SettingRow>
        <SettingRow label="Aplicación" hint="Nombre configurado en variables de entorno">
          <span className="k-muted" style={{ fontSize: 14 }}>{APP_NAME}</span>
        </SettingRow>
        <SettingRow label="Base de datos" hint="Backend de datos y autenticación">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span className="k-muted" style={{ fontSize: 14 }}>Supabase (PostgreSQL)</span>
          </div>
        </SettingRow>
        <SettingRow label="Mapa" hint="Proveedor de mapas y geocodificación">
          <span className="k-muted" style={{ fontSize: 14 }}>OpenStreetMap + Leaflet</span>
        </SettingRow>
      </Section>

      </div>
    </div>
  )
}
