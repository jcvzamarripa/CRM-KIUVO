import React, { useState, useRef, useEffect, useMemo } from 'react'
import Icon from '../shared/Icon'
import { Card, Pill, Button, Avatar, Empty, Bone, SearchInput, Segmented } from '../ui'
import { useTerritory } from '../../hooks/useTerritory'
import { useSellers } from '../../hooks/useSellers'

// ─── Constantes ───────────────────────────────────────────────────────────────
// La meta es de 30 a 40 contactos diarios por vendedor; 35 es el centro.
const CONTACTOS_DIA = 35
const SIN_ASIGNAR   = '#9A9890'   // gris para lo que nadie trae

// El DENUE no trae horarios, así que el turno se deduce del giro y el
// vendedor lo corrige en campo.
const TURNOS = {
  manana: { label: 'Mañana', tone: 'warning', color: '#EF9F27' },
  tarde:  { label: 'Tarde',  tone: 'sky',     color: '#378ADD' },
  noche:  { label: 'Noche',  tone: 'lilac',   color: '#9B59B6' },
}

const num = n => Number(n || 0).toLocaleString('es-MX')

const LAYOUT_CSS = `
  .tv-toolbar { padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; flex-shrink: 0; }
  .tv-body { flex: 1; display: flex; gap: 16px; padding: 0 20px 20px; min-height: 0; overflow: hidden; }
  .tv-map { flex: 1 1 auto; position: relative; min-width: 320px; border-radius: var(--r-lg); overflow: hidden; background: var(--surface); }
  /* flex-basis fijo + min-width:0 para que las etiquetas largas no inflen
     la columna y le roben el ancho al mapa */
  .tv-side { flex: 0 0 340px; min-width: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); border-radius: var(--r-lg); }
  .tv-side__head { padding: 14px 16px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .tv-side__list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .tv-row {
    width: 100%; text-align: left; padding: 11px 12px; border-radius: var(--r-md);
    border: 1px solid var(--border); background: var(--bg); cursor: pointer;
    display: flex; align-items: center; gap: 11px; transition: border-color .12s, background .12s;
  }
  .tv-row:hover { border-color: var(--fg-tertiary); }
  .tv-row[aria-selected="true"] { border-color: var(--primary-bg); background: var(--bg-tertiary); }
  .tv-swatch { width: 11px; height: 32px; border-radius: 3px; flex-shrink: 0; }
  .tv-legend {
    position: absolute; bottom: 14px; left: 14px; z-index: 1000; max-width: calc(100% - 28px);
    display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center;
    padding: 8px 14px; border-radius: var(--r-md);
    background: var(--surface); color: var(--fg-secondary); font-size: 12px;
    box-shadow: var(--shadow-float);
  }
  .tv-back {
    position: absolute; top: 14px; left: 14px; z-index: 1000;
    box-shadow: var(--shadow-float);
  }
  .tv-stats { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--fg-secondary); }
  .tv-assign { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px 12px; }
  @media (max-width: 1000px) {
    .tv-toolbar { padding: 12px; }
    .tv-body { flex-direction: column; padding: 0 12px 12px; overflow-y: auto; }
    .tv-map { flex: none; height: 54vh; min-height: 300px; }
    .tv-side { width: 100%; flex: none; max-height: none; overflow: visible; }
    .tv-side__list { overflow: visible !important; }
  }
`

// ─── El mapa (Leaflet a mano, compatible con React 18) ────────────────────────
function MapCanvas({ formas, puntos = [], ruta = [], selectedId, onPick, onPunto }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const LfRef        = useRef(null)
  const capasRef     = useRef([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(mod => {
      const Lf = mod.default || mod
      LfRef.current = Lf

      const map = Lf.map(containerRef.current, {
        center: [21.88, -102.29],     // Aguascalientes
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      setTimeout(() => map.invalidateSize(), 100)
      setListo(true)
    }).catch(err => console.error('No cargó Leaflet:', err))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Leaflet se queda con la medida que tenía al nacer. Si el panel cambia
  // de ancho (abrir el menú lateral, girar la tablet), hay que avisarle o
  // el mapa dibuja los mosaicos del tamaño viejo.
  useEffect(() => {
    if (!listo || !containerRef.current) return
    const obs = new ResizeObserver(() => mapRef.current?.invalidateSize())
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [listo])

  // Redibuja los polígonos cuando cambian las formas o la selección
  useEffect(() => {
    const Lf = LfRef.current, map = mapRef.current
    if (!listo || !Lf || !map) return

    capasRef.current.forEach(c => map.removeLayer(c))
    capasRef.current = []

    const bounds = Lf.latLngBounds([])
    // Con una ruta abierta el encuadre va sobre la ruta, no sobre el
    // sector: el rectángulo del sector es mucho más grande y dejaba los
    // 35 números amontonados en un punto.
    const bRuta = Lf.latLngBounds([])

    formas.forEach(f => {
      if (!f.geojson) return
      const activo = f.id === selectedId

      const capa = Lf.geoJSON(f.geojson, {
        style: {
          color:       activo ? '#16212A' : f.color,
          weight:      activo ? 3 : 1.5,
          opacity:     0.95,
          fillColor:   f.color,
          fillOpacity: activo ? 0.42 : 0.22,
        },
      })

      capa.on('click', () => onPick?.(f.id))
      capa.on('mouseover', () => capa.setStyle({ fillOpacity: 0.5 }))
      capa.on('mouseout',  () => capa.setStyle({ fillOpacity: activo ? 0.42 : 0.22 }))
      capa.bindTooltip(f.tooltip, { sticky: true })

      capa.addTo(map)
      capasRef.current.push(capa)
      bounds.extend(capa.getBounds())
    })

    // ── Los negocios ──────────────────────────────────────────────────
    // Puntos chicos: con 213 en pantalla, un alfiler normal tapa la calle
    // y ya no se ve por dónde caminar.
    puntos.forEach(n => {
      if (n.lat == null || n.lng == null) return
      const visitado = !!n.last_visit_at
      const m = Lf.circleMarker([n.lat, n.lng], {
        radius: 5,
        color: visitado ? '#1D9E75' : '#16212A',
        weight: 1.5,
        fillColor: visitado ? '#1D9E75' : '#D9F25A',
        fillOpacity: 0.95,
      })
      m.bindPopup(
        `<b>${n.nombre || 'Sin nombre'}</b><br>` +
        `${n.direccion || 'Sin dirección'}<br>` +
        `${n.colonia || ''}` +
        (n.telefono ? `<br><a href="tel:${n.telefono}">${n.telefono}</a>` : '') +
        (n.giro ? `<br><i>${n.giro}</i>` : '')
      )
      if (onPunto) m.on('click', () => onPunto(n.id))
      m.addTo(map)
      capasRef.current.push(m)
      bounds.extend(m.getLatLng())
    })

    // ── La ruta del día, en orden ─────────────────────────────────────
    if (ruta.length > 1) {
      const linea = Lf.polyline(
        ruta.filter(p => p.lat != null).map(p => [p.lat, p.lng]),
        { color: '#185FA5', weight: 3, opacity: 0.85, dashArray: '6 5' }
      )
      linea.addTo(map)
      capasRef.current.push(linea)
      bRuta.extend(linea.getBounds())
    }
    ruta.forEach(p => {
      if (p.lat == null || p.lng == null) return
      const hecha = p.status === 'hecha'
      const m = Lf.marker([p.lat, p.lng], {
        icon: Lf.divIcon({
          className: '',
          html: `<div style="
            width:22px;height:22px;border-radius:50%;
            background:${hecha ? '#1D9E75' : '#185FA5'};color:#fff;
            font:600 11px/22px system-ui;text-align:center;
            box-shadow:0 1px 4px rgba(0,0,0,.4)">${p.orden}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
      m.bindPopup(
        `<b>${p.orden}. ${p.nombre || 'Sin nombre'}</b><br>` +
        `${[p.calle, p.numero].filter(Boolean).join(' ') || 'Sin dirección'}` +
        (p.telefono ? `<br><a href="tel:${p.telefono}">${p.telefono}</a>` : '')
      )
      m.addTo(map)
      capasRef.current.push(m)
      bRuta.extend(m.getLatLng())
    })

    const encuadre = bRuta.isValid() ? bRuta : bounds
    if (encuadre.isValid()) map.fitBounds(encuadre, { padding: [40, 40], maxZoom: 17 })
  }, [formas, puntos, ruta, selectedId, listo, onPick, onPunto])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {!listo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: 'var(--fg-tertiary)', fontSize: 13,
        }}>Cargando el mapa…</div>
      )}
    </div>
  )
}

// ─── Barra de avance de un renglón ────────────────────────────────────────────
function Avance({ visitados, objetivo }) {
  const pct = objetivo > 0 ? Math.min(100, (visitados / objetivo) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary-bg)' }} />
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--fg-tertiary)', flexShrink: 0 }}>
        {num(visitados)} / {num(objetivo)}
      </span>
    </div>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function TerritoryView() {
  const {
    zonas, sectores, loading, error, reload, asignarSector,
    cargarNegocios, cargarRutas, cargarParadas, generarRutas, asignarRuta,
  } = useTerritory()
  const { sellers } = useSellers()

  const [zonaAbierta,   setZonaAbierta]   = useState(null)  // null = todas las zonas
  const [sectorAbierto, setSectorAbierto] = useState(null)  // null = lista de sectores
  const [seleccion,     setSeleccion]     = useState(null)
  const [busqueda,      setBusqueda]      = useState('')
  const [filtro,        setFiltro]        = useState('todos')
  const [guardando,     setGuardando]     = useState(null)
  const [aviso,         setAviso]         = useState(null)

  // Detalle del sector abierto
  const [negocios,   setNegocios]   = useState([])
  const [rutas,      setRutas]      = useState([])
  const [rutaAbierta, setRutaAbierta] = useState(null)
  const [paradas,    setParadas]    = useState([])
  const [pestana,    setPestana]    = useState('rutas')
  const [generando,  setGenerando]  = useState(false)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Al abrir un sector se traen sus negocios y sus rutas
  useEffect(() => {
    if (!sectorAbierto) { setNegocios([]); setRutas([]); setRutaAbierta(null); setParadas([]); return }
    let vigente = true
    setCargandoDetalle(true)
    Promise.all([cargarNegocios(sectorAbierto), cargarRutas(sectorAbierto)])
      .then(([ns, rs]) => {
        if (!vigente) return
        setNegocios(ns)
        setRutas(rs)
        setCargandoDetalle(false)
      })
    return () => { vigente = false }
  }, [sectorAbierto, cargarNegocios, cargarRutas])

  // Al abrir una ruta se traen sus paradas en orden
  useEffect(() => {
    if (!rutaAbierta) { setParadas([]); return }
    let vigente = true
    cargarParadas(rutaAbierta).then(ps => { if (vigente) setParadas(ps) })
    return () => { vigente = false }
  }, [rutaAbierta, cargarParadas])

  const porId = useMemo(
    () => Object.fromEntries(sellers.map(s => [s.id, s])),
    [sellers]
  )

  const zona = zonaAbierta ? zonas.find(z => z.id === zonaAbierta) : null

  // Los sectores de la zona abierta, ya filtrados
  const sectoresVisibles = useMemo(() => {
    if (!zonaAbierta) return []
    const q = busqueda.trim().toLowerCase()
    return sectores
      .filter(s => s.zone_id === zonaAbierta)
      .filter(s => filtro === 'todos'
                || (filtro === 'libres'    && !s.seller_id)
                || (filtro === 'asignados' && s.seller_id))
      .filter(s => !q
                || s.code.toLowerCase().includes(q)
                || (porId[s.seller_id]?.name || '').toLowerCase().includes(q))
  }, [sectores, zonaAbierta, busqueda, filtro, porId])

  // Lo que el mapa dibuja: las 8 zonas, los 22 sectores de una zona, o el
  // contorno del sector abierto (sus negocios van como puntos aparte)
  const formas = useMemo(() => {
    if (sectorAbierto) {
      const s = sectores.find(x => x.id === sectorAbierto)
      return s ? [{
        id: s.id, geojson: s.geojson, color: s.zona_color,
        tooltip: `<b>${s.code}</b> · ${num(s.objetivo)} negocios`,
      }] : []
    }
    if (!zonaAbierta) {
      return zonas.map(z => ({
        id: z.id, geojson: z.geojson, color: z.color,
        tooltip: `<b>${z.code}</b> · ${num(z.objetivo)} negocios · ${z.sectores} sectores`,
      }))
    }
    return sectoresVisibles.map(s => {
      const v = porId[s.seller_id]
      return {
        id: s.id, geojson: s.geojson,
        color: v?.color || (s.seller_id ? s.zona_color : SIN_ASIGNAR),
        tooltip: `<b>${s.code}</b> · ${num(s.objetivo)} negocios · `
               + `${s.dias_de_trabajo} ${s.dias_de_trabajo === 1 ? 'día' : 'días'}`
               + (v ? ` · ${v.name}` : ' · sin asignar'),
      }
    })
  }, [zonaAbierta, sectorAbierto, sectores, zonas, sectoresVisibles, porId])

  // Con una ruta abierta solo se pintan sus paradas numeradas; si no, todos
  // los negocios del sector. Ver las dos capas encima es ilegible.
  const puntosDelMapa = useMemo(
    () => (sectorAbierto && !rutaAbierta ? negocios : []),
    [sectorAbierto, rutaAbierta, negocios]
  )

  // Totales de la ciudad
  const total = useMemo(() => zonas.reduce((a, z) => ({
    objetivo:  a.objetivo  + Number(z.objetivo || 0),
    visitados: a.visitados + Number(z.visitados || 0),
    libres:    a.libres    + Number(z.sectores_libres || 0),
    sectores:  a.sectores  + Number(z.sectores || 0),
  }), { objetivo: 0, visitados: 0, libres: 0, sectores: 0 }), [zonas])

  const sectorSel = zonaAbierta ? sectores.find(s => s.id === seleccion) : null
  const sector    = sectorAbierto ? sectores.find(s => s.id === sectorAbierto) : null
  const ruta      = rutaAbierta ? rutas.find(r => r.id === rutaAbierta) : null

  async function handleAsignar(sectorId, sellerId) {
    setGuardando(sectorId)
    const { error: err } = await asignarSector(sectorId, sellerId)
    setGuardando(null)
    setAviso(err ? { tipo: 'error', texto: err } : null)
  }

  async function handleAsignarRuta(r, sellerId) {
    setGuardando(r.id)
    const { error: err } = await asignarRuta(r.id, sellerId)
    setGuardando(null)
    if (err) { setAviso({ texto: err }); return }
    setAviso(null)
    // Refleja el cambio sin recargar toda la lista
    setRutas(prev => prev.map(x => x.id === r.id ? { ...x, seller_id: sellerId } : x))
  }

  async function handleGenerarRutas() {
    if (!sector) return
    setGenerando(true)
    setAviso(null)
    const { error: err } = await generarRutas(sector.code, CONTACTOS_DIA)
    if (err) {
      setAviso({ texto: err })
    } else {
      setRutas(await cargarRutas(sector.id))
      setRutaAbierta(null)
      setPestana('rutas')
    }
    setGenerando(false)
  }

  function volver() {
    if (rutaAbierta)        { setRutaAbierta(null); return }
    if (sectorAbierto)      { setSectorAbierto(null); setSeleccion(null); return }
    setZonaAbierta(null); setSeleccion(null); setBusqueda('')
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <Card style={{ padding: 20 }}>
          <div className="k-h3" style={{ marginBottom: 6 }}>No se pudo cargar el territorio</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 14 }}>{error}</div>
          <Button onClick={reload}>Intentar de nuevo</Button>
        </Card>
      </div>
    )
  }

  return (
    // flex:1 y minWidth:0 son obligatorios: el contenedor del admin es una
    // fila flexible, así que sin esto la vista se encoge al ancho de su
    // contenido y el mapa queda en una tira inservible.
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--bg)', minWidth: 0,
    }}>
      <style>{LAYOUT_CSS}</style>

      {/* Barra de arriba */}
      <div className="tv-toolbar">
        {sector ? (
          <>
            <Button variant="outline" size="sm" onClick={volver}>
              <Icon name="arrow-left" size={16} />
              {rutaAbierta ? 'Rutas del sector' : 'Sectores de la zona'}
            </Button>
            <span className="k-h3" style={{ minWidth: 0 }}>
              {ruta ? ruta.titulo : sector.code}
            </span>
            <Pill>{num(ruta ? ruta.paradas : sector.objetivo)} negocios</Pill>
            {ruta ? (
              <>
                {TURNOS[ruta.turno] && (
                  <Pill tone={TURNOS[ruta.turno].tone}>{TURNOS[ruta.turno].label}</Pill>
                )}
                <Pill tone="sky">{(ruta.metros / 1000).toFixed(1)} km a pie · {ruta.calles} calles</Pill>
              </>
            ) : (
              <Pill tone={sector.dias_de_trabajo > 7 ? 'coral' : undefined}>
                {sector.dias_de_trabajo} días a {CONTACTOS_DIA} contactos
              </Pill>
            )}
            <div style={{ flex: 1 }} />
            {!ruta && (
              <Button variant="primary" size="sm" loading={generando}
                      onClick={handleGenerarRutas}>
                <Icon name="navigation" size={16} />
                {rutas.length ? 'Rehacer rutas' : 'Generar rutas por turno'}
              </Button>
            )}
          </>
        ) : zona ? (
          <>
            <Button variant="outline" size="sm" onClick={volver}>
              <Icon name="arrow-left" size={16} /> Todas las zonas
            </Button>
            <span className="k-h3" style={{ minWidth: 0 }}>{zona.name}</span>
            <Segmented
              surface
              options={[
                { id: 'todos',     label: `Todos (${zona.sectores})` },
                { id: 'libres',    label: `Sin asignar (${zona.sectores_libres})` },
                { id: 'asignados', label: 'Asignados' },
              ]}
              value={filtro}
              onChange={setFiltro}
            />
            <div style={{ flex: 1 }} />
            <SearchInput small value={busqueda} onChange={setBusqueda}
                         placeholder="Sector o vendedor…" style={{ width: 220 }} />
          </>
        ) : (
          <>
            <div className="tv-stats">
              <span><b className="k-num">{num(total.objetivo)}</b> negocios objetivo</span>
              <span><b className="k-num">{total.sectores}</b> sectores</span>
              <span><b className="k-num">{total.libres}</b> sin asignar</span>
              <span><b className="k-num">{num(total.visitados)}</b> visitados</span>
            </div>
            <div style={{ flex: 1 }} />
            <Button variant="outline" size="sm" onClick={reload}>
              <Icon name="refresh" size={16} /> Actualizar
            </Button>
          </>
        )}
      </div>

      {aviso && (
        <div style={{ padding: '0 20px 10px' }}>
          <Pill tone="coral">{aviso.texto}</Pill>
        </div>
      )}

      <div className="tv-body">
        {/* Mapa */}
        <div className="tv-map">
          {loading
            ? <div style={{ position: 'absolute', inset: 0, padding: 16 }}><Bone h="100%" r="var(--r-lg)" /></div>
            : <MapCanvas
                formas={formas}
                puntos={puntosDelMapa}
                ruta={paradas}
                selectedId={seleccion}
                onPick={id => {
                  if (sectorAbierto) return
                  if (zonaAbierta) { setSectorAbierto(id); setSeleccion(id) }
                  else setZonaAbierta(id)
                }} />}

          {!loading && (
            <div className="tv-legend">
              {sector ? (
                ruta ? (
                  <span>Los números son el orden en que se camina · la línea punteada es el recorrido</span>
                ) : (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#D9F25A', border: '1.5px solid #16212A', display: 'inline-block' }} />
                      por visitar
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
                      ya visitado
                    </span>
                    <span>Clic en un negocio para ver su nombre, dirección y teléfono</span>
                  </>
                )
              ) : zona ? (
                <>
                  <span>Clic en un sector para abrirlo</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i style={{ width: 11, height: 11, borderRadius: 3, background: SIN_ASIGNAR, display: 'inline-block' }} />
                    sin asignar
                  </span>
                  <span>El color es el del vendedor que lo trae</span>
                </>
              ) : (
                <span>Clic en una zona para ver sus 22 sectores · el orden Z1 a Z8 va de más a menos negocios por km²</span>
              )}
            </div>
          )}
        </div>

        {/* Panel de la derecha */}
        <div className="tv-side">
          <div className="tv-side__head">
            <div className="k-h3">
              {sector ? (ruta ? 'Paradas en orden' : sector.code) : zona ? 'Sectores' : 'Zonas'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-secondary)', marginTop: 3 }}>
              {sector
                ? (ruta
                    ? `${ruta.paradas} puertas · ${(ruta.metros / 1000).toFixed(1)} km a pie`
                    : `${num(sector.objetivo)} negocios · ${num(sector.con_tel)} con teléfono`)
                : zona
                  ? `${sectoresVisibles.length} de ${zona.sectores} · una semana de trabajo cada uno`
                  : '8 zonas parejas · un mes de una célula de 5 vendedores'}
            </div>
            {sector && !ruta && (
              <div style={{ marginTop: 10 }}>
                <Segmented
                  surface
                  options={[
                    { id: 'rutas',    label: `Rutas (${rutas.length})` },
                    { id: 'negocios', label: `Negocios (${negocios.length})` },
                  ]}
                  value={pestana}
                  onChange={setPestana}
                  style={{ display: 'flex' }}
                />
              </div>
            )}
          </div>

          <div className="tv-side__list">
            {loading || (sector && cargandoDetalle) ? (
              [0, 1, 2, 3, 4].map(i => <Bone key={i} h={62} r="var(--r-md)" />)
            ) : ruta ? (
              // ── Las paradas de la ruta, en orden de caminata ──────────
              paradas.map(p => (
                <div key={p.id} className="tv-row" style={{ cursor: 'default' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: p.status === 'hecha' ? 'var(--success-bg, #1D9E75)' : '#185FA5',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    display: 'grid', placeItems: 'center',
                  }}>{p.orden}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{p.nombre}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--fg-secondary)', marginTop: 2 }}>
                      {[p.calle, p.numero].filter(Boolean).join(' ') || 'Sin dirección'}
                    </span>
                    {p.giro && (
                      <span style={{
                        display: 'block', fontSize: 11.5, color: 'var(--fg-tertiary)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.giro}</span>
                    )}
                  </span>
                  {p.telefono && (
                    <a href={`tel:${p.telefono}`} className="k-iconbtn k-iconbtn--soft"
                       title={p.telefono} aria-label={`Llamar a ${p.nombre}`}>
                      <Icon name="phone" size={17} />
                    </a>
                  )}
                </div>
              ))
            ) : sector ? (
              pestana === 'rutas' ? (
                rutas.length === 0 ? (
                  <Empty icon="navigation">
                    Este sector no tiene rutas todavía. Dale a "Generar rutas"
                    y se parte en días de {CONTACTOS_DIA} contactos.
                  </Empty>
                ) : rutas.map(r => {
                  const t = TURNOS[r.turno]
                  const v = porId[r.seller_id]
                  return (
                    <div key={r.id}>
                      <button className="tv-row" onClick={() => setRutaAbierta(r.id)}>
                        <span className="tv-swatch"
                              style={{ background: v?.color || t?.color || SIN_ASIGNAR }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 14 }}>{r.titulo}</b>
                            {t && <Pill tone={t.tone}>{t.label}</Pill>}
                            <Pill>{r.paradas} puertas</Pill>
                          </span>
                          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--fg-secondary)', marginTop: 4 }}>
                            {v ? v.name : 'Sin vendedor'}
                            {' · '}{(r.metros / 1000).toFixed(1)} km · {r.calles} calles
                          </span>
                          <Avance visitados={r.hechas} objetivo={r.paradas} />
                        </span>
                        {v && <Avatar name={v.name} initials={v.init} color={v.color} size="sm" />}
                        <Icon name="chevron-right" size={18} />
                      </button>

                      {/* El vendedor se asigna a la RUTA, no al sector: así
                          caben dos personas en el mismo sector el mismo día */}
                      <div className="tv-assign">
                        {sellers.map(sv => (
                          <Button
                            key={sv.id}
                            size="sm"
                            variant={sv.id === r.seller_id ? 'primary' : 'soft'}
                            disabled={guardando === r.id}
                            onClick={() => handleAsignarRuta(r, sv.id === r.seller_id ? null : sv.id)}
                          >
                            <Avatar name={sv.name} initials={sv.init} color={sv.color} size="sm" />
                            {sv.name?.split(' ')[0] || 'Vendedor'}
                            {sv.id === r.seller_id && <Icon name="check" size={14} />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                negocios.map(n => (
                  <div key={n.id} className="tv-row" style={{ cursor: 'default' }}>
                    <span className="tv-swatch"
                          style={{ background: n.last_visit_at ? '#1D9E75' : '#D9F25A' }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{n.nombre}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--fg-secondary)', marginTop: 2 }}>
                        {n.direccion || 'Sin dirección'}{n.colonia ? ` · ${n.colonia}` : ''}
                      </span>
                      {n.giro && (
                        <span style={{
                          display: 'block', fontSize: 11.5, color: 'var(--fg-tertiary)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{n.giro}</span>
                      )}
                    </span>
                    {n.telefono && (
                      <a href={`tel:${n.telefono}`} className="k-iconbtn k-iconbtn--soft"
                         title={n.telefono} aria-label={`Llamar a ${n.nombre}`}>
                        <Icon name="phone" size={17} />
                      </a>
                    )}
                  </div>
                ))
              )
            ) : zona ? (
              sectoresVisibles.length === 0 ? (
                <Empty icon="map-2">Ningún sector con ese filtro</Empty>
              ) : sectoresVisibles.map(s => {
                const v = porId[s.seller_id]
                const abierto = s.id === seleccion
                return (
                  <div key={s.id}>
                    <button
                      className="tv-row"
                      aria-selected={abierto}
                      onClick={() => { setSectorAbierto(s.id); setSeleccion(s.id); setPestana('rutas') }}
                    >
                      <span className="tv-swatch"
                            style={{ background: s.zona_color || SIN_ASIGNAR }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <b style={{ fontSize: 14 }}>{s.code}</b>
                          <Pill>{num(s.objetivo)} negocios</Pill>
                          <Pill tone={s.dias_de_trabajo > 7 ? 'coral' : undefined}>
                            {s.dias_de_trabajo} {s.dias_de_trabajo === 1 ? 'día' : 'días'}
                          </Pill>
                        </span>
                        <span style={{
                          display: 'block', fontSize: 12.5, color: 'var(--fg-secondary)', marginTop: 4,
                        }}>
                          {num(s.con_tel)} con teléfono · {num(s.objetivo - s.visitados)} por tocar
                        </span>
                        <Avance visitados={s.visitados} objetivo={s.objetivo} />
                      </span>
                      {v && <Avatar name={v.name} initials={v.init}
                                    color={v.color} size="sm" />}
                      <Icon name="chevron-right" size={18} />
                    </button>

                  </div>
                )
              })
            ) : (
              zonas.map(z => (
                <button
                  key={z.id}
                  className="tv-row"
                  aria-selected={z.id === seleccion}
                  onClick={() => { setZonaAbierta(z.id); setSeleccion(null); setFiltro('todos') }}
                >
                  <span className="tv-swatch" style={{ background: z.color }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>{z.code}</b>
                      <Pill>{num(z.objetivo)} negocios</Pill>
                      {Number(z.sectores_libres) > 0 && (
                        <Pill tone="coral">{z.sectores_libres} sin asignar</Pill>
                      )}
                    </span>
                    <span style={{
                      display: 'block', fontSize: 12.5, color: 'var(--fg-secondary)',
                      marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {z.name.replace(/^Z\d+\s/, '')}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 3 }}>
                      {z.km2} km² · {num(z.por_km2)} por km² · {z.sectores} sectores
                    </span>
                    <Avance visitados={z.visitados} objetivo={z.objetivo} />
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
              ))
            )}
          </div>

          {/* Pie: lo que significa el sector seleccionado en días de calle */}
          {sectorSel && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--border)',
              fontSize: 12.5, color: 'var(--fg-secondary)', flexShrink: 0,
            }}>
              <b>{sectorSel.code}</b> son {num(sectorSel.objetivo)} negocios.
              A {CONTACTOS_DIA} contactos diarios es {sectorSel.dias_de_trabajo}
              {sectorSel.dias_de_trabajo === 1 ? ' día' : ' días'} de calle.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
