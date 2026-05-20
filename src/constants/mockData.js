export const MOCK_PROSPECTS = [
  { id: 1,  name: 'Ferretería del Valle',      value: 18500, visits: 1, stage: 'presentacion', days: 3,  last: 'WhatsApp · hace 1 día',   health: 'amber', owner: 'LR' },
  { id: 2,  name: 'Distribuidora Norte',       value: 42800, visits: 4, stage: 'negociacion',  days: 8,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR' },
  { id: 3,  name: 'Constructora ABC',          value: 24500, visits: 6, stage: 'cierre',       days: 4,  last: 'Llamada · hoy',           health: 'green', owner: 'LR' },
  { id: 4,  name: 'Aceros Monterrey',          value: 31200, visits: 2, stage: 'cotizacion',   days: 6,  last: 'Email · hace 3 días',     health: 'green', owner: 'MS' },
  { id: 5,  name: 'Maderería San Juan',        value: 12400, visits: 1, stage: 'prospeccion',  days: 2,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR' },
  { id: 6,  name: 'Plomería Industrial Vega',  value: 9800,  visits: 0, stage: 'prospeccion',  days: 14, last: 'Sin contacto',            health: 'amber', owner: 'LR' },
  { id: 7,  name: 'Refaccionaria El Bajío',    value: 22000, visits: 1, stage: 'presentacion', days: 24, last: 'WhatsApp · hace 9 días',  health: 'red',   owner: 'MS' },
  { id: 8,  name: 'Comercial Las Palmas',      value: 16700, visits: 3, stage: 'negociacion',  days: 5,  last: 'Visita · ayer',           health: 'green', owner: 'LR' },
  { id: 9,  name: 'Materiales Pacífico',       value: 28900, visits: 2, stage: 'cotizacion',   days: 11, last: 'Llamada · hace 4 días',   health: 'amber', owner: 'JT' },
  { id: 10, name: 'Hidráulica del Pacífico',   value: 35000, visits: 5, stage: 'cierre',       days: 2,  last: 'Visita · hoy',            health: 'green', owner: 'MS' },
  { id: 11, name: 'Pinturas El Globo',         value: 14200, visits: 0, stage: 'prospeccion',  days: 1,  last: 'Visita · hoy',            health: 'green', owner: 'AD' },
  { id: 12, name: 'Herrajes San Marcos',       value: 19600, visits: 3, stage: 'cotizacion',   days: 9,  last: 'Email · hace 2 días',     health: 'green', owner: 'RC' },
]

export const MOCK_FUNNEL = [
  { id: 'prospeccion',  count: 14, risk: 0, stuck: 0 },
  { id: 'presentacion', count: 9,  risk: 2, stuck: 0 },
  { id: 'cotizacion',   count: 5,  risk: 0, stuck: 0 },
  { id: 'negociacion',  count: 4,  risk: 0, stuck: 1 },
  { id: 'cierre',       count: 2,  risk: 0, stuck: 0 },
]

export const MOCK_AGENDA = [
  { time: '10:30', ampm: 'AM', name: 'Ferretería del Valle',   activity: 'Presentación de producto',   address: 'Av. Constituyentes 412, Querétaro', visit: 1, stage: 'presentacion' },
  { time: '1:00',  ampm: 'PM', name: 'Distribuidora Norte',    activity: 'Negociación de condiciones', address: 'Blvd. Bernardo Quintana 4200',      visit: 4, stage: 'negociacion'  },
  { time: '4:00',  ampm: 'PM', name: 'Constructora ABC',       activity: 'Cierre de venta · $24,500',  address: 'Parque Industrial Bernardo Q.',     visit: 6, stage: 'cierre'       },
]

export const MOCK_SELLERS = [
  { id: 1, name: 'Luis Ramírez',     init: 'LR', goal: 100000, current: 68400,  prospects: 32, compliance: 86, stuck: 1, won: 142000, color: '#185FA5' },
  { id: 2, name: 'María Sánchez',    init: 'MS', goal: 120000, current: 91200,  prospects: 28, compliance: 92, stuck: 0, won: 168400, color: '#378ADD' },
  { id: 3, name: 'Jorge Treviño',    init: 'JT', goal:  80000, current: 38900,  prospects: 24, compliance: 71, stuck: 4, won:  72100, color: '#D85A30' },
  { id: 4, name: 'Ana Domínguez',    init: 'AD', goal: 100000, current: 84600,  prospects: 30, compliance: 81, stuck: 2, won: 124800, color: '#1D9E75' },
  { id: 5, name: 'Roberto Cárdenas', init: 'RC', goal:  90000, current: 51200,  prospects: 26, compliance: 78, stuck: 1, won:  95300, color: '#EF9F27' },
]

export const MOCK_ACTIVITY = [
  { who: 'María Sánchez',    init: 'MS', what: 'cerró venta',        target: 'Hidráulica del Pacífico', amount: '$35,000',  time: 'hace 4 min',  kind: 'win'   },
  { who: 'Luis Ramírez',     init: 'LR', what: 'registró visita',    target: 'Distribuidora Norte',     amount: '4ª visita',time: 'hace 12 min', kind: 'visit' },
  { who: 'Jorge Treviño',    init: 'JT', what: 'envió cotización',   target: 'Materiales Pacífico',     amount: '$28,900',  time: 'hace 28 min', kind: 'quote' },
  { who: 'Ana Domínguez',    init: 'AD', what: 'agregó prospecto',   target: 'Pinturas El Globo',       amount: '',         time: 'hace 1 h',    kind: 'add'   },
  { who: 'Roberto Cárdenas', init: 'RC', what: 'avanzó a Negociación', target: 'Comercial Las Palmas', amount: '',         time: 'hace 1 h',    kind: 'stage' },
  { who: 'Luis Ramírez',     init: 'LR', what: 'WhatsApp enviado',   target: 'Ferretería del Valle',    amount: '',         time: 'hace 2 h',    kind: 'msg'   },
]

export const MOCK_SALES_TREND = [12, 18, 22, 15, 28, 34, 20, 42, 38, 29, 46, 52, 48, 61]
