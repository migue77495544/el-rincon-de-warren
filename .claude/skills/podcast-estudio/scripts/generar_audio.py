"""Convierte un guion de podcast (líneas `HABLANTE: texto`) en un MP3.

Uso:
    python generar_audio.py guion.txt [--salida episodio.mp3] [--motor gemini|edge]
                            [--voces "PROFESOR=Charon,ESTUDIANTE=Kore"] [--estilo "..."]
                            [--simular]

Motores:
    gemini  Gemini TTS con diálogo nativo a dos voces. Requiere GEMINI_API_KEY
            (entorno o .env). Modelo: GEMINI_TTS_MODEL o autodetección.
    edge    edge-tts (gratis, sin clave). Requiere `pip install edge-tts`.

Solo usa la biblioteca estándar más ffmpeg. Los avisos van por stderr.
"""

import argparse
import asyncio
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
MODELOS_TTS_CONOCIDOS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']
VOCES_GEMINI = ['Charon', 'Kore']
VOCES_EDGE = ['es-MX-JorgeNeural', 'es-MX-DaliaNeural']
ESTILO_POR_DEFECTO = (
    'Lee en español latinoamericano neutro esta conversación de un podcast educativo. '
    'Tono cercano y claro, ritmo pausado, como dos personas que estudian juntas.'
)
MAX_CARACTERES_BLOQUE = 2500
PAUSA_ENTRE_BLOQUES = 0.4
PALABRAS_POR_MINUTO = 150


class ErrorClave(Exception):
    """Clave de Gemini ausente, inválida o sin permisos: no tiene sentido probar otros modelos."""


def log(mensaje):
    print(mensaje, file=sys.stderr, flush=True)


def leer_guion(ruta):
    """Devuelve [(hablante, texto)]; las líneas sin `NOMBRE:` continúan el turno anterior."""
    turnos = []
    patron = re.compile(r'^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9 _-]{0,30}):\s*(.*)$')
    for linea in Path(ruta).read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if not linea or linea.startswith('#'):
            continue
        m = patron.match(linea)
        if m:
            turnos.append([m.group(1).strip(), m.group(2).strip()])
        elif turnos:
            turnos[-1][1] = f'{turnos[-1][1]} {linea}'.strip()
        else:
            turnos.append(['NARRADOR', linea])
    return [(h, t) for h, t in turnos if t]


def agrupar_bloques(turnos, limite=MAX_CARACTERES_BLOQUE):
    """Agrupa turnos consecutivos en bloques de como mucho `limite` caracteres."""
    bloques, actual, tam = [], [], 0
    for hablante, texto in turnos:
        largo = len(hablante) + len(texto) + 3
        if actual and tam + largo > limite:
            bloques.append(actual)
            actual, tam = [], 0
        actual.append((hablante, texto))
        tam += largo
    if actual:
        bloques.append(actual)
    return bloques


def asignar_voces(hablantes, voces_arg, voces_defecto):
    voces = {}
    if voces_arg:
        for par in voces_arg.split(','):
            nombre, _, voz = par.partition('=')
            if voz:
                voces[nombre.strip().upper()] = voz.strip()
    for i, h in enumerate(hablantes):
        voces.setdefault(h, voces_defecto[i % len(voces_defecto)])
    return voces


def cargar_clave():
    clave = os.environ.get('GEMINI_API_KEY')
    if clave:
        return clave
    # Busca .env subiendo desde el directorio actual (formato KEY=valor).
    for carpeta in [Path.cwd(), *Path.cwd().parents]:
        env = carpeta / '.env'
        if env.is_file():
            for linea in env.read_text(encoding='utf-8').splitlines():
                if linea.strip().startswith('GEMINI_API_KEY='):
                    return linea.split('=', 1)[1].strip().strip('"\'')
    return None


def peticion_gemini(url, clave, cuerpo=None, intentos=4):
    datos = json.dumps(cuerpo).encode('utf-8') if cuerpo is not None else None
    for intento in range(intentos):
        req = urllib.request.Request(url, data=datos, headers={
            'x-goog-api-key': clave,
            'Content-Type': 'application/json',
        })
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            cuerpo_error = e.read().decode('utf-8', 'replace')
            try:
                detalle = json.loads(cuerpo_error)['error']['message']
            except (ValueError, KeyError, TypeError):
                detalle = cuerpo_error[:300]
            if e.code in (401, 403) or 'API_KEY_INVALID' in cuerpo_error:
                raise ErrorClave(f'Gemini rechazó la clave ({e.code}): {detalle}') from e
            if e.code in (429, 500, 502, 503, 504) and intento < intentos - 1:
                espera = 2 ** (intento + 2)
                log(f'  Gemini respondió {e.code}; reintento en {espera} s')
                time.sleep(espera)
                continue
            raise RuntimeError(f'Gemini respondió {e.code}: {detalle}') from e
        except urllib.error.URLError as e:
            if intento < intentos - 1:
                time.sleep(2 ** (intento + 1))
                continue
            raise RuntimeError(f'No se pudo conectar con Gemini ({e.reason}). '
                               '¿Está permitido generativelanguage.googleapis.com en la red?') from e


def modelos_tts(clave):
    """Modelo de GEMINI_TTS_MODEL primero; después los TTS que liste la API; después los conocidos."""
    candidatos = []
    if os.environ.get('GEMINI_TTS_MODEL'):
        candidatos.append(os.environ['GEMINI_TTS_MODEL'])
    try:
        lista = peticion_gemini(f'{API_GEMINI}/models?pageSize=1000', clave, intentos=1)
        nombres = [m['name'].removeprefix('models/') for m in lista.get('models', [])
                   if 'tts' in m['name'] and 'generateContent' in m.get('supportedGenerationMethods', [])]
        # Flash antes que Pro: más rápido y barato.
        candidatos += sorted(nombres, key=lambda n: 'pro' in n)
    except RuntimeError as e:
        log(f'  No se pudo listar modelos ({e}); uso la lista conocida')
    candidatos += MODELOS_TTS_CONOCIDOS
    return list(dict.fromkeys(candidatos))


def gemini_bloque(bloque, voces, estilo, clave, modelos, destino):
    hablantes = list(dict.fromkeys(h for h, _ in bloque))
    texto = estilo + '\n\n' + '\n'.join(f'{h}: {t}' for h, t in bloque)
    if len(hablantes) == 1:
        voz = {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voces[hablantes[0]]}}}
        texto = estilo + '\n\n' + ' '.join(t for _, t in bloque)
    else:
        voz = {'multiSpeakerVoiceConfig': {'speakerVoiceConfigs': [
            {'speaker': h, 'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voces[h]}}}
            for h in hablantes
        ]}}
    cuerpo = {
        'contents': [{'parts': [{'text': texto}]}],
        'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': voz},
    }
    ultimo_error = None
    for modelo in list(modelos):
        try:
            resp = peticion_gemini(f'{API_GEMINI}/models/{modelo}:generateContent', clave, cuerpo)
            parte = resp['candidates'][0]['content']['parts'][0]['inlineData']
        except (RuntimeError, KeyError, IndexError) as e:
            ultimo_error = e
            log(f'  {modelo} no sirvió: {e}')
            modelos.remove(modelo)  # no volver a probarlo en los bloques siguientes
            continue
        tasa = int((re.search(r'rate=(\d+)', parte.get('mimeType', '')) or [0, 24000])[1])
        with wave.open(str(destino), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(tasa)
            w.writeframes(base64.b64decode(parte['data']))
        return
    raise RuntimeError(f'Ningún modelo TTS de Gemini funcionó. Último error: {ultimo_error}')


async def edge_bloque(bloque, voces, destino, carpeta):
    import edge_tts  # noqa: PLC0415 — dependencia opcional
    partes = []
    for i, (hablante, texto) in enumerate(bloque):
        parte = carpeta / f'{destino.stem}_{i:03d}.mp3'  # destino es un .wav
        await edge_tts.Communicate(texto, voces[hablante], rate='-5%').save(str(parte))
        partes.append(parte)
    concatenar(partes, destino, pausa=0.25, carpeta=carpeta)


def simular_bloque(bloque, destino):
    """Silencio con la duración estimada del bloque: prueba el proceso sin motor."""
    palabras = sum(len(t.split()) for _, t in bloque)
    segundos = max(1.0, palabras / PALABRAS_POR_MINUTO * 60)
    ffmpeg('-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', f'{segundos:.2f}', str(destino))


def ffmpeg(*args):
    res = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f'ffmpeg falló: {res.stderr.strip()[:300]}')


def concatenar(partes, salida, pausa, carpeta, titulo=None):
    """Une las partes (wav o mp3) con una pausa entre ellas; el formato de salida lo da la extensión."""
    silencio = carpeta / f'pausa_{pausa}.wav'
    if not silencio.exists():
        ffmpeg('-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', str(pausa), str(silencio))
    entradas = []
    for i, p in enumerate(partes):
        if i:
            entradas.append(silencio)
        entradas.append(Path(p))
    args = [a for e in entradas for a in ('-i', str(e))]
    n = len(entradas)
    # El filtro concat normaliza formatos distintos (wav de Gemini, mp3 de edge, silencios).
    filtro = ''.join(f'[{i}:a]aresample=24000,aformat=channel_layouts=mono[a{i}];' for i in range(n))
    filtro += ''.join(f'[a{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1[out]'
    codec = ['-c:a', 'libmp3lame', '-b:a', '96k'] if salida.suffix == '.mp3' else []
    meta = ['-metadata', f'title={titulo}'] if titulo else []
    ffmpeg(*args, '-filter_complex', filtro, '-map', '[out]', *codec, *meta, str(salida))


def duracion(ruta):
    res = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', str(ruta)], capture_output=True, text=True)
    try:
        return float(res.stdout.strip())
    except ValueError:
        return 0.0


def main():
    parser = argparse.ArgumentParser(description='Genera el MP3 de un guion de podcast de estudio.')
    parser.add_argument('guion')
    parser.add_argument('--salida', help='Ruta del MP3 (por defecto episodio.mp3 junto al guion)')
    parser.add_argument('--motor', choices=['gemini', 'edge'], default='gemini')
    parser.add_argument('--voces', help='Ej.: "PROFESOR=Charon,ESTUDIANTE=Kore"')
    parser.add_argument('--estilo', default=ESTILO_POR_DEFECTO, help='Indicación de tono (solo Gemini)')
    parser.add_argument('--simular', action='store_true', help='Genera silencio en vez de voz (prueba)')
    args = parser.parse_args()

    if not shutil.which('ffmpeg'):
        sys.exit('Falta ffmpeg en el sistema.')
    ruta_guion = Path(args.guion)
    turnos = leer_guion(ruta_guion)
    if not turnos:
        sys.exit('El guion no tiene turnos con el formato "HABLANTE: texto".')
    hablantes = list(dict.fromkeys(h for h, _ in turnos))
    if args.motor == 'gemini' and len(hablantes) > 2:
        sys.exit(f'Gemini admite como mucho dos hablantes y el guion tiene {len(hablantes)}: {", ".join(hablantes)}.')

    voces = asignar_voces(hablantes, args.voces, VOCES_GEMINI if args.motor == 'gemini' else VOCES_EDGE)
    bloques = agrupar_bloques(turnos)
    palabras = sum(len(t.split()) for _, t in turnos)
    salida = Path(args.salida) if args.salida else ruta_guion.with_name('episodio.mp3')
    titulo = next((l.lstrip('# ').strip() for l in ruta_guion.read_text(encoding='utf-8').splitlines()
                   if l.startswith('#')), ruta_guion.parent.name)
    log(f'{palabras} palabras (~{palabras / PALABRAS_POR_MINUTO:.0f} min), {len(bloques)} bloques, '
        f'motor {"simulado" if args.simular else args.motor}, voces {voces}')

    clave, modelos = None, []
    if args.motor == 'gemini' and not args.simular:
        clave = cargar_clave()
        if not clave:
            sys.exit('Falta GEMINI_API_KEY (variable de entorno o archivo .env).')
        modelos = modelos_tts(clave)
        log(f'Modelos TTS a probar: {", ".join(modelos)}')

    with tempfile.TemporaryDirectory(prefix='podcast_') as tmp:
        carpeta = Path(tmp)
        partes = []
        for i, bloque in enumerate(bloques, 1):
            log(f'Bloque {i}/{len(bloques)}…')
            if args.simular:
                destino = carpeta / f'bloque_{i:03d}.wav'
                simular_bloque(bloque, destino)
            elif args.motor == 'gemini':
                destino = carpeta / f'bloque_{i:03d}.wav'
                gemini_bloque(bloque, voces, args.estilo, clave, modelos, destino)
            else:
                destino = carpeta / f'bloque_{i:03d}.wav'
                asyncio.run(edge_bloque(bloque, voces, destino, carpeta))
            partes.append(destino)
        salida.parent.mkdir(parents=True, exist_ok=True)
        concatenar(partes, salida, PAUSA_ENTRE_BLOQUES, carpeta, titulo)

    seg = duracion(salida)
    print(json.dumps({'success': True, 'salida': str(salida), 'duracion_seg': round(seg),
                      'duracion': f'{int(seg // 60)}:{int(seg % 60):02d}', 'palabras': palabras,
                      'bloques': len(bloques), 'simulado': args.simular}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ErrorClave) as e:
        sys.exit(f'Error: {e}')
