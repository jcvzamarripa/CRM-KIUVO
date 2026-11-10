import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Card, Empty, Bone } from '../ui'

// ── helpers ──────────────────────────────────────────────────────────────────
function getWeekRange() {
  const today = new Date()
  const dow   = today.getDay()                          // 0=Dom … 6=Sáb
  const mon   = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    from: mon.toISOString().slice(0, 10),
    to:   sun.toISOString().slice(0, 10),
  }
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── hook ─────────────────────────────────────────────────────────────────────
function useSalesWeek() {
  const empty   = DAYS.map(d => ({ d, won: 0, target: 35000 }))
  const [data,    setData]    = useState(empty)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    async function load() {
      const { from, to } = getWeekRange()
      const { data: rows, error } = await supabase
        .from('quotes')
        .select('total, approved_at')
        .eq('status', 'approved')
        .gte('approved_at', from)
        .lte('approved_at', to + 'T23:59:59Z')

      if (error || !rows) { setLoading(false); return }

      const byDay = [0, 0, 0, 0, 0, 0, 0]   // Mon…Sun
      rows.forEach(s => {
        const dow = new Date(s.approved_at).getDay()  // 0=Dom
        const idx = dow === 0 ? 6 : dow - 1          // Mon=0 … Sun=6
        byDay[idx] += Number(s.total) || 0
      })

      setData(DAYS.map((d, i) => ({ d, won: byDay[i], target: 35000 })))
      setLoading(false)
    }

    load()
  }, [])

  return { data, loading }
}

function CardHead({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div className="k-h2">{title}</div>
        {sub && <div className="k-muted" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export default function SalesChart() {
  const { data, loading } = useSalesWeek()
  const hasData = data.some(d => d.won > 0)
  const MAX     = Math.max(...data.map(d => d.won), data[0]?.target || 35000)

  return (
    <Card style={{ padding: 20 }}>
      <CardHead title="Ventas por día" sub="Cierres ganados vs. meta diaria · semana actual">
        <div className="k-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--fg)' }} />Ganado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--fg-tertiary)', display: 'block' }} />Meta diaria
          </div>
        </div>
      </CardHead>

      {loading ? (
        <Bone h={200} r="var(--r-md)" />
      ) : !hasData ? (
        <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
          <Empty icon="chart-bar">Sin ventas esta semana.<br />Aparecen aquí al aprobar una cotización.</Empty>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, position: 'relative', padding: '0 0 26px' }}>
          {/* Línea de meta */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: 26 + (35000 / MAX) * 174,
            height: 0,
            borderTop: '2px dashed var(--border-strong)',
          }} />
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div className="k-muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                {d.won >= 1000 ? '$' + (d.won / 1000).toFixed(0) + 'k' : d.won > 0 ? '$' + d.won : ''}
              </div>
              <div style={{
                width: '100%', maxWidth: 44,
                height: d.won > 0 ? `${(d.won / MAX) * 100}%` : '4px',
                background: d.won >= d.target ? 'var(--accent)' : d.won > 0 ? 'var(--fg)' : 'var(--bg-tertiary)',
                boxShadow: d.won >= d.target ? 'inset 0 0 0 2px var(--fg)' : 'none',
                borderRadius: '10px 10px 4px 4px',
                transition: 'height 0.3s ease',
                minHeight: 4,
              }} />
              <div className="k-muted" style={{ position: 'absolute', bottom: 0, fontSize: 13 }}>{d.d}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
