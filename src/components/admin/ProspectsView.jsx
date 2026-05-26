import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useStages } from '../../contexts/StagesContext'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useSellers } from '../../hooks/useSellers'
import { rules, collectErrors } from '../../lib/validation'

const HEALTH_COLOR = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)', black: 'var(--fg-tertiary)' }
const fmt = n => '$' + n.toLocaleString('es-MX')

// ─── New Prospect Panel ───────────────────────────────────────────────────────
function NewProspectPanel({ stages, onSave, onClose }) {
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
      width: 400, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease',
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
            {MOCK_SELLERS.map(s => {
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ p, stageById, onClose }) {
  const stage = stageById[p.stage] || {}
  const seller = MOCK_SELLERS.find(s => s.init === p.owner)

  return (
    <div style={{
      width: 300, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease',
    }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Detalle</div>
        <button onClick={onClose} style={{ color: 'var(--fg-tertiary)' }}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* Stage badge */}
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
          { label: 'Vendedor',        value: seller?.name || p.owner },
          ...(p.city ? [{ label: 'Ciudad', value: p.city }] : []),
        ].map(row => (
          <div key={row.label}>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 2 }}>{row.label}</div>
            <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{row.value}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <a
            href={`https://wa.me/52${(p.phone || '').replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            style={{
              flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
              background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              textDecoration: 'none',
            }}
          >
            <Icon name="brand-whatsapp" size={14} color="#fff" />
            WhatsApp
          </a>
          <button style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--fg)', fontSize: 13, fontWeight: 500,
          }}>
            Ver historial
          </button>
        </div>
      </div>
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

  const sellerName  = init => sellers.find(s => s.init === init)?.name  || init
  const sellerColor = init => sellers.find(s => s.init === init)?.color || '#888'

  // Right panel: new form takes priority over detail
  const rightPanel = showNew
    ? <NewProspectPanel stages={stages} onSave={handleNewProspect} onClose={() => setShowNew(false)} />
    : selected
      ? <DetailPanel p={selected} stageById={stageById} onClose={() => setSelected(null)} />
      : null

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* ── Main list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Filters bar */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
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

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-tertiary)' }}>
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
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
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
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--fg-secondary)' }}>
                      {p.last}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
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
      {rightPanel}
    </div>
  )
}
