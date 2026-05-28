import React, { useState } from 'react'
import ErrorBoundary from '../components/shared/ErrorBoundary'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminTopBar from '../components/admin/AdminTopBar'
import KPICard from '../components/admin/KPICard'
import SalesChart from '../components/admin/SalesChart'
import FunnelChart from '../components/admin/FunnelChart'
import TeamTable from '../components/admin/TeamTable'
import ActivityFeed from '../components/admin/ActivityFeed'
import GeoHeatmap from '../components/admin/GeoHeatmap'
import AlertsPanel from '../components/admin/AlertsPanel'
import ProspectsView from '../components/admin/ProspectsView'
import TeamView from '../components/admin/TeamView'
import ProductsView from '../components/admin/ProductsView'
import QuotesView from '../components/admin/QuotesView'
import ReportsView from '../components/admin/ReportsView'
import AdminPipelineView from '../components/admin/AdminPipelineView'
import MapView from '../components/admin/MapView'
import AgendaView from '../components/admin/AgendaView'
import GoalsView from '../components/admin/GoalsView'
import ActivitiesView from '../components/admin/ActivitiesView'
import SettingsView from '../components/admin/SettingsView'
import ProductionOrdersView from '../components/admin/ProductionOrdersView'
import useDashboardKPIs from '../hooks/useDashboardKPIs'
import { useSalesTrend } from '../hooks/useSalesTrend'

const VIEW_META = {
  dashboard:  { title: 'Dashboard',     subtitle: 'Resumen operativo del equipo · esta semana' },
  pipeline:   { title: 'Embudo',         subtitle: 'Vista kanban de todos los prospectos' },
  prospects:  { title: 'Prospectos',     subtitle: 'Todos los prospectos del equipo' },
  map:        { title: 'Mapa',           subtitle: 'Actividad geográfica · últimos 7 días' },
  quotes:     { title: 'Cotizaciones',   subtitle: 'Pipeline de cotizaciones del equipo' },
  agenda:     { title: 'Agenda',         subtitle: 'Citas y eventos del equipo' },
  products:   { title: 'Productos',      subtitle: 'Catálogo de productos y precios' },
  team:       { title: 'Equipo',         subtitle: 'Vendedores y cumplimiento de metas' },
  reports:      { title: 'Reportes',      subtitle: 'Análisis de ventas y métricas' },
  activities:   { title: 'Actividades',  subtitle: 'Historial completo de visitas, llamadas y acciones del equipo' },
  goals:        { title: 'Metas',        subtitle: 'Objetivos y gamificación del equipo' },
  production:   { title: 'Producción',    subtitle: 'Órdenes de producción generadas por el equipo de ventas' },
  settings:     { title: 'Configuración', subtitle: 'Perfil, apariencia y parámetros del sistema' },
}

function PlaceholderView({ icon, label }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, color: 'var(--fg-tertiary)',
    }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
      </svg>
      <div style={{ fontSize: 13 }}>{label} — próximamente</div>
    </div>
  )
}

const PULSE = `@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.85} }`
function Bone({ w, h, r = 4, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'var(--border)',
      animation: 'pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

// Skeleton placeholder for KPI cards while loading
function KPISkeleton() {
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <style>{PULSE}</style>
      <Bone w="55%" h={10} />
      <Bone w="70%" h={22} />
      <Bone w="80%" h={8} />
    </div>
  )
}

// Skeleton for a chart panel (span 8)
function ChartSkeleton({ span = 8, h = 240 }) {
  return (
    <div className="card" style={{
      padding: 20, gridColumn: `span ${span}`,
      background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <style>{PULSE}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Bone w={120} h={13} />
          <Bone w={180} h={9} />
        </div>
        <Bone w={64} h={26} r={99} />
      </div>
      <div style={{ height: h, borderRadius: 8, background: 'var(--bg-secondary)', animation: 'pulse 1.4s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[80, 60, 90, 50, 70].map((w, i) => <Bone key={i} w={w} h={8} />)}
      </div>
    </div>
  )
}

// Skeleton for a table/feed panel (span 4 or 8)
function TableSkeleton({ span = 8 }) {
  return (
    <div className="card" style={{
      padding: 0, gridColumn: `span ${span}`,
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      <style>{PULSE}</style>
      <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Bone w={110} h={13} />
          <Bone w={180} h={9} />
        </div>
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          padding: '12px 20px', borderTop: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Bone w={28} h={28} r="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Bone w="45%" h={11} />
            <Bone w="30%" h={9} />
          </div>
          <Bone w={60} h={11} />
          <Bone w={48} h={11} />
        </div>
      ))}
    </div>
  )
}

// Small panel skeleton (span 4)
function SmallSkeleton({ span = 4 }) {
  return (
    <div className="card" style={{
      padding: 20, gridColumn: `span ${span}`,
      background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <style>{PULSE}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bone w={100} h={13} />
        <Bone w={150} h={9} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bone w={8} h={8} r="50%" />
            <Bone w="60%" h={10} />
            <div style={{ flex: 1 }} />
            <Bone w={32} h={10} />
          </div>
        ))}
      </div>
    </div>
  )
}

const RESPONSIVE_CSS = `
  /* ── Sidebar drawer ── */
  .admin-sidebar { transition: transform 0.22s cubic-bezier(.4,0,.2,1); }
  @media (max-width: 1023px) {
    .admin-sidebar {
      position: fixed !important;
      top: 0; left: 0; bottom: 0;
      z-index: 300;
      transform: translateX(-100%);
      box-shadow: 4px 0 24px rgba(0,0,0,0.18);
    }
    .admin-sidebar.open { transform: translateX(0); }
  }
  @media (min-width: 1024px) {
    .admin-sidebar { transform: none !important; position: relative !important; }
  }

  /* ── Backdrop ── */
  .admin-backdrop {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.4); z-index: 299;
  }
  @media (max-width: 1023px) { .admin-backdrop.visible { display: block; } }

  /* ── Hamburger ── */
  .admin-hamburger { display: none; }
  @media (max-width: 1023px) { .admin-hamburger { display: flex; } }

  /* ── TopBar: ocultar elementos en pantallas pequeñas ── */
  @media (max-width: 768px) {
    .admin-topbar-search { display: none !important; }
    .admin-topbar-period { display: none !important; }
    .admin-topbar-export { display: none !important; }
  }

  /* ── KPI grid ── */
  .admin-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 1280px) { .admin-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px)  { .admin-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .admin-kpi-grid { grid-template-columns: 1fr; } }

  /* ── 12-col grid ── */
  .admin-chart-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; margin-bottom: 16px; }
  .admin-col-8 { grid-column: span 8; min-width: 0; }
  .admin-col-4 { grid-column: span 4; min-width: 0; }
  @media (max-width: 1100px) {
    .admin-col-8 { grid-column: span 12; }
    .admin-col-4 { grid-column: span 12; }
  }

  /* ── Dashboard scroll padding ── */
  .admin-dashboard-scroll { overflow-y: auto; padding: 20px 28px 28px; flex: 1; }
  @media (max-width: 768px) { .admin-dashboard-scroll { padding: 12px 12px 20px; } }
`

export default function AdminApp({ dark, onToggleDark }) {
  const [activeNav,   setActiveNav]   = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { kpis, loading: kpiLoading } = useDashboardKPIs()
  const { trend: salesTrend }          = useSalesTrend({ days: 14 })
  const meta = VIEW_META[activeNav] || VIEW_META.dashboard

  function handleNavChange(id) {
    setActiveNav(id)
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  let content
  if (activeNav === 'dashboard') {
    content = (
      <div className="admin-dashboard-scroll">
        {/* KPI Row */}
        <div className="admin-kpi-grid">
          {kpiLoading || !kpis ? (
            Array.from({ length: 6 }).map((_, i) => <KPISkeleton key={i} />)
          ) : (<>
            <KPICard label="Ventas totales"           value={kpis.salesTotal.value}              delta={kpis.salesTotal.delta}              deltaKind={kpis.salesTotal.deltaKind}              sub={kpis.salesTotal.sub}              accent="var(--kiuvo-blue)"         sparkline={salesTrend} />
            <KPICard label="Prospectos activos"       value={kpis.prospectosActivos.value}       delta={kpis.prospectosActivos.delta}       deltaKind={kpis.prospectosActivos.deltaKind}       sub={kpis.prospectosActivos.sub}       accent="var(--info)"               />
            <KPICard label="Tasa de conversión"       value={kpis.tasaConversion.value}          delta={kpis.tasaConversion.delta}          deltaKind={kpis.tasaConversion.deltaKind}          sub={kpis.tasaConversion.sub}          accent="var(--success)"            />
            <KPICard label="Ticket promedio"          value={kpis.ticketPromedio.value}          delta={kpis.ticketPromedio.delta}          deltaKind={kpis.ticketPromedio.deltaKind}          sub={kpis.ticketPromedio.sub}          accent="var(--stage-cotizacion)"   />
            <KPICard label="Cierres del mes"          value={kpis.cierresMes.value}              delta={kpis.cierresMes.delta}              deltaKind={kpis.cierresMes.deltaKind}              sub={kpis.cierresMes.sub}              accent="var(--warning)"            />
            <KPICard label="Cotizaciones pendientes"  value={kpis.cotizacionesPendientes.value}  delta={kpis.cotizacionesPendientes.delta}  deltaKind={kpis.cotizacionesPendientes.deltaKind}  sub={kpis.cotizacionesPendientes.sub}  accent="var(--stage-negociacion)"  />
          </>)}
        </div>

        {/* Sales + Funnel */}
        <div className="admin-chart-grid">
          {kpiLoading ? (
            <><ChartSkeleton span={8} h={200} /><SmallSkeleton span={4} /></>
          ) : (<>
            <div className="admin-col-8"><SalesChart /></div>
            <div className="admin-col-4"><FunnelChart /></div>
          </>)}
        </div>

        {/* Team + Activity */}
        <div className="admin-chart-grid">
          {kpiLoading ? (
            <><TableSkeleton span={8} /><SmallSkeleton span={4} /></>
          ) : (<>
            <div className="admin-col-8"><TeamTable /></div>
            <div className="admin-col-4"><ActivityFeed /></div>
          </>)}
        </div>

        {/* Heatmap + Alerts */}
        <div className="admin-chart-grid" style={{ marginBottom: 0 }}>
          {kpiLoading ? (
            <><ChartSkeleton span={8} h={160} /><SmallSkeleton span={4} /></>
          ) : (<>
            <div className="admin-col-8"><GeoHeatmap /></div>
            <div className="admin-col-4"><AlertsPanel /></div>
          </>)}
        </div>
      </div>
    )
  } else if (activeNav === 'prospects') {
    content = <ProspectsView />
  } else if (activeNav === 'team') {
    content = <TeamView />
  } else if (activeNav === 'products') {
    content = <ProductsView />
  } else if (activeNav === 'quotes') {
    content = <QuotesView />
  } else if (activeNav === 'reports') {
    content = <ReportsView />
  } else if (activeNav === 'pipeline') {
    content = <AdminPipelineView />
  } else if (activeNav === 'map') {
    content = <MapView />
  } else if (activeNav === 'agenda') {
    content = <AgendaView />
  } else if (activeNav === 'activities') {
    content = <ActivitiesView />
  } else if (activeNav === 'goals') {
    content = <GoalsView />
  } else if (activeNav === 'production') {
    content = <ProductionOrdersView />
  } else if (activeNav === 'settings') {
    content = <SettingsView dark={dark} onToggleDark={onToggleDark} />
  } else {
    content = <PlaceholderView label={meta.title} />
  }

  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden',
    }}>
      <style>{RESPONSIVE_CSS}</style>

      {/* Mobile backdrop */}
      <div
        className={`admin-backdrop${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <AdminSidebar
        active={activeNav}
        onChange={handleNavChange}
        open={sidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AdminTopBar
          title={meta.title}
          subtitle={meta.subtitle}
          dark={dark}
          onToggleDark={onToggleDark}
          onMenuClick={() => setSidebarOpen(o => !o)}
        />
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <ErrorBoundary key={activeNav}>
            {content}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
