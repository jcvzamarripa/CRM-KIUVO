import React from 'react'
import { APP_ENV, isProd } from '../../lib/supabase'

/**
 * Shows a small colored badge in the UI when running outside production.
 * Renders nothing in production.
 */
const CFG = {
  development: { label: 'DEV',     bg: '#185FA5', color: '#fff' },
  staging:     { label: 'STAGING', bg: '#EF9F27', color: '#fff' },
}

export default function EnvBadge({ style = {} }) {
  if (isProd) return null
  const cfg = CFG[APP_ENV]
  if (!cfg) return null

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.6,
      background: cfg.bg,
      color: cfg.color,
      userSelect: 'none',
      flexShrink: 0,
      ...style,
    }}>
      {cfg.label}
    </span>
  )
}
