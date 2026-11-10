import React from 'react'
import Icon from '../shared/Icon'

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Button({
  variant = 'primary', size, block, icon, loading, disabled, className, children, ...rest
}) {
  return (
    <button
      type="button"
      className={cx('k-btn', `k-btn--${variant}`, size && `k-btn--${size}`, block && 'k-btn--block', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading
        ? <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={18} /></span>
        : icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, variant, size, iconSize, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('k-iconbtn', variant && `k-iconbtn--${variant}`, size && `k-iconbtn--${size}`, className)}
      {...rest}
    >
      <Icon name={icon} size={iconSize || (size === 'lg' ? 24 : 22)} />
    </button>
  )
}

export function Card({ tone, flush, className, children, ...rest }) {
  return (
    <div className={cx('k-card', tone && `k-card--${tone}`, flush && 'k-card--flush', className)} {...rest}>
      {children}
    </div>
  )
}

export function Pill({ tone, icon, className, children, ...rest }) {
  return (
    <span className={cx('k-pill', tone && `k-pill--${tone}`, className)} {...rest}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}

export function Chip({ selected = false, icon, tall, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx('k-chip', tall && 'k-chip--tall', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  )
}

export function Label({ children, style }) {
  return <div className="k-label" style={style}>{children}</div>
}

export function Sheet({ title, onClose, full, footer, children }) {
  return (
    <>
      <div className="k-sheet__backdrop" onClick={onClose} />
      <div className={cx('k-sheet', full && 'k-sheet--full')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="k-sheet__head">
          <div className="k-sheet__title">{title}</div>
          <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} />
        </div>
        <div className="k-sheet__body">{children}</div>
        {footer && <div className="k-sheet__foot">{footer}</div>}
      </div>
    </>
  )
}

export function ProgressRing({ value = 0, max = 1, size = 112, stroke = 11, color = 'var(--accent)', track = 'rgba(255,255,255,0.14)', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

export function ProgressBar({ value = 0, max = 1, color = 'var(--primary-bg)', track = 'var(--bg-tertiary)', height = 8 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <div style={{ height, borderRadius: height, background: track, overflow: 'hidden' }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export function Avatar({ name = '', initials, src, color, size, className, style }) {
  const text = initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <span className={cx('k-avatar', size && `k-avatar--${size}`, className)} style={{ ...(color && { background: color }), ...style }}>
      {src ? <img src={src} alt="" /> : text}
    </span>
  )
}

/** options: [{ id, label, icon?, count? }] */
export function Segmented({ options, value, onChange, size, surface, className, style }) {
  return (
    <div className={cx('k-seg', size && `k-seg--${size}`, surface && 'k-seg--surface', className)} style={style} role="group">
      {options.map(o => (
        <button key={o.id} type="button" className="k-seg__item" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
          {o.count != null && <span style={{ opacity: 0.7 }}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', small, style, ...rest }) {
  return (
    <label className="k-search" style={style}>
      <Icon name="search" size={18} />
      <input
        className={cx('k-input', small && 'k-input--sm')}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} {...rest}
      />
    </label>
  )
}

export function Field({ label, error, children, style }) {
  return (
    <label className="k-field" style={style}>
      {label && <span className="k-field__label">{label}</span>}
      {children}
      {error && <span className="k-field__error">{error}</span>}
    </label>
  )
}

/** Diálogo centrado para el panel admin. En móvil usa <Sheet>. */
export function Modal({ title, onClose, wide, footer, children }) {
  return (
    <>
      <div className="k-sheet__backdrop" onClick={onClose} />
      <div className={cx('k-modal', wide && 'k-modal--wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="k-sheet__head">
          <div className="k-sheet__title">{title}</div>
          <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} />
        </div>
        <div className="k-sheet__body">{children}</div>
        {footer && <div className="k-sheet__foot">{footer}</div>}
      </div>
    </>
  )
}

export function Empty({ icon = 'circle-dashed', children }) {
  return (
    <div className="k-empty">
      <Icon name={icon} size={36} />
      <div>{children}</div>
    </div>
  )
}

export function Bone({ w = '100%', h = 14, r, style }) {
  return <div className="k-bone" style={{ width: w, height: h, ...(r != null && { borderRadius: r }), ...style }} />
}
