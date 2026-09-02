import React, { useState, useMemo } from 'react'
import Icon from '../shared/Icon'
import { SCHOOL_DEFAULTS, calcSchoolPackage, buildSchoolItems } from '../../lib/schoolPackage'

const fmt  = n => '$' + Math.round(n).toLocaleString('es-MX')
const fmt2 = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SchoolPackageModal({ onClose, onAdd }) {
  const [students, setStudents]   = useState('')
  const [withEquip, setWithEquip] = useState(true)
  const [mode, setMode]           = useState('itemized')  // itemized | blended
  const [showParams, setShowParams] = useState(false)
  const [params, setParams]       = useState(SCHOOL_DEFAULTS)

  const n = parseInt(students, 10) || 0
  const calc = useMemo(
    () => calcSchoolPackage({ students: n, includeEquipment: withEquip, params }),
    [n, withEquip, params]
  )

  // ── Sugerencias de negociación ───────────────────────────────────
  const tips = useMemo(() => {
    const out = []
    if (n <= 0) return out

    // 1) Está cerca del escalón de volumen y pedir más le sale más barato
    if (!calc.inTier) {
      const gap = params.credentialTierQty - n
      if (gap > 0 && gap <= params.credentialTierQty * 0.2) {
        const atTier = calcSchoolPackage({ students: params.credentialTierQty, includeEquipment: withEquip, params })
        if (atTier.total <= calc.total) {
          out.push({
            kind: 'win',
            text: `Con ${params.credentialTierQty} credenciales (${gap} más) el total baja a ${fmt(atTier.total)} — le sale más barato pedir más.`,
          })
        } else {
          out.push({
            kind: 'info',
            text: `Faltan ${gap} credenciales para el escalón de ${fmt(params.credentialTierPrice)} c/u.`,
          })
        }
      }
    }

    // 2) Acaba de cruzar a un kit nuevo por pocos alumnos
    if (withEquip && calc.kitsNeeded > 1) {
      const prevMax = (calc.kitsNeeded - 1) * params.studentsPerKit
      const excess  = n - prevMax
      if (excess > 0 && excess <= params.studentsPerKit * 0.15) {
        out.push({
          kind: 'warn',
          text: `Por ${excess} alumno${excess > 1 ? 's' : ''} entra un kit extra (${fmt(params.kitCost)}). Con ${prevMax} alumnos usaría ${calc.kitsNeeded - 1} kit${calc.kitsNeeded - 1 > 1 ? 's' : ''}.`,
        })
      }
    }
    return out
  }, [n, calc, withEquip, params])

  function handleAdd() {
    if (n <= 0) return
    onAdd(buildSchoolItems(calc, withEquip ? mode : (mode === 'blended' ? 'blended' : 'itemized')))
    onClose()
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'inherit',
  }
  const numStyle = { ...inputStyle, padding: '7px 9px', fontSize: 13 }

  function ParamField({ label, k, suffix }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number" min="0" value={params[k]}
            onChange={e => setParams(p => ({ ...p, [k]: Number(e.target.value) || 0 }))}
            style={numStyle}
          />
          {suffix && <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', flexShrink: 0 }}>{suffix}</span>}
        </div>
      </div>
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 110 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 111,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--fg)' }}>Paquete escolar</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
              Credenciales + software {withEquip ? '+ equipo' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)',
          }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Alumnos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.3 }}>
              NÚMERO DE ALUMNOS *
            </label>
            <input
              type="number" min="1" inputMode="numeric"
              value={students}
              onChange={e => setStudents(e.target.value)}
              placeholder="Ej. 450"
              autoFocus
              style={{ ...inputStyle, borderColor: 'var(--kiuvo-blue)', fontSize: 20, fontWeight: 500, padding: '12px' }}
            />
          </div>

          {/* Equipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.3 }}>
              EQUIPO (TABLET + LECTOR)
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[[true, 'Incluir equipo'], [false, 'Sin equipo']].map(([v, label]) => (
                <button key={String(v)} onClick={() => setWithEquip(v)} style={{
                  flex: 1, padding: '9px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
                  border: `0.5px solid ${withEquip === v ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                  background: withEquip === v ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                  color: withEquip === v ? 'var(--kiuvo-blue-deep)' : 'var(--fg-secondary)',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Presentación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.3 }}>
              CÓMO SE PRESENTA A LA ESCUELA
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['itemized', 'Desglosado', 'Cada concepto por separado'],
                ['blended',  'Por alumno', 'Un solo precio unitario'],
              ].map(([m, label, hint]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '9px 8px', borderRadius: 'var(--r-md)',
                  border: `0.5px solid ${mode === m ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                  background: mode === m ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: mode === m ? 'var(--kiuvo-blue-deep)' : 'var(--fg)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 2 }}>{hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          {n > 0 && (
            <div style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', letterSpacing: 0.5 }}>
                DESGLOSE
              </div>

              <Row
                label={<>Credenciales · {n} × {fmt(calc.unitPrice)}
                  {calc.inTier && (
                    <span style={{
                      marginLeft: 5, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                      background: 'var(--success-bg)', color: 'var(--success-fg)',
                    }}>−{calc.discountPct}% volumen</span>
                  )}
                </>}
                value={fmt(calc.credentialsTotal)}
              />
              <Row label={`Software anual · ${n} × ${fmt(params.softwarePerStudent)}`} value={fmt(calc.softwareTotal)} />
              {calc.kitsNeeded > 0 && (
                <Row label={`Kits · ${calc.kitsNeeded} × ${fmt(params.kitCost)}`} value={fmt(calc.equipmentTotal)} />
              )}

              <div style={{ height: 0.5, background: 'var(--border)', margin: '2px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Total (sin IVA)</span>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--kiuvo-blue)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(calc.total)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-secondary)' }}>
                <span>Por alumno</span>
                <span style={{ fontWeight: 500 }}>{fmt2(calc.perStudent)}</span>
              </div>
              {calc.volumeSavings > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--success-fg)', fontWeight: 500 }}>
                  <span>Ahorro por volumen</span>
                  <span>−{fmt(calc.volumeSavings)}</span>
                </div>
              )}
            </div>
          )}

          {/* Sugerencias */}
          {tips.map((t, i) => (
            <div key={i} style={{
              padding: '9px 12px', borderRadius: 'var(--r-md)', fontSize: 12, lineHeight: 1.45,
              display: 'flex', alignItems: 'flex-start', gap: 7,
              background: t.kind === 'win' ? 'var(--success-bg)' : t.kind === 'warn' ? 'var(--warning-bg)' : 'var(--kiuvo-blue-soft)',
              color:      t.kind === 'win' ? 'var(--success-fg)' : t.kind === 'warn' ? 'var(--warning-fg)' : 'var(--kiuvo-blue-deep)',
            }}>
              <Icon
                name={t.kind === 'win' ? 'discount' : t.kind === 'warn' ? 'alert-triangle' : 'info-circle'}
                size={14}
                color={t.kind === 'win' ? 'var(--success)' : t.kind === 'warn' ? 'var(--warning)' : 'var(--kiuvo-blue)'}
              />
              <span style={{ flex: 1 }}>{t.text}</span>
            </div>
          ))}

          {/* Parámetros */}
          <div>
            <button
              onClick={() => setShowParams(s => !s)}
              style={{
                width: '100%', padding: '8px', background: 'transparent',
                border: '0.5px dashed var(--border)', borderRadius: 'var(--r-md)',
                fontSize: 11, color: 'var(--fg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <Icon name={showParams ? 'chevron-up' : 'settings'} size={12} />
              {showParams ? 'Ocultar precios base' : 'Ajustar precios base'}
            </button>
            {showParams && (
              <div style={{
                marginTop: 8, padding: '12px', background: 'var(--bg-secondary)',
                borderRadius: 'var(--r-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              }}>
                <ParamField label="Credencial" k="credentialPrice" suffix="$" />
                <ParamField label="Software / alumno" k="softwarePerStudent" suffix="$" />
                <ParamField label="Escalón desde" k="credentialTierQty" suffix="cred." />
                <ParamField label="Precio en escalón" k="credentialTierPrice" suffix="$" />
                <ParamField label="Costo del kit" k="kitCost" suffix="$" />
                <ParamField label="Alumnos por kit" k="studentsPerKit" suffix="al." />
                <button
                  onClick={() => setParams(SCHOOL_DEFAULTS)}
                  style={{
                    gridColumn: '1 / -1', padding: '7px', background: 'var(--surface)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
                    fontSize: 11, color: 'var(--fg-secondary)',
                  }}>
                  Restaurar valores por defecto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
          <button
            onClick={handleAdd}
            disabled={n <= 0}
            style={{
              width: '100%', padding: '14px', borderRadius: 'var(--r-md)',
              background: n > 0 ? 'var(--kiuvo-blue)' : 'var(--bg-tertiary)',
              color: n > 0 ? '#fff' : 'var(--fg-tertiary)',
              fontSize: 15, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <Icon name="plus" size={16} />
            {n > 0 ? `Agregar ${fmt(calc.total)} a la cotización` : 'Escribe el número de alumnos'}
          </button>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--fg-secondary)', flex: 1, minWidth: 0 }}>{label}</span>
      <span style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{value}</span>
    </div>
  )
}
