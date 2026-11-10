import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button, Card, Field } from '../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email, password) {
  const errors = {}
  if (!email.trim())               errors.email    = 'Ingresa tu correo electrónico.'
  else if (!EMAIL_RE.test(email))  errors.email    = 'El correo no tiene un formato válido.'
  if (!password)                   errors.password = 'Ingresa tu contraseña.'
  else if (password.length < 6)    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  return errors
}

const errorRing = on => (on ? { boxShadow: 'inset 0 0 0 2px var(--coral)' } : null)

export default function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]       = useState(false)
  const { signIn } = useAuth()

  function handleEmailChange(e) {
    setEmail(e.target.value)
    if (fieldErrors.email) setFieldErrors(fe => ({ ...fe, email: '' }))
    if (serverError) setServerError('')
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value)
    if (fieldErrors.password) setFieldErrors(fe => ({ ...fe, password: '' }))
    if (serverError) setServerError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validate(email, password)
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    setServerError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setServerError(error.message)
  }

  return (
    <div className="kiuvo login-page" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--on-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, marginBottom: 16,
          }}>K</div>
          <div className="k-display" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>KIUVO CRM</div>
          <div style={{ fontSize: 15, color: 'var(--fg-secondary)', marginTop: 6 }}>Gestión de ventas en campo</div>
        </div>

        <Card style={{ borderRadius: 'var(--r-xl)', padding: 22 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Field label="Correo electrónico" error={fieldErrors.email}>
              <input
                className="k-input"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="tu@empresa.mx"
                autoComplete="email"
                disabled={loading}
                style={{ background: 'var(--bg-secondary)', opacity: loading ? 0.6 : 1, ...errorRing(fieldErrors.email) }}
              />
            </Field>

            <Field label="Contraseña" error={fieldErrors.password}>
              <input
                className="k-input"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                style={{ background: 'var(--bg-secondary)', opacity: loading ? 0.6 : 1, ...errorRing(fieldErrors.password) }}
              />
            </Field>

            {serverError && (
              <div role="alert" style={{
                padding: '12px 16px', marginBottom: 16,
                background: 'var(--coral-soft)', color: 'var(--coral-fg)',
                borderRadius: 'var(--r-md)', fontSize: 14,
              }}>
                {serverError}
              </div>
            )}

            <Button type="submit" block size="lg" loading={loading} style={{ marginTop: 4 }}>
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
