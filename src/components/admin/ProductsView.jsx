import React, { useState, useCallback } from 'react'
import Icon from '../shared/Icon'
import { getProducts, saveProducts } from '../../lib/productsStore'

const UNITS = ['pza', 'ml', 'kg', 'lt', 'rollo', 'caja', 'm2', 'par']
const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

function allCategories(list) {
  return ['Todas', ...Array.from(new Set(list.map(p => p.category))).sort()]
}

// ── Inline field ──────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-tertiary)', marginBottom: 4, letterSpacing: 0.3 }}>
        {label}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{error}</div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px',
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
  outline: 'none', fontFamily: 'inherit',
}

// ── Tiers editor ──────────────────────────────────────────────────
function TiersEditor({ tiers, onChange }) {
  function addTier() {
    onChange([...tiers, { id: `t${Date.now()}`, minQty: '', discountPct: '' }])
  }
  function removeTier(id) {
    onChange(tiers.filter(t => t.id !== id))
  }
  function updateTier(id, field, val) {
    onChange(tiers.map(t => t.id === id ? { ...t, [field]: val } : t))
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-tertiary)', letterSpacing: 0.3 }}>
          DESCUENTOS POR VOLUMEN
        </div>
        <button
          onClick={addTier}
          style={{
            fontSize: 11, fontWeight: 500, color: 'var(--kiuvo-blue)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          <Icon name="plus" size={12} color="var(--kiuvo-blue)" />
          Agregar nivel
        </button>
      </div>

      {tiers.length === 0 ? (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-secondary)',
          borderRadius: 'var(--r-md)', border: '0.5px dashed var(--border-strong)',
          fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center',
        }}>
          Sin descuentos configurados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tiers.map((tier, i) => (
            <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Label */}
              <div style={{ fontSize: 11, color: 'var(--fg-secondary)', flexShrink: 0, width: 38 }}>
                Nivel {i + 1}
              </div>
              {/* minQty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', flexShrink: 0 }}>≥</span>
                <input
                  type="number" min="1"
                  value={tier.minQty}
                  onChange={e => updateTier(tier.id, 'minQty', e.target.value)}
                  placeholder="Cant."
                  style={{ ...inputStyle, width: '100%', padding: '7px 8px', textAlign: 'center' }}
                />
                <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', flexShrink: 0 }}>pzas →</span>
              </div>
              {/* discountPct */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 72 }}>
                <input
                  type="number" min="1" max="99"
                  value={tier.discountPct}
                  onChange={e => updateTier(tier.id, 'discountPct', e.target.value)}
                  placeholder="%"
                  style={{ ...inputStyle, padding: '7px 8px', textAlign: 'center' }}
                />
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, flexShrink: 0 }}>%</span>
              </div>
              {/* Remove */}
              <button
                onClick={() => removeTier(tier.id)}
                style={{
                  width: 26, height: 26, borderRadius: 'var(--r-sm)',
                  background: 'var(--danger-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Icon name="x" size={12} color="var(--danger)" />
              </button>
            </div>
          ))}

          {/* Preview */}
          {tiers.some(t => t.minQty && t.discountPct) && (
            <div style={{
              marginTop: 4, padding: '8px 10px',
              background: 'var(--success-bg)', borderRadius: 'var(--r-md)',
              border: '0.5px solid var(--success)',
              fontSize: 11, color: 'var(--success-fg)', lineHeight: 1.7,
            }}>
              {[...tiers]
                .filter(t => t.minQty && t.discountPct)
                .sort((a, b) => Number(a.minQty) - Number(b.minQty))
                .map(t => (
                  <div key={t.id}>
                    ≥ {t.minQty} pzas → <b>−{t.discountPct}% de descuento</b>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Edit panel ────────────────────────────────────────────────────
function EditPanel({ product, isNew, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({
    name:     product.name,
    sku:      product.sku,
    category: product.category,
    unit:     product.unit,
    price:    String(product.price),
    tiers:    product.tiers ? [...product.tiers] : [],
  })
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nombre requerido'
    if (!form.sku.trim())  e.sku  = 'SKU requerido'
    if (!form.category.trim()) e.category = 'Categoría requerida'
    const p = parseFloat(form.price)
    if (isNaN(p) || p <= 0) e.price = 'Precio debe ser mayor a 0'
    // Validate tiers
    for (const t of form.tiers) {
      if (!t.minQty || Number(t.minQty) < 1) { e.tiers = 'Cantidad mínima debe ser ≥ 1'; break }
      if (!t.discountPct || Number(t.discountPct) < 1 || Number(t.discountPct) > 99) {
        e.tiers = 'Descuento debe ser entre 1 y 99%'; break
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const parsed = {
      ...product,
      name:     form.name.trim(),
      sku:      form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      unit:     form.unit,
      price:    parseFloat(form.price),
      tiers:    form.tiers
        .filter(t => t.minQty && t.discountPct)
        .map(t => ({ ...t, minQty: Number(t.minQty), discountPct: Number(t.discountPct) }))
        .sort((a, b) => a.minQty - b.minQty),
    }
    onSave(parsed)
  }

  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>
          {isNew ? 'Nuevo producto' : 'Editar producto'}
        </div>
        <button onClick={onCancel} style={{ color: 'var(--fg-tertiary)' }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="NOMBRE DEL PRODUCTO" error={errors.name}>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ej. Válvula de paso 1/2&quot;"
            style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)' }}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="SKU" error={errors.sku}>
            <input
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
              placeholder="VAL-001"
              style={{ ...inputStyle, borderColor: errors.sku ? 'var(--danger)' : 'var(--border)', fontFamily: 'monospace', textTransform: 'uppercase' }}
            />
          </Field>
          <Field label="UNIDAD">
            <select
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              style={{ ...inputStyle }}
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="CATEGORÍA" error={errors.category}>
            <input
              value={form.category}
              onChange={e => set('category', e.target.value)}
              placeholder="Ej. Válvulas"
              style={{ ...inputStyle, borderColor: errors.category ? 'var(--danger)' : 'var(--border)' }}
            />
          </Field>
          <Field label="PRECIO UNITARIO ($)" error={errors.price}>
            <input
              type="number" min="0" step="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, borderColor: errors.price ? 'var(--danger)' : 'var(--border)' }}
            />
          </Field>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 0' }} />

        {/* Volume tiers */}
        <TiersEditor
          tiers={form.tiers}
          onChange={tiers => set('tiers', tiers)}
        />
        {errors.tiers && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: -8 }}>{errors.tiers}</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px 16px', borderTop: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px 0',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '9px 0',
              background: 'var(--kiuvo-blue)', color: '#fff',
              borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name="check" size={14} color="#fff" />
            Guardar cambios
          </button>
        </div>

        {!isNew && (
          confirmDelete ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--fg-secondary)', textAlign: 'center' }}>
                ¿Eliminar <b style={{ color: 'var(--fg)' }}>{product.name}</b>?
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, padding: '8px', border: '0.5px solid var(--border)',
                    background: 'var(--bg)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--fg)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  style={{
                    flex: 1, padding: '8px', background: 'var(--danger)', color: '#fff',
                    borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%', padding: '8px',
                border: '0.5px solid var(--danger-border)',
                background: 'var(--danger-bg)', color: 'var(--danger-fg)',
                borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon name="trash" size={13} color="var(--danger)" />
              Eliminar producto
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────
export default function ProductsView() {
  const [products, setProducts] = useState(() => getProducts())
  const [search,   setSearch]   = useState('')
  const [cat,      setCat]      = useState('Todas')
  const [editing,  setEditing]  = useState(null)   // product object being edited
  const [isNew,    setIsNew]    = useState(false)

  const categories = allCategories(products)

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    const matchC = cat === 'Todas' || p.category === cat
    return matchQ && matchC
  })

  const persist = useCallback((list) => {
    setProducts(list)
    saveProducts(list)
  }, [])

  function startNew() {
    const newProd = {
      id: Date.now(),
      name: '', sku: '', category: '', unit: 'pza', price: 0, tiers: [],
    }
    setEditing(newProd)
    setIsNew(true)
  }

  function startEdit(p) {
    setEditing(p)
    setIsNew(false)
  }

  function handleSave(updated) {
    if (isNew) {
      persist([...products, updated])
    } else {
      persist(products.map(p => p.id === updated.id ? updated : p))
    }
    setEditing(null)
    setIsNew(false)
  }

  function handleDelete(id) {
    persist(products.filter(p => p.id !== id))
    setEditing(null)
  }

  function handleCancel() {
    setEditing(null)
    setIsNew(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>

      {/* ── Main table ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Filters bar */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', flex: 1, maxWidth: 280,
          }}>
            <Icon name="search" size={14} color="var(--fg-tertiary)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto o SKU…"
              style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--fg)', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12, flexShrink: 0,
                background: cat === c ? 'var(--kiuvo-blue)' : 'var(--surface)',
                color: cat === c ? '#fff' : 'var(--fg-secondary)',
                border: `0.5px solid ${cat === c ? 'transparent' : 'var(--border)'}`,
                fontWeight: cat === c ? 500 : 400,
              }}>{c}</button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-tertiary)', flexShrink: 0 }}>
            {filtered.length} productos
          </div>

          <button
            onClick={startNew}
            style={{
              padding: '7px 14px', background: 'var(--kiuvo-blue)', color: '#fff',
              borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}
          >
            <Icon name="plus" size={13} />
            Nuevo producto
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['SKU', 'Producto', 'Categoría', 'Precio unitario', 'Unidad', 'Descuentos', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '9px 14px',
                    textAlign: i === 0 || i === 6 ? 'center' : 'left',
                    fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                    borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isActive = editing?.id === p.id
                const hasTiers = p.tiers && p.tiers.length > 0
                return (
                  <tr
                    key={p.id}
                    style={{
                      background: isActive ? 'var(--kiuvo-blue-soft)' : 'transparent',
                      cursor: 'default',
                    }}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontFamily: 'monospace',
                        color: 'var(--fg-secondary)', background: 'var(--bg-secondary)',
                        padding: '2px 6px', borderRadius: 4,
                      }}>{p.sku}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, color: 'var(--fg)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', color: 'var(--fg-secondary)', fontSize: 12 }}>
                      {p.category}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(p.price)}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', color: 'var(--fg-secondary)', fontSize: 12 }}>
                      {p.unit}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      {hasTiers ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {[...p.tiers]
                            .sort((a, b) => a.minQty - b.minQty)
                            .map(t => (
                              <span key={t.id} style={{
                                fontSize: 10, fontWeight: 600,
                                padding: '2px 6px', borderRadius: 99,
                                background: 'var(--success-bg)', color: 'var(--success-fg)',
                                border: '0.5px solid var(--success)',
                                whiteSpace: 'nowrap',
                              }}>
                                ≥{t.minQty} →&nbsp;−{t.discountPct}%
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 10px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <button
                        onClick={() => isActive ? handleCancel() : startEdit(p)}
                        style={{
                          padding: '5px 10px', fontSize: 12, fontWeight: 500,
                          borderRadius: 'var(--r-md)',
                          background: isActive ? 'var(--kiuvo-blue)' : 'var(--surface)',
                          color: isActive ? '#fff' : 'var(--fg-secondary)',
                          border: `0.5px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <Icon name={isActive ? 'x' : 'pencil'} size={12} />
                        {isActive ? 'Cerrar' : 'Editar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{
              padding: '40px 0', textAlign: 'center',
              color: 'var(--fg-tertiary)', fontSize: 13,
            }}>
              Sin resultados para la búsqueda
            </div>
          )}
        </div>
      </div>

      {/* ── Edit panel ─────────────────────────────────────────── */}
      {editing && (
        <EditPanel
          key={editing.id}
          product={editing}
          isNew={isNew}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
