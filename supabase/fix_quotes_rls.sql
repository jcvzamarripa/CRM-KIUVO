-- ─── Fix: políticas RLS para quotes ─────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Causa: la política UPDATE puede no existir en la base de datos, causando
--        que sellers no puedan aceptar/rechazar cotizaciones.

-- 1. Eliminar política vieja si existe (para re-crearla limpia)
drop policy if exists "quotes: update own or admin" on public.quotes;

-- 2. Crear política que permite al seller dueño y al admin actualizar
create policy "quotes: update own or admin"
  on public.quotes
  for update
  using  (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

-- 3. Verificar que RLS está activo
alter table public.quotes enable row level security;

-- 4. (Opcional) Verificar las políticas activas
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'quotes'
order by cmd;
