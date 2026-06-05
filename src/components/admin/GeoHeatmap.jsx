import { useState, useEffect, useRef } from 'react'
import Icon from '../shared/Icon'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// ── hook ─────────────────────────────────────────────────────────────────────
function useProspectGeo() {
  const [points,  setPoints]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    supabase
      .from('prospects')
      .select('id, name, lat, lng, health, stage_id')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(300)
      .then(({ data }) => {
        setPoints(data || [])
        setLoading(false)
      })
  }, [])

  return { points, loading }
}

const HEALTH_HEX = {
  green: '#1D9E75',
  amber: '#EF9F27',
  red:   '#D85A30',
  black: '#888780',
}

// ── Mini Leaflet map ──────────────────────────────────────────────────────────
function MiniMap({ points }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(mod => {
      const Lf = mod.default || mod

      const map = Lf.map(containerRef.current, {
        center:           [21.88, -102.28],   // Aguascalientes
        zoom:             11,
        zoomControl:      true,
        attributionControl: false,
        scrollWheelZoom:  false,             // no scroll accidental en dashboard
      })
      mapRef.current = map

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Dibujar marcadores
      const markers = []
      for (const p of points) {
        const color = HEALTH_HEX[p.health] || HEALTH_HEX.green
        const icon = Lf.divIcon({
          className: '',
          html: `<div style="
            width:10px;height:10px;border-radius:50%;
            background:${color};border:2px solid #fff;
            box-shadow:0 1px 3px rgba(0,0,0,0.35);
          "></div>`,
          iconSize:   [10, 10],
          iconAnchor: [5, 5],
        })
        const marker = Lf.marker([p.lat, p.lng], { icon })
        marker.bindPopup(`<b>${p.name}</b>`)
        marker.addTo(map)
        markers.push(marker)
      }

      // Ajustar vista a los puntos si hay varios
      if (points.length > 1) {
        const bounds = Lf.latLngBounds(points.map(p => [p.lat, p.lng]))
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 })
      }

      setTimeout(() => map.invalidateSize(), 120)

      return () => markers.forEach(m => m.remove())
    }).catch(err => console.error('[GeoHeatmap] Leaflet error:', err))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [points])

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', borderRadius: 'var(--r-md)', overflow: 'hidden' }}
    />
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export default function GeoHeatmap({ onOpenMap }) {
  const { points, loading } = useProspectGeo()

  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 6', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad geográfica</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
            {loading
              ? 'Cargando…'
              : `${points.length} prospecto${points.length !== 1 ? 's' : ''} con ubicación registrada`}
          </div>
        </div>
        <button
          onClick={onOpenMap}
          style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Abrir mapa →
        </button>
      </div>

      {/* Map area */}
      <div style={{ height: 200, borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
            Cargando…
          </div>
        ) : points.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--fg-tertiary)' }}>
            <Icon name="map-pin" size={28} color="var(--fg-tertiary)" />
            <div style={{ fontSize: 13 }}>Sin ubicaciones registradas</div>
            <div style={{ fontSize: 11 }}>Agrega lat/lng a los prospectos para ver el mapa.</div>
          </div>
        ) : (
          <MiniMap points={points} />
        )}
      </div>

      {/* Leyenda */}
      {!loading && points.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { color: HEALTH_HEX.green, label: 'Al día' },
            { color: HEALTH_HEX.amber, label: 'En riesgo' },
            { color: HEALTH_HEX.red,   label: 'Urgente' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
