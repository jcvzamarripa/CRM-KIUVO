import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { STAGE_BY_ID } from '../../constants/stages'

// ─── Mock data ────────────────────────────────────────────────────────────────

const CLIENTES = [
  { id: 'r1', name: 'Herrería Jiménez',   contact: 'Ernesto Jiménez',   phone: '4421119999', days: 92, lastActivity: 'Visita presencial',    stage: 'negociacion',  value: 28500 },
  { id: 'r2', name: 'Ferretería El Norte', contact: 'Claudia Hernández', phone: '8187778888', days: 78, lastActivity: 'Mensaje WhatsApp',     stage: 'cotizacion',   value: 15200 },
  { id: 'r3', name: 'Suministros Bajío',  contact: 'Fernando Leal',     phone: '4774445566', days: 65, lastActivity: 'Llamada telefónica',   stage: 'presentacion', value: 41000 },
  { id: 'r4', name: 'Plomería Del Valle', contact: 'Ramón Castro',      phone: '4422223333', days: 61, lastActivity: 'Visita presencial',    stage: 'prospeccion',  value: 9800  },
]

const DISMISSED_KEY = 'kiuvo_reactivador_dismissed'

function waMessage(client) {
  const msgs = {
    prospeccion:  `Hola ${client.contact}, soy Luis de KIUVO. Hace tiempo no hablamos, me gustaría platicar sobre cómo podemos apoyar a ${client.name}. ¿Cuándo le queda bien?`,
    presentacion: `Hola ${client.contact}, soy Luis de KIUVO. Quería retomar nuestra plática sobre ${client.name}. ¿Sigue en pie el interés? Me encantaría darle seguimiento.`,
    cotizacion:   `Hola ${client.contact}, soy Luis de KIUVO. Quería dar seguimiento a la cotización que enviamos para ${client.name}. ¿Tuvo oportunidad de revisarla?`,
    negociacion:  `Hola ${client.contact}, soy Luis de KIUVO. Quería retomar nuestra propuesta para ${client.name}. ¿Hay algo en lo que pueda apoyarle para avanzar?`,
    cierre:       `Hola ${client.contact}, soy Luis de KIUVO. Quería dar seguimiento al acuerdo con ${client.name}. ¿Podemos agendar una llamada esta semana?`,
  }
  return msgs[client.stage] || msgs.prospeccion
}

const fmt = n => '$' + n.toLocaleString('es-MX')

// ─── ClientCard ───────────────────────────────────────────────────────────────

function ClientCard({ client, onDismiss, onSchedule }) {
  const stage    = STAGE_BY_ID[client.stage]
  const urgency  = client.days >= 90 ? 'danger' : 'warning'
  const dotColor = urgency === 'danger' ? 'var(--danger)' : 'var(--warning)'
  const bgColor  = urgency === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)'
  const fgColor  = urgency === 'danger' ? 'var(--danger-fg)' : 'var(--warning-fg)'
  const bdColor  = urgency === 'danger' ? 'var(--danger-border)' : 'var(--warning-border)'

  function handleWA() {
    const msg = waMessage(client)
    const phone = client.phone.replace(/\D/g, '')
    window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function handleCall() {
    window.location.href = `tel:${client.phone}`
  }

  return (
    <div style={{
      background: 'var(--surface)', border: `0.5px solid ${bdColor}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Top row */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="building-store" size={18} color={dotColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>{client.contact}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 500, color: stage.color,
              background: stage.color + '18', padding: '2px 7px', borderRadius: 'var(--r-full)',
            }}>
              {stage.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{fmt(client.value)}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: dotColor, letterSpacing: -0.5, lineHeight: 1 }}>
            {client.days}
          </div>
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
        <button onClick={handleWA} style={{
          padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          borderRight: `0.5px solid ${bdColor}`,
          color: '#25D366',
        }}>
          <Icon name="brand-whatsapp" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>WhatsApp</span>
        </button>

        <button onClick={handleCall} style={{
          padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          borderRight: `0.5px solid ${bdColor}`,
          color: 'var(--kiuvo-blue)',
        }}>
          <Icon name="phone" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>Llamar</span>
        </button>

        <button onClick={() => onSchedule(client)} style={{
          padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: 'var(--warning)',
        }}>
          <Icon name="calendar-plus" size={18} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>Agendar</span>
        </button>
      </div>

      {/* Mark as contacted */}
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

// ─── ReactivadorModal (main export) ───────────────────────────────────────────

export default function ReactivadorModal({ onClose, onSchedule }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')) }
    catch { return new Set() }
  })
  const [filter, setFilter] = useState('all')

  function handleDismiss(id) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
  }

  const visible = CLIENTES
    .filter(c => !dismissed.has(c.id))
    .filter(c => filter === 'all' || (filter === '90' && c.days >= 90) || (filter === '60' && c.days >= 60 && c.days < 90))

  const total = CLIENTES.filter(c => !dismissed.has(c.id)).length

  const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: '90',  label: '+90 días' },
    { id: '60',  label: '60–90 días' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0,
            background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="refresh-alert" size={18} color="var(--danger)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Reactivador</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>
              {total} cliente{total !== 1 ? 's' : ''} sin contacto · +60 días
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
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.length === 0 ? (
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
