import React, { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { Button, IconButton, Card, Pill, Segmented, Avatar, ProgressBar } from '../ui'
import { useStages } from '../../contexts/StagesContext'
import { SYSTEM_STAGE_IDS } from '../../constants/stages'
import { useAdminProspects } from '../../hooks/useAdminProspects'
import { supabase } from '../../lib/supabase'
import { useSellers } from '../../hooks/useSellers'

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt       = n => '$' + (n || 0).toLocaleString('es-MX')
const HEALTH_LABEL = { green: 'Al día', amber: 'En riesgo', red: 'Urgente', black: 'Perdido' }

const HEALTH_TONE = { green: 'success', amber: 'warning', red: 'coral', black: undefined }

const LAYOUT_CSS = `
  @keyframes pvSlideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
  .pv-toolbar { padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; flex-shrink: 0; }
  .pv-board { flex: 1; display: flex; gap: 12px; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 0 20px 20px; }
  .pv-col { display: flex; flex-direction: column; flex: 1 0 260px; min-width: 260px; max-width: 360px; background: var(--bg-tertiary); border-radius: var(--r-lg); overflow: hidden; }
  .pv-card { background: var(--surface); border-radius: var(--r-md); padding: 12px 14px; cursor: pointer; position: relative; user-select: none; transition: box-shadow 0.15s; }
  .pv-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.10); }
  .pv-card[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--fg); }
  .pv-menu-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 36px; padding: 0 10px; border-radius: var(--r-sm); text-align: left; font-size: 14px; color: var(--fg); }
  .pv-menu-item:hover { background: var(--bg-secondary); }
  .pv-panel { width: 360px; flex-shrink: 0; margin: 0 20px 20px 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); border-radius: var(--r-xl); animation: pvSlideIn 0.15s ease-out; }
  .pv-panel--wide { width: 400px; }
  .pv-stage-btn { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; border-radius: var(--r-md); text-align: left; background: var(--bg-secondary); color: var(--fg); font-size: 14px; }
  .pv-stage-btn:hover { background: var(--bg-tertiary); }
  @media (max-width: 900px) {
    .pv-toolbar { padding: 12px; }
    .pv-board { padding: 0 12px 12px; }
    .pv-panel, .pv-panel--wide { position: fixed; z-index: 200; inset: 8px; width: auto; margin: 0; box-shadow: var(--shadow-float); }
  }
`

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
      background: 'var(--surface)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-float)',
      padding: 8, minWidth: 210, marginTop: 4,
    }}>
      <div className="k-label" style={{ padding: '4px 10px 6px', marginBottom: 0 }}>Mover a etapa</div>
      {stages.filter(s => s.id !== currentStage && !s.isRepository).map(s => (
        <button key={s.id} className="pv-menu-item" onClick={() => { onMove(s.id); onClose() }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          {s.label}
        </button>
      ))}
      {currentStage !== 'repositorio' && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 4px' }} />
          <button className="pv-menu-item" style={{ color: 'var(--fg-secondary)' }} onClick={() => { onMove('repositorio'); onClose() }}>
            <Icon name="archive" size={16} />
            Archivar en Repositorio
          </button>
        </>
      )}
      {currentStage === 'repositorio' && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 4px' }} />
          <button className="pv-menu-item" style={{ fontWeight: 600 }} onClick={() => { onMove('prospeccion'); onClose() }}>
            <Icon name="arrow-up-right" size={16} />
            Reactivar prospecto
          </button>
        </>
      )}
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
  const visitPct = Math.min(1, p.visits / Math.max(stage?.min || 1, 1))

  return (
    <div
      className="pv-card"
      aria-pressed={isSelected}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      {/* Row 1: name + value */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div className="k-dim" style={{ fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.contact}
          </div>
        </div>
        <div className="k-num" style={{ fontSize: 15, flexShrink: 0, paddingTop: 2 }}>
          {fmt(p.value)}
        </div>
      </div>

      {p.health !== 'green' && (
        <div style={{ marginBottom: 8 }}>
          <Pill tone={HEALTH_TONE[p.health]} icon={p.health === 'black' ? 'archive' : 'alert-triangle'}>
            {HEALTH_LABEL[p.health] || 'En riesgo'}
          </Pill>
        </div>
      )}

      {/* Visit progress */}
      <div style={{ marginBottom: 10 }}>
        <ProgressBar value={visitPct} max={1} height={5} color={visitPct >= 1 ? 'var(--success)' : stage?.color} />
        <div className="k-dim" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
          <span>{p.visits}/{stage?.min} visitas</span>
          <span>{p.days}d en etapa</span>
        </div>
      </div>

      {/* Row 3: seller + last contact + move btn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar size="sm" initials={p.owner} color={seller?.color} style={{ width: 24, height: 24, fontSize: 10 }} />
        <div className="k-dim" style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.last}
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowMove(v => !v) }}
            aria-label="Mover etapa"
            title="Mover etapa"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: hovered || showMove ? 'var(--bg-secondary)' : 'transparent',
              color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
          >
            <Icon name="arrows-horizontal" size={16} />
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
    <div className="pv-col">
      {/* Column header */}
      <div style={{ padding: '14px 14px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
          <span className="k-h3" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.label}</span>
          <Pill style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{cards.length}</Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="k-num" style={{ fontSize: 16 }}>{fmt(totalValue)}</span>
          {atRisk > 0 && <Pill tone="warning" icon="alert-triangle">{atRisk} en riesgo</Pill>}
        </div>
        <div className="k-dim" style={{ fontSize: 12, marginTop: 6 }}>
          Mín. {stage.min} visita{stage.min > 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.length === 0 ? (
          <div className="k-dim" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '28px 0', fontSize: 13,
          }}>
            <Icon name="layout-kanban" size={22} />
            <span>Sin prospectos</span>
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
  const visitPct = Math.min(1, p.visits / Math.max(stage?.min || 1, 1))

  return (
    <div className="pv-panel">
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Pill>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage?.color }} />
          {stage?.label}
        </Pill>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} style={{ width: 40, height: 40 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {/* Name & contact */}
        <div style={{ marginBottom: 16 }}>
          <div className="k-h2">{p.name}</div>
          <div className="k-muted" style={{ fontSize: 14, marginTop: 2 }}>{p.contact}</div>
          <div style={{ marginTop: 10 }}>
            <Pill tone={HEALTH_TONE[p.health] || 'success'}>{HEALTH_LABEL[p.health] || 'Al día'}</Pill>
          </div>
        </div>

        {/* Value highlight */}
        <Card tone="lilac" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Valor estimado</div>
          <div className="k-num" style={{ fontSize: 26 }}>{fmt(p.value)}</div>
        </Card>

        {/* Visits */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span className="k-muted">Visitas realizadas</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {p.visits} / {stage?.min} mín.
            </span>
          </div>
          <ProgressBar value={visitPct} max={1} color={visitPct >= 1 ? 'var(--success)' : stage?.color} />
          {visitPct >= 1 && (
            <div style={{ marginTop: 8 }}><Pill tone="success" icon="check">Listo para avanzar</Pill></div>
          )}
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {[
            { label: 'Teléfono',        value: p.phone,    icon: 'phone' },
            { label: 'Último contacto', value: p.last,     icon: 'clock' },
            { label: 'Días en etapa',   value: `${p.days} días`, icon: 'calendar' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={row.icon} size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="k-dim" style={{ fontSize: 12 }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{row.value || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Seller */}
        <div style={{
          padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
        }}>
          <Avatar initials={p.owner} color={seller?.color} />
          <div style={{ minWidth: 0 }}>
            <div className="k-dim" style={{ fontSize: 12 }}>Vendedor asignado</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{seller?.name || p.owner}</div>
          </div>
        </div>

        {/* Move stage */}
        <div>
          <div className="k-label">Cambiar etapa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stages.filter(s => s.id !== p.stage).map(s => (
              <button key={s.id} className="pv-stage-btn" onClick={() => { onMove(p.id, s.id); onClose() }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Mover a {s.label}</span>
                <Icon name="arrow-right" size={16} color="var(--fg-tertiary)" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <a
          className="k-btn k-btn--accent"
          href={`https://wa.me/52${(p.phone || '').replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1 }}
        >
          <Icon name="brand-whatsapp" size={18} />
          WhatsApp
        </a>
        <a className="k-btn k-btn--soft" href={`tel:${p.phone}`} style={{ flex: 1 }}>
          <Icon name="phone" size={18} />
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

  function addNewStage() {
    const id = 'custom_' + Date.now()
    const newStage = { id, label: 'Nueva etapa', color: '#7C5CBF', min: 1 }
    setDraft(prev => {
      const withoutRepo = prev.filter(s => s.id !== 'repositorio')
      const repo = prev.find(s => s.id === 'repositorio')
      return repo ? [...withoutRepo, newStage, repo] : [...withoutRepo, newStage]
    })
  }

  function removeStage(id) {
    setDraft(prev => prev.filter(s => s.id !== id))
  }

  const repoStage = draft.find(s => s.id === 'repositorio')
  const regularStages = draft.filter(s => s.id !== 'repositorio')

  function StageCard({ s }) {
    const isSystem = SYSTEM_STAGE_IDS.has(s.id)
    return (
      <div key={s.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', padding: 14 }}>
        {/* Label input + delete */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              <span className="k-field__label">Nombre de etapa</span>
            </div>
            {!isSystem && (
              <button
                onClick={() => removeStage(s.id)}
                aria-label="Eliminar etapa"
                title="Eliminar etapa"
                style={{ color: 'var(--coral-fg)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
          <input
            className="k-input k-input--sm"
            value={s.label}
            onChange={e => setField(s.id, 'label', e.target.value)}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: s.isRepository ? 0 : 12 }}>
          <div className="k-field__label" style={{ marginBottom: 6 }}>Color</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setField(s.id, 'color', c)}
                title={c}
                aria-label={`Color ${c}`}
                aria-pressed={s.color === c}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, flexShrink: 0,
                  boxShadow: s.color === c ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--fg)' : 'none',
                  transition: 'box-shadow 0.12s',
                }}
              />
            ))}
            <div style={{ position: 'relative' }}>
              <input
                type="color"
                value={s.color}
                onChange={e => setField(s.id, 'color', e.target.value)}
                style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
              <div title="Color personalizado" style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--surface)', color: 'var(--fg-secondary)',
                boxShadow: 'inset 0 0 0 1.5px var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="pencil" size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* Min visits — hidden for repositorio */}
        {!s.isRepository && (
          <div>
            <div className="k-field__label" style={{ marginBottom: 6 }}>Visitas mínimas requeridas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconButton icon="minus" label="Menos" iconSize={16} style={{ width: 36, height: 36 }}
                onClick={() => setField(s.id, 'min', Math.max(1, s.min - 1))} />
              <span className="k-num" style={{ minWidth: 28, textAlign: 'center', fontSize: 20 }}>
                {s.min}
              </span>
              <IconButton icon="plus" label="Más" iconSize={16} style={{ width: 36, height: 36 }}
                onClick={() => setField(s.id, 'min', Math.min(10, s.min + 1))} />
              <span className="k-dim" style={{ fontSize: 13 }}>
                visita{s.min !== 1 ? 's' : ''} antes de avanzar
              </span>
            </div>
          </div>
        )}

        {/* Repositorio description */}
        {s.isRepository && (
          <div className="k-dim" style={{ fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="archive" size={15} />
            Etapa de archivo — los prospectos perdidos o vencidos caen aquí
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pv-panel pv-panel--wide">
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div className="k-h2">Configurar etapas</div>
          <div className="k-dim" style={{ fontSize: 13, marginTop: 2 }}>Nombre · color · visitas mínimas</div>
        </div>
        <IconButton icon="x" label="Cerrar" variant="soft" onClick={onClose} style={{ width: 40, height: 40 }} />
      </div>

      {/* Stage rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {regularStages.map(s => <StageCard key={s.id} s={s} />)}

        <Button variant="outline" block icon="plus" onClick={addNewStage}>Nueva etapa</Button>

        {/* Repositorio — always last, special */}
        {repoStage && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 2px' }} />
            <div className="k-label" style={{ marginBottom: 0 }}>Etapa de archivo</div>
            <StageCard s={repoStage} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button variant="soft" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
        <Button icon="check" loading={saving} onClick={() => onSave(draft)} style={{ flex: 2 }}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function AdminPipelineView() {
  const { stages, stageById, saveAllStages, deleteStage, saving } = useStages()
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

  async function handleMove(prospectId, newStageId) {
    if (selected?.id === prospectId) setSelected(prev => ({ ...prev, stage: newStageId }))
    if (!supabase) return
    const { error } = await supabase.from('prospects')
      .update({ stage_id: newStageId, stage_entered_at: new Date().toISOString() })
      .eq('id', prospectId)
    if (error) console.warn('[AdminPipeline] mover etapa:', error.message)
    reload()
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', minWidth: 0, overflow: 'hidden', background: 'var(--bg)' }}>
      <style>{LAYOUT_CSS}</style>

      {/* ── Toolbar ── */}
      <div className="pv-toolbar">
        {/* Summary chips */}
        <Pill icon="users" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{filtered.length} prospectos</Pill>
        <Pill icon="target" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
          {fmt(filtered.filter(p => p.stage !== 'cierre' && p.stage !== 'repositorio').reduce((s, p) => s + p.value, 0))} potencial
        </Pill>
        {atRisk > 0 && <Pill tone="warning" icon="alert-triangle">{atRisk} en riesgo</Pill>}

        <div style={{ flex: 1 }} />

        {/* Health filter */}
        <Segmented
          surface
          value={healthFilter}
          onChange={setHealthFilter}
          options={[['all', 'Todos'], ['green', 'Al día'], ['amber', 'Riesgo'], ['red', 'Urgente']].map(([id, label]) => ({ id, label }))}
        />

        {/* Seller filter */}
        <select
          className="k-input k-input--sm k-input--pill"
          value={sellerFilter}
          onChange={e => setSellerFilter(e.target.value)}
          style={{ width: 'auto', maxWidth: '100%' }}
        >
          <option value="all">Todos los vendedores</option>
          {sellers.map(s => {
            const seller = sellerByInit(s)
            return <option key={s} value={s}>{seller?.name || s}</option>
          })}
        </select>

        {/* Stage config button */}
        <Button
          size="sm"
          variant={showStageConf ? 'primary' : 'soft'}
          icon="settings"
          aria-pressed={showStageConf}
          title="Configurar etapas del embudo"
          onClick={() => { setShowStageConf(v => !v); setSelected(null) }}
          style={showStageConf ? undefined : { background: 'var(--surface)' }}
        >
          Configurar etapas
        </Button>
      </div>

      {/* ── Kanban board ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Columns — overflowX: auto lets them scroll when a side panel narrows the area */}
        <div className="pv-board">
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
