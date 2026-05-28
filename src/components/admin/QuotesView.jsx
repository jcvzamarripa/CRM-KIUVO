import React, { useState, useRef, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useProducts } from '../../hooks/useProducts'
import { rules } from '../../lib/validation'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'


const STATUS = {
  draft:    { label: 'Borrador',  bg: 'var(--bg-secondary)',  fg: 'var(--fg-secondary)', border: 'var(--border)' },
  sent:     { label: 'Enviada',   bg: 'var(--info-bg)',       fg: 'var(--info)',          border: 'var(--info)' },
  approved: { label: 'Aprobada', bg: 'var(--success-bg)',    fg: 'var(--success)',       border: 'var(--success)' },
  rejected: { label: 'Rechazada',bg: 'var(--danger-bg)',     fg: 'var(--danger)',        border: 'var(--danger)' },
}

const fmt = n => '$' + n.toLocaleString('es-MX')
const sellerName  = (sellers, init) => sellers.find(s => s.init === init)?.name  || init
const sellerColor = (sellers, init) => sellers.find(s => s.init === init)?.color || '#888'

// ─── QtyInput: allows free typing; commits on blur ───────────────────────────
function QtyInput({ qty, onChange, style }) {
  const [raw, setRaw] = useState(String(qty))
  const prev = useRef(qty)
  useEffect(() => {
    if (qty !== prev.current) { prev.current = qty; setRaw(String(qty)) }
  }, [qty])

  function handleChange(e) {
    setRaw(e.target.value)
    const n = parseInt(e.target.value, 10)
    if (!isNaN(n) && n >= 1) { prev.current = n; onChange(n) }
  }

  function handleBlur() {
    const n = parseInt(raw, 10)
    if (isNaN(n) || n < 1) setRaw(String(qty))
  }

  return (
    <input type="number" min="1" value={raw}
      onChange={handleChange} onBlur={handleBlur} style={style} />
  )
}

// ─── New Quote Panel ──────────────────────────────────────────────────────────
function NewQuotePanel({ onClose, onSave, nextId, sellers = [], prospects = [], products = [] }) {
  const [prospect,    setProspect]    = useState('')
  const [seller,      setSeller]      = useState(sellers[0]?.init || '')
  const [items,       setItems]       = useState([])
  const [daysValid,   setDaysValid]   = useState('15')
  const [daysError,   setDaysError]   = useState(null)
  const [notes,       setNotes]       = useState('')
  const [search,      setSearch]      = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)
  const searchRef = useRef(null)

  // Click-outside to close product search
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredProducts = products.filter(p =>
    search.length > 0 &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 6)

  function addProduct(p) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === p.id)
      if (existing) return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, price: p.price, qty: 1 }]
    })
    setSearch('')
    setSearchOpen(false)
  }

  function updateQty(productId, qty) {
    // qty < 1 only happens from the − button (QtyInput won't fire below 1)
    if (qty < 1) { setItems(prev => prev.filter(i => i.productId !== productId)); return }
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i))
  }

  function updatePrice(productId, price) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, price } : i))
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const iva      = Math.round(subtotal * 0.16)
  const total    = subtotal + iva

  const canSave  = prospect.trim() !== '' && items.length > 0

  function handleSave(status) {
    if (!canSave) return
    const daysErr = rules.numRange(daysValid, 1, 365, 'Días de vigencia')
    if (daysErr) { setDaysError(daysErr); return }
    setDaysError(null)
    const days = parseInt(daysValid) || 15
    onSave({
      id:       nextId,
      prospect: prospect.trim(),
      seller,
      status,
      total,
      items:    items.length,
      created:  'Hoy',
      due:      `En ${days} días`,
    })
    onClose()
  }

  return (
    <div style={{
      width: 420, flexShrink: 0,
      borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Nueva cotización</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{nextId}</div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Prospect */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>
            PROSPECTO / CLIENTE
          </label>
          <select
            value={prospect}
            onChange={e => setProspect(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 13,
              border: `0.5px solid ${prospect ? 'var(--border)' : 'var(--warning-border)'}`,
              borderRadius: 'var(--r-md)', background: 'var(--bg)', color: prospect ? 'var(--fg)' : 'var(--fg-tertiary)',
            }}
          >
            <option value="">— Seleccionar prospecto —</option>
            {prospects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        {/* Seller */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>
            VENDEDOR
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sellers.map(s => (
              <button
                key={s.init}
                onClick={() => setSeller(s.init)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 12px', borderRadius: 'var(--r-md)', fontSize: 12,
                  border: `1px solid ${seller === s.init ? s.color : 'var(--border)'}`,
                  background: seller === s.init ? s.color + '18' : 'var(--bg)',
                  color: seller === s.init ? s.color : 'var(--fg-secondary)',
                  fontWeight: seller === s.init ? 600 : 400,
                  transition: 'all 0.1s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: s.color + '30', color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700,
                }}>{s.init}</div>
                {s.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Product search */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>
            PRODUCTOS ({items.length})
          </label>
          <div ref={searchRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={13} color="var(--fg-tertiary)" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar producto por nombre o SKU…"
                style={{
                  width: '100%', padding: '8px 10px 8px 30px', fontSize: 12,
                  border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                  background: 'var(--bg)', color: 'var(--fg)', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Dropdown results */}
            {searchOpen && filteredProducts.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 50, overflow: 'hidden',
              }}>
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => addProduct(p)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '0.5px solid var(--border)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{p.sku} · {p.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--kiuvo-blue)' }}>
                        ${p.price.toLocaleString('es-MX')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>/{p.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div style={{
              marginTop: 10, border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 80px 28px',
                gap: 6, padding: '6px 10px',
                background: 'var(--bg-secondary)',
                fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)',
              }}>
                <div>PRODUCTO</div><div style={{ textAlign: 'center' }}>CANT.</div><div style={{ textAlign: 'right' }}>PRECIO</div><div />
              </div>

              {items.map((item, idx) => (
                <div key={item.productId} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 80px 28px',
                  gap: 6, padding: '8px 10px', alignItems: 'center',
                  borderTop: '0.5px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.3 }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{item.sku}</div>
                  </div>

                  {/* Qty stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      style={{ width: 18, height: 18, borderRadius: 4, border: '0.5px solid var(--border)', background: 'var(--bg)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
                    >−</button>
                    <QtyInput
                      qty={item.qty}
                      onChange={n => updateQty(item.productId, n)}
                      style={{ width: 28, fontSize: 12, fontWeight: 600, textAlign: 'center', color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', padding: 0 }}
                    />
                    <button
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      style={{ width: 18, height: 18, borderRadius: 4, border: '0.5px solid var(--border)', background: 'var(--bg)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
                    >+</button>
                  </div>

                  {/* Price */}
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%', padding: '3px 6px', fontSize: 11, textAlign: 'right',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--r-sm)',
                      background: 'var(--bg)', color: 'var(--fg)',
                    }}
                  />

                  <button onClick={() => removeItem(item.productId)} style={{ color: 'var(--fg-tertiary)', display: 'flex', justifyContent: 'center' }}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}

              {/* Totals */}
              <div style={{ padding: '10px 10px 8px', borderTop: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {[
                  { label: 'Subtotal', val: subtotal },
                  { label: 'IVA 16%',  val: iva      },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 3 }}>
                    <span>{r.label}</span>
                    <span>${r.val.toLocaleString('es-MX')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginTop: 5, paddingTop: 5, borderTop: '0.5px solid var(--border)' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--kiuvo-blue)' }}>${total.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validity + Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>VÁLIDA POR (días)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={daysValid}
              onChange={e => { setDaysValid(e.target.value); if (daysError) setDaysError(null) }}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 13,
                border: `0.5px solid ${daysError ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--fg)', boxSizing: 'border-box',
              }}
            />
            {daysError && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {daysError}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>VENDEDOR ASIGNADO</label>
            <div style={{ padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--fg)' }}>
              {sellers.find(s => s.init === seller)?.name.split(' ')[0] || seller}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5 }}>NOTAS INTERNAS</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones, condiciones especiales…"
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12,
              border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--bg)', color: 'var(--fg)',
              resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {!canSave && (
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="alert-circle" size={12} color="var(--fg-tertiary)" />
            {!prospect ? 'Selecciona un prospecto' : 'Agrega al menos un producto'}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '12px 18px', borderTop: '0.5px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <button
          onClick={() => handleSave('draft')}
          disabled={!canSave}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
            border: '0.5px solid var(--border)',
            background: canSave ? 'var(--bg)' : 'var(--bg-secondary)',
            color: canSave ? 'var(--fg)' : 'var(--fg-tertiary)',
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          Guardar borrador
        </button>
        <button
          onClick={() => handleSave('sent')}
          disabled={!canSave}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 600,
            background: canSave ? 'var(--kiuvo-blue)' : 'var(--bg-secondary)',
            color: canSave ? '#fff' : 'var(--fg-tertiary)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 2px 8px #185FA530' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Icon name="brand-whatsapp" size={13} color={canSave ? '#fff' : 'var(--fg-tertiary)'} />
          Crear y enviar
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Main QuotesView ──────────────────────────────────────────────────────────
export default function QuotesView() {
  const { sellers }    = useSellers()
  const { prospects }  = useAdminProspects()
  const { products }   = useProducts()
  const [filter,    setFilter]    = useState('all')
  const [selected,  setSelected]  = useState(null)
  const [showNew,   setShowNew]   = useState(false)
  const [quotes,    setQuotes]    = useState([])
  const [loading,   setLoading]   = useState(true)

  const loadQuotes = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id, status, total, notes, created_at,
        prospect:prospects!prospect_id (id, name),
        seller:profiles!seller_id (id, full_name, initials, avatar_color),
        items:quote_items (id)
      `)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setQuotes(data.map(q => {
        const createdAt = new Date(q.created_at)
        const dueAt     = new Date(createdAt.getTime() + 15 * 86400000)
        const today     = new Date()
        const diffDays  = Math.ceil((dueAt - today) / 86400000)
        const dueLabel  = diffDays < 0 ? 'Vencida'
                        : diffDays === 0 ? 'Vence hoy'
                        : dueAt.toLocaleDateString('es-MX')
        return {
          id:               q.id,
          prospect:         q.prospect?.name || q.notes || 'Sin prospecto',
          seller:           q.seller?.initials || '?',
          seller_color:     q.seller?.avatar_color || '#888',
          seller_full_name: q.seller?.full_name || '',
          status:           q.status || 'draft',
          total:            q.total || 0,
          items:            q.items?.length || 0,
          created:          createdAt.toLocaleDateString('es-MX'),
          due:              dueLabel,
        }
      }))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadQuotes() }, [loadQuotes])

  function handleNewQuote(q) {
    setQuotes(prev => [q, ...prev])
    setSelected(q)
  }

  const nextId = `COT-${String(quotes.length + 1).padStart(4, '0')}`

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

  const totals = {
    all:      quotes.reduce((s, q) => s + q.total, 0),
    sent:     quotes.filter(q => q.status === 'sent').reduce((s, q) => s + q.total, 0),
    approved: quotes.filter(q => q.status === 'approved').reduce((s, q) => s + q.total, 0),
    draft:    quotes.filter(q => q.status === 'draft').length,
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Summary cards */}
        <style>{`
          .quotes-summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; padding:16px 20px; border-bottom:0.5px solid var(--border); flex-shrink:0; }
          @media (max-width:1024px) { .quotes-summary-grid { grid-template-columns:repeat(2,1fr); } }
          @media (max-width:600px)  { .quotes-summary-grid { grid-template-columns:1fr; } }
        `}</style>
        <div className="quotes-summary-grid">
          {[
            { label: 'Pipeline total',    value: fmt(totals.all),      sub: `${quotes.length} cotizaciones`,     accent: 'var(--kiuvo-blue)' },
            { label: 'Enviadas',          value: fmt(totals.sent),     sub: `${quotes.filter(q=>q.status==='sent').length} en espera`,  accent: 'var(--info)' },
            { label: 'Aprobadas',         value: fmt(totals.approved), sub: `${quotes.filter(q=>q.status==='approved').length} esta semana`, accent: 'var(--success)' },
            { label: 'Borradores',        value: totals.draft,         sub: 'Pendientes de enviar',                  accent: 'var(--fg-secondary)' },
          ].map(c => (
            <div key={c.label} style={{
              padding: '12px 16px', background: 'var(--surface)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)',
              borderTop: `2px solid ${c.accent}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
        }}>
          {[['all','Todas'],['draft','Borrador'],['sent','Enviadas'],['approved','Aprobadas'],['rejected','Rechazadas']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 14px', borderRadius: 'var(--r-full)', fontSize: 12,
              background: filter === k ? 'var(--kiuvo-blue)' : 'var(--surface)',
              color: filter === k ? '#fff' : 'var(--fg-secondary)',
              border: `0.5px solid ${filter === k ? 'transparent' : 'var(--border)'}`,
              fontWeight: filter === k ? 500 : 400,
            }}>{l}</button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => { setShowNew(true); setSelected(null) }}
              style={{
                padding: '7px 14px', background: 'var(--kiuvo-blue)', color: '#fff',
                borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px #185FA530',
              }}
            >
              <Icon name="plus" size={13} color="#fff" />
              Nueva cotización
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['#', 'Prospecto', 'Vendedor', 'Total', 'Productos', 'Estado', 'Creada', 'Vencimiento', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '9px 14px', textAlign: i === 0 || i >= 6 ? 'center' : 'left',
                    fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                    borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
                    Cargando cotizaciones…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-tertiary)' }}>
                    <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📋</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Sin cotizaciones</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {filter === 'all' ? 'Crea tu primera cotización con el botón "+ Nueva cotización".' : `No hay cotizaciones con estado "${filter}".`}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(q => {
                const st    = STATUS[q.status] ?? STATUS.draft
                const sColor = q.seller_color || sellerColor(sellers, q.seller)
                const sName  = q.seller_full_name || sellerName(sellers, q.seller)
                // Shorten UUID for display
                const displayId = typeof q.id === 'string' && q.id.includes('-')
                  ? q.id.slice(0, 8).toUpperCase()
                  : q.id
                return (
                  <tr
                    key={q.id}
                    onClick={() => setSelected(prev => prev?.id === q.id ? null : q)}
                    style={{
                      cursor: 'pointer',
                      background: selected?.id === q.id ? 'var(--kiuvo-blue-soft)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--fg-secondary)' }}>{displayId}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, color: 'var(--fg)' }}>
                      {q.prospect}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: sColor + '22', color: sColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500,
                        }}>{q.seller}</div>
                        <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{sName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(q.total)}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'left', color: 'var(--fg-secondary)', fontSize: 12 }}>
                      {q.items} partidas
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: 'var(--r-full)',
                        background: st.bg, color: st.fg, fontSize: 11, fontWeight: 500,
                        border: `0.5px solid ${st.border}22`,
                      }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--fg-secondary)' }}>
                      {q.created}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 12, color: q.due === 'Vencida' || q.due === 'Vence hoy' ? 'var(--danger)' : 'var(--fg-secondary)' }}>
                      {q.due}
                    </td>
                    <td style={{ padding: '11px 10px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <Icon name="chevron-right" size={14} color="var(--fg-tertiary)" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quote Panel */}
      {showNew && (
        <NewQuotePanel
          nextId={nextId}
          onClose={() => setShowNew(false)}
          onSave={handleNewQuote}
          sellers={sellers}
          prospects={prospects}
          products={products}
        />
      )}

      {/* Detail */}
      {selected && !showNew && (
        <div style={{
          width: 300, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
          background: 'var(--surface)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{selected.id}</div>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--fg-tertiary)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            <span style={{
              display: 'inline-block', padding: '4px 10px', borderRadius: 'var(--r-full)', alignSelf: 'flex-start',
              background: STATUS[selected.status].bg, color: STATUS[selected.status].fg,
              fontSize: 12, fontWeight: 500,
            }}>{STATUS[selected.status].label}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{selected.prospect}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
                {selected.seller_full_name || sellerName(sellers, selected.seller)}
              </div>
            </div>
            {[
              { label: 'Total',       value: fmt(selected.total) },
              { label: 'Partidas',    value: `${selected.items} productos` },
              { label: 'Creada',      value: selected.created },
              { label: 'Vencimiento', value: selected.due },
            ].map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{r.value}</div>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button style={{
                width: '100%', padding: '10px 0', borderRadius: 'var(--r-md)',
                background: 'var(--kiuvo-blue)', color: '#fff', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Icon name="download" size={14} />
                Descargar PDF
              </button>
              <button style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--fg)', fontSize: 13, fontWeight: 500,
              }}>
                Ver detalle completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
