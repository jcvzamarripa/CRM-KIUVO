import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import QuoteModal from './QuoteModal'
import ProductionOrderModal from './ProductionOrderModal'

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX')
const healthColor = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }

function fmtLast(ts) {
  if (!ts) return 'Sin contacto'
  const diff = Math.floor((Date.now() - new Date(ts)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7)  return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} sem.`
  return `Hace ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? 'es' : ''}`
}

function normalize(row, visitCounts = {}) {
  return {
    ...row,
    stage: row.stage_id,
    visits: visitCounts[row.id] ?? 0,
    days: row.days_in_stage ?? 0,
    last: fmtLast(row.last_contact_at),
    notes: row.notes || '',
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '55%', height: 13, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        <div style={{ width: '22%', height: 13, borderRadius: 4, background: 'var(--bg-secondary)' }} />
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-secondary)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '40%', height: 11, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        <div style={{ width: '25%', height: 11, borderRadius: 4, background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  )
}

// ─── AddProspectModal ─────────────────────────────────────────────────────────
function AddProspectModal({ stage, onClose, onSave }) {
  const [name,    setName]    = useState('')
  const [contact, setContact] = useState('')
  const [phone,   setPhone]   = useState('')
  const [value,   setValue]   = useState('')
  const [notes,   setNotes]   = useState('')

  function handleSave() {
    onSave({
      name:    name.trim()    || 'Sin nombre',
      contact: contact.trim(),
      phone:   phone.trim(),
      value,
      notes:   notes.trim(),
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--fg)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0,
            background: stage.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="user-plus" size={17} color={stage.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Nuevo prospecto</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>
              Etapa: <span style={{ color: stage.color, fontWeight: 500 }}>{stage.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '14px 0 0' }} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Empresa</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Nombre de la empresa"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Persona de contacto</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nombre del responsable" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 dígitos" type="tel" inputMode="numeric" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Valor estimado ($)</label>
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="0" type="text" inputMode="numeric" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notas <span style={{ fontWeight: 400, opacity: 0.7 }}>(opcional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones, interés del cliente, contexto…"
              rows={3}
              style={{ ...inputStyle, resize: 'none', verticalAlign: 'top', lineHeight: 1.45 }}
            />
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r-md)',
            background: stage.color + '12', border: `0.5px solid ${stage.color}30`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
              Se añadirá a <b style={{ color: stage.color }}>{stage.label}</b>.
              Mínimo requerido: {stage.min} visita{stage.min > 1 ? 's' : ''}.
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 28px', display: 'flex', gap: 10, borderTop: '0.5px solid var(--border)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--fg)', fontSize: 14, fontWeight: 500,
          }}>Cancelar</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '12px 0', borderRadius: 'var(--r-md)',
            background: stage.color, color: '#fff', fontSize: 14, fontWeight: 500,
          }}>Guardar prospecto</button>
        </div>
      </div>
    </div>
  )
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────
function ActionSheet({ prospect, onClose, onMoveStage, onDelete, onSaveNotes }) {
  const [confirming,   setConfirming]   = useState(false)
  const [localNotes,   setLocalNotes]   = useState(prospect.notes || '')
  const [notesDirty,   setNotesDirty]   = useState(false)
  const [savingNotes,  setSavingNotes]  = useState(false)

  async function saveNotes() {
    setSavingNotes(true)
    await onSaveNotes(prospect.id, localNotes)
    setSavingNotes(false)
    setNotesDirty(false)
  }

  const textareaStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)',
    border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    resize: 'none', lineHeight: 1.45, fontFamily: 'inherit',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Prospect name */}
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg)', padding: '8px 16px 12px', flexShrink: 0 }}>
          {prospect.name}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px' }}>

          {/* ── Notes ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
              NOTAS
            </div>
            <textarea
              value={localNotes}
              onChange={e => { setLocalNotes(e.target.value); setNotesDirty(true) }}
              placeholder="Agrega observaciones, acuerdos, contexto del cliente…"
              rows={3}
              style={textareaStyle}
            />
            {notesDirty && (
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                style={{
                  marginTop: 8, width: '100%', padding: '9px',
                  background: 'var(--kiuvo-blue)', color: '#fff',
                  borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
                  opacity: savingNotes ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Icon name={savingNotes ? 'loader' : 'device-floppy'} size={14}
                  style={savingNotes ? { animation: 'spin 0.7s linear infinite' } : {}} />
                {savingNotes ? 'Guardando…' : 'Guardar nota'}
              </button>
            )}
          </div>

          {/* ── Move stage ── */}
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
            MOVER A ETAPA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {STAGES.filter(s => s.id !== prospect.stage_id).map(s => (
              <button
                key={s.id}
                onClick={() => { onMoveStage(prospect.id, s.id); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  border: '0.5px solid var(--border)', background: 'var(--surface)',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--fg)' }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* ── Delete ── */}
          {confirming ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', padding: '2px 0 6px' }}>
                ¿Eliminar <b style={{ color: 'var(--fg)' }}>{prospect.name}</b>? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirming(false)} style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--r-md)',
                  border: '0.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--fg)', fontSize: 14,
                }}>Cancelar</button>
                <button onClick={() => { onDelete(prospect.id); onClose() }} style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--r-md)',
                  background: 'var(--danger)', color: '#fff', fontSize: 14, fontWeight: 500,
                }}>Eliminar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} style={{
              width: '100%', padding: '12px',
              border: '0.5px solid var(--danger-border)', background: 'var(--danger-bg)',
              color: 'var(--danger-fg)', borderRadius: 'var(--r-md)',
              fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="trash" size={15} color="var(--danger-fg)" />
              Eliminar prospecto
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ─── ProspectCard ─────────────────────────────────────────────────────────────
function ProspectCard({ p, onAction, onAdvance, onODP }) {
  const stageIdx  = STAGES.findIndex(s => s.id === p.stage)
  const stage     = STAGE_BY_ID[p.stage] ?? STAGES[0]
  const nextStage = STAGES[stageIdx + 1] ?? null
  const visitPct  = Math.min(1, p.visits / Math.max(stage.min, 1))
  const hc        = healthColor[p.health] || 'var(--fg-tertiary)'

  const cardBg     = p.health === 'red'   ? 'var(--danger-bg)'
                   : p.health === 'amber'  ? 'var(--warning-bg)'
                   : 'var(--surface)'
  const cardBorder = p.health === 'red'   ? 'var(--danger-border)'
                   : p.health === 'amber'  ? 'var(--warning-border)'
                   : 'var(--border)'

  return (
    <div style={{
      background: cardBg, border: `0.5px solid ${cardBorder}`,
      borderRadius: 'var(--r-md)', padding: '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
      opacity: p._optimistic ? 0.55 : 1,
      transition: 'background 0.2s, border-color 0.2s, opacity 0.25s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: hc, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.name}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(p.value)}
          </div>
          {!p._optimistic && (
            <button
              onClick={() => onAction(p)}
              style={{
                width: 24, height: 24, borderRadius: 'var(--r-sm)',
                background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fg-tertiary)',
              }}
            >
              <Icon name="dots" size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-secondary)' }}>
            <Icon name="map-pin" size={11} />
            <span><b style={{ fontWeight: 500, color: 'var(--fg)' }}>{p.visits}</b>/{stage.min} visitas</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.days} días en etapa</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          <div style={{ width: `${visitPct * 100}%`, height: '100%', background: stage.color, borderRadius: 2 }} />
        </div>
      </div>

      {p.notes ? (
        <div style={{
          fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.35,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>
          <Icon name="file-text" size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {p.notes}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.last}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => p.phone && window.open(`https://wa.me/52${p.phone.replace(/\D/g, '')}`, '_blank')}
            style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="brand-whatsapp" size={13} />
          </button>
          <button
            onClick={() => p.phone && (window.location.href = `tel:${p.phone}`)}
            style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={13} />
          </button>
          {nextStage && !p._optimistic ? (
            <button
              onClick={() => onAdvance(p.id, nextStage.id)}
              title={`Avanzar a ${nextStage.label}`}
              style={{
                height: 24, padding: '0 7px', borderRadius: 'var(--r-sm)',
                background: nextStage.color + '18',
                border: `0.5px solid ${nextStage.color}55`,
                color: nextStage.color,
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 600,
              }}>
              <Icon name="arrow-right" size={12} color={nextStage.color} />
              {nextStage.label}
            </button>
          ) : !nextStage && !p._optimistic ? (
            <button
              onClick={() => onODP(p)}
              title="Generar orden de producción"
              style={{
                height: 24, padding: '0 7px', borderRadius: 'var(--r-sm)',
                background: '#E1F5EE',
                border: '0.5px solid #1D9E7566',
                color: '#1D9E75',
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700,
              }}>
              <Icon name="clipboard-list" size={12} color="#1D9E75" />
              ODP
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
export default function Kanban({ jumpTo, onOpenNotifications, unreadCount = 0 }) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [activeStage,   setActiveStage]   = useState('presentacion')
  const [prospects,     setProspects]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState(false)
  const [showAdd,       setShowAdd]       = useState(false)
  const [showQuote,     setShowQuote]     = useState(false)
  const [odpProspect,   setOdpProspect]   = useState(null)
  const [actionTarget,  setActionTarget]  = useState(null)
  const [sortMode,      setSortMode]      = useState('value')

  // ── Load ──────────────────────────────────────────────────────────
  const loadProspects = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    const [{ data: rows, error: pErr }, { data: visits }] = await Promise.all([
      supabase
        .from('prospects')
        .select('id, name, company, phone, email, stage_id, value, health, days_in_stage, last_contact_at, notes')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('visits')
        .select('prospect_id')
        .eq('seller_id', user.id),
    ])

    if (pErr) {
      setLoadError(true)
      setLoading(false)
      addToast({ message: 'Error al cargar prospectos. Verifica tu conexión.', kind: 'error' })
      return
    }

    const counts = {}
    visits?.forEach(v => { counts[v.prospect_id] = (counts[v.prospect_id] ?? 0) + 1 })

    setProspects((rows ?? []).map(r => normalize(r, counts)))
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadProspects() }, [loadProspects])
  useEffect(() => { if (jumpTo?.stage) setActiveStage(jumpTo.stage) }, [jumpTo])

  // ── Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`kanban-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prospects',
        filter: `owner_id=eq.${user.id}`,
      }, ({ eventType, new: row, old: oldRow }) => {
        if (eventType === 'INSERT') {
          setProspects(prev =>
            prev.some(p => p.id === row.id) ? prev : [normalize(row), ...prev]
          )
        } else if (eventType === 'UPDATE') {
          setProspects(prev => prev.map(p =>
            p.id === row.id ? { ...normalize(row), visits: p.visits } : p
          ))
        } else if (eventType === 'DELETE') {
          setProspects(prev => prev.filter(p => p.id !== oldRow.id))
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visits',
        filter: `seller_id=eq.${user.id}`,
      }, ({ new: row }) => {
        setProspects(prev => prev.map(p =>
          p.id === row.prospect_id
            ? { ...p, visits: p.visits + 1, last: 'Hoy' }
            : p
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user.id])

  // ── Derived ───────────────────────────────────────────────────────
  const stage      = STAGE_BY_ID[activeStage] ?? STAGES[0]
  const counts     = Object.fromEntries(STAGES.map(s => [s.id, prospects.filter(p => p.stage === s.id).length]))
  const totalAll   = prospects.length
  const totalPot   = prospects.reduce((s, p) => s + (p.value ?? 0), 0)
  const rawList    = prospects.filter(p => p.stage === activeStage)
  const list       = [...rawList].sort((a, b) => sortMode === 'value' ? (b.value ?? 0) - (a.value ?? 0) : (b.days ?? 0) - (a.days ?? 0))
  const totalValue = rawList.reduce((s, p) => s + (p.value ?? 0), 0)

  // ── Create ────────────────────────────────────────────────────────
  async function handleAddProspect({ name, contact, phone, value, notes }) {
    const tempId = `temp-${Date.now()}`
    const parsed = parseInt(value.replace(/\D/g, ''), 10) || 0

    const noteParts = []
    if (contact) noteParts.push('Contacto: ' + contact)
    if (notes)   noteParts.push(notes)
    const finalNotes = noteParts.length ? noteParts.join('\n') : null

    const temp   = normalize({
      id: tempId, name, company: name, phone: phone || null, email: null,
      stage_id: activeStage, value: parsed, health: 'green',
      days_in_stage: 0, last_contact_at: null, notes: finalNotes || '',
    })
    temp._optimistic = true

    setProspects(prev => [temp, ...prev])

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name,
        company: name,
        phone: phone || null,
        owner_id: user.id,
        stage_id: activeStage,
        value: parsed,
        notes: finalNotes,
        health: 'green',
      })
      .select('id, name, company, phone, email, stage_id, value, health, days_in_stage, last_contact_at, notes')
      .single()

    if (error) {
      setProspects(prev => prev.filter(p => p.id !== tempId))
      addToast({ message: 'No se pudo crear el prospecto. Intenta de nuevo.', kind: 'error' })
      return
    }

    setProspects(prev => prev.map(p => p.id === tempId ? normalize(data) : p))
  }

  // ── Update stage ──────────────────────────────────────────────────
  async function handleMoveStage(prospectId, newStageId) {
    const old = prospects.find(p => p.id === prospectId)
    if (!old) return

    setProspects(ps => ps.map(p =>
      p.id === prospectId ? { ...p, stage_id: newStageId, stage: newStageId } : p
    ))

    const { error } = await supabase
      .from('prospects')
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq('id', prospectId)

    if (error) {
      setProspects(ps => ps.map(p =>
        p.id === prospectId ? { ...p, stage_id: old.stage_id, stage: old.stage_id } : p
      ))
      addToast({ message: 'No se pudo mover el prospecto. Cambio revertido.', kind: 'warning' })
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  async function handleDelete(prospectId) {
    const backup = prospects.find(p => p.id === prospectId)
    setProspects(prev => prev.filter(p => p.id !== prospectId))

    const { error } = await supabase.from('prospects').delete().eq('id', prospectId)

    if (error) {
      setProspects(prev => backup ? [backup, ...prev] : prev)
      addToast({ message: 'No se pudo eliminar el prospecto. Intenta de nuevo.', kind: 'error' })
    }
  }

  // ── Save notes ────────────────────────────────────────────────────
  async function handleSaveNotes(prospectId, notes) {
    // Optimistic update in list and action sheet
    setProspects(ps => ps.map(p => p.id === prospectId ? { ...p, notes } : p))
    setActionTarget(at => at?.id === prospectId ? { ...at, notes } : at)

    const { error } = await supabase
      .from('prospects')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', prospectId)

    if (error) {
      addToast({ message: 'No se pudo guardar la nota. Intenta de nuevo.', kind: 'error' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 92, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.015 }}>Mi embudo</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
            {loading ? '…' : `${totalAll} prospectos · ${fmt(totalPot)} potencial`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onOpenNotifications}
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" size={17} color="var(--fg-secondary)" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', border: '1.5px solid var(--surface)' }} />
            )}
          </button>
          <button
            onClick={() => setSortMode(m => m === 'value' ? 'risk' : 'value')}
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: `0.5px solid ${sortMode === 'risk' ? 'var(--warning)' : 'var(--border)'}`, background: sortMode === 'risk' ? 'var(--warning-bg)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={sortMode === 'risk' ? 'alert-triangle' : 'arrows-sort'} size={17} color={sortMode === 'risk' ? 'var(--warning)' : 'var(--fg-secondary)'} />
          </button>
        </div>
      </div>

      {/* Stage pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
        {STAGES.map(s => {
          const on = s.id === activeStage
          return (
            <button key={s.id} onClick={() => setActiveStage(s.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--r-full)',
              border: '0.5px solid', borderColor: on ? s.color : 'var(--border)',
              background: on ? s.color : 'var(--surface)',
              color: on ? '#fff' : 'var(--fg)',
              fontSize: 12, fontWeight: 500, flexShrink: 0, scrollSnapAlign: 'start',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? '#fff' : s.color }} />
              {s.label}
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '0 5px', borderRadius: 'var(--r-full)',
                background: on ? 'rgba(255,255,255,0.22)' : 'var(--bg-secondary)',
                color: on ? '#fff' : 'var(--fg-secondary)',
              }}>
                {loading ? '·' : counts[s.id]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Column summary */}
      <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: stage.color + '14', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: stage.color }}>{stage.label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
            Mínimo {stage.min} visita{stage.min > 1 ? 's' : ''} · {fmt(totalValue)} potencial
          </div>
        </div>
        <button
          onClick={() => activeStage === 'cotizacion' ? setShowQuote(true) : setShowAdd(true)}
          style={{
            padding: '6px 10px', borderRadius: 'var(--r-md)',
            background: stage.color, color: '#fff', fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <Icon name={activeStage === 'cotizacion' ? 'receipt' : 'plus'} size={13} />
          {activeStage === 'cotizacion' ? 'Cotizar' : 'Añadir'}
        </button>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : loadError ? (
          <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Icon name="wifi-off" size={28} color="var(--fg-tertiary)" />
            <div style={{ fontSize: 13, color: 'var(--fg-tertiary)' }}>No se pudo cargar</div>
            <button onClick={loadProspects} style={{
              padding: '8px 16px', borderRadius: 'var(--r-md)',
              background: 'var(--kiuvo-blue)', color: '#fff', fontSize: 13,
            }}>Reintentar</button>
          </div>
        ) : list.length === 0 ? (
          <div style={{
            padding: '40px 0', textAlign: 'center', color: 'var(--fg-tertiary)',
            border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--r-lg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <Icon name="layout-kanban" size={28} />
            <div style={{ fontSize: 13 }}>Sin prospectos en esta etapa</div>
            <button
              onClick={() => activeStage === 'cotizacion' ? setShowQuote(true) : setShowAdd(true)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--r-md)',
                background: stage.color, color: '#fff', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
              }}>
              <Icon name={activeStage === 'cotizacion' ? 'receipt' : 'plus'} size={13} />
              {activeStage === 'cotizacion' ? 'Nueva cotización' : 'Añadir el primero'}
            </button>
          </div>
        ) : (
          list.map(p => <ProspectCard key={p.id} p={p} onAction={setActionTarget} onAdvance={handleMoveStage} onODP={setOdpProspect} />)
        )}
      </div>

      {!loading && !loadError && (
        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center', color: 'var(--fg-tertiary)' }}>
          <Icon name="arrows-horizontal" size={12} />
          <span style={{ fontSize: 11 }}>Desliza pills para cambiar etapa</span>
        </div>
      )}

      {showAdd && (
        <AddProspectModal
          stage={stage}
          onClose={() => setShowAdd(false)}
          onSave={handleAddProspect}
        />
      )}

      {showQuote && (
        <QuoteModal
          onClose={() => setShowQuote(false)}
          onGenerated={loadProspects}
        />
      )}

      {odpProspect && (
        <ProductionOrderModal
          prospect={odpProspect}
          onClose={() => setOdpProspect(null)}
          onCreated={() => setOdpProspect(null)}
        />
      )}

      {actionTarget && (
        <ActionSheet
          prospect={actionTarget}
          onClose={() => setActionTarget(null)}
          onMoveStage={handleMoveStage}
          onDelete={handleDelete}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  )
}
