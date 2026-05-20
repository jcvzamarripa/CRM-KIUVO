import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err.message)
    }
    // Navigation handled by App.jsx via profile role
  }

  return (
    <div className="kiuvo login-page" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--kiuvo-blue)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: 0.5,
            marginBottom: 16,
          }}>K</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.3 }}>KIUVO CRM</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 4 }}>Gestión de ventas en campo</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.mx"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)', color: 'var(--fg)',
                fontSize: 14, outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '0.5px solid var(--border-strong)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)', color: 'var(--fg)',
                fontSize: 14, outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '12px',
              background: loading ? 'var(--fg-tertiary)' : 'var(--kiuvo-blue)',
              color: '#fff', borderRadius: 'var(--r-md)',
              fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Demo hint */}
        {!isSupabaseConfigured && (
          <div style={{
            marginTop: 24, padding: '12px 14px',
            background: 'var(--kiuvo-blue-soft)', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--kiuvo-blue-mid)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--kiuvo-blue-deep)', marginBottom: 6 }}>
              Modo demo — sin Supabase configurado
            </div>
            <div style={{ fontSize: 11, color: 'var(--kiuvo-blue)', lineHeight: 1.6 }}>
              Vendedor: <b>vendedor@kiuvo.mx</b><br />
              Admin: <b>admin@kiuvo.mx</b><br />
              Contraseña: <b>demo1234</b>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
