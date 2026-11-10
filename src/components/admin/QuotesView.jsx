import React, { useState, useRef, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Label, Segmented, Field, Avatar, Empty } from '../ui'
import { useSellers } from '../../hooks/useSellers'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useProducts } from '../../hooks/useProducts'
import { rules } from '../../lib/validation'
import { supabase } from '../../lib/supabase'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { QuotePDFDoc } from '../../lib/quotePDF'
import { saveFile } from '../../lib/saveFile'


const STATUS = {
  draft:    { label: 'Borrador',  tone: undefined },
  sent:     { label: 'Enviada',   tone: 'sky' },
  approved: { label: 'Aprobada',  tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'coral' },
}

const fmt = n => '$' + n.toLocaleString('es-MX')
const sellerName  = (sellers, init) => sellers.find(s => s.init === init)?.name  || init
const sellerColor = (sellers, init) => sellers.find(s => s.init === init)?.color

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
      width: 'min(440px, 100%)', flexShrink: 0,
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      borderRadius: 'var(--r-xl) 0 0 var(--r-xl)', boxShadow: 'var(--shadow-float)',
      animation: 'slideInRight 0.18s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div className="k-h2">Nueva cotización</div>
          <div className="k-dim" style={{ fontSize: 12, marginTop: 2 }}>{nextId}</div>
        </div>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>

        {/* Prospect */}
        <Field label="Prospecto / cliente">
          <select className="k-input" value={prospect} onChange={e => setProspect(e.target.value)}>
            <option value="">— Seleccionar prospecto —</option>
            {prospects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>

        {/* Seller */}
        <Label>Vendedor</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {sellers.map(s => (
            <Chip key={s.init} selected={seller === s.init} onClick={() => setSeller(s.init)} style={{ minHeight: 40, padding: '0 14px 0 6px', fontSize: 13 }}>
              <Avatar size="sm" initials={s.init} color={s.color} />
              {s.name.split(' ')[0]}
            </Chip>
          ))}
        </div>

        {/* Product search */}
        <Label>Productos ({items.length})</Label>
        <div style={{ marginBottom: 18 }}>
          <div ref={searchRef} style={{ position: 'relative' }}>
            <label className="k-search">
              <Icon name="search" size={18} />
              <input
                className="k-input k-input--sm"
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar producto por nombre o SKU…"
              />
            </label>

            {/* Dropdown results */}
            {searchOpen && filteredProducts.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--surface)', borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-float)', zIndex: 50, overflow: 'hidden',
              }}>
                {filteredProducts.map(p => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="k-row" style={{ justifyContent: 'space-between', minHeight: 52 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                      <div className="k-dim" style={{ fontSize: 12 }}>{p.sku} · {p.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        ${p.price.toLocaleString('es-MX')}
                      </div>
                      <div className="k-dim" style={{ fontSize: 12 }}>/{p.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div style={{ marginTop: 10, borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
              {items.map((item, idx) => (
                <div key={item.productId} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 84px 36px',
                  gap: 8, padding: '10px 12px', alignItems: 'center',
                  borderTop: idx ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{item.name}</div>
                    <div className="k-dim" style={{ fontSize: 12 }}>{item.sku}</div>
                  </div>

                  {/* Qty stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      aria-label="Quitar uno"
                      style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}
                    ><Icon name="minus" size={14} /></button>
                    <QtyInput
                      qty={item.qty}
                      onChange={n => updateQty(item.productId, n)}
                      style={{ width: 34, fontSize: 14, fontWeight: 600, textAlign: 'center', color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', padding: 0 }}
                    />
                    <button
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      aria-label="Agregar uno"
                      style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}
                    ><Icon name="plus" size={14} /></button>
                  </div>

                  {/* Price */}
                  <input
                    type="number"
                    className="k-input k-input--sm"
                    value={item.price}
                    onChange={e => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                    style={{ textAlign: 'right', padding: '6px 8px', minHeight: 36, fontSize: 13 }}
                  />

                  <button onClick={() => removeItem(item.productId)} aria-label="Quitar producto" style={{ width: 36, height: 36, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}

              {/* Totals */}
              <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                {[
                  { label: 'Subtotal', val: subtotal },
                  { label: 'IVA 16%',  val: iva      },
                ].map(r => (
                  <div key={r.label} className="k-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{r.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>${r.val.toLocaleString('es-MX')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                  <span className="k-num" style={{ fontSize: 22 }}>${total.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validity + Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Válida por (días)" error={daysError}>
            <input
              type="number" min="1" max="365" className="k-input"
              value={daysValid}
              onChange={e => { setDaysValid(e.target.value); if (daysError) setDaysError(null) }}
            />
          </Field>
          <Field label="Vendedor asignado">
            <div className="k-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', boxShadow: 'none' }}>
              {sellers.find(s => s.init === seller)?.name.split(' ')[0] || seller}
            </div>
          </Field>
        </div>

        <Field label="Notas internas">
          <textarea
            className="k-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones, condiciones especiales…"
            rows={3}
          />
        </Field>

        {!canSave && (
          <div className="k-dim" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="alert-circle" size={15} />
            {!prospect ? 'Selecciona un prospecto' : 'Agrega al menos un producto'}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button variant="soft" style={{ flex: 1 }} disabled={!canSave} onClick={() => handleSave('draft')}>
          Guardar borrador
        </Button>
        <Button style={{ flex: 1 }} icon="brand-whatsapp" disabled={!canSave} onClick={() => handleSave('sent')}>
          Crear y enviar
        </Button>
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

      await saveFile(blob, `cotizacion-${quote.shortId || quote.id.slice(0, 8)}.pdf`)
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
    saveFile(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `cotizaciones_kiuvo_${new Date().toISOString().slice(0, 10)}.csv`
    )
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
    <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0, minWidth: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '20px 28px 0' }}>

        {/* Summary cards */}
        <style>{`
          .quotes-summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; flex-shrink:0; }
          @media (max-width:1024px) { .quotes-summary-grid { grid-template-columns:repeat(2,1fr); } }
          @media (max-width:600px)  { .quotes-summary-grid { grid-template-columns:1fr; } }
        `}</style>
        <div className="quotes-summary-grid">
          {[
            { label: 'Pipeline total', value: fmt(totals.all),      sub: `${sellerBase.length} cotizaciones`, tone: 'ink' },
            { label: 'Enviadas',       value: fmt(totals.sent),     sub: `${sellerBase.filter(q=>q.status==='sent').length} en espera` },
            { label: 'Aprobadas',      value: fmt(totals.approved), sub: `${sellerBase.filter(q=>q.status==='approved').length} aprobadas`, tone: 'accent' },
            { label: 'Rechazadas',     value: fmt(totals.rejected), sub: `${totals.rejectedCount} cotizacion${totals.rejectedCount !== 1 ? 'es' : ''} perdida${totals.rejectedCount !== 1 ? 's' : ''}` },
          ].map(c => (
            <Card key={c.label} tone={c.tone} style={{ padding: '16px 18px' }}>
              <div className="k-num" style={{ fontSize: 28 }}>{c.value}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{c.label}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{c.sub}</div>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'Todas' }, { id: 'draft', label: 'Borrador' }, { id: 'sent', label: 'Enviadas' },
              { id: 'approved', label: 'Aprobadas' }, { id: 'rejected', label: 'Rechazadas' },
            ]}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Button
              variant="soft" size="sm"
              icon={exportFlash ? 'check' : 'download'}
              onClick={handleExportCSV}
              title="Exportar cotizaciones filtradas a CSV"
            >
              {exportFlash ? 'Descargado' : 'CSV'}
            </Button>
            <Button variant="accent" icon="plus" onClick={() => { setShowNew(true); setSelected(null) }}>
              Nueva cotización
            </Button>
          </div>
        </div>

        {/* Seller chips */}
        {sellers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, flexShrink: 0 }}>
            <Chip selected={sellerFilter === 'all'} onClick={() => setSellerFilter('all')} style={{ minHeight: 36, fontSize: 13, flexShrink: 0 }}>
              Todos
            </Chip>
            {sellers.map(s => {
              const on = sellerFilter === s.name
              return (
                <Chip
                  key={s.id} selected={on}
                  onClick={() => setSellerFilter(on ? 'all' : s.name)}
                  title={s.name}
                  style={{ minHeight: 36, fontSize: 13, padding: '0 14px 0 4px', flexShrink: 0 }}
                >
                  <Avatar size="sm" initials={s.init} color={s.color} style={{ width: 28, height: 28 }} />
                  {s.name.split(' ')[0]}
                </Chip>
              )
            })}
          </div>
        )}

        {/* Error banner */}
        {quotesError && (
          <Card style={{ background: 'var(--coral-soft)', color: 'var(--coral-fg)', fontSize: 14, marginBottom: 12, flexShrink: 0 }}>
            Error al cargar cotizaciones: {quotesError}
          </Card>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 28 }}>
          {loading ? (
            <Card className="k-dim" style={{ textAlign: 'center', padding: 40 }}>Cargando cotizaciones…</Card>
          ) : filtered.length === 0 ? (
            <Empty icon="file-invoice">
              <div style={{ fontWeight: 600, color: 'var(--fg)' }}>Sin cotizaciones</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {filter === 'all' ? 'Crea la primera con el botón "Nueva cotización".' : `No hay cotizaciones con estado "${STATUS[filter]?.label || filter}".`}
              </div>
            </Empty>
          ) : (
            <Card flush style={{ overflowX: 'auto' }}>
              <table className="k-table k-table--click">
                <thead>
                  <tr>
                    {['#', 'Prospecto', 'Vendedor', 'Total', 'Productos', 'Estado', 'Creada', 'Vencimiento', ''].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => {
                    const st    = STATUS[q.status] ?? STATUS.draft
                    const sColor = q.seller_color || sellerColor(sellers, q.seller)
                    const sName  = q.seller_full_name || sellerName(sellers, q.seller)
                    // Shorten UUID for display
                    const displayId = typeof q.id === 'string' && q.id.includes('-')
                      ? q.id.slice(0, 8).toUpperCase()
                      : q.id
                    const cell = selected?.id === q.id ? { background: 'var(--bg-secondary)' } : undefined
                    const overdue = q.due === 'Vencida' || q.due === 'Vence hoy'
                    return (
                      <tr key={q.id} onClick={() => selectQuote(q)}>
                        <td style={cell}>
                          <span className="k-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>{displayId}</span>
                        </td>
                        <td style={{ ...cell, fontWeight: 600 }}>{q.prospect}</td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar size="sm" initials={q.seller} color={sColor} />
                            <span className="k-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{sName}</span>
                          </div>
                        </td>
                        <td style={{ ...cell, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(q.total)}</td>
                        <td className="k-muted" style={{ ...cell, fontSize: 13, whiteSpace: 'nowrap' }}>{q.items} partidas</td>
                        <td style={cell}><Pill tone={st.tone}>{st.label}</Pill></td>
                        <td className="k-muted" style={{ ...cell, fontSize: 13, whiteSpace: 'nowrap' }}>{q.created}</td>
                        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                          {overdue ? <Pill tone="coral">{q.due}</Pill> : <span className="k-muted" style={{ fontSize: 13 }}>{q.due}</span>}
                        </td>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={async e => {
                                e.stopPropagation()
                                await generateAndDownloadPDF(q)
                              }}
                              title="Descargar PDF"
                              aria-label="Descargar PDF"
                              disabled={downloading === q.id}
                              className="k-iconbtn k-iconbtn--soft"
                              style={{ width: 36, height: 36 }}
                            >
                              {downloading === q.id
                                ? <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={16} /></span>
                                : <Icon name="download" size={16} />
                              }
                            </button>
                            <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
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
          width: 'min(340px, 100%)', flexShrink: 0,
          background: 'var(--surface)', display: 'flex', flexDirection: 'column',
          borderRadius: 'var(--r-xl) 0 0 var(--r-xl)', boxShadow: 'var(--shadow-float)',
        }}>
          <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Pill tone={(STATUS[selected.status] ?? STATUS.draft).tone}>{(STATUS[selected.status] ?? STATUS.draft).label}</Pill>
            <IconButton icon="x" label="Cerrar" variant="soft" onClick={() => setSelected(null)} />
          </div>
          <div style={{ flex: 1, padding: '6px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div>
              <div className="k-h2">{selected.prospect}</div>
              <div className="k-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {selected.seller_full_name || sellerName(sellers, selected.seller)}
              </div>
              <div className="k-dim" style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 4, wordBreak: 'break-all' }}>{selected.id}</div>
            </div>
            <div>
              <div className="k-dim" style={{ fontSize: 12 }}>Total</div>
              <div className="k-num" style={{ fontSize: 30, marginTop: 4 }}>{fmt(selected.total)}</div>
            </div>
            {[
              { label: 'Partidas',    value: `${selected.items} productos` },
              { label: 'Creada',      value: selected.created },
              { label: 'Vencimiento', value: selected.due },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                <span className="k-dim">{r.label}</span>
                <span style={{ fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <Button block icon="download" loading={downloading === selected.id} onClick={() => generateAndDownloadPDF(selected)}>
                {downloading === selected.id ? 'Generando PDF…' : 'Descargar PDF'}
              </Button>
              <Button
                variant="soft" block
                icon={showItems ? 'chevron-up' : 'chevron-down'}
                onClick={() => showItems ? setShowItems(false) : loadQuoteItems(selected.id)}
              >
                {showItems ? 'Ocultar productos' : 'Ver productos'}
              </Button>

              {/* Lista de productos */}
              {showItems && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                  {loadingItems ? (
                    <div className="k-dim" style={{ padding: 14, textAlign: 'center', fontSize: 13 }}>Cargando…</div>
                  ) : quoteItems.length === 0 ? (
                    <div className="k-dim" style={{ padding: 14, textAlign: 'center', fontSize: 13 }}>Sin productos registrados</div>
                  ) : quoteItems.map((item, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                        <span className="k-dim" style={{ fontSize: 12 }}>
                          {item.sku && `${item.sku} · `}{item.quantity} {item.unit || 'u.'}
                          {item.discount_pct > 0 && <span style={{ color: 'var(--success-fg)', marginLeft: 4, fontWeight: 600 }}>−{item.discount_pct}%</span>}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          ${(item.unit_price * item.quantity * (1 - (item.discount_pct || 0) / 100)).toLocaleString('es-MX')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrar cotización */}
              {confirmDelete ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="soft" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                  <Button variant="danger" style={{ flex: 1 }} icon="trash" loading={deleting} onClick={() => handleDelete(selected)}>
                    Confirmar
                  </Button>
                </div>
              ) : (
                <Button variant="danger" block icon="trash" onClick={() => handleDelete(selected)}>
                  Borrar cotización
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
