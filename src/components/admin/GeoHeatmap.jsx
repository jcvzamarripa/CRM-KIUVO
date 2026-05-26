import { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// ── hook ─────────────────────────────────────────────────────────────────────
function useProspectGeo() {
  const [points,  setPoints]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    async function load() {
      const { data } = await supabase
        .from('prospects')
        .select('lat, lng')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(200)

      setPoints(data || [])
      setLoading(false)
    }

    load()
  }, [])

  return { points, loading }
}

// ── helpers ───────────────────────────────────────────────────────────────────
// Normalize lat/lng values to a 0–100% canvas space.
// Querétaro bounding box ~: lat 20.4–20.7, lng -100.5 – -100.1
function normalizePoints(pts) {
  if (!pts.length) return []
  const lats = pts.map(p => p.lat)
  const lngs = pts.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const latSpan = (maxLat - minLat) || 1
  const lngSpan = (maxLng - minLng) || 1

  return pts.map(p => ({
    top:  `${(1 - (p.lat - minLat) / latSpan) * 80 + 10}%`,
    left: `${((p.lng - minLng) / lngSpan) * 80 + 10}%`,
  }))
}

// ── component ─────────────────────────────────────────────────────────────────
export default function GeoHeatmap() {
  const { points, loading } = useProspectGeo()
  const normalized          = normalizePoints(points)

  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 6', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad geográfica</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
            {loading ? 'Cargando…' : `${points.length} prospecto${points.length !== 1 ? 's' : ''} con ubicación registrada`}
          </div>
        </div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>
          Abrir mapa →
        </button>
      </div>

      <div style={{
        height: 200, borderRadius: 'var(--r-md)', overflow: 'hidden',
        background: 'var(--bg-secondary)', position: 'relative',
        backgroundImage: `linear-gradient(0deg, var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}>
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
          normalized.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: c.top, left: c.left,
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--kiuvo-blue)', opacity: 0.55,
              border: '2px solid #fff',
            }} />
          ))
        )}
      </div>
    </div>
  )
}
