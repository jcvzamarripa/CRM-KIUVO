/**
 * schoolPackage — cálculo del paquete de credencialización escolar.
 *
 * Modelo de negocio:
 *   • Credenciales — pago único, precio por alumno con escalón por volumen.
 *   • Software     — licencia anual por alumno.
 *   • Equipo       — kits (tablet + lector); la cantidad NO se captura,
 *                    se deriva de los alumnos: CEIL(alumnos / alumnosPorKit).
 *
 * Todos los importes son SIN IVA; el PDF aplica el 16% al final.
 */

export const SCHOOL_DEFAULTS = {
  credentialPrice:     50,    // $ por credencial (precio de lista)
  credentialTierQty:   500,   // a partir de esta cantidad aplica el escalón
  credentialTierPrice: 45,    // $ por credencial dentro del escalón
  softwarePerStudent:  30,    // $ por alumno / año
  kitCost:             6500,  // $ por kit (tablet + lector)
  studentsPerKit:      300,   // alumnos que cubre un kit
}

/**
 * Calcula el desglose completo del paquete.
 * @param {number}  students          Número de alumnos.
 * @param {boolean} includeEquipment  Si el equipo entra en la cotización.
 * @param {object}  params            Sobrescribe SCHOOL_DEFAULTS.
 */
export function calcSchoolPackage({ students, includeEquipment = true, params = {} }) {
  const p = { ...SCHOOL_DEFAULTS, ...params }
  const n = Math.max(0, Math.floor(Number(students) || 0))

  // Escalón por volumen
  const inTier      = n >= p.credentialTierQty
  const unitPrice   = inTier ? p.credentialTierPrice : p.credentialPrice
  const discountPct = p.credentialPrice > 0
    ? Math.round((1 - unitPrice / p.credentialPrice) * 100)
    : 0

  const credentialsTotal = n * unitPrice
  const softwareTotal    = n * p.softwarePerStudent
  const subtotal         = credentialsTotal + softwareTotal

  // Equipo: la cantidad de kits se deriva, no se captura
  const kitsNeeded     = includeEquipment && n > 0
    ? Math.ceil(n / p.studentsPerKit)
    : 0
  const equipmentTotal = kitsNeeded * p.kitCost

  const total = subtotal + equipmentTotal

  return {
    students: n,
    unitPrice,
    listPrice: p.credentialPrice,
    discountPct,
    inTier,
    credentialsTotal,
    softwareTotal,
    subtotal,
    kitsNeeded,
    equipmentTotal,
    total,
    perStudent:            n > 0 ? total / n : 0,
    perStudentNoEquipment: n > 0 ? subtotal / n : 0,
    equipmentSurcharge:    n > 0 ? equipmentTotal / n : 0,
    volumeSavings:         n * (p.credentialPrice - unitPrice),
    params: p,
  }
}

/**
 * Convierte el cálculo en líneas listas para el cotizador.
 * @param {object} calc  Resultado de calcSchoolPackage.
 * @param {'itemized'|'blended'} mode
 *        itemized — credenciales, software y equipo como conceptos separados.
 *        blended  — un solo precio por alumno. El equipo NO se desglosa en
 *                   importe, pero sí se declara cuántos kits se entregan.
 */
export function buildSchoolItems(calc, mode = 'itemized') {
  const stamp = Date.now()
  if (calc.students <= 0) return []

  if (mode === 'blended') {
    const kits   = calc.kitsNeeded
    const plural = kits > 1
    return [{
      id:            `school-all-${stamp}`,
      name:          kits > 0
        ? `Credencialización escolar — incluye ${kits} kit${plural ? 's' : ''} (tablet + lector)`
        : 'Credencialización escolar',
      sku:           kits > 0
        ? `Credencial por alumno · Licencia de software anual · ${kits} kit${plural ? 's' : ''} tablet + lector sin costo adicional`
        : 'Credencial por alumno · Licencia de software anual',
      unit:          'alumno',
      category:      'Credenciales escolares',
      qty:           calc.students,
      price:         calc.perStudent,
      specialPrice:  calc.perStudent,   // precio exacto, sin redondeos
      discountPct:   0,
      extraDiscount: null,
      _school:       true,
      _kits:         kits,
    }]
  }

  const items = [
    {
      id:            `school-cred-${stamp}`,
      name:          'Credencial escolar',
      sku:           'Credencial personalizada con código QR',
      unit:          'alumno',
      category:      'Credenciales escolares',
      qty:           calc.students,
      price:         calc.listPrice,
      discountPct:   calc.discountPct,  // el PDF muestra el descuento por volumen
      specialPrice:  null,
      extraDiscount: null,
      _school:       true,
    },
    {
      id:            `school-soft-${stamp}`,
      name:          'Licencia de software (anual)',
      sku:           'Plataforma de control escolar — 1 año',
      unit:          'alumno',
      category:      'Credenciales escolares',
      qty:           calc.students,
      price:         calc.params.softwarePerStudent,
      discountPct:   0,
      specialPrice:  null,
      extraDiscount: null,
      _school:       true,
    },
  ]

  if (calc.kitsNeeded > 0) {
    items.push({
      id:            `school-kit-${stamp}`,
      name:          'Kit tecnológico (tablet + lector)',
      sku:           `Cubre hasta ${calc.params.studentsPerKit} alumnos por kit`,
      unit:          'kit',
      category:      'Credenciales escolares',
      qty:           calc.kitsNeeded,
      price:         calc.params.kitCost,
      discountPct:   0,
      specialPrice:  null,
      extraDiscount: null,
      _school:       true,
    })
  }

  return items
}
