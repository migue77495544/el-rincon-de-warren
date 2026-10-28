# Avance del curso

> Cada sesión empieza sin memoria: **lee este archivo primero** y actualízalo al terminar cada episodio.
> Archivos relacionados: `biblioteca.md` (libros y orden) y `programa.md` (plan del mes).

## Estado actual

- **Estado del plan:** **aprobado y en marcha.** El curso completo está en `curso.md` (13 módulos, 48 semanas) y el mes 1 en `programa.md`.
- **Fecha de inicio:** 28-oct-2026 (miércoles). Migue escucha en la tarde.
- **Próximo episodio:** 2, "El trading como competencia: comisiones, spread, slippage, creadores de mercado" (ELD Introducción + [+] microestructura). Regla de Farley: 13.
- **Mezcla de idiomas actual:** 80 % español / 20 % inglés (meses 1-3), ajustada por la prueba A2.
- **Audio, motor oficial (elegido por Migue el 28-oct-2026): edge-tts con voces bilingües.** La misma voz habla español e inglés.
  - Comando: `python .claude/skills/podcast-estudio/scripts/generar_audio.py guion.txt --motor edge --voces "PROFESOR=en-US-AndrewMultilingualNeural,ESTUDIANTE=en-US-AvaMultilingualNeural"`
  - Requisitos: `pip install edge-tts` y el dominio `speech.platform.bing.com` permitido en la red del entorno. El script ya usa el proxy y su CA y reintenta cuando no llega audio.
  - Respaldo si falla Microsoft: Kokoro local (venv de Python 3.12 con torch CPU, kokoro y espeak-ng; voces em_alex/ef_dora y am_michael/af_heart). Script de muestra: `scratchpad/scripts/muestra_kokoro.py`.
  - Las líneas `PAUSA: n` del guion meten n segundos de silencio para repetir (solo con edge).
  - Generar un episodio tarda unos 35 min (muchos turnos cortos): ejecutarlo en segundo plano.

## Datos de Migue (por confirmar)

- Nivel de inglés, en sus palabras: "entiendo si hablan lento, me defiendo en todo pero muy mal". Estudió en el colegio y en cursos sueltos, sin constancia.
- **Prueba de nivel (28-oct-2026): A2 (básico alto).**
  - Vocabulario: 3 de 6 bien (*savings*, *loss*, *bear market*). Falló *borrow*, *earnings* y *hedge*.
  - Gramática: no completó ninguna de las 4 (condicional tipo 1, *present perfect*, pasado simple, comparativo).
  - Lectura: captó la idea general, pero interpretó al revés *"let profits run"*.
  - Escritura: A2-. Le faltan auxiliares (*I studying*), calca el orden del español y mezcla palabras en español.
  - Al parecer dicta por voz: hay errores de transcripción.
- **Gramática a reforzar (repaso de los sábados):** presente simple y continuo con auxiliar, pasado simple, *present perfect*, condicional tipo 1, comparativos.
- Hora del episodio diario: _pendiente_
- Zona horaria: _pendiente (probablemente Colombia, UTC-5)_

## Textos de los libros

- **Completos (14):** en `scratchpad/texto/`. Están en `curso.md` → "Fuentes completas". Se generaron el 27-oct-2026: pdftotext para los PDF con texto y Tesseract OCR (spa) para Murphy y Elder.
- **Parciales (8):** en `scratchpad/texto/parciales/`, solo ~80 páginas. Son González, Villahermosa, Williams, Hagstrom, Buffettología, Attali y los dos de Hormozi. Hace falta que Migue adjunte esos PDF en el chat; desde Drive no se pueden bajar archivos de más de ~6 MB.
- **Riesgo:** el scratchpad es temporal y el repo es **público**, así que los libros completos no pueden ir al repo. Pendiente: que Migue cree un repo **privado** para guardarlos. Si en una sesión nueva faltan los textos, hay que pedir de nuevo los PDF.
- **Carpeta LIBROS en Drive:** id `1WtEkIWyaQNkA10ajXYUQgGnAfdwIxVop`.

## Errores frecuentes de inglés (de las notas)

_Ninguno todavía._

## Registro de episodios

| # | Fecha | Lección | Vocabulario | Nota de Migue | Observaciones |
|---|-------|---------|-------------|---------------|---------------|
| 1 | 28-oct-2026 | Qué es la bolsa y quién juega en ella (LYN I, KOS duros y blandos, ELD suma negativa) | stock, share, index, stock exchange, retail investor, commission, slippage, edge | pendiente | Se corrigió en el audio "tenaces/temblorosos" por "duros/blandos", que es lo que dice KOS. Guion: `podcasts-estudio/ingles-trading/01-que-es-la-bolsa/guion.txt` |
