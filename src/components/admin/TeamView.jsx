import React, { useState, useRef, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { MOCK_SELLERS, MOCK_ACTIVITY } from '../../constants/mockData'

// ─── Extended seller data ─────────────────────────────────────────────────────
const INIT_EXT = {
  LR: { role: 'seller', status: 'active',   zone: 'Querétaro',    email: 'lramirez@kiuvo.mx',    lastSeen: 'Hoy, 10:32',   meta: 100000 },
  MS: { role: 'seller', status: 'active',   zone: 'CDMX Norte',   email: 'msanchez@kiuvo.mx',    lastSeen: 'Hoy, 09:18',   meta: 120000 },
  JT: { role: 'seller', status: 'active',   zone: 'Guadalajara',  email: 'jtrevino@kiuvo.mx',    lastSeen: 'Ayer, 16:44',  meta: 80000  },
  AD: { role: 'admin',  status: 'active',   zone: 'Monterrey',    email: 'adominguez@kiuvo.mx',  lastSeen: 'Hoy, 11:05',   meta: 100000 },
  RC: { role: 'seller', status: 'inactive', zone: 'CDMX Sur',     email: 'rcardenas@kiuvo.mx',   lastSeen: 'hace 3 días',  meta: 90000  },
}

const SELLER_ACTIVITY = {
  LR: [
    { what: 'Registró visita',     target: 'Distribuidora Norte',     detail: '4ª visita',    time: 'hace 12 min', kind: 'visit' },
    { what: 'Creó cotización',     target: 'Grupo Metálico SA',       detail: '$42,000',      time: 'hace 2 h',    kind: 'quote' },
    { what: 'Movió a Negociación', target: 'Plastiforte del Bajío',   detail: '',             time: 'hace 4 h',    kind: 'stage' },
    { what: 'Llamada registrada',  target: 'Aceros Centrales',        detail: '8 min',        time: 'ayer',        kind: 'call'  },
    { what: 'Nuevo prospecto',     target: 'Cables y Alambres SRL',   detail: '$28,000 est.', time: 'ayer',        kind: 'new'   },
    { what: 'Registró visita',     target: 'Ferretera Bajío',         detail: '2ª visita',    time: 'hace 2 días', kind: 'visit' },
  ],
  MS: [
    { what: 'Cerró venta',         target: 'Hidráulica del Pacífico', detail: '$35,000',      time: 'hace 4 min',  kind: 'win'   },
    { what: 'Registró visita',     target: 'Metalúrgica Morelos',     detail: '2ª visita',    time: 'hace 1 h',    kind: 'visit' },
    { what: 'Envió cotización',    target: 'Distribuidora Latina',    detail: '$67,500',      time: 'hace 3 h',    kind: 'quote' },
    { what: 'Movió a Cierre',      target: 'Plastinova SA',           detail: '',             time: 'ayer',        kind: 'stage' },
    { what: 'Llamada registrada',  target: 'Hidráulica del Pacífico', detail: '15 min',       time: 'ayer',        kind: 'call'  },
    { what: 'Nuevo prospecto',     target: 'Troquelados Oriente',     detail: '$55,000 est.', time: 'hace 2 días', kind: 'new'   },
  ],
  JT: [
    { what: 'Registró visita',     target: 'Empaques del Norte',      detail: '1ª visita',    time: 'hace 30 min', kind: 'visit' },
    { what: 'Llamada registrada',  target: 'Metalúrgica GDL',         detail: '12 min',       time: 'hace 2 h',    kind: 'call'  },
    { what: 'Creó cotización',     target: 'Plásticos del Pacífico',  detail: '$31,000',      time: 'hace 5 h',    kind: 'quote' },
    { what: 'Nuevo prospecto',     target: 'Siderúrgica Occidente',   detail: '$48,000 est.', time: 'ayer',        kind: 'new'   },
    { what: 'Registró visita',     target: 'Ferretera Central GDL',   detail: '3ª visita',    time: 'hace 2 días', kind: 'visit' },
    { what: 'Movió a Cotización',  target: 'Empaques del Norte',      detail: '',             time: 'hace 3 días', kind: 'stage' },
  ],
  AD: [
    { what: 'Cerró venta',         target: 'Grupo Industrial MTY',    detail: '$52,000',      time: 'hace 1 h',    kind: 'win'   },
    { what: 'Registró visita',     target: 'Aceros del Norte SA',     detail: '5ª visita',    time: 'hace 3 h',    kind: 'visit' },
    { what: 'Envió cotización',    target: 'Plastimex Monterrey',     detail: '$44,000',      time: 'hace 5 h',    kind: 'quote' },
    { what: 'Llamada registrada',  target: 'Metalúrgica Regia',       detail: '20 min',       time: 'ayer',        kind: 'call'  },
    { what: 'Nuevo prospecto',     target: 'Hidráulica Regiomontana', detail: '$60,000 est.', time: 'hace 2 días', kind: 'new'   },
    { what: 'Movió a Negociación', target: 'Aceros del Norte SA',     detail: '',             time: 'hace 3 días', kind: 'stage' },
  ],
  RC: [
    { what: 'Registró visita',     target: 'Ferretera Sur CDMX',      detail: '2ª visita',    time: 'hace 3 días', kind: 'visit' },
    { what: 'Llamada registrada',  target: 'Plásticos del Valle',     detail: '5 min',        time: 'hace 4 días', kind: 'call'  },
    { what: 'Creó cotización',     target: 'Metalúrgica Sur',         detail: '$22,000',      time: 'hace 5 días', kind: 'quote' },
    { what: 'Registró visita',     target: 'Cables Metropolitanos',   detail: '1ª visita',    time: 'hace 6 días', kind: 'visit' },
    { what: 'Nuevo prospecto',     target: 'Aceros Pedregal',         detail: '$19,000 est.', time: 'hace 1 sem',  kind: 'new'   },
    { what: 'Llamada registrada',  target: 'Ferretera Sur CDMX',      detail: '8 min',        time: 'hace 1 sem',  kind: 'call'  },
  ],
}

const KIND_CFG = {
  win:   { color: 'var(--success)',         icon: 'trophy'   },
  visit: { color: 'var(--kiuvo-blue)',      icon: 'map-pin'  },
  quote: { color: 'var(--stage-cotizacion,#EF9F27)', icon: 'file-text' },
  stage: { color: '#7C5CBF',               icon: 'arrows-horizontal' },
  call:  { color: 'var(--info,#378ADD)',    icon: 'phone'    },
  new:   { color: 'var(--success)',         icon: 'user-plus' },
}

const ROLE_CFG = {
  seller: { label: 'Vendedor',   color: '#378ADD',       bg: '#378ADD18' },
  admin:  { label: 'Admin',      color: 'var(--kiuvo-blue)', bg: 'var(--kiuvo-blue-soft,#185FA518)' },
}

const fmt = n => '$' + (n||0).toLocaleString('es-MX')

// ─── Utils ────────────────────────────────────────────────────────────────────
function useClickOutside(ref, handler) {
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) handler() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, handler])
}

// ─── Role Dropdown ────────────────────────────────────────────────────────────
function RoleDropdown({ current, onChange, onClose }) {
  const ref = useRef(null)
  useClickOutside(ref, onClose)
  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: 4,
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
      padding: 6, minWidth: 150,
    }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-tertiary)', padding: '2px 8px 6px', letterSpacing: 0.4 }}>
        CAMBIAR ROL
      </div>
      {Object.entries(ROLE_CFG).map(([k, cfg]) => (
        <button
          key={k}
          onClick={() => { onChange(k); onClose() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', borderRadius: 'var(--r-sm)', textAlign: 'left',
            background: current === k ? cfg.bg : 'transparent',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (current !== k) e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={e => { if (current !== k) e.currentTarget.style.background = 'transparent' }}
        >
          <Icon name={k === 'admin' ? 'shield-check' : 'user-cog'} size={14} color={cfg.color} />
          <span style={{ fontSize: 12, fontWeight: current === k ? 500 : 400, color: current === k ? cfg.color : 'var(--fg)' }}>
            {cfg.label}
          </span>
          {current === k && <Icon name="check" size={12} color={cfg.color} style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ onClose }) {
  const [role, setRole] = useState('seller')
  const [name, setName] = useState('')
  const [token]  = useState(() => Math.random().toString(36).slice(2, 12))
  const [copied, setCopied] = useState(false)
  const backdropRef = useRef(null)

  const link = `https://crm.kiuvo.org/registro?inv=${token}&rol=${role}${name ? '&nombre=' + encodeURIComponent(name) : ''}`

  function copyLink() {
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  function shareWhatsApp() {
    const msg = `Te invito a unirte a KIUVO CRM${name ? `, ${name}` : ''}.\n\nCompleta tu registro aquí:\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>
      <div style={{
        width: 440, background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        border: '0.5px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        animation: 'slideUp 0.18s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--kiuvo-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="user-plus" size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Invitar al equipo</div>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>Genera un link de registro · válido 7 días</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Name field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
              Nombre del invitado (opcional)
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              style={{
                width: '100%', padding: '8px 10px', fontSize: 13,
                background: 'var(--bg)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
              Rol asignado al registrarse
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(ROLE_CFG).map(([k, cfg]) => (
                <button
                  key={k}
                  onClick={() => setRole(k)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${role === k ? cfg.color : 'var(--border)'}`,
                    background: role === k ? cfg.bg : 'var(--bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all 0.12s',
                  }}
                >
                  <Icon name={k === 'admin' ? 'shield-check' : 'user-cog'} size={20} color={role === k ? cfg.color : 'var(--fg-tertiary)'} />
                  <span style={{ fontSize: 12, fontWeight: role === k ? 600 : 400, color: role === k ? cfg.color : 'var(--fg-secondary)' }}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generated link */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>
              Link de registro
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)',
              overflow: 'hidden',
            }}>
              <div style={{
                flex: 1, padding: '9px 12px', fontSize: 11,
                color: 'var(--fg-secondary)', fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {link}
              </div>
              <button
                onClick={copyLink}
                style={{
                  padding: '9px 14px', borderLeft: '0.5px solid var(--border)',
                  background: copied ? 'var(--success)' : 'var(--surface)',
                  color: copied ? '#fff' : 'var(--fg-secondary)',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
                  flexShrink: 0, transition: 'all 0.2s',
                }}
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} color={copied ? '#fff' : 'var(--fg-secondary)'} />
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="alert-circle" size={11} color="var(--fg-tertiary)" />
              Link de un solo uso · expira en 7 días
            </div>
          </div>

          {/* Share actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copyLink}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                background: 'var(--bg)', border: '0.5px solid var(--border)',
                color: 'var(--fg)', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon name="link" size={15} />
              Copiar link
            </button>
            <button
              onClick={shareWhatsApp}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                background: '#25D366', color: '#fff',
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon name="brand-whatsapp" size={15} color="#fff" />
              Enviar por WhatsApp
            </button>
            <button
              onClick={() => { window.open(`mailto:?subject=Invitación KIUVO CRM&body=Te invito a unirte: ${link}`) }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                color: 'var(--fg)', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon name="mail" size={15} />
              Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function SellerDetailPanel({ seller, ext: extProp, onUpdateExt, onClose }) {
  const ext = extProp || { role: 'seller', status: 'active', zone: '—', email: '', lastSeen: '—', meta: seller?.goal || 0 }
  const [tab, setTab]         = useState('activity')
  const [editMeta, setEditMeta] = useState(false)
  const [metaDraft, setMetaDraft] = useState(String(ext.meta))
  const [editZone, setEditZone]  = useState(false)
  const [zoneDraft, setZoneDraft] = useState(ext.zone)
  const [roleOpen, setRoleOpen]  = useState(false)
  const roleBtnRef = useRef(null)

  const pct        = Math.round((seller.current / (ext.meta || seller.goal)) * 100)
  const compColor  = seller.compliance >= 85 ? 'var(--success)' : seller.compliance >= 75 ? 'var(--warning)' : 'var(--danger)'
  const roleCfg    = ROLE_CFG[ext.role] || ROLE_CFG.seller
  const acts       = SELLER_ACTIVITY[seller.init] || []

  function saveMeta() {
    const v = parseInt(metaDraft.replace(/\D/g, ''), 10)
    if (v > 0) onUpdateExt('meta', v)
    setEditMeta(false)
  }
  function saveZone() {
    if (zoneDraft.trim()) onUpdateExt('zone', zoneDraft.trim())
    setEditZone(false)
  }

  return (
    <div style={{
      width: 340, flexShrink: 0, borderLeft: '0.5px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s ease',
    }}>
      <style>{`@keyframes slideInRight { from { transform:translateX(20px);opacity:0 } to { transform:translateX(0);opacity:1 } }`}</style>

      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Perfil del vendedor</div>
          <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 2 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: seller.color + '22', color: seller.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 600, border: `2px solid ${seller.color}44`,
          }}>{seller.init}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{seller.name}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{ext.email}</div>
          </div>
        </div>

        {/* Status + role row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          {/* Role badge + dropdown */}
          <div ref={roleBtnRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setRoleOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 'var(--r-full)',
                background: roleCfg.bg, color: roleCfg.color,
                fontSize: 11, fontWeight: 500, border: `1px solid ${roleCfg.color}40`,
              }}
            >
              <Icon name={ext.role === 'admin' ? 'shield-check' : 'user-cog'} size={12} color={roleCfg.color} />
              {roleCfg.label}
              <Icon name="chevron-down" size={10} color={roleCfg.color} style={{ transition: 'transform 0.15s', transform: roleOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {roleOpen && (
              <RoleDropdown current={ext.role} onChange={v => { onUpdateExt('role', v); setRoleOpen(false) }} onClose={() => setRoleOpen(false)} />
            )}
          </div>

          {/* Status toggle */}
          <button
            onClick={() => onUpdateExt('status', ext.status === 'active' ? 'inactive' : 'active')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 500,
              background: ext.status === 'active' ? '#1D9E7518' : 'var(--bg-secondary)',
              color: ext.status === 'active' ? 'var(--success)' : 'var(--fg-tertiary)',
              border: `1px solid ${ext.status === 'active' ? '#1D9E7540' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ext.status === 'active' ? 'var(--success)' : 'var(--fg-tertiary)', flexShrink: 0 }} />
            {ext.status === 'active' ? 'Activo' : 'Inactivo'}
          </button>

          <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-tertiary)' }}>
            {ext.lastSeen}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '0.5px solid var(--border)', flexShrink: 0,
        padding: '0 18px', background: 'var(--bg)',
      }}>
        {[['activity', 'history', 'Actividad'], ['config', 'settings', 'Configuración']].map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 14px', fontSize: 12, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)',
              borderBottom: tab === id ? '2px solid var(--kiuvo-blue)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 5, marginBottom: -1,
              transition: 'color 0.12s',
            }}
          >
            <Icon name={icon} size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Actividad tab ── */}
      {tab === 'activity' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Meta',           value: fmt(ext.meta || seller.goal), icon: 'target',      color: 'var(--kiuvo-blue)' },
              { label: 'Avance',         value: fmt(seller.current),          icon: 'trending-up', color: pct >= 80 ? 'var(--success)' : 'var(--warning)' },
              { label: 'Prospectos',     value: seller.prospects,             icon: 'users',       color: 'var(--fg)' },
              { label: 'Ganado total',   value: fmt(seller.won),              icon: 'trophy',      color: 'var(--success)' },
            ].map(m => (
              <div key={m.label} style={{
                padding: '10px 12px', background: 'var(--bg)',
                borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: m.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={m.icon} size={14} color={m.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Meta progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: 'var(--fg-secondary)' }}>Meta mensual</span>
              <span style={{ fontWeight: 600, color: compColor }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? 'var(--success)' : seller.color, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 3 }}>
              <span>{fmt(seller.current)}</span>
              <span>{fmt(ext.meta || seller.goal)}</span>
            </div>
          </div>

          {/* Compliance */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: 'var(--fg-secondary)' }}>Cumplimiento seguimiento</span>
              <span style={{ fontWeight: 600, color: compColor }}>{seller.compliance}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${seller.compliance}%`, height: '100%', background: compColor, borderRadius: 2 }} />
            </div>
          </div>

          {/* Activity timeline */}
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 10 }}>Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {acts.map((a, i) => {
              const kc = KIND_CFG[a.kind] || KIND_CFG.visit
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, paddingBottom: 12,
                  borderLeft: i < acts.length - 1 ? `1.5px solid var(--border)` : 'none',
                  paddingLeft: 14, marginLeft: 5, position: 'relative',
                }}>
                  {/* dot */}
                  <div style={{
                    position: 'absolute', left: -5, top: 2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: kc.color, border: '2px solid var(--surface)',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--fg)' }}>
                      <span style={{ color: 'var(--fg-secondary)' }}>{a.what}</span>{' '}
                      <span style={{ fontWeight: 500 }}>{a.target}</span>
                      {a.detail && <span style={{ color: kc.color, fontWeight: 500, marginLeft: 4 }}>· {a.detail}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Configuración tab ── */}
      {tab === 'config' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* Rol */}
          <Section label="Rol en el sistema">
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(ROLE_CFG).map(([k, cfg]) => (
                <button
                  key={k}
                  onClick={() => onUpdateExt('role', k)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${ext.role === k ? cfg.color : 'var(--border)'}`,
                    background: ext.role === k ? cfg.bg : 'var(--bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all 0.12s',
                  }}
                >
                  <Icon name={k === 'admin' ? 'shield-check' : 'user-cog'} size={20} color={ext.role === k ? cfg.color : 'var(--fg-tertiary)'} />
                  <span style={{ fontSize: 12, fontWeight: ext.role === k ? 600 : 400, color: ext.role === k ? cfg.color : 'var(--fg-secondary)' }}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Estado */}
          <Section label="Estado de la cuenta">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>
                  {ext.status === 'active' ? 'Cuenta activa' : 'Cuenta desactivada'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>
                  {ext.status === 'active' ? 'El vendedor puede iniciar sesión' : 'No puede iniciar sesión'}
                </div>
              </div>
              <button
                onClick={() => onUpdateExt('status', ext.status === 'active' ? 'inactive' : 'active')}
                style={{ padding: '6px 14px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500,
                  background: ext.status === 'active' ? 'var(--success)' : 'var(--bg-tertiary)',
                  color: ext.status === 'active' ? '#fff' : 'var(--fg-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {ext.status === 'active' ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </Section>

          {/* Zona */}
          <Section label="Zona asignada">
            {editZone ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={zoneDraft}
                  onChange={e => setZoneDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveZone(); if (e.key === 'Escape') setEditZone(false) }}
                  style={{ flex: 1, padding: '8px 10px', fontSize: 13, background: 'var(--bg)', border: '0.5px solid var(--kiuvo-blue)', borderRadius: 'var(--r-md)', color: 'var(--fg)', outline: 'none' }}
                />
                <button onClick={saveZone} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--kiuvo-blue)', color: '#fff', fontSize: 12 }}>
                  <Icon name="check" size={14} color="#fff" />
                </button>
                <button onClick={() => setEditZone(false)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--fg)', fontSize: 12 }}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="map-pin" size={14} color="var(--fg-secondary)" />
                  <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{ext.zone}</span>
                </div>
                <button onClick={() => setEditZone(true)} style={{ color: 'var(--fg-tertiary)' }}>
                  <Icon name="pencil" size={14} />
                </button>
              </div>
            )}
          </Section>

          {/* Meta mensual */}
          <Section label="Meta mensual de ventas">
            {editMeta ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--fg-tertiary)' }}>$</span>
                  <input
                    autoFocus
                    value={metaDraft}
                    onChange={e => setMetaDraft(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') saveMeta(); if (e.key === 'Escape') setEditMeta(false) }}
                    style={{ width: '100%', padding: '8px 10px 8px 20px', fontSize: 13, background: 'var(--bg)', border: '0.5px solid var(--kiuvo-blue)', borderRadius: 'var(--r-md)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button onClick={saveMeta} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--kiuvo-blue)', color: '#fff' }}>
                  <Icon name="check" size={14} color="#fff" />
                </button>
                <button onClick={() => setEditMeta(false)} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--fg)' }}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="target" size={14} color="var(--fg-secondary)" />
                  <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(ext.meta)}</span>
                </div>
                <button onClick={() => { setMetaDraft(String(ext.meta)); setEditMeta(true) }} style={{ color: 'var(--fg-tertiary)' }}>
                  <Icon name="pencil" size={14} />
                </button>
              </div>
            )}
          </Section>

          {/* Contact */}
          <Section label="Contacto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <Icon name="mail" size={14} color="var(--fg-secondary)" />
              <span style={{ fontSize: 12, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{ext.email}</span>
            </div>
          </Section>

          {/* Danger zone */}
          <div style={{ marginTop: 24, padding: '14px', background: 'var(--danger-bg,#FF545410)', border: '0.5px solid var(--danger,#E53E3E)30', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger,#E53E3E)', marginBottom: 8, letterSpacing: 0.4 }}>ZONA DE PELIGRO</div>
            <button
              onClick={() => onUpdateExt('status', ext.status === 'inactive' ? 'active' : 'inactive')}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--danger,#E53E3E)',
                background: 'transparent', color: 'var(--danger,#E53E3E)',
                fontSize: 12, fontWeight: 500,
              }}
            >
              {ext.status === 'active' ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 7, letterSpacing: 0.2 }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function TeamView() {
  const [exts,        setExts]        = useState(INIT_EXT)
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('all')
  const [statFilter,  setStatFilter]  = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [showInvite,  setShowInvite]  = useState(false)
  const [roleDropFor, setRoleDropFor] = useState(null) // init of seller with open dropdown

  const sellers = MOCK_SELLERS.map(s => ({
    ...s,
    ext: exts[s.init] || { role: 'seller', status: 'active', zone: '—', email: '', lastSeen: '—', meta: s.goal },
  }))

  const filtered = sellers.filter(s => {
    const q = search.toLowerCase()
    const matchQ  = !q || s.name.toLowerCase().includes(q) || s.ext.zone.toLowerCase().includes(q) || s.ext.email.toLowerCase().includes(q)
    const matchR  = roleFilter === 'all' || s.ext.role === roleFilter
    const matchSt = statFilter === 'all' || s.ext.status === statFilter
    return matchQ && matchR && matchSt
  })

  function updateExt(init, key, val) {
    setExts(prev => ({ ...prev, [init]: { ...prev[init], [key]: val } }))
    if (selected?.init === init) {
      setSelected(prev => prev ? { ...prev, ext: { ...prev.ext, [key]: val } } : null)
    }
  }

  function handleRoleChange(init, newRole) {
    updateExt(init, 'role', newRole)
    setRoleDropFor(null)
  }

  const sorted = [...filtered].sort((a, b) => {
    const statOrder = { active: 0, inactive: 1 }
    return (statOrder[a.ext.status] || 0) - (statOrder[b.ext.status] || 0) || (b.current / b.goal) - (a.current / a.goal)
  })

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, width: '100%', minWidth: 0, overflow: 'hidden' }}>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', flexShrink: 0,
        }}>
          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--kiuvo-blue)', color: '#fff',
              fontSize: 13, fontWeight: 500, flexShrink: 0,
            }}
          >
            <Icon name="user-plus" size={15} color="#fff" />
            Invitar vendedor
          </button>

          <div style={{ width: '0.5px', height: 24, background: 'var(--border)' }} />

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', flex: 1, maxWidth: 260,
          }}>
            <Icon name="search" size={14} color="var(--fg-tertiary)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar vendedor, zona o email…"
              style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--fg)', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Role filter */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2 }}>
            {[['all', 'Todos'], ['seller', 'Vendedores'], ['admin', 'Admins']].map(([k, l]) => (
              <button key={k} onClick={() => setRoleFilter(k)} style={{
                padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11,
                background: roleFilter === k ? 'var(--bg)' : 'transparent',
                color: roleFilter === k ? 'var(--fg)' : 'var(--fg-secondary)',
                fontWeight: roleFilter === k ? 500 : 400,
                border: roleFilter === k ? '0.5px solid var(--border)' : 'none',
              }}>{l}</button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2 }}>
            {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([k, l]) => (
              <button key={k} onClick={() => setStatFilter(k)} style={{
                padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11,
                background: statFilter === k ? 'var(--bg)' : 'transparent',
                color: statFilter === k ? 'var(--fg)' : 'var(--fg-secondary)',
                fontWeight: statFilter === k ? 500 : 400,
                border: statFilter === k ? '0.5px solid var(--border)' : 'none',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-tertiary)' }}>
            {filtered.length} vendedor{filtered.length !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Vendedor', 'Rol', 'Zona', 'Meta mensual', 'Cumplimiento', 'Prospectos', 'Último acceso', 'Estado', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '9px 14px', textAlign: i === 0 ? 'left' : 'center',
                    fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                    borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const { ext } = s
                const roleCfg = ROLE_CFG[ext.role] || ROLE_CFG.seller
                const compColor = s.compliance >= 85 ? 'var(--success)' : s.compliance >= 75 ? 'var(--warning)' : 'var(--danger)'
                const pct = Math.round((s.current / (ext.meta || s.goal)) * 100)
                const isSelected = selected?.init === s.init
                const isInactive = ext.status === 'inactive'

                return (
                  <tr
                    key={s.id}
                    onClick={() => { setSelected(isSelected ? null : { ...s }); setRoleDropFor(null) }}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--kiuvo-blue-soft)' : 'transparent',
                      opacity: isInactive ? 0.55 : 1,
                      transition: 'background 0.1s, opacity 0.15s',
                    }}
                  >
                    {/* Vendedor */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: s.color + '22', color: s.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600,
                        }}>{s.init}</div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{ext.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rol (clickable dropdown) */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setRoleDropFor(prev => prev === s.init ? null : s.init) }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 'var(--r-full)',
                            background: roleCfg.bg, color: roleCfg.color,
                            fontSize: 11, fontWeight: 500, border: `1px solid ${roleCfg.color}40`,
                          }}
                        >
                          <Icon name={ext.role === 'admin' ? 'shield-check' : 'user-cog'} size={11} color={roleCfg.color} />
                          {roleCfg.label}
                          <Icon name="chevron-down" size={9} color={roleCfg.color} />
                        </button>
                        {roleDropFor === s.init && (
                          <RoleDropdown
                            current={ext.role}
                            onChange={role => handleRoleChange(s.init, role)}
                            onClose={() => setRoleDropFor(null)}
                          />
                        )}
                      </div>
                    </td>

                    {/* Zona */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--fg-secondary)' }}>
                      {ext.zone}
                    </td>

                    {/* Meta mensual con barra */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', marginBottom: 3 }}>
                        {pct}%
                      </div>
                      <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, width: 80, margin: '0 auto' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? 'var(--success)' : s.color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(s.current)} / {fmt(ext.meta)}
                      </div>
                    </td>

                    {/* Cumplimiento */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 500,
                        background: compColor + '18', color: compColor,
                      }}>{s.compliance}%</span>
                    </td>

                    {/* Prospectos */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                      {s.prospects}
                    </td>

                    {/* Último acceso */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--fg-tertiary)' }}>
                      {ext.lastSeen}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); updateExt(s.init, 'status', ext.status === 'active' ? 'inactive' : 'active') }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 500,
                          background: ext.status === 'active' ? '#1D9E7518' : 'var(--bg-secondary)',
                          color: ext.status === 'active' ? 'var(--success)' : 'var(--fg-tertiary)',
                          border: `1px solid ${ext.status === 'active' ? '#1D9E7540' : 'var(--border)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: ext.status === 'active' ? 'var(--success)' : 'var(--fg-tertiary)', flexShrink: 0 }} />
                        {ext.status === 'active' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>

                    {/* Arrow */}
                    <td style={{ padding: '11px 10px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
                      <Icon name="chevron-right" size={14} color="var(--fg-tertiary)" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <SellerDetailPanel
          seller={selected}
          ext={exts[selected.init] || INIT_EXT[selected.init]}
          onUpdateExt={(key, val) => updateExt(selected.init, key, val)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Invite modal ── */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
