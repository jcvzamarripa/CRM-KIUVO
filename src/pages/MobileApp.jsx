import React, { useState } from 'react'
import StatusBar from '../components/mobile/StatusBar'
import BottomNav from '../components/mobile/BottomNav'
import Dashboard from '../components/mobile/Dashboard'
import Kanban from '../components/mobile/Kanban'
import MapScreen from '../components/mobile/MapScreen'
import VisitModal from '../components/mobile/VisitModal'
import NewProspectModal from '../components/mobile/NewProspectModal'
import NotificationsPanel from '../components/mobile/NotificationsPanel'
import QuoteModal from '../components/mobile/QuoteModal'
import WhatsAppModal from '../components/mobile/WhatsAppModal'
import AgendaScreen from '../components/mobile/AgendaScreen'
import ReactivadorModal from '../components/mobile/ReactivadorModal'
import ProfileScreen from '../components/mobile/ProfileScreen'
import Icon from '../components/shared/Icon'
import { useAuth } from '../contexts/AuthContext'

function PlaceholderScreen({ title, icon }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '16px 16px 92px' }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', marginBottom: 12 }}>{title}</div>
      <div style={{
        height: 400, border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--r-lg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-tertiary)', gap: 8,
      }}>
        <Icon name={icon} size={32} />
        <div style={{ fontSize: 12 }}>Próximamente</div>
      </div>
    </div>
  )
}

export default function MobileApp({ dark, onToggleDark }) {
  const [screen, setScreen] = useState('inicio')
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showNewProspect, setShowNewProspect] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [agendaEvent, setAgendaEvent] = useState(null)
  const [agendaPrefill, setAgendaPrefill] = useState(null)
  const [kanbanJump, setKanbanJump] = useState(null)
  const [showReactivador, setShowReactivador] = useState(false)
  const [masSubScreen,   setMasSubScreen]   = useState(null)  // null | 'perfil'
  const { profile, signOut } = useAuth()

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
      alertHero={false}
      onOpenKanban={goKanban}
      onRegisterVisit={() => setShowVisitModal(true)}
      onNewProspect={() => setShowNewProspect(true)}
      onOpenNotifications={() => setShowNotifications(true)}
      onQuote={() => setShowQuote(true)}
      onWhatsApp={() => setShowWhatsApp(true)}
      onOpenAgenda={goAgenda}
      onOpenAgendaEvent={openAgendaEvent}
      onOpenReactivador={() => setShowReactivador(true)}
    />
  else if (screen === 'embudo')
    content = <Kanban jumpTo={kanbanJump} onOpenNotifications={() => setShowNotifications(true)} />
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
    content = <ProfileScreen profile={profile} onBack={() => setMasSubScreen(null)} />
  else
    content = (
      <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '16px 16px 92px' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', marginBottom: 16 }}>Más opciones</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Perfil */}
          <button onClick={() => setMasSubScreen('perfil')} style={{
            width: '100%', padding: '14px',
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--r-md)', color: 'var(--fg)', fontSize: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--kiuvo-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="user-circle" size={20} color="var(--kiuvo-blue)" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 500 }}>Perfil</div>
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 1 }}>Foto, nombre y preferencias</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--fg-tertiary)" />
          </button>

          {/* Cerrar sesión */}
          <button onClick={signOut} style={{
            width: '100%', padding: '14px',
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--r-md)', color: 'var(--danger)', fontSize: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="logout" size={20} color="var(--danger)" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 500 }}>Cerrar sesión</div>
              <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 1 }}>Salir de la cuenta</div>
            </div>
          </button>
        </div>
      </div>
    )

  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      <StatusBar />
      <div style={{ position: 'absolute', top: 44, bottom: 0, left: 0, right: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {content}
      </div>
      <BottomNav active={screen} onChange={setScreen} />
      {showVisitModal    && <VisitModal       onClose={() => setShowVisitModal(false)} />}
      {showNewProspect   && <NewProspectModal  onClose={() => setShowNewProspect(false)} />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} onNavigate={handleNotifNavigate} />}
      {showQuote         && <QuoteModal        onClose={() => setShowQuote(false)} />}
      {showWhatsApp      && <WhatsAppModal     onClose={() => setShowWhatsApp(false)} />}
      {showReactivador   && <ReactivadorModal  onClose={() => setShowReactivador(false)} onSchedule={scheduleReactivation} />}
    </div>
  )
}
