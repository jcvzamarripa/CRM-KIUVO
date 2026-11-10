import React, { useState, useMemo } from 'react'
import Icon from '../shared/Icon'
import { Sheet, Button, Chip, Card, Pill, Label } from '../ui'
import { SCHOOL_DEFAULTS, calcSchoolPackage, buildSchoolItems } from '../../lib/schoolPackage'

const fmt  = n => '$' + Math.round(n).toLocaleString('es-MX')
const fmt2 = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TIP_STYLE = {
  win:  { bg: 'var(--success-bg)', fg: 'var(--success-fg)', icon: 'discount' },
  warn: { bg: 'var(--warning-bg)', fg: 'var(--warning-fg)', icon: 'alert-triangle' },
  info: { bg: 'var(--info-bg)',    fg: 'var(--kiuvo-blue-deep)', icon: 'info-circle' },
}

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

  // Líneas tal como quedarán en la cotización y en el PDF
  const previewItems = useMemo(
    () => (n > 0 ? buildSchoolItems(calc, mode) : []),
    [calc, mode, n]
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

  const paramField = (label, k, suffix) => (
    <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)' }}>
        {label}{suffix ? ` (${suffix})` : ''}
      </span>
      <input
        type="number" min="0" inputMode="decimal" className="k-input" value={params[k]}
        onChange={e => setParams(p => ({ ...p, [k]: Number(e.target.value) || 0 }))}
      />
    </label>
  )

  return (
    <Sheet
      full
      title="Paquete escolar"
      onClose={onClose}
      footer={
        <Button block size="lg" icon="plus" disabled={n <= 0} onClick={handleAdd}>
          {n > 0 ? `Agregar ${fmt(calc.total)} a la cotización` : 'Escribe el número de alumnos'}
        </Button>
      }
    >
      <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginBottom: 20 }}>
        Credenciales + software {withEquip ? '+ equipo' : ''}
      </div>

      <Label>Número de alumnos</Label>
      <input
        type="number" min="1" inputMode="numeric"
        className="k-input k-display"
        value={students}
        onChange={e => setStudents(e.target.value)}
        placeholder="Ej. 450"
        autoFocus
        style={{ fontSize: 28, fontWeight: 700, minHeight: 64, marginBottom: 22 }}
      />

      <Label>Equipo (tablet + lector)</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
        {[[true, 'Incluir equipo'], [false, 'Sin equipo']].map(([v, label]) => (
          <Chip key={String(v)} selected={withEquip === v} onClick={() => setWithEquip(v)}>{label}</Chip>
        ))}
      </div>

      <Label>Cómo se presenta a la escuela</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
        {[
          ['itemized', 'Desglosado', 'Cada concepto por separado'],
          ['blended',  'Por alumno', 'Un solo precio unitario'],
        ].map(([m, label, hint]) => (
          <Chip key={m} tall selected={mode === m} onClick={() => setMode(m)}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 14px', minHeight: 64 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.75 }}>{hint}</span>
          </Chip>
        ))}
      </div>

      {/* Así lo verá la escuela — solo en modo por alumno, donde no es obvio */}
      {previewItems.length > 0 && mode === 'blended' && (
        <div style={{ marginBottom: 14 }}>
          <Label>Así aparece en la cotización</Label>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {previewItems.map(it => {
              const unitP = it.specialPrice != null
                ? it.specialPrice
                : it.price * (1 - (it.discountPct || 0) / 100)
              return (
                <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{it.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2, lineHeight: 1.35 }}>{it.sku}</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 3 }}>
                      {it.qty.toLocaleString('es-MX')} {it.unit}{it.qty !== 1 ? 's' : ''} × {fmt2(unitP)}
                      {it.discountPct > 0 && (
                        <span style={{ color: 'var(--success-fg)', fontWeight: 600 }}> · −{it.discountPct}%</span>
                      )}
                    </div>
                  </div>
                  <span className="k-num" style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.35 }}>
                    {fmt(unitP * it.qty)}
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* Desglose */}
      {n > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Label>{mode === 'blended' ? 'Desglose interno — no se imprime' : 'Desglose'}</Label>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row
              label={<>Credenciales · {n} × {fmt(calc.unitPrice)}
                {calc.inTier && (
                  <Pill tone="success" style={{ marginLeft: 6 }}>−{calc.discountPct}% volumen</Pill>
                )}
              </>}
              value={fmt(calc.credentialsTotal)}
            />
            <Row label={`Software anual · ${n} × ${fmt(params.softwarePerStudent)}`} value={fmt(calc.softwareTotal)} />
            {calc.kitsNeeded > 0 && (
              <Row label={`Kits · ${calc.kitsNeeded} × ${fmt(params.kitCost)}`} value={fmt(calc.equipmentTotal)} />
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Total (sin IVA)</span>
              <span className="k-num" style={{ fontSize: 26 }}>{fmt(calc.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--fg-secondary)' }}>
              <span>Por alumno</span>
              <span style={{ fontWeight: 600 }}>{fmt2(calc.perStudent)}</span>
            </div>
            {calc.volumeSavings > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success-fg)', fontWeight: 600 }}>
                <span>Ahorro por volumen</span>
                <span>−{fmt(calc.volumeSavings)}</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Sugerencias */}
      {tips.map((t, i) => {
        const s = TIP_STYLE[t.kind] || TIP_STYLE.info
        return (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 'var(--r-md)', fontSize: 14, lineHeight: 1.45, marginBottom: 10,
            display: 'flex', alignItems: 'flex-start', gap: 10, background: s.bg, color: s.fg,
          }}>
            <Icon name={s.icon} size={18} style={{ marginTop: 1 }} />
            <span style={{ flex: 1 }}>{t.text}</span>
          </div>
        )
      })}

      {/* Parámetros */}
      <div style={{ marginTop: 6 }}>
        <Button variant="outline" block icon={showParams ? 'chevron-up' : 'settings'} onClick={() => setShowParams(s => !s)}>
          {showParams ? 'Ocultar precios base' : 'Ajustar precios base'}
        </Button>
        {showParams && (
          <Card style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {paramField('Credencial', 'credentialPrice', '$')}
            {paramField('Software / alumno', 'softwarePerStudent', '$')}
            {paramField('Escalón desde', 'credentialTierQty', 'cred.')}
            {paramField('Precio en escalón', 'credentialTierPrice', '$')}
            {paramField('Costo del kit', 'kitCost', '$')}
            {paramField('Alumnos por kit', 'studentsPerKit', 'al.')}
            <Button variant="soft" onClick={() => setParams(SCHOOL_DEFAULTS)} style={{ gridColumn: '1 / -1' }}>
              Restaurar valores por defecto
            </Button>
          </Card>
        )}
      </div>
    </Sheet>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 14 }}>
      <span style={{ color: 'var(--fg-secondary)', flex: 1, minWidth: 0 }}>{label}</span>
      <span style={{ color: 'var(--fg)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{value}</span>
    </div>
  )
}
