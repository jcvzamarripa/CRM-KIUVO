import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { saveFile } from '../lib/saveFile'

/**
 * Fetches quote history from Supabase.
 * - Pass sellerId to scope to a single seller (seller view).
 * - Omit sellerId to get all quotes (admin view).
 */
export function useQuoteHistory({ sellerId = null, limit = 200 } = {}) {
  const [quotes,  setQuotes]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    setError(null)

    let q = supabase
      .from('quotes')
      .select(`
        id, status, total, notes, created_at, pdf_path, quote_number,
        prospect:prospects ( name ),
        seller:profiles ( full_name, initials, avatar_color ),
        items:quote_items ( id )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sellerId) q = q.eq('seller_id', sellerId)

    const { data, error: qErr } = await q
    if (qErr) {
      console.error('[useQuoteHistory]', qErr)
      setError(qErr.message)
      setLoading(false)
      return
    }

    setQuotes((data ?? []).map(r => ({
      id:           r.id,
      shortId:      r.id.slice(0, 8).toUpperCase(),
      quoteNumber:  r.quote_number || null,
      status:       r.status || 'draft',
      total:        r.total  || 0,
      pdfPath:      r.pdf_path || null,
      createdAt:    r.created_at,
      dateStr:      new Date(r.created_at).toLocaleDateString('es-MX'),
      prospectName: r.prospect?.name || r.notes || 'Sin prospecto',
      sellerName:   r.seller?.full_name   || '—',
      sellerInit:   r.seller?.initials    || '?',
      sellerColor:  r.seller?.avatar_color || '#888',
      itemCount:    r.items?.length || 0,
    })))
    setLoading(false)
  }, [sellerId, limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime refresh when a new quote is inserted
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('quotes-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => fetch())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { quotes, loading, error, reload: fetch }
}

/** Update a quote's status (sent → approved / rejected / etc.) */
export async function updateQuoteStatus(quoteId, status) {
  const { error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)
  if (error) console.warn('[updateQuoteStatus]', error.message)
  return !error
}

/** Download a stored PDF via a signed URL (60 min expiry).
 *  @param {string} pdfPath   - Storage path (e.g. "seller_id/quote_id.pdf")
 *  @param {string} filename  - Download filename WITHOUT .pdf extension
 */
export async function downloadStoredPDF(pdfPath, filename) {
  if (!pdfPath) return
  // Se descarga el archivo en vez de enlazar la URL firmada: un <a download>
  // a otro dominio se ignora y saca la pestaña del CRM hacia Supabase.
  const { data: blob, error } = await supabase.storage
    .from('cotizaciones')
    .download(pdfPath)
  if (error || !blob) {
    console.warn('[downloadStoredPDF]', error?.message)
    return
  }
  const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' })
  await saveFile(pdfBlob, `${filename || 'cotizacion'}.pdf`)
}
