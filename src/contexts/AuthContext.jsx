import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// ── Usuarios demo (activos solo cuando Supabase NO está configurado) ──────────
const DEMO_USERS = {
  'admin@kiuvo.mx':    { id: 'demo-admin',    email: 'admin@kiuvo.mx',    role: 'admin',  name: 'Admin Demo',    password: 'demo1234' },
  'vendedor@kiuvo.mx': { id: 'demo-vendedor', email: 'vendedor@kiuvo.mx', role: 'seller', name: 'Vendedor Demo', password: 'demo1234' },
}

const AUTH_ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo electrónico antes de ingresar.',
  'Too many requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
}

function translateError(message) {
  for (const [key, val] of Object.entries(AUTH_ERRORS)) {
    if (message?.includes(key)) return val
  }
  return message ?? 'Error inesperado. Intenta de nuevo.'
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Modo demo: restaurar sesión guardada en localStorage
      try {
        const saved = localStorage.getItem('kiuvo_demo_user')
        if (saved) {
          const demo = JSON.parse(saved)
          setUser(demo)
          setProfile(demo)
        }
      } catch (_) {}
      setLoading(false)
      return
    }

    // Restore existing session on mount (uses stored refresh token automatically)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // React to login, logout, and token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const [{ data: profileData }, { data: { user: authUser } }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.auth.getUser(),
    ])

    // El rol puede venir de la tabla profiles, del user_metadata o del app_metadata
    const role =
      profileData?.role ||
      authUser?.user_metadata?.role ||
      authUser?.app_metadata?.role ||
      'seller'

    setProfile({ ...(profileData ?? { id: userId }), role })
    setLoading(false)
  }

  async function refreshProfile() {
    if (!isSupabaseConfigured) return
    if (user) await fetchProfile(user.id)
  }

  async function signIn(email, password) {
    // ── Modo demo ─────────────────────────────────────────────────────────────
    if (!isSupabaseConfigured) {
      const demo = DEMO_USERS[email.toLowerCase().trim()]
      if (demo && demo.password === password) {
        localStorage.setItem('kiuvo_demo_user', JSON.stringify(demo))
        setUser(demo)
        setProfile(demo)
        return { error: null }
      }
      return { error: { message: 'Correo o contraseña incorrectos.' } }
    }

    // ── Supabase ──────────────────────────────────────────────────────────────
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? { message: translateError(error.message) } : null }
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('kiuvo_demo_user')
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
