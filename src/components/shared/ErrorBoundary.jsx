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
      // Estilos inline: este fallback también se usa fuera del contenedor .kiuvo
      <div style={{
        width: '100%',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        color: 'var(--fg)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--coral-soft)', color: 'var(--coral-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="alert-circle" size={34} />
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Algo salió mal
        </div>

        <div style={{ fontSize: 15, color: 'var(--fg-secondary)', maxWidth: 320, lineHeight: 1.5 }}>
          {this.state.error?.message
            ? `Error: ${this.state.error.message}`
            : 'Error inesperado. Intenta recargar la sección.'}
        </div>

        <button
          onClick={this.reset}
          style={{
            marginTop: 4,
            minHeight: 48,
            padding: '0 24px',
            border: 'none',
            cursor: 'pointer',
            background: 'var(--primary-bg)',
            color: 'var(--primary-fg)',
            borderRadius: 'var(--r-full)',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="refresh" size={18} />
          Reintentar
        </button>
      </div>
    )
  }
}
