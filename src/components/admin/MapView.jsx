import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { MOCK_PROSPECTS, MOCK_SELLERS } from '../../constants/mockData'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Constants ────────────────────────────────────────────────────────────────
// Hex values — CSS vars don't resolve inside Leaflet's SVG renderer
const HEALTH_HEX   = { green: '#1D9E75', amber: '#EF9F27', red: '#D85A30', black: '#888780' }
const HEALTH_LABEL = { green: 'Al día',  amber: 'En riesgo', red: 'Urgente' }

const fmt = n => '$' + n.toLocaleString('es-MX')

function sellerColor(init) {
  return MOCK_SELLERS.find(s => s.init === init)?.color || '#888780'
}
function sellerName(init) {
  return MOCK_SELLERS.find(s => s.init === init)?.name || init
}

// ─── Map canvas (vanilla Leaflet, compatible with React 18) ───────────────────
function MapCanvas({ prospects, colorBy, selected, setSelected, setHovered }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const LfRef        = useRef(null)
  const markersRef   = useRef([])
  const [mapReady, setMapReady] = useState(false)

  // Init Leaflet once on mount
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(mod => {
      const Lf = mod.default || mod
      LfRef.current = Lf

      const map = Lf.map(containerRef.current, {
        center: [21.5, -102.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Re-measure after flex layout settles
      setTimeout(() => map.invalidateSize(), 100)
      setMapReady(true)
    }).catch(err => console.error('Leaflet load error:', err))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Redraw markers whenever data or colorBy changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LfRef.current) return
    const map = mapRef.current
    const Lf  = LfRef.current

    // Remove previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!prospects.length) return

    prospects.forEach(p => {
      const color = colorBy === 'health' ? (HEALTH_HEX[p.health] ?? '#888780')
                  : colorBy === 'stage'  ? (STAGE_BY_ID[p.stage]?.color ?? '#888780')
                  : sellerColor(p.owner)

      const isSel  = selected?.id === p.id
      const stage  = STAGE_BY_ID[p.stage]

      const circle = Lf.circleMarker([p.lat, p.lng], {
        radius:      isSel ? 14 : 9,
        fillColor:   color,
        fillOpacity: 1,
        color:       '#ffffff',
        weight:      isSel ? 3 : 2,
      }).addTo(map)

      circle.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:190px;padding:2px 0">
          <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:3px">${p.name}</div>
          <div style="font-size:11px;color:#666;margin-bottom:8px">${p.contact} · ${p.city}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
            <span style="font-size:10px;font-weight:600;color:${stage?.color};background:${stage?.color}22;padding:2px 8px;border-radius:99px">${stage?.label}</span>
            <span style="font-size:10px;font-weight:600;color:${HEALTH_HEX[p.health]};background:${HEALTH_HEX[p.health]}22;padding:2px 8px;border-radius:99px">${HEALTH_LABEL[p.health]}</span>
          </div>
          <div style="font-size:16px;font-weight:700;color:#185FA5">${fmt(p.value)}</div>
          <div style="font-size:11px;color:#999;margin-top:2px">${sellerName(p.owner)} · ${p.last}</div>
        </div>
      `, { maxWidth: 240 })

      circle.on('click',     () => setSelected(isSel ? null : p))
      circle.on('mouseover', e  => { setHovered(p.id); circle.openPopup() })
      circle.on('mouseout',  ()  => { setHovered(null); circle.closePopup() })

      markersRef.current.push(circle)
    })

    // Fit all pins in view
    const bounds = Lf.latLngBounds(prospects.map(p => [p.lat, p.lng]))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 })

  }, [mapReady, prospects, colorBy, selected])

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
  )
}

// ─── Sidebar prospect list ─────────────────────────────────────────────────────
function SidebarList({ prospects, selected, setSelected, setHovered }) {
  return (
    <div style={{
      width: 272, flexShrink: 0,
      borderLeft: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
          Prospectos en mapa
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
          {prospects.length} mostrados · ordenados por valor
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {[...prospects].sort((a, b) => b.value - a.value).map(p => {
          const isSel = selected?.id === p.id
          const stage = STAGE_BY_ID[p.stage]
          const color = sellerColor(p.owner)
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(isSel ? null : p)}
              style={{
                padding: '10px 16px', borderBottom: '0.5px solid var(--border)',
                cursor: 'pointer',
                background: isSel ? 'var(--kiuvo-blue-soft)' : 'transparent',
                transition: 'background 0.1s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: HEALTH_HEX[p.health] }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1 }}>{p.city} · {stage?.label}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{fmt(p.value)}</div>
                <div style={{
                  display: 'inline-block', marginTop: 2,
                  width: 18, height: 18, borderRadius: '50%',
                  background: color + '22', color,
                  fontSize: 8, fontWeight: 700, lineHeight: '18px', textAlign: 'center',
                }}>{p.owner}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-tertiary)', marginBottom: 8, letterSpacing: 0.5 }}>POR CIUDAD</div>
        {Object.entries(
          prospects.reduce((acc, p) => { acc[p.city] = (acc[p.city] || 0) + 1; return acc }, {})
        ).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
          <div key={city} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{city}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ height: 4, borderRadius: 2, width: Math.round((count / prospects.length) * 80), background: 'var(--kiuvo-blue)', opacity: 0.6 }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg)', minWidth: 14, textAlign: 'right' }}>{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView() {
  const [sellerFilter, setSellerFilter] = useState('Todos')
  const [healthFilter, setHealthFilter] = useState('Todos')
  const [colorBy,      setColorBy]      = useState('health')
  const [hovered,      setHovered]      = useState(null)
  const [selected,     setSelected]     = useState(null)

  const sellers = ['Todos', ...MOCK_SELLERS.map(s => s.init)]

  const prospects = MOCK_PROSPECTS.filter(p => {
    if (sellerFilter !== 'Todos' && p.owner !== sellerFilter) return false
    if (healthFilter === 'Al día'    && p.health !== 'green') return false
    if (healthFilter === 'En riesgo' && p.health !== 'amber') return false
    if (healthFilter === 'Urgente'   && p.health !== 'red')   return false
    return true
  })

  const totalValue = prospects.reduce((s, p) => s + p.value, 0)
  const atRisk     = prospects.filter(p => p.health !== 'green').length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--r-full)', background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)', fontSize: 12, fontWeight: 500 }}>
          <Icon name="map-pin" size={13} />
          {prospects.length} prospectos
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--r-full)', background: 'var(--surface)', border: '0.5px solid var(--border)', fontSize: 12, color: 'var(--fg-secondary)' }}>
          <Icon name="target" size={13} />
          {fmt(totalValue)} potencial
        </div>
        {atRisk > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--r-full)', background: 'var(--warning-bg)', color: 'var(--warning-fg)', fontSize: 12, fontWeight: 500 }}>
            <Icon name="alert-triangle" size={13} />
            {atRisk} en riesgo
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Color by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>Color por</span>
          <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2, gap: 1 }}>
            {[['health','Salud'],['stage','Etapa'],['seller','Vendedor']].map(([v, l]) => (
              <button key={v} onClick={() => setColorBy(v)} style={{
                padding: '4px 10px', fontSize: 11,
                fontWeight: colorBy === v ? 500 : 400,
                color: colorBy === v ? 'var(--fg)' : 'var(--fg-secondary)',
                background: colorBy === v ? 'var(--surface)' : 'transparent',
                borderRadius: 'var(--r-sm)',
                border: colorBy === v ? '0.5px solid var(--border)' : 'none',
                transition: 'all 0.12s',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Health filter */}
        <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2, gap: 1 }}>
          {['Todos','Al día','En riesgo','Urgente'].map(f => (
            <button key={f} onClick={() => setHealthFilter(f)} style={{
              padding: '4px 10px', fontSize: 11,
              fontWeight: healthFilter === f ? 500 : 400,
              color: healthFilter === f ? 'var(--fg)' : 'var(--fg-secondary)',
              background: healthFilter === f ? 'var(--surface)' : 'transparent',
              borderRadius: 'var(--r-sm)',
              border: healthFilter === f ? '0.5px solid var(--border)' : 'none',
              transition: 'all 0.12s',
            }}>{f}</button>
          ))}
        </div>

        {/* Seller filter */}
        <select
          value={sellerFilter}
          onChange={e => setSellerFilter(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)' }}
        >
          {sellers.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos los vendedores' : sellerName(s)}</option>)}
        </select>
      </div>

      {/* ── Map + Sidebar ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Legend — absolute over the map */}
        <div style={{
          position: 'absolute', bottom: 20, left: 20, zIndex: 1000,
          background: 'white', border: '1px solid #ddd',
          borderRadius: 8, padding: '7px 12px',
          display: 'flex', gap: 14, alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          fontSize: 11,
        }}>
          {colorBy === 'health' && ['green','amber','red'].map(h => (
            <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: HEALTH_HEX[h] }} />
              <span style={{ color: '#555' }}>{HEALTH_LABEL[h]}</span>
            </div>
          ))}
          {colorBy === 'stage' && ['prospeccion','presentacion','cotizacion','negociacion','cierre'].map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_BY_ID[id].color }} />
              <span style={{ color: '#555' }}>{STAGE_BY_ID[id].label}</span>
            </div>
          ))}
          {colorBy === 'seller' && MOCK_SELLERS.map(s => (
            <div key={s.init} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              <span style={{ color: '#555' }}>{s.name.split(' ')[0]}</span>
            </div>
          ))}
          <div style={{ width: 1, height: 14, background: '#ddd' }} />
          <span style={{ color: '#999' }}>Clic en un punto para detalles</span>
        </div>

        {/* Map container — fills remaining space next to sidebar */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <MapCanvas
            prospects={prospects}
            colorBy={colorBy}
            selected={selected}
            setSelected={setSelected}
            setHovered={setHovered}
          />
        </div>

        <SidebarList
          prospects={prospects}
          selected={selected}
          setSelected={setSelected}
          setHovered={setHovered}
        />
      </div>
    </div>
  )
}
