import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email, password) {
  const errors = {}
  if (!email.trim())               errors.email    = 'Ingresa tu correo electrónico.'
  else if (!EMAIL_RE.test(email))  errors.email    = 'El correo no tiene un formato válido.'
  if (!password)                   errors.password = 'Ingresa tu contraseña.'
  else if (password.length < 6)    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  return errors
}

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'kiuvo-spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

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

  const inputBase = {
    width: '100%', padding: '11px 14px',
    borderRadius: 'var(--r-md)',
    background: 'var(--surface)', color: 'var(--fg)',
    fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-sans)',
    transition: 'border-color 0.15s',
    opacity: loading ? 0.6 : 1,
  }

  return (
    <>
      <style>{`@keyframes kiuvo-spin { to { transform: rotate(360deg) } }`}</style>

      <div className="kiuvo login-page" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--kiuvo-blue)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: 0.5, marginBottom: 16,
            }}>K</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.3 }}>KIUVO CRM</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 4 }}>Gestión de ventas en campo</div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="tu@empresa.mx"
                autoComplete="email"
                disabled={loading}
                style={{
                  ...inputBase,
                  border: `0.5px solid ${fieldErrors.email ? 'var(--danger)' : 'var(--border-strong)'}`,
                }}
              />
              {fieldErrors.email && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 5 }}>
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  ...inputBase,
                  border: `0.5px solid ${fieldErrors.password ? 'var(--danger)' : 'var(--border-strong)'}`,
                }}
              />
              {fieldErrors.password && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 5 }}>
                  {fieldErrors.password}
                </div>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
                borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)',
              }}>
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                background: loading ? 'var(--kiuvo-blue)' : 'var(--kiuvo-blue)',
                color: '#fff', borderRadius: 'var(--r-md)',
                fontSize: 14, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.75 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>

          </form>
        </div>
      </div>
    </>
  )
}
