/**
 * productsStore — utilidades de descuento por volumen.
 *
 * Los productos ahora viven en Supabase (ver hooks/useProducts.js).
 * Este módulo conserva solo las funciones de cálculo de precio/descuento.
 *
 * Tier shape: { id, minQty, maxQty (null = sin límite), discountPct }
 */

/**
 * Devuelve el % de descuento aplicable para un producto y cantidad dadas.
 * Busca el tier cuyo rango [minQty, maxQty] contiene `qty`.
 */
export function getDiscount(product, qty) {
  const tiers = product?.tiers ?? []
  for (const t of tiers) {
    const min = Number(t.minQty)
    const max = t.maxQty != null ? Number(t.maxQty) : Infinity
    if (qty >= min && qty <= max) {
      return Number(t.discountPct)
    }
  }
  return 0
}

/** Precio unitario después de aplicar descuento por volumen. */
export function getEffectivePrice(product, qty) {
  const disc = getDiscount(product, qty)
  return disc > 0 ? product.price * (1 - disc / 100) : product.price
}
