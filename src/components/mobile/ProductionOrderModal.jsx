import React, { useState, useMemo } from 'react'
import Icon from '../shared/Icon'
import { useProducts } from '../../hooks/useProducts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })

export default function ProductionOrderModal({ prospect, onClose, onCreated }) {
  const { user } = useAuth()
  const { products: allProducts } = useProducts()
  const [items,      setItems]      = useState([])
  const [notes,      setNotes]      = useState('')
  const [cat,        setCat]        = useState('Todos')
  const [search,     setSearch]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  const cats = useMemo(() =>
    ['Todos', ...Array.from(new Set(allProducts.map(p => p.category))).sort()],
    [allProducts]
  )

  const catalog = useMemo(() => allProducts.filter(p => {
    const matchCat  = cat === 'Todos' || p.category === cat
    const matchText = p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  }), [allProducts, search, cat])

  const addItem = product => setItems(prev => {
    const exists = prev.find(i => i.id === product.id)
    if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
    return [...prev, { ...product, qty: 1 }]
  })

  const setQty = (id, qty) => {
    if (qty < 1) { removeItem(id); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id))

  const total     = items.reduce((s, i) => s + i.price * i.qty, 0)
  const canSubmit = items.length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase
      .from('production_orders')
      .insert({
        prospect_id: prospect.id,
        seller_id:   user.id,
        status:      'pending',
        items: items.map(i => ({
          product_name: i.name,
          sku:          i.sku  ?? null,
          unit:         i.unit ?? null,
          quantity:     i.qty,
          unit_price:   i.price,
          discount_pct: i.discountPct ?? 0,
        })),
        total,
        notes: notes.trim() || null,
      })

    if (err) {
      console.error('production_orders insert:', err)
      setError('No se pudo enviar la orden. Intenta de nuevo.')
      setSubmitting(false)
      return
    }

    setDone(true)
    setSubmitting(false)
    onCreated?.()
  }

  // ── Success screen ────────────────────────────────────────────────
  if (done) return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        padding: '28px 24px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clipboard-check" size={30} color="#1D9E75" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>¡Orden enviada!</div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
          La orden de producción para <b style={{ color: 'var(--fg)' }}>{prospect.name}</b> fue enviada al administrador para su aprobación.
        </div>
        <div style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="info-circle" size={16} color="var(--fg-tertiary)" />
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.5 }}>
            Si la orden es rechazada, el prospecto volverá automáticamente a <b>Negociación</b> y recibirás una notificación.
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '100%', padding: '13px',
          background: '#1D9E75', color: '#fff',
          borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
        }}>
          Entendido
        </button>
      </div>
    </>
  )

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Orden de producción</div>
            <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500, marginTop: 1 }}>{prospect.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Items added */}
          {items.length > 0 && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                PRODUCTOS EN LA ORDEN ({items.length})
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
                      <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>
                        {fmt(item.price)}/{item.unit} · <b style={{ color: 'var(--fg)' }}>{fmt(item.price * item.qty)}</b>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)' }}>
                      <button onClick={() => setQty(item.id, item.qty - 1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                        <Icon name="minus" size={14} />
                      </button>
                      <input
                        type="number" min="1" value={item.qty}
                        onChange={e => setQty(item.id, parseInt(e.target.value) || 1)}
                        style={{ width: 36, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', padding: 0, fontFamily: 'inherit' }}
                      />
                      <button onClick={() => setQty(item.id, item.qty + 1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                        <Icon name="plus" size={14} />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="trash" size={13} color="var(--danger)" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog */}
          <div style={{ padding: '0 16px', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>CATÁLOGO</div>

            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Icon name="search" size={14} color="var(--fg-tertiary)" />
              </span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '9px 10px 9px 30px',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {cats.map(c => {
                const on = cat === c
                return (
                  <button key={c} onClick={() => setCat(c)} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: on ? 500 : 400,
                    border: `0.5px solid ${on ? '#1D9E75' : 'var(--border)'}`,
                    background: on ? '#E1F5EE' : 'var(--surface)',
                    color: on ? '#1D9E75' : 'var(--fg)',
                  }}>{c}</button>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
              {catalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-tertiary)', fontSize: 13 }}>Sin resultados</div>
              ) : catalog.map(p => {
                const inOrder = items.find(i => i.id === p.id)
                return (
                  <button key={p.id} onClick={() => addItem(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                    background: inOrder ? '#E1F5EE' : 'var(--surface)',
                    border: `0.5px solid ${inOrder ? '#1D9E75' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', textAlign: 'left',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: inOrder ? '#0D6E50' : 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{p.sku} · {p.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: inOrder ? '#1D9E75' : 'var(--fg)' }}>{fmt(p.price)}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>/{p.unit}</div>
                    </div>
                    <div style={{
                      width: 28, height: 28, borderRadius: 'var(--r-sm)', flexShrink: 0,
                      background: inOrder ? '#1D9E75' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={inOrder ? 'check' : 'plus'} size={14} color={inOrder ? '#fff' : 'var(--fg-secondary)'} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 6 }}>NOTAS PARA PRODUCCIÓN (opcional)</div>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, tiempos de entrega, especificaciones…"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                outline: 'none', fontFamily: 'inherit', resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>{fmt(total)}</span>
            </div>
          )}
          {error && (
            <div style={{ marginBottom: 10, padding: '10px 14px', background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px',
              background: canSubmit ? '#1D9E75' : 'var(--bg-tertiary)',
              color: canSubmit ? '#fff' : 'var(--fg-tertiary)',
              borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
              opacity: canSubmit ? 1 : 0.6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="clipboard-list" size={18} color={canSubmit ? '#fff' : 'var(--fg-tertiary)'} />
            {submitting ? 'Enviando…' : 'Enviar orden de producción'}
          </button>
        </div>
      </div>
    </>
  )
}
