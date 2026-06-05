import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { STAGES as DEFAULT_STAGES } from '../constants/stages'

// ─── Context ──────────────────────────────────────────────────────────────────
const StagesContext = createContext(null)

export function useStages() {
  const ctx = useContext(StagesContext)
  if (!ctx) throw new Error('useStages must be used inside <StagesProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function StagesProvider({ children }) {
  const [stages,  setStages]  = useState(DEFAULT_STAGES)
  const [saving,  setSaving]  = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  // Load from Supabase on mount (if configured)
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoaded(true); return }

    supabase
      .from('pipeline_stages')
      .select('*')
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setStages(data.map(r => ({
            id:    r.id,
            label: r.label,
            color: r.color,
            min:   r.min_visits,
          })))
        }
        setLoaded(true)
      })
  }, [])

  // Update a single stage field (optimistic + persist)
  const updateStage = useCallback(async (id, patch) => {
    // Optimistic update
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

    if (!isSupabaseConfigured) return

    // Build DB patch (map min → min_visits)
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
      if (error) console.error('StagesContext update error:', error)
    } finally {
      setSaving(false)
    }
  }, [])

  // Batch save all stages at once
  const saveAllStages = useCallback(async (newStages) => {
    setStages(newStages)
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
      if (error) console.error('StagesContext saveAllStages error:', error)
    } finally {
      setSaving(false)
    }
  }, [])

  // Derived: lookup by id
  const stageById = Object.fromEntries(stages.map(s => [s.id, s]))

  return (
    <StagesContext.Provider value={{ stages, stageById, updateStage, saveAllStages, saving, loaded }}>
      {children}
    </StagesContext.Provider>
  )
}
