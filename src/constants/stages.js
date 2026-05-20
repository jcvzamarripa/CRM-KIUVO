export const STAGES = [
  { id: 'prospeccion',  label: 'Prospección',  color: '#888780', min: 1 },
  { id: 'presentacion', label: 'Presentación', color: '#378ADD', min: 2 },
  { id: 'cotizacion',   label: 'Cotización',   color: '#EF9F27', min: 2 },
  { id: 'negociacion',  label: 'Negociación',  color: '#D85A30', min: 3 },
  { id: 'cierre',       label: 'Cierre',       color: '#1D9E75', min: 2 },
]

export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]))
