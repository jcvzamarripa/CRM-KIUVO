# Gestor de ventas móvil

_Started 2026-05-20 17:16 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "CRM KIUVO"
Current date is now May 20, 2026
</system-info>

<default aesthetic>
If no references, art direction or design systems were provided, use this default professional modern, minimal aesthetic as a base. Declare your choice out loud so you stick to it. Guidance:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic>

<attached_files>
- uploads/kiuvo_crm_design_brief.md
</attached_files>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design. Follow the instructions about design in your system prompt, particularly the 'How to do design work' section. Use the design_canvas starter component, or make a full-bleed prototype and offer options via Tweaks.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: read_file]_

_[tool: questions_v2]_

Read your brief in full — it's exceptionally detailed. Before I start building, a few targeted questions so I don't waste your time:

## User

Questions answered:
- scope: Pantalla 1: Dashboard del vendedor (móvil) — completa y especificada, Pantalla 2: Embudo Kanban (móvil y desktop), Pantalla 3: Dashboard del administrador (desktop)
- fidelity: Mix — navegación básica entre pantallas pero sin estados muy complejos
- presentation: Móvil dentro de un frame de iPhone + desktop separado
- variations: Versión con la alerta de seguimiento más prominente / como hero
- tweaks: Modo claro / oscuro, Toggle entre meta cumplida / a medias / en rojo
- data_realism: Usa los nombres del brief (Ferretería del Valle, Distribuidora Norte, etc.)
- icons: Cargar Tabler desde CDN (iconos reales, requiere internet)
- kanban_variation: Móvil (swipe horizontal entre columnas o pills)

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

Now I have what I need. Let me build the design system, then the screens.

System I'm committing to:
- **Type**: system sans-serif (`-apple-system, Inter fallback`), 2 weights only (400, 500), brief spec sizes
- **Colors**: KIUVO Blue `#185FA5` primary, semantic stack from brief, flat (no gradients/shadows)
- **Borders**: `0.5px solid` low-opacity; radii 8/12
- **Icons**: Tabler outline via webfont CDN
- **Layout**: 3 artboards on a design canvas — Mobile dashboard fiel, Mobile dashboard variant (alerta hero), Desktop admin. Mobile Kanban accessed via bottom nav inside the mobile artboards.
- **Tweaks**: dark mode + meta state (cumplida / medias / rojo)

Let me write the tokens and data first:

_[tool: write_file]_

Now the mobile screens. I'll bundle dashboard + kanban + nav into one file for cohesion:

_[tool: write_file]_

Now the desktop admin:

_[tool: write_file]_

Now the main HTML composing everything:

_[tool: grep]_

_[tool: read_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Listo. Tres pantallas en un design canvas:

**Vendedor — móvil** (3 artboards lado a lado)
- A · Dashboard fiel al brief — siguiendo el brief al pie: header, meta semanal, stats del día, alerta de seguimiento como banner, acciones rápidas, agenda, embudo, reactivador, bottom nav
- B · Alerta de seguimiento como hero — la alerta sube al lugar prominente con mini-lista de los 3 prospectos en riesgo + 2 CTAs
- C · Embudo Kanban — pills horizontales swipeable por etapa, header de etapa, tarjeta de prospecto con contador de visitas + barra de progreso + punto de salud

**Administrador — desktop** (1 artboard, 1440×900)
- Sidebar, top bar con selector de periodo, 6 KPIs (incluido cumplimiento de seguimiento y visitas por venta), gráfico de barras semanal, embudo con % de conversión, tabla de equipo con cumplimiento color-coded, feed de actividad en vivo, mapa de calor y panel de alertas operativas

**Navegación**: el bottom nav del móvil funciona en cada artboard — puedes saltar de Inicio a Embudo a Mapa.

**Tweaks** (esquina inferior derecha, toggle desde la toolbar):
- Modo oscuro
- Estado de la meta: Cumplida / A medias / En rojo

Próximos pasos sugeridos: perfil de prospecto con timeline de visitas, modal de "no cumple mínimo de visitas", o pantalla de configuración de umbrales — dime cuál atacar.

