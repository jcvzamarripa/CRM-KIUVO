import React, { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import { STAGE_BY_ID } from '../../constants/stages'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { enqueue } from '../../lib/offlineQueue'
import useOnlineStatus from '../../hooks/useOnlineStatus'

const PROSPECTS_CACHE_KEY = 'kiuvo_prospects_cache'

const ACTIVITY_TYPES = [
  { id: 'visit',    label: 'Visita',    icon: 'map-pin' },
  { id: 'call',     label: 'Llamada',   icon: 'phone' },
  { id: 'whatsapp', label: 'WhatsApp',  icon: 'brand-whatsapp' },
  { id: 'email',    label: 'Email',     icon: 'mail' },
]

export default function VisitModal({ onClose, onSaved }) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const [step, setStep]             = useState('form')
  const [selected, setSelected]     = useState(null)
  const [actType, setActType]       = useState('visit')
  const [note, setNote]             = useState('')
  const [search, setSearch]         = useState('')
  const [prospects, setProspects]   = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [savedOffline, setSavedOffline] = useState(false)

  // Load seller's prospects — fall back to cache when offline or Supabase not configured
  useEffect(() => {
    if (!isOnline || !isSupabaseConfigured) {
      try {
        const cached = JSON.parse(localStorage.getItem(PROSPECTS_CACHE_KEY) || '[]')
        setProspects(cached)
      } catch { setProspects([]) }
      setLoadingList(false)
      return
    }

    supabase
      .from('prospects')
      .select('id, name, stage_id')
      .eq('owner_id', user.id)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          // Fallo de red o BD — usar caché
          try {
            const cached = JSON.parse(localStorage.getItem(PROSPECTS_CACHE_KEY) || '[]')
            setProspects(cached)
          } catch { setProspects([]) }
        } else {
          const list = data ?? []
          setProspects(list)
          try { localStorage.setItem(PROSPECTS_CACHE_KEY, JSON.stringify(list)) } catch {}
        }
        setLoadingList(false)
      })
      .catch(() => {
        // Error inesperado — usar caché silenciosamente
        try {
          const cached = JSON.parse(localStorage.getItem(PROSPECTS_CACHE_KEY) || '[]')
          setProspects(cached)
        } catch { setProspects([]) }
        setLoadingList(false)
      })
  }, [user.id, isOnline])

  const filtered = prospects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    setServerError('')

    const payload = {
      prospect_id: selected,
      seller_id:   user.id,
      kind:        actType,
      notes:       note.trim() || null,
    }

    // ── Sin conexión o sin Supabase configurado: guardar en cola local ───────
    if (!isOnline || !isSupabaseConfigured) {
      enqueue({ type: 'INSERT_VISIT', table: 'visits', payload })
      setSubmitting(false)
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
      return
    }

    // ── Online + Supabase configurado: enviar ─────────────────────────────
    try {
      const { error } = await supabase.from('visits').insert(payload)
      if (error) throw error

      // Actualizar last_contact_at en el prospecto
      await supabase
        .from('prospects')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', selected)

      onSaved?.()
      setStep('success')
      setTimeout(onClose, 1800)
    } catch {
      // Fallo de red o BD — encolar como fallback
      enqueue({ type: 'INSERT_VISIT', table: 'visits', payload })
      setSavedOffline(true)
      setStep('success')
      setTimeout(onClose, 2200)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProspect = prospects.find(p => p.id === selected)
  const selectedAct = ACTIVITY_TYPES.find(a => a.id === actType)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '90%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {step === 'success' ? (
          <SuccessView prospect={selectedProspect} act={selectedAct} offline={savedOffline} />
        ) : (
          <FormView
            search={search} setSearch={setSearch}
            prospects={filtered}
            loadingList={loadingList}
            selected={selected} setSelected={setSelected}
            actType={actType} setActType={setActType}
            note={note} setNote={setNote}
            submitting={submitting}
            serverError={serverError}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </>
  )
}

function SuccessView({ prospect, act, offline }) {
  return (
    <div style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: offline ? '#FFF3E0' : 'var(--success-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={offline ? 'cloud-off' : 'check'} size={32} color={offline ? '#EF9F27' : 'var(--success)'} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>
        {offline ? 'Guardado sin conexión' : '¡Actividad registrada!'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
        {offline
          ? <>
              <b style={{ color: 'var(--fg)' }}>{act?.label}</b> con <b style={{ color: 'var(--fg)' }}>{prospect?.name}</b> en cola.{' '}
              <span style={{ color: '#EF9F27' }}>Se sincronizará al reconectar.</span>
            </>
          : <>
              <b style={{ color: 'var(--fg)' }}>{act?.label}</b> con <b style={{ color: 'var(--fg)' }}>{prospect?.name}</b> guardada correctamente.
            </>
        }
      </div>
    </div>
  )
}

function FormView({ search, setSearch, prospects, loadingList, selected, setSelected, actType, setActType, note, setNote, submitting, serverError, onClose, onSubmit }) {
  const canSubmit = selected !== null && !submitting

  return (
    <>
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)' }}>Registrar actividad</div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--bg-secondary)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-secondary)',
          }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>

        {/* Activity type */}
        <Section label="TIPO DE ACTIVIDAD">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ACTIVITY_TYPES.map(a => {
              const on = actType === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => setActType(a.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 4px', borderRadius: 'var(--r-md)',
                    border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                    background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                    color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg-secondary)',
                  }}
                >
                  <Icon name={a.icon} size={19} />
                  <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.2, textAlign: 'center' }}>{a.label}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Prospect picker */}
        <Section label="PROSPECTO">
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Icon
              name="search" size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar prospecto…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 10px 9px 30px',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 210, overflowY: 'auto' }}>
            {loadingList ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 52, borderRadius: 'var(--r-md)',
                  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                  opacity: 1 - i * 0.2,
                }} />
              ))
            ) : prospects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fg-tertiary)', fontSize: 13 }}>
                Sin resultados
              </div>
            ) : prospects.map(p => {
              const stage = STAGE_BY_ID[p.stage_id] ?? STAGE_BY_ID['prospeccion']
              const on = selected === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    border: `0.5px solid ${on ? 'var(--kiuvo-blue)' : 'var(--border)'}`,
                    background: on ? 'var(--kiuvo-blue-soft)' : 'var(--surface)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: on ? 'var(--kiuvo-blue-deep)' : 'var(--fg)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: on ? 'var(--kiuvo-blue)' : 'var(--fg-secondary)' }}>
                      {stage.label}
                    </div>
                  </div>
                  {on && <Icon name="check" size={15} color="var(--kiuvo-blue)" />}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Note */}
        <Section label="NOTA (OPCIONAL)">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="¿Cómo fue? Agrega un comentario…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--fg)',
              outline: 'none', resize: 'none', fontFamily: 'inherit',
            }}
          />
        </Section>

        <div style={{ height: 8 }} />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid var(--border)' }}>
        {serverError && (
          <div style={{
            marginBottom: 10, padding: '10px 14px',
            background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
            borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger-fg)',
          }}>
            {serverError}
          </div>
        )}
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px',
            background: canSubmit ? 'var(--kiuvo-blue)' : 'var(--bg-tertiary)',
            color: canSubmit ? '#fff' : 'var(--fg-tertiary)',
            borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 500,
            opacity: canSubmit ? 1 : 0.6,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
          {submitting ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
