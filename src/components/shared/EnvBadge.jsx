import React from 'react'
import { APP_ENV, isProd } from '../../lib/supabase'

/**
 * Shows a small colored badge in the UI when running outside production.
 * Renders nothing in production.
 */
const CFG = {
  development: { label: 'DEV',     bg: 'var(--accent-2-soft)', color: 'var(--accent-2-fg)' },
  staging:     { label: 'STAGING', bg: 'var(--warning-bg)',    color: 'var(--warning-fg)' },
}

export default function EnvBadge({ style = {} }) {
  if (isProd) return null
  const cfg = CFG[APP_ENV]
  if (!cfg) return null

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 'var(--r-full)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.06em',
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
