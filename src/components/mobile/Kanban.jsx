import React, { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { MOCK_PROSPECTS } from '../../constants/mockData'
import QuoteModal from './QuoteModal'

const fmt = n => '$' + n.toLocaleString('es-MX')
const healthColor = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }

// ─── AddProspectModal ─────────────────────────────────────────────────────────

function AddProspectModal({ stage, onClose, onSave }) {
  const [name,    setName]    = useState('')
  const [contact, setContact] = useState('')
  const [phone,   setPhone]   = useState('')
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState('')

  function handleSave() {
    if (!name.trim()) { setError('El nombre de la empresa es obligatorio'); return }
    onSave({
      id:      Date.now(),
      name:    name.trim(),
      contact: contact.trim() || '—',
      phone:   phone.trim(),
      value:   parseInt(value.replace(/\D/g, ''), 10) || 0,
      visits:  0,
      stage:   stage.id,
      days:    0,
      last:    'Nuevo prospecto',
      health:  'green',
      owner:   'LR',
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)',
    border: '0.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--fg)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg)', borderRadius: '16px 16px 0 0',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--r-md)', flexShrink: 0,
            background: stage.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="user-plus" size={17} color={stage.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Nuevo prospecto</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 1 }}>
              Etapa: <span style={{ color: stage.color, fontWeight: 500 }}>{stage.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--border)', margin: '14px 0 0' }} />

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Empresa */}
          <div>
            <label style={labelStyle}>Empresa *</label>
            <input
              value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Nombre de la empresa"
              style={{ ...inputStyle, borderColor: error ? 'var(--danger)' : 'var(--border)' }}
            />
            {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
          </div>

          {/* Contacto */}
          <div>
            <label style={labelStyle}>Persona de contacto</label>
            <input
              value={contact} onChange={e => setContact(e.target.value)}
              placeholder="Nombre del responsable"
              style={inputStyle}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="10 dígitos"
              type="tel" inputMode="numeric"
              style={inputStyle}
            />
          </div>

          {/* Valor */}
          <div>
            <label style={labelStyle}>Valor estimado ($)</label>
            <input
              value={value} onChange={e => setValue(e.target.value)}
              placeholder="0"
              type="text" inputMode="numeric"
              style={inputStyle}
            />
          </div>

          {/* Stage pill (read-only info) */}
          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r-md)',
            background: stage.color + '12', border: `0.5px solid ${stage.color}30`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
              Se añadirá a <b style={{ color: stage.color }}>{stage.label}</b> con 0 visitas registradas.
              Mínimo requerido: {stage.min} visita{stage.min > 1 ? 's' : ''}.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 16px 28px', display: 'flex', gap: 10, borderTop: '0.5px solid var(--border)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--fg)', fontSize: 14, fontWeight: 500,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '12px 0', borderRadius: 'var(--r-md)',
            background: stage.color, color: '#fff',
            fontSize: 14, fontWeight: 500,
            opacity: !name.trim() ? 0.5 : 1,
          }}>
            Guardar prospecto
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProspectCard ─────────────────────────────────────────────────────────────

function ProspectCard({ p }) {
  const stage = STAGE_BY_ID[p.stage]
  const visitPct = Math.min(1, p.visits / Math.max(stage.min, 1))
  const hc = healthColor[p.health] || 'var(--fg-tertiary)'

  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: hc, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(p.value)}</div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-secondary)' }}>
            <Icon name="map-pin" size={11} />
            <span><b style={{ fontWeight: 500, color: 'var(--fg)' }}>{p.visits}</b>/{stage.min} visitas</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.days} días en etapa</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          <div style={{ width: `${visitPct * 100}%`, height: '100%', background: stage.color, borderRadius: 2 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.last}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => p.phone && window.open(`https://wa.me/52${p.phone.replace(/\D/g,'')}`, '_blank')}
            style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="brand-whatsapp" size={13} />
          </button>
          <button
            onClick={() => p.phone && (window.location.href = `tel:${p.phone}`)}
            style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

export default function Kanban({ jumpTo, onOpenNotifications }) {
  const [activeStage, setActiveStage] = useState('presentacion')
  const [prospects,   setProspects]   = useState(MOCK_PROSPECTS)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showQuote,   setShowQuote]   = useState(false)
  const [sortMode,    setSortMode]    = useState('value') // 'value' | 'risk'

  useEffect(() => {
    if (jumpTo?.stage) setActiveStage(jumpTo.stage)
  }, [jumpTo])

  const stage      = STAGE_BY_ID[activeStage]
  const counts     = Object.fromEntries(STAGES.map(s => [s.id, prospects.filter(p => p.stage === s.id).length]))
  const totalAll   = prospects.length
  const totalPot   = prospects.reduce((s, p) => s + p.value, 0)

  const rawList = prospects.filter(p => p.stage === activeStage)
  const list = [...rawList].sort((a, b) =>
    sortMode === 'value' ? b.value - a.value : b.days - a.days
  )
  const totalValue = rawList.reduce((s, p) => s + p.value, 0)

  function handleAddProspect(newProspect) {
    setProspects(prev => [newProspect, ...prev])
  }

  function handleQuoteGenerated(prospectName, total) {
    setProspects(prev => [{
      id: Date.now(),
      name: prospectName || 'Nuevo cliente',
      contact: '—', phone: '', value: total,
      visits: 0, stage: 'cotizacion', days: 0,
      last: 'Cotización generada', health: 'green', owner: 'LR',
    }, ...prev])
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 92, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.015 }}>Mi embudo</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
            {totalAll} prospectos · {fmt(totalPot)} potencial
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Notificaciones */}
          <button
            onClick={onOpenNotifications}
            title="Notificaciones"
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" size={17} color="var(--fg-secondary)" />
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', border: '1.5px solid var(--surface)' }} />
          </button>
          {/* Ordenar */}
          <button
            onClick={() => setSortMode(m => m === 'value' ? 'risk' : 'value')}
            title={sortMode === 'value' ? 'Ordenado por valor — cambiar a riesgo' : 'Ordenado por riesgo — cambiar a valor'}
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: `0.5px solid ${sortMode === 'risk' ? 'var(--warning)' : 'var(--border)'}`, background: sortMode === 'risk' ? 'var(--warning-bg)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={sortMode === 'risk' ? 'alert-triangle' : 'arrows-sort'} size={17} color={sortMode === 'risk' ? 'var(--warning)' : 'var(--fg-secondary)'} />
          </button>
        </div>
      </div>

      {/* Stage pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
        {STAGES.map(s => {
          const on = s.id === activeStage
          return (
            <button key={s.id} onClick={() => setActiveStage(s.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--r-full)',
              border: '0.5px solid', borderColor: on ? s.color : 'var(--border)',
              background: on ? s.color : 'var(--surface)',
              color: on ? '#fff' : 'var(--fg)',
              fontSize: 12, fontWeight: 500, flexShrink: 0, scrollSnapAlign: 'start',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? '#fff' : s.color }} />
              {s.label}
              <span style={{
                fontSize: 11, fontWeight: 500,
                padding: '0 5px', borderRadius: 'var(--r-full)',
                background: on ? 'rgba(255,255,255,0.22)' : 'var(--bg-secondary)',
                color: on ? '#fff' : 'var(--fg-secondary)',
              }}>{counts[s.id]}</span>
            </button>
          )
        })}
      </div>

      {/* Column summary */}
      <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: stage.color + '14', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: stage.color }}>{stage.label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
            Mínimo {stage.min} visita{stage.min > 1 ? 's' : ''} · {fmt(totalValue)} potencial
          </div>
        </div>
        <button
          onClick={() => activeStage === 'cotizacion' ? setShowQuote(true) : setShowAdd(true)}
          style={{
            padding: '6px 10px', borderRadius: 'var(--r-md)',
            background: stage.color, color: '#fff', fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <Icon name={activeStage === 'cotizacion' ? 'receipt' : 'plus'} size={13} />
          {activeStage === 'cotizacion' ? 'Cotizar' : 'Añadir'}
        </button>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <div style={{
            padding: '40px 0', textAlign: 'center', color: 'var(--fg-tertiary)',
            border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--r-lg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <Icon name="layout-kanban" size={28} />
            <div style={{ fontSize: 13 }}>Sin prospectos en esta etapa</div>
            <button
              onClick={() => activeStage === 'cotizacion' ? setShowQuote(true) : setShowAdd(true)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--r-md)',
                background: stage.color, color: '#fff', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
              }}>
              <Icon name={activeStage === 'cotizacion' ? 'receipt' : 'plus'} size={13} />
              {activeStage === 'cotizacion' ? 'Nueva cotización' : 'Añadir el primero'}
            </button>
          </div>
        ) : (
          list.map(p => <ProspectCard key={p.id} p={p} />)
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center', color: 'var(--fg-tertiary)' }}>
        <Icon name="arrows-horizontal" size={12} />
        <span style={{ fontSize: 11 }}>Desliza pills para cambiar etapa</span>
      </div>

      {/* Add Prospect Modal */}
      {showAdd && (
        <AddProspectModal
          stage={stage}
          onClose={() => setShowAdd(false)}
          onSave={handleAddProspect}
        />
      )}

      {/* Quote Modal (cotización stage) */}
      {showQuote && (
        <QuoteModal
          onClose={() => setShowQuote(false)}
          onGenerated={handleQuoteGenerated}
        />
      )}
    </div>
  )
}
