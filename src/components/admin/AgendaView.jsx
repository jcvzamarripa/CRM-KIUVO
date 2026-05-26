import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useAgendaEvents } from '../../hooks/useAgendaEvents'
import { useSellers } from '../../hooks/useSellers'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Config ───────────────────────────────────────────────────────────────────
const TODAY      = '2026-05-22'
const HOUR_H     = 64        // px per hour
const DAY_START  = 8         // 8 AM
const DAY_END    = 19        // 7 PM  (11 hours)
const HOURS      = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

const ES_DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const ES_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TYPE_CFG = {
  visita:     { label:'Visita',      color:'#185FA5', icon:'map-pin'     },
  llamada:    { label:'Llamada',     color:'#378ADD', icon:'phone'       },
  cotizacion: { label:'Cotización',  color:'#EF9F27', icon:'file-text'   },
  cierre:     { label:'Cierre',      color:'#1D9E75', icon:'trophy'      },
  reunion:    { label:'Reunión',     color:'#7C5CBF', icon:'users-group' },
}

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
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
      padding: 14,
      minWidth: 240,
      animation: 'fadeDown 0.12s ease',
    }}>
      {/* Year row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setPickYear(y => y - 1)}
          style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
        ><Icon name="chevron-left" size={14} /></button>

        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{pickYear}</span>

        <button
          onClick={() => setPickYear(y => y + 1)}
          style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}
        ><Icon name="chevron-right" size={14} /></button>
      </div>

      {/* Month grid 4×3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {ES_MONTHS_SHORT.map((m, i) => {
          const isCurrent = i === currentMon && pickYear === currentYear
          const isToday   = i === todayDate.getMonth() && pickYear === todayDate.getFullYear()
          return (
            <button
              key={i}
              onClick={() => { onSelect(pickYear, i); onClose() }}
              style={{
                padding: '7px 4px',
                borderRadius: 'var(--r-md)',
                fontSize: 12,
                fontWeight: isCurrent ? 600 : 400,
                background: isCurrent
                  ? 'var(--kiuvo-blue)'
                  : isToday
                    ? 'var(--kiuvo-blue-soft)'
                    : 'transparent',
                color: isCurrent
                  ? '#fff'
                  : isToday
                    ? 'var(--kiuvo-blue)'
                    : 'var(--fg)',
                border: isToday && !isCurrent
                  ? '1px solid var(--kiuvo-blue-mid)'
                  : '1px solid transparent',
                transition: 'background 0.1s',
              }}
            >{m}</button>
          )
        })}
      </div>

      {/* Quick jumps */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--border)', display: 'flex', gap: 6 }}>
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
          <button key={q.label} onClick={q.action} style={{
            flex: 1, padding: '5px 4px', fontSize: 10, borderRadius: 'var(--r-sm)',
            border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
            color: 'var(--fg-secondary)', fontWeight: 500,
          }}>{q.label}</button>
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
const sellerColor = (sellers, init) => sellers.find(s => s.init === init)?.color || '#888'
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
  const height  = Math.max((endM - startM) / 60 * HOUR_H - 3, 18)
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
        borderLeft:   `3px solid ${cfg.color}`,
        borderRadius: 'var(--r-sm)',
        background:   isSel ? cfg.color + '30' : cfg.color + '16',
        boxShadow:    isSel ? `0 0 0 1.5px ${cfg.color}` : 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        padding: short ? '2px 6px' : '5px 7px 4px',
        transition: 'background 0.12s, box-shadow 0.12s',
        zIndex: isSel ? 20 : 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      {short ? (
        <div style={{ fontSize: 10, fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fmt12(ev.start)} · {ev.name}
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 10, color: cfg.color, fontWeight: 500, marginBottom: 1 }}>
              {fmt12(ev.start)} — {fmt12(ev.end)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ev.name}
            </div>
            {height >= 60 && (
              <div style={{ fontSize: 10, color: 'var(--fg-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.label} · {ev.contact}
              </div>
            )}
          </div>
          {height >= 52 && (
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: scolor + '22', color: scolor,
              fontSize: 8, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 3, flexShrink: 0,
            }}>{ev.owner}</div>
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
    <div style={{ flex: 1, position: 'relative', borderRight: '0.5px solid var(--border)', background: isToday ? 'var(--kiuvo-blue-soft)' : 'transparent' }}>
      {/* Hour grid lines */}
      {HOURS.map(h => (
        <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * HOUR_H, left: 0, right: 0, borderTop: '0.5px solid var(--border)', pointerEvents: 'none' }} />
      ))}

      {/* Current time line */}
      {isToday && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
        <div style={{
          position: 'absolute',
          top: (nowMin - DAY_START * 60) / 60 * HOUR_H,
          left: 0, right: 0,
          height: 2, background: 'var(--danger)',
          zIndex: 30, pointerEvents: 'none',
          boxShadow: '0 0 6px var(--danger)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', marginTop: -3, marginLeft: -4 }} />
        </div>
      )}

      {/* Events */}
      {laid.map(ev => (
        <EventCard key={ev.id} ev={ev} onSelect={onSelect} selected={selected} sellers={sellers} />
      ))}

      {/* Empty state */}
      {events.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', opacity: 0.5 }}>Sin citas</div>
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
      width: 300, flexShrink: 0,
      borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slideInRight 0.18s ease',
    }}>
      {/* Color bar */}
      <div style={{ height: 4, background: cfg.color, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0,
          background: cfg.color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={cfg.icon} size={18} color={cfg.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: cfg.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3 }}>{ev.name}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{ev.contact}</div>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', flexShrink: 0 }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Date & time */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          padding: '10px 14px', marginBottom: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 3 }}>FECHA</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {ES_DAYS[d.getDay()]} {d.getDate()} {ES_MONTHS[d.getMonth()].slice(0,3)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 3 }}>HORARIO</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {fmt12(ev.start)} – {fmt12(ev.end)}
            </div>
          </div>
        </div>

        {/* Info rows */}
        {[
          ev.address && { icon: 'map-pin',    label: 'Dirección', value: ev.address },
          stage       && { icon: 'layout-kanban', label: 'Etapa',     value: stage.label, color: stage.color },
        ].filter(Boolean).map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--r-sm)', flexShrink: 0,
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={row.icon} size={14} color="var(--fg-secondary)" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 2 }}>{row.label}</div>
              <div style={{ fontSize: 12, color: row.color || 'var(--fg)', fontWeight: row.color ? 500 : 400 }}>{row.value}</div>
            </div>
          </div>
        ))}

        {/* Seller */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: sclr + '22', color: sclr,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
          }}>{ev.owner}</div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 1 }}>VENDEDOR</div>
            <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{sname}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--border)', marginBottom: 14 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{
            padding: '9px 14px', borderRadius: 'var(--r-md)',
            background: '#25D36620', color: '#25D366',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="brand-whatsapp" size={15} color="#25D366" />
            WhatsApp a {ev.contact.split(' ')[0]}
          </button>
          <button style={{
            padding: '9px 14px', borderRadius: 'var(--r-md)',
            background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="phone" size={15} />
            Llamar
          </button>
          <button style={{
            padding: '9px 14px', borderRadius: 'var(--r-md)',
            background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="calendar-plus" size={15} />
            Reagendar
          </button>
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="calendar-off" size={32} />
          <div style={{ fontSize: 13, marginTop: 10 }}>Sin eventos en este período</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      {dates.map(dateStr => {
        const d      = parseDate(dateStr)
        const isToday = dateStr === TODAY
        const dayEvs = [...grouped[dateStr]].sort((a,b) => timeToMin(a.start) - timeToMin(b.start))

        return (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            {/* Date divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--r-md)', flexShrink: 0,
                background: isToday ? 'var(--kiuvo-blue)' : 'var(--surface)',
                border: '0.5px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 8, fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--fg-tertiary)', letterSpacing: 0.5 }}>
                  {ES_DAYS[d.getDay()].toUpperCase()}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? '#fff' : 'var(--fg)', lineHeight: 1 }}>
                  {d.getDate()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                  {ES_DAYS[d.getDay()]} {d.getDate()} de {ES_MONTHS[d.getMonth()]}
                  {isToday && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 'var(--r-full)', background: 'var(--kiuvo-blue)', color: '#fff' }}>Hoy</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{dayEvs.length} evento{dayEvs.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Events */}
            <div style={{ marginLeft: 54, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEvs.map(ev => {
                const cfg   = TYPE_CFG[ev.type] || TYPE_CFG.visita
                const isSel = selected?.id === ev.id
                const sclr  = sellerColor(sellers, ev.owner)

                return (
                  <div key={ev.id} onClick={() => onSelect(isSel ? null : ev)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                    border: `0.5px solid ${isSel ? cfg.color : 'var(--border)'}`,
                    background: isSel ? cfg.color + '10' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'border-color 0.12s, background 0.12s',
                    borderLeft: `3px solid ${cfg.color}`,
                  }}>
                    {/* Time */}
                    <div style={{ minWidth: 72, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{fmt12(ev.start)}</div>
                      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{fmt12(ev.end)}</div>
                    </div>

                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--r-md)', flexShrink: 0,
                      background: cfg.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={cfg.icon} size={15} color={cfg.color} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>
                        <span style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                        {ev.contact !== 'Equipo ventas' && ` · ${ev.contact}`}
                        {ev.address && ` · ${ev.address.split(',')[0]}`}
                      </div>
                    </div>

                    {/* Seller chip */}
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: sclr + '22', color: sclr,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                    }}>{ev.owner}</div>
                  </div>
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
  const fetchFrom = fmtISO(addDays(weekMon, -14))
  const fetchTo   = fmtISO(addDays(weekMon,  21))
  const { events: allEvents } = useAgendaEvents({ dateFrom: fetchFrom, dateTo: fetchTo })

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 20px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{
            width: 30, height: 30, borderRadius: 'var(--r-sm)',
            border: '0.5px solid var(--border)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-secondary)',
          }}>
            <Icon name="chevron-left" size={15} />
          </button>

          <button onClick={() => setWeekOffset(0)} style={{
            padding: '5px 12px', fontSize: 12, fontWeight: 500,
            borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border)',
            background: weekOffset === 0 ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
            color: weekOffset === 0 ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)',
          }}>Hoy</button>

          {/* Month/Year picker trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPickerOpen(o => !o)}
              style={{
                minWidth: 160, padding: '5px 12px',
                fontSize: 13, fontWeight: 600,
                borderRadius: 'var(--r-sm)',
                border: `0.5px solid ${pickerOpen ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                background: pickerOpen ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                color: pickerOpen ? 'var(--kiuvo-blue)' : 'var(--fg)',
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                transition: 'all 0.12s',
              }}
            >
              {monthLabel}
              <Icon
                name="chevron-right"
                size={13}
                color={pickerOpen ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)'}
                style={{ transform: pickerOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
              />
            </button>

            {pickerOpen && (
              <MonthYearPicker
                currentMon={weekMon.getMonth()}
                currentYear={weekMon.getFullYear()}
                onSelect={(y, m) => setWeekOffset(weekOffsetForMonth(y, m))}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <button onClick={() => setWeekOffset(w => w + 1)} style={{
            width: 30, height: 30, borderRadius: 'var(--r-sm)',
            border: '0.5px solid var(--border)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-secondary)',
          }}>
            <Icon name="chevron-right" size={15} />
          </button>
        </div>

        {/* Summary chips */}
        <div style={{ display:'flex', gap:6 }}>
          {[
            { icon:'calendar', val: weekTotal,  label:'eventos',  color:'var(--kiuvo-blue)' },
            { icon:'map-pin',  val: visitCount, label:'visitas',  color:'var(--success)'    },
            { icon:'trophy',   val: closeCount, label:'cierres',  color:'#1D9E75'           },
          ].map(c => (
            <div key={c.label} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'4px 10px', borderRadius:'var(--r-full)',
              background: c.color + '14', fontSize:11, color: c.color, fontWeight:500,
            }}>
              <Icon name={c.icon} size={12} color={c.color} />
              {c.val} {c.label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Type filter */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {types.map(t => {
            const cfg = t !== 'Todos' ? TYPE_CFG[t] : null
            const on  = typeFilter === t
            return (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding:'4px 10px', fontSize:11, borderRadius:'var(--r-full)',
                border: on ? `1px solid ${cfg?.color || 'var(--kiuvo-blue)'}` : '0.5px solid var(--border)',
                background: on ? (cfg?.color || 'var(--kiuvo-blue)') + '18' : 'var(--surface)',
                color:  on ? (cfg?.color || 'var(--kiuvo-blue)') : 'var(--fg-secondary)',
                fontWeight: on ? 500 : 400,
                display: 'flex', alignItems:'center', gap:4,
              }}>
                {cfg && <Icon name={cfg.icon} size={11} color={on ? cfg.color : 'var(--fg-secondary)'} />}
                {cfg ? cfg.label : 'Todos'}
              </button>
            )
          })}
        </div>

        {/* Seller */}
        <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} style={{
          padding:'6px 10px', fontSize:12,
          border:'0.5px solid var(--border)', borderRadius:'var(--r-md)',
          background:'var(--surface)', color:'var(--fg)',
        }}>
          {sellerInits.map(s => (
            <option key={s} value={s}>{s === 'Todos' ? 'Todos los vendedores' : sellerName(sellers, s)}</option>
          ))}
        </select>

        {/* View toggle */}
        <div style={{
          display:'inline-flex', background:'var(--bg)',
          border:'0.5px solid var(--border)', borderRadius:'var(--r-md)', padding:2, gap:1,
        }}>
          {[['semana','layout-kanban','Semana'],['lista','notes','Lista']].map(([v,ic,lb]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'4px 10px', fontSize:11, display:'flex', alignItems:'center', gap:5,
              fontWeight: view===v ? 500 : 400,
              color: view===v ? 'var(--fg)' : 'var(--fg-secondary)',
              background: view===v ? 'var(--surface)' : 'transparent',
              borderRadius:'var(--r-sm)',
              border: view===v ? '0.5px solid var(--border)' : 'none',
            }}>
              <Icon name={ic} size={12} />
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {view === 'semana' ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Day headers (sticky) */}
            <div style={{
              display:'flex', borderBottom:'0.5px solid var(--border)',
              background:'var(--surface)', flexShrink:0,
            }}>
              {/* Time gutter */}
              <div style={{ width:52, flexShrink:0, borderRight:'0.5px solid var(--border)' }} />

              {weekDays.map((d, i) => {
                const iso     = weekISOs[i]
                const isToday = iso === TODAY
                const count   = filteredEvents.filter(e => e.date === iso).length

                return (
                  <div key={iso} style={{
                    flex:1, padding:'10px 0 8px',
                    borderRight: i < 4 ? '0.5px solid var(--border)' : 'none',
                    textAlign:'center',
                    background: isToday ? 'var(--kiuvo-blue-soft)' : 'transparent',
                  }}>
                    <div style={{ fontSize:10, fontWeight:500, color: isToday ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)', letterSpacing:0.5 }}>
                      {ES_DAYS[d.getDay()].toUpperCase()}
                    </div>
                    <div style={{
                      fontSize:20, fontWeight:700, lineHeight:1.1, marginTop:2,
                      color: isToday ? 'var(--kiuvo-blue)' : 'var(--fg)',
                    }}>{d.getDate()}</div>
                    {count > 0 && (
                      <div style={{
                        marginTop:4, display:'inline-block',
                        fontSize:9, fontWeight:600,
                        padding:'1px 6px', borderRadius:'var(--r-full)',
                        background: isToday ? 'var(--kiuvo-blue)' : 'var(--bg-secondary)',
                        color: isToday ? '#fff' : 'var(--fg-secondary)',
                      }}>{count}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Scrollable calendar body */}
            <div ref={bodyRef} style={{ flex:1, overflowY:'auto', display:'flex' }}>
              {/* Time gutter */}
              <div style={{ width:52, flexShrink:0, borderRight:'0.5px solid var(--border)', position:'relative' }}>
                {HOURS.map(h => (
                  <div key={h} style={{
                    position:'absolute', top: (h - DAY_START) * HOUR_H - 7,
                    right:8, fontSize:9, color:'var(--fg-tertiary)', fontWeight:500,
                    userSelect:'none',
                  }}>
                    {h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}
                  </div>
                ))}
                <div style={{ height: HOURS.length * HOUR_H }} />
              </div>

              {/* Day columns */}
              <div style={{ flex:1, display:'flex', position:'relative' }}>
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
          </div>
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
