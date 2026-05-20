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

export default function MobileApp({ dark }) {
  const [screen, setScreen] = useState('inicio')
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showNewProspect, setShowNewProspect] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const { profile, signOut } = useAuth()
  const goKanban = () => setScreen('embudo')

  let content
  if (screen === 'inicio')      content = <Dashboard profile={profile} alertHero={false} onOpenKanban={goKanban} onRegisterVisit={() => setShowVisitModal(true)} onNewProspect={() => setShowNewProspect(true)} onOpenNotifications={() => setShowNotifications(true)} onQuote={() => setShowQuote(true)} onWhatsApp={() => setShowWhatsApp(true)} />
  else if (screen === 'embudo') content = <Kanban />
  else if (screen === 'mapa')   content = <MapScreen />
  else if (screen === 'agenda') content = <PlaceholderScreen title="Agenda" icon="calendar" />
  else                          content = (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: '16px 16px 92px' }}>
      <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', marginBottom: 16 }}>Más opciones</div>
      <button onClick={signOut} style={{
        width: '100%', padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--r-md)', color: 'var(--danger)', fontSize: 14,
      }}>
        <Icon name="logout" size={18} color="var(--danger)" />
        Cerrar sesión
      </button>
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
      {showVisitModal && <VisitModal onClose={() => setShowVisitModal(false)} />}
      {showNewProspect && <NewProspectModal onClose={() => setShowNewProspect(false)} />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      {showQuote && <QuoteModal onClose={() => setShowQuote(false)} />}
      {showWhatsApp && <WhatsAppModal onClose={() => setShowWhatsApp(false)} />}
    </div>
  )
}
