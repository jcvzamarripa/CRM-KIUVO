import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { STAGES, STAGE_BY_ID } from '../../constants/stages'
import { Card, Empty, Bone } from '../ui'

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
export default function FunnelChart() {
  const { data, loading } = useAdminFunnel()
  const hasData = data.some(d => d.count > 0)
  const max     = Math.max(...data.map(d => d.count), 1)

  return (
    <Card style={{ padding: 20, height: '100%' }}>
      <CardHead title="Embudo de ventas" sub="Prospectos por etapa" />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3, 4].map(i => <Bone key={i} h={32} r="var(--r-full)" />)}
        </div>
      ) : !hasData ? (
        <Empty icon="target">Sin prospectos aún</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.map((row, i) => {
            const stage = STAGE_BY_ID[row.id]
            const width = (row.count / max) * 100
            const prev  = i > 0 ? data[i - 1].count : null
            const conv  = prev && prev > 0 ? Math.round((row.count / prev) * 100) : null
            return (
              <div key={row.id}>
                {conv !== null && (
                  <div className="k-dim" style={{ fontSize: 12, padding: '2px 0 2px 100px' }}>
                    {conv}% respecto a la etapa anterior
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 14, fontWeight: 500, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ flex: 1, height: 32, borderRadius: 'var(--r-full)', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{
                      width: `max(${width}%, 44px)`, height: '100%',
                      background: stage.color, borderRadius: 'var(--r-full)',
                      display: 'flex', alignItems: 'center', paddingLeft: 14,
                    }}>
                      <span className="k-num" style={{ fontSize: 15, color: '#fff' }}>{row.count}</span>
                    </div>
                  </div>
                  <div className="k-muted" style={{ width: 52, textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {row.value >= 1000 ? '$' + (row.value / 1000).toFixed(0) + 'k' : row.value > 0 ? '$' + row.value : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
