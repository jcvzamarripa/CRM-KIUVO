import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Icon from '../shared/Icon'
import { Card, Pill, Button, IconButton, Chip, Sheet, Label, ProgressBar } from '../ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { localDateStr, addDays, relativeDay } from '../../lib/dates'
import { fmtDistance } from '../../lib/geo'

const DEFAULT_DAILY = { visitas: 15, prospectos: 5 }
const LATE_SYNC_MIN = 30
const REFRESH_MS = 60000

const OUTCOME = {
  no_estaba:   'No estaba el encargado',
  volver:      'Pidió que regrese',
  cita:        'Agendó cita',
  cotizacion:  'Pidió cotización',
  venta:       'Venta cerrada',
  no_interesa: 'No le interesa',
}
const KIND = { call: 'Llamada', whatsapp: 'WhatsApp', email: 'Email' }

const VERDICT = {
  verified:     { tone: 'success', label: 'Verificada',           flagged: false },
  no_reference: { tone: 'sky',     label: 'Primera vez con GPS',  flagged: false },
  far:          { tone: 'coral',   label: 'Lejos del prospecto',  flagged: true  },
  no_gps:       { tone: 'coral',   label: 'Sin ubicación',        flagged: true  },
  no_photo:     { tone: 'coral',   label: 'Sin foto',             flagged: true  },
}

const isVisit   = v => v.kind === 'visit'
const isFlagged = v => isVisit(v) && (VERDICT[v.verification]?.flagged ?? true)
const isLate    = v => v.synced_at && (new Date(v.synced_at) - new Date(v.created_at)) / 60000 > LATE_SYNC_MIN
const fmtTime   = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function dayBounds(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { from: new Date(y, m - 1, d).toISOString(), to: new Date(y, m - 1, d + 1).toISOString() }
}

// ── Datos del día ─────────────────────────────────────────────────
function useFieldDay(dateStr) {
  const [state, setState] = useState({ sellers: [], visits: [], tasks: [], photos: {}, loading: true, error: null })

  const load = useCallback(async () => {
    if (!supabase) { setState(s => ({ ...s, loading: false })); return }
    const { from, to } = dayBounds(dateStr)

    const [profilesRes, goalsRes, visitsRes, prospectsRes, quotesRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, initials, avatar_color, role').order('full_name'),
      supabase.from('seller_goals').select('seller_id, goal_visitas, goal_prospectos').eq('period', 'Día'),
      supabase.from('visits')
        .select('id, seller_id, kind, lat, lng, accuracy_m, distance_m, photo_path, outcome, loss_reason, verification, notes, created_at, synced_at, prospect:prospects ( id, name, address )')
        .gte('created_at', from).lt('created_at', to)
        .order('created_at', { ascending: true }),
      supabase.from('prospects').select('owner_id').gte('created_at', from).lt('created_at', to),
      supabase.from('quotes').select('seller_id').gte('created_at', from).lt('created_at', to),
      supabase.from('tasks')
        .select('id, seller_id, title, due_date, done_at, created_by, prospect:prospects ( name )')
        .lte('due_date', dateStr)
        .or(`done_at.is.null,done_at.gte.${from}`)
        .order('due_date', { ascending: true }),
    ])

    const error = profilesRes.error || visitsRes.error
    if (error) { setState(s => ({ ...s, loading: false, error: error.message })); return }

    const visits = visitsRes.data || []
    const goals = Object.fromEntries((goalsRes.data || []).map(g => [g.seller_id, g]))
    const countBy = (rows, key) => (rows || []).reduce((m, r) => { m[r[key]] = (m[r[key]] || 0) + 1; return m }, {})
    const newBy = countBy(prospectsRes.data, 'owner_id')
    const quotesBy = countBy(quotesRes.data, 'seller_id')
    const tasks = tasksRes.data || []

    const sellers = (profilesRes.data || []).filter(p => p.role !== 'admin').map(p => {
      const mine = visits.filter(v => v.seller_id === p.id)
      const field = mine.filter(isVisit)
      const myTasks = tasks.filter(t => t.seller_id === p.id && !t.done_at)
      return {
        id: p.id, name: p.full_name, initials: p.initials, color: p.avatar_color || '#185FA5',
        goalVisits: goals[p.id]?.goal_visitas || DEFAULT_DAILY.visitas,
        goalNew:    goals[p.id]?.goal_prospectos || DEFAULT_DAILY.prospectos,
        visits:     field.length,
        verified:   field.filter(v => !isFlagged(v)).length,
        flagged:    field.filter(isFlagged).length,
        others:     mine.length - field.length,
        first:      field[0]?.created_at || null,
        last:       field[field.length - 1]?.created_at || null,
        newProspects: newBy[p.id] || 0,
        quotes:       quotesBy[p.id] || 0,
        pending:      myTasks.length,
        overdue:      myTasks.filter(t => t.due_date < dateStr).length,
      }
    })

    // Fotos privadas: enlaces firmados de una hora
    const paths = visits.map(v => v.photo_path).filter(Boolean)
    let photos = {}
    if (paths.length) {
      const { data } = await supabase.storage.from('visit-photos').createSignedUrls(paths, 3600)
      photos = Object.fromEntries((data || []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]))
    }

    setState({ sellers, visits, tasks, photos, loading: false, error: null })
  }, [dateStr])

  useEffect(() => {
    setState(s => ({ ...s, loading: true }))
    load()
    if (dateStr !== localDateStr()) return
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load, dateStr])

  return { ...state, reload: load }
}

// ── Mapa del recorrido (Leaflet sin react-leaflet, compatible con React 18) ──
function RouteMap({ visits, sellersById, onPick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const LfRef = useRef(null)
  const layerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('leaflet').then(mod => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const Lf = mod.default || mod
      LfRef.current = Lf
      const map = Lf.map(containerRef.current, { center: [21.88, -102.29], zoom: 12 })
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap', maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      layerRef.current = Lf.layerGroup().addTo(map)
      setTimeout(() => map.invalidateSize(), 120)
      setReady(true)
    })
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const Lf = LfRef.current
    const layer = layerRef.current
    layer.clearLayers()

    const located = visits.filter(v => isVisit(v) && v.lat != null && v.lng != null)
    const bySeller = {}
    located.forEach(v => { (bySeller[v.seller_id] ||= []).push(v) })

    Object.entries(bySeller).forEach(([sellerId, list]) => {
      const color = sellersById[sellerId]?.color || '#185FA5'
      if (list.length > 1) {
        Lf.polyline(list.map(v => [Number(v.lat), Number(v.lng)]), { color, weight: 3, opacity: 0.55, dashArray: '6 6' }).addTo(layer)
      }
      list.forEach((v, i) => {
        const flagged = isFlagged(v)
        const dot = document.createElement('div')
        dot.textContent = String(i + 1)
        dot.style.cssText = `width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 12px Inter,sans-serif;color:#fff;background:${color};box-shadow:0 0 0 3px ${flagged ? '#F26B5E' : '#fff'},0 2px 6px rgba(0,0,0,.35)`
        const marker = Lf.marker([Number(v.lat), Number(v.lng)], {
          icon: Lf.divIcon({ html: dot, className: '', iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(layer)
        const tip = document.createElement('div')
        tip.textContent = `${fmtTime(v.created_at)} · ${v.prospect?.name || 'Prospecto'} · ${sellersById[sellerId]?.name || ''}`
        marker.bindTooltip(tip)
        marker.on('click', () => onPick?.(v.id))
      })
    })

    if (located.length) {
      mapRef.current.fitBounds(located.map(v => [Number(v.lat), Number(v.lng)]), { padding: [40, 40], maxZoom: 16 })
    }
  }, [ready, visits, sellersById, onPick])

  return <div ref={containerRef} className="sv-map" />
}

// ── Piezas ────────────────────────────────────────────────────────
function Avatar({ seller, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: seller?.color || 'var(--ink)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
    }}>{seller?.initials || '?'}</div>
  )
}

function Tile({ value, label, tone, sub }) {
  return (
    <Card tone={tone} style={{ padding: '16px 18px' }}>
      <div className="k-display" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{sub}</div>}
    </Card>
  )
}

function SellerRow({ s, selected, onSelect }) {
  const idle = s.visits === 0
  return (
    <button onClick={onSelect} className="k-card" aria-pressed={selected} style={{
      width: '100%', textAlign: 'left', padding: 14,
      background: selected ? 'var(--ink)' : 'var(--surface)',
      color: selected ? 'var(--on-ink)' : 'var(--fg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar seller={s} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 1 }}>
            {idle ? 'Sin check-in' : `${fmtTime(s.first)} – ${fmtTime(s.last)}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="k-display" style={{ fontSize: 24, fontWeight: 700 }}>{s.visits}</span>
          <span style={{ fontSize: 14, opacity: 0.6 }}> / {s.goalVisits}</span>
        </div>
      </div>
      <div style={{ margin: '12px 0 10px' }}>
        <ProgressBar value={s.visits} max={s.goalVisits}
          color={selected ? 'var(--accent)' : 'var(--primary-bg)'}
          track={selected ? 'rgba(255,255,255,0.16)' : 'var(--bg-tertiary)'} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {idle && <Pill tone="warning">Sin actividad</Pill>}
        {s.flagged > 0 && <Pill tone="coral" icon="alert-triangle">{s.flagged} con alerta</Pill>}
        <Pill tone={selected ? 'on-ink' : undefined}>{s.newProspects}/{s.goalNew} nuevos</Pill>
        {s.quotes > 0 && <Pill tone={selected ? 'on-ink' : undefined}>{s.quotes} cotiz.</Pill>}
        {s.others > 0 && <Pill tone={selected ? 'on-ink' : undefined}>{s.others} llamadas/mensajes</Pill>}
        {s.overdue > 0
          ? <Pill tone="coral">{s.overdue} tareas vencidas</Pill>
          : s.pending > 0 && <Pill tone={selected ? 'on-ink' : undefined}>{s.pending} tareas</Pill>}
      </div>
    </button>
  )
}

function VisitCard({ v, seller, photoUrl, highlighted, onPhoto, innerRef }) {
  const verdict = VERDICT[v.verification]
  return (
    <div ref={innerRef} className="k-card" style={{
      display: 'flex', gap: 14, padding: 14,
      boxShadow: highlighted ? 'inset 0 0 0 2px var(--fg)' : 'none',
    }}>
      <div style={{ width: 54, flexShrink: 0 }}>
        <div className="k-display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{fmtTime(v.created_at)}</div>
        <div style={{ marginTop: 8 }}><Avatar seller={seller} size={30} /></div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v.prospect?.name || 'Prospecto eliminado'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 1 }}>
          {seller?.name}{v.prospect?.address ? ` · ${v.prospect.address}` : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {isVisit(v)
            ? <Pill tone={verdict?.tone || 'coral'} icon={verdict?.flagged === false ? 'map-pin-check' : 'alert-triangle'}>
                {verdict?.label || 'Sin evidencia'}{v.distance_m != null ? ` · ${fmtDistance(Number(v.distance_m))}` : ''}
              </Pill>
            : <Pill>{KIND[v.kind] || v.kind}</Pill>}
          {v.outcome && <Pill tone={v.outcome === 'venta' ? 'accent' : 'lilac'}>{OUTCOME[v.outcome]}{v.loss_reason ? ` · ${v.loss_reason}` : ''}</Pill>}
          {isLate(v) && <Pill tone="warning" icon="cloud-off">Enviada a las {fmtTime(v.synced_at)}</Pill>}
        </div>
        {v.notes && <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 8, lineHeight: 1.4 }}>{v.notes}</div>}
      </div>
      {photoUrl && (
        <button onClick={() => onPhoto(photoUrl)} aria-label="Ver foto de la visita" style={{ flexShrink: 0 }}>
          <img src={photoUrl} alt="" loading="lazy" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 'var(--r-md)', display: 'block' }} />
        </button>
      )}
    </div>
  )
}

function AssignTaskSheet({ sellers, defaultSellerId, dateStr, onClose, onSaved }) {
  const { user } = useAuth()
  const [sellerIds, setSellerIds] = useState(defaultSellerId ? [defaultSellerId] : [])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(dateStr < localDateStr() ? localDateStr() : dateStr)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = id => setSellerIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  const allOn = sellerIds.length === sellers.length

  async function save() {
    setSaving(true); setError('')
    const rows = sellerIds.map(seller_id => ({ seller_id, created_by: user.id, title: title.trim(), due_date: due, kind: 'other' }))
    const { error: err } = await supabase.from('tasks').insert(rows)
    setSaving(false)
    if (err) { setError('No se pudo guardar: ' + err.message); return }
    onSaved(); onClose()
  }

  return (
    <Sheet title="Asignar tarea" onClose={onClose} footer={
      <>
        {error && <div style={{ color: 'var(--coral-fg)', fontSize: 14, marginBottom: 10 }}>{error}</div>}
        <Button block size="lg" loading={saving} disabled={!title.trim() || !sellerIds.length || !due} onClick={save}>
          Asignar{sellerIds.length > 1 ? ` a ${sellerIds.length}` : ''}
        </Button>
      </>
    }>
      <Label>¿Qué hay que hacer?</Label>
      <input className="k-input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Recorrer la zona Centro" style={{ marginBottom: 20 }} />

      <Label>¿Para quién?</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <Chip selected={allOn} onClick={() => setSellerIds(allOn ? [] : sellers.map(s => s.id))}>Todos</Chip>
        {sellers.map(s => <Chip key={s.id} selected={sellerIds.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</Chip>)}
      </div>

      <Label>¿Para cuándo?</Label>
      <input type="date" className="k-input" value={due} min={localDateStr()} onChange={e => setDue(e.target.value)} />
    </Sheet>
  )
}

// ── Vista ─────────────────────────────────────────────────────────
export default function SupervisionView() {
  const [dateStr, setDateStr] = useState(localDateStr())
  const [sellerId, setSellerId] = useState(null)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [picked, setPicked] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const { sellers, visits, tasks, photos, loading, error, reload } = useFieldDay(dateStr)
  const cardRefs = useRef({})

  const isToday = dateStr === localDateStr()
  const sellersById = useMemo(() => Object.fromEntries(sellers.map(s => [s.id, s])), [sellers])
  const shown = useMemo(
    () => visits.filter(v => (!sellerId || v.seller_id === sellerId) && (!onlyFlagged || isFlagged(v))),
    [visits, sellerId, onlyFlagged],
  )
  const mapVisits = useMemo(() => visits.filter(v => !sellerId || v.seller_id === sellerId), [visits, sellerId])
  const shownTasks = tasks.filter(t => !t.done_at && (!sellerId || t.seller_id === sellerId))

  const pickFromMap = useCallback(id => {
    setOnlyFlagged(false)
    setPicked(id)
    setTimeout(() => cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }, [])

  const total    = sellers.reduce((n, s) => n + s.visits, 0)
  const goal     = sellers.reduce((n, s) => n + s.goalVisits, 0)
  const verified = sellers.reduce((n, s) => n + s.verified, 0)
  const flagged  = sellers.reduce((n, s) => n + s.flagged, 0)
  const active   = sellers.filter(s => s.visits > 0).length
  const idle     = sellers.filter(s => s.visits === 0)

  async function removeTask(t) {
    await supabase.from('tasks').delete().eq('id', t.id)
    reload()
  }

  return (
    <div className="sv-scroll">
      {/* Barra de fecha */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <IconButton icon="chevron-left" label="Día anterior" onClick={() => setDateStr(d => localDateStr(addDays(-1, new Date(d + 'T12:00'))))} />
        <input type="date" className="k-input" value={dateStr} max={localDateStr()} onChange={e => e.target.value && setDateStr(e.target.value)}
          style={{ width: 'auto', borderRadius: 'var(--r-full)', fontWeight: 600 }} aria-label="Fecha" />
        <IconButton icon="chevron-right" label="Día siguiente" disabled={isToday}
          onClick={() => setDateStr(d => localDateStr(addDays(1, new Date(d + 'T12:00'))))} style={{ opacity: isToday ? 0.35 : 1 }} />
        {!isToday && <Button variant="soft" size="sm" onClick={() => setDateStr(localDateStr())}>Hoy</Button>}
        <div style={{ flex: 1 }} />
        {isToday && <span style={{ fontSize: 13, color: 'var(--fg-tertiary)' }}>Se actualiza cada minuto</span>}
        <IconButton icon="refresh" label="Actualizar" onClick={reload} />
        <Button icon="plus" onClick={() => setAssigning(true)} disabled={!sellers.length}>Asignar tarea</Button>
      </div>

      {error && <Card style={{ background: 'var(--coral-soft)', color: 'var(--coral-fg)', marginBottom: 16 }}>No se pudo cargar: {error}</Card>}

      {/* Resumen */}
      <div className="sv-tiles">
        <Tile tone="ink" value={loading ? '–' : `${active}/${sellers.length}`} label="Vendedores en campo"
          sub={idle.length ? `Sin check-in: ${idle.map(s => s.name.split(' ')[0]).join(', ')}` : 'Todos con actividad'} />
        <Tile value={loading ? '–' : total} label="Visitas" sub={`Meta del equipo: ${goal}`} />
        <Tile tone="accent" value={loading ? '–' : (total ? `${Math.round((verified / total) * 100)}%` : '—')} label="Verificadas" sub={`${verified} de ${total}`} />
        <Tile tone={flagged ? 'lilac' : undefined} value={loading ? '–' : flagged} label="Con alerta" sub="Lejos, sin ubicación o sin foto" />
      </div>

      <div className="sv-grid">
        {/* Vendedores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="k-display" style={{ fontSize: 20, fontWeight: 700, margin: '0 4px' }}>Equipo</div>
          {sellers.map(s => (
            <SellerRow key={s.id} s={s} selected={sellerId === s.id} onSelect={() => setSellerId(id => id === s.id ? null : s.id)} />
          ))}
          {!loading && sellers.length === 0 && <Card style={{ color: 'var(--fg-secondary)' }}>Aún no hay vendedores.</Card>}

          {shownTasks.length > 0 && (
            <>
              <div className="k-display" style={{ fontSize: 20, fontWeight: 700, margin: '12px 4px 0' }}>Tareas pendientes · {shownTasks.length}</div>
              <Card>
                {shownTasks.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <Avatar seller={sellersById[t.seller_id]} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{t.title}</div>
                      <div style={{ marginTop: 4 }}>
                        <Pill tone={t.due_date < localDateStr() ? 'coral' : undefined}>
                          {t.due_date < localDateStr() ? `Vencida · ${relativeDay(t.due_date)}` : relativeDay(t.due_date)}
                        </Pill>
                      </div>
                    </div>
                    <button aria-label="Eliminar tarea" onClick={() => removeTask(t)} style={{ width: 40, height: 40, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                ))}
              </Card>
            </>
          )}
        </div>

        {/* Mapa + recorrido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <Card flush><RouteMap visits={mapVisits} sellersById={sellersById} onPick={pickFromMap} /></Card>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div className="k-display" style={{ fontSize: 20, fontWeight: 700, margin: '0 4px', flex: 1 }}>
              {sellerId ? `Recorrido de ${sellersById[sellerId]?.name.split(' ')[0]}` : 'Actividad del día'}
            </div>
            <Chip selected={!onlyFlagged} onClick={() => setOnlyFlagged(false)}>Todas</Chip>
            <Chip selected={onlyFlagged} onClick={() => setOnlyFlagged(true)}>Solo alertas</Chip>
          </div>

          {loading ? (
            <Card style={{ color: 'var(--fg-tertiary)' }}>Cargando…</Card>
          ) : shown.length === 0 ? (
            <Card style={{ color: 'var(--fg-secondary)' }}>
              {onlyFlagged ? 'Sin alertas en este día.' : 'Sin actividad registrada en este día.'}
            </Card>
          ) : [...shown].reverse().map(v => (
            <VisitCard key={v.id} v={v} seller={sellersById[v.seller_id]} photoUrl={photos[v.photo_path]}
              highlighted={picked === v.id} onPhoto={setPhoto} innerRef={el => { cardRefs.current[v.id] = el }} />
          ))}
        </div>
      </div>

      {photo && (
        <div onClick={() => setPhoto(null)} role="dialog" aria-label="Foto de la visita" style={{
          position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out',
        }}>
          <img src={photo} alt="Foto de la visita" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 'var(--r-lg)' }} />
        </div>
      )}

      {assigning && (
        <AssignTaskSheet sellers={sellers} defaultSellerId={sellerId} dateStr={dateStr}
          onClose={() => setAssigning(false)} onSaved={reload} />
      )}
    </div>
  )
}
