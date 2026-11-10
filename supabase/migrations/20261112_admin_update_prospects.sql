-- El admin podía ver y borrar prospectos de todos, pero no editarlos:
-- mover de etapa o reasignar desde el panel no guardaba nada.
drop policy if exists "prospects: admin update" on public.prospects;
create policy "prospects: admin update"
  on public.prospects for update
  using (public.is_admin()) with check (public.is_admin());
