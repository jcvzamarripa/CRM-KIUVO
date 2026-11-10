import React from 'react'
import Icon from '../shared/Icon'
import { Avatar } from '../ui'
import { useAuth } from '../../contexts/AuthContext'

const NAV_GROUPS = [
  { label: null, items: [
    { id: 'dashboard',  label: 'Dashboard',    icon: 'layout-dashboard' },
  ] },
  { label: 'Campo', items: [
    { id: 'field',      label: 'Supervisión',  icon: 'map-pin-check' },
    { id: 'map',        label: 'Mapa',         icon: 'map-2' },
    { id: 'activities', label: 'Actividades',  icon: 'history' },
    { id: 'agenda',     label: 'Agenda',       icon: 'calendar' },
  ] },
  { label: 'Ventas', items: [
    { id: 'pipeline',   label: 'Embudo',       icon: 'layout-kanban' },
    { id: 'prospects',  label: 'Prospectos',   icon: 'users' },
    { id: 'quotes',     label: 'Cotizaciones', icon: 'file-text' },
    { id: 'production', label: 'Producción',   icon: 'clipboard-list' },
  ] },
  { label: 'Equipo', items: [
    { id: 'team',       label: 'Equipo',       icon: 'users-group' },
    { id: 'goals',      label: 'Metas',        icon: 'target' },
    { id: 'reports',    label: 'Reportes',     icon: 'chart-bar' },
  ] },
  { label: 'Catálogo', items: [
    { id: 'products',   label: 'Productos',    icon: 'package' },
  ] },
]

function NavItem({ item, active, onChange }) {
  return (
    <button
      className="adm-nav__item"
      aria-current={active === item.id ? 'page' : undefined}
      onClick={() => onChange?.(item.id)}
      title={item.label}
    >
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
    </button>
  )
}

export default function AdminSidebar({ active = 'dashboard', onChange, open = true }) {
  const { profile, signOut } = useAuth()
  const name = profile?.full_name || 'Administrador'

  return (
    <aside className={`admin-sidebar${open ? ' open' : ''}`}>
      {/* Marca */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--on-ink)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19,
        }}>K</div>
        <div>
          <div className="k-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-ink)', lineHeight: 1.1 }}>KIUVO</div>
          <div style={{ fontSize: 12, color: 'var(--on-ink-muted)', marginTop: 2 }}>Panel admin</div>
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {NAV_GROUPS.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="adm-nav__group">{g.label}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {g.items.map(it => <NavItem key={it.id} item={it} active={active} onChange={onChange} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Configuración + usuario */}
      <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <NavItem item={{ id: 'settings', label: 'Configuración', icon: 'settings' }} active={active} onChange={onChange} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 6px 4px' }}>
          <Avatar name={name} initials={profile?.initials} src={profile?.avatar_url} color={profile?.avatar_color || 'var(--brand)'} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--on-ink-muted)' }}>Administrador</div>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="adm-nav__logout"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
