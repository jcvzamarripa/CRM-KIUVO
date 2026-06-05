import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

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
      // quotes con status='approved' — closed_at no existe, usamos created_at
      const { data: rows, error } = await supabase
        .from('quotes')
        .select('total, created_at')
        .eq('status', 'approved')
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59Z')

      if (error || !rows) { setLoading(false); return }

      const byDay = [0, 0, 0, 0, 0, 0, 0]   // Mon…Sun
      rows.forEach(s => {
        const dow = new Date(s.created_at).getDay()  // 0=Dom
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

// ── component ─────────────────────────────────────────────────────────────────
export default function SalesChart() {
  const { data, loading } = useSalesWeek()
  const hasData = data.some(d => d.won > 0)
  const MAX     = Math.max(...data.map(d => d.won), data[0]?.target || 35000)

  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 8', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Ventas por día</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Cierres ganados vs. meta diaria · semana actual</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--kiuvo-blue)' }} />Ganado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: 'var(--fg-tertiary)', display: 'block' }} />Meta diaria
          </div>
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          Cargando…
        </div>
      ) : !hasData ? (
        <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--fg-tertiary)', fontSize: 13 }}>
          <div style={{ fontSize: 28, opacity: 0.4 }}>📊</div>
          <div>Sin ventas esta semana</div>
          <div style={{ fontSize: 11 }}>Registra actividades de tipo <em>cierre</em> para ver datos aquí.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, position: 'relative', padding: '0 0 24px' }}>
          {/* Target line */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: 24 + (35000 / MAX) * 176,
            height: 0,
            borderTop: '0.5px dashed var(--fg-tertiary)',
          }} />
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-secondary)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                {d.won >= 1000 ? '$' + (d.won / 1000).toFixed(0) + 'k' : d.won > 0 ? '$' + d.won : ''}
              </div>
              <div style={{
                width: '100%', maxWidth: 38,
                height: d.won > 0 ? `${(d.won / MAX) * 100}%` : '2px',
                background: d.won >= d.target ? 'var(--kiuvo-blue)' : d.won > 0 ? 'var(--kiuvo-blue-mid)' : 'var(--border)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease',
                minHeight: 2,
              }} />
              <div style={{ position: 'absolute', bottom: 0, fontSize: 11, color: 'var(--fg-secondary)', transform: 'translateY(20px)' }}>{d.d}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
