import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const BLUE  = '#185FA5'
const GRAY  = '#888780'
const LIGHT = '#F4F2EE'
const DARK  = '#1C1B19'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', padding: 48, backgroundColor: '#fff', fontSize: 10, color: DARK },
  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logoRow:     { flexDirection: 'row', alignItems: 'center' },
  logoBox:     { width: 38, height: 38, backgroundColor: BLUE, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoK:       { color: '#fff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  logoName:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK },
  logoSub:     { fontSize: 9, color: GRAY, marginTop: 2 },
  titleBig:    { fontSize: 24, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1 },
  metaText:    { fontSize: 9, color: GRAY, marginTop: 3, textAlign: 'right' },
  // Divider
  divider:     { height: 0.5, backgroundColor: LIGHT, marginVertical: 18 },
  // Parties
  twoCol:      { flexDirection: 'row', marginBottom: 24, gap: 32 },
  colLabel:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  colValue:    { fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK },
  // Table
  thead:       { flexDirection: 'row', backgroundColor: BLUE, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 12, marginBottom: 2 },
  theadCell:   { color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 },
  trow:        { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: LIGHT },
  trowAlt:     { backgroundColor: '#FAFAF8' },
  tcell:       { fontSize: 10, color: DARK },
  tcellSub:    { fontSize: 8, color: GRAY, marginTop: 1 },
  cProduct:    { flex: 1 },
  cQty:        { width: 44, textAlign: 'center' },
  cPrice:      { width: 76, textAlign: 'right' },
  cSubtotal:   { width: 84, textAlign: 'right' },
  // Total
  totalWrap:   { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 },
  totalLabel:  { fontSize: 11, color: GRAY, marginRight: 16 },
  totalValue:  { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BLUE, width: 120, textAlign: 'right' },
  // Footer
  footer:      { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: LIGHT, paddingTop: 10 },
  footerText:  { fontSize: 8, color: GRAY },
})

const fmt    = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtDate = d => {
  const p = n => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function QuotePDFDoc({ quoteId, prospectName, sellerName, items, date }) {
  const total   = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shortId = quoteId ? quoteId.slice(0, 8).toUpperCase() : 'BORRADOR'
  const dateStr = fmtDate(date ?? new Date())

  return (
    <Document title={`Cotizacion-${shortId}`} author="KIUVO CRM">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoK}>K</Text>
            </View>
            <View>
              <Text style={s.logoName}>KIUVO CRM</Text>
              <Text style={s.logoSub}>Gestión de ventas en campo</Text>
            </View>
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
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.colLabel}>Vendedor</Text>
            <Text style={s.colValue}>{sellerName || '—'}</Text>
          </View>
        </View>

        {/* ── Table header ── */}
        <View style={s.thead}>
          <Text style={[s.theadCell, s.cProduct]}>PRODUCTO</Text>
          <Text style={[s.theadCell, s.cQty]}>CANT.</Text>
          <Text style={[s.theadCell, s.cPrice]}>P. UNIT.</Text>
          <Text style={[s.theadCell, s.cSubtotal]}>SUBTOTAL</Text>
        </View>

        {/* ── Table rows ── */}
        {items.map((item, idx) => (
          <View key={String(item.id)} style={[s.trow, idx % 2 === 1 && s.trowAlt]}>
            <View style={s.cProduct}>
              <Text style={s.tcell}>{item.name}</Text>
              {item.sku ? <Text style={s.tcellSub}>{item.sku}</Text> : null}
            </View>
            <Text style={[s.tcell, s.cQty]}>{item.qty}</Text>
            <Text style={[s.tcell, s.cPrice]}>{fmt(item.price)}</Text>
            <Text style={[s.tcell, s.cSubtotal]}>{fmt(item.price * item.qty)}</Text>
          </View>
        ))}

        {/* ── Total ── */}
        <View style={s.totalWrap}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValue}>{fmt(total)}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>KIUVO CRM · Generado el {dateStr}</Text>
          <Text style={s.footerText}>Este documento fue generado automáticamente</Text>
        </View>

      </Page>
    </Document>
  )
}
