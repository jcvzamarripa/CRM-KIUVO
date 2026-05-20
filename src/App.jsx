import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MobileApp from './pages/MobileApp'
import AdminApp from './pages/AdminApp'

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  const [dark, setDark] = useState(false)

  // Sync dark class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('kiuvo-dark', dark)
  }, [dark])

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--fg-tertiary)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: 'var(--kiuvo-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 16,
        }}>K</div>
        <span style={{ fontSize: 12 }}>Cargando…</span>
      </div>
    )
  }

  // Dark mode toggle button (always visible)
  const DarkToggle = () => (
    <button
      onClick={() => setDark(d => !d)}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 999,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/" element={
          !user ? <Navigate to="/login" replace /> :
          profile?.role === 'admin' ? <Navigate to="/admin" replace /> :
          <Navigate to="/app" replace />
        } />
        <Route path="/app" element={
          !user ? <Navigate to="/login" replace /> : (
            <div style={{ height: '100vh' }}>
              <DarkToggle />
              <MobileApp dark={dark} />
            </div>
          )
        } />
        <Route path="/admin" element={
          !user ? <Navigate to="/login" replace /> : (
            <div style={{ height: '100vh' }}>
              <DarkToggle />
              <AdminApp dark={dark} />
            </div>
          )
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
