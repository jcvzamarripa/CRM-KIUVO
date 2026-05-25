import React, { createContext, useContext, useCallback, useState } from 'react'

const ToastContext = createContext(null)

let _nextId = 1

const DURATIONS = { error: 5000, warning: 4000, success: 3000, info: 4000 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback(({ message, kind = 'error', duration }) => {
    const id = _nextId++
    const ms = duration ?? DURATIONS[kind] ?? 4000
    // Keep at most 3 visible
    setToasts(prev => [...prev.slice(-2), { id, message, kind }])
    setTimeout(() => dismiss(id), ms)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
