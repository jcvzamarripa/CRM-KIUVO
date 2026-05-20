export const MOCK_PROSPECTS = [
  { id: 1,  name: 'Ferretería del Valle',      contact: 'Carlos Mendoza',   phone: '4421234567', value: 18500, visits: 1, stage: 'presentacion', days: 3,  last: 'WhatsApp · hace 1 día',   health: 'amber', owner: 'LR' },
  { id: 2,  name: 'Distribuidora Norte',       contact: 'Ana Ruiz',         phone: '4429876543', value: 42800, visits: 4, stage: 'negociacion',  days: 8,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR' },
  { id: 3,  name: 'Constructora ABC',          contact: 'Pedro Ríos',       phone: '4425551234', value: 24500, visits: 6, stage: 'cierre',       days: 4,  last: 'Llamada · hoy',           health: 'green', owner: 'LR' },
  { id: 4,  name: 'Aceros Monterrey',          contact: 'Jorge Vega',       phone: '8182345678', value: 31200, visits: 2, stage: 'cotizacion',   days: 6,  last: 'Email · hace 3 días',     health: 'green', owner: 'MS' },
  { id: 5,  name: 'Maderería San Juan',        contact: 'Roberto Torres',   phone: '4423334444', value: 12400, visits: 1, stage: 'prospeccion',  days: 2,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR' },
  { id: 6,  name: 'Plomería Industrial Vega',  contact: 'Luis Vega',        phone: '4426667777', value: 9800,  visits: 0, stage: 'prospeccion',  days: 14, last: 'Sin contacto',            health: 'amber', owner: 'LR' },
  { id: 7,  name: 'Refaccionaria El Bajío',    contact: 'Mario Salinas',    phone: '4771112222', value: 22000, visits: 1, stage: 'presentacion', days: 24, last: 'WhatsApp · hace 9 días',  health: 'red',   owner: 'MS' },
  { id: 8,  name: 'Comercial Las Palmas',      contact: 'Sandra López',     phone: '4428889999', value: 16700, visits: 3, stage: 'negociacion',  days: 5,  last: 'Visita · ayer',           health: 'green', owner: 'LR' },
  { id: 9,  name: 'Materiales Pacífico',       contact: 'Héctor Fuentes',   phone: '3221234567', value: 28900, visits: 2, stage: 'cotizacion',   days: 11, last: 'Llamada · hace 4 días',   health: 'amber', owner: 'JT' },
  { id: 10, name: 'Hidráulica del Pacífico',   contact: 'Carmen Ibáñez',    phone: '3229876543', value: 35000, visits: 5, stage: 'cierre',       days: 2,  last: 'Visita · hoy',            health: 'green', owner: 'MS' },
  { id: 11, name: 'Pinturas El Globo',         contact: 'David Morales',    phone: '4424445555', value: 14200, visits: 0, stage: 'prospeccion',  days: 1,  last: 'Visita · hoy',            health: 'green', owner: 'AD' },
  { id: 12, name: 'Herrajes San Marcos',       contact: 'Patricia Núñez',   phone: '4426660000', value: 19600, visits: 3, stage: 'cotizacion',   days: 9,  last: 'Email · hace 2 días',     health: 'green', owner: 'RC' },
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

export const MOCK_PRODUCTS = [
  { id: 1,  name: 'Válvula de paso 1/2"',        sku: 'VAL-001', price: 185,  unit: 'pza', category: 'Válvulas'    },
  { id: 2,  name: 'Válvula de paso 3/4"',        sku: 'VAL-002', price: 240,  unit: 'pza', category: 'Válvulas'    },
  { id: 3,  name: 'Válvula de paso 1"',          sku: 'VAL-003', price: 310,  unit: 'pza', category: 'Válvulas'    },
  { id: 4,  name: 'Llave de bola 1/2"',          sku: 'LLA-001', price: 195,  unit: 'pza', category: 'Válvulas'    },
  { id: 5,  name: 'Llave de bola 1"',            sku: 'LLA-002', price: 290,  unit: 'pza', category: 'Válvulas'    },
  { id: 6,  name: 'Tubería PVC 4"',              sku: 'TUB-004', price: 320,  unit: 'ml',  category: 'Tubería'     },
  { id: 7,  name: 'Tubería CPVC 1/2"',           sku: 'TUB-012', price: 48,   unit: 'ml',  category: 'Tubería'     },
  { id: 8,  name: 'Manguera reforzada 1/2"',     sku: 'MAN-012', price: 38,   unit: 'ml',  category: 'Tubería'     },
  { id: 9,  name: 'Codo galvanizado 3/4"',       sku: 'COD-034', price: 48,   unit: 'pza', category: 'Conexiones'  },
  { id: 10, name: 'Tee PVC 1"',                  sku: 'TEE-001', price: 32,   unit: 'pza', category: 'Conexiones'  },
  { id: 11, name: 'Reducción bushing 1" x 3/4"', sku: 'RED-001', price: 22,   unit: 'pza', category: 'Conexiones'  },
  { id: 12, name: 'Bomba centrífuga 1HP',         sku: 'BOM-001', price: 4200, unit: 'pza', category: 'Equipos'     },
  { id: 13, name: 'Bomba sumergible 1/2HP',       sku: 'BOM-002', price: 2800, unit: 'pza', category: 'Equipos'     },
  { id: 14, name: 'Medidor de flujo digital',     sku: 'MED-002', price: 2850, unit: 'pza', category: 'Equipos'     },
  { id: 15, name: 'Filtro sedimentos 5μ',         sku: 'FIL-005', price: 580,  unit: 'pza', category: 'Filtración'  },
  { id: 16, name: 'Filtro carbón activado',       sku: 'FIL-006', price: 720,  unit: 'pza', category: 'Filtración'  },
]
