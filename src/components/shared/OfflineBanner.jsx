import React, { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { getQueue, getQueueCount, dequeue } from '../../lib/offlineQueue'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { replayCheckIn } from '../../lib/checkin'

// ── Sync de cotizaciones offline ──────────────────────────────────────────────
async function syncQuote(item) {
  const { tempId, _sync, ...quoteHeader } = item.payload
  const { prospectName, contactName, sellerName, paymentTerms, deliveryTime, items } = _sync || {}

  // 1. Número secuencial real
  const { data: lastNum } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('seller_id', quoteHeader.seller_id)
    .not('quote_number', 'is', null)
    .order('quote_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const quoteNumber = (lastNum?.quote_number ?? 0) + 1

  // 2. Insertar cotización
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert({ ...quoteHeader, quote_number: quoteNumber })
    .select()
    .single()
  if (qErr) throw new Error(qErr.message)

  // 3. Insertar partidas
  if (items?.length) {
    await supabase.from('quote_items').insert(
      items.map(i => ({
        quote_id:     quote.id,
        product_name: i.name,
        sku:          i.sku  ?? null,
        unit:         i.unit ?? null,
        quantity:     i.qty,
        unit_price:   i.unitPrice,
        discount_pct: i.discountPct ?? 0,
      }))
    )
  }

  // 4. Regenerar PDF y subir al storage (carga react-pdf solo cuando se necesita)
  try {
    const [{ pdf }, { QuotePDFDoc }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../../lib/quotePDF'),
    ])
    const blob = await pdf(
      <QuotePDFDoc
        quoteId={quote.id}
        prospectName={prospectName || ''}
        contactName={contactName  || ''}
        sellerName={sellerName    || ''}
        items={items?.map(i => ({ ...i, discountPct: i.discountPct ?? 0 })) || []}
        date={new Date(item.timestamp)}
        paymentTerms={paymentTerms || ''}
        deliveryTime={deliveryTime || ''}
        logoUrl={null}
      />
    ).toBlob()

    const pdfPath = `${quoteHeader.seller_id}/${quote.id}.pdf`
    const { error: upErr } = await supabase.storage
      .from('cotizaciones')
      .upload(pdfPath, blob, { contentType: 'application/pdf', upsert: true })
    if (!upErr) {
      await supabase.from('quotes').update({ pdf_path: pdfPath }).eq('id', quote.id)
    }
  } catch (pdfErr) {
    console.warn('[sync] PDF offline upload failed:', pdfErr)
    // La cotización ya quedó guardada, solo falta el PDF
  }
}

// ── Sync the queue against Supabase ──────────────────────────────────────────
async function replayQueue() {
  const queue = getQueue()
  if (!queue.length) return 0
  let synced = 0
  for (const item of queue) {
    try {
      if (isSupabaseConfigured) {
        if (item.type === 'INSERT_QUOTE') {
          await syncQuote(item)
          dequeue(item.id); synced++
        } else if (item.type === 'CHECKIN') {
          await replayCheckIn(item)
          dequeue(item.id); synced++
        } else {
          // La visita se fecha con la hora en que ocurrió, no con la de sincronización
          const payload = item.type === 'INSERT_VISIT' && !item.payload.created_at
            ? { ...item.payload, created_at: item.timestamp }
            : item.payload
          const { error } = await supabase.from(item.table).insert(payload)
          if (!error) { dequeue(item.id); synced++ }
        }
      } else {
        dequeue(item.id); synced++
      }
    } catch { /* dejar en cola, reintentar la próxima vez */ }
  }
  return synced
}

// ── Banner ────────────────────────────────────────────────────────────────────
export default function OfflineBanner() {
  const isOnline       = useOnlineStatus()
  const prevOnline     = useRef(isOnline)

  // 'hidden' | 'offline' | 'syncing' | 'synced'
  const [state,      setState]      = useState('hidden')
  const [pending,    setPending]    = useState(0)
  const [syncedCount,setSyncedCount]= useState(0)

  // Poll queue count while offline
  useEffect(() => {
    if (isOnline) return
    const t = setInterval(() => setPending(getQueueCount()), 1500)
    setPending(getQueueCount())
    return () => clearInterval(t)
  }, [isOnline])

  // Al abrir la app con conexión: enviar lo que quedó en cola de sesiones anteriores
  useEffect(() => {
    if (!navigator.onLine || getQueueCount() === 0) return
    let cancelled = false
    supabase?.auth.getSession().then(({ data }) => {
      if (cancelled || !data?.session) return
      setPending(getQueueCount())
      setState('syncing')
      replayQueue().then(synced => {
        if (cancelled) return
        setSyncedCount(synced)
        setState(synced > 0 ? 'synced' : 'hidden')
        setTimeout(() => setState('hidden'), 3500)
      })
    })
    return () => { cancelled = true }
  }, [])

  // React to online ↔ offline transitions
  useEffect(() => {
    const wasOnline = prevOnline.current
    prevOnline.current = isOnline

    if (!isOnline) {
      // Just went offline
      setState('offline')
      setPending(getQueueCount())
      return
    }

    if (!wasOnline && isOnline) {
      // Just came back online — sync then flash success
      const count = getQueueCount()
      if (count > 0) {
        setState('syncing')
        replayQueue().then(synced => {
          setSyncedCount(synced)
          setState('synced')
          setTimeout(() => setState('hidden'), 3500)
        })
      } else {
        setState('synced')
        setSyncedCount(0)
        setTimeout(() => setState('hidden'), 2500)
      }
    }
  }, [isOnline])

  if (state === 'hidden') return null

  // ── Styles per state ──────────────────────────────────────────────────────
  const cfg = {
    offline: { bg: 'var(--coral)',   fg: 'var(--ink)',       icon: 'wifi-off', text: 'Sin conexión · los cambios se guardan en el teléfono' },
    syncing: { bg: 'var(--ink)',     fg: 'var(--on-ink)',    icon: 'loader',   text: `Reconectado · sincronizando ${pending} cambio${pending !== 1 ? 's' : ''}…` },
    synced:  { bg: 'var(--accent)',  fg: 'var(--accent-fg)', icon: 'check',    text: syncedCount > 0
        ? `Conexión restaurada · ${syncedCount} cambio${syncedCount !== 1 ? 's' : ''} sincronizado${syncedCount !== 1 ? 's' : ''}`
        : 'Conexión restaurada' },
  }[state]

  // Estilos inline: el banner se monta fuera del contenedor .kiuvo
  return (
    <div role="status" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: cfg.bg,
      color: cfg.fg,
      padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-sans)',
      fontSize: 14, fontWeight: 600, lineHeight: 1.3,
      boxShadow: 'var(--shadow-float)',
      transition: 'background 0.3s',
      userSelect: 'none',
    }}>
      <span style={{
        display: 'inline-flex',
        animation: state === 'syncing' ? 'kiuvo-banner-spin 1s linear infinite' : 'none',
      }}>
        <Icon name={cfg.icon} size={20} />
      </span>

      <span style={{ flex: 1 }}>{cfg.text}</span>

      {state === 'offline' && pending > 0 && (
        <span style={{
          background: 'var(--ink)', color: 'var(--on-ink)',
          padding: '4px 12px', borderRadius: 'var(--r-full)',
          fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {pending} pendiente{pending !== 1 ? 's' : ''}
        </span>
      )}

      <style>{`
        @keyframes kiuvo-banner-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
