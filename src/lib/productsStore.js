/**
 * productsStore — localStorage-backed product catalog.
 *
 * Products are initialized from MOCK_PRODUCTS (each gets an empty `tiers` array).
 * All edits, new products, and volume-discount tiers are persisted here.
 *
 * Tier shape:  { id: string, minQty: number, discountPct: number }
 */
// v3 key — forces a fresh start (clears any cached mock products from v2)
const KEY = 'kiuvo_products_v3'

function defaults() {
  return []
}

export function getProducts() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0) return list
    }
  } catch {}
  return defaults()
}

export function saveProducts(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function resetProducts() {
  localStorage.removeItem(KEY)
}

/**
 * Returns the best applicable discount % for the given product + qty.
 * "Best" = the tier with the highest minQty that is still <= qty.
 */
export function getDiscount(product, qty) {
  const tiers = product.tiers || []
  let best = null
  for (const t of tiers) {
    if (qty >= t.minQty) {
      if (!best || t.minQty > best.minQty) best = t
    }
  }
  return best ? best.discountPct : 0
}

/** Price after applying volume discount. */
export function getEffectivePrice(product, qty) {
  const disc = getDiscount(product, qty)
  return disc > 0 ? product.price * (1 - disc / 100) : product.price
}
