import React, { useState, useMemo, useEffect, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { Sheet, Button, Card, Pill, Label, Segmented, SearchInput, Field, Empty } from '../ui'
import { getDiscount, getEffectivePrice } from '../../lib/productsStore'
import { useProducts } from '../../hooks/useProducts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { QuotePDFDoc } from '../../lib/quotePDF'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { enqueue } from '../../lib/offlineQueue'
import SchoolPackageModal from './SchoolPackageModal'
import { saveFile, isIOS } from '../../lib/saveFile'

const fmt  = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtPct = n => `${n}%`

function effectivePrice(item) {
  let base
  if (item.specialPrice != null) {
    base = item.specialPrice
  } else {
    base = item.discountPct > 0 ? item.price * (1 - item.discountPct / 100) : item.price
  }
  if (item.extraDiscount?.value > 0) {
    if (item.extraDiscount.type === 'pct') {
      base = base * (1 - item.extraDiscount.value / 100)
    } else {
      base = Math.max(0, base - item.extraDiscount.value)
    }
  }
  return base
}

/** Compute discount % for a product at a given qty. */
function computeDiscount(product, qty) {
  return getDiscount(product, qty)
}

// ── SuccessView ───────────────────────────────────────────────────
function SuccessView({ items, prospectName, prospectEmail, prospectPhone, sellerName, pdfFile, onClose }) {
  const total   = items.reduce((s, i) => s + effectivePrice(i) * i.qty, 0)
  const savings = items.reduce((s, i) => s + (i.price - effectivePrice(i)) * i.qty, 0)
  const [sharing, setSharing]   = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  // Email states
  const [emailStep, setEmailStep]   = useState('idle') // idle | input | sending | sent | error
  const [emailTo, setEmailTo]       = useState(prospectEmail ?? '')
  const [emailError, setEmailError] = useState('')

  const pdfFilename = pdfFile?.name ?? 'cotizacion-kiuvo.pdf'
  const waMessage   = [
    `Hola${prospectName ? ` *${prospectName}*` : ''},`,
    `te comparto la cotización generada con KIUVO CRM.`,
    `\n*Total: ${fmt(total)}*`,
    `\n_Productos: ${items.map(i => `${i.qty}× ${i.name}`).join(', ')}_`,
  ].join('\n')

  const handleDownload = () => {
    if (!pdfFile) return
    saveFile(pdfFile.blob, pdfFilename)
  }

  const handleWhatsApp = async () => {
    if (!pdfFile) return
    setSharing(true)
    setShareMsg('')

    try {
      if (navigator.share) {
        // Sin await previo: iOS exige que share() ocurra pegado al toque
        const file = new File([pdfFile.blob], pdfFilename, { type: 'application/pdf' })

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
      // PDF → base64
      let pdfBase64 = null
      if (pdfFile) {
        const buffer   = await pdfFile.blob.arrayBuffer()
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

  const shareOk = shareMsg.startsWith('✓')

  return (
    <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 84, height: 84, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="file-invoice" size={40} />
      </div>
      <div className="k-display" style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>¡Cotización generada!</div>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        {prospectName && <><b style={{ color: 'var(--fg)' }}>{prospectName}</b> · </>}
        {items.length} producto{items.length !== 1 ? 's' : ''}
      </div>

      {/* Items summary */}
      <Card style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(i => {
          const disc = i.specialPrice != null ? 0 : (i.discountPct || 0)
          const effP = effectivePrice(i)
          return (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ lineHeight: 1.35 }}>{i.qty}× {i.name}</div>
                {(i.specialPrice != null || disc > 0 || i.extraDiscount?.value > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                    {i.specialPrice != null
                      ? <Pill tone="lilac">Precio esp.</Pill>
                      : disc > 0 ? <Pill tone="success">−{disc}%</Pill> : null}
                    {i.extraDiscount?.value > 0 && (
                      <Pill tone="warning">
                        {i.extraDiscount.type === 'pct' ? `−${i.extraDiscount.value}%` : `−${fmt(i.extraDiscount.value)}`} esp.
                      </Pill>
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {fmt(effP * i.qty)}
              </span>
            </div>
          )
        })}
        {savings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success-fg)', fontWeight: 600 }}>
            <span>Descuentos aplicados</span>
            <span>−{fmt(savings)}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Total</span>
          <span className="k-num" style={{ fontSize: 28 }}>{fmt(total)}</span>
        </div>
      </Card>

      {/* Share feedback */}
      {shareMsg && (
        <div style={{
          width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', fontSize: 14,
          background: shareOk ? 'var(--success-bg)' : 'var(--warning-bg)',
          color: shareOk ? 'var(--success-fg)' : 'var(--warning-fg)',
        }}>
          {shareMsg}
        </div>
      )}

      {/* Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <Button variant="accent" size="lg" block icon="brand-whatsapp" loading={sharing} disabled={!pdfFile} onClick={handleWhatsApp}>
          {sharing ? 'Compartiendo…' : 'Enviar por WhatsApp'}
        </Button>

        {/* Email */}
        {emailStep === 'sent' ? (
          <div style={{
            width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', fontSize: 15,
            background: 'var(--success-bg)', color: 'var(--success-fg)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="check" size={18} />
            <span>Correo enviado a <b>{emailTo}</b></span>
          </div>
        ) : emailStep === 'input' || emailStep === 'sending' || emailStep === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                className="k-input"
                value={emailTo}
                onChange={e => { setEmailTo(e.target.value); setEmailError('') }}
                placeholder="correo@cliente.com"
                autoFocus
                style={{ flex: 1, minWidth: 0, ...(emailError && { boxShadow: 'inset 0 0 0 2px var(--coral)' }) }}
              />
              <Button icon="mail" loading={emailStep === 'sending'} onClick={handleSendEmail}>
                {emailStep === 'sending' ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
            {emailError && (
              <div style={{ fontSize: 13, color: 'var(--coral-fg)', paddingLeft: 4 }}>{emailError}</div>
            )}
          </div>
        ) : (
          <Button variant="primary" block icon="mail" onClick={() => setEmailStep('input')}>
            Enviar por correo
          </Button>
        )}

        {pdfFile && (
          <Button variant="outline" block icon="download" onClick={handleDownload}>
            Descargar PDF
          </Button>
        )}

        <Button variant="soft" block onClick={onClose}>Cerrar</Button>
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
  const isOnline = useOnlineStatus()

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
  const [pdfFile, setPdfFile]             = useState(null)   // { blob, name }
  const [specialPriceEditing, setSpecialPriceEditing] = useState(null)
  const [specialPriceInput, setSpecialPriceInput]     = useState('')
  const [showSchoolPkg, setShowSchoolPkg]             = useState(false)
  const [extraDiscEditing, setExtraDiscEditing]       = useState(null)  // item.id
  const [extraDiscType, setExtraDiscType]             = useState('pct') // 'pct' | 'mxn'
  const [extraDiscInput, setExtraDiscInput]           = useState('')
  const [nameEditing, setNameEditing]   = useState(null)
  const [nameEditData, setNameEditData] = useState({ name: '', sku: '' })
  // Extra quote fields
  const [contactName, setContactName]     = useState(initialContactName)
  const [paymentSel, setPaymentSel]       = useState('')          // selected option
  const [paymentOther, setPaymentOther]   = useState('')          // free text when "Otro"
  const paymentTerms = paymentSel === 'Otro' ? paymentOther : paymentSel
  const [deliveryTime, setDeliveryTime]   = useState('7 días hábiles')

  // Load seller's prospects — con caché offline
  useEffect(() => {
    const CACHE_KEY = `kiuvo_prospects_${user.id}`

    // Mostrar caché inmediatamente
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached?.length) setProspects(cached)
    } catch {}

    // Intentar Supabase; si falla (sin red) se queda con el caché
    if (!supabase) return
    supabase
      .from('prospects')
      .select('id, name, email, contact, notes, phone')
      .eq('owner_id', user.id)
      .order('name')
      .then(({ data, error }) => {
        if (data && !error) {
          setProspects(data)
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        }
        // Si hay error (offline), el caché ya fue cargado arriba
      })
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
      return [...prev, { ...product, qty: 1, discountPct: disc, specialPrice: null, extraDiscount: null }]
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

  function openNameEdit(item) {
    setNameEditing(item.id)
    setNameEditData({ name: item.name, sku: item.sku || '' })
  }
  function confirmNameEdit(id) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const trimmed = nameEditData.name.trim()
      return trimmed ? { ...i, name: trimmed, sku: nameEditData.sku.trim() } : i
    }))
    setNameEditing(null)
  }

  function openSpecialPrice(item) {
    setSpecialPriceEditing(item.id)
    setSpecialPriceInput(String(Math.round(effectivePrice(item))))
  }
  function confirmSpecialPrice(id) {
    const val = parseFloat(specialPriceInput)
    if (!isNaN(val) && val > 0) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, specialPrice: val } : i))
    }
    setSpecialPriceEditing(null)
  }
  function removeSpecialPrice(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, specialPrice: null } : i))
  }

  function openExtraDisc(item) {
    setExtraDiscEditing(item.id)
    setExtraDiscType(item.extraDiscount?.type ?? 'pct')
    setExtraDiscInput(item.extraDiscount?.value != null ? String(item.extraDiscount.value) : '')
  }
  function confirmExtraDisc(id) {
    const val = parseFloat(extraDiscInput)
    if (!isNaN(val) && val > 0) {
      setItems(prev => prev.map(i => i.id === id
        ? { ...i, extraDiscount: { type: extraDiscType, value: val } }
        : i
      ))
    }
    setExtraDiscEditing(null)
  }
  function removeExtraDisc(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, extraDiscount: null } : i))
  }

  const total      = items.reduce((s, i) => s + effectivePrice(i) * i.qty, 0)
  const savings    = items.reduce((s, i) => s + (i.price - effectivePrice(i)) * i.qty, 0)
  const hasExtraDisc = items.some(i => i.extraDiscount?.value > 0)
  const canSubmit  = items.length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setServerError('')

    // ── OFFLINE: encolar y generar PDF localmente ─────────────────────────────
    if (!isOnline) {
      const tempId = crypto.randomUUID()
      enqueue({
        type: 'INSERT_QUOTE',
        table: 'quotes',
        payload: {
          tempId,
          prospect_id:  prospectId ?? null,
          seller_id:    user.id,
          status:       'sent',
          total,
          notes:        !prospectId && prospectName ? prospectName : null,
          // Datos para regenerar PDF y items al sincronizar
          _sync: {
            prospectName,
            contactName,
            sellerName:    profile?.full_name || '',
            paymentTerms,
            deliveryTime,
            items: items.map(i => ({
              name:           i.name,
              sku:            i.sku  ?? null,
              unit:           i.unit ?? null,
              qty:            i.qty,
              price:          i.price,
              discountPct:    i.specialPrice != null ? -1 : (i.discountPct ?? 0),
              unitPrice:      effectivePrice(i),
              isSpecialPrice: i.specialPrice != null,
            })),
          },
        },
      })

      // Generar PDF localmente para descarga/compartir inmediata
      try {
        let logoDataUrl = null
        try {
          const r = await fetch(window.location.origin + '/kiuvo-logo.png')
          if (r.ok) {
            const buf   = await (await r.blob()).arrayBuffer()
            const bytes = new Uint8Array(buf)
            let b = ''; bytes.forEach(x => { b += String.fromCharCode(x) })
            logoDataUrl = `data:image/png;base64,${btoa(b)}`
          }
        } catch (_) {}

        const offlineQuoteNum = `OFF-${Date.now().toString().slice(-4)}`
        const blob = await pdf(
          <QuotePDFDoc
            quoteId={tempId}
            prospectName={prospectName}
            contactName={contactName}
            sellerName={profile?.full_name}
            items={items.map(i => ({
                ...i,
                price:        i.specialPrice != null ? i.specialPrice : i.price,
                discountPct:  i.specialPrice != null ? 0 : i.discountPct,
                isSpecialPrice: i.specialPrice != null,
              }))}
            date={new Date()}
            paymentTerms={paymentTerms}
            deliveryTime={deliveryTime}
            logoUrl={logoDataUrl}
          />
        ).toBlob()

        const safeName = (prospectName || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
        const name = `${safeName} - ${offlineQuoteNum}.pdf`
        setPdfFile({ blob, name })
        // En iPhone no se descarga solo: la pantalla de éxito ofrece el botón
        if (!isIOS()) saveFile(blob, name)
      } catch (pdfErr) {
        console.warn('[QuoteModal offline] PDF error:', pdfErr)
      }

      onGenerated?.(prospectName, total)
      setSubmitting(false)
      setStep('success')
      return
    }
    // ── FIN OFFLINE ───────────────────────────────────────────────────────────

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
          discount_pct:   i.specialPrice != null ? -1 : (i.discountPct ?? 0),
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
          items={items.map(i => ({
                ...i,
                price:        i.specialPrice != null ? i.specialPrice : i.price,
                discountPct:  i.specialPrice != null ? 0 : i.discountPct,
                isSpecialPrice: i.specialPrice != null,
              }))}
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

      const safeName = (prospectName || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
      const name = `${safeName} - ${quoteNumber}.pdf`
      setPdfFile({ blob, name })
      // En iPhone no se descarga solo: la pantalla de éxito ofrece el botón
      if (!isIOS()) saveFile(blob, name)
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

  if (step === 'success') {
    return (
      <Sheet title="Cotización lista" onClose={onClose}>
        <SuccessView
          items={items}
          prospectName={prospectName}
          prospectEmail={prospectEmail}
          prospectPhone={prospects.find(p => p.id === prospectId)?.phone ?? ''}
          sellerName={profile?.full_name}
          pdfFile={pdfFile}
          onClose={onClose}
        />
      </Sheet>
    )
  }

  const stepBtn = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }
  const closeEditBtn = {
    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
    background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <>
      <Sheet
        full
        title="Nueva cotización"
        onClose={onClose}
        footer={
          <>
            {items.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                  <span className="k-num" style={{ fontSize: 30 }}>{fmt(total)}</span>
                </div>
                {savings > 0 && (
                  <div style={{
                    marginTop: 6, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5,
                    fontSize: 14, color: 'var(--success-fg)', fontWeight: 600,
                  }}>
                    <Icon name="discount" size={16} />
                    {hasExtraDisc ? 'Descuentos aplicados' : 'Ahorro por volumen'}: {fmt(savings)}
                  </div>
                )}
              </div>
            )}
            {serverError && (
              <div style={{
                marginBottom: 12, padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--coral-soft)', color: 'var(--coral-fg)', fontSize: 14,
              }}>
                {serverError}
              </div>
            )}
            <Button variant="accent" size="lg" block icon="file-invoice" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
              {submitting ? 'Generando…' : 'Generar cotización'}
            </Button>
          </>
        }
      >
        {/* Prospect picker */}
        <Label>Cliente</Label>
        <div style={{ position: 'relative', marginBottom: 22 }}>
          <SearchInput
            value={prospectName}
            onChange={v => {
              setProspectName(v)
              setProspectId(null)
              setShowProspects(true)
            }}
            onFocus={() => setShowProspects(true)}
            onBlur={() => setTimeout(() => setShowProspects(false), 150)}
            placeholder="Buscar o escribir el cliente…"
          />
          {prospectId && (
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <Icon name="check" size={16} />
            </span>
          )}
          {showProspects && prospectMatches.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: 'var(--surface)', borderRadius: 'var(--r-lg)', marginTop: 6,
              maxHeight: 230, overflowY: 'auto', boxShadow: 'var(--shadow-float)',
            }}>
              {prospectMatches.map(p => (
                <button
                  key={p.id}
                  className="k-row"
                  onMouseDown={() => {
                    setProspectName(p.name)
                    setProspectId(p.id)
                    setProspectEmail(p.email ?? '')
                    // contact column first; fall back to "Contacto: X" inside notes
                    const contact = p.contact ||
                      p.notes?.match(/^Contacto:\s*(.+?)(\n|$)/m)?.[1]?.trim() || ''
                    if (contact) setContactName(contact)
                    setShowProspects(false)
                  }}
                  style={{ fontSize: 15, minHeight: 48 }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Extra quote fields */}
        <Label>Datos del documento</Label>
        <div style={{ marginBottom: 6 }}>
          <Field label="Nombre del encargado">
            <input
              className="k-input"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </Field>

          <Field label="Forma de pago">
            <select
              className="k-input"
              value={paymentSel}
              onChange={e => setPaymentSel(e.target.value)}
              style={{ color: paymentSel ? 'var(--fg)' : 'var(--fg-tertiary)' }}
            >
              <option value="">— Seleccionar —</option>
              {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {paymentSel === 'Otro' && (
              <input
                className="k-input"
                value={paymentOther}
                onChange={e => setPaymentOther(e.target.value)}
                placeholder="Especificar forma de pago…"
                autoFocus
              />
            )}
          </Field>

          <Field label="Tiempo de entrega">
            <input
              className="k-input"
              value={deliveryTime}
              onChange={e => setDeliveryTime(e.target.value)}
              placeholder="7 días hábiles"
            />
          </Field>
        </div>

        {/* Items added */}
        {items.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <Label>Productos en cotización ({items.length})</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => {
                const disc = item.specialPrice != null ? 0 : (item.discountPct || 0)
                const effP = effectivePrice(item)
                const lineTotal = effP * item.qty
                return (
                <Card key={item.id} style={{ padding: 14 }}>
                  {/* Nombre */}
                  {nameEditing === item.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      <input
                        className="k-input"
                        value={nameEditData.name}
                        onChange={e => setNameEditData(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') confirmNameEdit(item.id) }}
                        autoFocus
                        placeholder="Nombre del producto"
                      />
                      <input
                        className="k-input"
                        value={nameEditData.sku}
                        onChange={e => setNameEditData(d => ({ ...d, sku: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') confirmNameEdit(item.id) }}
                        placeholder="Descripción o SKU (opcional)"
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={() => confirmNameEdit(item.id)} style={{ flex: 1 }}>Listo</Button>
                        <Button variant="soft" onClick={() => setNameEditing(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <button onClick={() => openNameEdit(item)} aria-label="Editar nombre" title="Editar nombre"
                        style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                        <Icon name="pencil" size={18} />
                      </button>
                      <button onClick={() => removeItem(item.id)} aria-label="Quitar producto" title="Quitar producto"
                        style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'var(--coral-soft)', color: 'var(--coral-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  )}

                  {/* Etiquetas de precio */}
                  {(item.specialPrice != null || disc > 0 || item.extraDiscount?.value > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {item.specialPrice != null
                        ? <Pill tone="lilac">Precio esp.</Pill>
                        : disc > 0 ? <Pill tone="success">−{disc}%</Pill> : null}
                      {item.extraDiscount?.value > 0 && (
                        <Pill tone="warning">
                          {item.extraDiscount.type === 'pct' ? `−${item.extraDiscount.value}%` : `−${fmt(item.extraDiscount.value)}`} esp.
                        </Pill>
                      )}
                    </div>
                  )}

                  {/* Precio + cantidad */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="k-num" style={{ fontSize: 20 }}>{fmt(lineTotal)}</div>
                      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                        {item.specialPrice != null ? (
                          <span style={{ color: 'var(--accent-2-fg)', fontWeight: 600 }}>{fmt(item.specialPrice)}/{item.unit}</span>
                        ) : disc > 0 ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--fg-tertiary)' }}>{fmt(item.price)}</span>
                            <span style={{ color: 'var(--success-fg)', fontWeight: 600 }}>{fmt(effP)}</span>
                            <span>/{item.unit}</span>
                          </>
                        ) : (
                          <span>{fmt(item.price)}/{item.unit}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--r-full)', flexShrink: 0 }}>
                      <button aria-label="Menos" onClick={() => setQty(item.id, item.qty - 1)} style={stepBtn}>
                        <Icon name="minus" size={18} />
                      </button>
                      <QtyInput
                        qty={item.qty}
                        onChange={n => setQty(item.id, n)}
                        style={{ width: 48, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--fg)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', padding: 0 }}
                      />
                      <button aria-label="Más" onClick={() => setQty(item.id, item.qty + 1)} style={stepBtn}>
                        <Icon name="plus" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Control de precio especial */}
                  {specialPriceEditing === item.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, flexShrink: 0 }}>$</span>
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="k-input"
                        value={specialPriceInput}
                        onChange={e => setSpecialPriceInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmSpecialPrice(item.id) }}
                        autoFocus
                        placeholder="Precio especial…"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <Button onClick={() => confirmSpecialPrice(item.id)}>Listo</Button>
                      <button aria-label="Cancelar" onClick={() => setSpecialPriceEditing(null)} style={closeEditBtn}>
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                  ) : item.specialPrice != null ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button variant="outline" size="sm" onClick={() => openSpecialPrice(item)} style={{ flex: 1, minHeight: 44, minWidth: 0, whiteSpace: 'normal' }}>
                        Precio especial · {fmt(item.specialPrice)}
                      </Button>
                      <Button variant="soft" size="sm" onClick={() => removeSpecialPrice(item.id)} style={{ minHeight: 44 }}>Quitar</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" block onClick={() => openSpecialPrice(item)} style={{ marginTop: 12, minHeight: 44 }}>
                      $ Precio especial
                    </Button>
                  )}

                  {/* ── Descuento adicional (% o $) ── */}
                  {extraDiscEditing === item.id ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <Segmented
                        size="lg"
                        options={[{ id: 'pct', label: '%' }, { id: 'mxn', label: '$' }]}
                        value={extraDiscType} onChange={setExtraDiscType}
                        style={{ flexShrink: 0 }}
                      />
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="k-input"
                        value={extraDiscInput}
                        onChange={e => setExtraDiscInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmExtraDisc(item.id) }}
                        autoFocus
                        placeholder={extraDiscType === 'pct' ? 'Ej. 10' : 'Ej. 500'}
                        style={{ flex: '1 1 90px', minWidth: 0 }}
                      />
                      <Button onClick={() => confirmExtraDisc(item.id)}>Listo</Button>
                      <button aria-label="Cancelar" onClick={() => setExtraDiscEditing(null)} style={closeEditBtn}>
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                  ) : item.extraDiscount?.value > 0 ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Button variant="outline" size="sm" onClick={() => openExtraDisc(item)} style={{ flex: 1, minHeight: 44, minWidth: 0, whiteSpace: 'normal' }}>
                        Dto. adicional: {item.extraDiscount.type === 'pct' ? `−${item.extraDiscount.value}%` : `−${fmt(item.extraDiscount.value)}`} · Final: {fmt(effectivePrice(item))}
                      </Button>
                      <Button variant="soft" size="sm" onClick={() => removeExtraDisc(item.id)} style={{ minHeight: 44 }}>Quitar</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" block onClick={() => openExtraDisc(item)} style={{ marginTop: 8, minHeight: 44 }}>
                      % / $ Descuento adicional
                    </Button>
                  )}
                </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Paquete escolar */}
        <button
          onClick={() => setShowSchoolPkg(true)}
          className="k-card k-card--lilac"
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, marginBottom: 22 }}
        >
          <span className="k-iconbtn k-iconbtn--ink" aria-hidden="true">
            <Icon name="school" size={22} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Paquete escolar de credenciales</div>
            <div style={{ fontSize: 13, marginTop: 2, opacity: 0.8 }}>
              Captura los alumnos y calcula todo automático
            </div>
          </div>
          <Icon name="chevron-right" size={20} />
        </button>

        {/* Catalog */}
        <Label>Catálogo de productos</Label>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o SKU…" style={{ marginBottom: 10 }} />
        <Segmented
          size="lg" surface
          options={cats.map(c => ({ id: c, label: c }))}
          value={cat} onChange={setCat}
          style={{ display: 'flex', marginBottom: 12 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {catalog.length === 0 ? (
            <Empty icon="package">Sin resultados</Empty>
          ) : catalog.map(p => {
            const inCart = items.find(i => i.id === p.id)
            return (
              <button
                key={p.id} onClick={() => addItem(p)}
                className="k-card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 64,
                  textAlign: 'left', width: '100%',
                  boxShadow: inCart ? 'inset 0 0 0 2px var(--fg)' : 'none',
                }}
              >
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
                  background: inCart ? 'var(--primary-bg)' : 'var(--bg-secondary)',
                  color: inCart ? 'var(--primary-fg)' : 'var(--fg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={inCart ? 'check' : 'plus'} size={18} />
                </span>
              </button>
            )
          })}
        </div>
      </Sheet>

      {showSchoolPkg && (
        <SchoolPackageModal
          onClose={() => setShowSchoolPkg(false)}
          onAdd={newItems => setItems(prev => [...prev, ...newItems])}
        />
      )}
    </>
  )
}
