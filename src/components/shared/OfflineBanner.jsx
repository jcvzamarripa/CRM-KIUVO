import React, { useState, useEffect, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { getQueue, getQueueCount, dequeue } from '../../lib/offlineQueue'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { QuotePDFDoc } from '../../lib/quotePDF'

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

  // 4. Regenerar PDF y subir al storage
  try {
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
        } else {
          const { error } = await supabase.from(item.table).insert(item.payload)
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
    offline: { bg: '#D85A30', icon: '📵', text: 'Sin conexión · los cambios se guardan localmente' },
    syncing: { bg: '#EF9F27', icon: '↻',  text: `Reconectado · sincronizando ${pending} cambio${pending !== 1 ? 's' : ''}…` },
    synced:  { bg: '#1D9E75', icon: '✓',  text: syncedCount > 0
        ? `Conexión restaurada · ${syncedCount} cambio${syncedCount !== 1 ? 's' : ''} sincronizado${syncedCount !== 1 ? 's' : ''}`
        : 'Conexión restaurada' },
  }[state]

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: cfg.bg,
      color: '#fff',
      padding: '9px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      transition: 'background 0.3s',
      userSelect: 'none',
    }}>
      {/* Icon */}
      <span style={{
        fontSize: state === 'syncing' ? 16 : 14,
        display: 'inline-block',
        animation: state === 'syncing' ? 'spin 1s linear infinite' : 'none',
      }}>
        {cfg.icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{cfg.text}</span>

      {/* Pending badge */}
      {state === 'offline' && pending > 0 && (
        <span style={{
          background: 'rgba(255,255,255,0.25)',
          padding: '2px 10px', borderRadius: 99,
          fontSize: 12, fontWeight: 600,
        }}>
          {pending} pendiente{pending !== 1 ? 's' : ''}
        </span>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
