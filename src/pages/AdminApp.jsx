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
import { MOCK_SALES_TREND } from '../constants/mockData'
import useDashboardKPIs from '../hooks/useDashboardKPIs'

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

export default function AdminApp({ dark, onToggleDark }) {
  const [activeNav, setActiveNav] = useState('dashboard')
  const { kpis, loading: kpiLoading } = useDashboardKPIs()
  const meta = VIEW_META[activeNav] || VIEW_META.dashboard

  let content
  if (activeNav === 'dashboard') {
    content = (
      <div style={{ overflowY: 'auto', padding: '20px 28px 28px', flex: 1 }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          {kpiLoading || !kpis ? (
            Array.from({ length: 6 }).map((_, i) => <KPISkeleton key={i} />)
          ) : (<>
            <KPICard
              label="Ventas totales"
              value={kpis.salesTotal.value}
              delta={kpis.salesTotal.delta}
              deltaKind={kpis.salesTotal.deltaKind}
              sub={kpis.salesTotal.sub}
              accent="var(--kiuvo-blue)"
              sparkline={MOCK_SALES_TREND}
            />
            <KPICard
              label="Prospectos activos"
              value={kpis.prospectosActivos.value}
              delta={kpis.prospectosActivos.delta}
              deltaKind={kpis.prospectosActivos.deltaKind}
              sub={kpis.prospectosActivos.sub}
              accent="var(--info)"
            />
            <KPICard
              label="Tasa de conversión"
              value={kpis.tasaConversion.value}
              delta={kpis.tasaConversion.delta}
              deltaKind={kpis.tasaConversion.deltaKind}
              sub={kpis.tasaConversion.sub}
              accent="var(--success)"
            />
            <KPICard
              label="Ticket promedio"
              value={kpis.ticketPromedio.value}
              delta={kpis.ticketPromedio.delta}
              deltaKind={kpis.ticketPromedio.deltaKind}
              sub={kpis.ticketPromedio.sub}
              accent="var(--stage-cotizacion)"
            />
            <KPICard
              label="Cierres del mes"
              value={kpis.cierresMes.value}
              delta={kpis.cierresMes.delta}
              deltaKind={kpis.cierresMes.deltaKind}
              sub={kpis.cierresMes.sub}
              accent="var(--warning)"
            />
            <KPICard
              label="Cotizaciones pendientes"
              value={kpis.cotizacionesPendientes.value}
              delta={kpis.cotizacionesPendientes.delta}
              deltaKind={kpis.cotizacionesPendientes.deltaKind}
              sub={kpis.cotizacionesPendientes.sub}
              accent="var(--stage-negociacion)"
            />
          </>)}
        </div>

        {/* Sales + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
          {kpiLoading ? (
            <><ChartSkeleton span={8} h={200} /><SmallSkeleton span={4} /></>
          ) : (
            <><SalesChart /><FunnelChart /></>
          )}
        </div>

        {/* Team + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
          {kpiLoading ? (
            <><TableSkeleton span={8} /><SmallSkeleton span={4} /></>
          ) : (
            <><TeamTable /><ActivityFeed /></>
          )}
        </div>

        {/* Heatmap + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
          {kpiLoading ? (
            <><ChartSkeleton span={8} h={160} /><SmallSkeleton span={4} /></>
          ) : (
            <><GeoHeatmap /><AlertsPanel /></>
          )}
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
      <AdminSidebar active={activeNav} onChange={setActiveNav} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AdminTopBar
          title={meta.title}
          subtitle={meta.subtitle}
          dark={dark}
          onToggleDark={onToggleDark}
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
