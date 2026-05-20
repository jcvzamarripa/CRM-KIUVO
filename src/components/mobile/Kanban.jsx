import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { MOCK_PROSPECTS } from '../../constants/mockData'

const fmt = n => '$' + n.toLocaleString('es-MX')
const healthColor = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }

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
          <button style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="brand-whatsapp" size={13} />
          </button>
          <button style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Kanban() {
  const [activeStage, setActiveStage] = useState('presentacion')
  const list = MOCK_PROSPECTS.filter(p => p.stage === activeStage)
  const stage = STAGE_BY_ID[activeStage]
  const counts = Object.fromEntries(STAGES.map(s => [s.id, MOCK_PROSPECTS.filter(p => p.stage === s.id).length]))
  const totalValue = list.reduce((s, p) => s + p.value, 0)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 92, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.015 }}>Mi embudo</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>34 prospectos · $312,400 potencial</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search" size={17} color="var(--fg-secondary)" />
          </button>
          <button style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="adjustments-horizontal" size={17} color="var(--fg-secondary)" />
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
        <button style={{
          padding: '6px 10px', borderRadius: 'var(--r-md)',
          background: stage.color, color: '#fff', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon name="plus" size={13} />
          Añadir
        </button>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <div style={{
            padding: '40px 0', textAlign: 'center', color: 'var(--fg-tertiary)',
            border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--r-lg)',
          }}>
            <Icon name="layout-kanban" size={28} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>Sin prospectos en esta etapa</div>
          </div>
        ) : (
          list.map(p => <ProspectCard key={p.id} p={p} />)
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center', color: 'var(--fg-tertiary)' }}>
        <Icon name="arrows-horizontal" size={12} />
        <span style={{ fontSize: 11 }}>Desliza pills para cambiar etapa</span>
      </div>
    </div>
  )
}
