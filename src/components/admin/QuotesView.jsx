import React, { useState, useRef, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useProducts } from '../../hooks/useProducts'
import { rules } from '../../lib/validation'
import { supabase } from '../../lib/supabase'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { QuotePDFDoc } from '../../lib/quotePDF'


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
  const { sellers }   = useSellers()
  const { prospects } = useAdminProspects()
  const { products }  = useProducts()

  // sellerId=null → sin filtro → admin ve todas las cotizaciones de todos los vendedores
  // useQuoteHistory tiene Realtime incorporado y manejo de errores
  const { quotes: rawQuotes, loading, error: quotesError } = useQuoteHistory({ sellerId: null })

  const [filter,        setFilter]        = useState('all')
  const [sellerFilter,  setSellerFilter]  = useState('all')
  const [selected,      setSelected]      = useState(null)
  const [showNew,       setShowNew]       = useState(false)
  const [downloading,   setDownloading]   = useState(null)
  const [exportFlash,   setExportFlash]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [quoteItems,    setQuoteItems]    = useState([])
  const [loadingItems,  setLoadingItems]  = useState(false)
  const [showItems,     setShowItems]     = useState(false)

  async function loadQuoteItems(quoteId) {
    setLoadingItems(true)
    setShowItems(true)
    const { data, error } = await supabase
      .from('quote_items')
      .select('product_name, sku, unit, quantity, unit_price, discount_pct')
      .eq('quote_id', quoteId)
    if (error) {
      console.error('[loadQuoteItems]', error)
      setQuoteItems([{ product_name: `Error: ${error.message}`, sku: '', quantity: 0, unit_price: 0, discount_pct: 0 }])
    } else {
      setQuoteItems(data ?? [])
    }
    setLoadingItems(false)
  }

  async function handleDelete(quote) {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const { error } = await supabase.from('quotes').delete().eq('id', quote.id)
    setDeleting(false)
    setConfirmDelete(false)
    if (!error) { setSelected(null) }
    else console.error('[delete quote]', error.message)
  }

  async function generateAndDownloadPDF(quote) {
    setDownloading(quote.id)
    try {
      const { data: items } = await supabase
        .from('quote_items')
        .select('product_name, sku, unit, quantity, unit_price, discount_pct')
        .eq('quote_id', quote.id)

      const pdfItems = (items || []).map((item, idx) => {
        const rawDisc = item.discount_pct ?? 0
        const isSpecialPrice = rawDisc === -1
        const discountPct = isSpecialPrice ? 0 : rawDisc
        const listPrice = discountPct > 0
          ? item.unit_price / (1 - discountPct / 100)
          : item.unit_price
        return {
          id: idx, name: item.product_name, sku: item.sku || '',
          unit: item.unit || 'u.', qty: item.quantity,
          price: listPrice, discountPct, isSpecialPrice,
        }
      })

      // Pre-fetch logo as base64 so the PDF worker doesn't need a separate request
      let logoDataUrl = null
      try {
        const logoRes = await fetch(window.location.origin + '/kiuvo-logo.png')
        if (logoRes.ok) {
          const logoBytes = new Uint8Array(await logoRes.arrayBuffer())
          let binary = ''
          logoBytes.forEach(b => { binary += String.fromCharCode(b) })
          logoDataUrl = `data:image/png;base64,${btoa(binary)}`
        }
      } catch (_) { /* logo fetch failed — PDF will use fallback K box */ }

      const blob = await pdf(
        <QuotePDFDoc
          quoteId={quote.id}
          prospectName={quote.prospect}
          sellerName={quote.seller_full_name}
          items={pdfItems}
          date={quote.createdAt ? new Date(quote.createdAt) : new Date()}
          logoUrl={logoDataUrl}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `cotizacion-${quote.shortId || quote.id.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[generateAndDownloadPDF]', err)
    } finally {
      setDownloading(null)
    }
  }

  // Normalizar al shape que espera esta vista
  const quotes = rawQuotes.map(q => {
    const createdAt = new Date(q.createdAt)
    const dueAt     = new Date(createdAt.getTime() + 15 * 86400000)
    const diffDays  = Math.ceil((dueAt - new Date()) / 86400000)
    const dueLabel  = diffDays < 0   ? 'Vencida'
                    : diffDays === 0  ? 'Vence hoy'
                    : dueAt.toLocaleDateString('es-MX')
    return {
      id:               q.id,
      shortId:          q.shortId,
      prospect:         q.prospectName,
      seller:           q.sellerInit,
      seller_color:     q.sellerColor,
      seller_full_name: q.sellerName,
      status:           q.status,
      total:            q.total,
      items:            q.itemCount,
      created:          q.dateStr,
      createdAt:        q.createdAt,
      due:              dueLabel,
      pdfPath:          q.pdfPath,
    }
  })

  function handleNewQuote(q) { setSelected(q) }

  function handleExportCSV() {
    const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`
    const headers = ['#', 'Prospecto', 'Vendedor', 'Total', 'Productos', 'Estado', 'Creada', 'Vencimiento']
    const rows = filtered.map(q => [
      esc(q.shortId || q.id.slice(0, 8)),
      esc(q.prospect),
      esc(q.seller_full_name),
      q.total,
      q.items,
      esc(STATUS[q.status]?.label || q.status),
      esc(q.created),
      esc(q.due),
    ].join(','))
    const csv = '﻿' + [headers.join(','), ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url; a.download = `cotizaciones_kiuvo_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    setExportFlash(true); setTimeout(() => setExportFlash(false), 2200)
  }

  function selectQuote(q) {
    setSelected(prev => prev?.id === q.id ? null : q)
    setConfirmDelete(false)
    setShowItems(false)
    setQuoteItems([])
  }

  const nextId = `COT-${String(quotes.length + 1).padStart(4, '0')}`

  // Aplicar ambos filtros: status + vendedor
  const filtered = quotes
    .filter(q => filter === 'all'       || q.status           === filter)
    .filter(q => sellerFilter === 'all' || q.seller_full_name === sellerFilter)

  // KPIs sobre el subconjunto ya filtrado por vendedor (no por status)
  const sellerBase = sellerFilter === 'all'
    ? quotes
    : quotes.filter(q => q.seller_full_name === sellerFilter)

  const totals = {
    all:      sellerBase.filter(q => q.status !== 'rejected').reduce((s, q) => s + q.total, 0),
    sent:     sellerBase.filter(q => q.status === 'sent').reduce((s, q) => s + q.total, 0),
    approved: sellerBase.filter(q => q.status === 'approved').reduce((s, q) => s + q.total, 0),
    rejected: sellerBase.filter(q => q.status === 'rejected').reduce((s, q) => s + q.total, 0),
    rejectedCount: sellerBase.filter(q => q.status === 'rejected').length,
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
            { label: 'Pipeline total',    value: fmt(totals.all),      sub: `${sellerBase.length} cotizaciones`,                                        accent: 'var(--kiuvo-blue)'   },
            { label: 'Enviadas',          value: fmt(totals.sent),     sub: `${sellerBase.filter(q=>q.status==='sent').length} en espera`,              accent: 'var(--info)'         },
            { label: 'Aprobadas',         value: fmt(totals.approved), sub: `${sellerBase.filter(q=>q.status==='approved').length} aprobadas`,          accent: 'var(--success)'      },
            { label: 'Rechazadas',         value: fmt(totals.rejected), sub: `${totals.rejectedCount} cotizacion${totals.rejectedCount !== 1 ? 'es' : ''} perdida${totals.rejectedCount !== 1 ? 's' : ''}`, accent: 'var(--danger)' },
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

        {/* Filter bar */}
        <div style={{
          padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
        }}>
          {/* Status chips */}
          {[['all','Todas'],['draft','Borrador'],['sent','Enviadas'],['approved','Aprobadas'],['rejected','Rechazadas']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 14px', borderRadius: 'var(--r-full)', fontSize: 12,
              background: filter === k ? 'var(--kiuvo-blue)' : 'var(--surface)',
              color: filter === k ? '#fff' : 'var(--fg-secondary)',
              border: `0.5px solid ${filter === k ? 'transparent' : 'var(--border)'}`,
              fontWeight: filter === k ? 500 : 400,
            }}>{l}</button>
          ))}

          {/* Separator */}
          {sellers.length > 0 && (
            <div style={{ width: '0.5px', height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
          )}

          {/* Seller chips */}
          {sellers.length > 0 && (
            <>
              <button
                onClick={() => setSellerFilter('all')}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12,
                  background: sellerFilter === 'all' ? 'var(--fg)' : 'var(--surface)',
                  color: sellerFilter === 'all' ? 'var(--bg)' : 'var(--fg-secondary)',
                  border: `0.5px solid ${sellerFilter === 'all' ? 'transparent' : 'var(--border)'}`,
                  fontWeight: sellerFilter === 'all' ? 500 : 400,
                }}
              >
                Todos
              </button>
              {sellers.map(s => {
                const on = sellerFilter === s.name
                return (
                  <button
                    key={s.id}
                    onClick={() => setSellerFilter(on ? 'all' : s.name)}
                    title={s.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px 4px 4px', borderRadius: 'var(--r-full)', fontSize: 12,
                      background: on ? s.color + '18' : 'var(--surface)',
                      color: on ? s.color : 'var(--fg-secondary)',
                      border: `0.5px solid ${on ? s.color : 'var(--border)'}`,
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: on ? s.color : s.color + '30',
                      color: on ? '#fff' : s.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                    }}>{s.init}</div>
                    {s.name.split(' ')[0]}
                  </button>
                )
              })}
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={handleExportCSV}
              title="Exportar cotizaciones filtradas a CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 'var(--r-md)',
                border: `0.5px solid ${exportFlash ? 'var(--success)' : 'var(--border)'}`,
                background: exportFlash ? 'var(--success-bg)' : 'var(--surface)',
                color: exportFlash ? 'var(--success)' : 'var(--fg-secondary)',
                fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
              }}
            >
              <Icon name={exportFlash ? 'check' : 'download'} size={13} color={exportFlash ? 'var(--success)' : 'var(--fg-secondary)'} />
              {exportFlash ? 'Descargado' : 'CSV'}
            </button>
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

        {/* Error banner */}
        {quotesError && (
          <div style={{ padding: '10px 20px', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 12, borderBottom: '0.5px solid var(--danger)' }}>
            Error al cargar cotizaciones: {quotesError}
          </div>
        )}

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
                    onClick={() => selectQuote(q)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={async e => {
                            e.stopPropagation()
                            await generateAndDownloadPDF(q)
                          }}
                          title="Descargar PDF"
                          disabled={downloading === q.id}
                          style={{
                            width: 28, height: 28, borderRadius: 'var(--r-md)',
                            background: downloading === q.id ? 'var(--bg-secondary)' : 'var(--kiuvo-blue)',
                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: downloading === q.id ? 'default' : 'pointer', flexShrink: 0,
                          }}
                        >
                          {downloading === q.id
                            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="2.5" strokeLinecap="round" style={{animation:'spin 0.7s linear infinite'}}><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                            : <Icon name="download" size={13} color="#fff" />
                          }
                        </button>
                        <Icon name="chevron-right" size={14} color="var(--fg-tertiary)" />
                      </div>
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
              <button
                onClick={() => generateAndDownloadPDF(selected)}
                disabled={downloading === selected.id}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 'var(--r-md)',
                  background: downloading === selected.id ? 'var(--bg-secondary)' : 'var(--kiuvo-blue)',
                  color: downloading === selected.id ? 'var(--fg-tertiary)' : '#fff',
                  fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: downloading === selected.id ? 'default' : 'pointer',
                }}
              >
                {downloading === selected.id
                  ? <><Icon name="loader" size={14} color="var(--fg-tertiary)" /> Generando PDF…</>
                  : <><Icon name="download" size={14} color="#fff" /> Descargar PDF</>
                }
              </button>
              <button
                onClick={() => showItems ? setShowItems(false) : loadQuoteItems(selected.id)}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                  border: '0.5px solid var(--border)', background: showItems ? 'var(--bg-secondary)' : 'var(--bg)',
                  color: 'var(--fg)', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Icon name={showItems ? 'chevron-up' : 'list'} size={14} color="var(--fg-secondary)" />
                {showItems ? 'Ocultar productos' : 'Ver productos'}
              </button>

              {/* Lista de productos */}
              {showItems && (
                <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  {loadingItems ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--fg-tertiary)' }}>Cargando…</div>
                  ) : quoteItems.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--fg-tertiary)' }}>Sin productos registrados</div>
                  ) : quoteItems.map((item, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderBottom: i < quoteItems.length - 1 ? '0.5px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{item.product_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                          {item.sku && `${item.sku} · `}{item.quantity} {item.unit || 'u.'}
                          {item.discount_pct > 0 && <span style={{ color: 'var(--success)', marginLeft: 4 }}>−{item.discount_pct}%</span>}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--kiuvo-blue)' }}>
                          ${(item.unit_price * item.quantity * (1 - (item.discount_pct || 0) / 100)).toLocaleString('es-MX')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrar cotización */}
              {confirmDelete ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                      border: '0.5px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--fg)', fontSize: 12, fontWeight: 500,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    disabled={deleting}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                      background: 'var(--danger, #dc2626)', color: '#fff',
                      fontSize: 12, fontWeight: 600,
                      opacity: deleting ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {deleting ? '…' : <><Icon name="trash" size={13} color="#fff" /> Confirmar</>}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDelete(selected)}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                    border: '0.5px solid var(--danger, #dc2626)',
                    background: 'transparent',
                    color: 'var(--danger, #dc2626)', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon name="trash" size={14} color="var(--danger, #dc2626)" />
                  Borrar cotización
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
