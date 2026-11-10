import Icon from '../shared/Icon'

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio',  icon: 'home' },
  { id: 'embudo', label: 'Embudo',  icon: 'layout-kanban' },
  { id: 'mapa',   label: 'Mapa',    icon: 'map-2' },
  { id: 'agenda', label: 'Agenda',  icon: 'calendar' },
  { id: 'mas',    label: 'Más',     icon: 'menu-2' },
]

const FAB_SCREENS = ['inicio', 'embudo', 'mapa']

export default function BottomNav({ active, onChange, onCheckIn }) {
  return (
    <>
      {onCheckIn && FAB_SCREENS.includes(active) && (
        <button className="k-fab" onClick={onCheckIn}>
          <Icon name="map-pin-check" size={24} />
          Check-in
        </button>
      )}
      <nav className="k-nav">
        {NAV_ITEMS.map(it => (
          <button
            key={it.id}
            className="k-nav__item"
            aria-current={active === it.id ? 'page' : undefined}
            onClick={() => onChange(it.id)}
          >
            <span className="k-nav__icon"><Icon name={it.icon} size={22} /></span>
            {it.label}
          </button>
        ))}
      </nav>
    </>
  )
}
