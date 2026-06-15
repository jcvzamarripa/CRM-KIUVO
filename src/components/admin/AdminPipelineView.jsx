import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useStages } from '../../contexts/StagesContext'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { useSellers } from '../../hooks/useSellers'

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt       = n => '$' + (n || 0).toLocaleString('es-MX')
const HEALTH    = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)', black: 'var(--fg-tertiary)' }
const HEALTH_LABEL = { green: 'Al día', amber: 'En riesgo', red: 'Urgente', black: 'Perdido' }

// ─── Move stage dropdown ──────────────────────────────────────────────────────
function MoveDropdown({ currentStage, onMove, onClose }) {
  const { stages } = useStages()
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 50,
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      padding: 6, minWidth: 170, marginTop: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)', padding: '2px 8px 6px', letterSpacing: 0.5 }}>
        MOVER A ETAPA
      </div>
      {stages.filter(s => s.id !== currentStage).map(s => (
        <button key={s.id} onClick={() => { onMove(s.id); onClose() }} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '7px 8px', borderRadius: 'var(--r-sm)', textAlign: 'left',
          color: 'var(--fg)', fontSize: 12,
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          {s.label}
        </button>
      ))}
    </div>
  )
}

// ─── Prospect card ────────────────────────────────────────────────────────────
function KanbanCard({ p, isSelected, onClick, onMove, sellerByInit }) {
  const { stageById } = useStages()
  const [hovered,    setHovered]    = useState(false)
  const [showMove,   setShowMove]   = useState(false)
  const seller  = sellerByInit?.(p.owner)
  const stage   = stageById[p.stage]
  const hColor  = HEALTH[p.health] || 'var(--fg-tertiary)'
  const visitPct = Math.min(1, p.visits / Math.max(stage?.min || 1, 1))

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        background: isSelected ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
        border: `0.5px solid ${isSelected ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
        borderRadius: 'var(--r-md)', padding: '10px 12px',
        cursor: 'pointer', position: 'relative',
        boxShadow: hovered && !isSelected ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s, background 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Row 1: health + name + value */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 7 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: hColor,
          flexShrink: 0, marginTop: 4,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.contact}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {fmt(p.value)}
        </div>
      </div>

      {/* Visit progress */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          <div style={{
            width: `${visitPct * 100}%`, height: '100%',
            background: visitPct >= 1 ? 'var(--success)' : stage?.color,
            borderRadius: 2, transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--fg-tertiary)' }}>
          <span>{p.visits}/{stage?.min} visitas</span>
          <span>{p.days}d en etapa</span>
        </div>
      </div>

      {/* Row 3: seller + last contact + move btn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Seller avatar */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: (seller?.color || '#888') + '22', color: seller?.color || '#888',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600,
        }}>
          {p.owner}
        </div>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--fg-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.last}
        </div>

        {/* Move button (visible on hover) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowMove(v => !v) }}
            style={{
              width: 22, height: 22, borderRadius: 'var(--r-sm)',
              background: hovered || showMove ? 'var(--bg-secondary)' : 'transparent',
              color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered || showMove ? 1 : 0,
              transition: 'opacity 0.15s, background 0.1s',
            }}
            title="Mover etapa"
          >
            <Icon name="arrows-horizontal" size={12} />
          </button>
          {showMove && (
            <MoveDropdown
              currentStage={p.stage}
              onMove={stageId => onMove(p.id, stageId)}
              onClose={() => setShowMove(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({ stage, cards, selectedId, onSelect, onMove, sellerByInit }) {
  const totalValue = cards.reduce((s, p) => s + p.value, 0)
  const atRisk     = cards.filter(p => p.health !== 'green').length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minWidth: 220, flex: 1,
      borderRight: '0.5px solid var(--border)',
    }}>
      {/* Column header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '0.5px solid var(--border)',
        borderTop: `3px solid ${stage.color}`,
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{stage.label}</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
            background: stage.color + '20', color: stage.color,
          }}>{cards.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-secondary)' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalValue)}</span>
          {atRisk > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--warning)', fontWeight: 500 }}>
              <Icon name="alert-triangle" size={10} color="var(--warning)" />
              {atRisk} en riesgo
            </span>
          )}
        </div>
        {/* Min visits note */}
        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 4 }}>
          Mín. {stage.min} visita{stage.min > 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {cards.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8, color: 'var(--fg-tertiary)', padding: '24px 0',
            border: '0.5px dashed var(--border)', borderRadius: 'var(--r-md)',
          }}>
            <Icon name="layout-kanban" size={20} color="var(--border)" />
            <span style={{ fontSize: 11 }}>Sin prospectos</span>
          </div>
        ) : cards.map(p => (
          <KanbanCard
            key={p.id}
            p={p}
            isSelected={selectedId === p.id}
            onClick={() => onSelect(p)}
            onMove={onMove}
            sellerByInit={sellerByInit}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ p, onClose, onMove, sellerByInit }) {
  const { stages, stageById } = useStages()
  const stage  = stageById[p.stage]
  const seller = sellerByInit?.(p.owner)
  const hColor = HEALTH[p.health]
  const visitPct = Math.min(1, p.visits / Math.max(stage?.min || 1, 1))

  return (
    <div style={{
      width: 300, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.15s ease-out',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 500,
          background: stage?.color + '20', color: stage?.color,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage?.color }} />
          {stage?.label}
        </span>
        <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Name & contact */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: hColor, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{p.name}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', paddingLeft: 15 }}>{p.contact}</div>
        </div>

        {/* Value highlight */}
        <div style={{
          padding: '12px 14px', marginBottom: 16,
          background: 'var(--bg)', borderRadius: 'var(--r-md)',
          border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Valor estimado</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(p.value)}
          </div>
        </div>

        {/* Visits */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--fg-secondary)' }}>Visitas realizadas</span>
            <span style={{ fontWeight: 500, color: visitPct >= 1 ? 'var(--success)' : 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
              {p.visits} / {stage?.min} mín.
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${visitPct * 100}%`, height: '100%', background: visitPct >= 1 ? 'var(--success)' : stage?.color, borderRadius: 3 }} />
          </div>
          {visitPct >= 1 && (
            <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 4, fontWeight: 500 }}>✓ Listo para avanzar</div>
          )}
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Teléfono',        value: p.phone,    icon: 'phone' },
            { label: 'Último contacto', value: p.last,     icon: 'clock' },
            { label: 'Días en etapa',   value: `${p.days} días`, icon: 'calendar' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--r-md)', flexShrink: 0,
                background: 'var(--bg)', border: '0.5px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={row.icon} size={13} color="var(--fg-secondary)" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{row.label}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginTop: 1 }}>{row.value || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Seller */}
        <div style={{
          padding: '10px 12px', background: 'var(--bg)',
          borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: (seller?.color || '#888') + '22', color: seller?.color || '#888',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
          }}>
            {p.owner}
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>Vendedor asignado</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{seller?.name || p.owner}</div>
          </div>
        </div>

        {/* Health badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 'var(--r-full)',
          background: hColor + '18', color: hColor, marginBottom: 16,
          fontSize: 11, fontWeight: 500,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: hColor }} />
          {HEALTH_LABEL[p.health] || 'Al día'}
        </div>

        {/* Move stage */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 8 }}>Cambiar etapa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stages.filter(s => s.id !== p.stage).map(s => (
              <button key={s.id} onClick={() => { onMove(p.id, s.id); onClose() }} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 'var(--r-md)', textAlign: 'left',
                border: '0.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--fg)', fontSize: 12, transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = s.color + '12'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ flex: 1 }}>Mover a {s.label}</span>
                <Icon name="arrow-right" size={12} color="var(--fg-tertiary)" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 8 }}>
        <a
          href={`https://wa.me/52${(p.phone || '').replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
            background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            textDecoration: 'none',
          }}
        >
          <Icon name="brand-whatsapp" size={13} color="#fff" />
          WhatsApp
        </a>
        <a
          href={`tel:${p.phone}`}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--fg)', fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            textDecoration: 'none',
          }}
        >
          <Icon name="phone" size={13} />
          Llamar
        </a>
      </div>
    </div>
  )
}

// ─── Stage Config Panel ───────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#185FA5','#378ADD','#1D9E75','#EF9F27','#D85A30',
  '#888780','#7C5CBF','#E05A8A','#2BB5A0','#C0392B',
]

function StageConfigPanel({ stages: initialStages, saving, onSave, onClose }) {
  const [draft, setDraft] = useState(initialStages.map(s => ({ ...s })))

  const setField = (id, key, val) =>
    setDraft(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s))

  return (
    <div style={{
      width: 360, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.15s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Configurar etapas</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>Nombre · color · visitas mínimas</div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Stage rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {draft.map(s => (
          <div key={s.id} style={{
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--r-md)', padding: '14px', borderTop: `3px solid ${s.color}`,
          }}>
            {/* Label input */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)', marginBottom: 5, letterSpacing: 0.3 }}>
                NOMBRE DE ETAPA
              </div>
              <input
                value={s.label}
                onChange={e => setField(s.id, 'label', e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', fontSize: 13,
                  background: 'var(--surface)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--r-md)', color: 'var(--fg)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)', marginBottom: 5, letterSpacing: 0.3 }}>
                COLOR
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setField(s.id, 'color', c)}
                    title={c}
                    style={{
                      width: 22, height: 22, borderRadius: 6, background: c, flexShrink: 0,
                      border: s.color === c ? '2.5px solid var(--fg)' : '2px solid transparent',
                      outline: s.color === c ? `2px solid ${c}40` : 'none',
                      transition: 'border-color 0.12s',
                    }}
                  />
                ))}
                {/* Custom color input */}
                <div style={{ position: 'relative', marginLeft: 2 }}>
                  <input
                    type="color"
                    value={s.color}
                    onChange={e => setField(s.id, 'color', e.target.value)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <div title="Color personalizado" style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: `conic-gradient(#f43,#0cf,#3f0,#f43)`,
                    border: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="pencil" size={10} color="#fff" />
                  </div>
                </div>
              </div>
            </div>

            {/* Min visits */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)', marginBottom: 5, letterSpacing: 0.3 }}>
                VISITAS MÍNIMAS REQUERIDAS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setField(s.id, 'min', Math.max(1, s.min - 1))}
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--r-md)',
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="minus" size={13} />
                </button>
                <span style={{
                  minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 600,
                  color: s.color, fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.min}
                </span>
                <button
                  onClick={() => setField(s.id, 'min', Math.min(10, s.min + 1))}
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--r-md)',
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="plus" size={13} />
                </button>
                <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                  visita{s.min !== 1 ? 's' : ''} antes de avanzar
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px', borderTop: '0.5px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
            border: '0.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--fg)', fontSize: 13, fontWeight: 500,
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={saving}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 'var(--r-md)',
            background: 'var(--kiuvo-blue)', color: '#fff',
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Icon name="check" size={15} color="#fff" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function AdminPipelineView() {
  const { stages, stageById, saveAllStages, saving } = useStages()
  const { prospects, reload } = useAdminProspects()
  const { sellers: sellerList } = useSellers()
  const [sellerFilter,   setSellerFilter]   = useState('all')
  const [healthFilter,   setHealthFilter]   = useState('all')
  const [selected,       setSelected]       = useState(null)
  const [showStageConf,  setShowStageConf]  = useState(false)

  const sellerByInit = init => sellerList.find(s => s.init === init)
  const sellers    = [...new Set(prospects.map(p => p.owner))]
  const atRisk     = prospects.filter(p => p.health !== 'green').length

  const filtered = prospects.filter(p => {
    const okSeller = sellerFilter === 'all' || p.owner === sellerFilter
    const okHealth = healthFilter === 'all' || p.health === healthFilter
    return okSeller && okHealth
  })

  function handleMove(prospectId, newStageId) {
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, stage: newStageId } : p))
    if (selected?.id === prospectId) setSelected(prev => ({ ...prev, stage: newStageId }))
  }

  function handleSelect(p) {
    setSelected(prev => prev?.id === p.id ? null : p)
    setShowStageConf(false)
  }

  function handleSaveStages(draft) {
    saveAllStages(draft)
    setShowStageConf(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', minWidth: 0, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
      }}>
        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 8, marginRight: 4 }}>
          <div style={{
            padding: '5px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--r-full)', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="users" size={13} color="var(--fg-secondary)" />
            <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{filtered.length}</span>
            <span style={{ color: 'var(--fg-tertiary)' }}>prospectos</span>
          </div>
          <div style={{
            padding: '5px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--r-full)', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="target" size={13} color="var(--fg-secondary)" />
            <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{fmt(filtered.filter(p => p.stage !== 'cierre').reduce((s, p) => s + p.value, 0))}</span>
            <span style={{ color: 'var(--fg-tertiary)' }}>potencial</span>
          </div>
          {atRisk > 0 && (
            <div style={{
              padding: '5px 12px', background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)',
              borderRadius: 'var(--r-full)', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 5,
              color: 'var(--warning-fg)',
            }}>
              <Icon name="alert-triangle" size={12} color="var(--warning-fg)" />
              <span style={{ fontWeight: 500 }}>{atRisk} en riesgo</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Stage config button */}
        <button
          onClick={() => { setShowStageConf(v => !v); setSelected(null) }}
          title="Configurar etapas del embudo"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
            background: showStageConf ? 'var(--kiuvo-blue)' : 'var(--surface)',
            color: showStageConf ? '#fff' : 'var(--fg-secondary)',
            border: `0.5px solid ${showStageConf ? 'transparent' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }}
        >
          <Icon name="settings" size={14} color={showStageConf ? '#fff' : 'var(--fg-secondary)'} />
          Configurar etapas
        </button>

        {/* Health filter */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2 }}>
          {[['all', 'Todos'], ['green', 'Al día'], ['amber', 'Riesgo'], ['red', 'Urgente']].map(([k, l]) => (
            <button key={k} onClick={() => setHealthFilter(k)} style={{
              padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11,
              background: healthFilter === k ? 'var(--bg)' : 'transparent',
              color: healthFilter === k ? 'var(--fg)' : 'var(--fg-secondary)',
              fontWeight: healthFilter === k ? 500 : 400,
              border: healthFilter === k ? '0.5px solid var(--border)' : 'none',
            }}>{l}</button>
          ))}
        </div>

        {/* Seller filter */}
        <select
          value={sellerFilter}
          onChange={e => setSellerFilter(e.target.value)}
          style={{
            padding: '6px 10px', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
            fontSize: 12, color: 'var(--fg)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Todos los vendedores</option>
          {sellers.map(s => {
            const seller = sellerByInit(s)
            return <option key={s} value={s}>{seller?.name || s}</option>
          })}
        </select>
      </div>

      {/* ── Kanban board ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Columns — overflowX: auto lets them scroll when a side panel narrows the area */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}>
          {stages.map(stage => {
            const cards = filtered.filter(p => p.stage === stage.id)
              .sort((a, b) => b.value - a.value)
            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={cards}
                selectedId={selected?.id}
                onSelect={handleSelect}
                onMove={handleMove}
                sellerByInit={sellerByInit}
              />
            )
          })}
        </div>

        {/* Right panel: stage config takes priority */}
        {showStageConf ? (
          <StageConfigPanel
            stages={stages}
            saving={saving}
            onSave={handleSaveStages}
            onClose={() => setShowStageConf(false)}
          />
        ) : selected ? (
          <DetailPanel
            p={selected}
            onClose={() => setSelected(null)}
            onMove={handleMove}
            sellerByInit={sellerByInit}
          />
        ) : null}
      </div>
    </div>
  )
}
