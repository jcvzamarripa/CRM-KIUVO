-- KIUVO CRM — Migración: stage_entered_at para días en etapa
-- Ejecutar en: Supabase SQL Editor > New query

-- 1. Columna nueva
alter table public.prospects
  add column if not exists stage_entered_at timestamptz default now();

-- 2. Inicializar prospectos existentes con su updated_at (mejor aproximación disponible)
update public.prospects
  set stage_entered_at = coalesce(updated_at, created_at, now())
  where stage_entered_at is null;

-- 3. Trigger: al cambiar stage_id, resetear el contador automáticamente
create or replace function public.reset_stage_entered_at()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.stage_id is distinct from old.stage_id then
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_prospect_stage_change on public.prospects;
create trigger on_prospect_stage_change
  before update on public.prospects
  for each row
  execute function public.reset_stage_entered_at();
