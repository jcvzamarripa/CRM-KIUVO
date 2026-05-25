// Historial de actividades compartido entre ActivitiesView y ReportsView
export const MOCK_ACTIVITIES = [
  // ── May 22 (hoy) ──────────────────────────────────────────────────────────
  { id:  1, date:'2026-05-22', time:'11:05', kind:'visit',    sellerInit:'AD', sellerName:'Ana Domínguez',    prospect:'Pinturas El Globo',          detail:'1ª visita · presentación de catálogo',            amount:'' },
  { id:  2, date:'2026-05-22', time:'10:32', kind:'call',     sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Ferretería del Valle',        detail:'Llamada de seguimiento · 12 min',                  amount:'' },
  { id:  3, date:'2026-05-22', time:'09:18', kind:'whatsapp', sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'Confirmación de cierre · respuesta positiva',      amount:'' },
  // ── May 21 ────────────────────────────────────────────────────────────────
  { id:  4, date:'2026-05-21', time:'16:44', kind:'win',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'Venta cerrada · pedido confirmado',                amount:'$35,000' },
  { id:  5, date:'2026-05-21', time:'15:30', kind:'quote',    sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:"Cotización enviada · 48 pzas válvula 1\"",         amount:'$28,900' },
  { id:  6, date:'2026-05-21', time:'14:00', kind:'visit',    sellerInit:'AD', sellerName:'Ana Domínguez',    prospect:'Pinturas El Globo',           detail:'Visita de diagnóstico · necesidades identificadas', amount:'' },
  { id:  7, date:'2026-05-21', time:'11:20', kind:'stage',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'Avanzó Cotización → Negociación',                  amount:'' },
  { id:  8, date:'2026-05-21', time:'09:30', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Comercial Las Palmas',        detail:'3ª visita · revisión de propuesta',                amount:'' },
  // ── May 20 ────────────────────────────────────────────────────────────────
  { id:  9, date:'2026-05-20', time:'17:00', kind:'win',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'Cierre confirmado en visita presencial',            amount:'$35,000' },
  { id: 10, date:'2026-05-20', time:'15:15', kind:'call',     sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Refaccionaria El Bajío',      detail:'Intento de contacto · sin respuesta',              amount:'' },
  { id: 11, date:'2026-05-20', time:'14:30', kind:'visit',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'5ª visita · firma de pedido',                     amount:'' },
  { id: 12, date:'2026-05-20', time:'12:00', kind:'quote',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Maderería San Juan',          detail:'Cotización inicial enviada',                       amount:'$12,400' },
  { id: 13, date:'2026-05-20', time:'10:00', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Constructora ABC',            detail:'6ª visita · negociación final',                   amount:'' },
  // ── May 19 ────────────────────────────────────────────────────────────────
  { id: 14, date:'2026-05-19', time:'16:00', kind:'new',      sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Plomería Industrial Vega',    detail:'Prospecto registrado · referido de Constructora ABC', amount:'' },
  { id: 15, date:'2026-05-19', time:'15:00', kind:'call',     sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Llamada de seguimiento · 8 min',                   amount:'' },
  { id: 16, date:'2026-05-19', time:'13:00', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Plomería Industrial Vega',    detail:'1ª visita · reconocimiento de planta',             amount:'' },
  { id: 17, date:'2026-05-19', time:'11:00', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'4ª visita · revisión de condiciones',              amount:'' },
  { id: 18, date:'2026-05-19', time:'09:30', kind:'whatsapp', sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Aceros Monterrey',            detail:'Envío de ficha técnica por WhatsApp',              amount:'' },
  // ── May 18 ────────────────────────────────────────────────────────────────
  { id: 19, date:'2026-05-18', time:'16:30', kind:'call',     sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Refaccionaria El Bajío',      detail:'Llamada de reactivación · cita agendada',          amount:'' },
  { id: 20, date:'2026-05-18', time:'14:00', kind:'quote',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Aceros Monterrey',            detail:'Cotización revisada · descuento 5%',               amount:'$31,200' },
  { id: 21, date:'2026-05-18', time:'11:30', kind:'call',     sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'Llamada de prospección inicial · 20 min',          amount:'' },
  { id: 22, date:'2026-05-18', time:'09:00', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Ferretería del Valle',        detail:'1ª visita · presentación de portafolio',           amount:'' },
  // ── May 16 ────────────────────────────────────────────────────────────────
  { id: 23, date:'2026-05-16', time:'17:30', kind:'email',    sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Email de seguimiento cotización enviado',          amount:'' },
  { id: 24, date:'2026-05-16', time:'15:00', kind:'stage',    sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Avanzó Presentación → Cotización',                amount:'' },
  { id: 25, date:'2026-05-16', time:'13:30', kind:'visit',    sellerInit:'AD', sellerName:'Ana Domínguez',    prospect:'Pinturas El Globo',           detail:'1ª visita · presentación inicial',                amount:'' },
  { id: 26, date:'2026-05-16', time:'10:00', kind:'call',     sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'2ª llamada · confirmación de interés',            amount:'' },
  // ── May 15 ────────────────────────────────────────────────────────────────
  { id: 27, date:'2026-05-15', time:'16:45', kind:'whatsapp', sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Ferretería del Valle',        detail:'WhatsApp de seguimiento post-visita',             amount:'' },
  { id: 28, date:'2026-05-15', time:'14:00', kind:'stage',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Constructora ABC',            detail:'Avanzó Negociación → Cierre',                     amount:'' },
  { id: 29, date:'2026-05-15', time:'11:00', kind:'visit',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'4ª visita · demo de producto en sitio',           amount:'' },
  { id: 30, date:'2026-05-15', time:'09:00', kind:'new',      sellerInit:'AD', sellerName:'Ana Domínguez',    prospect:'Pinturas El Globo',           detail:'Prospecto dado de alta en el sistema',             amount:'' },
  // ── May 14 ────────────────────────────────────────────────────────────────
  { id: 31, date:'2026-05-14', time:'17:00', kind:'call',     sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Maderería San Juan',          detail:'Llamada de prospección · referido por proveedor', amount:'' },
  { id: 32, date:'2026-05-14', time:'15:30', kind:'quote',    sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Cotización enviada · lote inicial',               amount:'$19,600' },
  { id: 33, date:'2026-05-14', time:'13:00', kind:'visit',    sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'2ª visita · diagnóstico de necesidades',          amount:'' },
  { id: 34, date:'2026-05-14', time:'10:30', kind:'stage',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'Avanzó Cotización → Negociación',                  amount:'' },
  // ── May 13 ────────────────────────────────────────────────────────────────
  { id: 35, date:'2026-05-13', time:'16:00', kind:'email',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Aceros Monterrey',            detail:'Propuesta técnica enviada por email',              amount:'' },
  { id: 36, date:'2026-05-13', time:'14:30', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'3ª visita · refinamiento de propuesta',           amount:'' },
  { id: 37, date:'2026-05-13', time:'11:00', kind:'new',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Refaccionaria El Bajío',      detail:'Reactivación de prospecto inactivo',              amount:'' },
  // ── May 12 ────────────────────────────────────────────────────────────────
  { id: 38, date:'2026-05-12', time:'16:30', kind:'whatsapp', sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'WhatsApp inicial · presentación de empresa',      amount:'' },
  { id: 39, date:'2026-05-12', time:'14:00', kind:'call',     sellerInit:'AD', sellerName:'Ana Domínguez',    prospect:'Pinturas El Globo',           detail:'Llamada de investigación · mercado pinturas',     amount:'' },
  { id: 40, date:'2026-05-12', time:'11:30', kind:'visit',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'3ª visita · cotización en sitio',                 amount:'' },
  { id: 41, date:'2026-05-12', time:'09:00', kind:'stage',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'Avanzó Presentación → Cotización',                amount:'' },
  // ── May 10 ────────────────────────────────────────────────────────────────
  { id: 42, date:'2026-05-10', time:'17:30', kind:'email',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'Cotización formal enviada por email',              amount:'$42,800' },
  { id: 43, date:'2026-05-10', time:'15:00', kind:'visit',    sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Aceros Monterrey',            detail:'2ª visita · presentación técnica',                amount:'' },
  { id: 44, date:'2026-05-10', time:'11:00', kind:'call',     sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Comercial Las Palmas',        detail:'1ª llamada · exploración de necesidades',         amount:'' },
  // ── May 09 ────────────────────────────────────────────────────────────────
  { id: 45, date:'2026-05-09', time:'16:00', kind:'new',      sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Comercial Las Palmas',        detail:'Prospecto captado en expo industrial',             amount:'' },
  { id: 46, date:'2026-05-09', time:'14:30', kind:'visit',    sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'1ª visita · visita en frío',                      amount:'' },
  { id: 47, date:'2026-05-09', time:'10:00', kind:'new',      sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Maderería San Juan',          detail:'Prospecto dado de alta · referido',                amount:'' },
  // ── May 07 ────────────────────────────────────────────────────────────────
  { id: 48, date:'2026-05-07', time:'15:30', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'2ª visita · demostración de producto',            amount:'' },
  { id: 49, date:'2026-05-07', time:'13:00', kind:'call',     sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'2ª llamada · agendó visita técnica',              amount:'' },
  { id: 50, date:'2026-05-07', time:'10:30', kind:'new',      sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Materiales Pacífico',         detail:'Prospecto dado de alta · directorio industrial',  amount:'' },
  // ── May 05 ────────────────────────────────────────────────────────────────
  { id: 51, date:'2026-05-05', time:'16:00', kind:'visit',    sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Distribuidora Norte',         detail:'1ª visita · introducción comercial',              amount:'' },
  { id: 52, date:'2026-05-05', time:'14:30', kind:'new',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Aceros Monterrey',            detail:'Prospecto registrado · contacto LinkedIn',         amount:'' },
  // ── Abril ─────────────────────────────────────────────────────────────────
  { id: 53, date:'2026-04-30', time:'11:00', kind:'new',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Hidráulica del Pacífico',     detail:'Prospecto dado de alta · visita en frío',          amount:'' },
  { id: 54, date:'2026-04-30', time:'09:00', kind:'new',      sellerInit:'LR', sellerName:'Luis Ramírez',     prospect:'Ferretería del Valle',        detail:'Prospecto dado de alta · referencia cliente',     amount:'' },
  { id: 55, date:'2026-04-28', time:'15:00', kind:'call',     sellerInit:'JT', sellerName:'Jorge Treviño',    prospect:'Refaccionaria El Bajío',      detail:'Llamada de prospección · sin interés inicial',    amount:'' },
  { id: 56, date:'2026-04-28', time:'10:00', kind:'new',      sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Prospecto dado de alta',                          amount:'' },
  { id: 57, date:'2026-04-25', time:'11:00', kind:'new',      sellerInit:'MS', sellerName:'María Sánchez',    prospect:'Refaccionaria El Bajío',      detail:'Prospecto captado en recorrido de zona',           amount:'' },
  { id: 58, date:'2026-04-25', time:'09:30', kind:'new',      sellerInit:'RC', sellerName:'Roberto Cárdenas', prospect:'Herrajes San Marcos',         detail:'Primer contacto · feria regional',                amount:'' },
]
