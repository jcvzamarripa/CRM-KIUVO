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
import SupervisionView from '../components/admin/SupervisionView'
import useDashboardKPIs from '../hooks/useDashboardKPIs'
import { useSalesTrend } from '../hooks/useSalesTrend'
import { Card, Bone, Empty } from '../components/ui'

const VIEW_META = {
  dashboard:  { title: 'Dashboard',     subtitle: 'Resumen operativo del equipo · este mes' },
  field:      { title: 'Supervisión',    subtitle: 'Visitas del día, verificación y tareas del equipo de campo' },
  pipeline:   { title: 'Embudo',         subtitle: 'Vista kanban de todos los prospectos' },
  prospects:  { title: 'Prospectos',     subtitle: 'Todos los prospectos del equipo' },
  map:        { title: 'Mapa',           subtitle: 'Actividad geográfica · últimos 7 días' },
  quotes:     { title: 'Cotizaciones',   subtitle: 'Pipeline de cotizaciones del equipo' },
  agenda:     { title: 'Agenda',         subtitle: 'Citas y eventos del equipo' },
  products:   { title: 'Productos',      subtitle: 'Catálogo de productos y precios' },
  team:       { title: 'Equipo',         subtitle: 'Vendedores y cumplimiento de metas' },
  reports:      { title: 'Reportes',      subtitle: 'Análisis de ventas y métricas' },
  activities:   { title: 'Actividades',  subtitle: 'Historial completo de visitas, llamadas y acciones del equipo' },
  goals:        { title: 'Metas',        subtitle: 'Objetivos por vendedor y por periodo' },
  production:   { title: 'Producción',    subtitle: 'Órdenes de producción generadas por el equipo de ventas' },
  settings:     { title: 'Configuración', subtitle: 'Perfil, apariencia y parámetros del sistema' },
}

function PlaceholderView({ label }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty icon="circle-dashed">{label} — próximamente</Empty>
    </div>
  )
}

function KPISkeleton() {
  return (
    <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Bone w="55%" h={12} />
      <Bone w="70%" h={30} />
      <Bone w="80%" h={12} />
    </Card>
  )
}

function ChartSkeleton({ h = 240 }) {
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Bone w={160} h={20} />
      <Bone w={220} h={12} />
      <Bone h={h} r="var(--r-md)" />
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Bone w={160} h={20} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bone w={30} h={30} r="50%" />
          <Bone w="40%" h={14} />
          <div style={{ flex: 1 }} />
          <Bone w={60} h={14} />
        </div>
      ))}
    </Card>
  )
}

function SmallSkeleton() {
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <Bone w={140} h={20} />
      {[1, 2, 3, 4].map(i => <Bone key={i} h={32} r="var(--r-full)" />)}
    </Card>
  )
}

const RESPONSIVE_CSS = `
  /* ── Sidebar: bloque negro flotante ── */
  .kiuvo .admin-sidebar {
    width: 236px; flex-shrink: 0; margin: 10px 0 10px 10px;
    display: flex; flex-direction: column; overflow: hidden;
    background: #0E0E0E; color: #A9A9A4; border-radius: var(--r-xl);
    transition: transform 0.22s cubic-bezier(.4,0,.2,1);
  }
  .kiuvo-dark .admin-sidebar { background: #1A1A18; }
  @media (max-width: 1023px) {
    .kiuvo .admin-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 300;
      transform: translateX(calc(-100% - 20px));
      box-shadow: var(--shadow-float);
    }
    .kiuvo .admin-sidebar.open { transform: translateX(0); }
  }

  .kiuvo .adm-nav__group {
    padding: 16px 14px 6px; font-size: 12px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; color: #6F6F6A;
  }
  .kiuvo .adm-nav__item {
    display: flex; align-items: center; gap: 12px; width: 100%;
    min-height: 42px; padding: 0 14px; border-radius: var(--r-full);
    font-size: 14px; font-weight: 500; color: #A9A9A4; text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .kiuvo .adm-nav__item:hover { background: rgba(255,255,255,0.08); color: #FFFFFF; }
  .kiuvo .adm-nav__item[aria-current="page"] { background: var(--accent); color: var(--accent-fg); font-weight: 600; }
  .kiuvo .adm-nav__logout {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.10); color: #FFFFFF;
  }
  .kiuvo .adm-nav__logout:hover { background: var(--coral); }

  /* ── Fondo al abrir el menú en pantallas chicas ── */
  .admin-backdrop {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.5); z-index: 299;
  }
  @media (max-width: 1023px) { .admin-backdrop.visible { display: block; } }

  /* ── Barra superior ── */
  .kiuvo .admin-topbar {
    display: flex; align-items: center; gap: 14px; flex-shrink: 0;
    padding: 20px 28px 8px; background: var(--bg);
  }
  .kiuvo .admin-hamburger { display: none; }
  @media (max-width: 1023px) { .kiuvo .admin-hamburger { display: inline-flex; } }
  @media (max-width: 768px) {
    .kiuvo .admin-topbar { padding: 12px 12px 4px; }
    .kiuvo .admin-topbar .k-h1 { font-size: 22px; }
  }

  /* ── KPI grid ── */
  .admin-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 12px; }
  @media (max-width: 1500px) { .admin-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px)  { .admin-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .admin-kpi-grid { grid-template-columns: 1fr; } }

  /* ── 12-col grid ── */
  .admin-chart-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; margin-bottom: 12px; }
  .admin-col-8 { grid-column: span 8; min-width: 0; }
  .admin-col-4 { grid-column: span 4; min-width: 0; }
  @media (max-width: 1100px) {
    .admin-col-8 { grid-column: span 12; }
    .admin-col-4 { grid-column: span 12; }
  }

  /* ── Dashboard scroll padding ── */
  .admin-dashboard-scroll { overflow-y: auto; padding: 12px 28px 32px; flex: 1; }
  @media (max-width: 768px) { .admin-dashboard-scroll { padding: 12px 12px 24px; } }
`

export default function AdminApp({ dark, onToggleDark }) {
  const [activeNav,   setActiveNav]   = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
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
            <KPICard label="Ventas totales"           value={kpis.salesTotal.value}              delta={kpis.salesTotal.delta}              deltaKind={kpis.salesTotal.deltaKind}              sub={kpis.salesTotal.sub}              accent="var(--brand)"              sparkline={salesTrend} />
            <KPICard label="Prospectos activos"       value={kpis.prospectosActivos.value}       delta={kpis.prospectosActivos.delta}       deltaKind={kpis.prospectosActivos.deltaKind}       sub={kpis.prospectosActivos.sub}       accent="var(--accent-2)"           />
            <KPICard label="Tasa de conversión"       value={kpis.tasaConversion.value}          delta={kpis.tasaConversion.delta}          deltaKind={kpis.tasaConversion.deltaKind}          sub={kpis.tasaConversion.sub}          accent="var(--success)"            />
            <KPICard label="Ticket promedio"          value={kpis.ticketPromedio.value}          delta={kpis.ticketPromedio.delta}          deltaKind={kpis.ticketPromedio.deltaKind}          sub={kpis.ticketPromedio.sub}          accent="var(--fg)"                 />
            <KPICard label="Cierres del mes"          value={kpis.cierresMes.value}              delta={kpis.cierresMes.delta}              deltaKind={kpis.cierresMes.deltaKind}              sub={kpis.cierresMes.sub}              accent="var(--warning)"            />
            <KPICard label="Cotizaciones pendientes"  value={kpis.cotizacionesPendientes.value}  delta={kpis.cotizacionesPendientes.delta}  deltaKind={kpis.cotizacionesPendientes.deltaKind}  sub={kpis.cotizacionesPendientes.sub}  accent="var(--coral)"              />
          </>)}
        </div>

        {/* Sales + Funnel */}
        <div className="admin-chart-grid">
          {kpiLoading ? (
            <><div className="admin-col-8"><ChartSkeleton h={200} /></div><div className="admin-col-4"><SmallSkeleton /></div></>
          ) : (<>
            <div className="admin-col-8"><SalesChart /></div>
            <div className="admin-col-4"><FunnelChart /></div>
          </>)}
        </div>

        {/* Team + Activity */}
        <div className="admin-chart-grid">
          {kpiLoading ? (
            <><div className="admin-col-8"><TableSkeleton /></div><div className="admin-col-4"><SmallSkeleton /></div></>
          ) : (<>
            <div className="admin-col-8"><TeamTable /></div>
            <div className="admin-col-4"><ActivityFeed /></div>
          </>)}
        </div>

        {/* Heatmap + Alerts */}
        <div className="admin-chart-grid" style={{ marginBottom: 0 }}>
          {kpiLoading ? (
            <><div className="admin-col-8"><ChartSkeleton h={160} /></div><div className="admin-col-4"><SmallSkeleton /></div></>
          ) : (<>
            <div className="admin-col-8"><GeoHeatmap onOpenMap={() => handleNavChange('map')} /></div>
            <div className="admin-col-4"><AlertsPanel /></div>
          </>)}
        </div>
      </div>
    )
  } else if (activeNav === 'field') {
    content = <SupervisionView />
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
