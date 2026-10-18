# El Rincón de Warren

Plataforma educativa de Value Investing para pequeños inversores: análisis fundamental, simulador de carteras (Markowitz), gamificación conductual y evaluación de impacto DiD. SPA React + API Express escrita en TypeScript. Se despliega en **Netlify**: frontend estático en `dist/` y toda la API `/api/*` en una función serverless. **No hay Python**: el motor de datos (antes `python/finance_engine.py`) está portado a `server/engine/`.

## Stack y comandos

- **Frontend:** React 19 + TypeScript 5.8, Vite 6, TailwindCSS 4, `lightweight-charts`, `recharts`, `lucide-react`, `motion`.
- **API:** Express 4 en `server/app.ts`. En local la sirve `server.ts` (puerto **3000**, Vite como middleware); en Netlify, `netlify/functions/api.mts` (serverless-http).
- **Datos de mercado:** `yahoo-finance2` (Yahoo Finance), Damodaran (HTML) y FRED `DGS10` (CSV), todo desde Node.
- **IA:** `@google/genai` (Gemini). `GEMINI_API_KEY` en `.env` en local y en las variables de entorno del sitio en Netlify.
- **Persistencia:** `server/store.ts` → Netlify Blobs en Netlify; ficheros JSON en `.data/` en local.

```
npm install
npm run dev               # tsx server.ts → http://localhost:3000 (API + frontend)
npm run lint              # tsc --noEmit — única verificación; no hay tests
npm run build:netlify     # vite build (lo que ejecuta Netlify; la función la empaqueta Netlify)
npm run build && npm start   # servidor Node autónomo (build/server.cjs + dist/)
npm run datos:referencia  # regenera server/data/damodaran-snapshot.json (copia de respaldo)
npx netlify-cli build --offline   # reproduce la compilación de Netlify en local
```

## Estructura

```
server/app.ts              Toda la API /api/* (Express). Endpoints nuevos: aquí
server/engine/             Motor de datos y cálculo (sustituye a finance_engine.py)
  yahoo.ts                 Cliente Yahoo: info (quoteSummary), estados financieros, histórico, noticias
  company.ts               Ficha fundamental (ratios, DuPont, valoración, DCF, consenso)
  market.ts                Cotización, velas + EMA/RSI/MACD, objetivos, recomendaciones, noticias
  quant.ts                 Markowitz, tracking error, VaR/CVaR (normal, EWMA, Random Forest OOB)
  damodaran.ts             Betas, ROE/PER/PBV sectoriales, ERP implícito, DGS10
  industry.ts              Industria Yahoo → Damodaran (mapeo + difflib + Gemini)
  advisors.ts              Asesores Jairo/Guillermo (Gemini + motor local de respaldo)
  scanner.ts               Escáner de Superoportunidades por tandas
  charts.ts                Gráficos SVG (data URL) que antes generaba matplotlib
server/store.ts            Almacén persistente + caché de dos niveles (memoria + Blobs)
server/data/               Perfiles de asesores y copias de respaldo (Damodaran, escaneo)
netlify/functions/api.mts  Función de Netlify (envuelve server/app.ts)
netlify.toml               Build, redirecciones /api/* → función y cabeceras de caché
src/App.tsx                Orquestador: estado global con useState + pestañas (secciones con React.lazy)
src/components/            Componentes; subcarpetas chart/, fundamental/, gamification/, formulas/, learn/
src/components/learn/      Ruta de Aprender tipo Duolingo: RutaAprendizaje, LeccionPlayer, Ejercicios, VideoEmbed
src/components/SpotlightSearch.tsx  Buscador único de empresas (lupa de la barra superior; se abre con abrirBuscador())
src/data/rutaAprendizaje.ts  Unidades, lecciones, ejercicios y los 15 videos de YouTube (verificados con oEmbed)
src/utils/                 financialCalculations.ts, markowitz.ts, dualAdvisorEngine.ts (respaldo sin IA), api.ts
python/                    Motor anterior (ya no se usa; referencia histórica)
src/services/, src/routes/ Código muerto de una extracción antigua — no se importa
```

## Reglas de código

- TypeScript ESM, componentes funcionales con hooks, comillas simples, punto y coma, indentación de 2 espacios. Alias `@/` = raíz del proyecto.
- Estilos con clases Tailwind y tokens de `src/styles/tokens.css`; iconos solo de `lucide-react`.
- Sin Redux/Zustand: estado en `App.tsx` pasado por props; solo el modo de vista usa Context.
- UI, comentarios, mensajes de error y nombres de dominio en **español**; identificadores técnicos en inglés.
- Endpoints nuevos en `server/app.ts`. Nada de `child_process` ni Python: Netlify Functions solo ejecuta Node.
- Secciones o paneles pesados nuevos: cargarlos con `React.lazy` como los existentes.
- Buscar o cambiar de empresa se hace solo con la lupa de la barra superior; no añadas buscadores ni selectores de empresa dentro de las páginas (usa `abrirBuscador()` de `src/utils/events.ts`).
- Videos nuevos de la Academia: comprueba que existen y se pueden insertar con `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json` (200).

## Límites de Netlify

- Cada petición a la función dura como máximo **60 s**. El motor se corta a 30 s (`ENGINE_TIMEOUT_MS`), los asesores a 50 s y el cliente espera 35 s (58 s en asesores). Mantén ese orden.
- Las instancias no comparten memoria: todo lo que deba sobrevivir (catálogo, tesis, cachés, progreso del escáner) va por `server/store.ts`.
- Trabajos largos se trocean (ver `scanner.ts`: cada sondeo de la UI avanza una tanda).

## Integración de APIs

- **No se usa FMP** ni APIs de pago. Fuentes: Yahoo Finance (`yahoo-finance2`), Damodaran (betas, ERP, múltiplos sectoriales) y FRED `DGS10`.
- El frontend solo llama a `/api/*` con `fetch` relativo; nunca a servicios externos ni con claves. `GEMINI_API_KEY` vive solo en el servidor.
- Degradación: dato en vivo → caché persistente → copia de respaldo en `server/data/`. Los endpoints responden `{ success, ..., source }`; nunca se inventan cifras (sin cobertura de analistas no hay objetivo).
- Tickers: `resolveTicker()` en `server/app.ts`; Yahoo usa guion (`BRK.B` → `BRK-B`, ver `yahooSymbol`).
- Gemini: cadena de modelos (`MODELOS_ASESORES` en `server/engine/gemini.ts`); plazo mínimo por modelo de 10 s. Si no hay clave o falla, motor local `dualAdvisorEngine.ts` y `source: 'motor-analitico'`.
- Asesores: prompts en `server/engine/advisors.ts` y perfiles en `server/data/perfiles.ts`. Respuestas en español neutro y texto plano (sin Markdown).
- En `JairoGuillermoConsult.tsx` cada asesor tiene su propio estado (`chats[advisor]`); una consulta puntual nunca escribe en la tarjeta del otro.
