-- ─── Fix: columna updated_at + políticas RLS para quotes ────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Copia TODO el bloque y ejecútalo de una sola vez.

-- 1. Agregar columna updated_at si no existe (el trigger la necesita)
alter table public.quotes
  add column if not exists updated_at timestamptz default now();

-- 2. Eliminar política UPDATE vieja si existe (para re-crearla limpia)
drop policy if exists "quotes: update own or admin" on public.quotes;

-- 3. Crear política que permite al seller dueño y al admin actualizar
create policy "quotes: update own or admin"
  on public.quotes
  for update
  using  (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

-- 4. Asegurar que RLS está activo
alter table public.quotes enable row level security;

-- 5. (Opcional) Verificar columnas y políticas activas
select column_name, data_type from information_schema.columns
  where table_name = 'quotes' order by ordinal_position;

select policyname, cmd from pg_policies
  where tablename = 'quotes' order by cmd;
