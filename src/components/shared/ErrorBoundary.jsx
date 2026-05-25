import React from 'react'
import Icon from './Icon'

/**
 * Generic React error boundary.
 *
 * Props:
 *   fallback  — optional ReactNode or render-prop ({ error, reset }) => ReactNode
 *   onReset   — optional callback after reset
 *   children
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset() {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Custom fallback
    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback({ error: this.state.error, reset: this.reset })
        : this.props.fallback
    }

    // Default fallback UI
    return (
      <div style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--danger-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="alert-circle" size={28} color="var(--danger)" />
        </div>

        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>
          Algo salió mal
        </div>

        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', maxWidth: 300, lineHeight: 1.5 }}>
          {this.state.error?.message
            ? `Error: ${this.state.error.message}`
            : 'Error inesperado. Intenta recargar la sección.'}
        </div>

        <button
          onClick={this.reset}
          style={{
            marginTop: 4,
            padding: '10px 24px',
            background: 'var(--kiuvo-blue)',
            color: '#fff',
            borderRadius: 'var(--r-md)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="refresh" size={14} color="#fff" />
          Reintentar
        </button>
      </div>
    )
  }
}
