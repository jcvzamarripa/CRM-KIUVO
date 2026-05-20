import Icon from '../shared/Icon'
import { STAGE_BY_ID } from '../../constants/stages'

const PINS = [
  { top: '20%', left: '30%', stage: 'presentacion', name: 'Ferretería del Valle' },
  { top: '40%', left: '55%', stage: 'cotizacion',   name: 'Distribuidora Norte' },
  { top: '55%', left: '25%', stage: 'cierre',        name: 'Constructora ABC' },
  { top: '70%', left: '60%', stage: 'negociacion',  name: 'Comercial Las Palmas' },
  { top: '32%', left: '70%', stage: 'prospeccion',  name: 'Maderería San Juan' },
]

export default function MapScreen() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '0 0 92px' }}>
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)' }}>Mapa de prospectos</div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>Querétaro · 5 prospectos activos</div>
      </div>

      <div style={{
        margin: '0 16px',
        height: 400, borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden',
        background: `repeating-linear-gradient(45deg, var(--bg-secondary), var(--bg-secondary) 8px, var(--bg-tertiary) 8px, var(--bg-tertiary) 16px)`,
        border: '0.5px solid var(--border)',
      }}>
        {PINS.map((pin, i) => {
          const s = STAGE_BY_ID[pin.stage]
          return (
            <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left, transform: 'translate(-50%, -100%)' }}>
              <div title={pin.name} style={{
                width: 28, height: 28, borderRadius: '50% 50% 50% 0',
                background: s.color, transform: 'rotate(-45deg)',
                border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }} />
            </div>
          )
        })}

        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          background: 'var(--surface)', borderRadius: 'var(--r-md)',
          padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
          border: '0.5px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Ruta sugerida</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>5 paradas · 23 km · 1h 45min</div>
          <button style={{ marginTop: 4, padding: 8, background: 'var(--kiuvo-blue)', color: '#fff', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500 }}>
            Iniciar navegación
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ margin: '12px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['prospeccion','presentacion','cotizacion','negociacion','cierre'].map(id => {
          const s = STAGE_BY_ID[id]
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
