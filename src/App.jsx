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
import { pdf } from '@react-pdf/renderer'
import { QuotePDFDoc } from './lib/quotePDF'

const SAMPLE_ITEMS = [
  { id: 1, name: 'Banner Invitación K Club', sku: 'BAN-001',  unit: 'pza',      price: 350,  qty: 1,   discountPct: 0  },
  { id: 2, name: 'Kiuvo Restaurantera',      sku: 'INAN-RST', unit: 'pza',      price: 25,   qty: 6,   discountPct: 0  },
  { id: 3, name: 'Kiuvo Reseñas',            sku: 'INAN-RES', unit: 'pza',      price: 180,  qty: 3,   discountPct: 0  },
  { id: 4, name: 'Kiuvo Club Tarjeta',       sku: 'CLUB-001', unit: 'tarjeta',  price: 45,   qty: 100, discountPct: 10 },
  { id: 5, name: 'Servicio de Diseño',       sku: 'DIS-001',  unit: 'servicio', price: 300,  qty: 1,   discountPct: 0  },
]

function PdfTestPage() {
  const [url, setUrl] = React.useState(null)
  const [err, setErr] = React.useState(null)

  React.useEffect(() => {
    async function generate() {
      let logoDataUrl = null
      try {
        const r = await fetch(window.location.origin + '/kiuvo-logo.png')
        if (r.ok) {
          const buf   = await r.arrayBuffer()
          const bytes = new Uint8Array(buf)
          let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) })
          logoDataUrl = `data:image/png;base64,${btoa(bin)}`
        }
      } catch (_) {}
      try {
        const blob = await pdf(
          <QuotePDFDoc
            quoteId="a1b2c3d4-test"
            prospectName="Desayunos El Sazón"
            contactName="Encargado General"
            sellerName="José Carlos Valdés"
            items={SAMPLE_ITEMS}
            date={new Date('2026-05-28')}
            paymentTerms="50% anticipo, 50% contra entrega"
            deliveryTime="5–7 días hábiles"
            logoUrl={logoDataUrl}
            phone="449-205-06-15"
            address="Av. Aguascalientes Pte. #601 Col. Del Valle 1ra Secc."
          />
        ).toBlob()
        setUrl(URL.createObjectURL(blob))
      } catch(e) { setErr(e.message) }
    }
    generate()
  }, [])

  if (err) return <div style={{ padding: 32, color: 'red', fontFamily: 'monospace' }}>Error: {err}</div>
  if (!url) return <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#555' }}>Generando PDF…</div>
  return <iframe src={url} style={{ width: '100vw', height: '100vh', border: 'none' }} title="PDF Preview" />
}

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
          !user                        ? <Navigate to="/login" replace /> :
          profile?.role === 'admin'    ? <Navigate to="/admin" replace /> :
          (
            <div style={{ height: '100vh' }}>
              <MobileApp dark={dark} onToggleDark={() => setDark(d => !d)} />
            </div>
          )
        } />
        <Route path="/admin" element={
          !user                        ? <Navigate to="/login" replace /> :
          profile?.role !== 'admin'    ? <Navigate to="/app"   replace /> :
          (
            <div style={{ height: '100vh' }}>
              <AdminApp dark={dark} onToggleDark={() => setDark(d => !d)} />
            </div>
          )
        } />
        <Route path="/pdf-test" element={<PdfTestPage />} />
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
