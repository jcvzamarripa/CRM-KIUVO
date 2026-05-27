-- KIUVO CRM — Products catalog
-- Run in Supabase SQL Editor

-- ─── Table ────────────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sku         text not null,
  category    text not null default '',
  unit        text not null default 'pza',
  price       numeric not null check (price > 0),
  -- tiers: [{ id, minQty, maxQty (null = sin límite), discountPct }]
  tiers       jsonb not null default '[]',
  active      boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.products enable row level security;

-- ─── RLS ─────────────────────────────────────────────────────────
-- All authenticated users can read active products (needed for quotes)
drop policy if exists "products: select authenticated" on products;
create policy "products: select authenticated"
  on products for select
  using (auth.uid() is not null and active = true);

-- Only admin can create, edit, delete
drop policy if exists "products: insert admin only" on products;
create policy "products: insert admin only"
  on products for insert
  with check (is_admin());

drop policy if exists "products: update admin only" on products;
create policy "products: update admin only"
  on products for update
  using (is_admin());

drop policy if exists "products: delete admin only" on products;
create policy "products: delete admin only"
  on products for delete
  using (is_admin());

-- ─── Realtime ────────────────────────────────────────────────────
-- Enable realtime for products table (run in Supabase dashboard if needed)
-- alter publication supabase_realtime add table public.products;

-- ─── Auto-update updated_at ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
