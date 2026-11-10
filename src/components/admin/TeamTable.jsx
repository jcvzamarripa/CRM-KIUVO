import { useSellers } from '../../hooks/useSellers'
import { Card, Avatar, Empty, Bone, ProgressBar } from '../ui'

const fmt = n => '$' + (n || 0).toLocaleString('es-MX')

export default function TeamTable() {
  const { sellers, loading } = useSellers()
  const sorted = [...sellers].sort((a, b) => b.prospects - a.prospects)

  return (
    <Card flush>
      <div style={{ padding: '20px 20px 8px' }}>
        <div className="k-h2">Equipo de ventas</div>
        <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
          {loading ? 'Cargando equipo…' : `${sellers.length} vendedor${sellers.length !== 1 ? 'es' : ''} · ordenado por prospectos`}
        </div>
      </div>
      {loading ? (
        <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => <Bone key={i} h={44} r="var(--r-md)" />)}
        </div>
      ) : sellers.length === 0 ? (
        <Empty icon="users-group">No hay vendedores registrados aún.</Empty>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="k-table">
            <thead>
              <tr>
                {['Vendedor', 'Meta del mes', 'Avance (30 días)', 'Prospectos', 'Ganado'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar initials={s.init} name={s.name} color={s.color} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div className="k-dim" style={{ fontSize: 12 }}>{s.position || 'Vendedor'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="k-muted" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.goal)}</td>
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <div style={{ flex: 1, maxWidth: 90 }}><ProgressBar value={s.current} max={s.goal} /></div>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{s.compliance}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.prospects}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(s.won)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
