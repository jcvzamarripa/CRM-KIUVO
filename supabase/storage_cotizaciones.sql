-- KIUVO CRM — Storage policies para el bucket "cotizaciones"
-- Ejecutar en: Supabase SQL Editor > New query
--
-- El bucket debe existir antes de correr esto.
-- Si aún no existe: Storage → New bucket → nombre: cotizaciones, public: NO

-- ── 1. Asegurar que el bucket exista (no-op si ya existe) ─────────────────────
insert into storage.buckets (id, name, public)
  values ('cotizaciones', 'cotizaciones', false)
  on conflict (id) do nothing;

-- ── 2. Limpiar policies previas para evitar duplicados ────────────────────────
drop policy if exists "cotizaciones: seller upload own"  on storage.objects;
drop policy if exists "cotizaciones: seller update own"  on storage.objects;
drop policy if exists "cotizaciones: seller read own"    on storage.objects;
drop policy if exists "cotizaciones: admin read all"     on storage.objects;
drop policy if exists "cotizaciones: admin delete"       on storage.objects;

-- ── 3. Vendedor puede subir sus propios PDFs ──────────────────────────────────
-- Los archivos se guardan como: {seller_uuid}/{quote_uuid}.pdf
-- (storage.foldername(name))[1] extrae el primer segmento del path = seller_uuid
create policy "cotizaciones: seller upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'cotizaciones'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. Vendedor puede actualizar/reemplazar sus PDFs (upsert) ─────────────────
create policy "cotizaciones: seller update own"
  on storage.objects for update
  using (
    bucket_id = 'cotizaciones'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 5. Vendedor puede descargar sus propios PDFs ──────────────────────────────
create policy "cotizaciones: seller read own"
  on storage.objects for select
  using (
    bucket_id = 'cotizaciones'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 6. Admin puede leer/descargar todos los PDFs ──────────────────────────────
-- Esta es la policy que faltaba: sin ella createSignedUrl falla para el admin
create policy "cotizaciones: admin read all"
  on storage.objects for select
  using (
    bucket_id = 'cotizaciones'
    and is_admin()
  );

-- ── 7. Admin puede eliminar PDFs ──────────────────────────────────────────────
create policy "cotizaciones: admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'cotizaciones'
    and is_admin()
  );
