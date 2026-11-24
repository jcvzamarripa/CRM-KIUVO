#!/usr/bin/env python3
"""
Importa el directorio de negocios del DENUE (INEGI) a la tabla businesses.

Fuente: INEGI, DENUE. Los Términos de Libre Uso del INEGI permiten copiar
y explotar comercialmente la información citando la fuente.

Usa la descarga masiva en CSV, no la API: no necesita token, trae más
campos y es mucho más rápido. Son 25 archivos por sector a nivel nacional
(~545 MB comprimidos); de cada uno se queda solo con Aguascalientes.

── Uso ───────────────────────────────────────────────────────────────────
    python scripts/importar_denue.py --descargar
        Baja los 25 ZIP del INEGI. Reanudable: lo ya bajado se omite.

    python scripts/importar_denue.py --revisar
        Sin tocar la base: dice cuántos negocios de Aguascalientes hay,
        cómo quedan las colonias y qué tan completos vienen los datos.

    python scripts/importar_denue.py --importar
        Carga a Supabase.

    Se pueden combinar:  --descargar --revisar --importar

    --entidad 01     Clave de estado (01 = Aguascalientes)
    --sector 46      Procesar solo un sector, para probar
    --datos RUTA     Dónde guardar las descargas

── Qué necesita en .env.local (solo para --importar) ─────────────────────
    VITE_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...      la llave service_role, no la pública

Re-importar es seguro: cada negocio se identifica por su CLEE (clave única
del INEGI), así que lo que ya existe se actualiza en vez de duplicarse, y
NO se pisa el estado ni las correcciones que hayan hecho los vendedores.
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE_URL = 'https://www.inegi.org.mx/contenidos/masiva/denue'

# La consola de Windows usa cp1252 y truena con acentos y líneas de caja.
for flujo in (sys.stdout, sys.stderr):
    try:
        flujo.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

# Los 25 archivos de la edición vigente, por sector SCIAN.
ARCHIVOS = [
    '11', '21', '22', '23', '31-33', '43',
    '46111', '46112-46311', '46321-46531', '46591-46911',
    '48-49', '51', '52', '53', '54', '55', '56',
    '61', '62', '71', '72_1', '72_2', '81_1', '81_2', '93',
]

LOTE_SUPABASE = 500       # filas por petición
csv.field_size_limit(10_000_000)


# ── Configuración ────────────────────────────────────────────────────────
def cargar_env():
    for nombre in ('.env.local', '.env'):
        ruta = RAIZ / nombre
        if not ruta.exists():
            continue
        for linea in ruta.read_text(encoding='utf-8', errors='replace').splitlines():
            m = re.match(r'\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$', linea)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"\'')


def miles(n):
    return f'{n:,}'.replace(',', ' ')


# ── Descarga ─────────────────────────────────────────────────────────────
def descargar(dir_datos):
    dir_datos.mkdir(parents=True, exist_ok=True)
    print(f'\nDescargando DENUE a {dir_datos}\n')
    for i, sector in enumerate(ARCHIVOS, 1):
        destino = dir_datos / f'denue_00_{sector}_csv.zip'
        etiqueta = f'[{i:2}/{len(ARCHIVOS)}] sector {sector}'
        if destino.exists() and destino.stat().st_size > 0:
            print(f'{etiqueta:28} ya estaba ({destino.stat().st_size / 1048576:.1f} MB)')
            continue
        url = f'{BASE_URL}/denue_00_{sector}_csv.zip'
        try:
            parcial = destino.with_suffix('.parcial')
            with urllib.request.urlopen(url, timeout=300) as r, open(parcial, 'wb') as w:
                total = 0
                while True:
                    trozo = r.read(1 << 20)
                    if not trozo:
                        break
                    w.write(trozo)
                    total += len(trozo)
                    print(f'\r{etiqueta:28} {total / 1048576:6.1f} MB', end='', flush=True)
            parcial.rename(destino)   # solo se considera bueno si terminó
            print(f'\r{etiqueta:28} {total / 1048576:6.1f} MB  listo')
        except (urllib.error.URLError, OSError) as e:
            print(f'\r{etiqueta:28} FALLÓ: {e}')
            if destino.with_suffix('.parcial').exists():
                destino.with_suffix('.parcial').unlink()


# ── Lectura de los CSV ───────────────────────────────────────────────────
def leer_entidad(dir_datos, entidad, solo_sector=None):
    """Devuelve los registros del estado pedido, de todos los ZIP."""
    zips = sorted(dir_datos.glob('denue_00_*_csv.zip'))
    if not zips:
        sys.exit(f'\nNo hay archivos en {dir_datos}. Corre primero --descargar\n')

    registros = []
    for z in zips:
        sector = z.stem.replace('denue_00_', '').replace('_csv', '')
        if solo_sector and not sector.startswith(solo_sector):
            continue
        try:
            with zipfile.ZipFile(z) as zf:
                internos = [n for n in zf.namelist()
                            if n.startswith('conjunto_de_datos/') and n.endswith('.csv')]
                if not internos:
                    print(f'  ! {z.name}: sin CSV adentro, se omite')
                    continue
                with zf.open(internos[0]) as fh:
                    # El INEGI entrega los CSV en latin-1, no en UTF-8.
                    texto = io.TextIOWrapper(fh, encoding='latin-1', newline='')
                    delsector = [f for f in csv.DictReader(texto)
                                 if f.get('cve_ent') == entidad]
            registros.extend(delsector)
            print(f'  {sector:14} {miles(len(delsector)):>8}')
        except (zipfile.BadZipFile, KeyError) as e:
            print(f'  ! {z.name}: archivo dañado ({e}). Bórralo y vuelve a descargarlo.')
    return registros


# ── Conversión al esquema del CRM ────────────────────────────────────────
def limpio(v):
    s = (v or '').strip()
    return s if s else None


def numero(v):
    try:
        n = float((v or '').strip())
        return n if n != 0 else None
    except (TypeError, ValueError):
        return None


# El INEGI parte el asentamiento en tipo + nombre. Para la mayoría el tipo
# es genérico y se tira ("COLONIA" + "CENTRO" -> "Centro"), pero en algunos
# el tipo ES parte del nombre propio: "BARRIO" + "DE GUADALUPE" es el Barrio
# de Guadalupe, y guardar solo "DE GUADALUPE" deja un nombre que nadie
# reconoce en la calle.
TIPOS_QUE_SON_NOMBRE = {
    'BARRIO', 'EJIDO', 'PUEBLO', 'RANCHERIA', 'RANCHO',
    'PARQUE INDUSTRIAL', 'CIUDAD INDUSTRIAL', 'ZONA INDUSTRIAL',
}


def nombre_colonia(tipo, nombre):
    tipo = (tipo or '').strip().upper()
    nombre = (nombre or '').strip()
    if not nombre:
        return None
    if tipo not in TIPOS_QUE_SON_NOMBRE:
        return nombre
    if nombre.upper().startswith(tipo):   # ya viene completo, no duplicar
        return nombre
    return f'{tipo} {nombre}'


def convertir(f):
    """Un renglón del CSV del INEGI -> un renglón de businesses."""
    # La calle viene partida en tipo y nombre: "CALLE" + "MIGUEL HIDALGO"
    calle = ' '.join(x for x in (limpio(f.get('tipo_vial')), limpio(f.get('nom_vial'))) if x)
    ext = ''.join(x for x in (limpio(f.get('numero_ext')), limpio(f.get('letra_ext'))) if x)
    interior = ''.join(x for x in (limpio(f.get('numero_int')), limpio(f.get('letra_int'))) if x)

    # codigo_act son 6 dígitos; los niveles superiores son sus prefijos
    clase = limpio(f.get('codigo_act')) or ''
    return {
        'denue_id':        limpio(f.get('id')),
        'clee':            limpio(f.get('clee')),
        'source':          'denue',
        'name':            limpio(f.get('nom_estab')) or limpio(f.get('raz_social')) or 'Sin nombre',
        'legal_name':      limpio(f.get('raz_social')),
        'activity_class':  limpio(f.get('nombre_act')),
        'scian_sector':    clase[:2] or None,
        'scian_subsector': clase[:3] or None,
        'scian_rama':      clase[:4] or None,
        'scian_clase':     clase or None,
        'strata':          limpio(f.get('per_ocu')),
        'street':          calle or None,
        'ext_num':         ext or None,
        'int_num':         interior or None,
        'colony':          nombre_colonia(f.get('tipo_asent'), f.get('nomb_asent')),
        'postal_code':     limpio(f.get('cod_postal')),
        'locality':        limpio(f.get('localidad')),
        'municipality':    limpio(f.get('municipio')),
        'ageb':            limpio(f.get('ageb')),
        'manzana':         limpio(f.get('manzana')),
        'lat':             numero(f.get('latitud')),
        'lng':             numero(f.get('longitud')),
        'phone':           limpio(f.get('telefono')),
        'email':           limpio(f.get('correoelec')),
        'website':         limpio(f.get('www')),
        'raw':             {k: v for k, v in f.items() if v and v.strip()},
    }


# ── Revisión sin tocar la base ───────────────────────────────────────────
def normalizar_colonia(txt):
    """Igual que la función normalizar_colonia de la base, para previsualizar."""
    import unicodedata
    s = (txt or '').upper()
    s = ''.join(c for c in unicodedata.normalize('NFD', s)
                if unicodedata.category(c) != 'Mn')
    s = re.sub(r'^(COL\.?|COLONIA|FRACC\.?|FRACCIONAMIENTO|UNIDAD HAB\.?|U\. HAB\.?|CONJUNTO HAB\.?)\s+', '', s)
    return re.sub(r'\s+', ' ', s).strip() or None


def revisar(filas):
    n = len(filas)
    if not n:
        print('\nNo se encontró ningún negocio.\n')
        return
    print(f'\n{"=" * 56}\nREVISIÓN — {miles(n)} negocios\n{"=" * 56}\n')

    for campo, etiqueta in [('lat', 'Con coordenadas'), ('colony', 'Con colonia'),
                            ('phone', 'Con teléfono'), ('email', 'Con correo'),
                            ('clee', 'Con clave CLEE')]:
        c = sum(1 for f in filas if f.get(campo))
        marca = '' if c == n else ('  <-- ojo' if c < n * 0.5 else '')
        print(f'{etiqueta:20} {miles(c):>8} de {miles(n)}  ({100 * c // n:3}%){marca}')

    sin_clee = sum(1 for f in filas if not f.get('clee'))
    if sin_clee:
        print(f'\n{miles(sin_clee)} sin CLEE: se omiten (sin ella no se pueden evitar duplicados)')

    # Municipios
    muns = {}
    for f in filas:
        muns[f.get('municipality') or '(sin municipio)'] = muns.get(f.get('municipality') or '(sin municipio)', 0) + 1
    print(f'\n{"MUNICIPIO":30} NEGOCIOS')
    print('─' * 42)
    for m, c in sorted(muns.items(), key=lambda kv: -kv[1]):
        print(f'{m[:30]:30} {miles(c):>8}')

    # Colonias: esto es lo que vas a usar para armar las zonas
    cols = {}
    for f in filas:
        c = normalizar_colonia(f.get('colony'))
        if c:
            cols[c] = cols.get(c, 0) + 1
    print(f'\nColonias distintas: {miles(len(cols))}')
    print(f'\n{"LAS 25 COLONIAS CON MÁS NEGOCIOS":36} NEGOCIOS')
    print('─' * 46)
    for c, n_ in sorted(cols.items(), key=lambda kv: -kv[1])[:25]:
        print(f'{c[:36]:36} {miles(n_):>8}')
    print()


# ── Carga a Supabase ─────────────────────────────────────────────────────
def subir(filas, url_base, llave):
    url = f'{url_base}/rest/v1/businesses?on_conflict=clee'
    cuerpo = json.dumps(filas, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=cuerpo, method='POST', headers={
        'apikey': llave,
        'Authorization': f'Bearer {llave}',
        'Content-Type': 'application/json',
        # merge-duplicates: actualiza lo que ya existe en vez de fallar
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.status


def importar(filas):
    url_base = os.environ.get('VITE_SUPABASE_URL', '').rstrip('/')
    llave = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url_base or not llave:
        sys.exit('\nFaltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n'
                 'La llave service_role está en Supabase → Settings → API\n')

    utiles = [f for f in filas if f.get('clee')]
    print(f'\nSubiendo {miles(len(utiles))} negocios…\n')
    hechos = 0
    for i in range(0, len(utiles), LOTE_SUPABASE):
        lote = utiles[i:i + LOTE_SUPABASE]
        try:
            subir(lote, url_base, llave)
            hechos += len(lote)
            print(f'\r  {miles(hechos)} de {miles(len(utiles))}', end='', flush=True)
        except urllib.error.HTTPError as e:
            detalle = e.read().decode('utf-8', 'replace')[:400]
            print(f'\n\nFalló en el lote {i // LOTE_SUPABASE + 1}: HTTP {e.code}\n{detalle}\n')
            sys.exit(1)
    print(f'\r  {miles(hechos)} de {miles(len(utiles))}  listo\n')
    print('Siguiente paso: define tus zonas y corre  select public.asignar_zonas();\n')


# ── Principal ────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description='Importa el DENUE del INEGI al CRM')
    p.add_argument('--descargar', action='store_true', help='baja los ZIP del INEGI')
    p.add_argument('--revisar', action='store_true', help='reporta sin tocar la base')
    p.add_argument('--importar', action='store_true', help='carga a Supabase')
    p.add_argument('--entidad', default='01', help='clave de estado (01 = Aguascalientes)')
    p.add_argument('--sector', default=None, help='procesar solo un sector')
    p.add_argument('--datos', default=None, help='carpeta de descargas')
    a = p.parse_args()

    if not (a.descargar or a.revisar or a.importar):
        p.print_help()
        sys.exit(0)

    cargar_env()
    dir_datos = Path(a.datos) if a.datos else RAIZ / 'datos_denue'

    if a.descargar:
        descargar(dir_datos)

    if a.revisar or a.importar:
        print(f'\nLeyendo entidad {a.entidad}…\n')
        print(f'  {"SECTOR":14} {"NEGOCIOS":>8}')
        print('  ' + '─' * 23)
        crudos = leer_entidad(dir_datos, a.entidad, a.sector)
        filas = [convertir(f) for f in crudos]
        if a.revisar:
            revisar(filas)
        if a.importar:
            importar(filas)


if __name__ == '__main__':
    main()
