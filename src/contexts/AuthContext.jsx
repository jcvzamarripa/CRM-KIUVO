import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// Demo users for when Supabase is not configured
const DEMO_USERS = {
  'vendedor@kiuvo.mx': { id: 'demo-seller', role: 'seller', full_name: 'Luis Ramírez', initials: 'LR', avatar_color: '#185FA5' },
  'admin@kiuvo.mx':    { id: 'demo-admin',  role: 'admin',  full_name: 'Sofía Castillo', initials: 'SC', avatar_color: '#185FA5' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Check sessionStorage for demo login
      const saved = sessionStorage.getItem('kiuvo_demo_user')
      if (saved) {
        const p = JSON.parse(saved)
        setUser({ id: p.id, email: p.email })
        setProfile(p)
      }
      setLoading(false)
      return
    }

    supabase?.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } }

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      ?.from('profiles')
      .select('*')
      .eq('id', userId)
      .single() || { data: null }
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    if (!isSupabaseConfigured) {
      const demoProfile = DEMO_USERS[email.toLowerCase()]
      if (demoProfile && password === 'demo1234') {
        const p = { ...demoProfile, email }
        sessionStorage.setItem('kiuvo_demo_user', JSON.stringify(p))
        setUser({ id: p.id, email })
        setProfile(p)
        return { error: null }
      }
      return { error: { message: 'Credenciales incorrectas. Usa vendedor@kiuvo.mx o admin@kiuvo.mx con contraseña demo1234' } }
    }

    const { error } = await supabase?.auth.signInWithPassword({ email, password }) || { error: { message: 'Supabase no configurado' } }
    return { error }
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      sessionStorage.removeItem('kiuvo_demo_user')
      setUser(null)
      setProfile(null)
      return
    }
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
