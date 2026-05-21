import React, { useEffect, useRef } from 'react'
import { STAGE_BY_ID } from '../../constants/stages'
import Icon from '../shared/Icon'

// ─── Prospect pins with real Querétaro coordinates ────────────────────────────

const PINS = [
  { lat: 20.5937, lng: -100.3895, stage: 'presentacion', name: 'Ferretería del Valle',   address: 'Av. Constituyentes 412' },
  { lat: 20.6120, lng: -100.3720, stage: 'cotizacion',   name: 'Distribuidora Norte',    address: 'Blvd. Bernardo Quintana 4200' },
  { lat: 20.5780, lng: -100.4020, stage: 'cierre',       name: 'Constructora ABC',       address: 'Parque Industrial B. Q.' },
  { lat: 20.5670, lng: -100.3860, stage: 'negociacion',  name: 'Comercial Las Palmas',   address: 'Av. 5 de Febrero 220' },
  { lat: 20.5950, lng: -100.3580, stage: 'prospeccion',  name: 'Maderería San Juan',     address: 'Carretera 57 km 14' },
]

// ─── Route for "Ruta sugerida" ────────────────────────────────────────────────

const ROUTE_ORDER = [2, 0, 4, 1, 3] // indices in PINS

// ─── MapView ─────────────────────────────────────────────────────────────────

function MapView({ onPinClick }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      const Lf = L.default || L

      const map = Lf.map(containerRef.current, {
        center: [20.5888, -100.3895],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      // OpenStreetMap tile layer — 100% free, no API key
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Draw route polyline
      const routeCoords = ROUTE_ORDER.map(i => [PINS[i].lat, PINS[i].lng])
      Lf.polyline(routeCoords, { color: '#185FA5', weight: 2.5, opacity: 0.65, dashArray: '6 4' }).addTo(map)

      // Add prospect pins
      PINS.forEach((pin, i) => {
        const s = STAGE_BY_ID[pin.stage]

        // Custom colored marker using divIcon
        const icon = Lf.divIcon({
          className: '',
          html: `<div style="
            width: 30px; height: 30px;
            background: ${s.color};
            border: 2px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -32],
        })

        const marker = Lf.marker([pin.lat, pin.lng], { icon }).addTo(map)
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 160px">
            <div style="font-size: 13px; font-weight: 600; color: #111; margin-bottom: 4px">${pin.name}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 6px">${pin.address}</div>
            <span style="
              font-size: 11px; font-weight: 500; color: ${s.color};
              background: ${s.color}22; padding: 2px 8px;
              border-radius: 99px;
            ">${s.label}</span>
          </div>
        `, { maxWidth: 220 })

        marker.on('click', () => onPinClick?.(pin))
      })

      // Route start/end markers
      ROUTE_ORDER.forEach((pinIdx, order) => {
        const pin = PINS[pinIdx]
        Lf.circleMarker([pin.lat, pin.lng], {
          radius: 7, fillColor: '#fff', color: '#185FA5',
          weight: 2, fillOpacity: 1,
        }).addTo(map)
          .bindTooltip(`${order + 1}`, { permanent: true, direction: 'center', className: 'leaflet-order-tooltip' })
      })

      return () => { map.remove(); mapRef.current = null }
    }).catch(err => console.error('Leaflet load error:', err))
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', borderRadius: 'var(--r-lg)' }}
    />
  )
}

// ─── MapScreen (main export) ──────────────────────────────────────────────────

export default function MapScreen() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 92 }}>
      {/* Header */}
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)' }}>Mapa de prospectos</div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
          Querétaro · {PINS.length} prospectos activos · OpenStreetMap
        </div>
      </div>

      {/* Map container */}
      <div style={{ margin: '0 16px', height: 400, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '0.5px solid var(--border)', position: 'relative', zIndex: 0 }}>
        <MapView />
      </div>

      {/* Route card */}
      <div style={{ margin: '12px 16px 0', padding: '12px 14px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Ruta sugerida</div>
            <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>5 paradas · 23 km · 1h 45min estimado</div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/${ROUTE_ORDER.map(i => `${PINS[i].lat},${PINS[i].lng}`).join('/')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 14px', background: 'var(--kiuvo-blue)', color: '#fff',
              borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon name="navigation" size={14} color="#fff" />
            Abrir en Maps
          </a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ROUTE_ORDER.map((pinIdx, order) => {
            const pin = PINS[pinIdx]
            const s   = STAGE_BY_ID[pin.stage]
            return (
              <div key={pinIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                }}>{order + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.name}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, color: s.color, background: s.color + '18', padding: '2px 6px', borderRadius: 99, flexShrink: 0 }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ margin: '10px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {['prospeccion','presentacion','cotizacion','negociacion','cierre'].map(id => {
          const s = STAGE_BY_ID[id]
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* OpenStreetMap attribution note */}
      <div style={{ margin: '10px 16px 0', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="map-2" size={15} color="var(--fg-tertiary)" />
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.5 }}>
          Mapa gratuito con <strong>OpenStreetMap</strong> + Leaflet. Toca un pin para ver detalles. "Abrir en Maps" lanza la ruta en Google Maps.
        </div>
      </div>
    </div>
  )
}
