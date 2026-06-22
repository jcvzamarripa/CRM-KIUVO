import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { useAuth } from '../../contexts/AuthContext'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { QuotePDFDoc } from '../../lib/quotePDF'
import { supabase } from '../../lib/supabase'

const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

const STATUS_STYLE = {
  draft:    { label: 'Borrador',   bg: 'var(--bg-secondary)',  fg: 'var(--fg-secondary)' },
  sent:     { label: 'Enviada',    bg: 'var(--info-bg)',       fg: 'var(--info)'         },
  approved: { label: 'Aprobada',   bg: 'var(--success-bg)',    fg: 'var(--success)'      },
  rejected: { label: 'Rechazada',  bg: 'var(--danger-bg)',     fg: 'var(--danger)'       },
}

function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

export default function SellerQuotesScreen({ onBack }) {
  const { user } = useAuth()
  const { quotes, loading, reload } = useQuoteHistory({ sellerId: user?.id })
  const [downloading, setDownloading] = useState(null) // quote id being downloaded
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  async function handleDownload(q) {
    setDownloading(q.id)
    try {
      const { data: items } = await supabase
        .from('quote_items')
        .select('product_name, sku, unit, quantity, unit_price, discount_pct')
        .eq('quote_id', q.id)
      const pdfItems = (items || []).map((item, idx) => {
        const rawDisc = item.discount_pct ?? 0
        const isSpecialPrice = rawDisc === -1
        const discountPct = isSpecialPrice ? 0 : rawDisc
        const listPrice = discountPct > 0
          ? item.unit_price / (1 - discountPct / 100)
          : item.unit_price
        return {
          id: idx, name: item.product_name, sku: item.sku || '',
          unit: item.unit || 'u.', qty: item.quantity,
          price: listPrice, discountPct, isSpecialPrice,
        }
      })

      // Pre-fetch logo as base64 so the PDF worker doesn't need a separate request
      let logoDataUrl = null
      try {
        const logoRes = await fetch(window.location.origin + '/kiuvo-logo.png')
        if (logoRes.ok) {
          const logoBytes = new Uint8Array(await logoRes.arrayBuffer())
          let binary = ''
          logoBytes.forEach(b => { binary += String.fromCharCode(b) })
          logoDataUrl = `data:image/png;base64,${btoa(binary)}`
        }
      } catch (_) { /* logo fetch failed — PDF will use fallback K box */ }

      const blob = await pdf(
        <QuotePDFDoc
          quoteId={q.id}
          prospectName={q.prospectName}
          sellerName={q.sellerName}
          items={pdfItems}
          date={q.createdAt ? new Date(q.createdAt) : new Date()}
          logoUrl={logoDataUrl}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (q.prospectName || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
      a.download = q.quoteNumber
        ? `${safeName} - ${q.quoteNumber}.pdf`
        : `${safeName} - ${q.shortId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[handleDownload]', err)
    } finally {
      setDownloading(null)
    }
  }

  const filtered = quotes.filter(q => {
    const matchFilter = filter === 'all' || q.status === filter
    const matchSearch = q.prospectName.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // Group by prospect for easy reading
  const grouped = filtered.reduce((acc, q) => {
    const key = q.prospectName
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-secondary)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-secondary)', flexShrink: 0,
        }}>
          <Icon name="arrow-left" size={16} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Mis cotizaciones</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{quotes.length} en total</div>
        </div>
        <button onClick={reload} style={{ marginLeft: 'auto', color: 'var(--fg-tertiary)', padding: 6 }}>
          <Icon name="refresh" size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="search" size={14} color="var(--fg-tertiary)" />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 10px 9px 30px',
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {[
          { key: 'all',      label: 'Todas' },
          { key: 'sent',     label: 'Enviadas' },
          { key: 'approved', label: 'Aprobadas' },
          { key: 'draft',    label: 'Borradores' },
          { key: 'rejected', label: 'Rechazadas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12,
            fontWeight: filter === f.key ? 500 : 400,
            border: `0.5px solid ${filter === f.key ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
            background: filter === f.key ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
            color: filter === f.key ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 92px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 0', color: 'var(--fg-tertiary)', gap: 8 }}>
            <Spinner size={18} /> Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-tertiary)' }}>
            <Icon name="file-invoice" size={32} color="var(--border-strong)" />
            <div style={{ marginTop: 8, fontSize: 13 }}>Sin cotizaciones</div>
          </div>
        ) : (
          Object.entries(grouped).map(([prospect, qs]) => (
            <div key={prospect} style={{ marginBottom: 20 }}>
              {/* Prospect header */}
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)',
                letterSpacing: 0.4, textTransform: 'uppercase',
                padding: '12px 0 6px', borderBottom: '0.5px solid var(--border)', marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{prospect}</span>
                <span style={{ fontWeight: 400, color: 'var(--fg-tertiary)', fontSize: 10 }}>
                  {qs.length} cotización{qs.length !== 1 ? 'es' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qs.map(q => {
                  const st = STATUS_STYLE[q.status] || STATUS_STYLE.draft
                  const isDown = downloading === q.id
                  return (
                    <div key={q.id} style={{
                      padding: '12px 14px',
                      background: 'var(--surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {/* PDF icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0,
                        background: '#FEF3E2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="file-invoice" size={20} color="#854F0B" />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(q.total)}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: '1px 6px', borderRadius: 99,
                            background: st.bg, color: st.fg,
                          }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                          {q.itemCount} producto{q.itemCount !== 1 ? 's' : ''} · {q.dateStr}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 1, fontFamily: 'monospace' }}>
                          {q.quoteNumber ? `Cotización #${q.quoteNumber}` : `#${q.shortId}`}
                        </div>
                      </div>

                      {/* Download button */}
                      <button
                        onClick={() => handleDownload(q)}
                        disabled={isDown}
                        title="Descargar PDF"
                        style={{
                          width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0,
                          background: isDown ? 'var(--bg-secondary)' : 'var(--kiuvo-blue)',
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isDown ? 'default' : 'pointer',
                          opacity: isDown ? 0.7 : 1,
                        }}
                      >
                        {isDown
                          ? <Spinner size={14} />
                          : <Icon name="download" size={16} color="#fff" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
