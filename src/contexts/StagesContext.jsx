import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { STAGES as DEFAULT_STAGES } from '../constants/stages'

const LS_KEY = 'kiuvo_pipeline_stages'

function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return null
}

function lsSave(stages) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(stages)) } catch (_) {}
}

// ─── Context ──────────────────────────────────────────────────────────────────
const StagesContext = createContext(null)

export function useStages() {
  const ctx = useContext(StagesContext)
  if (!ctx) throw new Error('useStages must be used inside <StagesProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function StagesProvider({ children }) {
  const [stages,  setStages]  = useState(() => lsLoad() || DEFAULT_STAGES)
  const [saving,  setSaving]  = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  // Load from Supabase on mount — Supabase tiene prioridad sobre localStorage
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoaded(true); return }

    supabase
      .from('pipeline_stages')
      .select('*')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[StagesContext] load error:', error.message)
        } else if (data && data.length > 0) {
          const loaded = data.map(r => ({
            id:    r.id,
            label: r.label,
            color: r.color,
            min:   r.min_visits,
          }))
          setStages(loaded)
          lsSave(loaded)
        }
        setLoaded(true)
      })
  }, [])

  // Batch save: localStorage inmediato + Supabase async
  const saveAllStages = useCallback(async (newStages) => {
    setStages(newStages)
    lsSave(newStages)                       // persiste aunque Supabase falle

    if (!isSupabaseConfigured) return

    setSaving(true)
    try {
      const rows = newStages.map((s, i) => ({
        id:         s.id,
        label:      s.label,
        color:      s.color,
        min_visits: s.min,
        sort_order: i,
      }))
      const { error } = await supabase
        .from('pipeline_stages')
        .upsert(rows, { onConflict: 'id' })
      if (error) console.warn('[StagesContext] upsert error:', error.message)
    } finally {
      setSaving(false)
    }
  }, [])

  // Single-field update (optimistic + localStorage + Supabase)
  const updateStage = useCallback(async (id, patch) => {
    setStages(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...patch } : s)
      lsSave(next)
      return next
    })

    if (!isSupabaseConfigured) return

    const dbPatch = {}
    if (patch.label !== undefined) dbPatch.label      = patch.label
    if (patch.color !== undefined) dbPatch.color      = patch.color
    if (patch.min   !== undefined) dbPatch.min_visits = patch.min

    setSaving(true)
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update(dbPatch)
        .eq('id', id)
      if (error) console.warn('[StagesContext] update error:', error.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const stageById = Object.fromEntries(stages.map(s => [s.id, s]))

  return (
    <StagesContext.Provider value={{ stages, stageById, updateStage, saveAllStages, saving, loaded }}>
      {children}
    </StagesContext.Provider>
  )
}
