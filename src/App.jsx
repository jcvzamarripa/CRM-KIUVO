import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { StagesProvider } from './contexts/StagesContext'
import { ToastProvider } from './contexts/ToastContext'
import Login from './pages/Login'
import MobileApp from './pages/MobileApp'
import AdminApp from './pages/AdminApp'
import OfflineBanner from './components/shared/OfflineBanner'
import ToastManager from './components/shared/ToastManager'
import ErrorBoundary from './components/shared/ErrorBoundary'

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
              <MobileApp dark={dark} onToggleDark={() => setDark(d => !d)} />
            </div>
          )
        } />
        <Route path="/admin" element={
          !user ? <Navigate to="/login" replace /> : (
            <div style={{ height: '100vh' }}>
              <AdminApp dark={dark} onToggleDark={() => setDark(d => !d)} />
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
      <StagesProvider>
        <ToastProvider>
          <OfflineBanner />
          <ToastManager />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </StagesProvider>
    </AuthProvider>
  )
}
