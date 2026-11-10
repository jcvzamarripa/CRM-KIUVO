import React, { useState, useCallback } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Label, SearchInput, Field, Empty } from '../ui'
import { useProducts } from '../../hooks/useProducts'
import { useToast } from '../../contexts/ToastContext'

const UNITS = ['pza', 'ml', 'kg', 'lt', 'rollo', 'caja', 'm2', 'par']
const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

function allCategories(list) {
  return ['Todas', ...Array.from(new Set(list.map(p => p.category))).sort()]
}

// ── Tiers editor (rangos: de X a Y piezas) ────────────────────────
const tierInput = { width: 68, textAlign: 'center', padding: '8px 6px' }

function TiersEditor({ tiers, onChange }) {
  function addTier() {
    onChange([...tiers, { id: `t${Date.now()}`, minQty: '', maxQty: '', discountPct: '' }])
  }
  function removeTier(id) {
    onChange(tiers.filter(t => t.id !== id))
  }
  function updateTier(id, field, val) {
    onChange(tiers.map(t => t.id === id ? { ...t, [field]: val } : t))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Label style={{ marginBottom: 0 }}>Descuentos por volumen</Label>
        <Button variant="soft" size="sm" icon="plus" onClick={addTier}>Agregar nivel</Button>
      </div>

      {tiers.length === 0 ? (
        <div style={{
          padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          fontSize: 13, color: 'var(--fg-tertiary)', textAlign: 'center',
        }}>
          Sin descuentos configurados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tiers.map((tier, i) => (
            <div key={tier.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: 'var(--fg-secondary)', fontWeight: 600 }}>Nivel {i + 1}</div>
                <button
                  onClick={() => removeTier(tier.id)}
                  aria-label={`Eliminar nivel ${i + 1}`}
                  style={{ width: 36, height: 36, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>

              {/* Inputs: De [min] a [max] piezas → [%] */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="k-dim" style={{ fontSize: 13 }}>De</span>
                <input
                  type="number" min="1" className="k-input k-input--sm"
                  value={tier.minQty}
                  onChange={e => updateTier(tier.id, 'minQty', e.target.value)}
                  placeholder="1"
                  style={tierInput}
                />
                <span className="k-dim" style={{ fontSize: 13 }}>a</span>
                <input
                  type="number" min="1" className="k-input k-input--sm"
                  value={tier.maxQty}
                  onChange={e => updateTier(tier.id, 'maxQty', e.target.value)}
                  placeholder="∞"
                  style={tierInput}
                />
                <span className="k-dim" style={{ fontSize: 13 }}>pzas →</span>
                <input
                  type="number" min="0" max="99" className="k-input k-input--sm"
                  value={tier.discountPct}
                  onChange={e => updateTier(tier.id, 'discountPct', e.target.value)}
                  placeholder="0"
                  style={tierInput}
                />
                <span style={{ fontSize: 13, color: 'var(--success-fg)', fontWeight: 600 }}>%</span>
              </div>
            </div>
          ))}

          {/* Preview de rangos */}
          {tiers.some(t => t.minQty && t.discountPct !== '') && (
            <div style={{
              padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)',
              fontSize: 13, color: 'var(--success-fg)', lineHeight: 1.7,
            }}>
              {[...tiers]
                .filter(t => t.minQty)
                .sort((a, b) => Number(a.minQty) - Number(b.minQty))
                .map(t => {
                  const min = t.minQty
                  const max = t.maxQty ? t.maxQty : null
                  const label = max ? `${min}–${max} pzas` : `${min}+ pzas`
                  const pct   = t.discountPct || '0'
                  return (
                    <div key={t.id}>
                      {label} → <b>{pct === '0' || pct === 0 ? 'sin descuento' : `−${pct}% de descuento`}</b>
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Edit panel ────────────────────────────────────────────────────
function EditPanel({ product, isNew, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState({
    name:     product.name     ?? '',
    sku:      product.sku      ?? '',
    category: product.category ?? '',
    unit:     product.unit     ?? 'pza',
    price:    String(product.price ?? ''),
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
    if (!form.name.trim())     e.name     = 'Nombre requerido'
    if (!form.sku.trim())      e.sku      = 'SKU requerido'
    if (!form.category.trim()) e.category = 'Categoría requerida'
    const p = parseFloat(form.price)
    if (isNaN(p) || p <= 0)    e.price    = 'Precio debe ser mayor a 0'

    for (const t of form.tiers) {
      if (!t.minQty || Number(t.minQty) < 1) {
        e.tiers = 'Cantidad mínima debe ser ≥ 1'; break
      }
      if (t.maxQty && Number(t.maxQty) <= Number(t.minQty)) {
        e.tiers = 'El máximo debe ser mayor que el mínimo'; break
      }
      if (t.discountPct === '' || t.discountPct == null) {
        e.tiers = 'El descuento es requerido (puede ser 0%)'; break
      }
      if (Number(t.discountPct) < 0 || Number(t.discountPct) > 99) {
        e.tiers = 'Descuento debe ser entre 0 y 99%'; break
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
        .filter(t => t.minQty !== '')
        .map(t => ({
          id:          t.id,
          minQty:      Number(t.minQty),
          maxQty:      t.maxQty ? Number(t.maxQty) : null,
          discountPct: Number(t.discountPct),
        }))
        .sort((a, b) => a.minQty - b.minQty),
    }
    onSave(parsed)
  }

  return (
    <div style={{
      width: 'min(380px, 100%)', flexShrink: 0,
      background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100%',
      borderRadius: 'var(--r-xl) 0 0 var(--r-xl)', boxShadow: 'var(--shadow-float)',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div className="k-h2">{isNew ? 'Nuevo producto' : 'Editar producto'}</div>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onCancel} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>
        <Field label="Nombre del producto" error={errors.name}>
          <input
            className="k-input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder='Ej. Válvula de paso 1/2"'
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="SKU" error={errors.sku}>
            <input
              className="k-input"
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
              placeholder="VAL-001"
              style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
            />
          </Field>
          <Field label="Unidad">
            <select className="k-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Categoría" error={errors.category}>
            <input
              className="k-input"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              placeholder="Ej. Válvulas"
            />
          </Field>
          <Field label="Precio unitario ($)" error={errors.price}>
            <input
              type="number" min="0" step="0.01" className="k-input"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />

        {/* Volume tiers */}
        <TiersEditor
          tiers={form.tiers}
          onChange={tiers => set('tiers', tiers)}
        />
        {errors.tiers && (
          <div style={{ fontSize: 13, color: 'var(--coral-fg)', marginTop: 8 }}>{errors.tiers}</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px 18px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="soft" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button style={{ flex: 2 }} icon="check" loading={saving} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>

        {!isNew && (
          confirmDelete ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="k-muted" style={{ fontSize: 13, textAlign: 'center' }}>
                ¿Eliminar <b style={{ color: 'var(--fg)' }}>{product.name}</b>?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="soft" size="sm" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                <Button variant="danger" size="sm" style={{ flex: 1 }} disabled={saving} onClick={() => onDelete(product.id)}>Eliminar</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" size="sm" block icon="trash" onClick={() => setConfirmDelete(true)}>
              Eliminar producto
            </Button>
          )
        )}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────
export default function ProductsView() {
  const { products, loading, error, saveProduct, deleteProduct, reload } = useProducts()
  const { addToast } = useToast()
  const showToast = (message, kind = 'success') => addToast({ message, kind })
  const [search,  setSearch]  = useState('')
  const [cat,     setCat]     = useState('Todas')
  const [editing, setEditing] = useState(null)   // product object being edited
  const [isNew,   setIsNew]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  const categories = allCategories(products)

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    const matchC = cat === 'Todas' || p.category === cat
    return matchQ && matchC
  })

  function startNew() {
    setEditing({ name: '', sku: '', category: '', unit: 'pza', price: 0, tiers: [] })
    setIsNew(true)
  }

  function startEdit(p) {
    setEditing(p)
    setIsNew(false)
  }

  async function handleSave(updated) {
    setSaving(true)
    try {
      await saveProduct(updated, isNew)
      await reload()   // recarga inmediata sin esperar al realtime
      showToast?.(isNew ? 'Producto creado' : 'Producto actualizado', 'success')
      setEditing(null)
      setIsNew(false)
    } catch (err) {
      showToast?.(`Error al guardar: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setSaving(true)
    try {
      await deleteProduct(id)
      await reload()   // recarga inmediata
      showToast?.('Producto eliminado', 'success')
      setEditing(null)
    } catch (err) {
      showToast?.(`Error al eliminar: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(null)
    setIsNew(false)
  }

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="k-dim" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, gap: 10 }}>
        <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={18} /></span>
        Cargando catálogo…
      </div>
    )
  }

  // ── Error state
  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--coral-fg)' }}>Error al cargar productos</div>
        <div className="k-dim" style={{ fontSize: 13 }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0, minWidth: 0 }}>

      {/* ── Main table ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '20px 28px 0' }}>

        {/* Filters bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0 }}>
          <SearchInput small value={search} onChange={setSearch} placeholder="Buscar producto o SKU…" style={{ flex: '1 1 220px', maxWidth: 320 }} />
          <div className="k-dim" style={{ marginLeft: 'auto', fontSize: 13, flexShrink: 0 }}>
            {filtered.length} productos
          </div>
          <Button variant="accent" icon="plus" onClick={startNew}>Nuevo producto</Button>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, flexShrink: 0 }}>
          {categories.map(c => (
            <Chip key={c} selected={cat === c} onClick={() => setCat(c)} style={{ minHeight: 36, fontSize: 13, flexShrink: 0 }}>{c}</Chip>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 28 }}>
          {products.length === 0 ? (
            <Empty icon="package">
              No hay productos en el catálogo.
              <div style={{ marginTop: 12 }}>
                <Button icon="plus" onClick={startNew}>Agrega el primero</Button>
              </div>
            </Empty>
          ) : (
            <Card flush style={{ overflowX: 'auto' }}>
              <table className="k-table">
                <thead>
                  <tr>
                    {['SKU', 'Producto', 'Categoría', 'Precio unitario', 'Unidad', 'Descuentos por volumen', ''].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isActive = editing?.id === p.id
                    const hasTiers = p.tiers && p.tiers.length > 0
                    const cell = isActive ? { background: 'var(--bg-secondary)' } : undefined
                    return (
                      <tr key={p.id}>
                        <td style={cell}>
                          <span style={{
                            fontSize: 12, fontFamily: 'monospace',
                            color: 'var(--fg-secondary)', background: 'var(--bg-secondary)',
                            padding: '3px 8px', borderRadius: 'var(--r-sm)', whiteSpace: 'nowrap',
                          }}>{p.sku}</span>
                        </td>
                        <td style={{ ...cell, fontWeight: 600 }}>{p.name}</td>
                        <td className="k-muted" style={cell}>{p.category}</td>
                        <td style={{ ...cell, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.price)}</td>
                        <td className="k-muted" style={cell}>{p.unit}</td>
                        <td style={cell}>
                          {hasTiers ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {[...(p.tiers ?? [])]
                                .sort((a, b) => a.minQty - b.minQty)
                                .map(t => {
                                  const label = t.maxQty
                                    ? `${t.minQty}–${t.maxQty}`
                                    : `${t.minQty}+`
                                  const pctLabel = t.discountPct === 0
                                    ? 'sin dto.'
                                    : `−${t.discountPct}%`
                                  return (
                                    <Pill key={t.id} tone={t.discountPct === 0 ? undefined : 'success'}>
                                      {label} → {pctLabel}
                                    </Pill>
                                  )
                                })}
                            </div>
                          ) : (
                            <span className="k-dim">—</span>
                          )}
                        </td>
                        <td style={{ ...cell, textAlign: 'right' }}>
                          <Button
                            variant={isActive ? 'primary' : 'soft'} size="sm"
                            icon={isActive ? 'x' : 'pencil'}
                            onClick={() => isActive ? handleCancel() : startEdit(p)}
                          >
                            {isActive ? 'Cerrar' : 'Editar'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {products.length > 0 && filtered.length === 0 && (
            <Empty icon="search">Sin resultados para la búsqueda</Empty>
          )}
        </div>
      </div>

      {/* ── Edit panel ─────────────────────────────────────────── */}
      {editing && (
        <EditPanel
          key={editing.id ?? 'new'}
          product={editing}
          isNew={isNew}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
