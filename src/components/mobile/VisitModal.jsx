import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { MOCK_PROSPECTS } from '../../constants/mockData'
import { STAGE_BY_ID } from '../../constants/stages'

const ACTIVITY_TYPES = [
  { id: 'visit',    label: 'Visita',    icon: 'map-pin' },
  { id: 'call',     label: 'Llamada',   icon: 'phone' },
  { id: 'whatsapp', label: 'WhatsApp',  icon: 'brand-whatsapp' },
  { id: 'email',    label: 'Email',     icon: 'mail' },
]

export default function VisitModal({ onClose }) {
  const [step, setStep] = useState('form')
  const [selected, setSelected] = useState(null)
  const [actType, setActType] = useState('visit')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')

  const prospects = MOCK_PROSPECTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = () => {
    if (selected === null) return
    setStep('success')
    setTimeout(onClose, 1800)
  }

  const selectedProspect = MOCK_PROSPECTS.find(p => p.id === selected)
  const selectedAct = ACTIVITY_TYPES.find(a => a.id === actType)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '90%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {step === 'success' ? (
          <SuccessView prospect={selectedProspect} act={selectedAct} />
        ) : (
          <FormView
            search={search} setSearch={setSearch}
            prospects={prospects}
            selected={selected} setSelected={setSelected}
            actType={actType} setActType={setActType}
            note={note} setNote={setNote}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </>
  )
}

function SuccessView({ prospect, act }) {
  return (
    <div style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--success-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="check" size={32} color="var(--success)" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>
        ¡Actividad registrada!
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        <b style={{ color: 'var(--fg)' }}>{act?.label}</b> con <b style={{ color: 'var(--fg)' }}>{prospect?.name}</b> guardada correctamente.
      </div>
    </div>
  )
}

function FormView({ search, setSearch, prospects, selected, setSelected, actType, setActType, note, setNote, onClose, onSubmit }) {
  const canSubmit = selected !== null

  return (
    <>
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Registrar actividad</div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--bg-secondary)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-secondary)',
          }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>

        {/* Activity type */}
        <Section label="TIPO DE ACTIVIDAD">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ACTIVITY_TYPES.map(a => {
              const on = actType === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => setActType(a.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 4px', borderRadius: 'var(--r-md)',
                    border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                    background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                    color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg-secondary)',
                  }}
                >
                  <Icon name={a.icon} size={19} />
                  <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.2, textAlign: 'center' }}>{a.label}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Prospect picker */}
        <Section label="PROSPECTO">
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Icon
              name="search" size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar prospecto…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 10px 9px 30px',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 210, overflowY: 'auto' }}>
            {prospects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fg-tertiary)', fontSize: 13 }}>
                Sin resultados
              </div>
            ) : prospects.map(p => {
              const stage = STAGE_BY_ID[p.stage]
              const on = selected === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                    background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: on ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)' }}>
                      {stage.label} · {p.visits} visita{p.visits !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {on && <Icon name="check" size={15} color="var(--kiuvo-blue)" />}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Note */}
        <Section label="NOTA (OPCIONAL)">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="¿Cómo fue? Agrega un comentario…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
              outline: 'none', resize: 'none', fontFamily: 'inherit',
            }}
          />
        </Section>

        <div style={{ height: 8 }} />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px',
            background: canSubmit ? 'var(--kiuvo-blue)' : 'var(--bg-tertiary)',
            color: canSubmit ? '#fff' : 'var(--fg-tertiary)',
            borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          Registrar
        </button>
      </div>
    </>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
