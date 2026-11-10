import React, { useState, useMemo } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Card, Label, Segmented, SearchInput, Empty } from '../ui'
import { useProducts } from '../../hooks/useProducts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })

const stepBtn = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }

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
    <Sheet title="Listo" onClose={onClose} footer={<Button block size="lg" onClick={onClose}>Entendido</Button>}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="clipboard-check" size={40} />
        </div>
        <div className="k-display" style={{ fontSize: 24, fontWeight: 700 }}>¡Orden enviada!</div>
        <div style={{ fontSize: 15, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
          La orden de producción para <b style={{ color: 'var(--fg)' }}>{prospect.name}</b> fue enviada al administrador para su aprobación.
        </div>
        <Card style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
          <Icon name="info-circle" size={20} color="var(--fg-tertiary)" style={{ marginTop: 1 }} />
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
            Si la orden es rechazada, el prospecto volverá automáticamente a <b>Negociación</b> y recibirás una notificación.
          </div>
        </Card>
      </div>
    </Sheet>
  )

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <Sheet
      full
      title="Orden de producción"
      onClose={onClose}
      footer={
        <>
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</span>
              <span className="k-num" style={{ fontSize: 28 }}>{fmt(total)}</span>
            </div>
          )}
          {error && (
            <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--coral-soft)', borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--coral-fg)' }}>
              {error}
            </div>
          )}
          <Button block size="lg" icon="clipboard-list" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? 'Enviando…' : 'Enviar orden de producción'}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 20 }}>{prospect.name}</div>

      {/* Items added */}
      {items.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <Label>Productos en la orden ({items.length})</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <Card key={item.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <button aria-label="Quitar producto" onClick={() => removeItem(item.id)} style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--coral-soft)', color: 'var(--coral-fg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>
                    {fmt(item.price)}/{item.unit} · <b style={{ color: 'var(--fg)' }}>{fmt(item.price * item.qty)}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--r-full)', flexShrink: 0 }}>
                    <button aria-label="Menos" onClick={() => setQty(item.id, item.qty - 1)} style={stepBtn}>
                      <Icon name="minus" size={18} />
                    </button>
                    <input
                      type="number" min="1" value={item.qty} aria-label="Cantidad"
                      onChange={e => setQty(item.id, parseInt(e.target.value) || 1)}
                      style={{ width: 44, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', padding: 0, fontFamily: 'inherit' }}
                    />
                    <button aria-label="Más" onClick={() => setQty(item.id, item.qty + 1)} style={stepBtn}>
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Catalog */}
      <Label>Catálogo</Label>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o SKU…" style={{ marginBottom: 10 }} />
      <Segmented
        size="lg" surface
        options={cats.map(c => ({ id: c, label: c }))}
        value={cat} onChange={setCat}
        style={{ display: 'flex', marginBottom: 12 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {catalog.length === 0 ? (
          <Empty icon="package">Sin resultados</Empty>
        ) : catalog.map(p => {
          const inOrder = items.find(i => i.id === p.id)
          return (
            <button key={p.id} onClick={() => addItem(p)} className="k-card" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 64,
              textAlign: 'left', width: '100%',
              boxShadow: inOrder ? 'inset 0 0 0 2px var(--fg)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>{p.sku} · {p.category}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="k-num" style={{ fontSize: 16 }}>{fmt(p.price)}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 3 }}>/{p.unit}</div>
              </div>
              <span style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: inOrder ? 'var(--primary-bg)' : 'var(--bg-secondary)',
                color: inOrder ? 'var(--primary-fg)' : 'var(--fg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={inOrder ? 'check' : 'plus'} size={18} />
              </span>
            </button>
          )
        })}
      </div>

      {/* Notes */}
      <Label>Notas para producción (opcional)</Label>
      <textarea
        className="k-input"
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Instrucciones especiales, tiempos de entrega, especificaciones…"
        rows={3}
      />
    </Sheet>
  )
}
