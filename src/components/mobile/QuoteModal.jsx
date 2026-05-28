import React, { useState, useMemo, useEffect, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { getDiscount, getEffectivePrice } from '../../lib/productsStore'
import { useProducts } from '../../hooks/useProducts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QuotePDFDoc } from '../../lib/quotePDF'

const fmt  = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtPct = n => `${n}%`

/** Effective unit price after applying volume discount. */
function effectivePrice(item) {
  return item.discountPct > 0 ? item.price * (1 - item.discountPct / 100) : item.price
}

/** Compute discount % for a product at a given qty. */
function computeDiscount(product, qty) {
  return getDiscount(product, qty)
}

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
function IcoDownload({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function IcoWhatsApp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}
function IcoMail({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ── SuccessView ───────────────────────────────────────────────────
function SuccessView({ items, prospectName, prospectEmail, prospectPhone, sellerName, pdfUrl, onClose }) {
  const total   = items.reduce((s, i) => s + effectivePrice(i) * i.qty, 0)
  const savings = items.reduce((s, i) => i.discountPct > 0 ? s + (i.price - effectivePrice(i)) * i.qty : s, 0)
  const [sharing, setSharing]   = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  // Email states
  const [emailStep, setEmailStep]   = useState('idle') // idle | input | sending | sent | error
  const [emailTo, setEmailTo]       = useState(prospectEmail ?? '')
  const [emailError, setEmailError] = useState('')

  const pdfFilename = `cotizacion-kiuvo.pdf`
  const waMessage   = [
    `Hola${prospectName ? ` *${prospectName}*` : ''},`,
    `te comparto la cotización generada con KIUVO CRM.`,
    `\n*Total: ${fmt(total)}*`,
    `\n_Productos: ${items.map(i => `${i.qty}× ${i.name}`).join(', ')}_`,
  ].join('\n')

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = pdfFilename
    a.click()
  }

  const handleWhatsApp = async () => {
    if (!pdfUrl) return
    setSharing(true)
    setShareMsg('')

    try {
      if (navigator.share) {
        const response = await fetch(pdfUrl)
        const blob     = await response.blob()
        const file     = new File([blob], pdfFilename, { type: 'application/pdf' })

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Cotización KIUVO CRM', text: waMessage })
          setShareMsg('✓ Compartido correctamente')
          setSharing(false)
          return
        }
      }

      const base = prospectPhone
        ? `https://wa.me/52${prospectPhone.replace(/\D/g, '')}`
        : 'https://wa.me'
      window.open(`${base}?text=${encodeURIComponent(waMessage)}`, '_blank')
      setShareMsg('Se abrió WhatsApp. Adjunta el PDF manualmente.')
    } catch (err) {
      if (err.name !== 'AbortError') setShareMsg('No se pudo compartir. Descarga el PDF y envíalo manualmente.')
    }
    setSharing(false)
  }

  const handleSendEmail = async () => {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_RE.test(emailTo.trim())) {
      setEmailError('Ingresa un correo válido')
      return
    }
    setEmailStep('sending')
    setEmailError('')

    try {
      // Convert blob URL → base64
      let pdfBase64 = null
      if (pdfUrl) {
        const response = await fetch(pdfUrl)
        const blob     = await response.blob()
        const buffer   = await blob.arrayBuffer()
        const bytes    = new Uint8Array(buffer)
        let binary = ''
        bytes.forEach(b => { binary += String.fromCharCode(b) })
        pdfBase64 = btoa(binary)
      }

      const subject = `Cotización KIUVO CRM${prospectName ? ` — ${prospectName}` : ''}`
      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          to: emailTo.trim(),
          subject,
          items,
          total,
          prospectName,
          sellerName,
          pdfBase64,
          filename: pdfFilename,
        },
      })

      if (error) throw error
      setEmailStep('sent')
    } catch (err) {
      setEmailError('No se pudo enviar. Verifica el correo e intenta de nuevo.')
      setEmailStep('error')
    }
  }

  return (
    <div style={{ padding: '28px 24px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Icon */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="file-invoice" size={30} color="#854F0B" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>¡Cotización generada!</div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
        {prospectName && <><b style={{ color: 'var(--fg)' }}>{prospectName}</b> · </>}
        <b style={{ color: 'var(--fg)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</b> · {fmt(total)}
      </div>

      {/* Items summary */}
      <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(i => {
          const disc = i.discountPct || 0
          const effP = effectivePrice(i)
          return (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: 'var(--fg)', flex: 1 }}>
                {i.qty}× {i.name}
                {disc > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 99,
                    background: 'var(--success-bg)', color: 'var(--success-fg)',
                    verticalAlign: 'middle',
                  }}>−{disc}%</span>
                )}
              </span>
              <span style={{ color: 'var(--fg-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {fmt(effP * i.qty)}
              </span>
            </div>
          )
        })}
        {savings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--success-fg)', fontWeight: 500 }}>
            <span>Ahorro por volumen</span>
            <span>−{fmt(savings)}</span>
          </div>
        )}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontSize: 14 }}>
          <span style={{ color: 'var(--fg)' }}>Total</span>
          <span style={{ color: 'var(--kiuvo-blue)' }}>{fmt(total)}</span>
        </div>
      </div>

      {/* Share feedback */}
      {shareMsg && (
        <div style={{
          width: '100%', padding: '9px 14px',
          background: shareMsg.startsWith('✓') ? 'var(--success-bg)' : 'var(--warning-bg)',
          border: `0.5px solid ${shareMsg.startsWith('✓') ? 'var(--success)' : 'var(--warning-border)'}`,
          borderRadius: 'var(--r-md)', fontSize: 12,
          color: shareMsg.startsWith('✓') ? 'var(--success-fg)' : 'var(--warning-fg)',
        }}>
          {shareMsg}
        </div>
      )}

      {/* Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          disabled={sharing || !pdfUrl}
          style={{
            width: '100%', padding: '13px',
            background: '#25D366', color: '#fff',
            borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: sharing ? 0.7 : 1,
          }}
        >
          {sharing ? <Spinner size={16} /> : <IcoWhatsApp size={17} />}
          {sharing ? 'Compartiendo…' : 'Enviar por WhatsApp'}
        </button>

        {/* Email */}
        {emailStep === 'sent' ? (
          <div style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--success-bg)', border: '0.5px solid var(--success)',
            borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--success-fg)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <IcoCheck size={16} color="var(--success-fg)" />
            Correo enviado a <b>{emailTo}</b>
          </div>
        ) : emailStep === 'input' || emailStep === 'sending' || emailStep === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="email"
                value={emailTo}
                onChange={e => { setEmailTo(e.target.value); setEmailError('') }}
                placeholder="correo@cliente.com"
                autoFocus
                style={{
                  flex: 1, padding: '12px 12px',
                  background: 'var(--bg-secondary)',
                  border: `0.5px solid ${emailError ? 'var(--danger)' : 'var(--kiuvo-blue)'}`,
                  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSendEmail}
                disabled={emailStep === 'sending'}
                style={{
                  padding: '12px 16px',
                  background: 'var(--kiuvo-blue)', color: '#fff',
                  borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: emailStep === 'sending' ? 0.7 : 1,
                }}
              >
                {emailStep === 'sending' ? <Spinner size={14} /> : <IcoMail size={14} color="#fff" />}
                {emailStep === 'sending' ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
            {emailError && (
              <div style={{ fontSize: 12, color: 'var(--danger-fg)', paddingLeft: 4 }}>{emailError}</div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEmailStep('input')}
            style={{
              width: '100%', padding: '13px',
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              color: 'var(--fg)', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <IcoMail size={17} color="var(--fg-secondary)" />
            Enviar por correo
          </button>
        )}

        {/* Download */}
        {pdfUrl && (
          <button
            onClick={handleDownload}
            style={{
              width: '100%', padding: '12px',
              background: 'transparent', border: '0.5px solid var(--border)',
              color: 'var(--fg-secondary)', borderRadius: 'var(--r-md)', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <IcoDownload size={15} color="var(--fg-tertiary)" />
            Descargar PDF
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px',
            background: 'transparent', color: 'var(--fg-tertiary)',
            borderRadius: 'var(--r-md)', fontSize: 13,
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

// ── QtyInput: allows free typing; commits on blur ─────────────────
function QtyInput({ qty, onChange, style }) {
  const [raw, setRaw] = useState(String(qty))
  const prev = useRef(qty)
  // Sync if qty changes from outside (+ / − buttons)
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
    if (isNaN(n) || n < 1) setRaw(String(qty)) // revert to last valid value
  }

  return (
    <input
      type="number" min="1"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      style={style}
    />
  )
}

// ── Payment options ───────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  'Contado Efectivo',
  'Transferencia',
  'Tarjeta de Crédito',
  '50% anticipo / 50% contra entrega',
  '3 MSI',
  '6 MSI',
  'Otro',
]

// ── Main ──────────────────────────────────────────────────────────
export default function QuoteModal({ onClose, onGenerated, initialProspectId = null, initialProspectName = '', initialContactName = '' }) {
  const { user, profile } = useAuth()
  const { products: allProducts } = useProducts()

  const [step, setStep]               = useState('form')
  const [search, setSearch]           = useState('')
  const [cat, setCat]                 = useState('Todos')
  const [items, setItems]             = useState([])
  const [prospectName, setProspectName]   = useState(initialProspectName)
  const [prospectId, setProspectId]       = useState(initialProspectId)
  const [prospectEmail, setProspectEmail] = useState('')
  const [showProspects, setShowProspects] = useState(false)
  const [prospects, setProspects]         = useState([])
  const [submitting, setSubmitting]       = useState(false)
  const [serverError, setServerError]     = useState('')
  const [pdfUrl, setPdfUrl]               = useState(null)
  // Extra quote fields
  const [contactName, setContactName]     = useState(initialContactName)
  const [paymentSel, setPaymentSel]       = useState('')          // selected option
  const [paymentOther, setPaymentOther]   = useState('')          // free text when "Otro"
  const paymentTerms = paymentSel === 'Otro' ? paymentOther : paymentSel
  const [deliveryTime, setDeliveryTime]   = useState('7 días hábiles')

  // Load seller's prospects
  useEffect(() => {
    supabase
      .from('prospects')
      .select('id, name, email, contact')
      .eq('owner_id', user.id)
      .order('name')
      .then(({ data }) => setProspects(data ?? []))
  }, [user.id])

  // Categorías derivadas del catálogo
  const cats = useMemo(() =>
    ['Todos', ...Array.from(new Set(allProducts.map(p => p.category))).sort()],
    [allProducts]
  )

  // Filtered catalog
  const catalog = useMemo(() => allProducts.filter(p => {
    const matchCat  = cat === 'Todos' || p.category === cat
    const matchText = p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  }), [allProducts, search, cat])

  const addItem = product => {
    setItems(prev => {
      const exists = prev.find(i => i.id === product.id)
      if (exists) {
        const newQty = exists.qty + 1
        const disc = computeDiscount(product, newQty)
        return prev.map(i => i.id === product.id ? { ...i, qty: newQty, discountPct: disc } : i)
      }
      const disc = computeDiscount(product, 1)
      return [...prev, { ...product, qty: 1, discountPct: disc }]
    })
  }
  const setQty = (id, qty) => {
    // − button at qty=1 → remove. Typing 0 or empty → handled by QtyInput (reverts on blur)
    if (qty < 1) { removeItem(id); return }
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const disc = computeDiscount(i, qty)
      return { ...i, qty, discountPct: disc }
    }))
  }
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id))

  const total   = items.reduce((s, i) => s + effectivePrice(i) * i.qty, 0)
  const savings = items.reduce((s, i) => i.discountPct > 0 ? s + (i.price - effectivePrice(i)) * i.qty : s, 0)
  const canSubmit = items.length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setServerError('')

    // 1 — Get next sequential number for this seller
    const { data: lastNum } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('seller_id', user.id)
      .not('quote_number', 'is', null)
      .order('quote_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    const quoteNumber = (lastNum?.quote_number ?? 0) + 1

    // 2 — Save quote header
    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .insert({
        prospect_id:  prospectId ?? null,
        seller_id:    user.id,
        status:       'sent',
        total,
        quote_number: quoteNumber,
        notes:        !prospectId && prospectName ? prospectName : null,
      })
      .select()
      .single()

    if (qErr) {
      console.error('quotes insert error:', qErr)
      setServerError(
        qErr.code === '42501'
          ? 'Sin permiso para guardar cotizaciones. Verifica las políticas RLS en Supabase.'
          : `No se pudo guardar la cotización: ${qErr.message}`
      )
      setSubmitting(false)
      return
    }

    // 3 — Save quote items
    const { error: itemsErr } = await supabase
      .from('quote_items')
      .insert(
        items.map(i => ({
          quote_id:       quote.id,
          product_name:   i.name,
          sku:            i.sku  ?? null,
          unit:           i.unit ?? null,
          quantity:       i.qty,
          unit_price:     effectivePrice(i),
          discount_pct:   i.discountPct ?? 0,
        }))
      )

    if (itemsErr) {
      console.error('quote_items insert error:', itemsErr)
      setServerError(
        itemsErr.code === '42501'
          ? 'Sin permiso para guardar los productos. Falta la política RLS de quote_items en Supabase.'
          : `Error al registrar los productos: ${itemsErr.message}`
      )
      setSubmitting(false)
      return
    }

    // 4 — Generate PDF blob
    let url = null
    try {
      // Pre-fetch logo as base64 so the PDF worker doesn't need to do a separate request
      let logoDataUrl = null
      try {
        const logoRes = await fetch(window.location.origin + '/kiuvo-logo.png')
        if (logoRes.ok) {
          const logoBlob   = await logoRes.blob()
          const logoBuffer = await logoBlob.arrayBuffer()
          const logoBytes  = new Uint8Array(logoBuffer)
          let binary = ''
          logoBytes.forEach(b => { binary += String.fromCharCode(b) })
          logoDataUrl = `data:image/png;base64,${btoa(binary)}`
        }
      } catch (_) { /* logo fetch failed — PDF will use fallback K box */ }

      const blob = await pdf(
        <QuotePDFDoc
          quoteId={quote.id}
          prospectName={prospectName}
          contactName={contactName}
          sellerName={profile?.full_name}
          items={items}
          date={new Date()}
          paymentTerms={paymentTerms}
          deliveryTime={deliveryTime}
          logoUrl={logoDataUrl}
        />
      ).toBlob()

      // 5 — Upload to Supabase Storage
      const pdfPath = `${user.id}/${quote.id}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('cotizaciones')
        .upload(pdfPath, blob, { contentType: 'application/pdf', upsert: true })

      if (!uploadErr) {
        // Save path back to the quote row
        await supabase.from('quotes').update({ pdf_path: pdfPath }).eq('id', quote.id)
      } else {
        console.warn('[QuoteModal] storage upload:', uploadErr.message)
      }

      url = URL.createObjectURL(blob)
      setPdfUrl(url)

      // Auto-trigger download with readable filename
      const safeName = (prospectName || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName} - ${quoteNumber}.pdf`
      a.click()
    } catch (pdfErr) {
      console.error('PDF error:', pdfErr)
      setServerError(`Error PDF: ${pdfErr?.message || String(pdfErr)}`)
      setSubmitting(false)
      return
    }

    onGenerated?.(prospectName, total)
    setSubmitting(false)
    setStep('success')
  }

  // Filtered prospect dropdown
  const prospectMatches = prospects.filter(p =>
    p.name.toLowerCase().includes(prospectName.toLowerCase())
  )

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {step === 'success' ? (
          <SuccessView
            items={items}
            prospectName={prospectName}
            prospectEmail={prospectEmail}
            prospectPhone={prospects.find(p => p.id === prospectId)?.phone ?? ''}
            sellerName={profile?.full_name}
            pdfUrl={pdfUrl}
            onClose={onClose}
          />
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
                    value={prospectName}
                    onChange={e => {
                      setProspectName(e.target.value)
                      setProspectId(null)
                      setShowProspects(true)
                    }}
                    onFocus={() => setShowProspects(true)}
                    onBlur={() => setTimeout(() => setShowProspects(false), 150)}
                    placeholder="Buscar o escribir nombre del cliente…"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 32px',
                      background: 'var(--bg-secondary)', border: `0.5px solid ${prospectId ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <IcoSearch size={14} color="var(--fg-tertiary)" />
                  </span>
                  {prospectId && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                      <IcoCheck size={16} color="var(--kiuvo-blue)" />
                    </span>
                  )}
                  {showProspects && prospectMatches.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      background: 'var(--surface)', border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r-md)', marginTop: 4, maxHeight: 160, overflowY: 'auto',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}>
                      {prospectMatches.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={() => {
                            setProspectName(p.name)
                            setProspectId(p.id)
                            setProspectEmail(p.email ?? '')
                            if (p.contact) setContactName(p.contact)
                            setShowProspects(false)
                          }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '10px 14px',
                            fontSize: 13, color: 'var(--fg)',
                            borderBottom: '0.5px solid var(--border)',
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Extra quote fields */}
              <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5 }}>DATOS DEL DOCUMENTO</div>

                {/* Contact name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontWeight: 500 }}>Nombre del encargado</label>
                  <input
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    style={{
                      padding: '9px 10px', background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                      fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Payment terms — select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontWeight: 500 }}>Forma de pago</label>
                  <select
                    value={paymentSel}
                    onChange={e => setPaymentSel(e.target.value)}
                    style={{
                      padding: '9px 10px', background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                      fontSize: 13, color: paymentSel ? 'var(--fg)' : 'var(--fg-tertiary)',
                      outline: 'none', fontFamily: 'inherit', appearance: 'auto',
                    }}
                  >
                    <option value="">— Seleccionar —</option>
                    {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {paymentSel === 'Otro' && (
                    <input
                      value={paymentOther}
                      onChange={e => setPaymentOther(e.target.value)}
                      placeholder="Especificar forma de pago…"
                      autoFocus
                      style={{
                        padding: '9px 10px', background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--kiuvo-blue)', borderRadius: 'var(--r-md)',
                        fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit', marginTop: 4,
                      }}
                    />
                  )}
                </div>

                {/* Delivery time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontWeight: 500 }}>Tiempo de entrega</label>
                  <input
                    value={deliveryTime}
                    onChange={e => setDeliveryTime(e.target.value)}
                    placeholder="7 días hábiles"
                    style={{
                      padding: '9px 10px', background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                      fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Items added */}
              {items.length > 0 && (
                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
                    PRODUCTOS EN COTIZACIÓN ({items.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(item => {
                      const disc = item.discountPct || 0
                      const effP = effectivePrice(item)
                      const lineTotal = effP * item.qty
                      return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', background: 'var(--surface)',
                        border: `0.5px solid ${disc > 0 ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-md)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                              {item.name}
                            </div>
                            {disc > 0 && (
                              <span style={{
                                flexShrink: 0, fontSize: 10, fontWeight: 700,
                                padding: '1px 6px', borderRadius: 99,
                                background: 'var(--success-bg)', color: 'var(--success-fg)',
                                border: '0.5px solid var(--success)',
                              }}>
                                −{disc}%
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {disc > 0 ? (
                              <>
                                <span style={{ textDecoration: 'line-through', color: 'var(--fg-tertiary)' }}>{fmt(item.price)}</span>
                                <span style={{ color: 'var(--success-fg)', fontWeight: 500 }}>{fmt(effP)}</span>
                                <span>/{item.unit}</span>
                                <span>·</span>
                                <span style={{ color: 'var(--kiuvo-blue)', fontWeight: 500 }}>{fmt(lineTotal)}</span>
                              </>
                            ) : (
                              <>
                                <span>{fmt(item.price)}/{item.unit}</span>
                                <span>·</span>
                                <span style={{ color: 'var(--kiuvo-blue)', fontWeight: 500 }}>{fmt(lineTotal)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)' }}>
                          <button onClick={() => setQty(item.id, item.qty - 1)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                            <IcoMinus size={14} />
                          </button>
                          <QtyInput
                            qty={item.qty}
                            onChange={n => setQty(item.id, n)}
                            style={{ width: 36, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', padding: 0 }}
                          />
                          <button onClick={() => setQty(item.id, item.qty + 1)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                            <IcoPlus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.id)}
                          style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IcoTrash size={13} color="var(--danger)" />
                        </button>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Catalog */}
              <div style={{ padding: '0 16px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>CATÁLOGO DE PRODUCTOS</div>

                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <IcoSearch size={14} color="var(--fg-tertiary)" />
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
                        border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                        background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                        color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
                      }}>{c}</button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
                  {catalog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-tertiary)', fontSize: 13 }}>Sin resultados</div>
                  ) : catalog.map(p => {
                    const inCart = items.find(i => i.id === p.id)
                    return (
                      <button
                        key={p.id} onClick={() => addItem(p)}
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
                          {inCart ? <IcoCheck size={14} color="#fff" /> : <IcoPlus size={14} color="var(--fg-secondary)" />}
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
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
                  </div>
                  {savings > 0 && (
                    <div style={{
                      marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5,
                      fontSize: 12, color: 'var(--success-fg)', fontWeight: 500,
                    }}>
                      <Icon name="discount" size={13} color="var(--success)" />
                      Ahorro por volumen: {fmt(savings)}
                    </div>
                  )}
                </div>
              )}
              {serverError && (
                <div style={{
                  marginBottom: 10, padding: '10px 14px',
                  background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)',
                }}>
                  {serverError}
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting && <Spinner size={16} />}
                {submitting ? 'Generando…' : 'Generar cotización'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
