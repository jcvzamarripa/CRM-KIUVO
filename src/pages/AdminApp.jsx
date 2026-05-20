import React, { useState } from 'react'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminTopBar from '../components/admin/AdminTopBar'
import KPICard from '../components/admin/KPICard'
import SalesChart from '../components/admin/SalesChart'
import FunnelChart from '../components/admin/FunnelChart'
import TeamTable from '../components/admin/TeamTable'
import ActivityFeed from '../components/admin/ActivityFeed'
import GeoHeatmap from '../components/admin/GeoHeatmap'
import AlertsPanel from '../components/admin/AlertsPanel'
import { MOCK_SALES_TREND } from '../constants/mockData'

export default function AdminApp({ dark }) {
  const [activeNav, setActiveNav] = useState('dashboard')

  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden',
    }}>
      <AdminSidebar active={activeNav} onChange={setActiveNav} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopBar />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
            <KPICard label="Ventas totales"           value="$758k"  delta="+12%"   deltaKind="good" sub="vs semana anterior"           accent="var(--kiuvo-blue)"            sparkline={MOCK_SALES_TREND} />
            <KPICard label="Prospectos activos"       value="142"    delta="+8"     deltaKind="good" sub="34 nuevos esta semana"         accent="var(--info)" />
            <KPICard label="Tasa de conversión"       value="18.4%"  delta="+2.1pp" deltaKind="good" sub="prospección → cierre"          accent="var(--success)" />
            <KPICard label="Ticket promedio"          value="$24.6k" delta="-3%"    deltaKind="bad"  sub="ventas ganadas"                accent="var(--stage-cotizacion)" />
            <KPICard label="Cumplimiento seguimiento" value="82%"    delta="+4pp"   deltaKind="good" sub="prospectos con ≥ visitas mín." accent="var(--warning)" />
            <KPICard label="Visitas por venta ganada" value="6.4"    delta=""       deltaKind=""     sub="vs 2.8 en perdidas"            accent="var(--stage-negociacion)" />
          </div>

          {/* Sales + Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
            <SalesChart />
            <FunnelChart />
          </div>

          {/* Team + Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
            <TeamTable />
            <ActivityFeed />
          </div>

          {/* Heatmap + Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
            <GeoHeatmap />
            <AlertsPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
