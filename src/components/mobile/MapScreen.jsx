import React, { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE_BY_ID } from '../../constants/stages'
import Icon from '../shared/Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const STAGE_PRIORITY = { cierre: 5, negociacion: 4, cotizacion: 3, presentacion: 2, prospeccion: 1 }
const DEFAULT_CENTER = [20.5888, -100.3895]

// ─── MapView ──────────────────────────────────────────────────────────────────

function MapView({ prospects, routeProspects }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const LfRef        = useRef(null)
  const layersRef    = useRef([])   // all added layers (markers + polyline)
  const [mapReady,   setMapReady]   = useState(false)

  // Init Leaflet once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    import('leaflet').then(L => {
      const Lf = L.default || L
      LfRef.current = Lf

      const map = Lf.map(containerRef.current, {
        center: DEFAULT_CENTER, zoom: 12,
        zoomControl: true, attributionControl: true,
      })
      mapRef.current = map

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Re-measure after layout settles (fixes blank map in scroll containers)
      setTimeout(() => map.invalidateSize(), 150)
      setTimeout(() => map.invalidateSize(), 500)

      setMapReady(true)
    }).catch(err => console.error('Leaflet:', err))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Redraw pins whenever data or map readiness changes
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    const Lf  = LfRef.current

    // Remove all previous layers
    layersRef.current.forEach(l => l.remove())
    layersRef.current = []

    if (!prospects.length) return

    // Route polyline
    if (routeProspects?.length > 1) {
      const line = Lf.polyline(
        routeProspects.map(p => [p.lat, p.lng]),
        { color: '#185FA5', weight: 2.5, opacity: 0.65, dashArray: '6 4' }
      ).addTo(map)
      layersRef.current.push(line)
    }

    // Prospect pins
    prospects.forEach(pin => {
      const s = STAGE_BY_ID[pin.stage_id] ?? STAGE_BY_ID['prospeccion']
      const icon = Lf.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;background:${s.color};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -32],
      })
      const marker = Lf.marker([pin.lat, pin.lng], { icon }).addTo(map)
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:4px">${pin.name}</div>
          <div style="font-size:11px;color:#666;margin-bottom:6px">${pin.address || ''}</div>
          <span style="font-size:11px;font-weight:500;color:${s.color};background:${s.color}22;padding:2px 8px;border-radius:99px">${s.label}</span>
        </div>
      `, { maxWidth: 220 })
      layersRef.current.push(marker)
    })

    // Route order numbers on top
    routeProspects?.forEach((pin, order) => {
      const cm = Lf.circleMarker([pin.lat, pin.lng], {
        radius: 7, fillColor: '#fff', color: '#185FA5', weight: 2, fillOpacity: 1,
      }).addTo(map)
        .bindTooltip(`${order + 1}`, { permanent: true, direction: 'center', className: 'leaflet-order-tooltip' })
      layersRef.current.push(cm)
    })

    // Fit all pins in view
    const bounds = Lf.latLngBounds(prospects.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })

  }, [mapReady, prospects, routeProspects])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRoute() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--bg-secondary)' }} />
          <div style={{ width: 48, height: 18, borderRadius: 10, background: 'var(--bg-secondary)' }} />
        </div>
      ))}
    </div>
  )
}

// ─── MapScreen (main export) ──────────────────────────────────────────────────

export default function MapScreen() {
  const { user } = useAuth()
  const [prospects, setProspects] = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('prospects')
      .select('id, name, stage_id, address, lat, lng, value')
      .eq('owner_id', user.id)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
    setProspects(data ?? [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Realtime — redraw when any prospect changes for this user
  useEffect(() => {
    const ch = supabase
      .channel(`map-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'prospects',
        filter: `owner_id=eq.${user.id}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user.id, load])

  // Route: most-advanced stage first, up to 8 stops
  const routeProspects = [...prospects]
    .sort((a, b) => (STAGE_PRIORITY[b.stage_id] ?? 0) - (STAGE_PRIORITY[a.stage_id] ?? 0))
    .slice(0, 8)

  const mapsUrl = routeProspects.length
    ? `https://www.google.com/maps/dir/${routeProspects.map(p => `${p.lat},${p.lng}`).join('/')}`
    : null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 92 }}>

      {/* Header */}
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)' }}>Mapa de prospectos</div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
          {loading
            ? 'Cargando…'
            : prospects.length === 0
              ? 'Sin prospectos con ubicación aún'
              : `${prospects.length} prospecto${prospects.length !== 1 ? 's' : ''} con ubicación · OpenStreetMap`
          }
        </div>
      </div>

      {/* Map */}
      <div style={{ margin: '0 16px', height: 400, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '0.5px solid var(--border)', position: 'relative', zIndex: 0 }}>
        <MapView prospects={prospects} routeProspects={routeProspects} />
        {prospects.length === 0 && !loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(var(--bg-rgb, 255,255,255), 0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, backdropFilter: 'blur(2px)', zIndex: 10,
          }}>
            <Icon name="map-off" size={36} color="var(--fg-tertiary)" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-secondary)' }}>Sin ubicaciones registradas</div>
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>Agrega la dirección al crear un prospecto para verlo aquí</div>
            </div>
          </div>
        )}
      </div>

      {/* Route card */}
      <div style={{ margin: '12px 16px 0', padding: '12px 14px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Ruta sugerida</div>
            <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>
              {loading ? '…' : `${routeProspects.length} parada${routeProspects.length !== 1 ? 's' : ''} · por prioridad de etapa`}
            </div>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
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
          )}
        </div>

        {loading ? (
          <SkeletonRoute />
        ) : routeProspects.length === 0 ? (
          <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
            Agrega prospectos con dirección para ver la ruta
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {routeProspects.map((pin, order) => {
              const s = STAGE_BY_ID[pin.stage_id] ?? STAGE_BY_ID['prospeccion']
              return (
                <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                  }}>{order + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pin.name}
                    </div>
                    {pin.address && (
                      <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pin.address}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: s.color, background: s.color + '18', padding: '2px 6px', borderRadius: 99, flexShrink: 0 }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
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

      {/* Note */}
      <div style={{ margin: '10px 16px 0', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="map-2" size={15} color="var(--fg-tertiary)" />
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.5 }}>
          Mapa gratuito con <strong>OpenStreetMap</strong> + Leaflet. La dirección se geocodifica automáticamente al crear un prospecto.
        </div>
      </div>
    </div>
  )
}
