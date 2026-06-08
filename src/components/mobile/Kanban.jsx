import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import Icon from '../shared/Icon'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { updateQuoteStatus, downloadStoredPDF } from '../../hooks/useQuoteHistory'

// Lazy: evita cargar react-pdf (~1.4 MB) hasta que el usuario abre cotizaciones
const QuoteModal           = lazy(() => import('./QuoteModal'))
const ProductionOrderModal = lazy(() => import('./ProductionOrderModal'))

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
  // Calcular días reales en la etapa actual desde stage_entered_at (columna nueva)
  // Si no existe aún (antes de correr la migración), cae a days_in_stage como fallback
  const enteredAt = row.stage_entered_at ? new Date(row.stage_entered_at) : null
  const days = enteredAt
    ? Math.max(0, Math.floor((Date.now() - enteredAt.getTime()) / 86400000))
    : (row.days_in_stage ?? 0)

  return {
    ...row,
    stage: row.stage_id,
    visits: visitCounts[row.id] ?? 0,
    days,
    last: fmtLast(row.last_contact_at),
    notes: row.notes || '',
    contact: row.contact ||
      row.notes?.match(/^Contacto:\s*(.+?)(\n|$)/m)?.[1]?.trim() || '',
  }
}

const QUOTE_STATUS_LABEL = { sent: 'Propuesta', approved: 'Cotización final', rejected: 'Rechazada', draft: 'Borrador' }
const QUOTE_STATUS_COLOR = { sent: 'var(--kiuvo-blue)', approved: '#1D9E75', rejected: 'var(--danger)', draft: 'var(--fg-tertiary)' }
const QUOTE_STATUS_BG    = { sent: 'var(--kiuvo-blue-soft)', approved: '#E1F5EE', rejected: 'var(--danger-bg)', draft: 'var(--bg-secondary)' }

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
function ActionSheet({ prospect, onClose, onMoveStage, onDelete, onSaveNotes, onUpdateProspect, onNewProposal, isAdmin }) {
  const [confirming,       setConfirming]       = useState(false)
  const [localNotes,       setLocalNotes]       = useState(prospect.notes || '')
  const [notesDirty,       setNotesDirty]       = useState(false)
  const [savingNotes,      setSavingNotes]       = useState(false)
  const [images,           setImages]           = useState([])
  const [loadingImages,    setLoadingImages]    = useState(true)
  const [uploading,        setUploading]        = useState(false)
  const [quotes,           setQuotes]           = useState([])
  const [loadingQuotes,    setLoadingQuotes]    = useState(true)
  const [downloadingQuote, setDownloadingQuote] = useState(null)
  const [updatingQuote,    setUpdatingQuote]    = useState(null)
  // ── Edit prospect fields ──
  const [editMode,   setEditMode]   = useState(false)
  const [editData,   setEditData]   = useState({
    name:    prospect.name    || '',
    phone:   prospect.phone   || '',
    email:   prospect.email   || '',
    address: prospect.address || '',
    value:   prospect.value   != null ? String(prospect.value) : '0',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const fileInputRef   = useRef(null)
  const cameraInputRef = useRef(null)

  // Load quotes on mount
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoadingQuotes(false); return }
    supabase
      .from('quotes')
      .select('id, status, total, created_at, pdf_path, quote_number')
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes((data || []).map(q => ({
          id:          q.id,
          shortId:     q.id.slice(0, 8).toUpperCase(),
          quoteNumber: q.quote_number || null,
          status:      q.status || 'draft',
          total:       q.total  || 0,
          pdfPath:     q.pdf_path || null,
          dateStr:     new Date(q.created_at).toLocaleDateString('es-MX'),
        })))
        setLoadingQuotes(false)
      })
  }, [prospect.id])

  async function handleQuoteStatus(quoteId, newStatus) {
    setUpdatingQuote(quoteId)
    const ok = await updateQuoteStatus(quoteId, newStatus)
    if (ok) {
      setQuotes(qs => qs.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
    }
    setUpdatingQuote(null)
  }

  async function handleDownloadQuote(q) {
    setDownloadingQuote(q.shortId)
    const safeName = (prospect.name || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
    const filename = q.quoteNumber ? `${safeName} - ${q.quoteNumber}` : `${safeName} - ${q.shortId}`
    await downloadStoredPDF(q.pdfPath, filename)
    setDownloadingQuote(null)
  }

  // Load images on mount
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoadingImages(false); return }
    supabase
      .from('prospect_images')
      .select('id, url, path, created_at')
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setImages(data || []); setLoadingImages(false) })
  }, [prospect.id])

  async function saveNotes() {
    setSavingNotes(true)
    await onSaveNotes(prospect.id, localNotes)
    setSavingNotes(false)
    setNotesDirty(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    const parsed = parseInt(String(editData.value).replace(/\D/g, ''), 10) || 0
    const fields = {
      name:    editData.name.trim()    || prospect.name,
      phone:   editData.phone.trim()   || null,
      email:   editData.email.trim()   || null,
      address: editData.address.trim() || null,
      value:   parsed,
    }
    const ok = await onUpdateProspect(prospect.id, fields)
    setSavingEdit(false)
    if (ok !== false) {
      setEditMode(false)
      setEditData(d => ({ ...d, value: String(parsed) }))
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !isSupabaseConfigured) return
    setUploading(true)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${prospect.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('prospect-images')
      .upload(path, file, { upsert: false })
    if (upErr) { setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage
      .from('prospect-images')
      .getPublicUrl(path)
    const { data: row } = await supabase
      .from('prospect_images')
      .insert({ prospect_id: prospect.id, url: publicUrl, path })
      .select('id, url, path, created_at')
      .single()
    if (row) setImages(prev => [row, ...prev])
    setUploading(false)
    if (fileInputRef.current)   fileInputRef.current.value   = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function handleDeleteImage(img) {
    await supabase.storage.from('prospect-images').remove([img.path])
    await supabase.from('prospect_images').delete().eq('id', img.id)
    setImages(prev => prev.filter(i => i.id !== img.id))
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

        {/* Prospect name + edit toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg)' }}>{prospect.name}</div>
          <button
            onClick={() => { setEditMode(m => !m) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 'var(--r-md)',
              background: editMode ? 'var(--bg-secondary)' : 'var(--kiuvo-blue-soft)',
              color: editMode ? 'var(--fg-secondary)' : 'var(--kiuvo-blue)',
              fontSize: 11, fontWeight: 500,
            }}
          >
            <Icon name={editMode ? 'x' : 'pencil'} size={12} />
            {editMode ? 'Cancelar' : 'Editar datos'}
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px' }}>

          {/* ── Datos del cliente ── */}
          {editMode && (
            <div style={{ marginBottom: 20, padding: '14px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--kiuvo-blue)', background: 'var(--kiuvo-blue-soft)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kiuvo-blue)', letterSpacing: 0.5, marginBottom: 12 }}>
                EDITAR INFORMACIÓN
              </div>
              {[
                { key: 'name',    label: 'Nombre',       icon: 'building-store', type: 'text',   mode: 'text',    placeholder: 'Nombre del negocio' },
                { key: 'phone',   label: 'Teléfono',     icon: 'phone',          type: 'tel',    mode: 'tel',     placeholder: 'Ej. 442 123 4567' },
                { key: 'email',   label: 'Correo',       icon: 'mail',           type: 'email',  mode: 'email',   placeholder: 'correo@negocio.com' },
                { key: 'address', label: 'Dirección',    icon: 'map-pin',        type: 'text',   mode: 'text',    placeholder: 'Calle y número' },
                { key: 'value',   label: 'Valor estimado', icon: 'currency-dollar', type: 'text', mode: 'numeric', placeholder: '0' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--kiuvo-blue)', letterSpacing: 0.3, marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                  <div style={{ position: 'relative' }}>
                    <Icon name={f.icon} size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }} />
                    <input
                      type={f.type}
                      inputMode={f.mode}
                      value={editData[f.key]}
                      onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '9px 10px 9px 30px',
                        background: 'var(--bg)', border: '0.5px solid var(--border)',
                        borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  marginTop: 4, width: '100%', padding: '10px',
                  background: savingEdit ? 'var(--bg-secondary)' : 'var(--kiuvo-blue)',
                  color: savingEdit ? 'var(--fg-tertiary)' : '#fff',
                  borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: savingEdit ? 0.7 : 1,
                }}
              >
                <Icon
                  name={savingEdit ? 'loader' : 'device-floppy'}
                  size={14}
                  style={savingEdit ? { animation: 'spin 0.7s linear infinite' } : {}}
                />
                {savingEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── Cotizaciones ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5,
              marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              COTIZACIONES
              <button
                onClick={() => { onClose(); onNewProposal(prospect) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 'var(--r-md)',
                  background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)',
                  fontSize: 11, fontWeight: 500,
                }}
              >
                <Icon name="plus" size={12} />
                Nueva propuesta
              </button>
            </div>

            {loadingQuotes ? (
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', padding: '8px 0' }}>Cargando…</div>
            ) : quotes.length === 0 ? (
              <div style={{
                padding: '14px 12px',
                border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-md)',
                background: 'var(--bg-secondary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                color: 'var(--fg-tertiary)',
              }}>
                <Icon name="file-invoice" size={20} />
                <span style={{ fontSize: 12 }}>Sin cotizaciones aún</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quotes.map(q => {
                  const sColor = QUOTE_STATUS_COLOR[q.status] || 'var(--fg-tertiary)'
                  const sBg    = QUOTE_STATUS_BG[q.status]    || 'var(--bg-secondary)'
                  const sLabel = QUOTE_STATUS_LABEL[q.status] || q.status
                  const isUpdating = updatingQuote === q.id
                  return (
                    <div key={q.id} style={{
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      border: '0.5px solid var(--border)', background: 'var(--surface)',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      {/* Top row: status + total */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
                          background: sBg, color: sColor,
                        }}>
                          {sLabel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                            {'$' + (q.total ?? 0).toLocaleString('es-MX')}
                          </span>
                          {q.pdfPath && (
                            <button
                              onClick={() => handleDownloadQuote(q)}
                              disabled={downloadingQuote === q.shortId}
                              style={{
                                width: 26, height: 26, borderRadius: 'var(--r-sm)',
                                background: 'var(--kiuvo-blue-soft)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--kiuvo-blue)', opacity: downloadingQuote === q.shortId ? 0.6 : 1,
                              }}
                            >
                              <Icon
                                name={downloadingQuote === q.shortId ? 'loader' : 'download'}
                                size={13}
                                style={downloadingQuote === q.shortId ? { animation: 'spin 0.7s linear infinite' } : {}}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Date + number */}
                      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                        {q.dateStr} · {q.quoteNumber ? `Cotización #${q.quoteNumber}` : `#${q.shortId}`}
                      </div>

                      {/* Accept / Reject for sent quotes */}
                      {q.status === 'sent' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleQuoteStatus(q.id, 'rejected')}
                            disabled={isUpdating}
                            style={{
                              flex: 1, padding: '7px 0', borderRadius: 'var(--r-md)',
                              border: '0.5px solid var(--danger-border)',
                              background: 'var(--danger-bg)', color: 'var(--danger-fg)',
                              fontSize: 12, fontWeight: 500,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              opacity: isUpdating ? 0.6 : 1,
                            }}
                          >
                            <Icon name="x" size={13} />
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleQuoteStatus(q.id, 'approved')}
                            disabled={isUpdating}
                            style={{
                              flex: 1, padding: '7px 0', borderRadius: 'var(--r-md)',
                              background: '#1D9E75', color: '#fff',
                              fontSize: 12, fontWeight: 500,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              opacity: isUpdating ? 0.6 : 1,
                            }}
                          >
                            {isUpdating
                              ? <Icon name="loader" size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
                              : <Icon name="check" size={13} />
                            }
                            Aceptar
                          </button>
                        </div>
                      )}

                      {/* Approved badge */}
                      {q.status === 'approved' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 10px', borderRadius: 'var(--r-md)',
                          background: '#E1F5EE', color: '#1D9E75', fontSize: 12, fontWeight: 500,
                        }}>
                          <Icon name="circle-check" size={13} color="#1D9E75" />
                          Cotización final — usada para producción
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Fotos ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5,
              marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              FOTOS
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 'var(--r-md)',
                  background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)',
                  fontSize: 11, fontWeight: 500, opacity: uploading ? 0.6 : 1,
                }}
              >
                <Icon name={uploading ? 'loader' : 'photo'} size={12}
                  style={uploading ? { animation: 'spin 0.7s linear infinite' } : {}} />
                {uploading ? 'Subiendo…' : 'Añadir foto'}
              </button>
            </div>

            {loadingImages ? (
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', padding: '8px 0' }}>Cargando…</div>
            ) : images.length === 0 ? (
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  width: '100%', padding: '18px 0',
                  border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-md)',
                  background: 'var(--bg-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  color: 'var(--fg-tertiary)',
                }}
              >
                <Icon name="camera" size={22} />
                <span style={{ fontSize: 12 }}>Toca para abrir la cámara</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {images.map(img => (
                  <div key={img.id} style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={img.url} alt=""
                      style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', display: 'block' }}
                    />
                    <button
                      onClick={() => handleDeleteImage(img)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                      }}
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                ))}
                {/* Add more — galería */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 84, height: 84, flexShrink: 0,
                    border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-md)',
                    background: 'var(--bg-secondary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, color: 'var(--fg-tertiary)',
                  }}
                >
                  <Icon name="plus" size={18} />
                  <span style={{ fontSize: 10 }}>Galería</span>
                </button>
              </div>
            )}

            {/* Galería — sin capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            {/* Cámara trasera */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>

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

          {/* ── Delete (admin only) ── */}
          {isAdmin && confirming ? (
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
          ) : isAdmin ? (
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
          ) : null}
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
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const isAdmin = profile?.role === 'admin'

  const [activeStage,      setActiveStage]      = useState('presentacion')
  const [prospects,        setProspects]        = useState([])
  const [loading,          setLoading]          = useState(true)
  const [loadError,        setLoadError]        = useState(false)
  const [showAdd,          setShowAdd]          = useState(false)
  const [showQuote,        setShowQuote]        = useState(false)
  const [showProposalQuote,setShowProposalQuote]= useState(false)
  const [quoteProspect,    setQuoteProspect]    = useState(null)
  const [odpProspect,      setOdpProspect]      = useState(null)
  const [actionTarget,     setActionTarget]     = useState(null)
  const [sortMode,         setSortMode]         = useState('value')

  // ── Load ──────────────────────────────────────────────────────────
  const loadProspects = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    const [{ data: rows, error: pErr }, { data: visits }] = await Promise.all([
      supabase
        .from('prospects')
        .select('id, name, company, phone, email, contact, stage_id, value, health, days_in_stage, stage_entered_at, last_contact_at, notes')
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
        phone:   phone   || null,
        contact: contact || null,
        owner_id: user.id,
        stage_id: activeStage,
        value: parsed,
        notes: finalNotes,
        health: 'green',
      })
      .select('id, name, company, phone, email, contact, stage_id, value, health, days_in_stage, stage_entered_at, last_contact_at, notes')
      .single()

    if (error) {
      setProspects(prev => prev.filter(p => p.id !== tempId))
      addToast({ message: 'No se pudo crear el prospecto. Intenta de nuevo.', kind: 'error' })
      return
    }

    setProspects(prev => prev.map(p => p.id === tempId ? normalize(data) : p))

    supabase.from('activities').insert({
      prospect_id: data.id, seller_id: user.id, kind: 'new',
    }).then(() => {})
  }

  // ── Update stage ──────────────────────────────────────────────────
  async function handleMoveStage(prospectId, newStageId) {
    const old = prospects.find(p => p.id === prospectId)
    if (!old) return

    const now = new Date().toISOString()
    setProspects(ps => ps.map(p =>
      p.id === prospectId
        ? { ...p, stage_id: newStageId, stage: newStageId, stage_entered_at: now, days: 0 }
        : p
    ))

    const { error } = await supabase
      .from('prospects')
      .update({ stage_id: newStageId, stage_entered_at: now, updated_at: now })
      .eq('id', prospectId)

    if (error) {
      setProspects(ps => ps.map(p =>
        p.id === prospectId
          ? { ...p, stage_id: old.stage_id, stage: old.stage_id, stage_entered_at: old.stage_entered_at, days: old.days }
          : p
      ))
      addToast({ message: 'No se pudo mover el prospecto. Cambio revertido.', kind: 'warning' })
    } else {
      supabase.from('activities').insert({
        prospect_id: prospectId, seller_id: user.id, kind: 'stage',
        details: { from: old.stage_id, to: newStageId },
      }).then(() => {})
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

  // ── Update prospect fields ────────────────────────────────────────
  async function handleUpdateProspect(prospectId, fields) {
    const old = prospects.find(p => p.id === prospectId)
    if (!old) return false

    setProspects(ps => ps.map(p => p.id === prospectId ? { ...p, ...fields } : p))
    setActionTarget(at => at?.id === prospectId ? { ...at, ...fields } : at)

    const { error } = await supabase
      .from('prospects')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', prospectId)

    if (error) {
      setProspects(ps => ps.map(p => p.id === prospectId ? old : p))
      setActionTarget(at => at?.id === prospectId ? { ...at, ...old } : at)
      addToast({ message: 'No se pudo actualizar el prospecto. Intenta de nuevo.', kind: 'error' })
      return false
    }
    return true
  }

  // ── New proposal from ActionSheet ────────────────────────────────
  function handleNewProposal(prospect) {
    setQuoteProspect(prospect)
    setShowProposalQuote(true)
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
        <Suspense fallback={null}>
          <QuoteModal
            onClose={() => setShowQuote(false)}
            onGenerated={loadProspects}
          />
        </Suspense>
      )}

      {odpProspect && (
        <Suspense fallback={null}>
          <ProductionOrderModal
            prospect={odpProspect}
            onClose={() => setOdpProspect(null)}
            onCreated={() => setOdpProspect(null)}
          />
        </Suspense>
      )}

      {actionTarget && (
        <ActionSheet
          prospect={actionTarget}
          onClose={() => setActionTarget(null)}
          onMoveStage={handleMoveStage}
          onDelete={handleDelete}
          onSaveNotes={handleSaveNotes}
          onUpdateProspect={handleUpdateProspect}
          onNewProposal={handleNewProposal}
          isAdmin={isAdmin}
        />
      )}

      {showProposalQuote && quoteProspect && (
        <Suspense fallback={null}>
          <QuoteModal
            initialProspectId={quoteProspect.id}
            initialProspectName={quoteProspect.name}
            initialContactName={quoteProspect.contact || ''}
            onClose={() => { setShowProposalQuote(false); setQuoteProspect(null) }}
            onGenerated={() => { setShowProposalQuote(false); setQuoteProspect(null); loadProspects() }}
          />
        </Suspense>
      )}
    </div>
  )
}
