import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const fmt = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })

const STATUS_CFG = {
  pending:  { label: 'Pendiente', color: '#EF9F27', bg: '#FAEEDA', icon: 'clock'        },
  approved: { label: 'Aprobada',  color: '#1D9E75', bg: '#E1F5EE', icon: 'circle-check' },
  rejected: { label: 'Rechazada', color: '#D85A30', bg: '#FDEDE8', icon: 'circle-x'     },
}

// ── OrderDetailPanel ──────────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose, onApprove, onReject }) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm,  setShowRejectForm]  = useState(false)
  const [processing,      setProcessing]      = useState(false)

  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending

  const handleApprove = async () => {
    setProcessing(true)
    await onApprove(order)
    setProcessing(false)
    onClose()
  }

  const handleReject = async () => {
    setProcessing(true)
    await onReject(order, rejectionReason.trim())
    setProcessing(false)
    onClose()
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--r-lg)',
        width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Orden de producción</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{order.prospect_name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: 99 }}>
              {cfg.label}
            </span>
            <button onClick={onClose} style={{ color: 'var(--fg-tertiary)', padding: 4 }}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Vendedor', value: order.seller_name },
            { label: 'Fecha',    value: new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Total',    value: fmt(order.total), accent: 'var(--kiuvo-blue)' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: m.accent ?? 'var(--fg)', marginTop: 2 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 10 }}>PRODUCTOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(order.items ?? []).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-secondary)' }}>{item.quantity}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{item.product_name}</div>
                  {item.sku && <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 1 }}>{item.sku}{item.unit ? ` · ${item.unit}` : ''}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{fmt(item.unit_price * item.quantity)}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{fmt(item.unit_price)} c/u</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 4 }}>NOTAS</div>
            <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.6 }}>{order.notes}</div>
          </div>
        )}

        {/* Rejection info (if rejected) */}
        {order.status === 'rejected' && (
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: '#FDEDE8' }}>
            <div style={{ fontSize: 11, color: '#D85A30', marginBottom: 4, fontWeight: 600 }}>MOTIVO DE RECHAZO</div>
            <div style={{ fontSize: 13, color: '#9B3A18', lineHeight: 1.6 }}>
              {order.rejection_reason || 'Sin motivo especificado'}
            </div>
            <div style={{ fontSize: 11, color: '#D85A30', marginTop: 6 }}>
              El prospecto fue regresado automáticamente a Negociación.
            </div>
          </div>
        )}

        {/* Approval info */}
        {order.status === 'approved' && order.approved_at && (
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', background: '#E1F5EE' }}>
            <div style={{ fontSize: 12, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="circle-check" size={14} color="#1D9E75" />
              Aprobada el {new Date(order.approved_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}

        {/* Actions — only for pending */}
        {order.status === 'pending' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!showRejectForm ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowRejectForm(true)}
                  style={{
                    flex: 1, padding: '11px',
                    background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
                    color: 'var(--danger-fg)', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon name="circle-x" size={16} color="var(--danger)" />
                  Rechazar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  style={{
                    flex: 2, padding: '11px',
                    background: '#1D9E75', color: '#fff',
                    borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: processing ? 0.7 : 1,
                  }}
                >
                  <Icon name="circle-check" size={16} color="#fff" />
                  {processing ? 'Procesando…' : 'Aprobar orden'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Motivo de rechazo</div>
                <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: -4 }}>
                  El prospecto será devuelto a Negociación y el vendedor recibirá una notificación.
                </div>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Explica por qué se rechaza la orden…"
                  rows={3}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                    outline: 'none', fontFamily: 'inherit', resize: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowRejectForm(false)} style={{
                    flex: 1, padding: '10px', borderRadius: 'var(--r-md)',
                    border: '0.5px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--fg-secondary)', fontSize: 14,
                  }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    style={{
                      flex: 2, padding: '10px',
                      background: 'var(--danger)', color: '#fff',
                      borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500,
                      opacity: processing ? 0.7 : 1,
                    }}
                  >
                    {processing ? 'Procesando…' : 'Confirmar rechazo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProductionOrdersView() {
  const { user } = useAuth()
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('pending')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('production_orders')
      .select(`*, prospect:prospects(id, name), seller:profiles!seller_id(full_name)`)
      .order('created_at', { ascending: false })

    if (!error) {
      setOrders((data ?? []).map(o => ({
        ...o,
        prospect_name: o.prospect?.name    ?? '—',
        seller_name:   o.seller?.full_name ?? '—',
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase
      .channel('prod-orders-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const handleApprove = async (order) => {
    await supabase
      .from('production_orders')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', order.id)

    // Notify seller
    await supabase.from('notifications').insert({
      user_id: order.seller_id,
      title:   '¡Orden de producción aprobada!',
      body:    `La orden para ${order.prospect_name} fue aprobada. ¡Listo para producción!`,
      kind:    'success',
      screen:  'embudo',
      stage:   'cierre',
    }).catch(() => {})

    await load()
  }

  const handleReject = async (order, reason) => {
    // 1. Marcar orden como rechazada
    await supabase
      .from('production_orders')
      .update({
        status:           'rejected',
        rejected_at:      new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', order.id)

    // 2. Regresar prospecto a Negociación
    if (order.prospect_id) {
      await supabase
        .from('prospects')
        .update({ stage_id: 'negociacion', updated_at: new Date().toISOString() })
        .eq('id', order.prospect_id)
    }

    // 3. Notificar al vendedor
    await supabase.from('notifications').insert({
      user_id: order.seller_id,
      title:   'Orden de producción rechazada',
      body:    `La orden de ${order.prospect_name} fue rechazada${reason ? `: "${reason}"` : ''}. El prospecto regresó a Negociación.`,
      kind:    'danger',
      screen:  'embudo',
      stage:   'negociacion',
    }).catch(() => {})

    await load()
  }

  const counts = {
    pending:  orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  }

  const filtered = orders.filter(o => o.status === filter)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.85} }`}</style>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <div key={key} style={{
            background: 'var(--surface)', border: `0.5px solid ${key === 'pending' && counts.pending > 0 ? cfg.color + '55' : 'var(--border)'}`,
            borderRadius: 'var(--r-lg)', padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={cfg.icon} size={15} color={cfg.color} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{cfg.label}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: counts[key] > 0 ? cfg.color : 'var(--fg)', lineHeight: 1 }}>
              {loading ? '—' : counts[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const on = filter === key
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '7px 16px', borderRadius: 'var(--r-full)',
              background: on ? cfg.bg : 'var(--surface)',
              border: `0.5px solid ${on ? cfg.color : 'var(--border)'}`,
              color: on ? cfg.color : 'var(--fg-secondary)',
              fontSize: 13, fontWeight: on ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {cfg.label}
              {counts[key] > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: on ? cfg.color : 'var(--bg-secondary)',
                  color: on ? '#fff' : 'var(--fg-secondary)',
                  padding: '1px 7px', borderRadius: 99,
                }}>{counts[key]}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 76, borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--fg-tertiary)' }}>
          <Icon name="clipboard-list" size={36} color="var(--fg-tertiary)" />
          <div style={{ fontSize: 14 }}>Sin órdenes {STATUS_CFG[filter]?.label.toLowerCase()}s</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {filtered.map((order, idx) => {
            const cfg = STATUS_CFG[order.status]
            const isPending = order.status === 'pending'
            return (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '14px 18px',
                  borderBottom: idx < filtered.length - 1 ? '0.5px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: isPending ? '#FAEEDA22' : 'transparent',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0,
                  background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={cfg.icon} size={19} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.prospect_name}
                    </span>
                    {isPending && (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#854F0B', background: '#FAEEDA', padding: '2px 7px', borderRadius: 99 }}>
                        ACCIÓN REQUERIDA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>
                    {order.seller_name} · {(order.items ?? []).length} producto{(order.items ?? []).length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{fmt(order.total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>
                    {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <Icon name="chevron-right" size={16} color="var(--fg-tertiary)" />
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
