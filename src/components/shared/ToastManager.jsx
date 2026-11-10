import React from 'react'
import { useToast } from '../../contexts/ToastContext'
import Icon from './Icon'

// Fondo de tinta: el color del icono lleva el significado
const KIND = {
  error:   { color: 'var(--coral)',    icon: 'alert-circle' },
  success: { color: 'var(--accent)',   icon: 'circle-check' },
  warning: { color: 'var(--on-ink)', icon: 'alert-triangle' },
  info:    { color: 'var(--sky)',      icon: 'info-circle' },
}

export default function ToastManager() {
  const { toasts, dismiss } = useToast()
  if (!toasts.length) return null

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',   /* sobre la nav flotante */
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99997,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'stretch',
        width: 'min(420px, calc(100vw - 28px))',
        pointerEvents: 'none',
        fontFamily: 'var(--font-sans)',
      }}>
        {toasts.map(t => {
          const cfg = KIND[t.kind] ?? KIND.error
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              style={{
                minHeight: 52,
                padding: '12px 16px',
                background: 'var(--ink)',
                color: 'var(--on-ink)',
                borderRadius: 'var(--r-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.4,
                boxShadow: 'var(--shadow-float)',
                cursor: 'pointer',
                pointerEvents: 'all',
                animation: 'toastIn 0.22s ease',
              }}
            >
              <Icon name={cfg.icon} size={22} color={cfg.color} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <Icon name="x" size={18} color="var(--on-ink-muted)" />
            </div>
          )
        })}
      </div>
    </>
  )
}
