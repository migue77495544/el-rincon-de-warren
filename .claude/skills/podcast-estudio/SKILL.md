---
name: podcast-estudio
description: Convierte material de clase (PDF, Word, diapositivas, fotos de apuntes, texto) en un podcast de estudio en audio MP3 con dos voces. Úsala cuando el usuario pida un podcast, un audio para repasar, "escuchar los apuntes", un episodio de estudio, o escriba /podcast-estudio con archivos adjuntos.
---

# Podcast de estudio

Objetivo: que el usuario pueda estudiar escuchando (en el bus, con un solo audífono, entre clases). El valor está en el **guion**: fiel a sus apuntes, con la duración que pide y pensado para el oído. La voz es solo el último paso.

## Flujo

### 1. Entender el encargo

Saca de la petición (pregunta solo lo que falte y sea imprescindible):

- **Material**: archivos o texto. Sin material no hay episodio; no inventes temario.
- **Duración objetivo**: por defecto 20 minutos por episodio.
- **Estilo**: por defecto `PROFESOR` (explica) y `ESTUDIANTE` (pregunta, se equivoca, resume). Otros: un solo narrador, entrevista, repaso exprés antes del examen.
- **Enfoque**: examen, comprensión general, solo fórmulas, un tema concreto.

### 2. Leer TODO el material

- PDF: léelo con Read (por páginas si es largo) o `pdftotext -layout archivo.pdf -`. Imágenes y diapositivas: léelas con Read.
- Construye un **mapa de contenido**: cada concepto, definición, fórmula y ejemplo con su ubicación (página o diapositiva). Este mapa decide qué entra en el guion; no te saltes nada relevante.

### 3. Planificar episodios

- Español hablado ≈ **150 palabras por minuto**: 20 min ≈ 3.000 palabras de guion.
- Si el material no cabe en la duración pedida, **divide en episodios** ("parte 1 de 3") en vez de recortar. Si sobra duración, profundiza con ejemplos, no rellenes.
- Comunica el plan en una línea antes de escribir (p. ej. "Son 3 episodios de unos 20 min: 1) …, 2) …, 3) …").

### 4. Escribir el guion

Sigue `references/guion.md` (estructura, reglas para el oído, fidelidad). Formato del archivo, que el script de audio entiende:

```
# Título del episodio (las líneas con # no se leen)
PROFESOR: Texto que dice el profesor.
ESTUDIANTE: Texto que dice el estudiante.
```

- Máximo **dos** hablantes por episodio (límite del motor de diálogo de Gemini).
- Texto plano: nada de Markdown, viñetas, tablas ni emojis dentro de los turnos.
- Guarda en `podcasts-estudio/<asignatura>/<NN-titulo-corto>/guion.txt` dentro del directorio de trabajo, salvo que el usuario indique otra ruta.

### 5. Verificar fidelidad

Relee el guion contra el mapa de contenido:

- Cada definición, cifra y fórmula coincide con la fuente.
- Lo que no viene de los apuntes (un ejemplo propio, una analogía) se marca en el propio diálogo ("esto no está en tus apuntes, pero ayuda a verlo…").
- Si la fuente es ambigua o parece tener un error, dilo en el guion y anótalo para el usuario.

### 6. Generar el audio

```
python .claude/skills/podcast-estudio/scripts/generar_audio.py RUTA/guion.txt
```

- Crea `episodio.mp3` junto al guion. Opciones útiles: `--salida`, `--motor gemini|edge`, `--voces "PROFESOR=Charon,ESTUDIANTE=Kore"`, `--estilo "…"`, `--simular` (prueba el proceso sin llamar a ningún motor, genera silencio).
- Motor por defecto: **Gemini TTS** (diálogo nativo a dos voces). Necesita `GEMINI_API_KEY` en el entorno o en `.env`. Plan B gratuito: `--motor edge` (requiere `pip install edge-tts`).
- El script divide el guion en bloques, reintenta errores temporales y une todo con ffmpeg. Tarda: avisa al usuario y ejecútalo en segundo plano si el guion es largo.
- Si falla por clave ausente o por red bloqueada, explica la causa exacta (qué variable o qué dominio) y entrega el guion igualmente; nunca presentes un audio simulado como real.

### 7. Entregar

- Envía el MP3 al usuario (SendUserFile si existe) y, si lo pide o tiene Google Drive conectado y le viene bien, súbelo a una carpeta "Podcasts de estudio" para escucharlo en el móvil.
- Junto al audio: duración real, lista de capítulos con minuto aproximado y los **puntos a revisar** del paso 5.
- Ofrece el siguiente episodio si hay más partes.
