import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import Icon from '../shared/Icon'
import { IconButton, Card, Pill, Segmented, SearchInput, Empty, Bone } from '../ui'
import { useAuth } from '../../contexts/AuthContext'
import { useQuoteHistory } from '../../hooks/useQuoteHistory'
import { QuotePDFDoc } from '../../lib/quotePDF'
import { supabase } from '../../lib/supabase'
import { saveFile } from '../../lib/saveFile'

const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

const STATUS = {
  draft:    { label: 'Borrador',  tone: undefined },
  sent:     { label: 'Enviada',   tone: 'sky' },
  approved: { label: 'Aprobada',  tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'coral' },
}

const FILTERS = [
  { id: 'all',      label: 'Todas' },
  { id: 'sent',     label: 'Enviadas' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'draft',    label: 'Borradores' },
  { id: 'rejected', label: 'Rechazadas' },
]

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
      const safeName = (q.prospectName || 'cotizacion').replace(/[/\\:*?"<>|]/g, '').trim()
      await saveFile(blob, q.quoteNumber
        ? `${safeName} - ${q.quoteNumber}.pdf`
        : `${safeName} - ${q.shortId}.pdf`)
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
      <div className="k-screenhead">
        <IconButton icon="arrow-left" label="Volver" onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="k-screenhead__title">Mis cotizaciones</div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{quotes.length} en total</div>
        </div>
        <IconButton icon="refresh" label="Actualizar" onClick={reload} />
      </div>

      <div style={{ padding: '4px 14px 0', flexShrink: 0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cliente…" />
      </div>

      <div style={{ padding: '12px 14px 4px', flexShrink: 0 }}>
        <Segmented size="lg" surface options={FILTERS} value={filter} onChange={setFilter} style={{ display: 'flex' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 120px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
            {[0, 1, 2].map(i => <Bone key={i} h={84} r="var(--r-lg)" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Empty icon="file-invoice">Sin cotizaciones</Empty>
        ) : (
          Object.entries(grouped).map(([prospect, qs]) => (
            <div key={prospect} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '10px 4px' }}>
                <span className="k-h3" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prospect}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-tertiary)', flexShrink: 0 }}>
                  {qs.length} cotización{qs.length !== 1 ? 'es' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qs.map(q => {
                  const st = STATUS[q.status] || STATUS.draft
                  const isDown = downloading === q.id
                  return (
                    <Card key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                      <span className="k-iconbtn k-iconbtn--soft" aria-hidden="true">
                        <Icon name="file-invoice" size={22} />
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <span className="k-num" style={{ fontSize: 20 }}>{fmt(q.total)}</span>
                          <Pill tone={st.tone}>{st.label}</Pill>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 5 }}>
                          {q.quoteNumber ? `Cotización #${q.quoteNumber}` : `#${q.shortId}`} · {q.itemCount} producto{q.itemCount !== 1 ? 's' : ''} · {q.dateStr}
                        </div>
                      </div>

                      <button
                        className="k-iconbtn k-iconbtn--ink"
                        onClick={() => handleDownload(q)}
                        disabled={isDown}
                        aria-label="Descargar PDF"
                        title="Descargar PDF"
                        style={{ opacity: isDown ? 0.6 : 1 }}
                      >
                        {isDown
                          ? <span className="k-spin" style={{ display: 'inline-flex' }}><Icon name="loader" size={20} /></span>
                          : <Icon name="download" size={20} />}
                      </button>
                    </Card>
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
