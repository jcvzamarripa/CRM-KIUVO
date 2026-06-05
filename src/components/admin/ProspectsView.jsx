import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useStages } from '../../contexts/StagesContext'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useSellers } from '../../hooks/useSellers'
import { rules, collectErrors } from '../../lib/validation'
import { supabase } from '../../lib/supabase'

const HEALTH_COLOR = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)', black: 'var(--fg-tertiary)' }
const fmt = n => '$' + n.toLocaleString('es-MX')

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
    <div style={{
      width: '100%', flex: 1, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease', overflow: 'hidden',
    }}>
      <style>{`@keyframes slideInRight { from { transform:translateX(24px); opacity:0 } to { transform:translateX(0); opacity:1 } }`}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Nuevo prospecto</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>Registro manual</div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Empresa */}
        <Field label="Empresa *" error={errors.name}>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Nombre de la empresa"
            autoFocus
            style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)' }}
          />
        </Field>

        {/* Contacto */}
        <Field label="Contacto *" error={errors.contact}>
          <input
            value={form.contact}
            onChange={e => set('contact', e.target.value)}
            placeholder="Nombre del contacto"
            style={{ ...inputStyle, borderColor: errors.contact ? 'var(--danger)' : 'var(--border)' }}
          />
        </Field>

        {/* Phone + City row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Field label="Teléfono" error={errors.phone}>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="55 1234 5678"
              type="tel"
              inputMode="tel"
              style={{ ...inputStyle, borderColor: errors.phone ? 'var(--danger)' : 'var(--border)' }}
            />
          </Field>
          <Field label="Ciudad">
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Ciudad de México"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Valor estimado */}
        <Field label="Valor estimado (MXN)" error={errors.value}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--fg-tertiary)',
            }}>$</span>
            <input
              value={form.value}
              onChange={e => set('value', e.target.value)}
              placeholder="0"
              inputMode="numeric"
              style={{ ...inputStyle, paddingLeft: 22, borderColor: errors.value ? 'var(--danger)' : 'var(--border)' }}
            />
          </div>
        </Field>

        {/* Etapa */}
        <Field label="Etapa inicial">
          <select
            value={form.stage}
            onChange={e => set('stage', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>

        {/* Vendedor */}
        <Field label="Vendedor asignado">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sellers.map(s => {
              const active = form.owner === s.init
              return (
                <button
                  key={s.init}
                  onClick={() => set('owner', s.init)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 'var(--r-full)',
                    background: active ? s.color : 'var(--bg)',
                    color: active ? '#fff' : 'var(--fg-secondary)',
                    border: `1.5px solid ${active ? s.color : 'var(--border)'}`,
                    fontSize: 12, fontWeight: active ? 500 : 400,
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: active ? 'rgba(255,255,255,0.3)' : s.color + '22',
                    color: active ? '#fff' : s.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                  }}>{s.init}</span>
                  {s.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </Field>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 20px', borderTop: '0.5px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--fg)', fontSize: 13, fontWeight: 500,
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 'var(--r-md)',
            background: canSave ? 'var(--kiuvo-blue)' : 'var(--bg-tertiary)',
            color: canSave ? '#fff' : 'var(--fg-tertiary)',
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'background 0.15s',
          }}
        >
          <Icon name="user-plus" size={15} color={canSave ? '#fff' : 'var(--fg-tertiary)'} />
          Dar de alta
        </button>
      </div>
    </div>
  )
}

// ─── Kind config for history timeline ─────────────────────────────────────────
const KIND_CFG = {
  visit:    { icon: 'map-pin',        color: '#185FA5', label: 'Visita' },
  call:     { icon: 'phone',          color: '#7C3AED', label: 'Llamada' },
  whatsapp: { icon: 'brand-whatsapp', color: '#25D366', label: 'WhatsApp' },
  quote:    { icon: 'file-text',      color: '#EF9F27', label: 'Cotización' },
  win:      { icon: 'trophy',         color: '#1D9E75', label: 'Cierre' },
  stage:    { icon: 'arrow-right',    color: '#1D9E75', label: 'Etapa' },
  add:      { icon: 'user-plus',      color: '#185FA5', label: 'Alta' },
  new:      { icon: 'user-plus',      color: '#185FA5', label: 'Alta' },
  msg:      { icon: 'message',        color: '#7C3AED', label: 'Mensaje' },
  email:    { icon: 'mail',           color: '#7C3AED', label: 'Email' },
}
const kindCfg = k => KIND_CFG[k] || { icon: 'activity', color: '#888', label: k || 'Actividad' }

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
      const { data } = await supabase
        .from('visits')
        .select('id, kind, notes, created_at, seller:profiles(full_name, initials, avatar_color)')
        .eq('prospect_id', p.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!cancelled) {
        setItems(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [p.id])

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center' }}>
          <Icon name="arrow-left" size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>Historial de actividades</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 18px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 4 }}>
                  <div style={{ height: 10, width: '60%', background: 'var(--border)', borderRadius: 4 }} />
                  <div style={{ height: 8, width: '80%', background: 'var(--border)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--fg-tertiary)' }}>
            <Icon name="clock" size={32} color="var(--border)" />
            <div style={{ marginTop: 10, fontSize: 13 }}>Sin actividades registradas</div>
            <div style={{ marginTop: 4, fontSize: 11 }}>Las visitas, llamadas y mensajes aparecerán aquí</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map((item, idx) => {
              const cfg = kindCfg(item.kind)
              return (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative' }}>
                  {/* Vertical line */}
                  {idx < items.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 13, top: 28, bottom: -6,
                      width: 2, background: 'var(--border)',
                    }} />
                  )}
                  {/* Icon bubble */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${cfg.color}40`, marginTop: 2,
                  }}>
                    <Icon name={cfg.icon} size={13} color={cfg.color} />
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
                        background: cfg.color + '18', color: cfg.color,
                      }}>{cfg.label}</span>
                      {item.seller?.initials && (
                        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                          {item.seller.full_name || item.seller.initials}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: 12, color: 'var(--fg)', marginTop: 4, lineHeight: 1.45 }}>
                        {item.notes}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 4 }}>
                      {fmtDate(item.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ p, stageById, sellers = [], onClose, onDelete }) {
  const stage = stageById[p.stage] || {}
  const seller = sellers.find(s => s.init === p.owner)
  const [confirming, setConfirming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Reset history when prospect changes
  useEffect(() => { setShowHistory(false); setConfirming(false) }, [p.id])

  return (
    <div style={{
      width: '100%', flex: 1, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease', overflow: 'hidden',
    }}>
      {showHistory ? (
        <HistoryView p={p} onBack={() => setShowHistory(false)} />
      ) : (
        <>
          {/* Header */}
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Detalle</div>
            <button onClick={onClose} style={{ color: 'var(--fg-tertiary)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Scrollable info */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0 }}>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--r-full)',
              background: (stage.color || '#888') + '20', color: stage.color || '#888',
              fontSize: 12, fontWeight: 500, alignSelf: 'flex-start',
            }}>
              {stage.label || p.stage}
            </span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>{p.contact}</div>
            </div>
            {[
              { label: 'Teléfono',        value: p.phone },
              { label: 'Valor estimado',  value: fmt(p.value) },
              { label: 'Visitas',         value: `${p.visits} registradas` },
              { label: 'Días en etapa',   value: `${p.days} días` },
              { label: 'Último contacto', value: p.last },
              { label: 'Vendedor',        value: seller?.name || p.owner_name || p.owner },
              ...(p.city    ? [{ label: 'Ciudad',    value: p.city }]    : []),
              ...(p.address ? [{ label: 'Dirección', value: p.address }] : []),
              ...(p.notes   ? [{ label: 'Notas',     value: p.notes }]   : []),
            ].map(row => (
              <div key={row.label}>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Fixed footer */}
          <div style={{ flexShrink: 0, borderTop: '0.5px solid var(--border)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={`https://wa.me/52${(p.phone || '').replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textDecoration: 'none', boxSizing: 'border-box',
              }}
            >
              <Icon name="brand-whatsapp" size={15} color="#fff" />
              WhatsApp
            </a>
            <button
              onClick={() => setShowHistory(true)}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--fg)', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxSizing: 'border-box',
              }}
            >
              <Icon name="history" size={15} color="var(--fg)" />
              Ver historial
            </button>

            {/* Delete */}
            {confirming ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)', textAlign: 'center' }}>
                  ¿Eliminar <b style={{ color: 'var(--fg)' }}>{p.name}</b>?<br />
                  <span style={{ color: 'var(--danger)' }}>Esta acción no se puede deshacer.</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button onClick={() => { onDelete(p.id); onClose() }} style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--r-md)', background: 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 'var(--r-md)',
                  border: '0.5px solid var(--danger-border)', background: 'var(--danger-bg)',
                  color: 'var(--danger-fg)', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Icon name="trash" size={14} color="var(--danger-fg)" />
                Eliminar prospecto
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 6, letterSpacing: 0.2 }}>
        {label}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--bg)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--r-md)', color: 'var(--fg)', outline: 'none',
  boxSizing: 'border-box',
}

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

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.contact || '').toLowerCase().includes(q)
    const matchS  = stageFilter === 'all' || p.stage === stageFilter
    const matchO  = ownerFilter === 'all' || p.owner === ownerFilter
    return matchQ && matchS && matchO
  })

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
    <div ref={containerRef} style={{ display: 'flex', flex: 1, width: 0, minWidth: 0, height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      {/* ── Overlay backdrop for narrow screens ── */}
      {isNarrow && panelOpen && (
        <div
          onClick={() => { setSelected(null); setShowNew(false) }}
          style={{
            position: 'absolute', inset: 0, zIndex: 9,
            background: 'rgba(0,0,0,0.35)',
          }}
        />
      )}

      {/* ── Main list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Filters bar */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
          overflowX: 'auto',
        }}>

          {/* + Nuevo prospecto */}
          <button
            onClick={() => { setShowNew(true); setSelected(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--kiuvo-blue)', color: '#fff',
              fontSize: 13, fontWeight: 500, flexShrink: 0,
            }}
          >
            <Icon name="plus" size={15} color="#fff" />
            Nuevo prospecto
          </button>

          {/* Separator */}
          <div style={{ width: '0.5px', height: 24, background: 'var(--border)' }} />

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', flex: 1, maxWidth: 260,
          }}>
            <Icon name="search" size={14} color="var(--fg-tertiary)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa o contacto…"
              style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--fg)', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Stage pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', ...stages.map(s => s.id)].map(sid => {
              const s = stageById[sid]
              const on = stageFilter === sid
              return (
                <button key={sid} onClick={() => setStageFilter(sid)} style={{
                  padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12,
                  background: on ? (sid === 'all' ? 'var(--kiuvo-blue)' : s?.color) : 'var(--surface)',
                  color: on ? '#fff' : 'var(--fg-secondary)',
                  border: `0.5px solid ${on ? 'transparent' : 'var(--border)'}`,
                  fontWeight: on ? 500 : 400,
                }}>
                  {sid === 'all' ? 'Todas' : s?.label || sid}
                </button>
              )
            })}
          </div>

          {/* Owner filter */}
          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            style={{
              padding: '6px 10px', background: 'var(--surface)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
              fontSize: 12, color: 'var(--fg)', outline: 'none',
            }}
          >
            <option value="all">Todos los vendedores</option>
            {sellerInits.map(s => <option key={s} value={s}>{sellerName(s)}</option>)}
          </select>

          <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap' }}>
            {filtered.length} prospectos
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Empresa / Contacto', 'Etapa', 'Valor', 'Visitas', 'Vendedor', 'Último contacto', 'Salud', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '9px 14px', textAlign: i === 0 ? 'left' : 'center',
                    fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                    borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
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
                    onClick={() => { setSelected(selected?.id === p.id ? null : p); setShowNew(false) }}
                    style={{
                      cursor: 'pointer',
                      background: selected?.id === p.id ? 'var(--kiuvo-blue-soft)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{p.contact} · {p.phone}</div>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 9px', borderRadius: 'var(--r-full)',
                        background: (stage.color || '#888') + '20', color: stage.color || '#888',
                        fontSize: 11, fontWeight: 500,
                      }}>
                        {stage.label || p.stage}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--fg)' }}>
                      {fmt(p.value)}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', display: hideVisitas ? 'none' : undefined }}>
                      {p.visits}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%',
                        background: sellerColor(p.owner) + '22',
                        color: sellerColor(p.owner),
                        fontSize: 11, fontWeight: 500,
                      }}>
                        {p.owner}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--fg-secondary)', display: hideUltimo ? 'none' : undefined }}>
                      {p.last}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', display: hideSalud ? 'none' : undefined }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: HEALTH_COLOR[p.health],
                      }} />
                    </td>
                    <td style={{ padding: '11px 10px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <Icon name="chevron-right" size={14} color="var(--fg-tertiary)" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right panel (new form or detail) ── */}
      {rightPanel && (
        <div style={isNarrow ? {
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 10,
          width: Math.min(400, containerW * 0.90),
          boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
        } : {
          // 32% del contenedor real, entre 300px y 400px
          width: Math.min(400, Math.max(300, containerW * 0.32)),
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          {rightPanel}
        </div>
      )}
    </div>
  )
}
