import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { STAGES as DEFAULT_STAGES, REPOSITORIO_STAGE } from '../constants/stages'

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

// Always ensure repositorio is the last stage
function withRepositorio(stages) {
  const withoutRepo = stages.filter(s => s.id !== 'repositorio')
  const existing = stages.find(s => s.id === 'repositorio')
  return [...withoutRepo, existing || REPOSITORIO_STAGE]
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
  const [stages,  setStages]  = useState(() => withRepositorio(lsLoad() || DEFAULT_STAGES))
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
            ...(r.id === 'repositorio' ? { isRepository: true } : {}),
          }))
          const withRepo = withRepositorio(loaded)
          setStages(withRepo)
          lsSave(withRepo)
        }
        setLoaded(true)
      })
  }, [])

  // Batch save: localStorage inmediato + Supabase async
  const saveAllStages = useCallback(async (newStages) => {
    const withRepo = withRepositorio(newStages)
    setStages(withRepo)
    lsSave(withRepo)

    if (!isSupabaseConfigured) return

    setSaving(true)
    try {
      const rows = withRepo.map((s, i) => ({
        id:         s.id,
        label:      s.label,
        color:      s.color,
        min_visits: s.min ?? 0,
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

  // Add a new custom stage (inserted before repositorio)
  const addStage = useCallback(async (label = 'Nueva etapa', color = '#7C5CBF') => {
    const id = 'custom_' + Date.now()
    const newStage = { id, label, color, min: 1 }
    setStages(prev => {
      const withoutRepo = prev.filter(s => s.id !== 'repositorio')
      const repo = prev.find(s => s.id === 'repositorio') || REPOSITORIO_STAGE
      const next = [...withoutRepo, newStage, repo]
      lsSave(next)
      return next
    })

    if (!isSupabaseConfigured) return

    setSaving(true)
    try {
      // Re-fetch current stages to get correct sort_order
      const { data } = await supabase
        .from('pipeline_stages')
        .select('id, sort_order')
        .order('sort_order')
      const maxOrder = data ? Math.max(...data.map(r => r.sort_order ?? 0)) : 10
      const repoOrder = data?.find(r => r.id === 'repositorio')?.sort_order ?? maxOrder
      // Insert new stage before repositorio
      await supabase.from('pipeline_stages').upsert([
        { id, label, color, min_visits: 1, sort_order: repoOrder },
        { id: 'repositorio', label: stages.find(s => s.id === 'repositorio')?.label || 'Repositorio',
          color: stages.find(s => s.id === 'repositorio')?.color || '#6B7280',
          min_visits: 0, sort_order: repoOrder + 1 },
      ], { onConflict: 'id' })
    } finally {
      setSaving(false)
    }
  }, [stages])

  // Delete a custom (non-system) stage
  const deleteStage = useCallback(async (id) => {
    setStages(prev => {
      const next = prev.filter(s => s.id !== id)
      lsSave(next)
      return next
    })

    if (!isSupabaseConfigured) return

    setSaving(true)
    try {
      await supabase.from('pipeline_stages').delete().eq('id', id)
    } finally {
      setSaving(false)
    }
  }, [])

  const stageById = Object.fromEntries(stages.map(s => [s.id, s]))

  return (
    <StagesContext.Provider value={{
      stages, stageById, updateStage, saveAllStages, addStage, deleteStage, saving, loaded,
    }}>
      {children}
    </StagesContext.Provider>
  )
}
