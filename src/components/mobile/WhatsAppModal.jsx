import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { MOCK_PROSPECTS } from '../../constants/mockData'
import { STAGE_BY_ID } from '../../constants/stages'

// ── Inline SVGs ───────────────────────────────────────────────────
function IcoWhatsApp({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  )
}

function IcoSearch({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

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

// ── Main ──────────────────────────────────────────────────────────
export default function WhatsAppModal({ onClose }) {
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(null)   // prospect id
  const [templateId, setTemplateId] = useState('followup')
  const [message, setMessage]       = useState('')
  const [sent, setSent]             = useState(false)

  const prospect  = MOCK_PROSPECTS.find(p => p.id === selected)
  const stage     = prospect ? STAGE_BY_ID[prospect.stage] : null
  const template  = TEMPLATES.find(t => t.id === templateId)

  const filtered = MOCK_PROSPECTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact.toLowerCase().includes(search.toLowerCase())
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

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {sent ? (
          <SentView prospect={prospect} />
        ) : (
          <>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IcoWhatsApp size={18} color="#0F6E56" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>WhatsApp</div>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)',
              }}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>

              {/* Prospect picker */}
              <Section label="DESTINATARIO">
                {prospect ? (
                  /* Selected prospect chip */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#E1F5EE', border: '0.5px solid #A7D9C8', borderRadius: 'var(--r-md)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage?.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F3D2E' }}>{prospect.name}</div>
                      <div style={{ fontSize: 11, color: '#1D6B4F' }}>{prospect.contact} · {formatPhone(prospect.phone)}</div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ fontSize: 11, fontWeight: 500, color: '#0F6E56', padding: '4px 8px', borderRadius: 'var(--r-full)', background: 'rgba(15,110,86,0.12)' }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <IcoSearch size={14} color="var(--fg-tertiary)" />
                      </span>
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar prospecto o contacto…"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '9px 10px 9px 30px',
                          background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                          borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {filtered.map(p => {
                        const s = STAGE_BY_ID[p.stage]
                        return (
                          <button key={p.id} onClick={() => selectProspect(p)} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            border: '0.5px solid var(--border)', background: 'var(--surface)',
                            borderRadius: 'var(--r-md)', textAlign: 'left',
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{p.contact} · {formatPhone(p.phone)}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </Section>

              {/* Template pills */}
              <Section label="PLANTILLA">
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {TEMPLATES.map(t => {
                    const on = templateId === t.id
                    return (
                      <button key={t.id} onClick={() => selectTemplate(t)} style={{
                        flexShrink: 0, padding: '6px 13px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: on ? 500 : 400,
                        border: `0.5px solid ${on ? '#0F6E56' : 'var(--border)'}`,
                        background: on ? '#E1F5EE' : 'var(--surface)',
                        color: on ? '#0F3D2E' : 'var(--fg)',
                      }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* Message */}
              <Section label="MENSAJE">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={prospect ? 'Selecciona una plantilla o escribe tu mensaje…' : 'Primero elige un prospecto…'}
                  rows={7}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px 12px',
                    background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                    outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.55,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 4, textAlign: 'right' }}>
                  {message.length} caracteres
                </div>
              </Section>

              <div style={{ height: 8 }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
              {prospect && (
                <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginBottom: 8, textAlign: 'center' }}>
                  Se abrirá WhatsApp con {prospect.contact} ({formatPhone(prospect.phone)})
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  width: '100%', padding: '14px',
                  background: canSend ? '#1FAF38' : 'var(--bg-tertiary)',
                  color: canSend ? '#fff' : 'var(--fg-tertiary)',
                  borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: canSend ? 1 : 0.6,
                }}
              >
                <IcoWhatsApp size={18} color={canSend ? '#fff' : 'var(--fg-tertiary)'} />
                Abrir en WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function SentView({ prospect }) {
  return (
    <div style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IcoWhatsApp size={30} color="#0F6E56" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>¡WhatsApp abierto!</div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        El mensaje para <b style={{ color: 'var(--fg)' }}>{prospect?.contact}</b> de <b style={{ color: 'var(--fg)' }}>{prospect?.name}</b> está listo para enviar.
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

function formatPhone(phone) {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
}
