import { useState, useEffect, useRef } from 'react'
import { Card, Button, Empty, Bone } from '../ui'
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
  green: '#0E0E0E',
  amber: '#B4A5F5',
  red:   '#F26B5E',
  black: '#185FA5',
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
            width:12px;height:12px;border-radius:50%;
            background:${color};border:2px solid #fff;
            box-shadow:0 1px 3px rgba(0,0,0,0.35);
          "></div>`,
          iconSize:   [12, 12],
          iconAnchor: [6, 6],
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
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="k-h2">Prospectos en el mapa</div>
          <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {loading
              ? 'Cargando…'
              : `${points.length} prospecto${points.length !== 1 ? 's' : ''} con ubicación registrada`}
          </div>
        </div>
        <Button variant="soft" size="sm" icon="map-2" onClick={onOpenMap}>Abrir mapa</Button>
      </div>

      <div style={{ height: 240, borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)', zIndex: 0 }}>
        {loading ? (
          <Bone h="100%" r={0} />
        ) : points.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}>
            <Empty icon="map-pin">Sin ubicaciones registradas.<br />Se llenan solas con el primer check-in de cada prospecto.</Empty>
          </div>
        ) : (
          <MiniMap points={points} />
        )}
      </div>

      {!loading && points.length > 0 && (
        <div className="k-muted" style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: 13 }}>
          {[
            { color: HEALTH_HEX.green, label: 'Al día' },
            { color: HEALTH_HEX.amber, label: 'En riesgo' },
            { color: HEALTH_HEX.red,   label: 'Urgente' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
