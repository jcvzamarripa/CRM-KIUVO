-- La app (orden de producción del vendedor y vista Producción del admin) usaba
-- esta tabla, pero nunca se había creado: enviar una orden siempre fallaba.
create table if not exists public.production_orders (
  id               uuid primary key default gen_random_uuid(),
  prospect_id      uuid references public.prospects(id) on delete set null,
  seller_id        uuid references public.profiles(id) on delete set null,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  items            jsonb not null default '[]',
  total            numeric not null default 0,
  notes            text,
  rejection_reason text,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.production_orders enable row level security;

drop policy if exists "production_orders: select own or admin" on public.production_orders;
create policy "production_orders: select own or admin"
  on public.production_orders for select using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "production_orders: insert own" on public.production_orders;
create policy "production_orders: insert own"
  on public.production_orders for insert with check (seller_id = auth.uid());

drop policy if exists "production_orders: admin update" on public.production_orders;
create policy "production_orders: admin update"
  on public.production_orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "production_orders: admin delete" on public.production_orders;
create policy "production_orders: admin delete"
  on public.production_orders for delete using (public.is_admin());

drop trigger if exists production_orders_updated_at on public.production_orders;
create trigger production_orders_updated_at
  before update on public.production_orders
  for each row execute function public.set_updated_at();
