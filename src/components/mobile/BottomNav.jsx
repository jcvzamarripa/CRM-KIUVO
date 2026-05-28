import Icon from '../shared/Icon'

const NAV_ITEMS = [
  { id: 'inicio',        label: 'Inicio',        icon: 'home' },
  { id: 'embudo',        label: 'Embudo',        icon: 'layout-kanban' },
  { id: 'cotizaciones',  label: 'Cotizaciones',  icon: 'file-invoice' },
  { id: 'agenda',        label: 'Agenda',        icon: 'calendar' },
  { id: 'mas',           label: 'Más',           icon: 'menu-2' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'var(--bg)', borderTop: '0.5px solid var(--border)',
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      zIndex: 10,
    }}>
      {NAV_ITEMS.map(it => {
        const on = active === it.id
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 0', color: on ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)',
          }}>
            <Icon name={it.icon} size={22} />
            <span style={{ fontSize: 10, fontWeight: on ? 500 : 400 }}>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}
