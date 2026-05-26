import { useSellers } from '../../hooks/useSellers'

const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

export default function TeamTable() {
  const { sellers, loading } = useSellers()
  const sorted = [...sellers].sort((a, b) => b.prospects - a.prospects)

  if (loading) return (
    <div className="card" style={{ padding: 24, gridColumn: 'span 8', background: 'var(--surface)', color: 'var(--fg-tertiary)', fontSize: 13 }}>
      Cargando equipo…
    </div>
  )

  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 8', background: 'var(--surface)' }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Equipo de ventas</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{sellers.length} vendedor{sellers.length !== 1 ? 'es' : ''} · ordenado por prospectos activos</div>
        </div>
      </div>
      {sellers.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          No hay vendedores registrados aún. Invita a tu equipo desde la sección Equipo.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Vendedor', 'Meta', 'Prospectos', 'Ganado'].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right',
                    fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                    borderBottom: '0.5px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
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
                        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{s.position || 'Vendedor'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-secondary)' }}>{fmt(s.goal)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{s.prospects}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--fg)' }}>{fmt(s.won)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
