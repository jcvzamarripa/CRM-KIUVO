import Icon from '../shared/Icon'

const CLUSTERS = [
  { top: '25%', left: '20%', n: 12 },
  { top: '40%', left: '45%', n: 28 },
  { top: '60%', left: '32%', n: 18 },
  { top: '30%', left: '70%', n: 8  },
  { top: '70%', left: '65%', n: 5  },
  { top: '50%', left: '85%', n: 14 },
]

export default function GeoHeatmap() {
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 6', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad geográfica</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Visitas registradas en Querétaro · últimos 7 días</div>
        </div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Abrir mapa →</button>
      </div>
      <div style={{
        height: 200, borderRadius: 'var(--r-md)', overflow: 'hidden',
        background: 'var(--bg-secondary)', position: 'relative',
        backgroundImage: `linear-gradient(0deg, var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}>
        {CLUSTERS.map((c, i) => {
          const size = 20 + c.n * 1.4
          return (
            <div key={i} style={{
              position: 'absolute', top: c.top, left: c.left,
              transform: 'translate(-50%, -50%)',
              width: size, height: size, borderRadius: '50%',
              background: 'var(--kiuvo-blue)', opacity: 0.25 + c.n * 0.015,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 500,
              border: '2px solid #fff',
            }}>{c.n}</div>
          )
        })}
      </div>
    </div>
  )
}
