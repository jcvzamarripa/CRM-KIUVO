import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'

// ── hook ─────────────────────────────────────────────────────────────────────
function useAdminFunnel() {
  const empty   = STAGES.map(s => ({ id: s.id, label: s.label, count: 0, value: 0 }))
  const [data,    setData]    = useState(empty)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    async function load() {
      const { data: rows, error } = await supabase
        .from('prospects')
        .select('stage_id, value')

      if (error || !rows) { setLoading(false); return }

      const map = {}
      STAGES.forEach(s => { map[s.id] = { count: 0, value: 0 } })
      rows.forEach(p => {
        const bucket = map[p.stage_id]
        if (!bucket) return
        bucket.count++
        bucket.value += Number(p.value) || 0
      })

      setData(STAGES.map(s => ({
        id:    s.id,
        label: s.label,
        count: map[s.id].count,
        value: map[s.id].value,
      })))
      setLoading(false)
    }

    load()
  }, [])

  return { data, loading }
}

// ── component ─────────────────────────────────────────────────────────────────
export default function FunnelChart() {
  const { data, loading } = useAdminFunnel()
  const hasData = data.some(d => d.count > 0)
  const max     = data[0]?.count || 1

  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 4', background: 'var(--surface)' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Embudo de ventas</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Distribución actual del pipeline</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--fg-tertiary)', fontSize: 13 }}>
          Cargando…
        </div>
      ) : !hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, gap: 6, color: 'var(--fg-tertiary)', fontSize: 13 }}>
          <div style={{ fontSize: 24, opacity: 0.4 }}>🎯</div>
          <div>Sin prospectos aún</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((row, i) => {
            const stage = STAGE_BY_ID[row.id]
            const width = max > 0 ? (row.count / max) * 100 : 0
            const prev  = i > 0 ? data[i - 1].count : null
            const conv  = prev && prev > 0 ? Math.round((row.count / prev) * 100) : null
            return (
              <div key={row.id}>
                {conv !== null && (
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textAlign: 'center', padding: '1px 0' }}>
                    ↓ {conv}% conversión
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{row.label}</div>
                  <div style={{ flex: 1, position: 'relative', height: 30 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: width > 0 ? `${width}%` : '4px',
                      background: stage.color + '24',
                      borderLeft: `3px solid ${stage.color}`,
                      borderRadius: '0 4px 4px 0',
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
                    </div>
                  </div>
                  <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: 'var(--fg-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.value >= 1000 ? '$' + (row.value / 1000).toFixed(0) + 'k' : row.value > 0 ? '$' + row.value : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
