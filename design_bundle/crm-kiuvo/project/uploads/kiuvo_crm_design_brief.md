# Brief de diseño — CRM KIUVO

## Contexto del proyecto

**KIUVO** es una empresa con un equipo de ventas **en campo / en la calle**. Necesita un CRM que funcione principalmente desde el móvil (para los vendedores) y desde desktop (para administración).

El producto que vende KIUVO **requiere explicación previa antes de cotizar**, por lo que el embudo incluye una etapa explícita de presentación.

> **Premisa clave del negocio**: el 80% de las ventas se cierran en el **seguimiento**, no en la presentación inicial. Por lo tanto, el CRM debe forzar disciplina de seguimiento mediante un contador de visitas con umbrales mínimos por etapa, alertas de prospectos estancados, y métricas de cumplimiento de seguimiento.

## Plan por fases

### Fase 1 — MVP de campo (4–6 semanas)
- Autenticación con dos roles: Administrador y Vendedor
- Catálogo de prospectos (CRUD, búsqueda, filtros, etiquetas)
- Embudo de ventas tipo Kanban con 5 etapas configurables
- **Contador de visitas por prospecto + umbrales mínimos por etapa**
- Registro de visitas con geolocalización automática (GPS)
- Mapa con pines de prospectos
- Catálogo de productos básico
- Calendario de citas
- Dashboard del vendedor (móvil) con alertas de seguimiento
- Dashboard del administrador (desktop) con métricas de cumplimiento

### Fase 2 — Cierre y comunicación
- Cotizador integrado con generación de PDF
- Mensajería por WhatsApp (Business API o wa.me con plantillas)
- Generación automática de orden de producción al ganar venta
- Optimización de rutas en el mapa
- Reportes de KPIs por día/semana/mes (incluyendo cumplimiento de seguimiento)

### Fase 3 — Gamificación y engagement
- Sistema de metas con barra de progreso y desbloqueo de logros (badges)
- Logros específicos de seguimiento (ej. "Cazador persistente: 10 prospectos avanzados con 5+ visitas")
- Tabla de posiciones del equipo
- Centro de notificaciones tipo red social
- Reactivador de clientes (regla automática: 60 días sin interacción)

### Fase 4 — Postventa y madurez
- Servicio postventa con escalamiento de cuenta
- Métricas del reactivador
- Reportes avanzados exportables
- Refinamientos basados en feedback

## Etapas del embudo de ventas

| # | Etapa | Descripción | Color | Visitas mínimas sugeridas |
|---|-------|-------------|-------|--------------------------|
| 1 | Prospección | Lead identificado, aún sin contacto profundo | Gris #888780 | 1 |
| 2 | Presentación | Visita para explicar el producto al prospecto | Azul #378ADD | 2 |
| 3 | Cotización | Propuesta económica entregada | Ámbar #EF9F27 | 2 |
| 4 | Negociación | Ajustes de precio, condiciones o alcance | Coral #D85A30 | 3 |
| 5 | Cierre | Se concreta: ganado o perdido | Teal #1D9E75 | 2 |

**Total mínimo por venta**: 10 interacciones registradas. Estos números son configurables por el administrador.

## Sistema de seguimiento por visitas

### Lógica
- Cada prospecto lleva un **contador acumulado** de visitas registradas (con GPS, hora y nota).
- También se cuentan **interacciones digitales** (WhatsApp, llamada, email) por separado, pero el contador principal es de visitas presenciales.
- Cada etapa tiene un **mínimo de visitas** configurable por el administrador.
- Si el vendedor intenta avanzar un prospecto a la siguiente etapa sin cumplir el mínimo, el sistema:
  - **Modo blando** (default): muestra advertencia y pide confirmación con razón
  - **Modo duro**: bloquea el avance hasta cumplir el mínimo

### Estados visuales del prospecto
- 🟢 **Saludable**: cumple visitas mínimas y tiene actividad reciente (<14 días)
- 🟡 **En riesgo**: cumple visitas pero sin actividad reciente, o le falta 1 visita para el mínimo
- 🔴 **Estancado**: lleva >21 días en la misma etapa o muy por debajo del mínimo de visitas
- ⚫ **Reactivador**: >60 días sin interacción (ya pasó al módulo de reactivación)

### KPIs derivados
- **Tasa de cumplimiento de seguimiento** por vendedor: % de prospectos con ≥ visitas mínimas en su etapa actual
- **Promedio de visitas por venta ganada** vs perdida (para validar la hipótesis del 80%)
- **Tiempo promedio en cada etapa**
- **Prospectos en riesgo / estancados** por vendedor

## Sistema de diseño

- **Estilo**: flat, limpio, sin gradientes ni sombras decorativas
- **Bordes**: `0.5px solid` con baja opacidad
- **Radios**: 8px (md), 12px (lg) para tarjetas
- **Tipografía**: sans-serif del sistema; dos pesos únicamente (400 regular, 500 medio)
- **Tamaños**: h1 22px, h2 18px, h3 16px (peso 500), cuerpo 14–16px
- **Sentence case** siempre, nunca ALL CAPS ni Title Case
- **Iconos**: Tabler outline (nunca filled)
- **Color primario de marca**: azul #185FA5 (KIUVO Blue)
- **Colores semánticos**:
  - Éxito / cierre ganado / saludable: teal #1D9E75
  - Advertencia / cotización / en riesgo: ámbar #BA7517
  - Peligro / estancado / reactivador: rojo #A32D2D
  - Info / presentación: azul #378ADD

---

# Pantalla 1: Dashboard del vendedor (móvil)

**Ancho objetivo**: 360px (mobile-first)
**Usuario**: vendedor de campo, abre la app varias veces al día en la calle
**Objetivo**: ver en 2 segundos su meta, su agenda, alertas de seguimiento, y poder ejecutar acciones rápidas

## Estructura (de arriba a abajo)

### 1. Status bar simulado
Hora a la izquierda (9:41), iconos de wifi y batería a la derecha. Altura ~32px.

### 2. Header
- **Izquierda**: avatar circular con iniciales del vendedor (fondo azul claro `#E6F1FB`, texto azul oscuro `#0C447C`), seguido de saludo ("Buen día,") y nombre completo en peso 500.
- **Derecha**: botón circular de notificaciones con icono `ti-bell` y badge rojo `#E24B4A` mostrando el número de notificaciones pendientes.

### 3. Tarjeta de meta semanal (gamificación)
Fondo azul claro `#E6F1FB`, esquinas redondeadas (radius-lg).

Contenido:
- **Etiqueta superior**: "META SEMANAL" en color `#185FA5`, tamaño 11px
- **Valor grande**: monto actual (ej. "$68,400") en peso 500, 20px, color `#0C447C`
- **Subtexto**: "de $100,000" en `#185FA5`
- **A la derecha**: pill con icono `ti-flame` y texto "Nivel 4" sobre fondo `#B5D4F4`
- **Debajo del pill**: "Racha: 5 días" en `#185FA5`
- **Barra de progreso**: altura 8px, fondo translúcido azul, fill `#185FA5`
- **Pie**: porcentaje a la izquierda, días restantes a la derecha

### 4. Stats del día (3 columnas)
Grid de 3 tarjetas con fondo `--color-background-secondary`:
- Visitas hoy (número grande + label)
- Cotizaciones (número grande + label)
- Cierres (número grande + label)

### 5. Alerta de seguimiento (NUEVO)
Banner ámbar que aparece **solo si hay prospectos en riesgo o estancados**:
- Fondo `#FAEEDA`, borde `#FAC775`
- Icono `ti-eye-exclamation` color `#854F0B`
- Título "Seguimiento pendiente" peso 500
- Subtítulo "X prospectos en riesgo · Y estancados"
- Chevron derecho → lleva a la lista filtrada

### 6. Acciones rápidas (grid 2×2)

| Acción | Icono | Fondo | Color icono |
|--------|-------|-------|-------------|
| Registrar visita | `ti-map-pin` | `#E6F1FB` | `#185FA5` |
| Nuevo prospecto | `ti-user-plus` | `#EAF3DE` | `#3B6D11` |
| Cotizar | `ti-file-text` | `#FAEEDA` | `#854F0B` |
| WhatsApp | `ti-brand-whatsapp` | `#E1F5EE` | `#0F6E56` |

### 7. Agenda de hoy
Lista vertical de items. Cada item:
- **Borde izquierdo de 3px** con el color de la etapa correspondiente
- **Columna izquierda**: hora grande + AM/PM, ancho mínimo 42px
- **Separador vertical** 0.5px
- **Columna derecha**: nombre del cliente (peso 500, 13px), tipo de actividad (12px secundario), dirección con icono `ti-map-pin`
- **Badge pequeño de visitas**: en la esquina superior derecha del item, ej. "3ª visita" en peso 500, 11px, color del etapa

Ejemplo de items:
- 10:30 AM — Ferretería del Valle — Presentación de producto — 1ª visita (azul)
- 1:00 PM — Distribuidora Norte — Negociación — 4ª visita (coral)
- 4:00 PM — Constructora ABC — Cierre de venta · $24,500 — 6ª visita (teal)

### 8. Mi embudo (resumen del pipeline)
Card con borde 0.5px, lista vertical con las 5 etapas. Cada fila:
- Punto de color (8px) + nombre de la etapa (13px)
- A la derecha: conteo total en peso 500
- **Indicador de riesgo**: si hay prospectos en riesgo o estancados en esa etapa, mostrar un pequeño badge ámbar/rojo a la izquierda del conteo (ej. ⚠ 2)
- Separador 0.5px entre filas

Filas (en orden):
1. Prospección · 14
2. Presentación · 9 (⚠ 2 en riesgo)
3. Cotización · 5
4. Negociación · 4 (🔴 1 estancado)
5. Cierre · 2

Header con título "Mi embudo" y enlace "Ver kanban".

### 9. Banner del reactivador
Card de ancho completo con fondo rojo claro `#FCEBEB`, borde `#F7C1C1`:
- Icono `ti-alert-circle` (20px, color `#A32D2D`)
- Título "Reactivador" (peso 500, color `#501313`)
- Subtítulo "X clientes sin contacto +60 días" (color `#791F1F`)
- Chevron derecho

### 10. Bottom navigation
Grid de 5 columnas:
- Inicio (`ti-home`) — activo
- Embudo (`ti-layout-kanban`)
- Mapa (`ti-map-2`)
- Agenda (`ti-calendar`)
- Más (`ti-menu-2`)

## Comportamientos esperados

- Cada botón usa navegación o `sendPrompt()`
- Al registrar una visita, el contador del prospecto incrementa automáticamente
- Al intentar avanzar de etapa sin cumplir mínimo de visitas, se muestra modal de advertencia
- La barra de meta se anima al cerrar una venta
- La hora y saludo cambian según hora del día
- El banner del reactivador y la alerta de seguimiento solo aparecen cuando aplican

---

# Pantalla 2: Embudo Kanban (móvil y desktop) — pendiente de mockup

Vista crítica para el seguimiento. Cada **tarjeta de prospecto** dentro de las columnas del Kanban debe mostrar:

- Avatar/iniciales del prospecto
- Nombre de la empresa o persona
- Valor potencial (ej. "$24,500")
- **Contador de visitas con barra de progreso**: ej. "3/5 visitas" con barra mini
- **Indicador de estado**: punto de color (verde/ámbar/rojo) según salud del seguimiento
- Días en la etapa actual (ej. "12 días")
- Última actividad: ej. "WhatsApp hace 2 días"
- Avatar mini del vendedor responsable (en vista admin)

Al arrastrar entre columnas, validar visitas mínimas y mostrar advertencia/bloqueo según configuración.

---

# Pantalla 3: Dashboard del administrador (desktop) — pendiente de mockup

**Ancho objetivo**: 1280px+

## Estructura propuesta

- Sidebar izquierdo con navegación
- Header con selector de periodo: Hoy / Semana / Mes / Personalizado
- Fila superior de KPIs:
  - Ventas totales del periodo
  - Prospectos activos
  - Tasa de conversión global
  - Ticket promedio
  - **% de cumplimiento de seguimiento** (nuevo KPI clave)
  - **Promedio de visitas por venta ganada**
- Gráfico principal de ventas en el tiempo
- Embudo visual (funnel chart) con conteos y % de conversión entre etapas
- Tabla de vendedores con sus KPIs: meta, % avance, prospectos activos, cumplimiento de seguimiento, prospectos estancados
- Mapa de calor de actividad geográfica
- Lista de actividad reciente (feed en tiempo real)
- Alertas: clientes en reactivador, prospectos estancados, cotizaciones por vencer

## Pantallas siguientes pendientes

- Perfil de prospecto (con timeline de visitas e interacciones)
- Mapa con prospectos y optimización de ruta
- Cotizador
- Calendario semanal/mensual
- Pantalla de logros y gamificación
- Reactivador y postventa
- Centro de notificaciones
- Configuración (donde el admin ajusta visitas mínimas por etapa)

---

# Notas de implementación

- Mobile-first para el vendedor; desktop-first para el admin (ambos responsive)
- La gamificación debe ser **motivacional, no punitiva**
- Los colores del embudo deben ser consistentes en toda la app
- Considerar modo claro y oscuro desde el inicio
- Soporte offline básico para vendedores en zonas con mala señal
- El contador de visitas se sincroniza al recuperar conexión
- Los umbrales mínimos por etapa son configurables por el admin (no hardcoded)
- Al iniciar el proyecto, sugiero **modo blando** (advertencia, no bloqueo) para no frustrar al equipo en la adopción; medir en 30 días y endurecer si hace falta
