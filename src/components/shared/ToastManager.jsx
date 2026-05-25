import React from 'react'
import { useToast } from '../../contexts/ToastContext'
import Icon from './Icon'

const KIND = {
  error:   { bg: '#D85A30', icon: 'alert-circle' },
  success: { bg: '#1D9E75', icon: 'circle-check' },
  warning: { bg: '#EF9F27', icon: 'alert-triangle' },
  info:    { bg: '#2272C3', icon: 'info-circle' },
}

export default function ToastManager() {
  const { toasts, dismiss } = useToast()
  if (!toasts.length) return null

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 88,       /* above mobile BottomNav */
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99997,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'stretch',
        width: 'min(400px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const cfg = KIND[t.kind] ?? KIND.error
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                padding: '12px 14px',
                background: cfg.bg,
                color: '#fff',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.4,
                boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
                cursor: 'pointer',
                pointerEvents: 'all',
                animation: 'toastIn 0.22s ease',
              }}
            >
              <Icon name={cfg.icon} size={17} color="#fff" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <Icon name="x" size={14} color="rgba(255,255,255,0.65)" style={{ flexShrink: 0 }} />
            </div>
          )
        })}
      </div>
    </>
  )
}
