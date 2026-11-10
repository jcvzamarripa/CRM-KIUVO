import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Chip, Segmented, Avatar, Empty } from '../ui'
import { useAgendaEvents } from '../../hooks/useAgendaEvents'
import { useSellers } from '../../hooks/useSellers'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Config ───────────────────────────────────────────────────────────────────
const _now = new Date()
const TODAY = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`
const HOUR_H     = 64        // px per hour
const DAY_START  = 8         // 8 AM
const DAY_END    = 19        // 7 PM  (11 hours)
const HOURS      = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

const ES_DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const ES_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TYPE_CFG = {
  visita:     { label:'Visita',      color:'var(--kiuvo-blue)',       tone:'sky',     icon:'map-pin'     },
  llamada:    { label:'Llamada',     color:'var(--coral)',            tone:'coral',   icon:'phone'       },
  cotizacion: { label:'Cotización',  color:'var(--stage-cotizacion)', tone:'warning', icon:'file-text'   },
  cierre:     { label:'Cierre',      color:'var(--success)',          tone:'success', icon:'trophy'      },
  reunion:    { label:'Reunión',     color:'var(--accent-2)',         tone:'lilac',   icon:'users-group' },
}

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--surface))`

// ─── Date utils ───────────────────────────────────────────────────────────────
const parseDate  = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
const fmtISO     = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const addDays    = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const timeToMin  = t => { const [h,m] = t.split(':').map(Number); return h*60+m }

function getWeekMon(offset) {
  const today = parseDate(TODAY)
  const dow   = today.getDay()
  const diff  = dow === 0 ? -6 : 1 - dow
  return addDays(today, diff + offset * 7)
}

// Computes weekOffset needed to show the first week of a given month.
// If the month starts on Sat/Sun we jump to the NEXT Monday so the
// calendar label always shows the selected month, not the previous one.
function weekOffsetForMonth(year, month) {
  const first  = new Date(year, month, 1)
  const dow    = first.getDay()
  // Sat(6) → +2 days to reach the first Mon IN the month
  // Sun(0) → +1 day  (same effect: 1 - 0 = 1, already correct)
  // Mon–Fri → 1 - dow  (back to Monday of that week)
  const delta  = dow === 6 ? 2 : 1 - dow
  const targetMon = addDays(first, delta)
  const todayMon  = getWeekMon(0)
  const diffMs    = targetMon.getTime() - todayMon.getTime()
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
}

// ─── Month / Year picker ──────────────────────────────────────────────────────
const ES_MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function MonthYearPicker({ currentMon, currentYear, onSelect, onClose }) {
  const [pickYear, setPickYear] = useState(currentYear)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const todayDate = parseDate(TODAY)

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      background: 'var(--surface)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-float)',
      padding: 16,
      minWidth: 280,
      animation: 'fadeDown 0.12s ease',
    }}>
      {/* Year row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <IconButton icon="chevron-left" label="Año anterior" variant="soft" iconSize={18} style={{ width: 36, height: 36 }} onClick={() => setPickYear(y => y - 1)} />
        <span className="k-num" style={{ fontSize: 20 }}>{pickYear}</span>
        <IconButton icon="chevron-right" label="Año siguiente" variant="soft" iconSize={18} style={{ width: 36, height: 36 }} onClick={() => setPickYear(y => y + 1)} />
      </div>

      {/* Month grid 4×3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {ES_MONTHS_SHORT.map((m, i) => {
          const isCurrent = i === currentMon && pickYear === currentYear
          const isToday   = i === todayDate.getMonth() && pickYear === todayDate.getFullYear()
          return (
            <button
              key={i}
              onClick={() => { onSelect(pickYear, i); onClose() }}
              style={{
                minHeight: 36,
                borderRadius: 'var(--r-full)',
                fontSize: 13,
                fontWeight: isCurrent || isToday ? 600 : 400,
                background: isCurrent ? 'var(--primary-bg)' : 'transparent',
                color: isCurrent ? 'var(--primary-fg)' : 'var(--fg)',
                boxShadow: isToday && !isCurrent ? 'inset 0 0 0 1.5px var(--border-strong)' : 'none',
              }}
            >{m}</button>
          )
        })}
      </div>

      {/* Quick jumps */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
        {[
          { label: 'Hoy',        action: () => { onSelect(todayDate.getFullYear(), todayDate.getMonth()); onClose() } },
          { label: 'Mes anterior', action: () => {
            const prev = new Date(currentYear, currentMon - 1, 1)
            onSelect(prev.getFullYear(), prev.getMonth()); onClose()
          }},
          { label: 'Mes siguiente', action: () => {
            const next = new Date(currentYear, currentMon + 1, 1)
            onSelect(next.getFullYear(), next.getMonth()); onClose()
          }},
        ].map(q => (
          <Button key={q.label} variant="soft" size="sm" onClick={q.action} style={{ flex: 1, padding: '0 8px', minHeight: 36, fontSize: 12 }}>
            {q.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Overlap layout ───────────────────────────────────────────────────────────
function layoutEvents(events) {
  const sorted = [...events].sort((a,b) => timeToMin(a.start) - timeToMin(b.start))
  const cols   = []      // cols[i] = end-min of last event in that column
  const colMap = {}

  for (const ev of sorted) {
    const s = timeToMin(ev.start)
    let placed = -1
    for (let i = 0; i < cols.length; i++) {
      if (s >= cols[i]) { placed = i; break }
    }
    if (placed === -1) { placed = cols.length; cols.push(0) }
    cols[placed] = timeToMin(ev.end)
    colMap[ev.id] = placed
  }

  // Compute "max concurrent" per event (how many cols existed when it was placed)
  // Simple: use total cols count as a global divisor for the day
  const n = Math.max(cols.length, 1)
  return sorted.map(ev => ({ ...ev, colIdx: colMap[ev.id], nCols: n }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sellerColor = (sellers, init) => sellers.find(s => s.init === init)?.color
const sellerName  = (sellers, init) => sellers.find(s => s.init === init)?.name  || init

const fmt12 = t => {
  const [h,m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`
}

// ─── Event card (inside week grid) ────────────────────────────────────────────
function EventCard({ ev, onSelect, selected, sellers = [] }) {
  const cfg     = TYPE_CFG[ev.type] || TYPE_CFG.visita
  const startM  = timeToMin(ev.start)
  const endM    = timeToMin(ev.end)
  const top     = (startM - DAY_START * 60) / 60 * HOUR_H
  const height  = Math.max((endM - startM) / 60 * HOUR_H - 3, 20)
  const colW    = 100 / ev.nCols
  const left    = ev.colIdx * colW
  const isSel   = selected?.id === ev.id
  const short   = height < 40
  const scolor  = sellerColor(sellers, ev.owner)

  return (
    <div
      onClick={() => onSelect(isSel ? null : ev)}
      title={ev.name}
      style={{
        position: 'absolute',
        top, height,
        left:  `calc(${left}%  + 3px)`,
        width: `calc(${colW}% - 6px)`,
        borderLeft:   `4px solid ${cfg.color}`,
        borderRadius: 'var(--r-sm)',
        background:   isSel ? 'var(--ink)' : tint(cfg.color, 16),
        color:        isSel ? 'var(--on-ink)' : 'var(--fg)',
        cursor: 'pointer',
        overflow: 'hidden',
        padding: short ? '2px 8px' : '6px 8px 5px',
        transition: 'background 0.12s',
        zIndex: isSel ? 20 : 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      {short ? (
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fmt12(ev.start)} · {ev.name}
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 1 }}>
              {fmt12(ev.start)} — {fmt12(ev.end)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ev.name}
            </div>
            {height >= 60 && (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.label} · {ev.contact}
              </div>
            )}
          </div>
          {height >= 56 && (
            <Avatar initials={ev.owner} color={scolor} size="sm" style={{ width: 24, height: 24, marginTop: 3 }} />
          )}
        </>
      )}
    </div>
  )
}

// ─── Week column ──────────────────────────────────────────────────────────────
function DayColumn({ date, isoDate, events, isToday, onSelect, selected, nowMin, sellers = [] }) {
  const laid = layoutEvents(events)

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', borderRight: '1px solid var(--border)', background: isToday ? 'var(--bg-secondary)' : 'transparent' }}>
      {/* Hour grid lines */}
      {HOURS.map(h => (
        <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--border)', pointerEvents: 'none' }} />
      ))}

      {/* Current time line */}
      {isToday && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
        <div style={{
          position: 'absolute',
          top: (nowMin - DAY_START * 60) / 60 * HOUR_H,
          left: 0, right: 0,
          height: 2, background: 'var(--coral)',
          zIndex: 30, pointerEvents: 'none',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)', marginTop: -3, marginLeft: -4 }} />
        </div>
      )}

      {/* Events */}
      {laid.map(ev => (
        <EventCard key={ev.id} ev={ev} onSelect={onSelect} selected={selected} sellers={sellers} />
      ))}

      {/* Empty state */}
      {events.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="k-dim" style={{ fontSize: 12, opacity: 0.6 }}>Sin citas</div>
        </div>
      )}
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({ ev, onClose, sellers = [] }) {
  const cfg   = TYPE_CFG[ev.type] || TYPE_CFG.visita
  const stage = ev.stage ? STAGE_BY_ID[ev.stage] : null
  const sname = sellerName(sellers, ev.owner)
  const sclr  = sellerColor(sellers, ev.owner)
  const d     = parseDate(ev.date)

  return (
    <div style={{
      width: 'min(340px, 100%)', flexShrink: 0,
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: 'var(--r-xl) 0 0 var(--r-xl)', boxShadow: 'var(--shadow-float)',
      animation: 'slideInRight 0.18s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Pill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Pill>
          <div className="k-h2" style={{ marginTop: 10 }}>{ev.name}</div>
          <div className="k-muted" style={{ fontSize: 13, marginTop: 4 }}>{ev.contact}</div>
        </div>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
        {/* Date & time */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          padding: '12px 14px', marginBottom: 16,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          <div>
            <div className="k-dim" style={{ fontSize: 12, marginBottom: 3 }}>Fecha</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {ES_DAYS[d.getDay()]} {d.getDate()} {ES_MONTHS[d.getMonth()].slice(0,3)}
            </div>
          </div>
          <div>
            <div className="k-dim" style={{ fontSize: 12, marginBottom: 3 }}>Horario</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {fmt12(ev.start)} – {fmt12(ev.end)}
            </div>
          </div>
        </div>

        {/* Info rows */}
        {[
          ev.address && { icon: 'map-pin',    label: 'Dirección', value: ev.address },
          stage       && { icon: 'layout-kanban', label: 'Etapa',     value: stage.label, color: stage.color },
        ].filter(Boolean).map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={row.icon} size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="k-dim" style={{ fontSize: 12, marginBottom: 2 }}>{row.label}</div>
              <div style={{ fontSize: 14, fontWeight: row.color ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                {row.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />}
                {row.value}
              </div>
            </div>
          </div>
        ))}

        {/* Seller */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
          <Avatar initials={ev.owner} color={sclr} style={{ width: 36, height: 36, fontSize: 12 }} />
          <div>
            <div className="k-dim" style={{ fontSize: 12, marginBottom: 1 }}>Vendedor</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{sname}</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button block icon="brand-whatsapp">WhatsApp a {ev.contact.split(' ')[0]}</Button>
          <Button variant="soft" block icon="phone">Llamar</Button>
          <Button variant="soft" block icon="calendar-plus">Reagendar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────
function ListView({ events, onSelect, selected, sellers = [] }) {
  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort()

  if (dates.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty icon="calendar-off">Sin eventos en este período</Empty>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '4px 28px 28px' }}>
      {dates.map(dateStr => {
        const d      = parseDate(dateStr)
        const isToday = dateStr === TODAY
        const dayEvs = [...grouped[dateStr]].sort((a,b) => timeToMin(a.start) - timeToMin(b.start))

        return (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            {/* Date divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--r-md)', flexShrink: 0,
                background: isToday ? 'var(--ink)' : 'var(--surface)',
                color: isToday ? 'var(--on-ink)' : 'var(--fg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                  {ES_DAYS[d.getDay()]}
                </div>
                <div className="k-num" style={{ fontSize: 20 }}>{d.getDate()}</div>
              </div>
              <div>
                <div className="k-h3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ES_DAYS[d.getDay()]} {d.getDate()} de {ES_MONTHS[d.getMonth()]}
                  {isToday && <Pill tone="accent">Hoy</Pill>}
                </div>
                <div className="k-dim" style={{ fontSize: 13 }}>{dayEvs.length} evento{dayEvs.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEvs.map(ev => {
                const cfg   = TYPE_CFG[ev.type] || TYPE_CFG.visita
                const isSel = selected?.id === ev.id
                const sclr  = sellerColor(sellers, ev.owner)

                return (
                  <button key={ev.id} onClick={() => onSelect(isSel ? null : ev)} className="k-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    background: isSel ? 'var(--ink)' : 'var(--surface)',
                    color: isSel ? 'var(--on-ink)' : 'var(--fg)',
                  }}>
                    {/* Time */}
                    <div style={{ minWidth: 78, flexShrink: 0 }}>
                      <div className="k-num" style={{ fontSize: 16 }}>{fmt12(ev.start)}</div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{fmt12(ev.end)}</div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, minWidth: 0 }}>
                        <Pill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Pill>
                        <span style={{ fontSize: 13, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.contact !== 'Equipo ventas' && ev.contact}
                          {ev.address && ` · ${ev.address.split(',')[0]}`}
                        </span>
                      </div>
                    </div>

                    {/* Seller chip */}
                    <Avatar size="sm" initials={ev.owner} color={sclr} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main AgendaView ──────────────────────────────────────────────────────────
export default function AgendaView() {
  const { sellers } = useSellers()
  const [view,         setView]         = useState('semana')
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [sellerFilter, setSellerFilter] = useState('Todos')
  const [typeFilter,   setTypeFilter]   = useState('Todos')
  const [selected,     setSelected]     = useState(null)
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const bodyRef = useRef(null)

  // Scroll to 8am on mount
  useEffect(() => {
    if (bodyRef.current && view === 'semana') {
      bodyRef.current.scrollTop = HOUR_H * 0.5  // show a bit before 8am
    }
  }, [view])

  const weekMon  = getWeekMon(weekOffset)
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekMon, i))
  const weekISOs = weekDays.map(fmtISO)

  // Fetch events for the visible week ± 2 weeks buffer
  // sellerId={null} → sin filtro de vendedor (admin ve todos)
  const fetchFrom = fmtISO(addDays(weekMon, -14))
  const fetchTo   = fmtISO(addDays(weekMon,  21))
  const { events: rawEvents } = useAgendaEvents({ sellerId: null, dateFrom: fetchFrom, dateTo: fetchTo })

  // Resolver seller_id → initials usando la lista de vendedores
  const sellerById = Object.fromEntries(sellers.map(s => [s.id, s]))
  const allEvents = rawEvents.map(ev => ({
    ...ev,
    owner: sellerById[ev.seller_id]?.init
        || ev.seller_id?.slice(0, 2)?.toUpperCase()
        || '?',
  }))

  const monthLabel = (() => {
    const m1 = weekDays[0], m2 = weekDays[4]
    if (m1.getMonth() === m2.getMonth())
      return `${ES_MONTHS[m1.getMonth()]} ${m1.getFullYear()}`
    return `${ES_MONTHS[m1.getMonth()].slice(0,3)} – ${ES_MONTHS[m2.getMonth()].slice(0,3)} ${m2.getFullYear()}`
  })()

  const sellerInits = ['Todos', ...sellers.map(s => s.init)]
  const types   = ['Todos', 'visita', 'llamada', 'cotizacion', 'cierre', 'reunion']

  // Current time in minutes (for red line)
  const nowMin = (() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })()

  const filteredEvents = allEvents.filter(ev => {
    if (view === 'semana' && !weekISOs.includes(ev.date)) return false
    if (view === 'lista') {
      const eDate = parseDate(ev.date)
      const wStart = weekMon
      const wEnd   = addDays(weekMon, 6)
      if (eDate < wStart || eDate > wEnd) return false
    }
    if (sellerFilter !== 'Todos' && ev.owner !== sellerFilter) return false
    if (typeFilter   !== 'Todos' && ev.type  !== typeFilter)   return false
    return true
  })

  const weekTotal  = filteredEvents.length
  const visitCount = filteredEvents.filter(e => e.type === 'visita').length
  const closeCount = filteredEvents.filter(e => e.type === 'cierre').length

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div style={{ padding: '20px 28px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Week nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconButton icon="chevron-left" label="Semana anterior" iconSize={18} style={{ width: 40, height: 40 }} onClick={() => setWeekOffset(w => w - 1)} />

            {/* Month/Year picker trigger */}
            <div style={{ position: 'relative' }}>
              <Button variant={pickerOpen ? 'primary' : 'soft'} size="sm" onClick={() => setPickerOpen(o => !o)}
                style={{ minWidth: 168, background: pickerOpen ? undefined : 'var(--surface)', fontSize: 14 }}>
                {monthLabel}
                <Icon name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={15} />
              </Button>

              {pickerOpen && (
                <MonthYearPicker
                  currentMon={weekMon.getMonth()}
                  currentYear={weekMon.getFullYear()}
                  onSelect={(y, m) => setWeekOffset(weekOffsetForMonth(y, m))}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>

            <IconButton icon="chevron-right" label="Semana siguiente" iconSize={18} style={{ width: 40, height: 40 }} onClick={() => setWeekOffset(w => w + 1)} />
            {weekOffset !== 0 && <Button variant="soft" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>}
          </div>

          {/* Summary chips */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <Pill icon="calendar">{weekTotal} eventos</Pill>
            <Pill tone="sky" icon="map-pin">{visitCount} visitas</Pill>
            <Pill tone="success" icon="trophy">{closeCount} cierres</Pill>
          </div>

          <div style={{ flex: 1 }} />

          {/* Seller */}
          <select className="k-input k-input--sm k-input--pill" value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} style={{ width: 'auto', maxWidth: 220 }}>
            {sellerInits.map(s => (
              <option key={s} value={s}>{s === 'Todos' ? 'Todos los vendedores' : sellerName(sellers, s)}</option>
            ))}
          </select>

          {/* View toggle */}
          <Segmented
            surface
            value={view}
            onChange={setView}
            options={[
              { id: 'semana', label: 'Semana', icon: 'layout-kanban' },
              { id: 'lista',  label: 'Lista',  icon: 'notes' },
            ]}
          />
        </div>

        {/* Type filter */}
        <div style={{ display:'flex', gap:6, overflowX:'auto' }}>
          {types.map(t => {
            const cfg = t !== 'Todos' ? TYPE_CFG[t] : null
            return (
              <Chip key={t} selected={typeFilter === t} icon={cfg?.icon} onClick={() => setTypeFilter(t)} style={{ minHeight: 36, fontSize: 13, flexShrink: 0 }}>
                {cfg ? cfg.label : 'Todos'}
              </Chip>
            )
          })}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {view === 'semana' ? (
          <Card flush style={{ flex:1, minWidth: 0, display:'flex', flexDirection:'column', overflow:'hidden', margin: '0 28px 28px' }}>
            {/* Day headers (sticky) */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {/* Time gutter */}
              <div style={{ width:56, flexShrink:0, borderRight:'1px solid var(--border)' }} />

              {weekDays.map((d, i) => {
                const iso     = weekISOs[i]
                const isToday = iso === TODAY
                const count   = filteredEvents.filter(e => e.date === iso).length

                return (
                  <div key={iso} style={{
                    flex:1, minWidth: 0, padding:'10px 0',
                    borderRight: i < 4 ? '1px solid var(--border)' : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: isToday ? 'var(--bg-secondary)' : 'transparent',
                  }}>
                    <div className="k-dim" style={{ fontSize:12, fontWeight:600, letterSpacing:'0.06em' }}>
                      {ES_DAYS[d.getDay()].toUpperCase()}
                    </div>
                    <div className="k-num" style={{
                      fontSize:18, width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isToday ? 'var(--primary-bg)' : 'transparent',
                      color: isToday ? 'var(--primary-fg)' : 'var(--fg)',
                    }}>{d.getDate()}</div>
                    {count > 0 && <Pill>{count}</Pill>}
                  </div>
                )
              })}
            </div>

            {/* Scrollable calendar body */}
            <div ref={bodyRef} style={{ flex:1, overflowY:'auto', display:'flex' }}>
              {/* Time gutter */}
              <div style={{ width:56, flexShrink:0, borderRight:'1px solid var(--border)', position:'relative' }}>
                {HOURS.map(h => (
                  <div key={h} className="k-dim" style={{
                    position:'absolute', top: (h - DAY_START) * HOUR_H - 8,
                    right:8, fontSize:12, fontWeight:500,
                    userSelect:'none',
                  }}>
                    {h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}
                  </div>
                ))}
                <div style={{ height: HOURS.length * HOUR_H }} />
              </div>

              {/* Day columns */}
              <div style={{ flex:1, minWidth: 0, display:'flex', position:'relative' }}>
                {weekDays.map((d, i) => {
                  const iso = weekISOs[i]
                  return (
                    <DayColumn
                      key={iso}
                      date={d}
                      isoDate={iso}
                      events={filteredEvents.filter(e => e.date === iso)}
                      isToday={iso === TODAY}
                      onSelect={setSelected}
                      selected={selected}
                      nowMin={nowMin}
                      sellers={sellers}
                    />
                  )
                })}
                {/* Total height spacer */}
                <div style={{ position:'absolute', top:0, left:0, width:1, height: HOURS.length * HOUR_H, pointerEvents:'none' }} />
              </div>
            </div>
          </Card>
        ) : (
          <ListView events={filteredEvents} onSelect={setSelected} selected={selected} sellers={sellers} />
        )}

        {/* Detail panel */}
        {selected && <DetailPanel ev={selected} onClose={() => setSelected(null)} sellers={sellers} />}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeDown {
          from { transform: translateX(-50%) translateY(-6px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
