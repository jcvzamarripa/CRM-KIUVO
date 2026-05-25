export const MOCK_PROSPECTS = [
  { id: 1,  name: 'Ferretería del Valle',      contact: 'Carlos Mendoza',   phone: '4421234567', value: 18500, visits: 1, stage: 'presentacion', days: 3,  last: 'WhatsApp · hace 1 día',   health: 'amber', owner: 'LR', lat: 20.594, lng: -100.389, city: 'Querétaro' },
  { id: 2,  name: 'Distribuidora Norte',       contact: 'Ana Ruiz',         phone: '4429876543', value: 42800, visits: 4, stage: 'negociacion',  days: 8,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR', lat: 20.651, lng: -100.413, city: 'Querétaro' },
  { id: 3,  name: 'Constructora ABC',          contact: 'Pedro Ríos',       phone: '4425551234', value: 24500, visits: 6, stage: 'cierre',       days: 4,  last: 'Llamada · hoy',           health: 'green', owner: 'LR', lat: 20.612, lng: -100.377, city: 'Querétaro' },
  { id: 4,  name: 'Aceros Monterrey',          contact: 'Jorge Vega',       phone: '8182345678', value: 31200, visits: 2, stage: 'cotizacion',   days: 6,  last: 'Email · hace 3 días',     health: 'green', owner: 'MS', lat: 25.686, lng: -100.316, city: 'Monterrey' },
  { id: 5,  name: 'Maderería San Juan',        contact: 'Roberto Torres',   phone: '4423334444', value: 12400, visits: 1, stage: 'prospeccion',  days: 2,  last: 'Visita · hace 2 días',    health: 'green', owner: 'LR', lat: 20.572, lng: -100.401, city: 'Querétaro' },
  { id: 6,  name: 'Plomería Industrial Vega',  contact: 'Luis Vega',        phone: '4426667777', value: 9800,  visits: 0, stage: 'prospeccion',  days: 14, last: 'Sin contacto',            health: 'amber', owner: 'LR', lat: 20.562, lng: -100.371, city: 'Querétaro' },
  { id: 7,  name: 'Refaccionaria El Bajío',    contact: 'Mario Salinas',    phone: '4771112222', value: 22000, visits: 1, stage: 'presentacion', days: 24, last: 'WhatsApp · hace 9 días',  health: 'red',   owner: 'MS', lat: 21.883, lng: -102.297, city: 'Aguascalientes' },
  { id: 8,  name: 'Comercial Las Palmas',      contact: 'Sandra López',     phone: '4428889999', value: 16700, visits: 3, stage: 'negociacion',  days: 5,  last: 'Visita · ayer',           health: 'green', owner: 'LR', lat: 20.623, lng: -100.434, city: 'Querétaro' },
  { id: 9,  name: 'Materiales Pacífico',       contact: 'Héctor Fuentes',   phone: '3221234567', value: 28900, visits: 2, stage: 'cotizacion',   days: 11, last: 'Llamada · hace 4 días',   health: 'amber', owner: 'JT', lat: 20.653, lng: -105.223, city: 'Pto. Vallarta' },
  { id: 10, name: 'Hidráulica del Pacífico',   contact: 'Carmen Ibáñez',    phone: '3229876543', value: 35000, visits: 5, stage: 'cierre',       days: 2,  last: 'Visita · hoy',            health: 'green', owner: 'MS', lat: 20.674, lng: -105.241, city: 'Pto. Vallarta' },
  { id: 11, name: 'Pinturas El Globo',         contact: 'David Morales',    phone: '4424445555', value: 14200, visits: 0, stage: 'prospeccion',  days: 1,  last: 'Visita · hoy',            health: 'green', owner: 'AD', lat: 20.581, lng: -100.362, city: 'Querétaro' },
  { id: 12, name: 'Herrajes San Marcos',       contact: 'Patricia Núñez',   phone: '4426660000', value: 19600, visits: 3, stage: 'cotizacion',   days: 9,  last: 'Email · hace 2 días',     health: 'green', owner: 'RC', lat: 20.603, lng: -100.421, city: 'Querétaro' },
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

export const MOCK_AGENDA_EVENTS = [
  // Semana actual  (May 18-22 2026)
  { id:  1, date:'2026-05-18', start:'09:00', end:'10:00', type:'visita',     name:'Ferretería del Valle',     contact:'Carlos Mendoza',  owner:'LR', stage:'presentacion', address:'Av. Constituyentes 412, Querétaro' },
  { id:  2, date:'2026-05-18', start:'11:30', end:'12:15', type:'llamada',    name:'Materiales Pacífico',      contact:'Héctor Fuentes',  owner:'JT', stage:'cotizacion',   address:'' },
  { id:  3, date:'2026-05-18', start:'14:00', end:'15:30', type:'cotizacion', name:'Aceros Monterrey',         contact:'Jorge Vega',      owner:'MS', stage:'cotizacion',   address:'Blvd. Industrial 1400, Monterrey' },
  { id:  4, date:'2026-05-19', start:'09:30', end:'10:30', type:'visita',     name:'Distribuidora Norte',      contact:'Ana Ruiz',        owner:'LR', stage:'negociacion',  address:'Blvd. Bernardo Quintana 4200' },
  { id:  5, date:'2026-05-19', start:'11:00', end:'11:30', type:'llamada',    name:'Herrajes San Marcos',      contact:'Patricia Núñez',  owner:'RC', stage:'cotizacion',   address:'' },
  { id:  6, date:'2026-05-19', start:'13:00', end:'14:00', type:'visita',     name:'Plomería Industrial Vega', contact:'Luis Vega',       owner:'LR', stage:'prospeccion',  address:'Parque Industrial Norte, Qro.' },
  { id:  7, date:'2026-05-19', start:'16:00', end:'17:00', type:'reunion',    name:'Reunión de equipo',        contact:'Equipo ventas',   owner:'LR', stage:'',             address:'Oficina central' },
  { id:  8, date:'2026-05-20', start:'10:00', end:'11:30', type:'visita',     name:'Constructora ABC',         contact:'Pedro Ríos',      owner:'LR', stage:'cierre',       address:'Parque Industrial Bernardo Q.' },
  { id:  9, date:'2026-05-20', start:'12:00', end:'12:45', type:'cotizacion', name:'Maderería San Juan',       contact:'Roberto Torres',  owner:'LR', stage:'prospeccion',  address:'' },
  { id: 10, date:'2026-05-20', start:'14:30', end:'16:00', type:'cierre',     name:'Hidráulica del Pacífico',  contact:'Carmen Ibáñez',   owner:'MS', stage:'cierre',       address:'Zona Costanera s/n, Pto. Vallarta' },
  { id: 11, date:'2026-05-20', start:'16:30', end:'17:00', type:'llamada',    name:'Refaccionaria El Bajío',   contact:'Mario Salinas',   owner:'MS', stage:'presentacion', address:'' },
  { id: 12, date:'2026-05-21', start:'09:00', end:'10:00', type:'visita',     name:'Comercial Las Palmas',     contact:'Sandra López',    owner:'LR', stage:'negociacion',  address:'Av. Reforma 220, Querétaro' },
  { id: 13, date:'2026-05-21', start:'10:30', end:'12:00', type:'cierre',     name:'Distribuidora Norte',      contact:'Ana Ruiz',        owner:'LR', stage:'cierre',       address:'Blvd. Bernardo Quintana 4200' },
  { id: 14, date:'2026-05-21', start:'13:30', end:'14:30', type:'visita',     name:'Pinturas El Globo',        contact:'David Morales',   owner:'AD', stage:'prospeccion',  address:'Calle 5 de Mayo 88, Querétaro' },
  { id: 15, date:'2026-05-21', start:'15:00', end:'16:00', type:'cotizacion', name:'Materiales Pacífico',      contact:'Héctor Fuentes',  owner:'JT', stage:'cotizacion',   address:'' },
  // Hoy (May 22 · Viernes)
  { id: 16, date:'2026-05-22', start:'10:30', end:'11:30', type:'visita',     name:'Ferretería del Valle',     contact:'Carlos Mendoza',  owner:'LR', stage:'presentacion', address:'Av. Constituyentes 412, Querétaro' },
  { id: 17, date:'2026-05-22', start:'13:00', end:'14:00', type:'cotizacion', name:'Distribuidora Norte',      contact:'Ana Ruiz',        owner:'LR', stage:'negociacion',  address:'' },
  { id: 18, date:'2026-05-22', start:'16:00', end:'17:30', type:'cierre',     name:'Constructora ABC',         contact:'Pedro Ríos',      owner:'LR', stage:'cierre',       address:'Parque Industrial Bernardo Q.' },
  // Semana siguiente (May 25-29)
  { id: 19, date:'2026-05-25', start:'09:00', end:'10:00', type:'visita',     name:'Aceros Monterrey',         contact:'Jorge Vega',      owner:'MS', stage:'negociacion',  address:'Blvd. Industrial 1400, Monterrey' },
  { id: 20, date:'2026-05-25', start:'11:00', end:'11:45', type:'llamada',    name:'Herrajes San Marcos',      contact:'Patricia Núñez',  owner:'RC', stage:'cotizacion',   address:'' },
  { id: 21, date:'2026-05-25', start:'14:00', end:'15:30', type:'cotizacion', name:'Pinturas El Globo',        contact:'David Morales',   owner:'AD', stage:'presentacion', address:'' },
  { id: 22, date:'2026-05-26', start:'10:00', end:'11:00', type:'visita',     name:'Comercial Las Palmas',     contact:'Sandra López',    owner:'LR', stage:'negociacion',  address:'Av. Reforma 220, Querétaro' },
  { id: 23, date:'2026-05-26', start:'12:00', end:'13:00', type:'llamada',    name:'Plomería Industrial Vega', contact:'Luis Vega',       owner:'LR', stage:'prospeccion',  address:'' },
  { id: 24, date:'2026-05-26', start:'14:30', end:'16:00', type:'reunion',    name:'Revisión de pipeline Q2',  contact:'Equipo ventas',   owner:'LR', stage:'',             address:'Oficina central' },
  { id: 25, date:'2026-05-27', start:'09:30', end:'11:00', type:'cierre',     name:'Hidráulica del Pacífico',  contact:'Carmen Ibáñez',   owner:'MS', stage:'cierre',       address:'Zona Costanera s/n, Pto. Vallarta' },
  { id: 26, date:'2026-05-27', start:'12:00', end:'13:00', type:'visita',     name:'Maderería San Juan',       contact:'Roberto Torres',  owner:'LR', stage:'prospeccion',  address:'Calle Álamos 34, Querétaro' },
  { id: 27, date:'2026-05-28', start:'10:00', end:'11:00', type:'visita',     name:'Pinturas El Globo',        contact:'David Morales',   owner:'AD', stage:'presentacion', address:'Calle 5 de Mayo 88, Querétaro' },
  { id: 28, date:'2026-05-28', start:'15:00', end:'16:00', type:'reunion',    name:'Revisión de pipeline',     contact:'Equipo ventas',   owner:'LR', stage:'',             address:'Oficina central' },
  { id: 29, date:'2026-05-29', start:'11:00', end:'12:00', type:'llamada',    name:'Refaccionaria El Bajío',   contact:'Mario Salinas',   owner:'MS', stage:'presentacion', address:'' },
  { id: 30, date:'2026-05-29', start:'14:00', end:'15:30', type:'cotizacion', name:'Aceros Monterrey',         contact:'Jorge Vega',      owner:'MS', stage:'cotizacion',   address:'' },
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
