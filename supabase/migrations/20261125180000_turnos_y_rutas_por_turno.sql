-- ════════════════════════════════════════════════════════════════════════
-- Turnos: a qué hora se visita cada negocio, y rutas por turno
--
-- Supera partes de 20261125160000_rutas_por_sector.sql.
--
-- ── Por qué hace falta ─────────────────────────────────────────────────
--
-- Una cantina no se visita a las diez de la mañana y una tortillería no
-- se visita a las nueve de la noche. Sin esta variable, las rutas mandan
-- al vendedor a tocar puertas cerradas.
--
-- El DENUE no trae horarios: revisé los 42 campos del registro original
-- y no hay ninguno. Así que el turno se DEDUCE y se corrige en campo,
-- que es donde se sabe de verdad.
--
-- ── De dónde sale el turno, en orden de prioridad ──────────────────────
--
--   1. El NOMBRE del negocio (shift_name_rules).
--   2. El código de giro del INEGI (shift_rules).
--   3. Horario de oficina, si no aplica ninguna.
--
-- El nombre manda sobre el código porque el código es demasiado grueso:
-- "Antojitos" (722513) mete en la misma bolsa las gorditas del desayuno
-- y los tacos de la medianoche. En el comercio de calle mexicano el
-- nombre sí dice la hora: una birriería es de mañana aunque el INEGI la
-- clasifique igual que una taquería.
--
-- Si varias palabras coinciden gana la MÁS LARGA, que es la más
-- específica. Por eso "Tacos de barbacoa" cae en mañana: barbacoa (8
-- letras) le gana a tacos (5).
--
-- Las palabras salieron de contar las que de verdad aparecen en los
-- 37,544 negocios objetivo, no de suponer.
--
-- ── Una lección que costó ──────────────────────────────────────────────
--
-- La primera versión decía que 812210 son funerarias. No: en los datos
-- del INEGI 812210 son LAVANDERÍAS Y TINTORERÍAS, que son de día. Por eso
-- aparecían lavanderías en rutas de noche. Escribí ese código de memoria
-- en vez de sacarlo de la base.
--
-- Para que no se repita, shift_rules guarda el giro REAL del INEGI y
-- refrescar_reglas_de_turno() lo llena solo: si una regla apunta a un
-- giro que no es el que uno creía, se ve de inmediato.
--
-- ── Uso ────────────────────────────────────────────────────────────────
--   select * from public.refrescar_reglas_de_turno();  -- revisar reglas
--   select * from public.aplicar_turnos();             -- recalcular
--   select * from public.generar_rutas_completas('Z7-S01');
-- ════════════════════════════════════════════════════════════════════════

-- ── Candado para funciones que se saltan RLS ────────────────────────────
-- auth.uid() es null cuando se llama desde el servidor (migraciones,
-- scripts con la llave de servicio); ahí sí se permite.
create or replace function public.exigir_admin(p_accion text)
returns void language plpgsql stable
set search_path = public, pg_catalog
as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo el administrador puede %', p_accion
      using errcode = '42501';
  end if;
end;
$fn$;


-- ── Reglas por giro ─────────────────────────────────────────────────────
create table if not exists public.shift_rules (
  prefijo    text primary key,
  turnos     text[] not null,
  nota       text,
  giro_inegi text,              -- se llena solo, con el giro real
  negocios   integer,           -- cuántos cubre
  updated_at timestamptz not null default now()
);

alter table public.shift_rules enable row level security;
drop policy if exists "shift_rules: lectura" on public.shift_rules;
create policy "shift_rules: lectura" on public.shift_rules
  for select to authenticated using (true);
drop policy if exists "shift_rules: admin escribe" on public.shift_rules;
create policy "shift_rules: admin escribe" on public.shift_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.shift_rules (prefijo, turnos, nota) values
  ('46',     array['manana','tarde'],          'Comercio al por menor'),
  ('461110', array['manana','tarde'],          'Abarrotes: de dia'),
  ('461121', array['manana'],                  'Carnes rojas: venden temprano'),
  ('461130', array['manana'],                  'Frutas y verduras: venden temprano'),
  ('461160', array['manana','tarde'],          'Dulcerias'),
  ('462112', array['manana','tarde'],          'Minisupers: de dia'),
  ('465311', array['manana','tarde'],          'Papelerias: pegadas al horario escolar'),
  ('72',     array['tarde','noche'],           'Restaurantes y bares'),
  ('7221',   array['manana','tarde','noche'],  'Hoteles: hay quien atiende siempre'),
  ('7224',   array['noche'],                   'Bares y cantinas: solo de noche'),
  ('722511', array['manana','tarde'],          'Comida a la carta'),
  ('722513', array['manana','tarde'],          'Antojitos: depende del nombre'),
  ('722514', array['tarde','noche'],           'Tacos y tortas'),
  ('722515', array['tarde','noche'],           'Cafeterias y neverias'),
  ('722517', array['tarde','noche'],           'Pizzas y hamburguesas'),
  ('81',     array['manana','tarde'],          'Otros servicios'),
  ('811',    array['manana','tarde'],          'Talleres: abren temprano'),
  ('812110', array['tarde'],                   'Salones de belleza: se llenan por la tarde'),
  ('812210', array['manana','tarde'],          'Lavanderias y tintorerias: de dia'),
  ('813210', array['tarde','noche'],           'Asociaciones religiosas'),
  ('62',     array['manana','tarde'],          'Consultorios y laboratorios'),
  ('621211', array['tarde'],                   'Dentistas: casi todos de tarde'),
  ('6213',   array['manana','tarde'],          'Nutriologos y similares')
on conflict (prefijo) do update
  set turnos = excluded.turnos, nota = excluded.nota, updated_at = now();


-- ── Reglas por nombre: mandan sobre las de giro ─────────────────────────
create table if not exists public.shift_name_rules (
  palabra    text primary key,
  turnos     text[] not null,
  nota       text,
  updated_at timestamptz not null default now()
);

alter table public.shift_name_rules enable row level security;
drop policy if exists "shift_name_rules: lectura" on public.shift_name_rules;
create policy "shift_name_rules: lectura" on public.shift_name_rules
  for select to authenticated using (true);
drop policy if exists "shift_name_rules: admin escribe" on public.shift_name_rules;
create policy "shift_name_rules: admin escribe" on public.shift_name_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.shift_name_rules (palabra, turnos, nota) values
  -- Desayuno
  ('GORDITA',          array['manana'],          'Gorditas: desayuno'),
  ('BIRRIA',           array['manana'],          'Birria: desayuno y mediodia'),
  ('BIRRIERIA',        array['manana'],          'Birria: desayuno y mediodia'),
  ('MENUDO',           array['manana'],          'Menudo: desayuno'),
  ('BARBACOA',         array['manana'],          'Barbacoa: desayuno'),
  ('TAMAL',            array['manana'],          'Tamales: desayuno'),
  ('ATOLE',            array['manana'],          'Atole: desayuno'),
  ('JUGO',             array['manana'],          'Jugos: desayuno'),
  ('CARNITAS',         array['manana'],          'Carnitas: desayuno y mediodia'),
  ('CHICHARRON',       array['manana'],          'Chicharron: desayuno'),
  ('PANADERIA',        array['manana','tarde'],  'Panaderia'),
  ('TORTILLERIA',      array['manana'],          'Tortilleria: temprano'),
  ('DESAYUNO',         array['manana'],          'Desayunos'),
  -- Mediodia y tarde
  ('COCINA ECONOMICA', array['manana','tarde'],  'Comida corrida: mediodia'),
  ('LONCHERIA',        array['manana','tarde'],  'Loncheria: mediodia'),
  ('FONDA',            array['manana','tarde'],  'Fonda: mediodia'),
  ('POZOLE',           array['tarde'],           'Pozole: mediodia y tarde'),
  ('MARISCOS',         array['manana','tarde'],  'Mariscos: mediodia'),
  ('ROSTICERIA',       array['tarde'],           'Pollos rostizados: mediodia'),
  ('CAFETERIA',        array['manana','tarde'],  'Cafeteria'),
  ('CHASCA',           array['tarde'],           'Chascas: botana de la tarde'),
  ('PALETERIA',        array['tarde'],           'Paleteria'),
  ('NEVERIA',          array['tarde'],           'Neveria'),
  ('TORTA',            array['tarde'],           'Tortas: mediodia y tarde'),
  -- Noche
  ('CENADURIA',        array['noche'],           'Cenaduria: de cena'),
  ('CENA',             array['noche'],           'Cenas'),
  ('TAQUERIA',         array['tarde','noche'],   'Taqueria: tarde y noche'),
  ('TACOS',            array['tarde','noche'],   'Tacos: tarde y noche'),
  ('HAMBURGUESA',      array['noche'],           'Hamburguesas: de noche'),
  ('HOT DOG',          array['noche'],           'Hot dogs: de noche'),
  ('ELOTE',            array['noche'],           'Elotes: de noche'),
  ('PIZZA',            array['tarde','noche'],   'Pizza: tarde y noche'),
  ('QUESADILLA',       array['tarde','noche'],   'Quesadillas'),
  ('BAR ',             array['noche'],           'Bar: de noche'),
  ('CANTINA',          array['noche'],           'Cantina: de noche'),
  ('CERVEZA',          array['tarde','noche'],   'Cerveceria'),
  ('LICOR',            array['tarde','noche'],   'Vinos y licores'),
  ('ANTRO',            array['noche'],           'Antro: de noche'),
  ('BILLAR',           array['noche'],           'Billar: de noche'),
  -- Tiendas: de dia
  ('ABARROTE',         array['manana','tarde'],  'Abarrotes: de dia'),
  ('MINISUPER',        array['manana','tarde'],  'Minisuper: de dia'),
  ('CREMERIA',         array['manana'],          'Cremeria: temprano'),
  ('CARNICERIA',       array['manana'],          'Carniceria: temprano'),
  ('POLLERIA',         array['manana'],          'Polleria: temprano'),
  ('FRUTERIA',         array['manana'],          'Fruteria: temprano'),
  ('VERDURA',          array['manana'],          'Verduras: temprano'),
  ('TLAPALERIA',       array['manana','tarde'],  'Tlapaleria: de dia'),
  ('FERRETERIA',       array['manana','tarde'],  'Ferreteria: de dia'),
  -- Escuelas
  ('ESCOLAR',          array['manana'],          'Cooperativa escolar'),
  ('KINDER',           array['manana'],          'Horario escolar'),
  ('PRIMARIA',         array['manana'],          'Horario escolar'),
  ('SECUNDARIA',       array['manana'],          'Horario escolar')
on conflict (palabra) do update
  set turnos = excluded.turnos, nota = excluded.nota, updated_at = now();


-- ── El turno de cada negocio ────────────────────────────────────────────
alter table public.businesses
  add column if not exists shifts        text[],
  add column if not exists shifts_source text not null default 'regla'
    check (shifts_source in ('regla', 'campo'));

comment on column public.businesses.shifts_source is
  'regla = lo dedujo el sistema del giro o del nombre. campo = lo corrigio un vendedor en la puerta; eso no se pisa.';

create index if not exists businesses_shifts_idx on public.businesses using gin (shifts);

create or replace function public.aplicar_turnos()
returns table (turno text, negocios bigint)
language plpgsql security definer
set search_path = public, pg_catalog
as $fn$
begin
  perform public.exigir_admin('recalcular los turnos');

  update public.businesses b
     set shifts = coalesce(
           (select r.turnos from public.shift_name_rules r
             where upper(unaccent(b.name)) like '%' || r.palabra || '%'
             order by length(r.palabra) desc limit 1),
           (select r.turnos from public.shift_rules r
             where b.scian_clase like r.prefijo || '%'
             order by length(r.prefijo) desc limit 1),
           array['manana','tarde']
         )
   where b.is_target
     and b.shifts_source = 'regla';

  return query
    select t.turno, count(*)
      from public.businesses b, unnest(b.shifts) as t(turno)
     where b.is_target group by t.turno order by 2 desc;
end;
$fn$;

create or replace function public.refrescar_reglas_de_turno()
returns table (prefijo text, giro text, negocios integer, turnos text[])
language plpgsql security definer
set search_path = public, pg_catalog
as $fn$
begin
  update public.shift_rules r
     set giro_inegi = d.giro, negocios = d.cuantos
    from (
      select r2.prefijo,
             (array_agg(b.activity_class order by b.activity_class))[1] as giro,
             count(*)::integer as cuantos
        from public.shift_rules r2
        join public.businesses b
          on b.is_target and b.scian_clase like r2.prefijo || '%'
       group by r2.prefijo
    ) d
   where d.prefijo = r.prefijo;

  return query
    select r.prefijo, left(r.giro_inegi, 52), r.negocios, r.turnos
      from public.shift_rules r order by r.negocios desc nulls last;
end;
$fn$;

alter function public.aplicar_turnos()            set statement_timeout = '600s';
alter function public.refrescar_reglas_de_turno() set statement_timeout = '600s';
