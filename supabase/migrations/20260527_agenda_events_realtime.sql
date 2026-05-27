-- Habilitar Realtime para agenda_events
-- Sin esto, los cambios en la tabla NO disparan eventos a los clientes suscritos.
-- Ejecutar en: Supabase SQL Editor → Run

alter publication supabase_realtime add table public.agenda_events;
