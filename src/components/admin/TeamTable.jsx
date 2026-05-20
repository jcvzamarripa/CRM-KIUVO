import { MOCK_SELLERS } from '../../constants/mockData'

const fmt = n => '$' + n.toLocaleString('es-MX')

export default function TeamTable() {
  const sorted = [...MOCK_SELLERS].sort((a, b) => b.compliance - a.compliance)

  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 8', background: 'var(--surface)' }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Equipo de ventas</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>5 vendedores · ordenado por cumplimiento de seguimiento</div>
        </div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver todos →</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Vendedor', 'Meta', 'Avance', 'Prospectos', 'Cumplimiento', 'Estancados', 'Ganado'].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right',
                  fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                  borderBottom: '0.5px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => {
              const pct = Math.round((s.current / s.goal) * 100)
              const compColor = s.compliance >= 85 ? 'var(--success)' : s.compliance >= 75 ? 'var(--warning)' : 'var(--danger)'
              return (
                <tr key={s.id}>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: s.color + '22', color: s.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 500,
                      }}>{s.init}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>Querétaro · Activo hoy</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-secondary)' }}>{fmt(s.goal)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                      <div style={{ width: 80, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? 'var(--success)' : 'var(--kiuvo-blue)' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{s.prospects}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 'var(--r-full)',
                      background: compColor + '18', color: compColor,
                      fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 11,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: compColor }} />
                      {s.compliance}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: s.stuck > 0 ? 'var(--danger)' : 'var(--fg-tertiary)' }}>
                    {s.stuck > 0 ? s.stuck : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--fg)' }}>{fmt(s.won)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
