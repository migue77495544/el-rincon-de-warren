# Avance del curso

> Cada sesión empieza sin memoria: **lee este archivo primero** y actualízalo al terminar cada episodio.
> Archivos relacionados: `biblioteca.md` (libros y orden) y `programa.md` (plan del mes).

## Estado actual

- **Estado del plan:** el curso completo está en `curso.md` (13 módulos, 48 semanas). El mes 1 está detallado en `programa.md`. Todo **pendiente de aprobación** de Migue.
- **Fecha de inicio:** por definir. Migue está en semana de finales.
- **Próximo episodio:** 1, "Qué es la bolsa y quién juega en ella" (M1).
- **Mezcla de idiomas actual:** 80 % español / 20 % inglés (meses 1-3), ajustada por la prueba A2.
- **Audio:** no generar episodios hasta que Migue lo pida. **Motor por elegir** entre 3 muestras enviadas el 28-oct-2026:
  1. edge-tts con voces colombianas (es-CO Gonzalo/Salomé para el español, en-US Andrew/Ava para el inglés).
  2. edge-tts con voces bilingües (en-US Andrew/Ava *Multilingual*, la misma voz en los dos idiomas).
  3. Kokoro, local (em_alex/ef_dora para el español, am_michael/af_heart para el inglés). Unas 4 veces más rápido que el tiempo real en CPU.
  - Notas técnicas: la red ya permite huggingface.co y speech.platform.bing.com. edge-tts necesita `proxy=HTTPS_PROXY` y la CA `/root/.ccr/ca-bundle.crt`. Kokoro se instala en un venv de Python 3.12 (`uv venv -p python3.12`; en 3.13 falla la compilación de blis), con torch CPU y espeak-ng. No hay GEMINI_API_KEY.

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
| — | — | — | — | — | — |
