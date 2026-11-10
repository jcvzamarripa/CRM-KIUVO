import React, { useState, useEffect, useRef, useCallback } from 'react'
import { STAGE_BY_ID } from '../../constants/stages'
import Icon from '../shared/Icon'
import { Card, Pill, Empty, Bone } from '../ui'
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
        { color: '#0E0E0E', weight: 3, opacity: 0.7, dashArray: '6 6' }
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
      const popup = document.createElement('div')
      popup.style.cssText = 'font-family:Inter,sans-serif;min-width:170px'
      const pName = document.createElement('div')
      pName.textContent = pin.name
      pName.style.cssText = 'font-size:15px;font-weight:600;color:#0E0E0E;margin-bottom:4px'
      const pAddr = document.createElement('div')
      pAddr.textContent = pin.address || ''
      pAddr.style.cssText = 'font-size:13px;color:#4A4A47;margin-bottom:8px'
      const pStage = document.createElement('span')
      pStage.textContent = s.label
      pStage.style.cssText = `font-size:12px;font-weight:600;color:#0E0E0E;background:${s.color}33;padding:4px 10px;border-radius:99px`
      popup.append(pName, pAddr, pStage)
      marker.bindPopup(popup, { maxWidth: 240 })
      layersRef.current.push(marker)
    })

    // Route order numbers on top
    routeProspects?.forEach((pin, order) => {
      const cm = Lf.circleMarker([pin.lat, pin.lng], {
        radius: 9, fillColor: '#D9F25A', color: '#0E0E0E', weight: 2, fillOpacity: 1,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 0' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bone w={32} h={32} r="50%" style={{ flexShrink: 0 }} />
          <Bone h={16} style={{ flex: 1 }} />
          <Bone w={72} h={24} r={99} />
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
    if (!supabase) return
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
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 170 }}>

      {/* Header */}
      <div className="k-screenhead" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <div className="k-screenhead__title">Mapa de prospectos</div>
        <div style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>
          {loading
            ? 'Cargando…'
            : prospects.length === 0
              ? 'Sin prospectos con ubicación aún'
              : `${prospects.length} prospecto${prospects.length !== 1 ? 's' : ''} con ubicación`
          }
        </div>
      </div>

      {/* Map */}
      <div style={{ margin: '0 14px', height: 400, borderRadius: 'var(--r-xl)', overflow: 'hidden', position: 'relative', zIndex: 0, background: 'var(--surface)' }}>
        <MapView prospects={prospects} routeProspects={routeProspects} />
        {prospects.length === 0 && !loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty icon="map-2">
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Sin ubicaciones registradas</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Agrega la dirección al crear un prospecto para verlo aquí</div>
            </Empty>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ margin: '12px 14px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['prospeccion','presentacion','cotizacion','negociacion','cierre'].map(id => {
          const s = STAGE_BY_ID[id]
          return (
            <Pill key={id} style={{ background: 'var(--surface)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              {s.label}
            </Pill>
          )
        })}
      </div>

      {/* Route card */}
      <Card style={{ margin: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="k-h2">Ruta sugerida</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
              {loading ? '…' : `${routeProspects.length} parada${routeProspects.length !== 1 ? 's' : ''} · por prioridad de etapa`}
            </div>
          </div>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="k-btn k-btn--primary" style={{ flexShrink: 0 }}>
              <Icon name="navigation" size={18} />
              Abrir en Maps
            </a>
          )}
        </div>

        {loading ? (
          <SkeletonRoute />
        ) : routeProspects.length === 0 ? (
          <div style={{ padding: '12px 0', fontSize: 15, color: 'var(--fg-secondary)' }}>
            Agrega prospectos con dirección para ver la ruta
          </div>
        ) : (
          <div>
            {routeProspects.map((pin, order) => {
              const s = STAGE_BY_ID[pin.stage_id] ?? STAGE_BY_ID['prospeccion']
              return (
                <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '8px 0', borderTop: order ? '1px solid var(--border)' : 'none' }}>
                  <div className="k-display" style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--primary-bg)', color: 'var(--primary-fg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700,
                  }}>{order + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pin.name}
                    </div>
                    {pin.address && (
                      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pin.address}
                      </div>
                    )}
                  </div>
                  <Pill style={{ flexShrink: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    {s.label}
                  </Pill>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Note */}
      <div style={{ margin: '12px 18px 0', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--fg-tertiary)', lineHeight: 1.5 }}>
        <Icon name="info-circle" size={16} style={{ marginTop: 2 }} />
        <div>La ubicación se toma de la dirección del prospecto o de su primer check-in con GPS.</div>
      </div>
    </div>
  )
}
