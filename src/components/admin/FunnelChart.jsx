import { STAGE_BY_ID } from '../../constants/stages'

const DATA = [
  { id: 'prospeccion',  label: 'Prospección',  count: 142, value: 1820000 },
  { id: 'presentacion', label: 'Presentación', count: 86,  value: 1240000 },
  { id: 'cotizacion',   label: 'Cotización',   count: 48,  value: 820000  },
  { id: 'negociacion',  label: 'Negociación',  count: 27,  value: 460000  },
  { id: 'cierre',       label: 'Cierre',       count: 12,  value: 248000  },
]

export default function FunnelChart() {
  const max = DATA[0].count
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 4', background: 'var(--surface)' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Embudo de ventas</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Distribución actual del pipeline</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DATA.map((row, i) => {
          const stage = STAGE_BY_ID[row.id]
          const width = (row.count / max) * 100
          const prev = i > 0 ? DATA[i - 1].count : null
          const conv = prev ? Math.round((row.count / prev) * 100) : null
          return (
            <div key={row.id}>
              {conv !== null && (
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textAlign: 'center', padding: '1px 0' }}>
                  ↓ {conv}% conversión
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 90, fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{row.label}</div>
                <div style={{ flex: 1, position: 'relative', height: 30 }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${width}%`, background: stage.color + '24',
                    borderLeft: `3px solid ${stage.color}`,
                    borderRadius: '0 4px 4px 0',
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
                  </div>
                </div>
                <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: 'var(--fg-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  ${(row.value / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
