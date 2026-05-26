import React, { useState, useMemo, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useActivities } from '../../hooks/useActivities'
import { useSellers } from '../../hooks/useSellers'

// ─── Configuración de tipos ───────────────────────────────────────────────────
const KIND_CFG = {
  visit:    { label: 'Visita',        icon: 'map-pin',         color: 'var(--kiuvo-blue)',  bg: '#185FA520' },
  call:     { label: 'Llamada',       icon: 'phone',           color: '#D85A30',            bg: '#D85A3020' },
  whatsapp: { label: 'WhatsApp',      icon: 'brand-whatsapp',  color: '#25D366',            bg: '#25D36620' },
  email:    { label: 'Email',         icon: 'mail',            color: 'var(--info)',        bg: '#378ADD20' },
  quote:    { label: 'Cotización',    icon: 'file-text',       color: 'var(--warning)',     bg: '#EF9F2720' },
  stage:    { label: 'Cambio etapa',  icon: 'arrows-sort',     color: '#7C3AED',            bg: '#7C3AED20' },
  win:      { label: 'Cierre',        icon: 'trophy',          color: 'var(--success)',     bg: '#1D9E7530' },
  new:      { label: 'Nuevo prosp.',  icon: 'user-plus',       color: '#EF9F27',            bg: '#EF9F2720' },
}
const ALL_KINDS = Object.keys(KIND_CFG)

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = iso => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
// sellerColor se pasa como prop desde el componente principal

function exportCSV(rows) {
  const header = ['Fecha', 'Hora', 'Vendedor', 'Prospecto', 'Tipo', 'Detalle', 'Monto']
  const escape = s => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    header.join(','),
    ...rows.map(r => [
      r.date, r.time, r.sellerName, r.prospect,
      KIND_CFG[r.kind]?.label || r.kind,
      escape(r.detail),
      r.amount,
    ].join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `actividades_kiuvo_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Kind badge ───────────────────────────────────────────────────────────────
function KindBadge({ kind }) {
  const cfg = KIND_CFG[kind] || KIND_CFG.visit
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <Icon name={cfg.icon} size={11} color={cfg.color} />
      {cfg.label}
    </span>
  )
}

// ─── Seller avatar ────────────────────────────────────────────────────────────
function SellerAvatar({ init, name }) {
  const color = sellerColor(init)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: color + '22', color, border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
      }}>{init}</div>
      <span style={{ fontSize: 12, color: 'var(--fg)', whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  )
}

// ─── Filter dropdown (vendedor) ───────────────────────────────────────────────
function SellerDropdown({ value, onChange, sellers = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const label = value ? (sellers.find(s => s.init === value)?.name || value) : 'Todos los vendedores'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 'var(--r-md)',
          border: '0.5px solid var(--border)', background: value ? 'var(--kiuvo-blue)' : 'var(--surface)',
          color: value ? '#fff' : 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name="users" size={13} />
        {label}
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px #0002', minWidth: 180,
          overflow: 'hidden',
        }}>
          {[{ init: '', name: 'Todos los vendedores' }, ...sellers].map(s => (
            <button
              key={s.init}
              onClick={() => { onChange(s.init); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px', textAlign: 'left',
                background: value === s.init ? '#185FA510' : 'transparent',
                color: 'var(--fg)', fontSize: 12,
              }}
            >
              {s.init ? (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: (sellers.find(x => x.init === s.init)?.color || '#888') + '22', color: sellers.find(x => x.init === s.init)?.color || '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                }}>{s.init}</div>
              ) : <div style={{ width: 20 }} />}
              {s.name}
              {value === s.init && s.init && (
                <Icon name="check" size={12} color="var(--kiuvo-blue)" style={{ marginLeft: 'auto' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Kind filter pills ────────────────────────────────────────────────────────
function KindFilter({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {ALL_KINDS.map(k => {
        const cfg = KIND_CFG[k]
        const on  = active.includes(k)
        return (
          <button
            key={k}
            onClick={() => onChange(on ? active.filter(x => x !== k) : [...active, k])}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              border: `0.5px solid ${on ? cfg.color : 'var(--border)'}`,
              background: on ? cfg.bg : 'transparent',
              color: on ? cfg.color : 'var(--fg-tertiary)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            <Icon name={cfg.icon} size={11} />
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────
function ActivityRow({ row, isLast }) {
  return (
    <tr style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{fmtDate(row.date)}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{row.time}</div>
      </td>
      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
        <KindBadge kind={row.kind} />
      </td>
      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
        <SellerAvatar init={row.sellerInit} name={row.sellerName} />
      </td>
      <td style={{ padding: '10px 12px', verticalAlign: 'middle', maxWidth: 180 }}>
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.prospect}
        </div>
      </td>
      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
          {row.detail}
        </div>
      </td>
      <td style={{ padding: '10px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {row.amount
          ? <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>{row.amount}</span>
          : <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>—</span>
        }
      </td>
    </tr>
  )
}

// ─── Date group header ────────────────────────────────────────────────────────
function DateGroupRow({ dateLabel }) {
  return (
    <tr>
      <td colSpan={6} style={{
        padding: '12px 16px 6px', background: 'var(--bg)',
        fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)',
        letterSpacing: 0.5, textTransform: 'uppercase',
        borderBottom: '0.5px solid var(--border)',
        position: 'sticky', top: 37,
      }}>
        {dateLabel}
      </td>
    </tr>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 30

export default function ActivitiesView() {
  const { activities, loading } = useActivities({ limit: 200 })
  const { sellers }             = useSellers()

  const [seller,      setSeller]      = useState('')
  const [kinds,       setKinds]       = useState([])
  const [prospect,    setProspect]    = useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [page,        setPage]        = useState(1)
  const [exported,    setExported]    = useState(false)

  const filtered = useMemo(() => activities.filter(a => {
    if (seller   && a.sellerInit !== seller) return false
    if (kinds.length > 0 && !kinds.includes(a.kind)) return false
    if (prospect && !a.prospect.toLowerCase().includes(prospect.toLowerCase())) return false
    if (dateFrom && a.date < dateFrom) return false
    if (dateTo   && a.date > dateTo)   return false
    return true
  }), [activities, seller, kinds, prospect, dateFrom, dateTo])

  useEffect(() => setPage(1), [seller, kinds, prospect, dateFrom, dateTo])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  const grouped = useMemo(() => {
    const TODAY     = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000)
    const YESTERDAY = yesterday.toISOString().slice(0, 10)
    const groups = []
    let lastDate = null
    for (const row of visible) {
      if (row.date !== lastDate) {
        lastDate = row.date
        const label = row.date === TODAY ? `Hoy · ${fmtDate(row.date)}`
          : row.date === YESTERDAY      ? `Ayer · ${fmtDate(row.date)}`
          : fmtDate(row.date)
        groups.push({ type: 'date', label, key: row.date })
      }
      groups.push({ type: 'row', row })
    }
    return groups
  }, [visible])

  const activeFilterCount = [seller ? 1 : 0, kinds.length, prospect ? 1 : 0, dateFrom ? 1 : 0, dateTo ? 1 : 0].reduce((a, b) => a + b, 0)
  const clearFilters = () => { setSeller(''); setKinds([]); setProspect(''); setDateFrom(''); setDateTo('') }

  const counts = useMemo(() => {
    const c = Object.fromEntries(ALL_KINDS.map(k => [k, 0]))
    for (const a of filtered) if (c[a.kind] !== undefined) c[a.kind]++
    return c
  }, [filtered])

  function handleExport() {
    exportCSV(filtered)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div style={{ padding: '14px 24px 12px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Historial de actividades</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--danger)', color: 'var(--danger)', background: 'var(--danger-bg)', fontSize: 12, cursor: 'pointer' }}>
              <Icon name="x" size={12} />Limpiar filtros
            </button>
          )}
          <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 'var(--r-md)', border: `0.5px solid ${showFilters ? 'var(--kiuvo-blue)' : 'var(--border)'}`, background: showFilters ? '#185FA510' : 'var(--surface)', color: showFilters ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer' }}>
            <Icon name="filter" size={13} />Filtros
            {activeFilterCount > 0 && <span style={{ background: 'var(--kiuvo-blue)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginLeft: 2 }}>{activeFilterCount}</span>}
          </button>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--r-md)', background: exported ? 'var(--success)' : 'var(--kiuvo-blue)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}>
            <Icon name={exported ? 'check' : 'download'} size={13} color="#fff" />
            {exported ? 'Descargado' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      {showFilters && (
        <div style={{ padding: '12px 24px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SellerDropdown value={seller} onChange={setSeller} sellers={sellers} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icon name="search" size={13} color="var(--fg-tertiary)" style={{ position: 'absolute', left: 9, pointerEvents: 'none' }} />
              <input placeholder="Buscar prospecto…" value={prospect} onChange={e => setProspect(e.target.value)} style={{ paddingLeft: 28, paddingRight: 10, height: 32, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12, width: 180, outline: 'none' }} />
              {prospect && <button onClick={() => setProspect('')} style={{ position: 'absolute', right: 6, color: 'var(--fg-tertiary)', display: 'flex' }}><Icon name="x" size={11} /></button>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap' }}>Desde</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ height: 32, padding: '0 8px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap' }}>Hasta</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ height: 32, padding: '0 8px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12, outline: 'none' }} />
            </div>
            {(() => {
              const todayISO  = new Date().toISOString().slice(0, 10)
              const monday    = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
              const mondayISO = monday.toISOString().slice(0, 10)
              const month1ISO = todayISO.slice(0, 8) + '01'
              return [
                { label: 'Hoy',         from: todayISO,  to: todayISO  },
                { label: 'Esta semana', from: mondayISO, to: todayISO  },
                { label: 'Este mes',    from: month1ISO, to: todayISO  },
              ]
            })().map(p => (
              <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--fg-secondary)', cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap' }}>Tipo:</span>
            <KindFilter active={kinds} onChange={setKinds} />
          </div>
        </div>
      )}

      {/* ── Summary mini-KPIs ── */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', background: 'var(--surface)', overflowX: 'auto' }}>
        {ALL_KINDS.map((k, i) => {
          const cfg = KIND_CFG[k], n = counts[k]
          return (
            <div key={k} onClick={() => setKinds(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} style={{ flex: '0 0 auto', padding: '8px 16px', borderRight: i < ALL_KINDS.length - 1 ? '0.5px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: kinds.includes(k) ? cfg.bg : 'transparent', transition: 'background 0.12s' }}>
              <Icon name={cfg.icon} size={13} color={n > 0 ? cfg.color : 'var(--fg-tertiary)'} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: n > 0 ? 'var(--fg)' : 'var(--fg-tertiary)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1 }}>{cfg.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-tertiary)', fontSize: 13 }}>Cargando actividades…</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--fg-tertiary)' }}>
            <Icon name="history" size={28} />
            <div style={{ fontSize: 13 }}>Sin actividades con los filtros seleccionados</div>
            {activeFilterCount > 0 && <button onClick={clearFilters} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', textDecoration: 'underline', cursor: 'pointer' }}>Limpiar filtros</button>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '0.5px solid var(--border)' }}>
                {['Fecha / Hora', 'Tipo', 'Vendedor', 'Prospecto', 'Detalle', 'Monto'].map((h, i) => (
                  <th key={h} style={{ padding: `8px ${i === 0 || i === 5 ? '16px' : '12px'}`, textAlign: i === 5 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)', letterSpacing: 0.4, textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((item, idx) =>
                item.type === 'date'
                  ? <DateGroupRow key={item.key} dateLabel={item.label} />
                  : <ActivityRow key={item.row.id} row={item.row} isLast={idx === grouped.length - 1} />
              )}
            </tbody>
          </table>
        )}

        {hasMore && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button onClick={() => setPage(p => p + 1)} style={{ padding: '8px 24px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer' }}>
              Mostrar más · quedan {filtered.length - visible.length}
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
              Mostrando {Math.min(visible.length, filtered.length)} de {filtered.length} registros
            </span>
            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--fg-secondary)', fontSize: 11, cursor: 'pointer' }}>
              <Icon name="download" size={12} />
              Exportar {filtered.length} registros a CSV
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
