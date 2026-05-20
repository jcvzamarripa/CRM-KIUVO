import Icon from '../shared/Icon'

const ALERTS = [
  { kind: 'red',   icon: 'alert-circle',    title: '4 prospectos estancados',   sub: '>21 días en la misma etapa · 3 vendedores' },
  { kind: 'red',   icon: 'history',          title: '12 clientes a reactivar',   sub: '>60 días sin contacto · $186k potencial' },
  { kind: 'amber', icon: 'file-text',        title: '6 cotizaciones por vencer', sub: 'Vencen en los próximos 3 días' },
  { kind: 'amber', icon: 'eye-exclamation',  title: '9 prospectos en riesgo',    sub: 'Faltan visitas para el mínimo de etapa' },
  { kind: 'info',  icon: 'calendar-event',   title: '23 citas mañana',           sub: 'Distribuidas entre 5 vendedores' },
]

const TONE = {
  red:   { bg: 'var(--danger-bg)',        border: 'var(--danger-border)',  fg: 'var(--danger)',      text: 'var(--danger-fg)' },
  amber: { bg: 'var(--warning-bg)',       border: 'var(--warning-border)', fg: 'var(--warning-fg)',  text: 'var(--warning-fg)' },
  info:  { bg: 'var(--kiuvo-blue-soft)', border: 'var(--kiuvo-blue-mid)', fg: 'var(--kiuvo-blue)',  text: 'var(--kiuvo-blue-deep)' },
}

export default function AlertsPanel() {
  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 6', background: 'var(--surface)' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Alertas operativas</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Requieren tu atención esta semana</div>
      </div>
      <div>
        {ALERTS.map((a, i) => {
          const t = TONE[a.kind]
          return (
            <div key={i} style={{
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < ALERTS.length - 1 ? '0.5px solid var(--border)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: t.bg, color: t.fg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `0.5px solid ${t.border}`,
              }}>
                <Icon name={a.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>{a.sub}</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
