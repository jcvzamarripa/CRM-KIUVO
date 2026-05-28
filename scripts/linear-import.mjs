/**
 * KIUVO CRM — Importador de issues a Linear
 *
 * Uso:
 *   1. Crea un API key en: https://linear.app/settings/api
 *   2. Copia tu Team ID desde: Linear → Settings → Team → General (URL o campo ID)
 *   3. Ejecuta:  node scripts/linear-import.mjs
 *
 * Variables de entorno (crea un archivo .env.linear en la raíz):
 *   LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
 *   LINEAR_TEAM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */

import { LinearClient } from '@linear/sdk'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.linear') })

const API_KEY   = process.env.LINEAR_API_KEY
const TEAM_ID   = process.env.LINEAR_TEAM_ID

if (!API_KEY || !TEAM_ID) {
  console.error('\n❌  Faltan variables de entorno.')
  console.error('   Crea el archivo .env.linear en la raíz del proyecto con:')
  console.error('   LINEAR_API_KEY=lin_api_...')
  console.error('   LINEAR_TEAM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n')
  process.exit(1)
}

const client = new LinearClient({ apiKey: API_KEY })

// ─── Labels por ciclo ────────────────────────────────────────────────────────
const LABEL_COLORS = {
  Backend:  '#5E6AD2',
  Frontend: '#26B5CE',
  Admin:    '#4CB782',
  DevOps:   '#F2994A',
}

// ─── Issues ──────────────────────────────────────────────────────────────────
// Priority: 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
const ISSUES = [
  // ── Ciclo 1: Base de datos y autenticación ─────────────────────────────────
  {
    title: 'Configurar proyecto Supabase y variables de entorno',
    description: 'Crear proyecto en Supabase, definir `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, instalar `@supabase/supabase-js`, crear `src/lib/supabase.js`.',
    priority: 1, label: 'Backend', cycle: 1,
  },
  {
    title: 'Esquema de base de datos — tablas principales',
    description: 'Crear tablas: `profiles`, `prospects`, `visits`, `quotes`, `quote_items`, `activities`, `notifications`. Definir relaciones, PKs, FKs y RLS policies básicas.',
    priority: 1, label: 'Backend', cycle: 1,
  },
  {
    title: 'Autenticación real con Supabase Auth',
    description: 'Reemplazar el AuthContext de demo por Supabase Auth (email + contraseña). Manejo de sesión persistente, refresh token, logout. Soporte de roles `vendedor` y `admin` en tabla `profiles`.',
    priority: 1, label: 'Backend', cycle: 1,
  },
  {
    title: 'Pantalla de login conectada a Supabase',
    description: 'Validación de formulario, mensajes de error reales (credenciales incorrectas, cuenta no verificada), loading state durante login.',
    priority: 2, label: 'Frontend', cycle: 1,
  },
  {
    title: 'Row Level Security — políticas por rol',
    description: 'Vendedor solo ve sus propios prospectos y visitas. Admin ve todo el equipo. Implementar policies en todas las tablas con `auth.uid()`.',
    priority: 2, label: 'Backend', cycle: 1,
  },

  // ── Ciclo 2: Módulo vendedor ───────────────────────────────────────────────
  {
    title: 'Prospectos — CRUD completo en Supabase',
    description: 'Reemplazar `MOCK_PROSPECTS` en Kanban. Listar, crear, actualizar etapa y eliminar prospectos desde tabla `prospects`. Optimistic updates para que la UI no se congele.',
    priority: 2, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Registrar visita conectado a base de datos',
    description: 'El modal "Registrar visita" guarda en tabla `visits` con `prospect_id`, `user_id`, `type`, `notes`, `created_at`. Incrementa contador de visitas del prospecto.',
    priority: 2, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Nuevo prospecto — guardar en Supabase',
    description: 'El modal "Nuevo prospecto" inserta en `prospects` con todos los campos. Asigna automáticamente `owner_id = auth.uid()` y etapa inicial `prospeccion`.',
    priority: 2, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Cotizador — guardar cotización y líneas',
    description: '`QuoteModal` guarda en `quotes` + `quote_items`. Relaciona con `prospect_id`. El botón "Generar cotización" produce un PDF descargable (`@react-pdf/renderer` o edge function).',
    priority: 2, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Agenda — eventos persistidos en Supabase',
    description: 'Eventos locales guardados en tabla `events` en lugar de solo memoria. Sincronización bidireccional con Google Calendar sigue opcional.',
    priority: 3, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Notificaciones — generadas por triggers de Supabase',
    description: 'Crear database function + trigger que inserte en `notifications` cuando: prospecto lleva N días sin actividad, visita queda pendiente, se acerca fecha de agenda.',
    priority: 2, label: 'Backend', cycle: 2,
  },
  {
    title: 'Perfil de usuario — sincronizado con tabla profiles',
    description: '`ProfileScreen` lee y escribe en tabla `profiles` (nombre, rol, avatar en Supabase Storage). Eliminar dependencia de `localStorage`.',
    priority: 3, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Mapa — coordenadas reales de prospectos',
    description: 'Mostrar en el mapa los prospectos reales del vendedor usando sus campos `lat`/`lng`. Geocodificación automática al capturar dirección (OpenStreetMap Nominatim, sin costo).',
    priority: 3, label: 'Frontend', cycle: 2,
  },
  {
    title: 'Reactivador — consulta real a Supabase',
    description: 'Calcular clientes con más de 60 días sin actividad desde `visits` y `activities`. Reemplazar lista hardcodeada.',
    priority: 3, label: 'Backend', cycle: 2,
  },
  {
    title: 'Real-time — actualizaciones en vivo con Supabase Realtime',
    description: 'Suscribir Kanban y notificaciones a Supabase Realtime. Si otro dispositivo mueve un prospecto, el Kanban se actualiza sin recargar.',
    priority: 3, label: 'Frontend', cycle: 2,
  },

  // ── Ciclo 3: Panel administrador ───────────────────────────────────────────
  {
    title: 'Dashboard admin con métricas reales',
    description: 'Conectar KPIs (prospectos activos, cierres del mes, cotizaciones pendientes, tasa de conversión) a queries Supabase. Reemplazar datos hardcodeados.',
    priority: 2, label: 'Admin', cycle: 3,
  },
  {
    title: 'Gestión de vendedores',
    description: 'CRUD de usuarios del equipo. Invitar por email (Supabase Auth invite), asignar rol, ver resumen de actividad por vendedor.',
    priority: 2, label: 'Admin', cycle: 3,
  },
  {
    title: 'Vista global del embudo — todos los vendedores',
    description: 'Admin ve Kanban con todos los prospectos del equipo, filtrables por vendedor, etapa y fecha. Vendedor solo ve los suyos.',
    priority: 2, label: 'Admin', cycle: 3,
  },
  {
    title: 'Historial completo de actividades',
    description: 'Tabla de todas las visitas, llamadas y acciones con filtros por vendedor, prospecto y rango de fechas. Exportar a CSV.',
    priority: 3, label: 'Admin', cycle: 3,
  },
  {
    title: 'Gestión de cotizaciones — flujo de aprobación',
    description: 'Admin puede ver, aprobar o rechazar cotizaciones. Estado: borrador → enviada → aprobada → rechazada. Notifica al vendedor al cambiar estado.',
    priority: 3, label: 'Admin', cycle: 3,
  },
  {
    title: 'Reportes y exportación',
    description: 'Reporte semanal/mensual por vendedor: visitas realizadas, prospectos avanzados, cierres, monto cotizado. Exportar a Excel/CSV.',
    priority: 3, label: 'Admin', cycle: 3,
  },
  {
    title: 'Configuración de etapas del embudo',
    description: 'Admin puede renombrar etapas, cambiar colores, definir mínimo de visitas requeridas. Se guarda en tabla `pipeline_stages`.',
    priority: 4, label: 'Admin', cycle: 3,
  },

  // ── Ciclo 4: Calidad y producción ──────────────────────────────────────────
  {
    title: 'Manejo de errores y estados de carga',
    description: 'Implementar error boundaries, toasts de error para fallos de red, skeletons de carga en Kanban y Dashboard.',
    priority: 2, label: 'Frontend', cycle: 4,
  },
  {
    title: 'Validación de formularios',
    description: 'Validar campos requeridos, formatos de teléfono/email y rangos numéricos en todos los modales antes de enviar a Supabase.',
    priority: 3, label: 'Frontend', cycle: 4,
  },
  {
    title: 'Modo offline básico',
    description: 'Detectar pérdida de conexión (común en campo). Mostrar banner de alerta, encolar cambios locales y sincronizar al reconectar.',
    priority: 3, label: 'Frontend', cycle: 4,
  },
  {
    title: 'Variables de entorno por ambiente',
    description: 'Separar configuración `dev` / `staging` / `production`. Supabase proyecto diferente por ambiente. Documentar en README.',
    priority: 3, label: 'DevOps', cycle: 4,
  },
  {
    title: 'Deploy en producción — Vercel o Netlify',
    description: 'Configurar CI/CD desde rama `main`. Variables de entorno en plataforma. Dominio personalizado. Build optimizado con `vite build`.',
    priority: 2, label: 'DevOps', cycle: 4,
  },
  {
    title: 'PWA — instalable en celular del vendedor',
    description: 'Agregar `manifest.json` y service worker básico para que el vendedor pueda instalar la app desde Chrome en Android/iPhone sin App Store.',
    priority: 3, label: 'Frontend', cycle: 4,
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  KIUVO CRM — Importando issues a Linear...\n')

  // 1. Verificar acceso
  const me = await client.viewer
  console.log(`✅  Conectado como: ${me.name} (${me.email})`)

  // 2. Verificar equipo
  const team = await client.team(TEAM_ID)
  console.log(`✅  Equipo: ${team.name}\n`)

  // 3. Obtener o crear labels
  console.log('🏷️   Creando labels...')
  const existingLabels = await team.labels()
  const labelMap = {}

  for (const [name, color] of Object.entries(LABEL_COLORS)) {
    const existing = existingLabels.nodes.find(l => l.name === name)
    if (existing) {
      labelMap[name] = existing.id
      console.log(`   ↩  Label existente: ${name}`)
    } else {
      const created = await client.createIssueLabel({ teamId: TEAM_ID, name, color })
      const label = await created.issueLabel
      labelMap[name] = label.id
      console.log(`   ✓  Label creado: ${name}`)
    }
  }

  // 4. Obtener estado "Backlog"
  const states = await team.states()
  const backlog = states.nodes.find(s =>
    s.name.toLowerCase().includes('backlog') || s.type === 'backlog'
  )
  if (!backlog) {
    console.error('\n❌  No se encontró estado Backlog en el equipo.')
    process.exit(1)
  }

  // 5. Crear issues
  console.log(`\n📋  Creando ${ISSUES.length} issues...\n`)
  let created = 0

  for (const issue of ISSUES) {
    try {
      await client.createIssue({
        teamId:      TEAM_ID,
        title:       `[C${issue.cycle}] ${issue.title}`,
        description: issue.description,
        priority:    issue.priority,
        stateId:     backlog.id,
        labelIds:    labelMap[issue.label] ? [labelMap[issue.label]] : [],
      })
      console.log(`   ✓  [Ciclo ${issue.cycle}] ${issue.title.slice(0, 55)}...`)
      created++
      // Pequeña pausa para no saturar el rate limit de la API
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      console.error(`   ✗  Error en "${issue.title}": ${err.message}`)
    }
  }

  console.log(`\n🎉  Importación completa: ${created}/${ISSUES.length} issues creados en Linear.`)
  console.log(`   Ábrelos en: https://linear.app\n`)
}

main().catch(err => {
  console.error('\n❌  Error fatal:', err.message)
  process.exit(1)
})
