import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Sheet, Label, Segmented, SearchInput, Field, Empty, Bone, ProgressBar } from '../ui'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useStages } from '../../contexts/StagesContext'
import { downloadStoredPDF } from '../../hooks/useQuoteHistory'
import { saveFile } from '../../lib/saveFile'
// PDF: importación dinámica para no bloquear la carga inicial del seller

// Lazy: evita cargar react-pdf (~1.4 MB) hasta que el usuario abre cotizaciones
const QuoteModal           = lazy(() => import('./QuoteModal'))
const ProductionOrderModal = lazy(() => import('./ProductionOrderModal'))

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX')

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
const QUOTE_STATUS_TONE  = { sent: 'sky', approved: 'success', rejected: 'coral' }
const HEALTH_PILL = {
  amber: { tone: 'warning', label: 'En riesgo' },
  red:   { tone: 'coral',   label: 'Estancado' },
}

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

function Spin({ size = 18 }) {
  return <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={size} /></span>
}

function StageDot({ color, size = 10 }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function SectionHead({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, minHeight: 40 }}>
      <Label style={{ marginBottom: 0 }}>{children}</Label>
      {action}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Bone w="55%" h={18} />
        <Bone w="22%" h={18} />
      </div>
      <Bone h={8} r={4} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Bone w="40%" h={14} />
        <Bone w="25%" h={14} />
      </div>
    </Card>
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

  return (
    <Sheet
      title="Nuevo prospecto"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="soft" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
          <Button onClick={handleSave} style={{ flex: 2 }}>Guardar prospecto</Button>
        </div>
      }
    >
      <div style={{ marginBottom: 18 }}>
        <Pill><StageDot color={stage.color} size={8} />{stage.label}</Pill>
      </div>

      <Field label="Empresa">
        <input className="k-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la empresa" />
      </Field>
      <Field label="Valor del negocio ($) *">
        <input
          className="k-input" value={value} onChange={e => setValue(e.target.value)}
          placeholder="Ej. 15000" type="text" inputMode="numeric"
          style={{ fontWeight: 600 }}
        />
      </Field>
      <Field label="Persona de contacto">
        <input className="k-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="Nombre del responsable" />
      </Field>
      <Field label="Teléfono">
        <input className="k-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 dígitos" type="tel" inputMode="numeric" />
      </Field>
      <Field label="Notas (opcional)">
        <textarea
          className="k-input" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Observaciones, interés del cliente, contexto…" rows={3}
        />
      </Field>

      <div style={{
        padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.35,
      }}>
        <StageDot color={stage.color} />
        <div>
          Se añadirá a <b style={{ color: 'var(--fg)' }}>{stage.label}</b>.
          Mínimo requerido: {stage.min} visita{stage.min > 1 ? 's' : ''}.
        </div>
      </div>
    </Sheet>
  )
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────
function ActionSheet({ prospect, onClose, onMoveStage, onDelete, onSaveNotes, onUpdateProspect, onNewProposal, onCheckIn, isAdmin }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { stages: allStages } = useStages()
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
      .select('id, status, total, created_at, quote_number')
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes((data || []).map(q => ({
          id:          q.id,
          shortId:     q.id.slice(0, 8).toUpperCase(),
          quoteNumber: q.quote_number || null,
          status:      q.status || 'draft',
          total:       q.total  || 0,
          dateStr:     new Date(q.created_at).toLocaleDateString('es-MX'),
        })))
        setLoadingQuotes(false)
      })
  }, [prospect.id])

  async function handleQuoteStatus(quoteId, newStatus) {
    // Optimistic update — cambia el estado en UI de inmediato
    const prevStatus = quotes.find(q => q.id === quoteId)?.status
    setQuotes(qs => qs.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
    setUpdatingQuote(quoteId)
    try {
      // Usar seller_id explícito para que el UPDATE no dependa solo de RLS
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId)
        .eq('seller_id', user.id)
      if (error) {
        console.error('[handleQuoteStatus]', error.code, error.message, error.details)
        setQuotes(qs => qs.map(q => q.id === quoteId ? { ...q, status: prevStatus } : q))
        addToast({ message: `No se pudo actualizar: ${error.message}`, kind: 'error' })
      }
    } catch (err) {
      console.error('[handleQuoteStatus] catch', err)
      setQuotes(qs => qs.map(q => q.id === quoteId ? { ...q, status: prevStatus } : q))
      addToast({ message: 'Error de conexión. Intenta de nuevo.', kind: 'error' })
    } finally {
      setUpdatingQuote(null)
    }
  }

  async function handleDownloadQuote(q) {
    setDownloadingQuote(q.shortId)
    try {
      const { data: items } = await supabase
        .from('quote_items')
        .select('product_name, sku, unit, quantity, unit_price, discount_pct')
        .eq('quote_id', q.id)
      const pdfItems = (items || []).map((item, idx) => {
        const rawDisc = item.discount_pct ?? 0
        const isSpecialPrice = rawDisc === -1
        const discountPct = isSpecialPrice ? 0 : rawDisc
        const listPrice = discountPct > 0
          ? item.unit_price / (1 - discountPct / 100)
          : item.unit_price
        return {
          id: idx, name: item.product_name, sku: item.sku || '',
          unit: item.unit || 'u.', qty: item.quantity,
          price: listPrice, discountPct, isSpecialPrice,
        }
      })
      let logoDataUrl = null
      try {
        const r = await fetch(window.location.origin + '/kiuvo-logo.png')
        if (r.ok) {
          const bytes = new Uint8Array(await r.arrayBuffer())
          let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) })
          logoDataUrl = `data:image/png;base64,${btoa(bin)}`
        }
      } catch (_) {}
      const [{ pdf }, { QuotePDFDoc }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/quotePDF'),
      ])
      const blob = await pdf(
        <QuotePDFDoc
          quoteId={q.id}
          prospectName={prospect.name}
          items={pdfItems}
          date={q.dateStr ? new Date(q.dateStr.split('/').reverse().join('-')) : new Date()}
          logoUrl={logoDataUrl}
        />
      ).toBlob()
      const safe = (prospect.name || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
      await saveFile(blob, q.quoteNumber ? `${safe} - ${q.quoteNumber}.pdf` : `${safe} - ${q.shortId}.pdf`)
    } catch (err) {
      console.error('[handleDownloadQuote]', err)
      addToast({ message: 'No se pudo generar el PDF.', kind: 'error' })
    } finally {
      setDownloadingQuote(null)
    }
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

  const EDIT_FIELDS = [
    { key: 'name',    label: 'Nombre',         type: 'text',  mode: 'text',    placeholder: 'Nombre del negocio' },
    { key: 'phone',   label: 'Teléfono',       type: 'tel',   mode: 'tel',     placeholder: 'Ej. 442 123 4567' },
    { key: 'email',   label: 'Correo',         type: 'email', mode: 'email',   placeholder: 'correo@negocio.com' },
    { key: 'address', label: 'Dirección',      type: 'text',  mode: 'text',    placeholder: 'Calle y número' },
    { key: 'value',   label: 'Valor estimado', type: 'text',  mode: 'numeric', placeholder: '0' },
  ]

  return (
    <Sheet title={prospect.name} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {onCheckIn && (
          <Button variant="accent" block icon="map-pin-check" onClick={() => { onClose(); onCheckIn(prospect) }}>
            Check-in en este prospecto
          </Button>
        )}
        <Button variant="soft" block icon={editMode ? 'x' : 'pencil'} onClick={() => { setEditMode(m => !m) }}>
          {editMode ? 'Cancelar edición' : 'Editar datos'}
        </Button>
      </div>

      {/* ── Datos del cliente ── */}
      {editMode && (
        <Card style={{ marginBottom: 24 }}>
          <Label>Editar información</Label>
          {EDIT_FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <input
                className="k-input"
                type={f.type}
                inputMode={f.mode}
                value={editData[f.key]}
                onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ background: 'var(--bg-secondary)' }}
              />
            </Field>
          ))}
          <Button block icon="check" loading={savingEdit} onClick={handleSaveEdit}>
            {savingEdit ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Card>
      )}

      {/* ── Cotizaciones ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHead action={
          <Button variant="soft" size="sm" icon="plus" onClick={() => { onClose(); onNewProposal(prospect) }}>
            Nueva propuesta
          </Button>
        }>
          Cotizaciones
        </SectionHead>

        {loadingQuotes ? (
          <div style={{ fontSize: 14, color: 'var(--fg-tertiary)', padding: '8px 0' }}>Cargando…</div>
        ) : quotes.length === 0 ? (
          <Card style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg-secondary)', fontSize: 15 }}>
            <Icon name="file-invoice" size={22} color="var(--fg-tertiary)" />
            Sin cotizaciones aún
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quotes.map(q => {
              const sLabel = QUOTE_STATUS_LABEL[q.status] || q.status
              const isUpdating = updatingQuote === q.id
              const isDownloading = downloadingQuote === q.shortId
              return (
                <Card key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="k-num" style={{ fontSize: 22 }}>
                        {'$' + (q.total ?? 0).toLocaleString('es-MX')}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 6 }}>
                        {q.dateStr} · {q.quoteNumber ? `Cotización #${q.quoteNumber}` : `#${q.shortId}`}
                      </div>
                    </div>
                    <Pill tone={QUOTE_STATUS_TONE[q.status]}>{sLabel}</Pill>
                    <button
                      type="button"
                      className="k-iconbtn k-iconbtn--soft"
                      aria-label="Descargar PDF"
                      onClick={() => handleDownloadQuote(q)}
                      disabled={isDownloading}
                      style={{ opacity: isDownloading ? 0.6 : 1 }}
                    >
                      {isDownloading ? <Spin size={20} /> : <Icon name="download" size={20} />}
                    </button>
                  </div>

                  {q.status === 'sent' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="danger" icon="x" disabled={isUpdating} onClick={() => handleQuoteStatus(q.id, 'rejected')} style={{ flex: 1 }}>
                        Rechazar
                      </Button>
                      <Button icon="check" loading={isUpdating} onClick={() => handleQuoteStatus(q.id, 'approved')} style={{ flex: 1 }}>
                        Aceptar
                      </Button>
                    </div>
                  )}

                  {q.status === 'approved' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: 'var(--success-bg)', color: 'var(--success-fg)', fontSize: 14, fontWeight: 500,
                    }}>
                      <Icon name="circle-check" size={18} />
                      Cotización final — usada para producción
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Fotos ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHead action={
          <Button variant="soft" size="sm" icon="photo" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? 'Subiendo…' : 'Añadir foto'}
          </Button>
        }>
          Fotos
        </SectionHead>

        {loadingImages ? (
          <div style={{ fontSize: 14, color: 'var(--fg-tertiary)', padding: '8px 0' }}>Cargando…</div>
        ) : images.length === 0 ? (
          <button
            type="button"
            className="k-card"
            onClick={() => cameraInputRef.current?.click()}
            style={{
              width: '100%', minHeight: 96,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'var(--fg-secondary)', fontSize: 15,
            }}
          >
            <Icon name="camera" size={26} />
            Toca para abrir la cámara
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {images.map(img => (
              <div key={img.id} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={img.url} alt=""
                  style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 'var(--r-md)', display: 'block' }}
                />
                <button
                  type="button"
                  aria-label="Eliminar foto"
                  onClick={() => handleDeleteImage(img)}
                  style={{
                    position: 'absolute', top: 0, right: 0, width: 44, height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'var(--on-ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="x" size={14} />
                  </span>
                </button>
              </div>
            ))}
            {/* Add more — galería */}
            <button
              type="button"
              className="k-card"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 104, height: 104, flexShrink: 0, padding: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, color: 'var(--fg-secondary)', fontSize: 13,
              }}
            >
              <Icon name="plus" size={22} />
              Galería
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
      <div style={{ marginBottom: 24 }}>
        <Label>Notas</Label>
        <textarea
          className="k-input"
          value={localNotes}
          onChange={e => { setLocalNotes(e.target.value); setNotesDirty(true) }}
          placeholder="Agrega observaciones, acuerdos, contexto del cliente…"
          rows={3}
        />
        {notesDirty && (
          <Button block icon="check" loading={savingNotes} onClick={saveNotes} style={{ marginTop: 10 }}>
            {savingNotes ? 'Guardando…' : 'Guardar nota'}
          </Button>
        )}
      </div>

      {/* ── Move stage ── */}
      <Label>Mover a etapa</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {allStages.filter(s => s.id !== prospect.stage_id && s.id !== 'repositorio').map(s => (
          <Chip key={s.id} tall onClick={() => { onMoveStage(prospect.id, s.id); onClose() }} style={{ fontSize: 16 }}>
            <StageDot color={s.color} />
            {s.label}
          </Chip>
        ))}
        {/* Repositorio — archive option */}
        {prospect.stage_id !== 'repositorio' && (
          <Chip tall icon="archive" onClick={() => { onMoveStage(prospect.id, 'repositorio'); onClose() }}
            style={{ fontSize: 16, background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' }}>
            Archivar en Repositorio
          </Chip>
        )}
        {/* Reactivate from repositorio */}
        {prospect.stage_id === 'repositorio' && (
          <Button block icon="arrow-up-right" onClick={() => { onMoveStage(prospect.id, 'prospeccion'); onClose() }}>
            Reactivar prospecto
          </Button>
        )}
      </div>

      {/* ── Delete (admin only) ── */}
      {isAdmin && confirming ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 15, color: 'var(--fg-secondary)', textAlign: 'center', padding: '2px 0 4px', lineHeight: 1.4 }}>
            ¿Eliminar <b style={{ color: 'var(--fg)' }}>{prospect.name}</b>? Esta acción no se puede deshacer.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="soft" onClick={() => setConfirming(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button variant="danger" icon="trash" onClick={() => { onDelete(prospect.id); onClose() }} style={{ flex: 1 }}>Eliminar</Button>
          </div>
        </div>
      ) : isAdmin ? (
        <Button variant="danger" block icon="trash" onClick={() => setConfirming(true)}>
          Eliminar prospecto
        </Button>
      ) : null}
    </Sheet>
  )
}

// ─── ProspectCard ─────────────────────────────────────────────────────────────
// ─── Modal: vincular cotización huérfana a un prospecto ───────────────────────
function LinkQuoteModal({ quote, prospects, onClose, onCreate, onLink }) {
  const { stages: allStages, stageById } = useStages()
  const selectable = allStages.filter(s => !s.isRepository)

  const [mode,    setMode]    = useState('new')      // 'new' | 'existing'
  const [saving,  setSaving]  = useState(false)
  // Crear nuevo
  const [name,    setName]    = useState(quote.clientName === 'Sin cliente' ? '' : quote.clientName)
  const [contact, setContact] = useState('')
  const [phone,   setPhone]   = useState('')
  const [stageId, setStageId] = useState(
    selectable.some(s => s.id === 'cotizacion') ? 'cotizacion' : (selectable[0]?.id ?? 'prospeccion')
  )
  // Vincular existente
  const [search,  setSearch]  = useState('')

  const matches = search.trim()
    ? prospects.filter(p => (p.name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : prospects.slice(0, 20)

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    const ok = await onCreate({ name: name.trim(), contact: contact.trim(), phone: phone.trim(), stageId })
    setSaving(false)
    if (ok) onClose()
  }

  async function handleLink(prospectId) {
    if (saving) return
    setSaving(true)
    const ok = await onLink(prospectId)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Sheet title="Vincular cotización" onClose={onClose}>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', marginBottom: 16 }}>
        #{quote.quoteNumber ?? quote.shortId} · <b style={{ color: 'var(--fg)' }}>{fmt(quote.total)}</b>
      </div>

      <Segmented
        size="lg"
        value={mode}
        onChange={setMode}
        options={[{ id: 'new', label: 'Crear prospecto' }, { id: 'existing', label: 'Vincular a existente' }]}
        style={{ marginBottom: 20 }}
      />

      {mode === 'new' ? (
        <div>
          <Field label="Nombre del cliente *">
            <input className="k-input" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Nombre o empresa" />
          </Field>
          <Field label="Contacto">
            <input className="k-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="Ej. Juan Pérez" />
          </Field>
          <Field label="Teléfono">
            <input className="k-input" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="449-000-00-00" />
          </Field>

          <Label>Etapa inicial</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {selectable.map(s => (
              <Chip key={s.id} selected={s.id === stageId} onClick={() => setStageId(s.id)}>
                <StageDot color={s.color} size={8} />
                {s.label}
              </Chip>
            ))}
          </div>

          <div style={{
            padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
            fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.35,
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          }}>
            <Icon name="info-circle" size={18} />
            El valor del prospecto será {fmt(quote.total)} (total de la cotización).
          </div>

          <Button block size="lg" loading={saving} disabled={!name.trim()} onClick={handleCreate}>
            {saving ? 'Creando…' : 'Crear y vincular'}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} autoFocus placeholder="Buscar prospecto…" style={{ marginBottom: 4 }} />
          {matches.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 15, color: 'var(--fg-tertiary)' }}>
              Sin prospectos que coincidan
            </div>
          ) : matches.map(p => {
            const st = stageById[p.stage] ?? STAGE_BY_ID[p.stage]
            return (
              <button key={p.id} type="button" className="k-card" onClick={() => handleLink(p.id)} disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  minHeight: 60, padding: '10px 14px', textAlign: 'left', opacity: saving ? 0.6 : 1,
                }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, ...ellipsis }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
                    {st?.label ?? p.stage} · {fmt(p.value)}
                  </div>
                </div>
                <Icon name="arrow-up-right" size={20} color="var(--fg-tertiary)" />
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

// ─── Tarjeta de cotización (resultados de búsqueda) ───────────────────────────
function QuoteResultCard({ q, onOpenProspect, onLinkQuote }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!q.pdfPath) return
    setDownloading(true)
    await downloadStoredPDF(q.pdfPath, `${q.clientName} - ${q.quoteNumber ?? q.shortId}`)
    setDownloading(false)
  }

  const actionStyle = { flex: 1, padding: '0 12px', fontSize: 14 }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <Icon name="receipt" size={22} color="var(--fg-tertiary)" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, ...ellipsis }}>{q.clientName}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
              #{q.quoteNumber ?? q.shortId} · {q.dateStr}
            </div>
          </div>
        </div>
        <div className="k-num" style={{ fontSize: 18, flexShrink: 0, paddingTop: 2 }}>{fmt(q.total)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Pill tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status] ?? q.status}</Pill>
        {q.orphan && <Pill tone="warning" icon="alert-triangle">Sin prospecto en el embudo</Pill>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {q.pdfPath && (
          <Button variant="soft" icon="download" disabled={downloading} onClick={handleDownload} style={actionStyle}>
            {downloading ? 'Abriendo…' : 'Descargar PDF'}
          </Button>
        )}
        {q.prospectId ? (
          <Button variant="soft" icon="arrow-up-right" onClick={() => onOpenProspect(q.prospectId)} style={actionStyle}>
            Ver prospecto
          </Button>
        ) : (
          <Button icon="plus" onClick={() => onLinkQuote(q)} style={actionStyle}>
            Añadir al embudo
          </Button>
        )}
      </div>
    </Card>
  )
}

function ProspectCard({ p, onAction, onAdvance, onODP, showStage = false }) {
  const { stages: ctxStages, stageById: ctxStageById } = useStages()
  const stageIdx  = ctxStages.findIndex(s => s.id === p.stage)
  const stage     = ctxStageById[p.stage] ?? STAGES[0]
  // Don't show "advance" button for repositorio or cierre
  const nextStage = (!stage.isRepository && p.stage !== 'cierre') ? (ctxStages[stageIdx + 1] ?? null) : null
  const health = HEALTH_PILL[p.health]
  const hasPills = health || showStage
  const stepStyle = { minHeight: 44, padding: '0 14px', fontSize: 14, maxWidth: '100%' }

  return (
    <Card style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: p._optimistic ? 0.55 : 1, transition: 'opacity 0.25s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.25, ...ellipsis }}>{p.name}</div>
          <div className="k-num" style={{ fontSize: 20, marginTop: 6 }}>{fmt(p.value)}</div>
        </div>
        {!p._optimistic && (
          <IconButton icon="dots" label="Abrir ficha del prospecto" variant="soft" onClick={() => onAction(p)} />
        )}
      </div>

      {hasPills && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {health && <Pill tone={health.tone} icon="alert-triangle">{health.label}</Pill>}
          {showStage && (
            <Pill icon={stage.isRepository ? 'archive' : undefined}>
              {!stage.isRepository && <StageDot color={stage.color} size={8} />}
              {stage.label}
            </Pill>
          )}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--fg-secondary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="map-pin" size={15} />
            <span><b style={{ fontWeight: 600, color: 'var(--fg)' }}>{p.visits}</b>/{stage.min} visitas</span>
          </span>
          <span>{p.days} días en etapa</span>
        </div>
        <ProgressBar value={p.visits} max={Math.max(stage.min, 1)} color={stage.color} height={6} />
      </div>

      {p.notes ? (
        <div style={{
          fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.35,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>
          {p.notes}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton
          icon="brand-whatsapp" label="WhatsApp" variant="soft"
          onClick={() => p.phone && window.open(`https://wa.me/52${p.phone.replace(/\D/g, '')}`, '_blank')}
        />
        <IconButton
          icon="phone" label="Llamar" variant="soft"
          onClick={() => p.phone && (window.location.href = `tel:${p.phone}`)}
        />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--fg-tertiary)', ...ellipsis }}>{p.last}</div>
        {nextStage && !p._optimistic ? (
          <Button
            variant="soft"
            onClick={() => onAdvance(p.id, nextStage.id)}
            title={`Avanzar a ${nextStage.label}`}
            style={stepStyle}
          >
            <StageDot color={nextStage.color} size={8} />
            {nextStage.label}
            <Icon name="arrow-right" size={16} />
          </Button>
        ) : !nextStage && !p._optimistic && p.stage !== 'repositorio' ? (
          <Button
            variant="soft" icon="clipboard-list"
            onClick={() => onODP(p)}
            title="Generar orden de producción"
            style={stepStyle}
          >
            ODP
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
export default function Kanban({ jumpTo, onCheckIn, onOpenNotifications, unreadCount = 0 }) {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const { stages: contextStages, stageById: contextStageById } = useStages()
  const isAdmin = profile?.role === 'admin'

  const [activeStage,      setActiveStage]      = useState('prospeccion')
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
  const [showSearch,       setShowSearch]       = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [quotes,           setQuotes]           = useState([])
  const [linkQuote,        setLinkQuote]        = useState(null)

  // ── Load ──────────────────────────────────────────────────────────
  const loadProspects = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    const [{ data: rows, error: pErr }, { data: visits }, { data: quotes }] = await Promise.all([
      supabase
        .from('prospects')
        .select('id, name, company, phone, email, contact, stage_id, value, health, days_in_stage, stage_entered_at, last_contact_at, notes')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('visits')
        .select('prospect_id')
        .eq('seller_id', user.id),
      supabase
        .from('quotes')
        .select('id, prospect_id, total, status, notes, created_at, pdf_path, quote_number, prospect:prospects(name)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (pErr) {
      setLoadError(true)
      setLoading(false)
      addToast({ message: 'Error al cargar prospectos. Verifica tu conexión.', kind: 'error' })
      return
    }

    const counts = {}
    visits?.forEach(v => { counts[v.prospect_id] = (counts[v.prospect_id] ?? 0) + 1 })

    // Tomar el total de la cotización más reciente por prospecto
    const quoteValue = {}
    ;(quotes ?? []).forEach(q => {
      if (q.prospect_id && !quoteValue[q.prospect_id]) quoteValue[q.prospect_id] = Number(q.total || 0)
    })

    // Guardar cotizaciones normalizadas para el buscador
    setQuotes((quotes ?? []).map(q => ({
      id:           q.id,
      shortId:      q.id.slice(0, 8).toUpperCase(),
      quoteNumber:  q.quote_number || null,
      prospectId:   q.prospect_id || null,
      clientName:   q.prospect?.name || q.notes || 'Sin cliente',
      orphan:       !q.prospect_id,
      total:        Number(q.total || 0),
      status:       q.status || 'draft',
      pdfPath:      q.pdf_path || null,
      createdAt:    q.created_at,
      dateStr:      new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
    })))

    setProspects((rows ?? []).map(r => {
      const normalized = normalize(r, counts)
      // Si hay cotización, usar ese total; si no, usar el valor estimado del prospecto
      if (quoteValue[r.id]) normalized.value = quoteValue[r.id]
      return normalized
    }))
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadProspects() }, [loadProspects])
  useEffect(() => { if (jumpTo?.stage) setActiveStage(jumpTo.stage) }, [jumpTo])

  // ── Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return
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
  const stage      = contextStageById[activeStage] ?? contextStages[0] ?? STAGES[0]
  const counts     = Object.fromEntries(contextStages.map(s => [s.id, prospects.filter(p => p.stage === s.id).length]))
  const totalAll   = prospects.length
  const totalPot   = prospects.filter(p => p.stage !== 'cierre' && p.stage !== 'repositorio').reduce((s, p) => s + (p.value ?? 0), 0)
  // Búsqueda: cuando hay query se busca en TODAS las etapas, no solo la activa
  const q          = searchQuery.trim().toLowerCase()
  const searching  = q.length > 0
  const rawList    = searching
    ? prospects.filter(p =>
        (p.name    ?? '').toLowerCase().includes(q) ||
        (p.company ?? '').toLowerCase().includes(q) ||
        (p.contact ?? '').toLowerCase().includes(q) ||
        (p.phone   ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) && q.replace(/\D/g, '').length > 0 ||
        (p.email   ?? '').toLowerCase().includes(q) ||
        (p.notes   ?? '').toLowerCase().includes(q)
      )
    : prospects.filter(p => p.stage === activeStage)
  const list       = [...rawList].sort((a, b) => sortMode === 'value' ? (b.value ?? 0) - (a.value ?? 0) : (b.days ?? 0) - (a.days ?? 0))
  const totalValue = rawList.reduce((s, p) => s + (p.value ?? 0), 0)

  // Cotizaciones que coinciden con la búsqueda (incluye las huérfanas sin prospecto)
  const quoteHits = searching
    ? quotes.filter(qt =>
        qt.clientName.toLowerCase().includes(q) ||
        qt.shortId.toLowerCase().includes(q) ||
        String(qt.quoteNumber ?? '').includes(q)
      )
    : []

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

  // ── Vincular cotización huérfana ──────────────────────────────────
  /** Crea un prospecto nuevo y le asigna la cotización. */
  async function handleCreateProspectForQuote({ name, contact, phone, stageId }) {
    if (!linkQuote) return false

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name,
        company:  name,
        phone:    phone   || null,
        contact:  contact || null,
        owner_id: user.id,
        stage_id: stageId,
        value:    linkQuote.total,
        notes:    contact ? 'Contacto: ' + contact : null,
        health:   'green',
      })
      .select('id, name, company, phone, email, contact, stage_id, value, health, days_in_stage, stage_entered_at, last_contact_at, notes')
      .single()

    if (error) {
      addToast({ message: 'No se pudo crear el prospecto. Intenta de nuevo.', kind: 'error' })
      return false
    }

    const { error: qErr } = await supabase
      .from('quotes')
      .update({ prospect_id: data.id })
      .eq('id', linkQuote.id)

    if (qErr) {
      addToast({ message: 'Prospecto creado, pero no se pudo vincular la cotización.', kind: 'warning' })
      setProspects(prev => [normalize(data), ...prev])
      return false
    }

    setProspects(prev => [normalize(data), ...prev])
    setQuotes(prev => prev.map(q =>
      q.id === linkQuote.id ? { ...q, prospectId: data.id, orphan: false, clientName: data.name } : q
    ))
    supabase.from('activities').insert({
      prospect_id: data.id, seller_id: user.id, kind: 'new',
    }).then(() => {})

    setActiveStage(stageId)
    setSearchQuery('')
    setShowSearch(false)
    addToast({ message: `${data.name} añadido al embudo con su cotización.`, kind: 'success' })
    return true
  }

  /** Vincula la cotización a un prospecto que ya existe. */
  async function handleLinkQuoteToProspect(prospectId) {
    if (!linkQuote) return false

    const { error } = await supabase
      .from('quotes')
      .update({ prospect_id: prospectId })
      .eq('id', linkQuote.id)

    if (error) {
      addToast({ message: 'No se pudo vincular la cotización. Intenta de nuevo.', kind: 'error' })
      return false
    }

    const target = prospects.find(p => p.id === prospectId)

    // Si la cotización es más reciente que el valor actual, actualizar el prospecto
    if (target && linkQuote.total > 0) {
      await supabase.from('prospects').update({ value: linkQuote.total }).eq('id', prospectId)
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, value: linkQuote.total } : p))
    }

    setQuotes(prev => prev.map(q =>
      q.id === linkQuote.id
        ? { ...q, prospectId, orphan: false, clientName: target?.name ?? q.clientName }
        : q
    ))

    if (target) setActiveStage(target.stage)
    setSearchQuery('')
    setShowSearch(false)
    addToast({ message: `Cotización vinculada a ${target?.name ?? 'el prospecto'}.`, kind: 'success' })
    return true
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
      addToast({ message: `Error: ${error.message || error.code || JSON.stringify(error)}`, kind: 'warning' })
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
  const addLabel = activeStage === 'cotizacion' ? 'Cotizar' : 'Añadir'
  const addIcon  = activeStage === 'cotizacion' ? 'receipt' : 'plus'
  const openAdd  = () => activeStage === 'cotizacion' ? setShowQuote(true) : setShowAdd(true)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 170, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div className="k-screenhead" style={{ gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k-screenhead__title">Mi embudo</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
            {loading ? '…' : `${totalAll} prospectos · ${fmt(totalPot)} potencial`}
          </div>
        </div>
        <IconButton
          icon={showSearch ? 'x' : 'search'}
          label={showSearch ? 'Cerrar búsqueda' : 'Buscar'}
          variant={showSearch ? 'ink' : undefined}
          onClick={() => {
            setShowSearch(s => {
              if (s) setSearchQuery('')   // al cerrar, limpiar
              return !s
            })
          }}
        />
        <div style={{ position: 'relative' }}>
          <IconButton icon="bell" label="Notificaciones" onClick={onOpenNotifications} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 8, right: 8, width: 11, height: 11, borderRadius: '50%',
              background: 'var(--coral)', border: '2px solid var(--surface)',
            }} />
          )}
        </div>
        <IconButton
          icon={sortMode === 'risk' ? 'alert-triangle' : 'arrows-sort'}
          label={sortMode === 'risk' ? 'Ordenado por días en etapa' : 'Ordenado por valor'}
          variant={sortMode === 'risk' ? 'ink' : undefined}
          onClick={() => setSortMode(m => m === 'value' ? 'risk' : 'value')}
        />
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{ padding: '0 14px 12px' }}>
          <SearchInput
            type="search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar prospecto o cotización…"
            autoFocus
          />
        </div>
      )}

      {/* Stage pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
        {contextStages.map(s => {
          const on = s.id === activeStage && !searching
          return (
            <button key={s.id} type="button" aria-pressed={on} onClick={() => { setActiveStage(s.id); setSearchQuery('') }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              minHeight: 44, padding: '0 14px', borderRadius: 'var(--r-full)',
              background: on ? 'var(--primary-bg)' : 'var(--surface)',
              color: on ? 'var(--primary-fg)' : 'var(--fg)',
              fontSize: 14, fontWeight: on ? 600 : 500, flexShrink: 0, scrollSnapAlign: 'start',
              opacity: searching ? 0.55 : 1, transition: 'opacity 0.15s',
            }}>
              {s.isRepository
                ? <Icon name="archive" size={16} />
                : <StageDot color={s.color} size={8} />
              }
              {s.label}
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.65 }}>
                {loading ? '·' : (counts[s.id] ?? 0)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Column summary */}
      <div style={{ margin: '0 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 }}>
        <div style={{ minWidth: 0 }}>
          <div className="k-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {searching
              ? 'Resultados'
              : <>
                  {stage.isRepository ? <Icon name="archive" size={18} /> : <StageDot color={stage.color} />}
                  {stage.label}
                </>
            }
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 3 }}>
            {searching
              ? [
                  `${list.length} prospecto${list.length !== 1 ? 's' : ''}`,
                  quoteHits.length > 0 ? `${quoteHits.length} cotización${quoteHits.length !== 1 ? 'es' : ''}` : null,
                ].filter(Boolean).join(' · ')
              : stage.isRepository
                ? 'Prospectos archivados — reactivables'
                : `Mínimo ${stage.min} visita${stage.min > 1 ? 's' : ''} · ${fmt(totalValue)} potencial`
            }
          </div>
        </div>
        {!stage.isRepository && !searching && (
          <Button icon={addIcon} onClick={openAdd} style={{ flexShrink: 0 }}>{addLabel}</Button>
        )}
      </div>

      {/* Cards */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : loadError ? (
          <Card>
            <Empty icon="wifi-off">
              No se pudo cargar
              <div style={{ marginTop: 14 }}>
                <Button icon="refresh" onClick={loadProspects}>Reintentar</Button>
              </div>
            </Empty>
          </Card>
        ) : (list.length === 0 && quoteHits.length === 0) ? (
          <Card>
            <Empty icon={searching ? 'search' : 'layout-kanban'}>
              {searching ? `Sin resultados para "${searchQuery}"` : 'Sin prospectos en esta etapa'}
              <div style={{ marginTop: 14 }}>
                {searching ? (
                  <Button variant="soft" onClick={() => setSearchQuery('')}>Limpiar búsqueda</Button>
                ) : (
                  <Button icon={addIcon} onClick={openAdd}>
                    {activeStage === 'cotizacion' ? 'Nueva cotización' : 'Añadir el primero'}
                  </Button>
                )}
              </div>
            </Empty>
          </Card>
        ) : (
          <>
            {/* Prospectos */}
            {searching && list.length > 0 && (
              <Label style={{ margin: '4px 4px 0' }}>Prospectos ({list.length})</Label>
            )}
            {list.map(p => (
              <ProspectCard
                key={p.id} p={p}
                onAction={setActionTarget} onAdvance={handleMoveStage} onODP={setOdpProspect}
                showStage={searching}
              />
            ))}

            {/* Cotizaciones */}
            {quoteHits.length > 0 && (
              <>
                <Label style={{ margin: '10px 4px 0' }}>Cotizaciones ({quoteHits.length})</Label>
                {quoteHits.map(qt => (
                  <QuoteResultCard
                    key={qt.id} q={qt}
                    onOpenProspect={pid => {
                      const target = prospects.find(p => p.id === pid)
                      if (target) { setSearchQuery(''); setShowSearch(false); setActiveStage(target.stage) }
                    }}
                    onLinkQuote={setLinkQuote}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {linkQuote && (
        <LinkQuoteModal
          quote={linkQuote}
          prospects={prospects}
          onClose={() => setLinkQuote(null)}
          onCreate={handleCreateProspectForQuote}
          onLink={handleLinkQuoteToProspect}
        />
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
          onCheckIn={onCheckIn}
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
            onGenerated={async (_name, total) => {
              if (quoteProspect?.id && total > 0) {
                await supabase.from('prospects').update({ value: total }).eq('id', quoteProspect.id)
              }
              setShowProposalQuote(false)
              setQuoteProspect(null)
              loadProspects()
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
