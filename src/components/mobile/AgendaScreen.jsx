import React, { useState, useEffect, useRef } from 'react'
import Icon from '../shared/Icon'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_SHORT  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EVENT_TYPES = [
  { id: 'visit',   label: 'Visita',   color: '#185FA5', bg: '#E6F1FB', icon: 'map-pin'        },
  { id: 'call',    label: 'Llamada',  color: '#1D9E75', bg: '#E1F5EE', icon: 'phone'          },
  { id: 'meeting', label: 'Reunión',  color: '#EF9F27', bg: '#FAEEDA', icon: 'users'          },
  { id: 'other',   label: 'Otro',     color: '#8D8B83', bg: '#F4F2EE', icon: 'calendar-event' },
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

function mkDate(offsetDays, h, m) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(h, m, 0, 0)
  return d
}

// ─── Seed events (relative to today) ────────────────────────────────────────

const SEED = [
  { id: 'm1', title: 'Ferretería del Valle',    type: 'visit',   date: mkDate(0, 10, 30), duration: 60, activity: 'Presentación de producto',   address: 'Av. Constituyentes 412, Querétaro', stage: 'presentacion', source: 'local', notified: false },
  { id: 'm2', title: 'Distribuidora Norte',     type: 'visit',   date: mkDate(0, 13,  0), duration: 90, activity: 'Negociación de condiciones',  address: 'Blvd. Bernardo Quintana 4200',      stage: 'negociacion',  source: 'local', notified: false },
  { id: 'm3', title: 'Constructora ABC',        type: 'visit',   date: mkDate(0, 16,  0), duration: 60, activity: 'Cierre de venta · $24,500',   address: 'Parque Industrial Bernardo Q.',     stage: 'cierre',       source: 'local', notified: false },
  { id: 'm4', title: 'Aceros Monterrey',        type: 'call',    date: mkDate(1,  9,  0), duration: 30, activity: 'Llamada de seguimiento',      address: '',                                 stage: 'cotizacion',   source: 'local', notified: false },
  { id: 'm5', title: 'Herrajes San Marcos',     type: 'visit',   date: mkDate(1, 14, 30), duration: 60, activity: 'Presentación catálogo',       address: 'Blvd. Constitución 887',           stage: 'cotizacion',   source: 'local', notified: false },
  { id: 'm6', title: 'Plomería Industrial Vega',type: 'visit',   date: mkDate(2, 11,  0), duration: 60, activity: 'Primera visita',              address: 'Zona Industrial Benito Juárez',    stage: 'prospeccion',  source: 'local', notified: false },
  { id: 'm7', title: 'Materiales Pacífico',     type: 'meeting', date: mkDate(2, 15, 30), duration: 60, activity: 'Revisión de cotización',      address: 'Av. 5 de Febrero 220',             stage: 'cotizacion',   source: 'local', notified: false },
  { id: 'm8', title: 'Maderería San Juan',      type: 'visit',   date: mkDate(4, 10,  0), duration: 60, activity: 'Segunda visita',              address: 'Carretera 57 km 14',               stage: 'prospeccion',  source: 'local', notified: false },
  { id: 'm9', title: 'Comercial Las Palmas',    type: 'call',    date: mkDate(5,  9, 30), duration: 30, activity: 'Llamada de seguimiento',      address: '',                                 stage: 'negociacion',  source: 'local', notified: false },
  { id:'m10', title: 'Distribuidora Norte',     type: 'meeting', date: mkDate(7, 11,  0), duration: 90, activity: 'Presentación ejecutiva',      address: 'Blvd. Bernardo Quintana 4200',     stage: 'negociacion',  source: 'local', notified: false },
  { id:'m11', title: 'Ferretería del Valle',    type: 'visit',   date: mkDate(-1,10,  0), duration: 60, activity: 'Demostración de producto',    address: 'Av. Constituyentes 412, Querétaro',stage: 'presentacion', source: 'local', notified: true  },
]

// ─── MonthYearPicker ──────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function MonthYearPicker({ year, month, onSelect, onClose }) {
  const [pickerYear, setPickerYear] = useState(year)
  const today = new Date()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 250,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: '16px',
        width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Year navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => setPickerYear(y => y - 1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)', color: 'var(--fg-secondary)' }}>
            <Icon name="chevron-left" size={18} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{pickerYear}</div>
          <button onClick={() => setPickerYear(y => y + 1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)', color: 'var(--fg-secondary)' }}>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {MONTHS_SHORT.map((m, i) => {
            const isSelected = i === month && pickerYear === year
            const isToday    = i === today.getMonth() && pickerYear === today.getFullYear()
            return (
              <button key={m} onClick={() => { onSelect(pickerYear, i); onClose() }} style={{
                padding: '10px 0', borderRadius: 'var(--r-md)',
                background: isSelected ? 'var(--kiuvo-blue)' : isToday ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                border: `0.5px solid ${isSelected ? 'var(--kiuvo-blue)' : isToday ? 'var(--kiuvo-blue-mid)' : 'var(--border)'}`,
                fontSize: 13, fontWeight: isSelected || isToday ? 600 : 400,
                color: isSelected ? '#fff' : isToday ? 'var(--kiuvo-blue)' : 'var(--fg)',
              }}>
                {m}
              </button>
            )
          })}
        </div>

        <button onClick={onClose} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '0.5px solid var(--border)', fontSize: 13, color: 'var(--fg-secondary)' }}>
          Cancelar
        </button>
      </div>
    </div>
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

  // Show all days of the current view month
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
    <div ref={containerRef} style={{ overflowX: 'auto', display: 'flex', gap: 2, padding: '4px 12px 6px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
            style={{
              flexShrink: 0, width: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 0', borderRadius: 'var(--r-md)',
              background: isSel ? 'var(--kiuvo-blue)' : 'transparent',
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3,
              color: isSel ? 'rgba(255,255,255,0.75)' : isTod ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)',
            }}>
              {DAYS_SHORT[d.getDay()]}
            </span>
            <span style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              border: isTod && !isSel ? '1.5px solid var(--kiuvo-blue)' : 'none',
              fontSize: 14, fontWeight: isSel || isTod ? 600 : 400,
              color: isSel ? '#fff' : past ? 'var(--fg-tertiary)' : 'var(--fg)',
            }}>
              {d.getDate()}
            </span>
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: eventDays.has(key)
                ? (isSel ? 'rgba(255,255,255,0.65)' : 'var(--kiuvo-blue)')
                : 'transparent',
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
    <button onClick={() => onPress(event)} style={{
      width: '100%', textAlign: 'left',
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '10px 12px 10px 13px',
      display: 'flex', gap: 12, position: 'relative', overflow: 'hidden',
      opacity: past ? 0.55 : 1,
    }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: stage ? stage.color : type.color }} />

      <div style={{ minWidth: 46, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingTop: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4, lineHeight: 1 }}>{hh}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{ampm}</span>
      </div>

      <div style={{ width: '0.5px', background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.title}
          </div>
          <span style={{
            flexShrink: 0, fontSize: 11, fontWeight: 500,
            color: type.color, background: type.bg,
            padding: '2px 7px', borderRadius: 'var(--r-full)',
          }}>
            {type.label}
          </span>
        </div>

        {event.activity && (
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{event.activity}</div>
        )}

        {event.address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--fg-tertiary)' }}>
            <Icon name="map-pin" size={11} />
            <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.address}</span>
          </div>
        ) : null}

        {event.source === 'google' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <GoogleColorIcon size={11} />
            <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>Google Calendar</span>
          </div>
        )}
      </div>

      <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" style={{ flexShrink: 0, alignSelf: 'center' }} />
    </button>
  )
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

function AddEventModal({ initialDate, prefill, onSave, onClose }) {
  const pad  = n => n.toString().padStart(2, '0')
  const toDateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const [title,    setTitle]    = useState(prefill?.title || '')
  const [type,     setType]     = useState(prefill?.type  || 'visit')
  const [dateVal,  setDateVal]  = useState(toDateInput(initialDate))
  const [timeVal,  setTimeVal]  = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [address,  setAddress]  = useState('')
  const [notes,    setNotes]    = useState('')

  function handleSave() {
    if (!title.trim()) return
    const [y, mo, dd] = dateVal.split('-').map(Number)
    const [h, mi]     = timeVal.split(':').map(Number)
    onSave({
      id: `local-${Date.now()}`,
      title: title.trim(), type,
      date: new Date(y, mo - 1, dd, h, mi),
      duration, address, notes,
      activity: '', stage: null,
      source: 'local', notified: false,
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
    background: 'var(--surface)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', maxHeight: '88vh', overflowY: 'auto', paddingBottom: 28 }}>
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Nuevo evento</span>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0 0' }} />

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del cliente o actividad" style={inputStyle} />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {EVENT_TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)} style={{
                  padding: '8px 4px', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
                  background: type === t.id ? t.bg : 'var(--surface)',
                  border: `0.5px solid ${type === t.id ? t.color : 'var(--border)'}`,
                  color: type === t.id ? t.color : 'var(--fg-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <Icon name={t.icon} size={16} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hora</label>
              <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>Duración</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ ...inputStyle, appearance: 'none' }}>
              {[15,30,45,60,90,120].map(v => (
                <option key={v} value={v}>{v < 60 ? `${v} minutos` : v === 60 ? '1 hora' : `${v/60} horas`}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Dirección (opcional)</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, colonia..." style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Objetivo, qué llevar..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: 12, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)', fontSize: 14, fontWeight: 500 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!title.trim()} style={{
              padding: 12, borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
              background: title.trim() ? 'var(--kiuvo-blue)' : 'var(--bg-tertiary)',
              color: title.trim() ? '#fff' : 'var(--fg-tertiary)',
            }}>
              Guardar evento
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EventDetailSheet ─────────────────────────────────────────────────────────

function EventDetailSheet({ event, onClose, onDelete }) {
  const type  = TYPE_BY_ID[event.type] || TYPE_BY_ID.other
  const stage = event.stage ? STAGE_BY_ID[event.stage] : null
  const { hh, ampm } = fmtTime(event.date)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', paddingBottom: 32 }}>
        <div style={{ padding: '12px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 11, fontWeight: 500, color: type.color,
            background: type.bg, padding: '3px 9px', borderRadius: 'var(--r-full)',
          }}>{type.label}</span>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ height: '0.5px', background: 'var(--border)' }} />

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>{event.title}</div>
            {event.activity && <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 4 }}>{event.activity}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <Icon name="clock" size={16} color="var(--fg-tertiary)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{hh} {ampm}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{event.duration} min de duración</div>
              </div>
            </div>

            {event.address ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Icon name="map-pin" size={16} color="var(--fg-tertiary)" />
                <span style={{ fontSize: 13, color: 'var(--fg)', flex: 1 }}>{event.address}</span>
              </div>
            ) : null}

            {event.notes ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Icon name="notes" size={16} color="var(--fg-tertiary)" style={{ marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--fg)', flex: 1, lineHeight: 1.5 }}>{event.notes}</span>
              </div>
            ) : null}

            {event.source === 'google' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <GoogleColorIcon size={16} />
                <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Importado de Google Calendar</span>
              </div>
            )}

            {stage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{stage.label}</span>
              </div>
            )}
          </div>

          {event.source === 'local' && (
            <button onClick={() => { onDelete(event.id); onClose() }} style={{
              width: '100%', padding: 12, borderRadius: 'var(--r-md)',
              border: '0.5px solid var(--danger-border)', background: 'var(--danger-bg)',
              color: 'var(--danger)', fontSize: 14, fontWeight: 500,
            }}>
              Eliminar evento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── GoogleConnectSheet ───────────────────────────────────────────────────────

function GoogleConnectSheet({ connected, onConnect, onDisconnect, onClose, loading }) {
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', paddingBottom: 32 }}>
        <div style={{ padding: '12px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Google Calendar</span>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ height: '0.5px', background: 'var(--border)' }} />

        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!hasClientId && (
            <div style={{ padding: 14, background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning-fg)', marginBottom: 6 }}>Configuración requerida</div>
              <div style={{ fontSize: 12, color: 'var(--warning-fg)', lineHeight: 1.6 }}>
                Agrega tu Client ID en el archivo <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: 3 }}>.env</code>:
              </div>
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#0F0E0C', borderRadius: 'var(--r-md)', fontFamily: 'monospace', fontSize: 12, color: '#A8E6CF', wordBreak: 'break-all' }}>
                VITE_GOOGLE_CLIENT_ID=tu_client_id
              </div>
              <div style={{ fontSize: 11, color: 'var(--warning-fg)', marginTop: 10, opacity: 0.9, lineHeight: 1.5 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--success-bg)', border: '0.5px solid #B8E3D2', borderRadius: 'var(--r-lg)' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GoogleColorIcon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--success-fg)' }}>Conectado</div>
                  <div style={{ fontSize: 12, color: 'var(--success-fg)', opacity: 0.85, marginTop: 1 }}>Sincronizando tu Google Calendar</div>
                </div>
                <Icon name="check" size={18} color="var(--success)" />
              </div>
              <button onClick={onDisconnect} style={{
                width: '100%', padding: 12, borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--danger-border)', background: 'var(--danger-bg)',
                color: 'var(--danger)', fontSize: 14, fontWeight: 500,
              }}>
                Desconectar Google Calendar
              </button>
            </>
          ) : (
            <button onClick={onConnect} disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 'var(--r-lg)',
              border: '0.5px solid var(--border)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: loading ? 0.7 : 1,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F1F3F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {loading
                  ? <Icon name="loader-2" size={22} color="#5C5A53" />
                  : <GoogleColorIcon size={24} />
                }
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>
                  {loading ? 'Conectando...' : 'Conectar Google Calendar'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>
                  Importa eventos y recibe avisos en tu celular
                </div>
              </div>
              {!loading && <Icon name="chevron-right" size={18} color="var(--fg-tertiary)" />}
            </button>
          )}

          <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.6 }}>
              Al conectar, KIUVO CRM puede leer y crear eventos en tu Google Calendar. Los eventos se sincronizan solo en este dispositivo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AgendaScreen (main export) ───────────────────────────────────────────────

function mockAgendaToEvent(a) {
  const [h, m] = a.time.split(':').map(Number)
  let hours = h
  if (a.ampm === 'PM' && h !== 12) hours = h + 12
  if (a.ampm === 'AM' && h === 12) hours = 0
  const date = new Date(); date.setHours(hours, m, 0, 0)
  return {
    id: `dash-${a.name}-${hours}-${m}`,
    title: a.name, type: 'visit', date, duration: 60,
    activity: a.activity, address: a.address,
    stage: a.stage, source: 'local', notified: false,
  }
}

export default function AgendaScreen({ pendingEvent, onClearPending, prefillEvent, onClearPrefill }) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const [selected,    setSelected]    = useState(new Date())
  const [viewYear,       setViewYear]       = useState(new Date().getFullYear())
  const [viewMonth,      setViewMonth]      = useState(new Date().getMonth())
  const [showMonthPick,  setShowMonthPick]  = useState(false)
  const [events,      setEvents]      = useState(SEED)
  const [filter,      setFilter]      = useState('all')
  const [showAdd,     setShowAdd]     = useState(false)
  const [addPrefill,  setAddPrefill]  = useState(null)
  const [showGoogle,  setShowGoogle]  = useState(false)
  const [showDetail,  setShowDetail]  = useState(null)
  const [gcConnected, setGcConnected] = useState(() => localStorage.getItem(GC_CONNECTED_KEY) === 'true')
  const [gcToken,     setGcToken]     = useState(() => localStorage.getItem(GC_TOKEN_KEY) || null)
  const [gcLoading,   setGcLoading]   = useState(false)
  const [syncError,   setSyncError]   = useState(null)
  const [notifOk,     setNotifOk]     = useState(() => {
    try { return typeof Notification !== 'undefined' && Notification.permission === 'granted' }
    catch { return false }
  })
  const notifiedRef = useRef(new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')))

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

  function handleAddEvent(ev) {
    setEvents(prev => [...prev, ev])
    if (gcConnected && gcToken) {
      import('../../lib/googleCalendar').then(({ createEvent }) => createEvent(gcToken, 'primary', ev).catch(() => {}))
    }
  }

  function handleDeleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
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

  // When selecting a day, keep viewMonth in sync
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
    <div style={{ paddingBottom: 92, minHeight: '100%', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={goToPrevMonth} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)', color: 'var(--fg-secondary)' }}>
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            onClick={() => setShowMonthPick(true)}
            title="Seleccionar mes y año"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 'var(--r-md)', background: 'transparent' }}
          >
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>
              {MONTHS_FULL[viewMonth]} {viewYear}
            </span>
            <Icon name="selector" size={14} color="var(--fg-tertiary)" />
          </button>
          <button onClick={goToNextMonth} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)', color: 'var(--fg-secondary)' }}>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Google Calendar */}
          <button onClick={() => setShowGoogle(true)} title="Google Calendar" style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            border: gcConnected ? 'none' : '0.5px solid var(--border)',
            background: gcConnected ? 'var(--success-bg)' : 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {gcConnected
              ? <Icon name="calendar-check" size={18} color="var(--success)" />
              : <GoogleColorIcon size={18} />
            }
          </button>
          {/* Ir a hoy */}
          <button onClick={goToToday} title="Ir a hoy" style={{
            height: 36, padding: '0 10px', borderRadius: 'var(--r-full)', flexShrink: 0,
            border: '0.5px solid var(--kiuvo-blue)',
            background: 'var(--kiuvo-blue-soft)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Icon name="calendar-event" size={15} color="var(--kiuvo-blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kiuvo-blue)' }}>Hoy</span>
          </button>
        </div>
      </div>

      {/* ── Sync error ── */}
      {syncError && (
        <div style={{ margin: '0 16px 8px', padding: '8px 12px', background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--warning-fg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ flex: 1 }}>{syncError}</span>
          <button onClick={() => setSyncError(null)} style={{ color: 'var(--warning-fg)', flexShrink: 0 }}><Icon name="x" size={14} /></button>
        </div>
      )}

      {/* ── Week strip ── */}
      <WeekStrip selected={selected} onChange={handleSelectDay} events={events} viewYear={viewYear} viewMonth={viewMonth} />

      {/* ── Day label ── */}
      <div style={{ padding: '2px 16px 10px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>{selLabel}</span>
        {dayEvents.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-full)',
            fontSize: 12, fontWeight: 500,
            background: filter === f.id ? 'var(--kiuvo-blue)' : 'var(--surface)',
            border: `0.5px solid ${filter === f.id ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
            color: filter === f.id ? '#fff' : 'var(--fg-secondary)',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Events list ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayEvents.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name="calendar-off" size={28} color="var(--fg-tertiary)" />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-secondary)' }}>Sin eventos</div>
            <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>
              {filter !== 'all' ? 'No hay eventos de este tipo para este día' : 'No hay eventos para este día'}
            </div>
            <button onClick={() => setShowAdd(true)} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 'var(--r-full)', background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)', fontSize: 13, fontWeight: 500 }}>
              + Agregar evento
            </button>
          </div>
        ) : (
          dayEvents.map(ev => <EventCard key={ev.id} event={ev} onPress={setShowDetail} />)
        )}
      </div>

      {/* ── Banners ── */}
      {!notifOk && (
        <div style={{ margin: '14px 16px 0', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--kiuvo-blue-soft)', border: '0.5px solid var(--kiuvo-blue-mid)', borderRadius: 'var(--r-lg)' }}>
          <Icon name="bell" size={18} color="var(--kiuvo-blue)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--kiuvo-blue-deep)' }}>Activa las notificaciones</div>
            <div style={{ fontSize: 11, color: 'var(--kiuvo-blue)', marginTop: 1 }}>Recibe un aviso 15 min antes de cada evento</div>
          </div>
          <button onClick={handleRequestNotif} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 'var(--r-full)', background: 'var(--kiuvo-blue)', color: '#fff', fontSize: 12, fontWeight: 500 }}>
            Activar
          </button>
        </div>
      )}

      {!gcConnected && (
        <button onClick={() => setShowGoogle(true)} style={{
          width: 'calc(100% - 32px)', margin: '10px 16px 0',
          padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-lg)', textAlign: 'left',
        }}>
          <GoogleColorIcon size={22} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Conectar Google Calendar</div>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>Sincroniza y recibe notificaciones en tu celular</div>
          </div>
          <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" />
        </button>
      )}

      <div style={{ height: 16 }} />

      {/* ── FAB ── */}
      <button onClick={() => setShowAdd(true)} style={{
        position: 'fixed', bottom: 88, right: 16,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--kiuvo-blue)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(24, 95, 165, 0.4)',
        zIndex: 50,
      }}>
        <Icon name="plus" size={24} />
      </button>

      {/* ── Modals ── */}
      {showAdd       && <AddEventModal      initialDate={selected}  prefill={addPrefill} onSave={handleAddEvent} onClose={() => { setShowAdd(false); setAddPrefill(null) }}    />}
      {showGoogle    && <GoogleConnectSheet connected={gcConnected} onConnect={handleGoogleConnect} onDisconnect={handleGoogleDisconnect} onClose={() => setShowGoogle(false)} loading={gcLoading} />}
      {showDetail    && <EventDetailSheet   event={showDetail}      onDelete={handleDeleteEvent}   onClose={() => setShowDetail(null)}  />}
      {showMonthPick && <MonthYearPicker    year={viewYear} month={viewMonth} onClose={() => setShowMonthPick(false)} onSelect={(y, m) => { setViewYear(y); setViewMonth(m) }} />}
    </div>
  )
}
