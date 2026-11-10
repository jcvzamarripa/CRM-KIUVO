import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Card, Pill, Segmented, Empty, Bone } from '../ui'
import { STAGE_BY_ID } from '../../constants/stages'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const DISMISSED_KEY = 'kiuvo_reactivador_dismissed'
const DAYS_THRESHOLD = 30

const KIND_LABEL = {
  visit:    'Visita presencial',
  call:     'Llamada telefónica',
  whatsapp: 'Mensaje WhatsApp',
  email:    'Email',
}

const fmt = n => '$' + (n ?? 0).toLocaleString('es-MX')

function extractContact(notes, fallback) {
  if (notes) {
    const m = notes.match(/^Contacto:\s*(.+)/m)
    if (m) return m[1].trim()
  }
  return fallback
}

function calcDays(last_contact_at, created_at) {
  const ref = last_contact_at ?? created_at
  if (!ref) return 0
  return Math.floor((Date.now() - new Date(ref)) / 86400000)
}

function normalize(row, lastVisitMap) {
  return {
    id:           row.id,
    name:         row.name,
    contact:      extractContact(row.notes, row.company || row.name),
    phone:        row.phone || '',
    stage:        row.stage_id,
    value:        row.value ?? 0,
    days:         calcDays(row.last_contact_at, row.created_at),
    lastActivity: lastVisitMap[row.id] ? (KIND_LABEL[lastVisitMap[row.id]] ?? 'Contacto') : 'Sin actividad registrada',
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Bone w="60%" h={16} />
          <Bone w="40%" h={13} />
        </div>
        <Bone w={44} h={40} />
      </div>
      <Bone w="70%" h={13} />
      <Bone h={48} r={999} />
    </Card>
  )
}

// ─── ClientCard ───────────────────────────────────────────────────────────────
const ACTION = {
  flex: 1, minHeight: 56, borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
  fontSize: 13, fontWeight: 600,
}

function ClientCard({ client, sellerName, onDismiss, onSchedule }) {
  const stage  = STAGE_BY_ID[client.stage] ?? STAGE_BY_ID['prospeccion']
  const urgent = client.days >= 90

  const waMsg = (() => {
    const seller = sellerName || 'tu asesor'
    const msgs = {
      prospeccion:  `Hola ${client.contact}, soy ${seller} de KIUVO. Hace tiempo no hablamos, me gustaría platicar sobre cómo podemos apoyar a ${client.name}. ¿Cuándo le queda bien?`,
      presentacion: `Hola ${client.contact}, soy ${seller} de KIUVO. Quería retomar nuestra plática sobre ${client.name}. ¿Sigue en pie el interés?`,
      cotizacion:   `Hola ${client.contact}, soy ${seller} de KIUVO. Quería dar seguimiento a la cotización que enviamos para ${client.name}. ¿Tuvo oportunidad de revisarla?`,
      negociacion:  `Hola ${client.contact}, soy ${seller} de KIUVO. Quería retomar nuestra propuesta para ${client.name}. ¿Hay algo en lo que pueda apoyarle para avanzar?`,
      cierre:       `Hola ${client.contact}, soy ${seller} de KIUVO. Quería dar seguimiento al acuerdo con ${client.name}. ¿Podemos agendar una llamada esta semana?`,
    }
    return msgs[client.stage] ?? msgs.prospeccion
  })()

  return (
    <Card style={{ flexShrink: 0 }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 2 }}>{client.contact}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Pill>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
              {stage.label}
            </Pill>
            <Pill>{fmt(client.value)}</Pill>
          </div>
        </div>
        <div style={{
          flexShrink: 0, minWidth: 64, padding: '8px 10px', borderRadius: 'var(--r-md)', textAlign: 'center',
          background: urgent ? 'var(--coral-soft)' : 'var(--warning-bg)',
          color: urgent ? 'var(--coral-fg)' : 'var(--warning-fg)',
        }}>
          <div className="k-num" style={{ fontSize: 26 }}>{client.days}</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>días</div>
        </div>
      </div>

      {/* Last activity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0', fontSize: 13, color: 'var(--fg-secondary)' }}>
        <Icon name="clock" size={15} />
        Último: {client.lastActivity} · hace {client.days} días
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => client.phone && window.open(`https://wa.me/52${client.phone.replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`, '_blank')}
          style={ACTION}>
          <Icon name="brand-whatsapp" size={22} />
          WhatsApp
        </button>
        <button
          onClick={() => client.phone && (window.location.href = `tel:${client.phone}`)}
          style={ACTION}>
          <Icon name="phone" size={22} />
          Llamar
        </button>
        <button
          onClick={() => onSchedule(client)}
          style={ACTION}>
          <Icon name="calendar-plus" size={22} />
          Agendar
        </button>
      </div>

      {/* Dismiss */}
      <button onClick={() => onDismiss(client.id)} style={{
        width: '100%', minHeight: 44, marginTop: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        color: 'var(--fg-secondary)', fontSize: 14, fontWeight: 500,
      }}>
        <Icon name="check" size={16} />
        Marcar como contactado
      </button>
    </Card>
  )
}

// ─── ReactivadorModal ─────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all', label: 'Todos'     },
  { id: '90',  label: '+90 días'  },
  { id: '30',  label: '30–90 días' },
]

export default function ReactivadorModal({ onClose, onSchedule }) {
  const { user, profile } = useAuth()

  const [clients,   setClients]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')) }
    catch { return new Set() }
  })
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const cutoff = new Date(Date.now() - DAYS_THRESHOLD * 86400000).toISOString()

    // 1 — Prospects sin contacto en 30+ días (o nunca contactados)
    const { data: rows } = await supabase
      .from('prospects')
      .select('id, name, company, phone, stage_id, value, notes, last_contact_at, created_at')
      .eq('owner_id', user.id)
      .or(`last_contact_at.is.null,last_contact_at.lt.${cutoff}`)
      .order('last_contact_at', { ascending: true, nullsFirst: true })

    if (!rows?.length) { setClients([]); setLoading(false); return }

    // 2 — Última visita por prospecto (un solo query)
    const ids = rows.map(r => r.id)
    const { data: visits } = await supabase
      .from('visits')
      .select('prospect_id, kind, created_at')
      .in('prospect_id', ids)
      .order('created_at', { ascending: false })

    // Build map: prospect_id → kind of last visit
    const lastVisitMap = {}
    visits?.forEach(v => {
      if (!lastVisitMap[v.prospect_id]) lastVisitMap[v.prospect_id] = v.kind
    })

    setClients(rows.map(r => normalize(r, lastVisitMap)))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  function handleDismiss(id) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
  }

  const active  = clients.filter(c => !dismissed.has(c.id))
  const visible = active.filter(c =>
    filter === 'all' ||
    (filter === '90' && c.days >= 90) ||
    (filter === '30' && c.days >= 30 && c.days < 90)
  )

  return (
    <Sheet full title="Reactivador" onClose={onClose}>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', marginBottom: 14 }}>
        {loading ? 'Cargando…' : `${active.length} cliente${active.length !== 1 ? 's' : ''} sin contacto hace más de ${DAYS_THRESHOLD} días`}
      </div>

      <Segmented surface size="lg" options={FILTERS} value={filter} onChange={setFilter} style={{ marginBottom: 14 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : visible.length === 0 ? (
          <Empty icon="circle-check">
            <div style={{ fontWeight: 600, color: 'var(--fg)' }}>
              {filter !== 'all' ? 'Sin clientes en este rango' : '¡Sin clientes pendientes!'}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Todos tus clientes están al día</div>
          </Empty>
        ) : (
          visible.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              sellerName={profile?.full_name}
              onDismiss={handleDismiss}
              onSchedule={client => { onClose(); onSchedule(client) }}
            />
          ))
        )}
      </div>
    </Sheet>
  )
}
