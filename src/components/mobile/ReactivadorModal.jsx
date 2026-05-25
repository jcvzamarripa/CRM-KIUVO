import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { STAGE_BY_ID } from '../../constants/stages'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const DISMISSED_KEY = 'kiuvo_reactivador_dismissed'
const DAYS_THRESHOLD = 60

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
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ width: '60%', height: 13, borderRadius: 4, background: 'var(--bg-secondary)' }} />
          <div style={{ width: '40%', height: 11, borderRadius: 4, background: 'var(--bg-secondary)' }} />
        </div>
        <div style={{ width: 32, height: 36, borderRadius: 6, background: 'var(--bg-secondary)' }} />
      </div>
      <div style={{ width: '70%', height: 11, borderRadius: 4, background: 'var(--bg-secondary)' }} />
    </div>
  )
}

// ─── ClientCard ───────────────────────────────────────────────────────────────
function ClientCard({ client, sellerName, onDismiss, onSchedule }) {
  const stage    = STAGE_BY_ID[client.stage] ?? STAGE_BY_ID['prospeccion']
  const urgency  = client.days >= 90 ? 'danger' : 'warning'
  const dotColor = urgency === 'danger' ? 'var(--danger)' : 'var(--warning)'
  const bgColor  = urgency === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)'
  const fgColor  = urgency === 'danger' ? 'var(--danger-fg)' : 'var(--warning-fg)'
  const bdColor  = urgency === 'danger' ? 'var(--danger-border)' : 'var(--warning-border)'

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
    <div style={{ background: 'var(--surface)', border: `0.5px solid ${bdColor}`, borderRadius: 'var(--r-lg)', overflow: 'hidden', flexShrink: 0 }}>
      {/* Top row */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="building-store" size={18} color={dotColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>{client.contact}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: stage.color, background: stage.color + '18', padding: '2px 7px', borderRadius: 'var(--r-full)' }}>
              {stage.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{fmt(client.value)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: dotColor, letterSpacing: -0.5, lineHeight: 1 }}>{client.days}</div>
          <div style={{ fontSize: 10, color: dotColor, marginTop: 1 }}>días</div>
        </div>
      </div>

      {/* Last activity */}
      <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clock" size={12} color="var(--fg-tertiary)" />
        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
          Último: {client.lastActivity} · hace {client.days} días
        </span>
      </div>

      {/* Actions */}
      <div style={{ borderTop: `0.5px solid ${bdColor}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <button
          onClick={() => client.phone && window.open(`https://wa.me/52${client.phone.replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`, '_blank')}
          style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRight: `0.5px solid ${bdColor}`, color: '#25D366' }}>
          <Icon name="brand-whatsapp" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>WhatsApp</span>
        </button>
        <button
          onClick={() => client.phone && (window.location.href = `tel:${client.phone}`)}
          style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, borderRight: `0.5px solid ${bdColor}`, color: 'var(--kiuvo-blue)' }}>
          <Icon name="phone" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>Llamar</span>
        </button>
        <button
          onClick={() => onSchedule(client)}
          style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: 'var(--warning)' }}>
          <Icon name="calendar-plus" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>Agendar</span>
        </button>
      </div>

      {/* Dismiss */}
      <div style={{ borderTop: `0.5px solid ${bdColor}` }}>
        <button onClick={() => onDismiss(client.id)} style={{
          width: '100%', padding: '9px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          color: 'var(--fg-tertiary)', fontSize: 12,
        }}>
          <Icon name="check" size={14} />
          Marcar como contactado
        </button>
      </div>
    </div>
  )
}

// ─── ReactivadorModal ─────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all', label: 'Todos'     },
  { id: '90',  label: '+90 días'  },
  { id: '60',  label: '60–90 días' },
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

    // 1 — Prospects sin contacto en 60+ días (o nunca contactados)
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
    (filter === '60' && c.days >= 60 && c.days < 90)
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh-alert" size={18} color="var(--danger)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Reactivador</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>
              {loading ? '…' : `${active.length} cliente${active.length !== 1 ? 's' : ''} sin contacto · +${DAYS_THRESHOLD} días`}
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0 0' }} />

        {/* Filter chips */}
        <div style={{ padding: '10px 16px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-full)',
              fontSize: 12, fontWeight: 500,
              background: filter === f.id ? 'var(--danger)' : 'var(--surface)',
              border: `0.5px solid ${filter === f.id ? 'var(--danger)' : 'var(--border)'}`,
              color: filter === f.id ? '#fff' : 'var(--fg-secondary)',
            }}>{f.label}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : visible.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={24} color="var(--success)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                {filter !== 'all' ? 'Sin clientes en este rango' : '¡Sin clientes pendientes!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>Todos tus clientes están al día</div>
            </div>
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
      </div>
    </div>
  )
}
