import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const BLUE  = '#185FA5'
const GRAY  = '#888780'
const LIGHT = '#EEEDE9'
const DARK  = '#1C1B19'
const IVA   = 0.16

// ── Defaults (edit here if you don't pass props) ───────────────────
const CO_PHONE   = '449-205-06-15'
const CO_ADDRESS = 'Av. Aguascalientes Pte. #601 Col. Del Valle 1ra Secc.'
const CO_NAME    = 'KIUVO'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', padding: 40, paddingBottom: 60, backgroundColor: '#fff', fontSize: 9, color: DARK },

  // ── Header ────────────────────────────────────────────────────────
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  logoImg:          { width: 320, height: 96, objectFit: 'contain', objectPositionX: 'left' },
  logoFallbackBox:  { width: 42, height: 42, backgroundColor: BLUE, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoFallbackK:    { color: '#fff', fontSize: 24, fontFamily: 'Helvetica-Bold' },
  titleBig:         { fontSize: 22, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1 },
  metaText:         { fontSize: 8, color: GRAY, marginTop: 3, textAlign: 'right' },

  // ── Divider ───────────────────────────────────────────────────────
  divider: { height: 0.5, backgroundColor: LIGHT, marginVertical: 12 },

  // ── Parties ───────────────────────────────────────────────────────
  twoCol:      { flexDirection: 'row', marginBottom: 14, gap: 20 },
  colLabel:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  colValue:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  colValueSm:  { fontSize: 9, color: DARK, marginTop: 2 },

  // ── Table ─────────────────────────────────────────────────────────
  thead:      { flexDirection: 'row', backgroundColor: BLUE, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 1 },
  theadCell:  { color: '#fff', fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },
  trow:       { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: LIGHT },
  trowAlt:    { backgroundColor: '#FAFAF8' },
  tcell:      { fontSize: 9, color: DARK },
  tcellSub:   { fontSize: 7, color: GRAY, marginTop: 1 },

  // Column widths
  cProduct: { flex: 1 },
  cQty:     { width: 34, textAlign: 'center' },
  cUnit:    { width: 30, textAlign: 'center' },
  cPUnit:   { width: 64, textAlign: 'right' },
  cDisc:    { width: 36, textAlign: 'center' },
  cPNeto:   { width: 64, textAlign: 'right' },
  cTotal:   { width: 68, textAlign: 'right' },

  // ── Totals ────────────────────────────────────────────────────────
  totalsWrap:       { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 12 },
  totalsTable:      { width: 210 },
  totalsRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LIGHT },
  totalsLabel:      { fontSize: 9, color: GRAY },
  totalsValue:      { fontSize: 9, color: DARK },
  totalsFinalRow:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: BLUE, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8, marginTop: 4 },
  totalsFinalLabel: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  totalsFinalValue: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },

  // ── Terms grid (payment + delivery) ──────────────────────────────
  termsGrid: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  termBox:   { flex: 1, backgroundColor: '#F4F3F0', borderRadius: 3, padding: '6 10' },
  termLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  termValue: { fontSize: 9, color: DARK },

  // ── Conditions ───────────────────────────────────────────────────
  condWrap:  { backgroundColor: '#F4F3F0', borderRadius: 3, padding: '7 10', marginBottom: 10 },
  condTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 },
  condItem:  { fontSize: 8, color: GRAY, marginBottom: 2, lineHeight: 1.4 },

  // ── Footer ───────────────────────────────────────────────────────
  footer:     { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: LIGHT, paddingTop: 7 },
  footerText: { fontSize: 7, color: GRAY },
})

const fmt     = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtDate = d => {
  const p = n => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function QuotePDFDoc({
  quoteId,
  prospectName,
  contactName,
  sellerName,
  items,
  date,
  paymentTerms,
  deliveryTime,
  logoUrl,
  phone   = CO_PHONE,
  address = CO_ADDRESS,
}) {
  const subtotalBruto = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const subtotal = items.reduce((sum, i) => {
    const effP = i.discountPct > 0 ? i.price * (1 - i.discountPct / 100) : i.price
    return sum + effP * i.qty
  }, 0)
  const savings = subtotalBruto - subtotal
  const ivaAmt = subtotal * IVA
  const total  = subtotal + ivaAmt

  const shortId = quoteId ? quoteId.slice(0, 8).toUpperCase() : 'BORRADOR'
  const dateStr = fmtDate(date ?? new Date())

  return (
    <Document title={`Cotizacion-${shortId}`} author={CO_NAME}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            {logoUrl ? (
              <Image src={logoUrl} style={s.logoImg} />
            ) : (
              <View style={s.logoFallbackBox}>
                <Text style={s.logoFallbackK}>K</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={s.titleBig}>COTIZACIÓN</Text>
            <Text style={s.metaText}>No. {shortId}</Text>
            <Text style={s.metaText}>Fecha: {dateStr}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Parties ── */}
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.colLabel}>Para</Text>
            <Text style={s.colValue}>{prospectName || '—'}</Text>
            {contactName ? (
              <Text style={s.colValueSm}>Attn: {contactName}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.colLabel}>Ejecutivo de ventas</Text>
            <Text style={s.colValue}>{sellerName || '—'}</Text>
          </View>
        </View>

        {/* ── Table header ── */}
        <View style={s.thead}>
          <Text style={[s.theadCell, s.cProduct]}>PRODUCTO</Text>
          <Text style={[s.theadCell, s.cQty]}>CANT.</Text>
          <Text style={[s.theadCell, s.cUnit]}>UNID.</Text>
          <Text style={[s.theadCell, s.cPUnit]}>P. UNIT.</Text>
          <Text style={[s.theadCell, s.cDisc]}>DESC.</Text>
          <Text style={[s.theadCell, s.cPNeto]}>P. NETO</Text>
          <Text style={[s.theadCell, s.cTotal]}>TOTAL</Text>
        </View>

        {/* ── Table rows ── */}
        {items.map((item, idx) => {
          const effP  = item.discountPct > 0 ? item.price * (1 - item.discountPct / 100) : item.price
          const lineT = effP * item.qty
          const disc  = item.isSpecialPrice ? 'Esp.' : item.discountPct > 0 ? `${item.discountPct}%` : '—'
          return (
            <View key={String(item.id)} style={[s.trow, idx % 2 === 1 && s.trowAlt]}>
              <View style={s.cProduct}>
                <Text style={s.tcell}>{item.name}</Text>
                {item.sku ? <Text style={s.tcellSub}>{item.sku}</Text> : null}
              </View>
              <Text style={[s.tcell, s.cQty]}>{item.qty}</Text>
              <Text style={[s.tcell, s.cUnit]}>{item.unit || '—'}</Text>
              <Text style={[s.tcell, s.cPUnit]}>{fmt(item.price)}</Text>
              <Text style={[s.tcell, s.cDisc]}>{disc}</Text>
              <Text style={[s.tcell, s.cPNeto]}>{fmt(effP)}</Text>
              <Text style={[s.tcell, s.cTotal]}>{fmt(lineT)}</Text>
            </View>
          )
        })}

        {/* ── Totals block ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsTable}>
            {savings > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Precio de lista</Text>
                <Text style={s.totalsValue}>{fmt(subtotalBruto)}</Text>
              </View>
            )}
            {savings > 0 && (
              <View style={[s.totalsRow, { borderBottomColor: '#1D9E75' }]}>
                <Text style={[s.totalsLabel, { color: '#1D9E75', fontFamily: 'Helvetica-Bold' }]}>Descuento por volumen</Text>
                <Text style={[s.totalsValue, { color: '#1D9E75', fontFamily: 'Helvetica-Bold' }]}>−{fmt(savings)}</Text>
              </View>
            )}
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, { fontFamily: 'Helvetica-Bold', color: DARK }]}>Subtotal</Text>
              <Text style={[s.totalsValue, { fontFamily: 'Helvetica-Bold' }]}>{fmt(subtotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>IVA (16%)</Text>
              <Text style={s.totalsValue}>{fmt(ivaAmt)}</Text>
            </View>
            <View style={s.totalsFinalRow}>
              <Text style={s.totalsFinalLabel}>TOTAL</Text>
              <Text style={s.totalsFinalValue}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment & delivery terms ── */}
        {(paymentTerms || deliveryTime) ? (
          <View style={s.termsGrid}>
            {paymentTerms ? (
              <View style={s.termBox}>
                <Text style={s.termLabel}>Forma de pago</Text>
                <Text style={s.termValue}>{paymentTerms}</Text>
              </View>
            ) : null}
            {deliveryTime ? (
              <View style={s.termBox}>
                <Text style={s.termLabel}>Tiempo de entrega</Text>
                <Text style={s.termValue}>{deliveryTime}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Commercial conditions ── */}
        <View style={s.condWrap}>
          <Text style={s.condTitle}>Condiciones Comerciales</Text>
          <Text style={s.condItem}>• Los precios están expresados en pesos mexicanos (MXN) e incluyen IVA al 16%.</Text>
          <Text style={s.condItem}>• Esta cotización tiene una vigencia de 15 días naturales a partir de la fecha de emisión.</Text>
          <Text style={s.condItem}>• Los descuentos por volumen aplican únicamente para las cantidades indicadas en este documento.</Text>
          <Text style={s.condItem}>• El pedido se confirma con el 50% de anticipo; el saldo restante se cubre contra entrega.</Text>
          <Text style={s.condItem}>• Precios sujetos a cambio sin previo aviso por variaciones en tipo de cambio o costos de insumos.</Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{CO_NAME} · {phone} · {address}</Text>
          <Text style={s.footerText}>Cotización {shortId} · {dateStr}</Text>
        </View>

      </Page>
    </Document>
  )
}
