import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Chip, Card, Label, SearchInput, Empty } from '../ui'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { STAGE_BY_ID } from '../../constants/stages'

// ── Templates ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'followup',
    label: 'Seguimiento',
    build: (p) =>
      `Hola ${p.contact}, habla Luis de KIUVO 👋\n\n¿Cómo están? Quería hacer seguimiento a nuestra última visita y ver si tienen alguna duda o comentario sobre la propuesta.\n\nQuedo a sus órdenes. 🙌`,
  },
  {
    id: 'quote',
    label: 'Cotización',
    build: (p) =>
      `Hola ${p.contact}, buen día.\n\nLe comparto la cotización que acordamos. Si tiene alguna pregunta o ajuste, con gusto la atendemos.\n\nGracias por su tiempo y confianza. 🤝`,
  },
  {
    id: 'appointment',
    label: 'Cita',
    build: (p) =>
      `Hola ${p.contact}, espero que se encuentre muy bien.\n\nMe gustaría agendar una visita para platicarles sobre nuestras soluciones. ¿Tienen disponibilidad esta semana?\n\n¡Quedo pendiente! 📅`,
  },
  {
    id: 'intro',
    label: 'Presentación',
    build: (p) =>
      `Hola ${p.contact}, mi nombre es Luis y soy representante de KIUVO.\n\nNos especializamos en soluciones hidráulicas y me gustaría presentarles brevemente lo que podemos ofrecerles.\n\n¿Tendría unos minutos esta semana? 🙏`,
  },
  {
    id: 'close',
    label: 'Cierre',
    build: (p) =>
      `Hola ${p.contact}, ¿cómo están?\n\nSolo quería confirmar si ya tomaron una decisión respecto a nuestra propuesta. Estamos listos para avanzar en cuanto den el visto bueno. 🚀`,
  },
  {
    id: 'custom',
    label: 'Personalizado',
    build: () => '',
  },
]

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

function StageDot({ color }) {
  return <span style={{ width: 10, height: 10, borderRadius: '50%', background: color || 'var(--fg-tertiary)', flexShrink: 0 }} />
}

// ── Main ──────────────────────────────────────────────────────────
export default function WhatsAppModal({ onClose }) {
  const { prospects } = useAdminProspects()
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(null)   // prospect id
  const [templateId, setTemplateId] = useState('followup')
  const [message, setMessage]       = useState('')
  const [sent, setSent]             = useState(false)

  const prospect  = prospects.find(p => p.id === selected)
  const stage     = prospect ? STAGE_BY_ID[prospect.stage] : null

  const filtered = prospects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.contact || '').toLowerCase().includes(search.toLowerCase())
  )

  const selectProspect = (p) => {
    setSelected(p.id)
    const tpl = TEMPLATES.find(t => t.id === templateId)
    if (templateId !== 'custom') setMessage(tpl.build(p))
  }

  const selectTemplate = (tpl) => {
    setTemplateId(tpl.id)
    if (tpl.id === 'custom') {
      setMessage('')
    } else if (prospect) {
      setMessage(tpl.build(prospect))
    }
  }

  const handleSend = () => {
    if (!prospect || !message.trim()) return
    const phone = `52${prospect.phone}`
    const url   = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setSent(true)
    setTimeout(onClose, 1600)
  }

  const canSend = !!prospect && message.trim().length > 0

  if (sent) {
    return (
      <Sheet title="Listo" onClose={onClose}>
        <SentView prospect={prospect} />
      </Sheet>
    )
  }

  return (
    <Sheet
      full
      title="WhatsApp"
      onClose={onClose}
      footer={
        <>
          {prospect && (
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 10, textAlign: 'center' }}>
              Se abrirá WhatsApp con {prospect.contact} ({formatPhone(prospect.phone)})
            </div>
          )}
          <Button variant="accent" block size="lg" icon="brand-whatsapp" disabled={!canSend} onClick={handleSend}>
            Abrir en WhatsApp
          </Button>
        </>
      }
    >
      {/* Destinatario */}
      <Label>Destinatario</Label>
      {prospect ? (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <StageDot color={stage?.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, ...ELLIPSIS }}>{prospect.name}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2, ...ELLIPSIS }}>
              {prospect.contact} · {formatPhone(prospect.phone)}
            </div>
          </div>
          <Button variant="soft" size="sm" onClick={() => setSelected(null)}>Cambiar</Button>
        </Card>
      ) : (
        <div style={{ marginBottom: 22 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar prospecto o contacto…" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <Empty icon="search">Sin resultados</Empty>
            ) : filtered.map(p => (
              <button key={p.id} type="button" onClick={() => selectProspect(p)} style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                minHeight: 56, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface)',
              }}>
                <StageDot color={STAGE_BY_ID[p.stage]?.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, ...ELLIPSIS }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-secondary)', ...ELLIPSIS }}>{p.contact} · {formatPhone(p.phone)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plantilla */}
      <Label>Plantilla</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {TEMPLATES.map(t => (
          <Chip key={t.id} selected={templateId === t.id} onClick={() => selectTemplate(t)}>{t.label}</Chip>
        ))}
      </div>

      {/* Mensaje */}
      <Label>Mensaje</Label>
      <textarea
        className="k-input"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={prospect ? 'Selecciona una plantilla o escribe tu mensaje…' : 'Primero elige un prospecto…'}
        rows={7}
        style={{ lineHeight: 1.5 }}
      />
      <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 6, textAlign: 'right' }}>
        {message.length} caracteres
      </div>
    </Sheet>
  )
}

function SentView({ prospect }) {
  return (
    <div style={{ padding: '12px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{
        width: 84, height: 84, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="brand-whatsapp" size={40} />
      </div>
      <div className="k-display" style={{ fontSize: 24, fontWeight: 700 }}>¡WhatsApp abierto!</div>
      <div style={{ fontSize: 15, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
        El mensaje para <b style={{ color: 'var(--fg)' }}>{prospect?.contact}</b> de <b style={{ color: 'var(--fg)' }}>{prospect?.name}</b> está listo para enviar.
      </div>
    </div>
  )
}

function formatPhone(phone) {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
}
