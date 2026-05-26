-- ── Tabla sales ──────────────────────────────────────────────────────────────
-- Cada registro = una venta cerrada.
-- Se auto-popula vía trigger cuando se inserta una actividad kind='win'.

create table if not exists public.sales (
  id          uuid          primary key default gen_random_uuid(),
  activity_id uuid          unique references public.activities(id) on delete set null,
  seller_id   uuid          references public.profiles(id)  on delete set null,
  prospect_id uuid          references public.prospects(id) on delete set null,
  amount      numeric(12,2) not null default 0,
  notes       text          not null default '',
  closed_at   timestamptz   not null default now(),
  created_at  timestamptz   not null default now()
);

create index if not exists sales_seller_id_idx   on public.sales(seller_id);
create index if not exists sales_closed_at_idx   on public.sales(closed_at);
create index if not exists sales_prospect_id_idx on public.sales(prospect_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.sales enable row level security;

-- Admin ve y modifica todo
create policy "Admin full access on sales"
  on public.sales for all
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Seller ve sus propias ventas
create policy "Seller sees own sales"
  on public.sales for select
  using (seller_id = auth.uid());

-- ── Trigger: auto-insert en sales al crear actividad win ──────────────────────
create or replace function public.handle_win_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'win' then
    insert into public.sales (
      activity_id,
      seller_id,
      prospect_id,
      amount,
      notes,
      closed_at
    ) values (
      new.id,
      new.seller_id,
      new.prospect_id,
      coalesce((new.details->>'value')::numeric, 0),
      coalesce(new.details->>'note', ''),
      coalesce(new.created_at, now())
    )
    on conflict (activity_id) do nothing;
  end if;
  return new;
end;
$$;

-- Eliminar trigger previo si existía
drop trigger if exists on_win_activity on public.activities;

create trigger on_win_activity
  after insert on public.activities
  for each row
  execute procedure public.handle_win_activity();

-- ── Backfill: poblar con actividades win existentes ───────────────────────────
insert into public.sales (activity_id, seller_id, prospect_id, amount, notes, closed_at)
select
  a.id,
  a.seller_id,
  a.prospect_id,
  coalesce((a.details->>'value')::numeric, 0),
  coalesce(a.details->>'note', ''),
  coalesce(a.created_at, now())
from public.activities a
where a.kind = 'win'
  and not exists (
    select 1 from public.sales s where s.activity_id = a.id
  );
