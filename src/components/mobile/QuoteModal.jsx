import React, { useState, useMemo } from 'react'
import Icon from '../shared/Icon'
import { MOCK_PRODUCTS, MOCK_PROSPECTS } from '../../constants/mockData'

const fmt  = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })
const CATS = ['Todos', ...Array.from(new Set(MOCK_PRODUCTS.map(p => p.category)))]

// ── Inline SVGs ───────────────────────────────────────────────────
function IcoSearch({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function IcoPlus({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IcoMinus({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IcoTrash({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
function IcoCheck({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IcoFile({ size = 30, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

// ── SuccessView ───────────────────────────────────────────────────
function SuccessView({ items, prospect }) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  return (
    <div style={{ padding: '36px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IcoFile size={30} color="#854F0B" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>¡Cotización generada!</div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
        {prospect && <><b style={{ color: 'var(--fg)' }}>{prospect}</b> · </>}
        <b style={{ color: 'var(--fg)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</b> · {fmt(total)}
      </div>
      <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {items.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--fg)' }}>{i.qty}× {i.name}</span>
            <span style={{ color: 'var(--fg-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(i.price * i.qty)}</span>
          </div>
        ))}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontSize: 14 }}>
          <span style={{ color: 'var(--fg)' }}>Total</span>
          <span style={{ color: 'var(--kiuvo-blue)' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function QuoteModal({ onClose, onGenerated }) {
  const [step, setStep]           = useState('form')   // form | success
  const [search, setSearch]       = useState('')
  const [cat, setCat]             = useState('Todos')
  const [items, setItems]         = useState([])        // { id, name, sku, price, unit, qty }
  const [prospect, setProspect]   = useState('')
  const [showProspects, setShowProspects] = useState(false)

  // filtered product catalog
  const catalog = useMemo(() => MOCK_PRODUCTS.filter(p => {
    const matchCat  = cat === 'Todos' || p.category === cat
    const matchText = p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  }), [search, cat])

  const addItem = product => {
    setItems(prev => {
      const exists = prev.find(i => i.id === product.id)
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const setQty = (id, qty) => {
    if (qty < 1) { removeItem(id); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id))

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const canSubmit = items.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onGenerated?.(prospect, total)
    setStep('success')
    setTimeout(onClose, 2200)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {step === 'success' ? (
          <SuccessView items={items} prospect={prospect} />
        ) : (
          <>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Nueva cotización</div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)',
              }}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              {/* Prospect picker */}
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 6 }}>CLIENTE</div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={prospect}
                    onChange={e => { setProspect(e.target.value); setShowProspects(true) }}
                    onFocus={() => setShowProspects(true)}
                    placeholder="Buscar o escribir nombre del cliente…"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 32px',
                      background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <IcoSearch size={14} color="var(--fg-tertiary)" />
                  </span>
                  {showProspects && prospect.length >= 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      background: 'var(--surface)', border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r-md)', marginTop: 4, maxHeight: 160, overflowY: 'auto',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}>
                      {MOCK_PROSPECTS
                        .filter(p => p.name.toLowerCase().includes(prospect.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setProspect(p.name); setShowProspects(false) }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 14px',
                              fontSize: 13, color: 'var(--fg)',
                              borderBottom: '0.5px solid var(--border)',
                            }}
                          >
                            {p.name}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Items added */}
              {items.length > 0 && (
                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                    PRODUCTOS EN COTIZACIÓN ({items.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', background: 'var(--surface)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
                            {fmt(item.price)}/{item.unit} · <span style={{ color: 'var(--kiuvo-blue)', fontWeight: 500 }}>{fmt(item.price * item.qty)}</span>
                          </div>
                        </div>
                        {/* Qty controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)' }}>
                          <button
                            onClick={() => setQty(item.id, item.qty - 1)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
                          >
                            <IcoMinus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => setQty(item.id, parseInt(e.target.value) || 1)}
                            style={{
                              width: 36, textAlign: 'center', fontSize: 13, fontWeight: 500,
                              color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none',
                              fontFamily: 'inherit', padding: 0,
                            }}
                          />
                          <button
                            onClick={() => setQty(item.id, item.qty + 1)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
                          >
                            <IcoPlus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <IcoTrash size={13} color="var(--danger)" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catalog */}
              <div style={{ padding: '0 16px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>CATÁLOGO DE PRODUCTOS</div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <IcoSearch size={14} color="var(--fg-tertiary)" />
                  </span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o SKU…"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '9px 10px 9px 30px',
                      background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {CATS.map(c => {
                    const on = cat === c
                    return (
                      <button key={c} onClick={() => setCat(c)} style={{
                        flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: on ? 500 : 400,
                        border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                        background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                        color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
                      }}>
                        {c}
                      </button>
                    )
                  })}
                </div>

                {/* Product list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
                  {catalog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-tertiary)', fontSize: 13 }}>Sin resultados</div>
                  ) : catalog.map(p => {
                    const inCart = items.find(i => i.id === p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          padding: '11px 12px',
                          background: inCart ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                          border: `0.5px solid ${inCart ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                          borderRadius: 'var(--r-md)', textAlign: 'left',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: inCart ? 'var(--kiuvo-blue-deep)' : 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{p.sku} · {p.category}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: inCart ? 'var(--kiuvo-blue)' : 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.price)}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>/{p.unit}</div>
                        </div>
                        <div style={{
                          width: 28, height: 28, borderRadius: 'var(--r-sm)', flexShrink: 0,
                          background: inCart ? 'var(--kiuvo-blue)' : 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {inCart
                            ? <IcoCheck size={14} color="#fff" />
                            : <IcoPlus size={14} color="var(--fg-secondary)" />
                          }
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
              {items.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '14px',
                  background: canSubmit ? '#854F0B' : 'var(--bg-tertiary)',
                  color: canSubmit ? '#fff' : 'var(--fg-tertiary)',
                  borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
                  opacity: canSubmit ? 1 : 0.6,
                }}
              >
                Generar cotización
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
