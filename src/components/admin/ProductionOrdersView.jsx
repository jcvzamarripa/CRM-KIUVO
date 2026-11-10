import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../shared/Icon'
import { Button, Card, Pill, Segmented, Modal, Empty, Bone, Label } from '../ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const fmt = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 })

const STATUS_CFG = {
  pending:  { label: 'Pendiente', tone: 'warning', icon: 'clock'        },
  approved: { label: 'Aprobada',  tone: 'success', icon: 'circle-check' },
  rejected: { label: 'Rechazada', tone: 'coral',   icon: 'alert-circle' },
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

  const footer = order.status !== 'pending' ? null : !showRejectForm ? (
    <div style={{ display: 'flex', gap: 10 }}>
      <Button variant="danger" style={{ flex: 1 }} onClick={() => setShowRejectForm(true)}>Rechazar</Button>
      <Button variant="accent" icon="circle-check" style={{ flex: 2 }} loading={processing} onClick={handleApprove}>
        {processing ? 'Procesando…' : 'Aprobar orden'}
      </Button>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div className="k-h3">Motivo de rechazo</div>
        <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
          El prospecto será devuelto a Negociación y el vendedor recibirá una notificación.
        </div>
      </div>
      <textarea
        className="k-input"
        value={rejectionReason}
        onChange={e => setRejectionReason(e.target.value)}
        placeholder="Explica por qué se rechaza la orden…"
        rows={3}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="soft" style={{ flex: 1 }} onClick={() => setShowRejectForm(false)}>Cancelar</Button>
        <Button variant="danger" style={{ flex: 2 }} loading={processing} onClick={handleReject}>
          {processing ? 'Procesando…' : 'Confirmar rechazo'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal title="Orden de producción" onClose={onClose} footer={footer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div className="k-h3" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.prospect_name}</div>
        <Pill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Pill>
      </div>

      {/* Meta */}
      <Card style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { label: 'Vendedor', value: order.seller_name },
          { label: 'Fecha',    value: new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Total',    value: fmt(order.total), big: true },
        ].map(m => (
          <div key={m.label}>
            <div className="k-dim" style={{ fontSize: 12 }}>{m.label}</div>
            <div className={m.big ? 'k-num' : undefined} style={{ fontSize: m.big ? 20 : 14, fontWeight: m.big ? undefined : 500, marginTop: 4 }}>{m.value}</div>
          </div>
        ))}
      </Card>

      {/* Items */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Productos</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(order.items ?? []).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-secondary)' }}>{item.quantity}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                {item.sku && <div className="k-dim" style={{ fontSize: 12, marginTop: 1 }}>{item.sku}{item.unit ? ` · ${item.unit}` : ''}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(item.unit_price * item.quantity)}</div>
                <div className="k-dim" style={{ fontSize: 12 }}>{fmt(item.unit_price)} c/u</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card style={{ marginBottom: 12 }}>
          <Label>Notas</Label>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{order.notes}</div>
        </Card>
      )}

      {/* Rejection info (if rejected) */}
      {order.status === 'rejected' && (
        <Card style={{ background: 'var(--coral-soft)', color: 'var(--coral-fg)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>MOTIVO DE RECHAZO</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {order.rejection_reason || 'Sin motivo especificado'}
          </div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            El prospecto fue regresado automáticamente a Negociación.
          </div>
        </Card>
      )}

      {/* Approval info */}
      {order.status === 'approved' && order.approved_at && (
        <Card style={{ background: 'var(--success-bg)', color: 'var(--success-fg)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Icon name="circle-check" size={18} />
          Aprobada el {new Date(order.approved_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Card>
      )}
    </Modal>
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
    if (!supabase) { setLoading(false); return }
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
    if (!supabase) return
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

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const hot = key === 'pending' && counts.pending > 0
          return (
            <Card key={key} tone={hot ? 'ink' : undefined} style={{ padding: '16px 18px' }}>
              <div className="k-num" style={{ fontSize: 34 }}>{loading ? '—' : counts[key]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 14, fontWeight: 600 }}>
                <Icon name={cfg.icon} size={16} />
                {cfg.label}s
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filter tabs */}
      <Segmented
        style={{ marginBottom: 16 }}
        value={filter}
        onChange={setFilter}
        options={Object.entries(STATUS_CFG).map(([key, cfg]) => ({
          id: key, label: cfg.label, count: counts[key] > 0 ? counts[key] : undefined,
        }))}
      />

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <Bone key={i} h={76} r="var(--r-lg)" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty icon="clipboard-list">Sin órdenes {STATUS_CFG[filter]?.label.toLowerCase()}s</Empty>
      ) : (
        <Card flush>
          {filtered.map(order => {
            const cfg = STATUS_CFG[order.status]
            const isPending = order.status === 'pending'
            return (
              <button key={order.id} onClick={() => setSelected(order)} className="k-row" style={{ padding: '14px 18px', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-secondary)', color: 'var(--fg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={cfg.icon} size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.prospect_name}
                    </span>
                    {isPending && <Pill tone="warning">Acción requerida</Pill>}
                  </div>
                  <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {order.seller_name} · {(order.items ?? []).length} producto{(order.items ?? []).length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="k-num" style={{ fontSize: 16 }}>{fmt(order.total)}</div>
                  <div className="k-dim" style={{ fontSize: 12, marginTop: 4 }}>
                    {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <Icon name="chevron-right" size={18} color="var(--fg-tertiary)" />
              </button>
            )
          })}
        </Card>
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
