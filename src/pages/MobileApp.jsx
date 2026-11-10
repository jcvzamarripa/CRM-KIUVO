import React, { useState, Suspense, lazy } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import ErrorBoundary from '../components/shared/ErrorBoundary'
import BottomNav from '../components/mobile/BottomNav'
import Dashboard from '../components/mobile/Dashboard'
import Kanban from '../components/mobile/Kanban'
import CheckInModal from '../components/mobile/CheckInModal'
import NewProspectModal from '../components/mobile/NewProspectModal'
import NotificationsPanel from '../components/mobile/NotificationsPanel'
import WhatsAppModal from '../components/mobile/WhatsAppModal'
import AgendaScreen from '../components/mobile/AgendaScreen'
import ReactivadorModal from '../components/mobile/ReactivadorModal'
import ProfileScreen from '../components/mobile/ProfileScreen'
import MapScreen from '../components/mobile/MapScreen'
import Icon from '../components/shared/Icon'
import { Card, Empty } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

// Carga lazy: react-pdf (~1.4 MB) solo cuando el usuario abre el módulo de cotizaciones
const QuoteModal         = lazy(() => import('../components/mobile/QuoteModal'))
const SellerQuotesScreen = lazy(() => import('../components/mobile/SellerQuotesScreen'))

function PlaceholderScreen({ title, icon }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '14px 14px 120px' }}>
      <div className="k-h1" style={{ margin: '4px 4px 16px' }}>{title}</div>
      <Card><Empty icon={icon}>Próximamente</Empty></Card>
    </div>
  )
}

function MenuRow({ icon, title, sub, onClick, danger }) {
  return (
    <button onClick={onClick} className="k-row" style={{ minHeight: 72, color: danger ? 'var(--coral-fg)' : 'var(--fg)' }}>
      <span className="k-iconbtn k-iconbtn--soft" style={danger ? { background: 'var(--coral-soft)', color: 'var(--coral-fg)' } : undefined}>
        <Icon name={icon} size={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, marginTop: 2, color: danger ? 'inherit' : 'var(--fg-secondary)' }}>{sub}</span>
      </span>
      {!danger && <Icon name="chevron-right" size={20} color="var(--fg-tertiary)" />}
    </button>
  )
}

export default function MobileApp({ dark, onToggleDark }) {
  const [screen, setScreen] = useState('inicio')
  const [checkIn, setCheckIn] = useState(null)   // null | { prospect, type }
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNewProspect, setShowNewProspect] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [agendaEvent, setAgendaEvent] = useState(null)
  const [agendaPrefill, setAgendaPrefill] = useState(null)
  const [kanbanJump, setKanbanJump] = useState(null)
  const [showReactivador, setShowReactivador] = useState(false)
  const [masSubScreen,   setMasSubScreen]   = useState(null)  // null | 'perfil' | 'cotizaciones'
  const { profile, signOut } = useAuth()
  const notifications = useNotifications()

  const goKanban = (stageId) => { setKanbanJump(stageId ? { stage: stageId, ts: Date.now() } : null); setScreen('embudo') }
  const handleNotifNavigate = ({ screen: s, stage }) => {
    if (stage) setKanbanJump({ stage, ts: Date.now() })
    setScreen(s)
  }
  const goAgenda = () => setScreen('agenda')
  const openAgendaEvent = ev => { setAgendaEvent(ev); setScreen('agenda') }
  const scheduleReactivation = (client) => {
    setAgendaPrefill({ title: client.name, type: 'visit' })
    setScreen('agenda')
  }

  let content
  if (screen === 'inicio')
    content = <Dashboard
      profile={profile}
      dark={dark}
      onToggleDark={onToggleDark}
      onOpenKanban={goKanban}
      onRegisterVisit={() => setCheckIn({ type: 'call' })}
      refreshKey={refreshKey}
      onNewProspect={() => setShowNewProspect(true)}
      onOpenNotifications={() => setShowNotifications(true)}
      onQuote={() => setShowQuote(true)}
      onWhatsApp={() => setShowWhatsApp(true)}
      onOpenAgenda={goAgenda}
      onOpenAgendaEvent={openAgendaEvent}
      onOpenReactivador={() => setShowReactivador(true)}
      unreadCount={notifications.unreadCount}
    />
  else if (screen === 'embudo')
    content = <Kanban jumpTo={kanbanJump} onCheckIn={prospect => setCheckIn({ prospect })} onOpenNotifications={() => setShowNotifications(true)} unreadCount={notifications.unreadCount} />
  else if (screen === 'mapa')
    content = <MapScreen />
  else if (screen === 'agenda')
    content = <AgendaScreen
      pendingEvent={agendaEvent}
      onClearPending={() => setAgendaEvent(null)}
      prefillEvent={agendaPrefill}
      onClearPrefill={() => setAgendaPrefill(null)}
    />
  else if (masSubScreen === 'perfil')
    content = <ProfileScreen onBack={() => setMasSubScreen(null)} />
  else if (masSubScreen === 'cotizaciones')
    content = <Suspense fallback={null}><SellerQuotesScreen onBack={() => setMasSubScreen(null)} /></Suspense>
  else
    content = (
      <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '14px 14px 120px' }}>
        <div className="k-h1" style={{ margin: '4px 4px 16px' }}>Más opciones</div>
        <Card flush>
          <MenuRow icon="file-invoice" title="Mis cotizaciones" sub="Historial y descarga de PDFs" onClick={() => setMasSubScreen('cotizaciones')} />
          <MenuRow icon="user-circle" title="Perfil" sub="Foto, nombre y preferencias" onClick={() => setMasSubScreen('perfil')} />
        </Card>
        <Card flush style={{ marginTop: 12 }}>
          <MenuRow danger icon="logout" title="Cerrar sesión" sub="Salir de la cuenta" onClick={signOut} />
        </Card>
      </div>
    )

  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 'env(safe-area-inset-top, 0px)', bottom: 0, left: 0, right: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <ErrorBoundary key={screen}>
          {content}
        </ErrorBoundary>
      </div>
      <BottomNav
        active={screen}
        onChange={id => { setMasSubScreen(null); setScreen(id) }}
        onCheckIn={() => setCheckIn({})}
      />
      {checkIn && (
        <CheckInModal
          initialProspect={checkIn.prospect}
          initialType={checkIn.type}
          onClose={() => setCheckIn(null)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
      {showNewProspect   && <NewProspectModal  onClose={() => setShowNewProspect(false)} />}
      {showNotifications && (
        <NotificationsPanel
          onClose={() => setShowNotifications(false)}
          onNavigate={handleNotifNavigate}
          items={notifications.items}
          loading={notifications.loading}
          unreadCount={notifications.unreadCount}
          markRead={notifications.markRead}
          markAll={notifications.markAll}
          dismiss={notifications.dismiss}
          dismissRead={notifications.dismissRead}
        />
      )}
      {showQuote         && <Suspense fallback={null}><QuoteModal onClose={() => setShowQuote(false)} /></Suspense>}
      {showWhatsApp      && <WhatsAppModal     onClose={() => setShowWhatsApp(false)} />}
      {showReactivador   && <ReactivadorModal  onClose={() => setShowReactivador(false)} onSchedule={scheduleReactivation} />}
    </div>
  )
}
