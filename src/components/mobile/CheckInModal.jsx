import React, { useState, useEffect, useMemo, useRef } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Chip, Pill, Label, Card } from '../ui'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { getPosition, distanceM, fmtDistance } from '../../lib/geo'
import { pickPhoto, compressImage } from '../../lib/photo'
import { sendCheckIn, queueCheckIn } from '../../lib/checkin'
import { localDateStr, addDays } from '../../lib/dates'

const PROSPECTS_CACHE_KEY = 'kiuvo_prospects_cache'
const NEAR_M = 200

const TYPES = [
  { id: 'visit',    label: 'Visita',   icon: 'map-pin' },
  { id: 'call',     label: 'Llamada',  icon: 'phone' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'brand-whatsapp' },
  { id: 'email',    label: 'Email',    icon: 'mail' },
]

const OUTCOMES = [
  { id: 'no_estaba',   label: 'No estaba el encargado', icon: 'user-off',         next: 'visit' },
  { id: 'volver',      label: 'Pidió que regrese',      icon: 'rotate-clockwise', next: 'visit' },
  { id: 'cita',        label: 'Agendó cita',            icon: 'calendar-time',    next: 'visit' },
  { id: 'cotizacion',  label: 'Pidió cotización',       icon: 'file-invoice',     next: 'quote' },
  { id: 'venta',       label: 'Venta cerrada',          icon: 'cash',             next: null },
  { id: 'no_interesa', label: 'No le interesa',         icon: 'thumb-down',       next: null },
]

const LOSS_REASONS = ['Precio', 'Ya tiene proveedor', 'No lo necesita', 'No decide él', 'Otro']

const NEXT_STEPS = [
  { id: 'visit',    label: 'Volver a visitar',  title: 'Volver a visitar' },
  { id: 'call',     label: 'Llamar',            title: 'Llamar' },
  { id: 'quote',    label: 'Enviar cotización', title: 'Enviar cotización' },
  { id: 'whatsapp', label: 'WhatsApp',          title: 'Mandar WhatsApp' },
]

const WHEN = [
  { id: 'today',    label: 'Hoy',         days: 0 },
  { id: 'tomorrow', label: 'Mañana',      days: 1 },
  { id: 'three',    label: 'En 3 días',   days: 3 },
  { id: 'week',     label: 'En 1 semana', days: 7 },
]

function readCache() {
  try { return JSON.parse(localStorage.getItem(PROSPECTS_CACHE_KEY) || '[]') } catch { return [] }
}

export default function CheckInModal({ onClose, onSaved, initialProspect = null, initialType = 'visit' }) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()

  const [type,       setType]       = useState(initialType)
  const [prospects,  setProspects]  = useState(initialProspect ? [initialProspect] : [])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState(initialProspect?.id ?? null)
  const [search,     setSearch]     = useState('')
  const [gps,        setGps]        = useState({ status: 'loading' })
  const [photo,      setPhoto]      = useState(null) // { blob, url }
  const [outcome,    setOutcome]    = useState(null)
  const [lossReason, setLossReason] = useState(null)
  const [nextStep,   setNextStep]   = useState(null)
  const [when,       setWhen]       = useState(null)
  const [customDate, setCustomDate] = useState('')
  const [note,       setNote]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState(null) // { offline, verification, distance_m }
  const photoUrlRef = useRef(null)

  const isVisit = type === 'visit'

  // ── Prospectos del vendedor (con caché para trabajar sin señal) ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isOnline || !isSupabaseConfigured) {
        setProspects(p => (p.length > 1 ? p : mergeInitial(readCache())))
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, stage_id, lat, lng, address')
        .eq('owner_id', user.id)
        .order('name')
        .then(r => r, () => ({ data: null, error: true }))
      if (cancelled) return
      if (error || !data) {
        setProspects(mergeInitial(readCache()))
      } else {
        setProspects(data)
        try { localStorage.setItem(PROSPECTS_CACHE_KEY, JSON.stringify(data)) } catch { /* sin espacio */ }
      }
      setLoading(false)
    }
    function mergeInitial(list) {
      if (!initialProspect || list.some(p => p.id === initialProspect.id)) return list
      return [initialProspect, ...list]
    }
    load()
    return () => { cancelled = true }
  }, [user.id, isOnline, initialProspect])

  // ── GPS: arranca solo al abrir ──
  const locate = () => {
    setGps({ status: 'loading' })
    getPosition()
      .then(pos => setGps({ status: 'ok', ...pos }))
      .catch(err => setGps({ status: err.code === 1 ? 'denied' : 'error' }))
  }
  useEffect(() => { locate() }, [])

  useEffect(() => () => { if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current) }, [])

  const here = gps.status === 'ok' ? gps : null

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = prospects
      .filter(p => !q || p.name?.toLowerCase().includes(q))
      .map(p => ({ ...p, dist: here && p.lat != null ? distanceM(here, { lat: Number(p.lat), lng: Number(p.lng) }) : null }))
    if (here) rows.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    return rows
  }, [prospects, search, here])

  const selected = useMemo(() => {
    const p = prospects.find(x => x.id === selectedId)
    if (!p) return null
    return { ...p, dist: here && p.lat != null ? distanceM(here, { lat: Number(p.lat), lng: Number(p.lng) }) : null }
  }, [prospects, selectedId, here])

  async function takePhoto() {
    const file = await pickPhoto()
    if (!file) return
    const blob = await compressImage(file)
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    const url = URL.createObjectURL(blob)
    photoUrlRef.current = url
    setPhoto({ blob, url })
  }

  function chooseOutcome(o) {
    setOutcome(o.id)
    setNextStep(o.next)
    if (o.id !== 'no_interesa') setLossReason(null)
    if (!o.next) { setWhen(null); setCustomDate('') }
  }

  const outcomeDef   = OUTCOMES.find(o => o.id === outcome)
  const needsNext    = isVisit && !!outcomeDef?.next
  const dueDate      = customDate || (when ? localDateStr(addDays(WHEN.find(w => w.id === when).days)) : null)

  const missing = []
  if (!selected) missing.push('elige el prospecto')
  if (isVisit) {
    if (!photo) missing.push('toma la foto')
    if (!outcome) missing.push('marca el resultado')
    if (outcome === 'no_interesa' && !lossReason) missing.push('indica el motivo')
    if (needsNext && (!nextStep || !dueDate)) missing.push('define el próximo paso')
    if (gps.status === 'loading') missing.push('espera la ubicación')
  } else if (nextStep && !dueDate) {
    missing.push('elige cuándo')
  }
  const canSubmit = missing.length === 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)

    const visitId = crypto.randomUUID()
    const visit = {
      id:          visitId,
      prospect_id: selected.id,
      seller_id:   user.id,
      kind:        type,
      notes:       note.trim() || null,
      created_at:  new Date().toISOString(),
      ...(isVisit && {
        lat:         here?.lat ?? null,
        lng:         here?.lng ?? null,
        accuracy_m:  here?.accuracy ?? null,
        outcome,
        loss_reason: outcome === 'no_interesa' ? lossReason : null,
      }),
    }
    const step = NEXT_STEPS.find(s => s.id === nextStep)
    const task = step && dueDate ? {
      id:          crypto.randomUUID(),
      seller_id:   user.id,
      created_by:  user.id,
      prospect_id: selected.id,
      visit_id:    visitId,
      kind:        step.id,
      title:       `${step.title} · ${selected.name}`,
      due_date:    dueDate,
    } : null
    const photoBlob = isVisit ? photo?.blob ?? null : null

    const localVerdict = !isVisit ? null
      : !here ? 'no_gps'
      : selected.dist == null ? 'no_reference'
      : selected.dist > NEAR_M + (here.accuracy || 0) ? 'far' : 'verified'

    try {
      if (!isOnline || !isSupabaseConfigured) throw new Error('offline')
      const server = await sendCheckIn({ visit, task, photoBlob })
      setResult({ offline: false, verification: server?.verification ?? localVerdict, distance_m: server?.distance_m ?? selected.dist })
    } catch {
      await queueCheckIn({ visit, task, photoBlob })
      setResult({ offline: true, verification: localVerdict, distance_m: selected.dist })
    }
    setSubmitting(false)
    onSaved?.()
  }

  if (result) {
    return (
      <Sheet title="Listo" onClose={onClose} footer={<Button block size="lg" onClick={onClose}>Continuar</Button>}>
        <ResultView result={result} isVisit={isVisit} prospect={selected} task={nextStep && dueDate} />
      </Sheet>
    )
  }

  return (
    <Sheet
      full
      title={isVisit ? 'Check-in' : 'Registrar actividad'}
      onClose={onClose}
      footer={
        <>
          {missing.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', marginBottom: 10 }}>
              Falta: {missing.join(' · ')}
            </div>
          )}
          <Button block size="lg" icon={isVisit ? 'map-pin-check' : 'check'} loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            {isVisit ? 'Registrar visita' : 'Registrar'}
          </Button>
        </>
      }
    >
      {/* Tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
        {TYPES.map(t => (
          <Chip key={t.id} selected={type === t.id} onClick={() => setType(t.id)}
            style={{ flexDirection: 'column', gap: 4, minHeight: 64, padding: '8px 4px', borderRadius: 'var(--r-md)', fontSize: 13 }}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </Chip>
        ))}
      </div>

      {/* Prospecto */}
      <Label>Prospecto</Label>
      {selected ? (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
            {selected.address && (
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.address}</div>
            )}
          </div>
          <Button variant="soft" size="sm" onClick={() => setSelectedId(null)}>Cambiar</Button>
        </Card>
      ) : (
        <div style={{ marginBottom: 22 }}>
          <input className="k-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar prospecto…" />
          {here && !search && list.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: '10px 2px 0' }}>Los más cercanos a ti primero</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, maxHeight: 300, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-tertiary)' }}>Cargando…</div>
            ) : list.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-tertiary)' }}>Sin resultados</div>
            ) : list.slice(0, 40).map(p => (
              <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                minHeight: 56, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface)',
              }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                {p.dist != null && <Pill tone={p.dist <= NEAR_M ? 'success' : undefined}>{fmtDistance(p.dist)}</Pill>}
              </button>
            ))}
          </div>
        </div>
      )}

      {isVisit && (
        <>
          {/* Evidencia */}
          <Label>Evidencia</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            <GpsTile gps={gps} selected={selected} onRetry={locate} />
            <PhotoTile photo={photo} onTake={takePhoto} />
          </div>

          {/* Resultado */}
          <Label>¿Qué pasó?</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
            {OUTCOMES.map(o => (
              <Chip key={o.id} tall icon={o.icon} selected={outcome === o.id} onClick={() => chooseOutcome(o)}>
                {o.label}
              </Chip>
            ))}
          </div>

          {outcome === 'no_interesa' && (
            <>
              <Label>Motivo</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                {LOSS_REASONS.map(r => (
                  <Chip key={r} selected={lossReason === r} onClick={() => setLossReason(r)}>{r}</Chip>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Próximo paso */}
      {(!isVisit || outcome) && outcome !== 'no_interesa' && (
        <>
          <Label>Próximo paso{needsNext ? '' : ' (opcional)'}</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {NEXT_STEPS.map(s => (
              <Chip key={s.id} selected={nextStep === s.id}
                onClick={() => setNextStep(n => (n === s.id && !needsNext ? null : s.id))}>
                {s.label}
              </Chip>
            ))}
          </div>
          {nextStep && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {WHEN.map(w => (
                <Chip key={w.id} selected={!customDate && when === w.id} onClick={() => { setWhen(w.id); setCustomDate('') }}>
                  {w.label}
                </Chip>
              ))}
              <input
                type="date" className="k-input" aria-label="Otra fecha"
                min={localDateStr()} value={customDate}
                onChange={e => { setCustomDate(e.target.value); setWhen(null) }}
                style={{ width: 'auto', flex: '1 1 150px', borderRadius: 'var(--r-full)' }}
              />
            </div>
          )}
        </>
      )}

      <Label>Nota (opcional)</Label>
      <textarea className="k-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="¿Algo que recordar de esta visita?" />
    </Sheet>
  )
}

function Tile({ tone, children, onClick }) {
  const bg = { ok: 'var(--success-bg)', warn: 'var(--warning-bg)', bad: 'var(--coral-soft)' }[tone] || 'var(--surface)'
  const fg = { ok: 'var(--success-fg)', warn: 'var(--warning-fg)', bad: 'var(--coral-fg)' }[tone] || 'var(--fg)'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} style={{
      minHeight: 128, padding: 14, borderRadius: 'var(--r-lg)', background: bg, color: fg,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8,
      textAlign: 'left', position: 'relative', overflow: 'hidden',
    }}>
      {children}
    </Tag>
  )
}

function GpsTile({ gps, selected, onRetry }) {
  if (gps.status === 'loading') {
    return (
      <Tile>
        <span className="k-spin" style={{ display: 'inline-flex', alignSelf: 'flex-start' }}><Icon name="loader" size={26} /></span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Ubicando…</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>Mejor al aire libre</div>
        </div>
      </Tile>
    )
  }
  if (gps.status !== 'ok') {
    return (
      <Tile tone="bad" onClick={onRetry}>
        <Icon name="alert-triangle" size={26} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sin ubicación</div>
          <div style={{ fontSize: 13 }}>
            {gps.status === 'denied' ? 'Activa el permiso de ubicación.' : 'Toca para reintentar.'} La visita quedará sin verificar.
          </div>
        </div>
      </Tile>
    )
  }
  const dist = selected?.dist
  const far = dist != null && dist > NEAR_M + (gps.accuracy || 0)
  return (
    <Tile tone={far ? 'warn' : 'ok'} onClick={onRetry}>
      <Icon name={far ? 'alert-triangle' : 'map-pin-check'} size={26} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          {dist == null ? 'Ubicación lista' : far ? `Estás a ${fmtDistance(dist)}` : `En el lugar · ${fmtDistance(dist)}`}
        </div>
        <div style={{ fontSize: 13 }}>
          {far ? 'Lejos del prospecto: quedará marcada.' : `Precisión ±${gps.accuracy} m`}
        </div>
      </div>
    </Tile>
  )
}

function PhotoTile({ photo, onTake }) {
  if (photo) {
    return (
      <Tile onClick={onTake}>
        <img src={photo.url} alt="Foto de la visita" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <span />
        <span className="k-pill k-pill--accent" style={{ position: 'relative', alignSelf: 'flex-start' }}>
          <Icon name="camera" size={13} /> Repetir
        </span>
      </Tile>
    )
  }
  return (
    <Tile onClick={onTake}>
      <Icon name="camera" size={26} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Tomar foto</div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>Fachada o interior del negocio</div>
      </div>
    </Tile>
  )
}

const VERDICT = {
  verified:     { tone: 'accent', icon: 'map-pin-check',  title: 'Visita verificada' },
  no_reference: { tone: 'accent', icon: 'map-pin-check',  title: 'Visita registrada', sub: 'Se guardó esta ubicación como la del prospecto.' },
  far:          { tone: 'warn',   icon: 'alert-triangle', title: 'Registrada lejos del prospecto' },
  no_gps:       { tone: 'warn',   icon: 'alert-triangle', title: 'Registrada sin ubicación', sub: 'Aparecerá como no verificada.' },
  no_photo:     { tone: 'warn',   icon: 'alert-triangle', title: 'Registrada sin foto', sub: 'Aparecerá como no verificada.' },
}

function ResultView({ result, isVisit, prospect, task }) {
  const v = isVisit
    ? (VERDICT[result.verification] || VERDICT.verified)
    : { tone: 'accent', icon: 'check', title: 'Actividad registrada' }
  const warn = v.tone === 'warn'
  return (
    <div style={{ padding: '12px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{
        width: 84, height: 84, borderRadius: '50%',
        background: warn ? 'var(--warning-bg)' : 'var(--accent)', color: warn ? 'var(--warning-fg)' : 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={v.icon} size={40} />
      </div>
      <div className="k-display" style={{ fontSize: 24, fontWeight: 700 }}>{v.title}</div>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', lineHeight: 1.45 }}>
        {prospect?.name}
        {isVisit && result.distance_m != null && <> · a {fmtDistance(result.distance_m)}</>}
        {v.sub && <><br />{v.sub}</>}
        {task && <><br />Quedó una tarea de seguimiento en tu lista.</>}
      </div>
      {result.offline && (
        <Pill tone="warning" icon="cloud-off">Sin conexión · se enviará sola al volver la señal</Pill>
      )}
    </div>
  )
}
