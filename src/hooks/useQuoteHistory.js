import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Fetches quote history from Supabase.
 * - Pass sellerId to scope to a single seller (seller view).
 * - Omit sellerId to get all quotes (admin view).
 */
export function useQuoteHistory({ sellerId = null, limit = 200 } = {}) {
  const [quotes,  setQuotes]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)

    let q = supabase
      .from('quotes')
      .select(`
        id, status, total, notes, created_at, pdf_path,
        prospect:prospects!prospect_id (name),
        seller:profiles!seller_id (full_name, initials, avatar_color),
        items:quote_items (id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sellerId) q = q.eq('seller_id', sellerId)

    const { data, error } = await q
    if (error) {
      console.warn('[useQuoteHistory]', error.message)
      setLoading(false)
      return
    }

    setQuotes((data ?? []).map(r => ({
      id:           r.id,
      shortId:      r.id.slice(0, 8).toUpperCase(),
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

  return { quotes, loading, reload: fetch }
}

/** Download a stored PDF via a signed URL (60 min expiry). */
export async function downloadStoredPDF(pdfPath, shortId) {
  if (!pdfPath) return
  const { data, error } = await supabase.storage
    .from('cotizaciones')
    .createSignedUrl(pdfPath, 3600)
  if (error || !data?.signedUrl) {
    console.warn('[downloadStoredPDF]', error?.message)
    return
  }
  const a = document.createElement('a')
  a.href = data.signedUrl
  a.download = `cotizacion-${shortId || 'kiuvo'}.pdf`
  a.click()
}
