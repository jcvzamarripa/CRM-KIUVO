# KIUVO CRM

Sistema de gestión de ventas en campo para equipos de distribución industrial.  
Construido con **React 18 + Vite + Supabase**.

---

## Índice

1. [Tech Stack](#tech-stack)
2. [Arquitectura](#arquitectura)
3. [Configuración de entornos](#configuración-de-entornos)
4. [Configuración de Supabase por ambiente](#configuración-de-supabase-por-ambiente)
5. [Instalación y arranque local](#instalación-y-arranque-local)
6. [Scripts disponibles](#scripts-disponibles)
7. [Deploy](#deploy)
8. [Esquema de base de datos](#esquema-de-base-de-datos)
9. [Funcionalidades principales](#funcionalidades-principales)

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, React Router v6 |
| Build | Vite 5 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Estilos | CSS custom properties (variables), sin framework de CSS |
| PDF | @react-pdf/renderer |
| Mapas | Leaflet (vanilla, no react-leaflet) |
| Iconos | Tabler Icons React |

---

## Arquitectura

```
src/
├── components/
│   ├── admin/          # Panel administrativo (desktop)
│   ├── mobile/         # App de vendedor (mobile-first)
│   └── shared/         # Componentes reutilizables
├── contexts/           # AuthContext, StagesContext, ToastContext
├── hooks/              # useOnlineStatus, useDashboardKPIs, useFunnelCounts, …
├── lib/
│   ├── supabase.js     # Cliente Supabase + helpers de ambiente
│   ├── offlineQueue.js # Cola offline persistida en localStorage
│   ├── productsStore.js# Catálogo de productos con localStorage
│   ├── validation.js   # Reglas de validación reutilizables
│   └── quotePDF.jsx    # Template PDF para cotizaciones
├── pages/
│   ├── Login.jsx
│   ├── MobileApp.jsx   # Shell de la app de vendedor
│   └── AdminApp.jsx    # Shell del panel admin
└── constants/
    ├── stages.js       # Etapas del embudo de ventas
    └── mockData.js     # Datos de ejemplo para modo demo
```

### Roles de usuario

| Rol | Ruta | Descripción |
|---|---|---|
| `seller` | `/app` | App móvil — registra visitas, cotiza, gestiona su embudo |
| `admin`  | `/admin` | Panel desktop — KPIs, equipo, prospectos, productos |

El rol se lee del campo `role` en la tabla `profiles` de Supabase.

---

## Configuración de entornos

El proyecto maneja tres ambientes con proyectos de Supabase independientes.  
Vite carga las variables de entorno según el **modo** (`--mode`).

### Archivos de entorno

| Archivo | Modo | Committed |
|---|---|---|
| `.env.example` | — | ✅ Sí (es la plantilla) |
| `.env.development` | `development` | ❌ No — agrega al `.gitignore` |
| `.env.staging` | `staging` | ❌ No — usa secrets en CI/CD |
| `.env.production` | `production` | ❌ No — usa secrets en CI/CD |
| `.env.local` | cualquiera (override) | ❌ No |

> **Vite** carga los archivos en este orden (mayor prioridad primero):
> `.env.[mode].local` → `.env.local` → `.env.[mode]` → `.env`

### Variables disponibles

```bash
# ── Supabase (requerido) ──────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# ── Identificador de ambiente ─────────────────────────────────────
# development | staging | production
# Controla el badge visible en el panel admin y la lógica condicional.
VITE_APP_ENV=development

# ── Nombre de la app (aparece en el título del navegador) ─────────
VITE_APP_NAME=KIUVO CRM

# ── Feature flags ─────────────────────────────────────────────────
# Permite usar datos mock cuando Supabase no responde
VITE_MOCK_FALLBACK=true

# Logs detallados de Supabase en la consola del navegador
VITE_DEBUG_QUERIES=false

# ── Sentry (opcional) ─────────────────────────────────────────────
VITE_SENTRY_DSN=
```

### Configuración recomendada por ambiente

| Variable | Development | Staging | Production |
|---|---|---|---|
| `VITE_APP_ENV` | `development` | `staging` | `production` |
| `VITE_MOCK_FALLBACK` | `true` | `true` | `false` |
| `VITE_DEBUG_QUERIES` | `true` | `false` | `false` |
| `VITE_SENTRY_DSN` | _(vacío)_ | tu DSN | tu DSN |

---

## Configuración de Supabase por ambiente

### 1. Crear tres proyectos en supabase.com

```
kiuvo-dev        → para desarrollo local
kiuvo-staging    → para QA y pruebas pre-lanzamiento
kiuvo-production → para usuarios reales
```

### 2. Crear el esquema en cada proyecto

Ejecuta el siguiente SQL en **SQL Editor** de cada proyecto Supabase:

```sql
-- Perfiles de usuario (extendido de auth.users)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  initials   text,
  role       text not null default 'seller',  -- 'seller' | 'admin'
  created_at timestamptz default now()
);

-- Trigger: crea perfil automáticamente al registrar un usuario
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'seller');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Prospectos
create table prospects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references profiles(id),
  name            text not null,
  company         text,
  phone           text,
  email           text,
  stage_id        text not null default 'prospeccion',
  value           numeric default 0,
  health          text default 'green',  -- 'green' | 'amber' | 'red'
  status          text default 'active', -- 'active' | 'won' | 'lost'
  days_in_stage   int default 0,
  last_contact_at timestamptz,
  closed_at       timestamptz,
  notes           text,
  lat             numeric,
  lng             numeric,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Visitas / actividades
create table visits (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  seller_id   uuid references profiles(id),
  kind        text not null default 'visit', -- 'visit'|'call'|'whatsapp'|'email'
  notes       text,
  created_at  timestamptz default now()
);

-- Cotizaciones (encabezado)
create table quotes (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete set null,
  seller_id   uuid references profiles(id),
  status      text default 'draft',  -- 'draft' | 'sent' | 'accepted' | 'rejected'
  total       numeric default 0,
  notes       text,
  created_at  timestamptz default now()
);

-- Líneas de cotización
create table quote_items (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid references quotes(id) on delete cascade,
  product_name text not null,
  sku          text,
  unit         text,
  quantity     numeric not null,
  unit_price   numeric not null,
  discount_pct numeric default 0,
  created_at   timestamptz default now()
);

-- Notificaciones
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  title       text not null,
  body        text,
  kind        text default 'info',  -- 'info'|'warning'|'danger'|'success'
  read        boolean default false,
  stage       text,
  screen      text,
  created_at  timestamptz default now()
);
```

### 3. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
alter table profiles      enable row level security;
alter table prospects     enable row level security;
alter table visits        enable row level security;
alter table quotes        enable row level security;
alter table quote_items   enable row level security;
alter table notifications enable row level security;

-- Profiles: cada usuario ve y edita solo su perfil
create policy "profiles_own" on profiles
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins ven todos los perfiles
create policy "profiles_admin_read" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Prospects: seller ve solo los suyos; admin ve todos
create policy "prospects_seller" on prospects
  using (owner_id = auth.uid());

create policy "prospects_admin" on prospects
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Visits: seller ve solo las suyas
create policy "visits_seller" on visits
  using (seller_id = auth.uid());

-- Quotes: seller ve solo las suyas
create policy "quotes_seller" on quotes
  using (seller_id = auth.uid());

-- Notifications: cada usuario ve solo las suyas
create policy "notifications_own" on notifications
  using (user_id = auth.uid());
```

### 4. Habilitar Realtime

En Supabase → tu proyecto → **Database → Replication**:
- Activar `prospects` y `visits` en la tabla de publicaciones.

---

## Instalación y arranque local

### Requisitos

- Node.js >= 18
- npm >= 9

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/crm-kiuvo.git
cd crm-kiuvo

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno para desarrollo
cp .env.example .env.development
# → Edita .env.development con las credenciales de tu proyecto Supabase de dev

# 4. Arrancar el servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> **Modo demo (sin Supabase)**  
> Si no defines `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, la app usa datos
> mock automáticamente. Puedes explorar la UI sin necesidad de configurar Supabase.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (modo `development`) |
| `npm run dev:staging` | Servidor de desarrollo apuntando a staging |
| `npm run build` | Build de producción (modo `production`) |
| `npm run build:staging` | Build para staging |
| `npm run build:production` | Build para producción (explícito) |
| `npm run preview` | Sirve el último build localmente |
| `npm run preview:staging` | Preview del build de staging |

### Flujo de trabajo recomendado

```
feature branch  →  npm run dev           (apunta a kiuvo-dev)
pull request     →  CI build:staging     (apunta a kiuvo-staging)
merge a main     →  CI build:production  (apunta a kiuvo-production)
```

---

## Deploy

### Vercel (recomendado)

1. Conecta el repositorio en vercel.com
2. En **Settings → Environment Variables**, agrega las variables de cada ambiente:
   - **Production**: `VITE_APP_ENV=production`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - **Preview**: `VITE_APP_ENV=staging`, credenciales de staging
3. En **Settings → Build & Output**:
   - Build Command: `npm run build:production`
   - Output Directory: `dist`
4. Para staging, crea un branch `staging` y asígnale las variables del ambiente staging.

### GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Build (production)
        if: github.ref == 'refs/heads/main'
        run: npm run build:production
        env:
          VITE_SUPABASE_URL:      ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          VITE_APP_ENV:           production

      - name: Build (staging)
        if: github.ref == 'refs/heads/staging'
        run: npm run build:staging
        env:
          VITE_SUPABASE_URL:      ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          VITE_APP_ENV:           staging

      # → Agrega aquí el paso de deploy a tu hosting
```

### Netlify

1. Build command: `npm run build:production`
2. Publish directory: `dist`
3. Agrega las variables de entorno en **Site settings → Environment variables**

---

## Esquema de base de datos

```
auth.users (manejado por Supabase Auth)
    │
    └── profiles          (id, full_name, initials, role)
            │
            ├── prospects (id, owner_id→profiles, name, stage_id, value, health, …)
            │       │
            │       └── visits (id, prospect_id, seller_id, kind, notes, …)
            │
            └── quotes    (id, prospect_id, seller_id, status, total, …)
                    │
                    └── quote_items (id, quote_id, product_name, qty, unit_price, discount_pct)
```

---

## Funcionalidades principales

### App de vendedor (`/app`)

| Pantalla | Descripción |
|---|---|
| **Dashboard** | KPIs personales, meta semanal, agenda del día, resumen del embudo |
| **Embudo (Kanban)** | Tarjetas de prospectos por etapa con filtro y ordenamiento |
| **Mapa** | Localización de prospectos con clustering por salud |
| **Agenda** | Citas y eventos integrados con Google Calendar |
| **Registrar actividad** | Visita, llamada, WhatsApp o email — funciona offline |
| **Nuevo prospecto** | Formulario validado — funciona offline |
| **Cotizador** | Catálogo de productos con descuentos por volumen, genera PDF |

### Panel Admin (`/admin`)

| Vista | Descripción |
|---|---|
| **Dashboard** | KPIs del equipo, gráfica de ventas, funnel, tabla de vendedores |
| **Embudo** | Kanban global de todos los prospectos |
| **Prospectos** | Tabla completa con filtros y edición inline |
| **Mapa** | Heatmap geográfico de actividad del equipo |
| **Cotizaciones** | Pipeline de cotizaciones con gestión de validez |
| **Productos** | Catálogo editable con descuentos por volumen configurables |
| **Equipo** | Gestión de vendedores y metas |
| **Agenda** | Calendario del equipo |
| **Actividades** | Historial de visitas, llamadas y acciones |
| **Metas** | Objetivos y gamificación |
| **Reportes** | Análisis de ventas y métricas |

### Modo offline

La app detecta la pérdida de conexión y:
- Muestra un banner con el estado de conexión
- Encola las acciones pendientes en `localStorage`
- Al reconectar, sincroniza automáticamente la cola con Supabase
- El catálogo de prospectos se cachea localmente para el cotizador

---

## Convenciones de código

- **Estilos**: inline styles con variables CSS (`var(--kiuvo-blue)`, etc.) — no clases globales
- **Componentes**: un archivo = un componente principal + helpers locales
- **Datos**: hooks en `src/hooks/` — lógica de fetch desacoplada de la UI
- **Validación**: reglas compartidas en `src/lib/validation.js`
- **Toasts**: `useToast()` desde `src/contexts/ToastContext.jsx`
- **Error boundaries**: `<ErrorBoundary>` en `src/components/shared/ErrorBoundary.jsx`
