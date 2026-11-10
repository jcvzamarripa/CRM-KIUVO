import React, { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Sheet, Label, Segmented, Empty, Bone } from '../ui'
import { STAGE_BY_ID } from '../../constants/stages'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_SHORT  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EVENT_TYPES = [
  { id: 'visit',   label: 'Visita',   tone: 'sky',     icon: 'map-pin'        },
  { id: 'call',    label: 'Llamada',  tone: 'success', icon: 'phone'          },
  { id: 'meeting', label: 'Reunión',  tone: 'warning', icon: 'users'          },
  { id: 'other',   label: 'Otro',     tone: undefined, icon: 'calendar-event' },
]
const TYPE_BY_ID = Object.fromEntries(EVENT_TYPES.map(t => [t.id, t]))

const GC_TOKEN_KEY     = 'kiuvo_gc_token'
const GC_CONNECTED_KEY = 'kiuvo_gc_connected'
const NOTIFIED_KEY     = 'kiuvo_notified_ids'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function sameDay(a, b) { return dateKey(a) === dateKey(b) }

function fmtTime(d) {
  const h = d.getHours(), m = d.getMinutes()
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
  const mm  = m.toString().padStart(2, '0')
  return { hh: `${hh}:${mm}`, ampm: h >= 12 ? 'PM' : 'AM' }
}

// Mapeo de tipos entre AgendaScreen y agenda_events (tabla Supabase)
const TYPE_TO_DB   = { visit: 'visita', call: 'llamada', meeting: 'reunion', other: 'visita' }
const TYPE_FROM_DB = { visita: 'visit', llamada: 'call', cotizacion: 'meeting', cierre: 'visit', reunion: 'meeting' }

function normalize(row) {
  // Soporta tanto el formato antiguo (starts_at) como el nuevo (date + start_time)
  let startDate
  if (row.starts_at) {
    startDate = new Date(row.starts_at)
  } else {
    const [y, m, d]   = (row.date || '2000-01-01').split('-').map(Number)
    const [h, mi]     = (row.start_time || '09:00').split(':').map(Number)
    startDate         = new Date(y, m - 1, d, h, mi)
  }
  const endDate = row.end_time
    ? (() => {
        const [y, m, d] = (row.date || '2000-01-01').split('-').map(Number)
        const [eh, emi] = row.end_time.split(':').map(Number)
        return new Date(y, m - 1, d, eh, emi)
      })()
    : null
  const duration = endDate
    ? Math.max(15, Math.round((endDate - startDate) / 60000))
    : (row.duration || 60)

  return {
    id:       row.id,
    title:    row.name  || row.title  || '',
    type:     TYPE_FROM_DB[row.type] || row.type || 'visit',
    date:     startDate,
    duration,
    address:  row.address  || '',
    notes:    row.notes    || '',
    activity: row.contact  || row.activity || '',
    stage:    row.stage    || null,
    source:   'local',
    notified: false,
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonEvent() {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 76 }}>
      <div style={{ minWidth: 58, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Bone w={46} h={20} />
        <Bone w={24} h={12} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Bone w="60%" h={16} />
        <Bone w={70} h={20} r={99} />
      </div>
    </Card>
  )
}

// ─── MonthYearPicker ──────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function MonthYearPicker({ year, month, onSelect, onClose }) {
  const [pickerYear, setPickerYear] = useState(year)
  const today = new Date()

  return (
    <>
      <div className="k-sheet__backdrop" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Elegir mes" style={{
        position: 'fixed', zIndex: 301, left: '50%', top: 72, transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 28px))',
        background: 'var(--bg)', color: 'var(--fg)',
        borderRadius: 'var(--r-xl)', padding: 16, boxShadow: 'var(--shadow-float)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <IconButton icon="chevron-left" label="Año anterior" onClick={() => setPickerYear(y => y - 1)} />
          <div className="k-h2">{pickerYear}</div>
          <IconButton icon="chevron-right" label="Año siguiente" onClick={() => setPickerYear(y => y + 1)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MONTHS_SHORT.map((m, i) => {
            const isSelected = i === month && pickerYear === year
            const isToday    = i === today.getMonth() && pickerYear === today.getFullYear()
            return (
              <button key={m} onClick={() => { onSelect(pickerYear, i); onClose() }} aria-pressed={isSelected} style={{
                minHeight: 48, borderRadius: 'var(--r-full)',
                background: isSelected ? 'var(--primary-bg)' : 'var(--surface)',
                color: isSelected ? 'var(--primary-fg)' : 'var(--fg)',
                boxShadow: isToday && !isSelected ? 'inset 0 0 0 2px var(--fg)' : 'none',
                fontSize: 15, fontWeight: isSelected || isToday ? 600 : 500,
              }}>
                {m}
              </button>
            )
          })}
        </div>
        <Button variant="soft" block onClick={onClose} style={{ marginTop: 14 }}>Cancelar</Button>
      </div>
    </>
  )
}

// ─── GoogleColorIcon ──────────────────────────────────────────────────────────

function GoogleColorIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────

function WeekStrip({ selected, onChange, events, viewYear, viewMonth: viewMonthIdx }) {
  const containerRef = useRef(null)
  const selRef       = useRef(null)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayKey = dateKey(today)
  const selKey   = dateKey(selected)

  const daysInMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(viewYear, viewMonthIdx, i + 1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const eventDays = new Set(events.map(e => dateKey(e.date)))

  useEffect(() => {
    if (selRef.current && containerRef.current) {
      const el  = selRef.current
      const box = containerRef.current
      box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
    }
  }, [selKey, viewMonthIdx, viewYear])

  return (
    <div ref={containerRef} style={{ overflowX: 'auto', display: 'flex', gap: 6, padding: '6px 14px 10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {days.map(d => {
        const key   = dateKey(d)
        const isTod = key === todayKey
        const isSel = key === selKey
        const past  = d < today

        return (
          <button
            key={key}
            ref={isSel ? selRef : null}
            onClick={() => onChange(new Date(d))}
            aria-pressed={isSel}
            style={{
              flexShrink: 0, width: 52, minHeight: 78,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              borderRadius: 'var(--r-lg)',
              background: isSel ? 'var(--primary-bg)' : 'var(--surface)',
              color: isSel ? 'var(--primary-fg)' : past ? 'var(--fg-tertiary)' : 'var(--fg)',
              boxShadow: isTod && !isSel ? 'inset 0 0 0 2px var(--fg)' : 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, opacity: isSel ? 0.8 : 1, color: isSel ? 'inherit' : 'var(--fg-tertiary)' }}>
              {DAYS_SHORT[d.getDay()]}
            </span>
            <span className="k-display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
              {d.getDate()}
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: eventDays.has(key) ? 'currentColor' : 'transparent',
            }} />
          </button>
        )
      })}
    </div>
  )
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onPress }) {
  const type  = TYPE_BY_ID[event.type] || TYPE_BY_ID.other
  const stage = event.stage ? STAGE_BY_ID[event.stage] : null
  const past  = event.date < new Date()
  const { hh, ampm } = fmtTime(event.date)

  return (
    <button onClick={() => onPress(event)} className="k-card" style={{
      width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14, minHeight: 76,
      opacity: past ? 0.6 : 1,
    }}>
      <div style={{ minWidth: 58 }}>
        <div className="k-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{hh}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 3 }}>{ampm}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.title}
        </div>

        {event.activity && (
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 2 }}>{event.activity}</div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <Pill tone={type.tone} icon={type.icon}>{type.label}</Pill>
          {stage && (
            <Pill>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
              {stage.label}
            </Pill>
          )}
          {event.source === 'google' && <Pill><GoogleColorIcon size={12} /> Google</Pill>}
        </div>

        {event.address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: 'var(--fg-secondary)' }}>
            <Icon name="map-pin" size={14} />
            <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.address}</span>
          </div>
        ) : null}
      </div>

      <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />
    </button>
  )
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

function AddEventModal({ initialDate, prefill, onSave, onClose }) {
  const { user } = useAuth()
  const pad  = n => n.toString().padStart(2, '0')
  const toDateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const [title,          setTitle]          = useState(prefill?.title || '')
  const [type,           setType]           = useState(prefill?.type  || 'visit')
  const [dateVal,        setDateVal]        = useState(toDateInput(initialDate))
  const [timeVal,        setTimeVal]        = useState('09:00')
  const [duration,       setDuration]       = useState(60)
  const [address,        setAddress]        = useState('')
  const [notes,          setNotes]          = useState('')

  // Prospect picker state
  const [prospects,        setProspects]        = useState([])
  const [prospectQuery,    setProspectQuery]    = useState('')
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showDropdown,     setShowDropdown]     = useState(false)
  const [prospectMode,     setProspectMode]     = useState('search') // 'search' | 'new'

  // Load prospects once
  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from('prospects')
      .select('id, name, phone, address, stage_id')
      .eq('owner_id', user.id)
      .order('name')
      .then(({ data }) => setProspects(data ?? []))
  }, [user?.id])

  const matches = prospects
    .filter(p => p.name.toLowerCase().includes(prospectQuery.toLowerCase()))
    .slice(0, 6)

  function selectProspect(p) {
    setSelectedProspect(p)
    setProspectQuery(p.name)
    if (!title) setTitle(p.name)
    if (!address && p.address) setAddress(p.address)
    setShowDropdown(false)
  }

  function clearProspect() {
    setSelectedProspect(null)
    setProspectQuery('')
  }

  function handleSave() {
    const finalTitle = prospectMode === 'new'
      ? (title.trim() || prospectQuery.trim())
      : title.trim()
    if (!finalTitle) return
    const [y, mo, dd] = dateVal.split('-').map(Number)
    const [h, mi]     = timeVal.split(':').map(Number)
    onSave({
      id: `tmp-${Date.now()}`,
      title: finalTitle, type,
      date: new Date(y, mo - 1, dd, h, mi),
      duration, address, notes,
      prospect_id: selectedProspect?.id ?? null,
      activity: '', stage: selectedProspect
        ? (STAGE_BY_ID[selectedProspect.stage_id]?.label ?? null)
        : null,
      source: 'local', notified: false,
    })
    onClose()
  }

  const canSave = prospectMode === 'search'
    ? title.trim()
    : (title.trim() || prospectQuery.trim())

  const hint = { fontSize: 13, color: 'var(--fg-secondary)', marginTop: 6 }
  const block = { marginBottom: 20 }

  return (
    <Sheet
      title="Nuevo evento"
      onClose={onClose}
      footer={
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <Button variant="soft" size="lg" onClick={onClose}>Cancelar</Button>
          <Button size="lg" icon="check" onClick={handleSave} disabled={!canSave}>Guardar evento</Button>
        </div>
      }
    >
      {/* ── Prospect picker ── */}
      <div style={block}>
        <Label>Prospecto</Label>

        <Segmented
          size="lg"
          surface
          value={prospectMode}
          onChange={id => { setProspectMode(id); clearProspect() }}
          options={[
            { id: 'search', label: 'Existente',     icon: 'search' },
            { id: 'new',    label: 'Nuevo / libre', icon: 'plus' },
          ]}
          style={{ marginBottom: 10 }}
        />

        {prospectMode === 'search' ? (
          <div style={{ position: 'relative' }}>
            {selectedProspect ? (
              <Card style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 16px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_BY_ID[selectedProspect.stage_id]?.color ?? 'var(--fg-tertiary)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedProspect.name}
                  </div>
                  {selectedProspect.phone && (
                    <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>{selectedProspect.phone}</div>
                  )}
                </div>
                <IconButton icon="x" label="Quitar prospecto" variant="soft" onClick={clearProspect} />
              </Card>
            ) : (
              <>
                <label className="k-search">
                  <Icon name="search" size={18} />
                  <input
                    className="k-input"
                    value={prospectQuery}
                    onChange={e => { setProspectQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder="Buscar prospecto existente…"
                  />
                </label>
                {showDropdown && matches.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: 'var(--surface)', borderRadius: 'var(--r-lg)', marginTop: 6,
                    maxHeight: 240, overflowY: 'auto', boxShadow: 'var(--shadow-float)',
                  }}>
                    {matches.map(p => {
                      const s = STAGE_BY_ID[p.stage_id]
                      return (
                        <button key={p.id} onMouseDown={() => selectProspect(p)} className="k-row">
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: s?.color ?? 'var(--fg-tertiary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            {s && <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>{s.label}</div>}
                          </div>
                          {p.phone && <span style={{ fontSize: 13, color: 'var(--fg-tertiary)', flexShrink: 0 }}>{p.phone}</span>}
                        </button>
                      )
                    })}
                    {prospectQuery && matches.length === 0 && (
                      <div style={{ padding: '14px 16px', fontSize: 14, color: 'var(--fg-tertiary)' }}>
                        Sin resultados — cambia a "Nuevo / libre"
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <input
            className="k-input"
            value={prospectQuery}
            onChange={e => setProspectQuery(e.target.value)}
            placeholder="Nombre del nuevo cliente…"
          />
        )}
      </div>

      {/* ── Título del evento ── */}
      <div style={block}>
        <Label>Título del evento *</Label>
        <input
          className="k-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={selectedProspect ? selectedProspect.name : 'Ej. Presentación de producto'}
        />
        {selectedProspect && !title && (
          <div style={hint}>Se usará el nombre del prospecto si lo dejas vacío</div>
        )}
      </div>

      {/* ── Tipo ── */}
      <div style={block}>
        <Label>Tipo</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {EVENT_TYPES.map(t => (
            <Chip key={t.id} selected={type === t.id} onClick={() => setType(t.id)}
              style={{ flexDirection: 'column', gap: 4, minHeight: 64, padding: '8px 4px', borderRadius: 'var(--r-md)', fontSize: 13 }}>
              <Icon name={t.icon} size={22} />
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Fecha y hora ── */}
      <div style={{ ...block, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label>Fecha</Label>
          <input type="date" className="k-input" value={dateVal} onChange={e => setDateVal(e.target.value)} />
        </div>
        <div>
          <Label>Hora</Label>
          <input type="time" className="k-input" value={timeVal} onChange={e => setTimeVal(e.target.value)} />
        </div>
      </div>

      {/* ── Duración ── */}
      <div style={block}>
        <Label>Duración</Label>
        <select className="k-input" value={duration} onChange={e => setDuration(Number(e.target.value))}>
          {[15,30,45,60,90,120].map(v => (
            <option key={v} value={v}>{v < 60 ? `${v} minutos` : v === 60 ? '1 hora' : `${v/60} horas`}</option>
          ))}
        </select>
      </div>

      {/* ── Dirección ── */}
      <div style={block}>
        <Label>Dirección (opcional)</Label>
        <input className="k-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, colonia..." />
        {selectedProspect?.address && !address && (
          <Button variant="soft" size="sm" icon="map-pin" onClick={() => setAddress(selectedProspect.address)} style={{ marginTop: 8 }}>
            Usar dirección del prospecto
          </Button>
        )}
      </div>

      {/* ── Notas ── */}
      <div>
        <Label>Notas (opcional)</Label>
        <textarea className="k-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Objetivo, qué llevar..." />
      </div>
    </Sheet>
  )
}

// ─── EventDetailSheet ─────────────────────────────────────────────────────────

function EventDetailSheet({ event, onClose, onDelete }) {
  const type  = TYPE_BY_ID[event.type] || TYPE_BY_ID.other
  const stage = event.stage ? STAGE_BY_ID[event.stage] : null
  const { hh, ampm } = fmtTime(event.date)

  return (
    <Sheet
      title={event.title}
      onClose={onClose}
      footer={event.source === 'local' && (
        <Button variant="danger" block size="lg" icon="trash" onClick={() => { onDelete(event.id); onClose() }}>
          Eliminar evento
        </Button>
      )}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <Pill tone={type.tone} icon={type.icon}>{type.label}</Pill>
        {stage && (
          <Pill>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
            {stage.label}
          </Pill>
        )}
      </div>

      {event.activity && <div style={{ fontSize: 16, color: 'var(--fg-secondary)', marginBottom: 14 }}>{event.activity}</div>}

      <Card flush>
        <div className="k-row">
          <Icon name="clock" size={22} color="var(--fg-tertiary)" />
          <div>
            <div className="k-display" style={{ fontSize: 20, fontWeight: 700 }}>{hh} {ampm}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>{event.duration} min de duración</div>
          </div>
        </div>

        {event.address ? (
          <div className="k-row">
            <Icon name="map-pin" size={22} color="var(--fg-tertiary)" />
            <span style={{ fontSize: 15, flex: 1 }}>{event.address}</span>
          </div>
        ) : null}

        {event.notes ? (
          <div className="k-row" style={{ alignItems: 'flex-start' }}>
            <Icon name="notes" size={22} color="var(--fg-tertiary)" />
            <span style={{ fontSize: 15, flex: 1, lineHeight: 1.5 }}>{event.notes}</span>
          </div>
        ) : null}

        {event.source === 'google' && (
          <div className="k-row">
            <GoogleColorIcon size={22} />
            <span style={{ fontSize: 15, color: 'var(--fg-secondary)' }}>Importado de Google Calendar</span>
          </div>
        )}
      </Card>
    </Sheet>
  )
}

// ─── GoogleConnectSheet ───────────────────────────────────────────────────────

function GoogleConnectSheet({ connected, onConnect, onDisconnect, onClose, loading }) {
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  return (
    <Sheet title="Google Calendar" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!hasClientId && (
          <div style={{ padding: 16, background: 'var(--warning-bg)', color: 'var(--warning-fg)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Configuración requerida</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              Agrega tu Client ID en el archivo <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)', padding: '1px 5px', borderRadius: 4 }}>.env</code>:
            </div>
            <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--ink)', color: 'var(--accent)', borderRadius: 'var(--r-md)', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
              VITE_GOOGLE_CLIENT_ID=tu_client_id
            </div>
            <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              1. Ve a <strong>console.cloud.google.com</strong>{'\n'}
              2. APIs y Servicios → Credenciales{'\n'}
              3. Crear → ID de cliente OAuth 2.0{'\n'}
              4. Tipo: Aplicación web{'\n'}
              5. Activa la <strong>Google Calendar API</strong>
            </div>
          </div>
        )}

        {connected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--success-bg)', color: 'var(--success-fg)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GoogleColorIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Conectado</div>
                <div style={{ fontSize: 14, marginTop: 1 }}>Sincronizando tu Google Calendar</div>
              </div>
              <Icon name="check" size={22} />
            </div>
            <Button variant="danger" block size="lg" onClick={onDisconnect}>Desconectar Google Calendar</Button>
          </>
        ) : (
          <button onClick={onConnect} disabled={loading} className="k-card" style={{
            width: '100%', textAlign: 'left', minHeight: 76,
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: loading ? 0.7 : 1,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {loading
                ? <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader-2" size={24} color="var(--fg-secondary)" /></span>
                : <GoogleColorIcon size={24} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {loading ? 'Conectando...' : 'Conectar Google Calendar'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 1 }}>
                Importa eventos y recibe avisos en tu celular
              </div>
            </div>
            {!loading && <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />}
          </button>
        )}

        <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.6 }}>
          Al conectar, KIUVO CRM puede leer y crear eventos en tu Google Calendar. Los eventos se sincronizan solo en este dispositivo.
        </div>
      </div>
    </Sheet>
  )
}

// ─── AgendaScreen (main export) ───────────────────────────────────────────────

function mockAgendaToEvent(a) {
  // Formato real de Supabase (viene de useAgendaEvents: tiene .start y .date string)
  if (a.start) {
    const [h, m]     = (a.start || '00:00').split(':').map(Number)
    const parts      = (a.date || '').split('-').map(Number)
    const date       = parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2], h, m)
      : new Date()
    return {
      id:       a.id || `dash-${a.name}-${h}-${m}`,
      title:    a.name    || '',
      type:     TYPE_FROM_DB[a.type] || 'visit',
      date,
      duration: 60,
      activity: a.contact || '',
      address:  a.address || '',
      notes:    a.notes   || '',
      stage:    a.stage   || null,
      source:   'local',
      notified: false,
    }
  }

  // Formato legacy de mock dashboard (tiene .time y .ampm)
  const [h, m] = (a.time || '00:00').split(':').map(Number)
  let hours = h
  if (a.ampm === 'PM' && h !== 12) hours = h + 12
  if (a.ampm === 'AM' && h === 12) hours = 0
  const date = new Date(); date.setHours(hours, m, 0, 0)
  return {
    id:       `dash-${a.name}-${hours}-${m}`,
    title:    a.name     || '',
    type:     'visit',
    date,
    duration: 60,
    activity: a.activity || '',
    address:  a.address  || '',
    stage:    a.stage    || null,
    source:   'local',
    notified: false,
  }
}

export default function AgendaScreen({ pendingEvent, onClearPending, prefillEvent, onClearPrefill }) {
  const { user } = useAuth()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const [selected,       setSelected]       = useState(new Date())
  const [viewYear,       setViewYear]       = useState(new Date().getFullYear())
  const [viewMonth,      setViewMonth]      = useState(new Date().getMonth())
  const [showMonthPick,  setShowMonthPick]  = useState(false)
  const [events,         setEvents]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [filter,         setFilter]         = useState('all')
  const [showAdd,        setShowAdd]        = useState(false)
  const [addPrefill,     setAddPrefill]     = useState(null)
  const [showGoogle,     setShowGoogle]     = useState(false)
  const [showDetail,     setShowDetail]     = useState(null)
  const [gcConnected,    setGcConnected]    = useState(() => localStorage.getItem(GC_CONNECTED_KEY) === 'true')
  const [gcToken,        setGcToken]        = useState(() => localStorage.getItem(GC_TOKEN_KEY) || null)
  const [gcLoading,      setGcLoading]      = useState(false)
  const [syncError,      setSyncError]      = useState(null)
  const [saveError,      setSaveError]      = useState(null)
  const [notifOk,        setNotifOk]        = useState(() => {
    try { return typeof Notification !== 'undefined' && Notification.permission === 'granted' }
    catch { return false }
  })
  const notifiedRef = useRef(new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')))

  // ── Load from Supabase (tabla agenda_events) ─────────────────────
  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSaveError('Modo demo activo: los eventos no se guardan en la nube. Configura las variables de entorno de Supabase.')
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('agenda_events')
      .select('id, date, start_time, end_time, type, name, contact, seller_id, stage, address, notes, prospect_id')
      .eq('seller_id', user.id)
      .order('date',       { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.warn('[AgendaScreen] load error:', error.message, error.code)
      setSaveError(`Error al cargar eventos: ${error.message}`)
    }
    setEvents(prev => [
      ...(data ?? []).map(normalize),
      ...prev.filter(e => e.source === 'google'),
    ])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Refetch cuando el usuario regresa a la app (móvil en background)
  useEffect(() => {
    function onVisible() { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // ── Realtime (agenda_events) ──────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const ch = supabase
      .channel(`agenda-events-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agenda_events',
        filter: `seller_id=eq.${user.id}`,
      }, ({ eventType, new: row, old: oldRow }) => {
        if (eventType === 'INSERT') {
          setEvents(prev =>
            prev.some(e => e.id === row.id)
              ? prev
              : [...prev, normalize(row)].sort((a, b) => a.date - b.date)
          )
        } else if (eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === row.id ? normalize(row) : e))
        } else if (eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== oldRow.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user.id])

  // ── Open event detail from Dashboard ─────────────────────────────
  useEffect(() => {
    if (!pendingEvent) return
    const converted = mockAgendaToEvent(pendingEvent)
    const match = events.find(e => e.title === converted.title && sameDay(e.date, converted.date))
    setShowDetail(match || converted)
    onClearPending?.()
  }, [pendingEvent]) // eslint-disable-line

  // ── Open AddEventModal pre-filled (from Reactivador) ─────────────
  useEffect(() => {
    if (!prefillEvent) return
    setAddPrefill(prefillEvent)
    setShowAdd(true)
    onClearPrefill?.()
  }, [prefillEvent]) // eslint-disable-line

  // ── Notification polling ──────────────────────────────────────────
  useEffect(() => {
    if (!notifOk) return
    function check() {
      const now = new Date()
      events.forEach(ev => {
        const diff = ev.date - now
        if (diff > 0 && diff <= 15 * 60 * 1000 && !notifiedRef.current.has(ev.id)) {
          const mins = Math.round(diff / 60000)
          try {
            new Notification(`⏰ ${ev.title}`, {
              body: `${ev.activity || ev.type} · en ${mins} min${ev.address ? '\n' + ev.address : ''}`,
              icon: '/kiuvo.svg',
              tag: ev.id,
            })
          } catch (_) {}
          notifiedRef.current.add(ev.id)
          localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedRef.current]))
        }
      })
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [notifOk, events])

  // ── Google Calendar sync ──────────────────────────────────────────
  useEffect(() => {
    if (gcConnected && gcToken) doSync(gcToken)
  }, []) // eslint-disable-line

  async function doSync(token) {
    try {
      const from = new Date(); from.setDate(from.getDate() - 7)
      const to   = new Date(); to.setDate(to.getDate() + 30)
      const { fetchEvents: gcFetch } = await import('../../lib/googleCalendar')
      const googleEvs = await gcFetch(token, 'primary', from, to)
      setEvents(prev => [...prev.filter(e => e.source === 'local'), ...googleEvs])
      setSyncError(null)
    } catch (err) {
      if (/401|403/.test(err.message)) {
        setGcConnected(false); setGcToken(null)
        localStorage.removeItem(GC_TOKEN_KEY); localStorage.removeItem(GC_CONNECTED_KEY)
      }
      setSyncError('No se pudo sincronizar Google Calendar')
    }
  }

  async function handleGoogleConnect() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { setSyncError('Configura VITE_GOOGLE_CLIENT_ID en .env'); return }
    setGcLoading(true)
    try {
      const { initGoogleAuth, requestToken } = await import('../../lib/googleCalendar')
      await initGoogleAuth()
      const token = await requestToken(clientId)
      setGcToken(token); setGcConnected(true)
      localStorage.setItem(GC_TOKEN_KEY, token); localStorage.setItem(GC_CONNECTED_KEY, 'true')
      setShowGoogle(false)
      await doSync(token)
    } catch (err) {
      setSyncError('Error al conectar: ' + (err.message || 'Inténtalo de nuevo'))
    } finally {
      setGcLoading(false)
    }
  }

  function handleGoogleDisconnect() {
    setGcConnected(false); setGcToken(null)
    localStorage.removeItem(GC_TOKEN_KEY); localStorage.removeItem(GC_CONNECTED_KEY)
    setEvents(prev => prev.filter(e => e.source === 'local'))
    setShowGoogle(false)
  }

  async function handleRequestNotif() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifOk(perm === 'granted')
  }

  async function handleAddEvent(ev) {
    if (!isSupabaseConfigured || !supabase) {
      setSaveError('Modo demo: no se puede guardar. Ingresa con tu cuenta real de Supabase.')
      return
    }

    // Optimistic
    setEvents(prev => [...prev, ev].sort((a, b) => a.date - b.date))

    // Persist a agenda_events (tabla canónica)
    const pad = n => String(n).padStart(2, '0')
    const d   = ev.date
    const end = new Date(d.getTime() + (ev.duration || 60) * 60000)

    const { data, error } = await supabase
      .from('agenda_events')
      .insert({
        seller_id:   user.id,
        date:        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        start_time:  `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        end_time:    `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        type:        TYPE_TO_DB[ev.type] || 'visita',
        name:        ev.title,
        contact:     '',
        stage:       ev.stage       || '',
        address:     ev.address     || '',
        notes:       ev.notes       || '',
        prospect_id: ev.prospect_id || null,
      })
      .select()
      .single()

    if (!error && data) {
      // Reemplaza el evento temporal con el real (tiene el UUID de Supabase)
      setEvents(prev => prev.map(e => e.id === ev.id ? normalize(data) : e))
      setSaveError(null)
    } else if (error) {
      console.error('[AgendaScreen] handleAddEvent error:', error.message, error)
      setSaveError(`No se pudo guardar el evento: ${error.message}`)
      // Revertir el optimista
      setEvents(prev => prev.filter(e => e.id !== ev.id))
    }

    if (gcConnected && gcToken) {
      import('../../lib/googleCalendar').then(({ createEvent }) =>
        createEvent(gcToken, 'primary', ev).catch(() => {})
      )
    }
  }

  async function handleDeleteEvent(id) {
    if (!isSupabaseConfigured || !supabase) return
    const backup = events.find(e => e.id === id)
    // Optimistic: quitar de la UI
    setEvents(prev => prev.filter(e => e.id !== id))

    const { error, count } = await supabase
      .from('agenda_events')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error || count === 0) {
      // Revertir si falló o RLS bloqueó silenciosamente
      if (backup) setEvents(prev => [...prev, backup].sort((a, b) => a.date - b.date))
      setSaveError('No se pudo eliminar el evento. Verifica que tengas permisos.')
    }
  }

  // ── Month navigation ─────────────────────────────────────────────
  function goToPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function goToNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function goToToday() {
    const now = new Date()
    setSelected(now)
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }

  function handleSelectDay(d) {
    setSelected(d)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  // ── Derived ───────────────────────────────────────────────────────
  const dayEvents = events
    .filter(e => sameDay(e.date, selected))
    .filter(e => filter === 'all' || e.type === filter)
    .sort((a, b) => a.date - b.date)

  const selLabel = (() => {
    if (sameDay(selected, todayStart)) return 'Hoy'
    const tom = new Date(todayStart); tom.setDate(tom.getDate() + 1)
    if (sameDay(selected, tom)) return 'Mañana'
    return `${selected.getDate()} de ${MONTHS_FULL[selected.getMonth()]}`
  })()

  const FILTERS = [
    { id: 'all',     label: 'Todos'    },
    { id: 'visit',   label: 'Visitas'  },
    { id: 'call',    label: 'Llamadas' },
    { id: 'meeting', label: 'Reuniones'},
  ]

  return (
    <div style={{ paddingBottom: 170, minHeight: '100%', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="k-screenhead" style={{ gap: 8 }}>
        <button
          onClick={() => setShowMonthPick(true)}
          title="Seleccionar mes y año"
          className="k-screenhead__title"
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 48, textAlign: 'left' }}
        >
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {MONTHS_FULL[viewMonth]} {viewYear}
          </span>
          <Icon name="selector" size={18} color="var(--fg-tertiary)" />
        </button>
        <IconButton icon="chevron-left" label="Mes anterior" onClick={goToPrevMonth} />
        <IconButton icon="chevron-right" label="Mes siguiente" onClick={goToNextMonth} />
      </div>

      <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button variant="soft" size="sm" icon="calendar-event" onClick={goToToday} title="Ir a hoy"
          style={{ minHeight: 44, background: 'var(--surface)' }}>
          Hoy
        </Button>
        <button onClick={() => setShowGoogle(true)} title="Google Calendar" className="k-btn k-btn--sm" style={{
          minHeight: 44,
          background: gcConnected ? 'var(--success-bg)' : 'var(--surface)',
          color: gcConnected ? 'var(--success-fg)' : 'var(--fg)',
        }}>
          {gcConnected ? <Icon name="calendar-check" size={18} /> : <GoogleColorIcon size={18} />}
          {gcConnected ? 'Google conectado' : 'Google Calendar'}
        </button>
      </div>

      {/* ── Save error ── */}
      {saveError && (
        <div style={{ margin: '0 14px 8px', padding: '12px 8px 12px 16px', background: 'var(--coral-soft)', color: 'var(--coral-fg)', borderRadius: 'var(--r-md)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Error al guardar el evento</div>
            <div>{saveError}</div>
          </div>
          <button onClick={() => setSaveError(null)} aria-label="Cerrar aviso" style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={18} /></button>
        </div>
      )}

      {/* ── Sync error ── */}
      {syncError && (
        <div style={{ margin: '0 14px 8px', padding: '6px 8px 6px 16px', background: 'var(--warning-bg)', color: 'var(--warning-fg)', borderRadius: 'var(--r-md)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>{syncError}</span>
          <button onClick={() => setSyncError(null)} aria-label="Cerrar aviso" style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={18} /></button>
        </div>
      )}

      {/* ── Week strip ── */}
      <WeekStrip selected={selected} onChange={handleSelectDay} events={events} viewYear={viewYear} viewMonth={viewMonth} />

      {/* ── Day label ── */}
      <div style={{ padding: '6px 18px 10px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="k-h2">{selLabel}</span>
        {!loading && dayEvents.length > 0 && (
          <span style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{ padding: '0 14px 12px' }}>
        <Segmented size="lg" surface options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {/* ── Events list ── */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonEvent key={i} />)
        ) : dayEvents.length === 0 ? (
          <Card>
            <Empty icon="calendar-off">
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Sin eventos</div>
              <div style={{ fontSize: 14, marginTop: 2 }}>
                {filter !== 'all' ? 'No hay eventos de este tipo para este día' : 'No hay eventos para este día'}
              </div>
              <Button variant="soft" icon="plus" onClick={() => setShowAdd(true)} style={{ marginTop: 14 }}>
                Agregar evento
              </Button>
            </Empty>
          </Card>
        ) : (
          dayEvents.map(ev => <EventCard key={ev.id} event={ev} onPress={setShowDetail} />)
        )}
      </div>

      {/* ── Banners ── */}
      {!notifOk && (
        <Card style={{ margin: '14px 14px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="k-iconbtn k-iconbtn--soft"><Icon name="bell" size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Activa las notificaciones</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>Recibe un aviso 15 min antes de cada evento</div>
          </div>
          <Button size="sm" onClick={handleRequestNotif} style={{ minHeight: 44 }}>Activar</Button>
        </Card>
      )}

      {!gcConnected && (
        <button onClick={() => setShowGoogle(true)} className="k-card" style={{
          width: 'calc(100% - 28px)', margin: '10px 14px 0', minHeight: 72,
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}>
          <span className="k-iconbtn k-iconbtn--soft"><GoogleColorIcon size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Conectar Google Calendar</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>Sincroniza y recibe notificaciones en tu celular</div>
          </div>
          <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />
        </button>
      )}

      {/* ── FAB ── */}
      <button onClick={() => setShowAdd(true)} className="k-fab" style={{ position: 'fixed' }}>
        <Icon name="plus" size={24} />
        Nuevo evento
      </button>

      {/* ── Modals ── */}
      {showAdd       && <AddEventModal      initialDate={selected}  prefill={addPrefill} onSave={handleAddEvent} onClose={() => { setShowAdd(false); setAddPrefill(null) }}    />}
      {showGoogle    && <GoogleConnectSheet connected={gcConnected} onConnect={handleGoogleConnect} onDisconnect={handleGoogleDisconnect} onClose={() => setShowGoogle(false)} loading={gcLoading} />}
      {showDetail    && <EventDetailSheet   event={showDetail}      onDelete={handleDeleteEvent}   onClose={() => setShowDetail(null)}  />}
      {showMonthPick && <MonthYearPicker    year={viewYear} month={viewMonth} onClose={() => setShowMonthPick(false)} onSelect={(y, m) => { setViewYear(y); setViewMonth(m) }} />}
    </div>
  )
}
