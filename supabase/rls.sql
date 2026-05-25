-- KIUVO CRM — RLS policies (idempotent migration)
-- Run this in Supabase SQL Editor after schema.sql
-- Safe to re-run: drops all existing policies before recreating them.

-- ─── Helper: is_admin() ────────────────────────────────────────────
-- Security definer bypasses RLS on profiles, avoiding infinite recursion
-- when policies on other tables check for admin role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;


-- ══════════════════════════════════════════════════════════════════
-- profiles
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Users can read their own profile"  on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Admins can read all profiles"      on profiles;

-- Seller sees and edits only their own row; admin sees and edits everyone
create policy "profiles: select own or admin"
  on profiles for select
  using (auth.uid() = id or is_admin());

create policy "profiles: update own or admin"
  on profiles for update
  using (auth.uid() = id or is_admin());

-- INSERT is handled by the handle_new_user() trigger (security definer).
-- Admins can also insert profiles manually (e.g. backfill).
create policy "profiles: insert admin only"
  on profiles for insert
  with check (is_admin());

create policy "profiles: delete admin only"
  on profiles for delete
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- stages
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "All users can read stages"  on stages;
drop policy if exists "Admins can update stages"   on stages;

create policy "stages: select authenticated"
  on stages for select
  using (auth.uid() is not null);

create policy "stages: all admin only"
  on stages for all
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- prospects
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Sellers see their own prospects"    on prospects;
drop policy if exists "Admins see all prospects"           on prospects;
drop policy if exists "Sellers can manage their prospects" on prospects;

-- Seller sees own; admin sees all
create policy "prospects: select owner or admin"
  on prospects for select
  using (owner_id = auth.uid() or is_admin());

-- Seller inserts and auto-assigns themselves as owner
create policy "prospects: insert own"
  on prospects for insert
  with check (owner_id = auth.uid());

-- Seller updates their own; admin updates any
create policy "prospects: update owner or admin"
  on prospects for update
  using (owner_id = auth.uid() or is_admin());

-- Only admin can delete prospects (prevent accidental data loss by sellers)
create policy "prospects: delete admin only"
  on prospects for delete
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- visits
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Sellers see their own visits"  on visits;
drop policy if exists "Sellers can insert visits"     on visits;
drop policy if exists "Admins see all visits"         on visits;

create policy "visits: select own or admin"
  on visits for select
  using (seller_id = auth.uid() or is_admin());

create policy "visits: insert own"
  on visits for insert
  with check (seller_id = auth.uid());

-- Sellers can edit their own visit notes; admin can edit any
create policy "visits: update own or admin"
  on visits for update
  using (seller_id = auth.uid() or is_admin());

create policy "visits: delete admin only"
  on visits for delete
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- activities
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "All authenticated users can read activities" on activities;
drop policy if exists "Sellers can insert activities"               on activities;

-- Seller sees only their own activity; admin sees the whole team
create policy "activities: select own or admin"
  on activities for select
  using (seller_id = auth.uid() or is_admin());

create policy "activities: insert own"
  on activities for insert
  with check (seller_id = auth.uid());

create policy "activities: delete admin only"
  on activities for delete
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- weekly_goals
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Users can see their own goals" on weekly_goals;
drop policy if exists "Admins can see all goals"      on weekly_goals;

create policy "weekly_goals: select own or admin"
  on weekly_goals for select
  using (seller_id = auth.uid() or is_admin());

create policy "weekly_goals: insert own"
  on weekly_goals for insert
  with check (seller_id = auth.uid());

create policy "weekly_goals: update own or admin"
  on weekly_goals for update
  using (seller_id = auth.uid() or is_admin());

create policy "weekly_goals: delete admin only"
  on weekly_goals for delete
  using (is_admin());


-- ══════════════════════════════════════════════════════════════════
-- stage_history
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "All authenticated users can read stage history" on stage_history;
drop policy if exists "Sellers can insert stage history"               on stage_history;

-- Seller sees history only for their own prospects; admin sees all
create policy "stage_history: select own prospects or admin"
  on stage_history for select
  using (
    is_admin() or
    exists (
      select 1 from prospects
      where id = prospect_id and owner_id = auth.uid()
    )
  );

create policy "stage_history: insert own"
  on stage_history for insert
  with check (moved_by = auth.uid());


-- ══════════════════════════════════════════════════════════════════
-- quotes
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Sellers see their own quotes"    on quotes;
drop policy if exists "Sellers can manage their quotes" on quotes;
drop policy if exists "Admins see all quotes"           on quotes;
drop policy if exists "Admins can update quote status"  on quotes;

create policy "quotes: select own or admin"
  on quotes for select
  using (seller_id = auth.uid() or is_admin());

create policy "quotes: insert own"
  on quotes for insert
  with check (seller_id = auth.uid());

-- Seller edits their own drafts; admin can change status on any
create policy "quotes: update own or admin"
  on quotes for update
  using (seller_id = auth.uid() or is_admin());

create policy "quotes: delete own drafts or admin"
  on quotes for delete
  using (
    (seller_id = auth.uid() and status = 'draft') or is_admin()
  );


-- ══════════════════════════════════════════════════════════════════
-- quote_items
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Quote items readable by quote owner" on quote_items;
drop policy if exists "Quote items readable by admins"      on quote_items;
drop policy if exists "Sellers can manage their quote items" on quote_items;

create policy "quote_items: select via quote owner or admin"
  on quote_items for select
  using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );

create policy "quote_items: insert via own quote"
  on quote_items for insert
  with check (
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );

create policy "quote_items: update via own quote"
  on quote_items for update
  using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );

create policy "quote_items: delete via own quote or admin"
  on quote_items for delete
  using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );


-- ══════════════════════════════════════════════════════════════════
-- notifications
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "Users see their own notifications"     on notifications;
drop policy if exists "Users can update their own notifications" on notifications;
drop policy if exists "System can insert notifications"       on notifications;

create policy "notifications: select own"
  on notifications for select
  using (user_id = auth.uid());

-- Users mark their own notifications as read
create policy "notifications: update own"
  on notifications for update
  using (user_id = auth.uid());

-- Insertions come from DB triggers (security definer, bypasses RLS)
-- or from admin actions. Sellers never insert notifications directly.
create policy "notifications: insert admin only"
  on notifications for insert
  with check (is_admin());

create policy "notifications: delete own or admin"
  on notifications for delete
  using (user_id = auth.uid() or is_admin());
