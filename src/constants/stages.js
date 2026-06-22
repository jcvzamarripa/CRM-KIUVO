export const STAGES = [
  { id: 'prospeccion',  label: 'Prospección',  color: '#888780', min: 1 },
  { id: 'presentacion', label: 'Presentación', color: '#378ADD', min: 2 },
  { id: 'cotizacion',   label: 'Cotización',   color: '#EF9F27', min: 2 },
  { id: 'negociacion',  label: 'Negociación',  color: '#D85A30', min: 3 },
  { id: 'cierre',       label: 'Cierre',       color: '#1D9E75', min: 2 },
]

export const REPOSITORIO_STAGE = {
  id: 'repositorio', label: 'Repositorio', color: '#6B7280', min: 0, isRepository: true,
}

// Stage IDs that cannot be deleted by admins
export const SYSTEM_STAGE_IDS = new Set([
  'prospeccion', 'presentacion', 'cotizacion', 'negociacion', 'cierre', 'repositorio',
])

export const STAGE_BY_ID = Object.fromEntries(
  [...STAGES, REPOSITORIO_STAGE].map(s => [s.id, s])
)
