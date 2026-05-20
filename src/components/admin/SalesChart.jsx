const DATA = [
  { d: 'Lun', won: 42000, target: 35000 },
  { d: 'Mar', won: 38000, target: 35000 },
  { d: 'Mié', won: 51000, target: 35000 },
  { d: 'Jue', won: 29000, target: 35000 },
  { d: 'Vie', won: 64000, target: 35000 },
  { d: 'Sáb', won: 22000, target: 35000 },
  { d: 'Dom', won: 12000, target: 35000 },
]
const MAX = 70000

export default function SalesChart() {
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 8', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Ventas por día</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Cierres ganados vs. meta diaria</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--kiuvo-blue)' }} />Ganado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: 'var(--fg-tertiary)', display: 'block' }} />Meta diaria
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, position: 'relative', padding: '0 0 24px' }}>
        {/* Target line */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + (DATA[0].target / MAX) * 176, height: 0, borderTop: '0.5px dashed var(--fg-tertiary)' }} />
        {DATA.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, color: 'var(--fg-secondary)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              {d.won >= 1000 ? '$' + (d.won / 1000).toFixed(0) + 'k' : ''}
            </div>
            <div style={{
              width: '100%', maxWidth: 38,
              height: `${(d.won / MAX) * 100}%`,
              background: d.won >= d.target ? 'var(--kiuvo-blue)' : 'var(--kiuvo-blue-mid)',
              borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease',
            }} />
            <div style={{ position: 'absolute', bottom: 0, fontSize: 11, color: 'var(--fg-secondary)', transform: 'translateY(20px)' }}>{d.d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
