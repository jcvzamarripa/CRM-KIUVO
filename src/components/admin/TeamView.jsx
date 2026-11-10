import React, { useState } from 'react'
import Icon from '../shared/Icon'
import { useSellers } from '../../hooks/useSellers'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Card, Button, IconButton, Pill, Label, Avatar, Segmented, SearchInput, Modal, Empty, ProgressBar } from '../ui'

// Extended seller data — populated from state when admin edits (starts empty for real sellers)
const INIT_EXT = {}
const SELLER_ACTIVITY = {}

const KIND_ICON = {
  win:   'trophy',
  visit: 'map-pin',
  quote: 'file-text',
  stage: 'arrows-horizontal',
  call:  'phone',
  new:   'user-plus',
}

const ROLE_CFG = {
  seller: { label: 'Vendedor', icon: 'user-cog',     tone: 'sky' },
  admin:  { label: 'Admin',    icon: 'shield-check', tone: 'lilac' },
}
const ROLE_OPTIONS = Object.entries(ROLE_CFG).map(([id, cfg]) => ({ id, label: cfg.label, icon: cfg.icon }))

const fmt = n => '$' + (n||0).toLocaleString('es-MX')
const compTone = c => (c >= 85 ? 'success' : c >= 75 ? 'warning' : 'coral')

function StatusPill({ status }) {
  return (
    <Pill tone={status === 'active' ? 'success' : undefined}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {status === 'active' ? 'Activo' : 'Inactivo'}
    </Pill>
  )
}

// ─── Alta de vendedores ───────────────────────────────────────────────────────
function InviteModal({ onClose }) {
  return (
    <Modal title="Agregar vendedor" onClose={onClose} footer={<Button block onClick={onClose}>Entendido</Button>}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '4px 0 8px' }}>
        <span className="k-avatar" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          <Icon name="user-plus" size={20} />
        </span>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>
          Las cuentas nuevas se crean desde Supabase (Authentication → Users). Al crearse, el vendedor aparece aquí automáticamente.
          <div className="k-muted" style={{ fontSize: 13, marginTop: 10 }}>
            Toda cuenta nueva entra como vendedor. Desde esta pantalla puedes ajustar su meta mensual.
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function InfoRow({ icon, children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 6px 6px 16px', background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
      <Icon name={icon} size={18} color="var(--fg-secondary)" />
      <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</div>
      {action}
    </div>
  )
}

// ─── Detail ───────────────────────────────────────────────────────────────────
function SellerDetailPanel({ seller, ext: extProp, onUpdateExt, onClose }) {
  const ext = extProp || { role: 'seller', status: 'active', zone: '—', email: '', lastSeen: '—', meta: seller?.goal || 0 }
  const [tab, setTab]         = useState('activity')
  const [editMeta, setEditMeta] = useState(false)
  const [metaDraft, setMetaDraft] = useState(String(ext.meta))
  const [editZone, setEditZone]  = useState(false)
  const [zoneDraft, setZoneDraft] = useState(ext.zone)

  const goal       = ext.meta || seller.goal
  const pct        = Math.round((seller.current / goal) * 100)
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

  const kpis = [
    { label: 'Meta',         value: fmt(goal) },
    { label: 'Avance',       value: fmt(seller.current) },
    { label: 'Prospectos',   value: seller.prospects },
    { label: 'Ganado total', value: fmt(seller.won) },
  ]

  return (
    <Modal title="Perfil del vendedor" onClose={onClose}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <Avatar initials={seller.init} color={seller.color} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k-h2">{seller.name}</div>
          {ext.email && <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>{ext.email}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Pill tone={roleCfg.tone} icon={roleCfg.icon}>{roleCfg.label}</Pill>
        <StatusPill status={ext.status} />
        <span className="k-dim" style={{ fontSize: 13, marginLeft: 'auto' }}>Último acceso: {ext.lastSeen}</span>
      </div>

      <Segmented
        surface value={tab} onChange={setTab} style={{ marginBottom: 18 }}
        options={[
          { id: 'activity', label: 'Actividad',     icon: 'history' },
          { id: 'config',   label: 'Configuración', icon: 'settings' },
        ]}
      />

      {/* ── Actividad ── */}
      {tab === 'activity' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
            {kpis.map(m => (
              <Card key={m.label} style={{ padding: 14 }}>
                <div className="k-muted" style={{ fontSize: 13 }}>{m.label}</div>
                <div className="k-num" style={{ fontSize: 22, marginTop: 8 }}>{m.value}</div>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Meta mensual</span>
              <span className="k-num" style={{ fontSize: 18 }}>{pct}%</span>
            </div>
            <ProgressBar value={seller.current} max={goal} color={pct >= 80 ? 'var(--success)' : 'var(--primary-bg)'} />
            <div className="k-dim" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}>
              <span>{fmt(seller.current)}</span>
              <span>{fmt(goal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Cumplimiento de seguimiento</span>
              <Pill tone={compTone(seller.compliance)}>{seller.compliance}%</Pill>
            </div>
            <ProgressBar value={seller.compliance} max={100} color="var(--accent-2)" height={6} />
          </Card>

          <Label>Actividad reciente</Label>
          {acts.length === 0 ? (
            <Empty icon="history">Sin actividad registrada.</Empty>
          ) : (
            <Card flush>
              {acts.map((a, i) => (
                <div key={i} className="k-row">
                  <span className="k-avatar k-avatar--sm" style={{ background: 'var(--bg-secondary)', color: 'var(--fg)' }}>
                    <Icon name={KIND_ICON[a.kind] || KIND_ICON.visit} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>
                      <span className="k-muted">{a.what}</span>{' '}
                      <span style={{ fontWeight: 600 }}>{a.target}</span>
                      {a.detail && <span className="k-muted"> · {a.detail}</span>}
                    </div>
                    <div className="k-dim" style={{ fontSize: 12, marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── Configuración ── */}
      {tab === 'config' && (
        <div>
          <Section label="Rol en el sistema">
            <Segmented size="lg" surface options={ROLE_OPTIONS} value={ext.role} onChange={k => onUpdateExt('role', k)} />
          </Section>

          <Section label="Estado de la cuenta">
            <InfoRow
              icon={ext.status === 'active' ? 'circle-check' : 'circle-dashed'}
              action={
                <Button variant={ext.status === 'active' ? 'danger' : 'soft'} size="sm"
                  onClick={() => onUpdateExt('status', ext.status === 'active' ? 'inactive' : 'active')}>
                  {ext.status === 'active' ? 'Desactivar' : 'Reactivar'}
                </Button>
              }
            >
              {ext.status === 'active' ? 'Cuenta activa' : 'Cuenta desactivada'}
              <div className="k-dim" style={{ fontSize: 12, fontWeight: 400 }}>
                {ext.status === 'active' ? 'El vendedor puede iniciar sesión' : 'No puede iniciar sesión'}
              </div>
            </InfoRow>
          </Section>

          <Section label="Zona asignada">
            {editZone ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  className="k-input"
                  value={zoneDraft}
                  onChange={e => setZoneDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveZone(); if (e.key === 'Escape') setEditZone(false) }}
                />
                <IconButton icon="check" label="Guardar zona" variant="ink" onClick={saveZone} />
                <IconButton icon="x" label="Cancelar" variant="soft" onClick={() => setEditZone(false)} />
              </div>
            ) : (
              <InfoRow icon="map-pin" action={<IconButton icon="pencil" label="Editar zona" variant="soft" iconSize={18} onClick={() => setEditZone(true)} />}>
                {ext.zone}
              </InfoRow>
            )}
          </Section>

          <Section label="Meta mensual de ventas">
            {editMeta ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  className="k-input"
                  inputMode="numeric"
                  value={metaDraft}
                  onChange={e => setMetaDraft(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') saveMeta(); if (e.key === 'Escape') setEditMeta(false) }}
                />
                <IconButton icon="check" label="Guardar meta" variant="ink" onClick={saveMeta} />
                <IconButton icon="x" label="Cancelar" variant="soft" onClick={() => setEditMeta(false)} />
              </div>
            ) : (
              <InfoRow icon="target" action={<IconButton icon="pencil" label="Editar meta" variant="soft" iconSize={18} onClick={() => { setMetaDraft(String(ext.meta)); setEditMeta(true) }} />}>
                <span className="k-num" style={{ fontSize: 18 }}>{fmt(ext.meta)}</span>
              </InfoRow>
            )}
          </Section>

          {ext.email && (
            <Section label="Contacto">
              <InfoRow icon="mail">{ext.email}</InfoRow>
            </Section>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function TeamView() {
  const { sellers: sellerList, reload: reloadSellers } = useSellers()
  const [exts,        setExts]        = useState(INIT_EXT)
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('all')
  const [statFilter,  setStatFilter]  = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [showInvite,  setShowInvite]  = useState(false)

  const sellers = sellerList.map(s => ({
    ...s,
    ext: exts[s.init] || { role: 'seller', status: 'active', zone: '—', email: '', lastSeen: s.lastSeen || '—', meta: s.goal },
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
    if (key === 'meta' && isSupabaseConfigured) {
      const seller = sellerList.find(s => s.init === init)
      if (seller) {
        supabase.from('profiles')
          .update({ goal_amount: val })
          .eq('id', seller.id)
          .then(({ error }) => { if (!error) reloadSellers() })
      }
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const statOrder = { active: 0, inactive: 1 }
    return (statOrder[a.ext.status] || 0) - (statOrder[b.ext.status] || 0) || (b.current / b.goal) - (a.current / a.goal)
  })

  return (
    <div className="sv-scroll" style={{ minWidth: 0 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <SearchInput small value={search} onChange={setSearch} placeholder="Buscar vendedor, zona o email…" style={{ flex: '1 1 220px', maxWidth: 320 }} />
        <Segmented value={roleFilter} onChange={setRoleFilter}
          options={[{ id: 'all', label: 'Todos' }, { id: 'seller', label: 'Vendedores' }, { id: 'admin', label: 'Admins' }]} />
        <Segmented value={statFilter} onChange={setStatFilter}
          options={[{ id: 'all', label: 'Todos' }, { id: 'active', label: 'Activos' }, { id: 'inactive', label: 'Inactivos' }]} />
        <div style={{ flex: 1 }} />
        <span className="k-dim" style={{ fontSize: 13 }}>
          {filtered.length} vendedor{filtered.length !== 1 ? 'es' : ''}
        </span>
        <Button variant="accent" icon="user-plus" onClick={() => setShowInvite(true)}>Agregar vendedor</Button>
      </div>

      {/* Table */}
      <Card flush>
        {sorted.length === 0 ? (
          <Empty icon="users-group">Sin vendedores con estos filtros</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="k-table k-table--click" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  {['Vendedor', 'Rol', 'Zona', 'Meta mensual', 'Cumplimiento', 'Prospectos', 'Último acceso', 'Estado', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 || i === 3 ? 'left' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => {
                  const { ext } = s
                  const roleCfg = ROLE_CFG[ext.role] || ROLE_CFG.seller
                  const goal = ext.meta || s.goal
                  const pct = Math.round((s.current / goal) * 100)
                  const isInactive = ext.status === 'inactive'

                  return (
                    <tr key={s.id} onClick={() => setSelected({ ...s })} style={{ opacity: isInactive ? 0.55 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar initials={s.init} color={s.color} />
                          <div>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.name}</div>
                            {ext.email && <div className="k-dim" style={{ fontSize: 12, marginTop: 1 }}>{ext.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Pill tone={roleCfg.tone} icon={roleCfg.icon}>{roleCfg.label}</Pill>
                      </td>
                      <td className="k-muted" style={{ textAlign: 'center' }}>{ext.zone}</td>
                      <td style={{ minWidth: 190 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <span className="k-num" style={{ fontSize: 16 }}>{pct}%</span>
                          <span className="k-dim" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.current)} / {fmt(ext.meta)}</span>
                        </div>
                        <ProgressBar value={s.current} max={goal} color={pct >= 80 ? 'var(--success)' : 'var(--primary-bg)'} height={6} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Pill tone={compTone(s.compliance)}>{s.compliance}%</Pill>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="k-num" style={{ fontSize: 16 }}>{s.prospects}</span>
                      </td>
                      <td className="k-dim" style={{ textAlign: 'center', fontSize: 13, whiteSpace: 'nowrap' }}>{ext.lastSeen}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          title={ext.status === 'active' ? 'Desactivar' : 'Reactivar'}
                          onClick={e => { e.stopPropagation(); updateExt(s.init, 'status', ext.status === 'active' ? 'inactive' : 'active') }}
                          style={{ minHeight: 36 }}
                        >
                          <StatusPill status={ext.status} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', width: 40 }}>
                        <Icon name="chevron-right" size={18} color="var(--fg-tertiary)" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Detail ── */}
      {selected && (
        <SellerDetailPanel
          seller={selected}
          ext={exts[selected.init] || INIT_EXT[selected.init]}
          onUpdateExt={(key, val) => updateExt(selected.init, key, val)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Alta ── */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
