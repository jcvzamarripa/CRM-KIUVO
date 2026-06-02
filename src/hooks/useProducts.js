/**
 * useProducts — Supabase-backed product catalog with realtime sync.
 *
 * - All authenticated users can read (sellers need products for quotes).
 * - Only admins can create / update / soft-delete.
 *
 * Tier shape: { id: string, minQty: number, maxQty: number|null, discountPct: number }
 *   minQty  — cantidad mínima del rango (inclusive)
 *   maxQty  — cantidad máxima del rango (inclusive, null = sin límite)
 *   discountPct — porcentaje de descuento 1-99
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PRODUCTS_CACHE_KEY = 'kiuvo_products_cache'

function getCachedProducts() {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || 'null') } catch { return null }
}
function setCachedProducts(data) {
  try { localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(data)) } catch {}
}

export function useProducts() {
  const [products, setProducts] = useState(() => getCachedProducts() ?? [])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    // Si hay caché, mostrar de inmediato y seguir cargando en background
    const cached = getCachedProducts()
    if (cached?.length) { setProducts(cached); setLoading(false) }

    if (!navigator.onLine) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')

    if (err) {
      console.error('[useProducts] load error:', err.message)
      setError(err.message)
      // Mantener caché si hay
      if (cached?.length) setProducts(cached)
    } else {
      setProducts(data ?? [])
      setCachedProducts(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // Realtime: cualquier cambio en la tabla recarga la lista
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  /** Guarda un producto (insert si es nuevo, update si ya existe). */
  async function saveProduct(product, isNew) {
    if (isNew) {
      // Remover id temporal antes de insertar
      const { id: _drop, ...rest } = product
      const { error: err } = await supabase.from('products').insert(rest)
      if (err) throw new Error(err.message)
    } else {
      const { error: err } = await supabase
        .from('products')
        .update(product)
        .eq('id', product.id)
      if (err) throw new Error(err.message)
    }
  }

  /** Soft-delete: marca active=false en vez de borrar físicamente. */
  async function deleteProduct(id) {
    const { error: err } = await supabase
      .from('products')
      .update({ active: false })
      .eq('id', id)
    if (err) throw new Error(err.message)
  }

  return { products, loading, error, saveProduct, deleteProduct, reload: load }
}
