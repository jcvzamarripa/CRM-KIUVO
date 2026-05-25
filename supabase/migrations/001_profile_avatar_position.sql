-- Migration: add avatar_url and position to profiles
-- Run in Supabase SQL editor on existing projects

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists position   text;

-- ─── Storage: avatars bucket ────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Anyone authenticated can upload/update their own avatar file
create policy "avatars: insert own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: update own"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: delete own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public read (bucket is public, but explicit policy is safer)
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
