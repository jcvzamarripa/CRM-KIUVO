import React, { useState, useRef, useEffect } from 'react'
import { Pill, Segmented, Avatar, Empty } from '../ui'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useSellers } from '../../hooks/useSellers'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Constants ────────────────────────────────────────────────────────────────
// Hex values — CSS vars don't resolve inside Leaflet's SVG renderer
const HEALTH_HEX   = { green: '#1D9E75', amber: '#EF9F27', red: '#D85A30', black: '#888780' }
const HEALTH_LABEL = { green: 'Al día',  amber: 'En riesgo', red: 'Urgente' }

const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

const LAYOUT_CSS = `
  .mv-toolbar { padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; flex-shrink: 0; }
  .mv-body { flex: 1; display: flex; gap: 16px; padding: 0 20px 20px; min-height: 0; overflow: hidden; }
  .mv-map { flex: 1; position: relative; min-width: 0; border-radius: var(--r-lg); overflow: hidden; background: var(--surface); }
  .mv-side { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); border-radius: var(--r-lg); }
  .mv-legend {
    position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 1000; width: fit-content; max-width: calc(100% - 32px);
    display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center;
    padding: 8px 14px; border-radius: var(--r-md);
    background: var(--surface); color: var(--fg-secondary); font-size: 12px;
    box-shadow: var(--shadow-float);
  }
  @media (max-width: 900px) {
    .mv-toolbar { padding: 12px; }
    .mv-body { flex-direction: column; padding: 0 12px 12px; overflow-y: auto; }
    .mv-map { flex: none; height: 56vh; min-height: 300px; }
    .mv-side { width: 100%; flex: none; max-height: none; overflow: visible; }
    .mv-side__list { overflow: visible !important; }
  }
`

// ─── Map canvas (vanilla Leaflet, compatible with React 18) ───────────────────
function MapCanvas({ prospects, colorBy, selected, setSelected, setHovered, sellerColor, sellerName }) {
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
        color:       isSel ? '#0E0E0E' : '#ffffff',
        weight:      isSel ? 3 : 2,
      }).addTo(map)

      const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
      circle.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:2px 0;color:#0E0E0E">
          <div style="font-weight:700;font-size:15px;margin-bottom:3px">${esc(p.name)}</div>
          <div style="font-size:12px;color:#4A4A47;margin-bottom:10px">${esc(p.contact)} · ${esc(p.city)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
            <span style="font-size:12px;font-weight:600;color:${stage?.color};background:${stage?.color}22;padding:3px 10px;border-radius:99px">${esc(stage?.label)}</span>
            <span style="font-size:12px;font-weight:600;color:${HEALTH_HEX[p.health]};background:${HEALTH_HEX[p.health]}22;padding:3px 10px;border-radius:99px">${HEALTH_LABEL[p.health]}</span>
          </div>
          <div style="font-family:Urbanist,Inter,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em">${fmt(p.value)}</div>
          <div style="font-size:12px;color:#6B6B67;margin-top:2px">${esc(sellerName(p.owner))} · ${esc(p.last)}</div>
        </div>
      `, { maxWidth: 260 })

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
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
  )
}

// ─── Sidebar prospect list ─────────────────────────────────────────────────────
function SidebarList({ prospects, selected, setSelected, setHovered, sellerColor }) {
  return (
    <div className="mv-side">
      <div style={{ padding: '16px 16px 12px' }}>
        <div className="k-h2">Prospectos en mapa</div>
        <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
          {prospects.length} mostrados · ordenados por valor
        </div>
      </div>

      <div className="mv-side__list" style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
        {prospects.length === 0 && <Empty icon="map-pin">Sin prospectos con ubicación</Empty>}
        {[...prospects].sort((a, b) => b.value - a.value).map(p => {
          const isSel = selected?.id === p.id
          const stage = STAGE_BY_ID[p.stage]
          return (
            <button
              key={p.id}
              type="button"
              className="k-row"
              aria-pressed={isSel}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(isSel ? null : p)}
              style={{
                background: isSel ? 'var(--primary-bg)' : 'transparent',
                color: isSel ? 'var(--primary-fg)' : 'var(--fg)',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: HEALTH_HEX[p.health] }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.city} · {stage?.label}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span className="k-num" style={{ fontSize: 15 }}>{fmt(p.value)}</span>
                <Avatar size="sm" initials={p.owner} color={sellerColor(p.owner)} style={{ width: 22, height: 22, fontSize: 9 }} />
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
        <div className="k-label" style={{ marginBottom: 8 }}>Por ciudad</div>
        {Object.entries(
          prospects.reduce((acc, p) => { acc[p.city] = (acc[p.city] || 0) + 1; return acc }, {})
        ).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
          <div key={city} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <div className="k-muted" style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ height: 6, borderRadius: 3, width: Math.round((count / prospects.length) * 80), background: 'var(--accent-2)' }} />
              <span className="k-num" style={{ fontSize: 14, minWidth: 18, textAlign: 'right' }}>{count}</span>
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

  const { sellers: sellerList } = useSellers()
  const { prospects: allProspects } = useAdminProspects()

  const sellerColor = init => sellerList.find(s => s.init === init)?.color || '#888780'
  const sellerName  = init => sellerList.find(s => s.init === init)?.name  || init

  const sellers = ['Todos', ...sellerList.map(s => s.init)]

  const prospects = allProspects.filter(p => {
    if (p.lat == null || p.lng == null) return false          // sin coordenadas → no se plotea
    if (sellerFilter !== 'Todos' && p.owner !== sellerFilter) return false
    if (healthFilter === 'Al día'    && p.health !== 'green') return false
    if (healthFilter === 'En riesgo' && p.health !== 'amber') return false
    if (healthFilter === 'Urgente'   && p.health !== 'red')   return false
    return true
  })

  const totalValue  = prospects.filter(p => p.stage !== 'cierre' && p.stage !== 'repositorio').reduce((s, p) => s + p.value, 0)
  const atRisk      = prospects.filter(p => p.health !== 'green').length
  const noCoords    = allProspects.filter(p => p.lat == null || p.lng == null).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)', minWidth: 0 }}>
      <style>{LAYOUT_CSS}</style>

      {/* ── Toolbar ── */}
      <div className="mv-toolbar">
        <Pill icon="map-pin" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{prospects.length} prospectos</Pill>
        <Pill icon="target" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{fmt(totalValue)} potencial</Pill>
        {atRisk > 0 && <Pill tone="warning" icon="alert-triangle">{atRisk} en riesgo</Pill>}
        {noCoords > 0 && <Pill icon="map-pin">{noCoords} sin ubicación</Pill>}

        <div style={{ flex: 1 }} />

        {/* Color by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
          <span className="k-dim" style={{ fontSize: 13, flexShrink: 0 }}>Color por</span>
          <Segmented
            surface
            value={colorBy}
            onChange={setColorBy}
            options={[{ id: 'health', label: 'Salud' }, { id: 'stage', label: 'Etapa' }, { id: 'seller', label: 'Vendedor' }]}
          />
        </div>

        {/* Health filter */}
        <Segmented
          surface
          value={healthFilter}
          onChange={setHealthFilter}
          options={['Todos', 'Al día', 'En riesgo', 'Urgente'].map(f => ({ id: f, label: f }))}
        />

        {/* Seller filter */}
        <select
          className="k-input k-input--sm k-input--pill"
          value={sellerFilter}
          onChange={e => setSellerFilter(e.target.value)}
          style={{ width: 'auto', maxWidth: '100%' }}
        >
          {sellers.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Todos los vendedores' : sellerName(s)}</option>)}
        </select>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="mv-body">
        <div className="mv-map">
          <MapCanvas
            prospects={prospects}
            colorBy={colorBy}
            selected={selected}
            setSelected={setSelected}
            setHovered={setHovered}
            sellerColor={sellerColor}
            sellerName={sellerName}
          />

          {/* Legend — over the map */}
          <div className="mv-legend">
            {colorBy === 'health' && ['green','amber','red'].map(h => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: HEALTH_HEX[h] }} />
                <span>{HEALTH_LABEL[h]}</span>
              </div>
            ))}
            {colorBy === 'stage' && ['prospeccion','presentacion','cotizacion','negociacion','cierre','repositorio'].map(id => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_BY_ID[id].color }} />
                <span>{STAGE_BY_ID[id].label}</span>
              </div>
            ))}
            {colorBy === 'seller' && sellerList.map(s => (
              <div key={s.init} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                <span>{s.name.split(' ')[0]}</span>
              </div>
            ))}
            <span className="k-dim">Clic en un punto para detalles</span>
          </div>
        </div>

        <SidebarList
          prospects={prospects}
          selected={selected}
          setSelected={setSelected}
          setHovered={setHovered}
          sellerColor={sellerColor}
        />
      </div>
    </div>
  )
}
