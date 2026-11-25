import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { Card, Pill, Button, Chip, Sheet, Empty, Bone, Segmented, ProgressBar } from '../ui'
import { useMiRuta } from '../../hooks/useMiRuta'

// ─── Constantes ───────────────────────────────────────────────────────────────
const TURNOS = {
  manana: { label: 'Mañana', tone: 'warning' },
  tarde:  { label: 'Tarde',  tone: 'sky' },
  noche:  { label: 'Noche',  tone: 'lilac' },
}

// Los mismos resultados que ya usa la supervisión, para que el reporte
// del día cuadre sin traducir nada.
const RESULTADOS = [
  { id: 'cita',        label: 'Agendó cita',     icon: 'calendar',      tone: 'success' },
  { id: 'cotizacion',  label: 'Pidió cotización', icon: 'file-text',    tone: 'success' },
  { id: 'venta',       label: 'Venta cerrada',   icon: 'circle-check',  tone: 'success' },
  { id: 'volver',      label: 'Que regrese',     icon: 'clock',         tone: 'warning' },
  { id: 'no_estaba',   label: 'No estaba',       icon: 'user-circle',   tone: undefined },
  { id: 'no_interesa', label: 'No le interesa',  icon: 'x',             tone: 'coral' },
]

const CORRECCIONES = [
  { id: 'manana', label: 'Abre en la mañana' },
  { id: 'tarde',  label: 'Abre en la tarde' },
  { id: 'noche',  label: 'Abre en la noche' },
]

const fechaLarga = f => new Date(f + 'T12:00:00')
  .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

// ─── Hoja de resultado de una parada ─────────────────────────────────────────
function HojaParada({ parada, onCerrar, onMarcar, onCorregirTurno }) {
  const [guardando, setGuardando] = useState(null)
  const [turnos,    setTurnos]    = useState([])
  const [aviso,     setAviso]     = useState(null)

  const direccion = [parada.calle, parada.numero].filter(Boolean).join(' ')
  const mapsUrl = parada.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${parada.lat},${parada.lng}`
    : null

  async function marcar(id) {
    setGuardando(id)
    const { error } = await onMarcar(parada.id, parada.outcome === id ? null : id)
    setGuardando(null)
    if (error) { setAviso(error); return }
    onCerrar()
  }

  async function guardarTurno() {
    if (turnos.length === 0) return
    setGuardando('turno')
    const { error } = await onCorregirTurno(parada.business_id, turnos)
    setGuardando(null)
    setAviso(error || 'Horario corregido. Gracias.')
    if (!error) setTurnos([])
  }

  return (
    <Sheet title={`${parada.orden}. ${parada.nombre}`} onClose={onCerrar}>
      <div style={{ padding: '0 2px 10px' }}>
        <div style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>{direccion || 'Sin dirección'}</div>
        {parada.colonia && (
          <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>{parada.colonia}</div>
        )}
        {parada.giro && (
          <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)', marginTop: 6 }}>{parada.giro}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {parada.telefono && (
            <Button variant="soft" size="sm" as="a" onClick={() => { window.location.href = `tel:${parada.telefono}` }}>
              <Icon name="phone" size={16} /> {parada.telefono}
            </Button>
          )}
          {mapsUrl && (
            <Button variant="soft" size="sm"
                    onClick={() => window.open(mapsUrl, '_blank', 'noopener')}>
              <Icon name="navigation" size={16} /> Cómo llegar
            </Button>
          )}
        </div>
      </div>

      <div className="k-h3" style={{ margin: '14px 2px 8px' }}>¿Cómo te fue?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RESULTADOS.map(r => (
          <Button
            key={r.id}
            block
            variant={parada.outcome === r.id ? 'primary' : 'soft'}
            loading={guardando === r.id}
            onClick={() => marcar(r.id)}
            style={{ justifyContent: 'flex-start' }}
          >
            <Icon name={r.icon} size={18} /> {r.label}
            {parada.outcome === r.id && <Icon name="check" size={16} />}
          </Button>
        ))}
      </div>

      {/* Lo que ninguna base de datos sabe: a qué hora abre de verdad */}
      <div className="k-h3" style={{ margin: '20px 2px 6px' }}>¿Está cerrado a esta hora?</div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-secondary)', margin: '0 2px 10px' }}>
        Dinos cuándo abre y dejamos de mandarte a la hora equivocada.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CORRECCIONES.map(c => (
          <Chip
            key={c.id}
            selected={turnos.includes(c.id)}
            onClick={() => setTurnos(t =>
              t.includes(c.id) ? t.filter(x => x !== c.id) : [...t, c.id])}
          >
            {c.label}
          </Chip>
        ))}
      </div>
      {turnos.length > 0 && (
        <Button block style={{ marginTop: 12 }} loading={guardando === 'turno'}
                onClick={guardarTurno}>
          Guardar horario
        </Button>
      )}

      {aviso && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--fg-secondary)' }}>{aviso}</div>
      )}
    </Sheet>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function RouteScreen() {
  const {
    rutas, ruta, rutaId, setRutaId, paradas,
    loading, error, reload, marcarParada, corregirTurno,
  } = useMiRuta()

  const [abierta,  setAbierta]  = useState(null)   // parada abierta
  const [filtro,   setFiltro]   = useState('pendientes')

  const visibles = paradas.filter(p =>
    filtro === 'todas' ||
    (filtro === 'pendientes' && p.status !== 'hecha') ||
    (filtro === 'hechas'     && p.status === 'hecha'))

  const hechas = paradas.filter(p => p.status === 'hecha').length
  const t = ruta && TURNOS[ruta.turno]

  if (error) {
    return (
      <div style={{ padding: 14 }}>
        <Card style={{ padding: 18 }}>
          <div className="k-h3" style={{ marginBottom: 6 }}>No se pudo cargar tu ruta</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 14 }}>{error}</div>
          <Button onClick={reload}>Intentar de nuevo</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 120 }}>
      {/* Encabezado */}
      <div style={{ padding: '16px 14px 8px' }}>
        <div className="k-h1">Mi ruta</div>
        {ruta && (
          <div style={{ fontSize: 13.5, color: 'var(--fg-secondary)', marginTop: 4 }}>
            {fechaLarga(ruta.fecha)}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Bone h={92} r="var(--r-lg)" />
          {[0, 1, 2, 3].map(i => <Bone key={i} h={72} r="var(--r-md)" />)}
        </div>
      ) : !ruta ? (
        <div style={{ padding: 14 }}>
          <Empty icon="navigation">
            Todavía no tienes ruta asignada. En cuanto te asignen una, aparece aquí.
          </Empty>
        </div>
      ) : (
        <>
          {/* Resumen del día */}
          <div style={{ padding: '0 14px' }}>
            <Card style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 16 }}>{ruta.titulo}</b>
                {t && <Pill tone={t.tone}>{t.label}</Pill>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <span className="k-num" style={{ fontSize: 30 }}>{hechas}</span>
                <span style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>
                  de {paradas.length} puertas
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={hechas} max={paradas.length || 1} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)', marginTop: 8 }}>
                {(ruta.metros / 1000).toFixed(1)} km a pie · {ruta.calles} calles · sector {ruta.sector_code}
              </div>
            </Card>
          </div>

          {/* Si trae más de una ruta, poder cambiar de día */}
          {rutas.length > 1 && (
            <div style={{ padding: '12px 14px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
              {rutas.map(r => (
                <Chip key={r.id} selected={r.id === rutaId} onClick={() => setRutaId(r.id)}>
                  {r.titulo.replace(/^.*·\s*/, '')}
                </Chip>
              ))}
            </div>
          )}

          <div style={{ padding: '12px 14px 4px' }}>
            <Segmented
              size="lg" surface
              options={[
                { id: 'pendientes', label: `Por tocar (${paradas.length - hechas})` },
                { id: 'hechas',     label: `Hechas (${hechas})` },
                { id: 'todas',      label: 'Todas' },
              ]}
              value={filtro}
              onChange={setFiltro}
              style={{ display: 'flex' }}
            />
          </div>

          {/* Las paradas, en orden de caminata */}
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibles.length === 0 ? (
              <Empty icon="circle-check">
                {filtro === 'pendientes'
                  ? '¡Terminaste la ruta de hoy!'
                  : 'Nada que mostrar aquí'}
              </Empty>
            ) : visibles.map(p => {
              const hecha = p.status === 'hecha'
              const res = RESULTADOS.find(r => r.id === p.outcome)
              return (
                <Card
                  key={p.id}
                  onClick={() => setAbierta(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 13,
                    cursor: 'pointer', opacity: hecha ? 0.62 : 1,
                  }}
                >
                  {/* Lima con texto oscuro: --primary-bg es casi negro y no
                      existe un token de texto sobre él, así que el número
                      salía oscuro sobre oscuro y no se leía. */}
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: hecha ? '#1D9E75' : 'var(--accent)',
                    color: hecha ? '#FFFFFF' : '#16212A',
                    fontSize: 13, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                  }}>
                    {hecha ? <Icon name="check" size={17} /> : p.orden}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 14.5, fontWeight: 600,
                      textDecoration: hecha ? 'line-through' : 'none',
                    }}>{p.nombre}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
                      {[p.calle, p.numero].filter(Boolean).join(' ') || 'Sin dirección'}
                    </span>
                    {res && <span style={{ display: 'inline-block', marginTop: 6 }}>
                      <Pill tone={res.tone}>{res.label}</Pill>
                    </span>}
                  </span>

                  {p.telefono && !hecha && (
                    <a
                      href={`tel:${p.telefono}`}
                      className="k-iconbtn k-iconbtn--soft"
                      aria-label={`Llamar a ${p.nombre}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <Icon name="phone" size={18} />
                    </a>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {abierta && (
        <HojaParada
          parada={paradas.find(p => p.id === abierta.id) || abierta}
          onCerrar={() => setAbierta(null)}
          onMarcar={marcarParada}
          onCorregirTurno={corregirTurno}
        />
      )}
    </div>
  )
}
