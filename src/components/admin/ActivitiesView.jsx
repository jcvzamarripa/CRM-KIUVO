import React, { useState, useMemo, useEffect } from 'react'
import { saveFile } from '../../lib/saveFile'
import { useActivities } from '../../hooks/useActivities'
import { useSellers } from '../../hooks/useSellers'
import { Card, Button, Pill, Chip, Avatar, SearchInput, Empty } from '../ui'

// ─── Configuración de tipos ───────────────────────────────────────────────────
const KIND_CFG = {
  visit:    { label: 'Visita',        icon: 'map-pin',         tone: 'sky' },
  call:     { label: 'Llamada',       icon: 'phone',           tone: 'coral' },
  whatsapp: { label: 'WhatsApp',      icon: 'brand-whatsapp',  tone: 'success' },
  email:    { label: 'Email',         icon: 'mail',            tone: 'sky' },
  quote:    { label: 'Cotización',    icon: 'file-text',       tone: 'warning' },
  stage:    { label: 'Cambio etapa',  icon: 'arrows-sort',     tone: 'lilac' },
  win:      { label: 'Cierre',        icon: 'trophy',          tone: 'accent' },
  new:      { label: 'Nuevo prosp.',  icon: 'user-plus',       tone: undefined },
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
  const escape = s => `"${String(s ?? '').replace(/"/g, '""')}"`
  const lines = [
    header.join(','),
    ...rows.map(r => {
      const dateStr = r.date || (r.created_at ? r.created_at.slice(0, 10) : '')
      const timeStr = r.timeStr || r.time || ''
      const prospectStr = r.prospect || r.target || ''
      return [
        dateStr, timeStr, r.sellerName,
        escape(prospectStr),
        KIND_CFG[r.kind]?.label || r.kind,
        escape(r.detail),
        r.amount,
      ].join(',')
    }),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  saveFile(blob, `actividades_kiuvo_${new Date().toISOString().slice(0, 10)}.csv`)
}

// ─── Kind badge ───────────────────────────────────────────────────────────────
function KindBadge({ kind }) {
  const cfg = KIND_CFG[kind] || KIND_CFG.visit
  return <Pill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Pill>
}

// ─── Seller avatar ────────────────────────────────────────────────────────────
function SellerAvatar({ init, name, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar initials={init} color={color} size="sm" />
      <span style={{ fontSize: 14, color: 'var(--fg)', whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  )
}

// ─── Filter dropdown (vendedor) ───────────────────────────────────────────────
function SellerDropdown({ value, onChange, sellers = [] }) {
  return (
    <select
      className="k-input k-input--sm k-input--pill"
      aria-label="Vendedor"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: 'auto', maxWidth: '100%' }}
    >
      <option value="">Todos los vendedores</option>
      {sellers.map(s => <option key={s.init} value={s.init}>{s.name}</option>)}
    </select>
  )
}

// ─── Kind filter (resumen por tipo: cada chip filtra) ─────────────────────────
function KindFilter({ active, onChange, counts }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ALL_KINDS.map(k => {
        const cfg = KIND_CFG[k]
        const on  = active.includes(k)
        return (
          <Chip
            key={k}
            icon={cfg.icon}
            selected={on}
            onClick={() => onChange(on ? active.filter(x => x !== k) : [...active, k])}
            style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }}
          >
            {cfg.label}
            <span className="k-num" style={{ fontSize: 14, opacity: counts[k] > 0 ? 1 : 0.5 }}>{counts[k]}</span>
          </Chip>
        )
      })}
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────
function ActivityRow({ row }) {
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 600 }}>{fmtDate(row.date)}</div>
        <div className="k-dim" style={{ fontSize: 12, marginTop: 1 }}>{row.timeStr || row.time}</div>
      </td>
      <td><KindBadge kind={row.kind} /></td>
      <td><SellerAvatar init={row.sellerInit} name={row.sellerName} color={row.sellerColor} /></td>
      <td style={{ maxWidth: 200 }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.prospect}
        </div>
      </td>
      <td>
        <div className="k-muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }} title={row.detail}>
          {row.detail}
        </div>
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {row.amount
          ? <span className="k-num" style={{ fontSize: 15, color: 'var(--success-fg)' }}>{row.amount}</span>
          : <span className="k-dim">—</span>
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
        padding: '14px 16px 8px', background: 'var(--bg-secondary)',
        fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
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
    if (prospect && !(a.prospect || a.target || '').toLowerCase().includes(prospect.toLowerCase())) return false
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

  const presets = (() => {
    const todayISO  = new Date().toISOString().slice(0, 10)
    const monday    = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const mondayISO = monday.toISOString().slice(0, 10)
    const month1ISO = todayISO.slice(0, 8) + '01'
    return [
      { label: 'Hoy',         from: todayISO,  to: todayISO  },
      { label: 'Esta semana', from: mondayISO, to: todayISO  },
      { label: 'Este mes',    from: month1ISO, to: todayISO  },
    ]
  })()

  return (
    <div className="sv-scroll" style={{ minWidth: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div className="k-h2">Historial de actividades</div>
          <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`}
          </div>
        </div>
        {activeFilterCount > 0 && (
          <Button variant="danger" size="sm" icon="x" onClick={clearFilters}>Limpiar filtros</Button>
        )}
        <Button variant={showFilters ? 'primary' : 'soft'} size="sm" icon="filter" onClick={() => setShowFilters(f => !f)}>
          Filtros{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </Button>
        <Button variant="accent" size="sm" icon={exported ? 'check' : 'download'} onClick={handleExport}>
          {exported ? 'Descargado' : 'Exportar CSV'}
        </Button>
      </div>

      {/* ── Filter bar ── */}
      {showFilters && (
        <Card style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SellerDropdown value={seller} onChange={setSeller} sellers={sellers} />
          <SearchInput small value={prospect} onChange={setProspect} placeholder="Buscar prospecto…" style={{ flex: '1 1 200px', maxWidth: 280 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="k-muted" style={{ fontSize: 13 }}>Desde</span>
            <input type="date" className="k-input k-input--sm k-input--pill" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="k-muted" style={{ fontSize: 13 }}>Hasta</span>
            <input type="date" className="k-input k-input--sm k-input--pill" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
          </label>
          {presets.map(p => (
            <Button key={p.label} variant={dateFrom === p.from && dateTo === p.to ? 'primary' : 'soft'} size="sm"
              onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}>
              {p.label}
            </Button>
          ))}
        </Card>
      )}

      {/* ── Resumen por tipo (cada uno filtra) ── */}
      <div style={{ marginBottom: 14 }}>
        <KindFilter active={kinds} onChange={setKinds} counts={counts} />
      </div>

      {/* ── Table ── */}
      <Card flush>
        {loading ? (
          <Empty icon="loader">Cargando actividades…</Empty>
        ) : filtered.length === 0 ? (
          <Empty icon="history">
            Sin actividades con los filtros seleccionados
            {activeFilterCount > 0 && (
              <div style={{ marginTop: 12 }}>
                <Button variant="soft" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
              </div>
            )}
          </Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="k-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  {['Fecha / Hora', 'Tipo', 'Vendedor', 'Prospecto', 'Detalle', 'Monto'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(item =>
                  item.type === 'date'
                    ? <DateGroupRow key={item.key} dateLabel={item.label} />
                    : <ActivityRow key={item.row.id} row={item.row} />
                )}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
            <Button variant="soft" size="sm" onClick={() => setPage(p => p + 1)}>
              Mostrar más · quedan {filtered.length - visible.length}
            </Button>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="k-dim" style={{ fontSize: 13 }}>
              Mostrando {Math.min(visible.length, filtered.length)} de {filtered.length} registros
            </span>
            <Button variant="outline" size="sm" icon="download" onClick={handleExport}>
              Exportar {filtered.length} registros a CSV
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
