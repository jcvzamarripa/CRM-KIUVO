import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Segmented, SearchInput, Avatar, Empty, Bone } from '../ui'
import { useStages } from '../../contexts/StagesContext'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useSellers } from '../../hooks/useSellers'
import { rules, collectErrors } from '../../lib/validation'
import { supabase } from '../../lib/supabase'
import { saveFile } from '../../lib/saveFile'

const HEALTH_TONE  = { green: 'success', amber: 'warning', red: 'coral', black: undefined }
const HEALTH_LABEL = { green: 'Al día', amber: 'En riesgo', red: 'Urgente', black: 'Perdido' }
const fmt = n => '$' + n.toLocaleString('es-MX')

const LAYOUT_CSS = `
  @keyframes slideInRight { from { transform:translateX(24px); opacity:0 } to { transform:translateX(0); opacity:1 } }
  .prv-panel { width: 100%; flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); border-radius: var(--r-xl); animation: slideInRight 0.18s ease; }
  .prv-panel__head { padding: 16px 16px 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0; }
  .prv-panel__foot { flex-shrink: 0; padding: 12px 16px 16px; border-top: 1px solid var(--border); }
  .prv-toolbar { padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; flex-shrink: 0; }
  .prv-tablewrap { flex: 1; min-height: 0; padding: 0 20px 20px; display: flex; }
  .prv-table th { position: sticky; top: 0; z-index: 1; background: var(--surface); }
  .prv-table tr[aria-selected="true"] td { background: var(--bg-tertiary); }
  @media (max-width: 768px) {
    .prv-toolbar { padding: 12px; }
    .prv-tablewrap { padding: 0 12px 12px; }
  }
`

// ─── New Prospect Panel ───────────────────────────────────────────────────────
function NewProspectPanel({ stages, sellers = [], onSave, onClose }) {
  const [form, setForm] = useState({
    name:    '',
    contact: '',
    phone:   '',
    value:   '',
    stage:   stages[0]?.id || 'prospeccion',
    owner:   '',
    city:    '',
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function validate() {
    return collectErrors({
      name:    rules.required(form.name,    'Empresa'),
      contact: rules.required(form.contact, 'Contacto'),
      phone:   rules.phone(form.phone),
      value:   rules.numRange(form.value, 0, 99_999_999, 'El valor'),
    })
  }

  const canSave = form.name.trim() && form.contact.trim()

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const today = new Date().toISOString().slice(0, 10)
    onSave({
      id:      Date.now(),
      name:    form.name.trim(),
      contact: form.contact.trim(),
      phone:   form.phone.trim(),
      value:   parseFloat(form.value.replace(/[^0-9.]/g, '')) || 0,
      stage:   form.stage,
      owner:   form.owner,
      city:    form.city.trim(),
      visits:  0,
      days:    0,
      last:    today,
      health:  'green',
      lat:     null,
      lng:     null,
    })
  }

  return (
    <div className="prv-panel">
      {/* Header */}
      <div className="prv-panel__head">
        <div style={{ minWidth: 0 }}>
          <div className="k-h2">Nuevo prospecto</div>
          <div className="k-dim" style={{ fontSize: 13, marginTop: 2 }}>Registro manual</div>
        </div>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} style={{ width: 40, height: 40 }} />
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>

        {/* Empresa */}
        <Field label="Empresa *" error={errors.name}>
          <input
            className="k-input k-input--sm"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Nombre de la empresa"
            autoFocus
            style={errors.name ? errorRing : undefined}
          />
        </Field>

        {/* Contacto */}
        <Field label="Contacto *" error={errors.contact}>
          <input
            className="k-input k-input--sm"
            value={form.contact}
            onChange={e => set('contact', e.target.value)}
            placeholder="Nombre del contacto"
            style={errors.contact ? errorRing : undefined}
          />
        </Field>

        {/* Phone + City row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <Field label="Teléfono" error={errors.phone}>
            <input
              className="k-input k-input--sm"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="55 1234 5678"
              type="tel"
              inputMode="tel"
              style={errors.phone ? errorRing : undefined}
            />
          </Field>
          <Field label="Ciudad">
            <input
              className="k-input k-input--sm"
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Ciudad de México"
            />
          </Field>
        </div>

        {/* Valor estimado */}
        <Field label="Valor estimado (MXN)" error={errors.value}>
          <div style={{ position: 'relative' }}>
            <span className="k-dim" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14,
            }}>$</span>
            <input
              className="k-input k-input--sm"
              value={form.value}
              onChange={e => set('value', e.target.value)}
              placeholder="0"
              inputMode="numeric"
              style={{ paddingLeft: 28, ...(errors.value ? errorRing : null) }}
            />
          </div>
        </Field>

        {/* Etapa */}
        <Field label="Etapa inicial">
          <select
            className="k-input k-input--sm"
            value={form.stage}
            onChange={e => set('stage', e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>

        {/* Vendedor */}
        <Field label="Vendedor asignado">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sellers.map(s => (
              <Chip
                key={s.init}
                selected={form.owner === s.init}
                onClick={() => set('owner', s.init)}
                style={{ minHeight: 40, padding: '0 14px 0 6px', fontSize: 13 }}
              >
                <Avatar size="sm" initials={s.init} color={s.color} style={{ width: 26, height: 26, fontSize: 10 }} />
                {s.name.split(' ')[0]}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      {/* Footer */}
      <div className="prv-panel__foot" style={{ display: 'flex', gap: 8 }}>
        <Button variant="soft" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
        <Button icon="user-plus" disabled={!canSave} onClick={handleSubmit} style={{ flex: 2 }}>Dar de alta</Button>
      </div>
    </div>
  )
}

// ─── Kind config for history timeline ─────────────────────────────────────────
const KIND_CFG = {
  visit:    { icon: 'map-pin',        tone: 'sky',     label: 'Visita' },
  call:     { icon: 'phone',          tone: 'lilac',   label: 'Llamada' },
  whatsapp: { icon: 'brand-whatsapp', tone: 'success', label: 'WhatsApp' },
  quote:    { icon: 'file-text',      tone: 'warning', label: 'Cotización' },
  win:      { icon: 'trophy',         tone: 'accent',  label: 'Cierre' },
  stage:    { icon: 'arrow-right',    tone: 'success', label: 'Etapa' },
  add:      { icon: 'user-plus',      tone: 'sky',     label: 'Alta' },
  new:      { icon: 'user-plus',      tone: 'sky',     label: 'Alta' },
  msg:      { icon: 'send',           tone: 'lilac',   label: 'Mensaje' },
  email:    { icon: 'mail',           tone: 'lilac',   label: 'Email' },
}
const kindCfg = k => KIND_CFG[k] || { icon: 'history', tone: undefined, label: k || 'Actividad' }

// ─── Timeline (compartido por el historial y el detalle) ─────────────────────
function TimelineSkeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Bone w={32} h={32} r="50%" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            <Bone w="55%" h={11} />
            <Bone w="80%" h={9} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Timeline({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, idx) => {
        const cfg = kindCfg(item.kind)
        return (
          <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
            {idx < items.length - 1 && (
              <div style={{ position: 'absolute', left: 15, top: 34, bottom: 0, width: 2, background: 'var(--border)' }} />
            )}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={cfg.icon} size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Pill tone={cfg.tone}>{cfg.label}</Pill>
                {(item.seller?.full_name || item.seller?.initials) && (
                  <span className="k-dim" style={{ fontSize: 12 }}>
                    {item.seller.full_name || item.seller.initials}
                  </span>
                )}
              </div>
              {item.notes && (
                <div style={{ fontSize: 14, color: 'var(--fg)', marginTop: 6, lineHeight: 1.45 }}>
                  {item.notes}
                </div>
              )}
              <div className="k-dim" style={{ fontSize: 12, marginTop: 4 }}>
                {fmtDate(item.created_at)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── History view (inside panel) ──────────────────────────────────────────────
function HistoryView({ p, onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      // Consultar las 3 fuentes en paralelo
      const [visitsRes, quotesRes, activitiesRes] = await Promise.all([
        // Visitas de campo (sin 'kind' para evitar error si la columna no existe)
        supabase
          .from('visits')
          .select('id, notes, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', p.id)
          .order('created_at', { ascending: false })
          .limit(100),

        // Cotizaciones del prospecto
        supabase
          .from('quotes')
          .select('id, status, total, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', p.id)
          .order('created_at', { ascending: false })
          .limit(50),

        // Eventos CRM (activities)
        supabase
          .from('activities')
          .select('id, kind, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', p.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (cancelled) return

      const merged = []

      // Visitas → kind siempre 'visit'
      for (const v of visitsRes.data || []) {
        merged.push({
          id:         v.id,
          kind:       'visit',
          notes:      v.notes || '',
          created_at: v.created_at,
          seller:     v.seller,
        })
      }

      // Cotizaciones → kind según status
      for (const q of quotesRes.data || []) {
        const kind  = q.status === 'approved' ? 'win' : 'quote'
        const monto = q.total > 0
          ? ` · $${q.total >= 1000 ? (q.total / 1000).toFixed(0) + 'k' : q.total}`
          : ''
        merged.push({
          id:         q.id,
          kind,
          notes:      `${q.status === 'approved' ? 'Cotización aprobada' : 'Cotización enviada'}${monto}`,
          created_at: q.created_at,
          seller:     q.seller,
        })
      }

      // Activities (CRM events)
      for (const a of activitiesRes.data || []) {
        merged.push({
          id:         a.id,
          kind:       a.kind || 'visit',
          notes:      '',
          created_at: a.created_at,
          seller:     a.seller,
        })
      }

      // Ordenar por fecha descendente
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setItems(merged)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [p.id])

  return (
    <>
      {/* Header */}
      <div className="prv-panel__head" style={{ justifyContent: 'flex-start' }}>
        <IconButton icon="arrow-left" label="Volver" variant="soft" onClick={onBack} style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k-h3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div className="k-dim" style={{ fontSize: 12 }}>Historial de actividades</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 16px 16px' }}>
        {loading ? (
          <TimelineSkeleton rows={3} />
        ) : items.length === 0 ? (
          <Empty icon="clock">
            Sin actividades registradas
            <div className="k-dim" style={{ fontSize: 13, marginTop: 4 }}>Las visitas, llamadas y mensajes aparecerán aquí</div>
          </Empty>
        ) : (
          <Timeline items={items} />
        )}
      </div>
    </>
  )
}

// ─── Contact history hook (inline) ───────────────────────────────────────────
function useContactHistory(prospectId) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [visitsRes, quotesRes, activitiesRes] = await Promise.all([
        supabase
          .from('visits')
          .select('id, notes, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('quotes')
          .select('id, status, total, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('activities')
          .select('id, kind, notes, created_at, seller:profiles(full_name, initials, avatar_color)')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (cancelled) return

      const merged = []
      for (const v of visitsRes.data || []) {
        merged.push({ id: v.id, kind: 'visit', notes: v.notes || '', created_at: v.created_at, seller: v.seller })
      }
      for (const q of quotesRes.data || []) {
        const kind  = q.status === 'approved' ? 'win' : 'quote'
        const monto = q.total > 0 ? ` · $${q.total >= 1000 ? (q.total / 1000).toFixed(0) + 'k' : q.total}` : ''
        merged.push({
          id: q.id, kind,
          notes: `${q.status === 'approved' ? 'Cotización aprobada' : 'Cotización enviada'}${monto}`,
          created_at: q.created_at, seller: q.seller,
        })
      }
      for (const a of activitiesRes.data || []) {
        merged.push({ id: a.id, kind: a.kind || 'visit', notes: a.notes || '', created_at: a.created_at, seller: a.seller })
      }
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setItems(merged)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [prospectId])

  return { items, loading }
}

// ─── Inline contact history section ──────────────────────────────────────────
function ContactHistorySection({ prospectId }) {
  const { items, loading } = useContactHistory(prospectId)

  return (
    <div style={{ marginTop: 4 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="history" size={16} color="var(--fg-tertiary)" />
        <span className="k-label" style={{ marginBottom: 0 }}>Historial de contactos</span>
        {!loading && items.length > 0 && <Pill>{items.length}</Pill>}
      </div>

      {loading ? (
        <TimelineSkeleton rows={2} />
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="k-muted" style={{ fontSize: 14 }}>Sin contactos registrados</div>
          <div className="k-dim" style={{ fontSize: 12, marginTop: 4 }}>Las visitas, llamadas y mensajes aparecerán aquí</div>
        </div>
      ) : (
        <Timeline items={items} />
      )}
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ p, stageById, sellers = [], onClose, onDelete }) {
  const stage = stageById[p.stage] || {}
  const seller = sellers.find(s => s.init === p.owner)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { setConfirming(false) }, [p.id])

  return (
    <div className="prv-panel">
      {/* Header */}
      <div className="prv-panel__head">
        <Pill>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color || 'var(--fg-tertiary)' }} />
          {stage.label || p.stage}
        </Pill>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} style={{ width: 40, height: 40 }} />
      </div>

      {/* Scrollable info */}
      <div style={{ flex: 1, padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0 }}>
        <div>
          <div className="k-h2">{p.name}</div>
          <div className="k-muted" style={{ fontSize: 14, marginTop: 2 }}>{p.contact}</div>
          <div style={{ marginTop: 10 }}>
            <Pill tone={HEALTH_TONE[p.health] || 'success'}>{HEALTH_LABEL[p.health] || 'Al día'}</Pill>
          </div>
        </div>

        <Card tone="lilac" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Valor estimado</div>
          <div className="k-num" style={{ fontSize: 26 }}>{fmt(p.value)}</div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px 12px' }}>
          {[
            { label: 'Teléfono',        value: p.phone },
            { label: 'Visitas',         value: `${p.visits} registradas` },
            { label: 'Días en etapa',   value: `${p.days} días` },
            { label: 'Último contacto', value: p.last },
            { label: 'Vendedor',        value: seller?.name || p.owner_name || p.owner },
            ...(p.city    ? [{ label: 'Ciudad',    value: p.city }]    : []),
            ...(p.address ? [{ label: 'Dirección', value: p.address, wide: true }] : []),
            ...(p.notes   ? [{ label: 'Notas',     value: p.notes, wide: true }]   : []),
          ].map(row => (
            <div key={row.label} style={row.wide ? { gridColumn: '1 / -1' } : undefined}>
              <div className="k-dim" style={{ fontSize: 12, marginBottom: 2 }}>{row.label}</div>
              <div style={{ fontSize: 14, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 2 }} />

        {/* Inline contact history */}
        <ContactHistorySection prospectId={p.id} />
      </div>

      {/* Fixed footer */}
      <div className="prv-panel__foot" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a
          className="k-btn k-btn--accent k-btn--block"
          href={`https://wa.me/52${(p.phone || '').replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
        >
          <Icon name="brand-whatsapp" size={18} />
          WhatsApp
        </a>

        {/* Delete */}
        {confirming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="k-muted" style={{ fontSize: 14, textAlign: 'center' }}>
              ¿Eliminar <b style={{ color: 'var(--fg)' }}>{p.name}</b>?<br />
              <span style={{ color: 'var(--coral-fg)' }}>Esta acción no se puede deshacer.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="soft" onClick={() => setConfirming(false)} style={{ flex: 1 }}>Cancelar</Button>
              <Button variant="danger" onClick={() => { onDelete(p.id); onClose() }} style={{ flex: 1 }}>Eliminar</Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" block icon="trash" onClick={() => setConfirming(true)}>Eliminar prospecto</Button>
        )}
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
// <div> y no <label>: el campo de vendedor contiene botones y un label los activaría
function Field({ label, children, error }) {
  return (
    <div className="k-field">
      <div className="k-field__label">{label}</div>
      {children}
      {error && (
        <div className="k-field__error" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="alert-circle" size={14} />
          {error}
        </div>
      )}
    </div>
  )
}

const errorRing = { boxShadow: 'inset 0 0 0 2px var(--coral)' }

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ProspectsView() {
  const { stages, stageById } = useStages()
  const { prospects, loading: loadingProspects, reload } = useAdminProspects()
  const { sellers }  = useSellers()
  const [search,      setSearch]      = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [showNew,     setShowNew]     = useState(false)
  const [containerW,  setContainerW]  = useState(9999)
  const containerRef = useRef(null)

  // Medir el ancho REAL del contenedor (descuenta el sidebar, etc.)
  // así el breakpoint es independiente del ancho del viewport
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Panel lateral a partir de 1000px de espacio real disponible
  const isNarrow   = containerW < 1000

  // Ancho real de la tabla según si el panel está abierto en modo lateral
  const panelVisible = !isNarrow && (showNew || !!selected)
  const panelW  = panelVisible ? Math.min(400, Math.max(300, containerW * 0.32)) : 0
  const tableW  = containerW - panelW
  // Ocultar columnas progresivamente para no aplastar la tabla
  const hideSalud  = tableW < 820   // col "Salud"
  const hideUltimo = tableW < 740   // col "Último contacto"
  const hideVisitas= tableW < 660   // col "Visitas"

  const sellerInits = [...new Set(prospects.map(p => p.owner))]
  const [exportFlash, setExportFlash] = useState(false)

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.contact || '').toLowerCase().includes(q)
    const matchS  = stageFilter === 'all' || p.stage === stageFilter
    const matchO  = ownerFilter === 'all' || p.owner === ownerFilter
    return matchQ && matchS && matchO
  })

  function handleExportCSV() {
    const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`
    const headers = ['Empresa', 'Contacto', 'Teléfono', 'Ciudad', 'Etapa', 'Valor', 'Vendedor', 'Visitas', 'Último contacto', 'Salud']
    const rows = filtered.map(p => [
      esc(p.name), esc(p.contact), esc(p.phone || ''), esc(p.city || ''),
      esc(stageById[p.stage]?.label || p.stage),
      p.value,
      esc(sellerName(p.owner)),
      p.visits,
      p.last || '',
      p.health || '',
    ].join(','))
    const csv = '﻿' + [headers.join(','), ...rows].join('\n')
    saveFile(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `prospectos_kiuvo_${new Date().toISOString().slice(0, 10)}.csv`
    )
    setExportFlash(true); setTimeout(() => setExportFlash(false), 2200)
  }

  function handleNewProspect(p) {
    reload()
    setShowNew(false)
    setSelected(p)
  }

  async function handleDelete(id) {
    const { error, count } = await supabase
      .from('prospects')
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error || count === 0) {
      console.warn('[handleDelete]', error?.message ?? 'RLS blocked delete (0 rows)')
      alert('No se pudo eliminar el prospecto. Verifica los permisos en Supabase.')
      return
    }
    reload()
  }

  const sellerName  = init => sellers.find(s => s.init === init)?.name  || init
  const sellerColor = init => sellers.find(s => s.init === init)?.color || '#888'

  // Right panel: new form takes priority over detail
  const rightPanel = showNew
    ? <NewProspectPanel stages={stages} sellers={sellers} onSave={handleNewProspect} onClose={() => setShowNew(false)} />
    : selected
      ? <DetailPanel p={selected} stageById={stageById} sellers={sellers} onClose={() => setSelected(null)} onDelete={handleDelete} />
      : null

  const panelOpen = showNew || !!selected

  return (
    <div ref={containerRef} style={{ display: 'flex', flex: 1, width: 0, minWidth: 0, height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
      <style>{LAYOUT_CSS}</style>
      {/* ── Overlay backdrop for narrow screens ── */}
      {isNarrow && panelOpen && (
        <div
          onClick={() => { setSelected(null); setShowNew(false) }}
          style={{
            position: 'absolute', inset: 0, zIndex: 9,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* ── Main list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Filters bar */}
        <div className="prv-toolbar">

          {/* Acciones primarias — siempre visibles */}
          <Button size="sm" icon="plus" onClick={() => { setShowNew(true); setSelected(null) }}>
            Nuevo prospecto
          </Button>

          <Button
            size="sm"
            variant="soft"
            icon={exportFlash ? 'check' : 'download'}
            onClick={handleExportCSV}
            title="Exportar prospectos filtrados a CSV"
            style={exportFlash
              ? { background: 'var(--success-bg)', color: 'var(--success-fg)' }
              : { background: 'var(--surface)' }}
          >
            {exportFlash ? 'Descargado' : 'CSV'}
          </Button>

          {/* Search */}
          <SearchInput
            small
            value={search}
            onChange={setSearch}
            placeholder="Buscar empresa o contacto…"
            style={{ flex: '1 1 200px', maxWidth: 320 }}
          />

          {/* Stage pills */}
          <Segmented
            surface
            value={stageFilter}
            onChange={setStageFilter}
            options={['all', ...stages.map(s => s.id)].map(sid => ({
              id: sid,
              label: sid === 'all' ? 'Todas' : stageById[sid]?.label || sid,
            }))}
          />

          {/* Owner filter */}
          <select
            className="k-input k-input--sm k-input--pill"
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            style={{ width: 'auto', maxWidth: '100%' }}
          >
            <option value="all">Todos los vendedores</option>
            {sellerInits.map(s => <option key={s} value={s}>{sellerName(s)}</option>)}
          </select>

          <div className="k-dim" style={{ flexShrink: 0, fontSize: 13, whiteSpace: 'nowrap' }}>
            {filtered.length} prospectos
          </div>
        </div>

        {/* Table */}
        <div className="prv-tablewrap">
          <Card flush style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <table className="k-table k-table--click prv-table">
              <thead>
                <tr>
                  {['Empresa / Contacto', 'Etapa', 'Valor', 'Visitas', 'Vendedor', 'Último contacto', 'Salud', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 0 ? 'left' : 'center',
                      display:
                        (i === 6 && hideSalud)  ? 'none' :
                        (i === 5 && hideUltimo) ? 'none' :
                        (i === 3 && hideVisitas) ? 'none' : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const stage = stageById[p.stage] || {}
                  return (
                    <tr
                      key={p.id}
                      aria-selected={selected?.id === p.id}
                      onClick={() => { setSelected(selected?.id === p.id ? null : p); setShowNew(false) }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{p.name}</div>
                        <div className="k-dim" style={{ fontSize: 12, marginTop: 1 }}>{p.contact} · {p.phone}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Pill>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color || 'var(--fg-tertiary)' }} />
                          {stage.label || p.stage}
                        </Pill>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="k-num" style={{ fontSize: 15 }}>{fmt(p.value)}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', display: hideVisitas ? 'none' : undefined }}>
                        {p.visits}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Avatar size="sm" initials={p.owner} color={sellerColor(p.owner)} />
                      </td>
                      <td className="k-muted" style={{ textAlign: 'center', fontSize: 13, display: hideUltimo ? 'none' : undefined }}>
                        {p.last}
                      </td>
                      <td style={{ textAlign: 'center', display: hideSalud ? 'none' : undefined }}>
                        <Pill tone={HEALTH_TONE[p.health]}>{HEALTH_LABEL[p.health] || '—'}</Pill>
                      </td>
                      <td style={{ textAlign: 'center', paddingLeft: 4, paddingRight: 12 }}>
                        <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!loadingProspects && filtered.length === 0 && <Empty icon="users">Sin prospectos con estos filtros</Empty>}
          </Card>
        </div>
      </div>

      {/* ── Right panel (new form or detail) ── */}
      {rightPanel && (
        <div style={isNarrow ? {
          position: 'absolute', top: 8, right: 8, bottom: 8, zIndex: 10,
          width: Math.min(400, containerW - 16),
          boxShadow: 'var(--shadow-float)', borderRadius: 'var(--r-xl)',
          display: 'flex', flexDirection: 'column',
        } : {
          // 32% del contenedor real, entre 300px y 400px
          width: Math.min(400, Math.max(300, containerW * 0.32)),
          flexShrink: 0, padding: '14px 20px 20px 0', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column',
        }}>
          {rightPanel}
        </div>
      )}
    </div>
  )
}
