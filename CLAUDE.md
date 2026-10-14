# El Rincón de Warren

Plataforma educativa de Value Investing para pequeños inversores: análisis fundamental, simulador de carteras (Markowitz), gamificación conductual y evaluación de impacto DiD. SPA React servida por un único servidor Express que delega datos de mercado y cálculo cuantitativo en un motor Python y la IA en Gemini.

## Stack y comandos

- **Frontend:** React 19 + TypeScript 5.8, Vite 6, TailwindCSS 4, `lightweight-charts`, `recharts`, `lucide-react`, `motion`.
- **Backend:** Express 4 en `server.ts` (ejecutado con `tsx`), puerto fijo **3000**; en dev monta Vite como middleware.
- **Python 3.12:** `python/finance_engine.py` (yfinance, pandas, numpy, matplotlib, seaborn, `ta`, `google-genai`, `python-dotenv`). No hay `requirements.txt`; instalar con pip a mano.
- **IA:** `@google/genai` (Gemini). Requiere `GEMINI_API_KEY` en `.env` (se carga con `dotenv/config`; el README dice `.env.local`, pero no es lo que lee el servidor).

```
npm install
npm run dev      # tsx server.ts → http://localhost:3000 (API + frontend)
npm run lint     # tsc --noEmit — única verificación; no hay tests
npm run build    # vite build + esbuild → dist/server.cjs
npm start        # node dist/server.cjs (requiere NODE_ENV=production)
python python/finance_engine.py test          # comprueba librerías Python
python python/finance_engine.py price AAPL    # probar un comando del motor
```

`npm run clean` usa `rm -rf` (falla en PowerShell).

## Estructura

```
server.ts                  Monolito Express (~1.900 líneas): TODOS los endpoints /api/* + BD en memoria
python/finance_engine.py   Motor CLI (~3.600 líneas): `<comando> <args>` → JSON por stdout
python/cache/              Caché Damodaran/FRED (betas, ERP, DGS10)
python/data/               Perfiles de los asesores Jairo y Guillermo (prompts)
src/App.tsx                Orquestador: estado global con useState + pestañas
src/types.ts               Tipos compartidos (CompanyAnalysis, FinancialRawData…)
src/components/            Componentes; subcarpetas chart/, fundamental/, gamification/, formulas/
src/context/               ViewModeContext (modo Simple vs Analista)
src/data/                  Datos semilla, catálogos, prompts, fórmulas
src/utils/                 financialCalculations.ts, markowitz.ts, dualAdvisorEngine.ts (fallback sin IA)
src/services/, src/routes/ Extracción modular de server.ts — NO importados por server.ts (código muerto/duplicado)
SUMMARY.md                 Mapa de arquitectura detallado y deuda técnica
DOCUMENTACION_TECNICA_Y_METODOLOGICA.md   Metodología financiera
```

Pestañas: `fundamental` (FundamentalEngine), `simulator` (PortfolioSimulator + MarkowitzOptimizer), `gamification`, `impact` (DiD), `methodology`.

## Reglas de código

- TypeScript ESM, componentes funcionales con hooks, comillas simples, punto y coma, indentación de 2 espacios. Alias `@/` = raíz del proyecto.
- Estilos con clases Tailwind y tokens de `src/styles/tokens.css`; iconos solo de `lucide-react`.
- Sin Redux/Zustand: estado en `App.tsx` pasado por props; solo el modo de vista usa Context.
- UI, comentarios, mensajes de error y nombres de dominio en **español** (`nombre`, `descripcion`, `pregunta`); identificadores técnicos en inglés.
- Endpoints nuevos: añadirlos en `server.ts` (no en `src/routes/`). Si se toca lógica duplicada en `src/services/` o `src/routes/`, la copia que cuenta es la de `server.ts`.
- La BD es en memoria (`companiesDB`, `thesesDB`, `badgesDB`): se reinicia con el servidor.

## Integración de APIs

- **No se usa FMP** ni ninguna API financiera de pago o con clave. Fuentes: Yahoo Finance (yfinance), Damodaran (betas, ERP, ratios sectoriales) y FRED `DGS10` (tasa libre de riesgo).
- El frontend solo llama a `/api/*` con `fetch` relativo; nunca a servicios externos ni con claves. `GEMINI_API_KEY` vive solo en el servidor.
- Datos de mercado: `runPythonEngine([comando, ...args])` (`execFile`, timeout 30 s, salida JSON). El script Python debe imprimir **solo JSON** por stdout.
- Patrón obligatorio de degradación: motor Python → fallback directo a `query1.finance.yahoo.com` (con `User-Agent`) → datos locales. Los endpoints responden `{ success, ... , source }` y nunca deben dejar la UI sin respuesta.
- Tickers: normalizar con `resolveTicker()`; Yahoo usa guion (`BRK.B` → `BRK-B`).
- Gemini: cadena de modelos con fallback (`gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-flash-latest`); si no hay clave o falla, usar el motor local `dualAdvisorEngine.ts` y marcar `source: 'motor-analitico'` en lugar de `'gemini-live'`.
- Asesores Jairo/Guillermo: los prompts de sistema viven en `finance_engine.py` (`construir_prompt_jairo/guillermo`, `REGLAS_RESPUESTA_ASESOR`, `MODELOS_ASESORES`) más `python/data/perfil_*.txt`. El contexto de datos lo arman `calcular_valoracion` (múltiplos, ROIC, WACC, DCF) y `obtener_contexto_tecnico`. Python devuelve `source`; los logs van por stderr (`_log`), nunca por stdout.
- Respuestas de los asesores en español neutro y texto plano (sin Markdown: la UI no lo renderiza); siglas financieras estándar permitidas (`REGLA_DE_ORO_IDIOMA`).
- En `JairoGuillermoConsult.tsx` cada asesor tiene su propio estado (`chats[advisor]`); una consulta puntual nunca debe escribir en la tarjeta del otro.
- Al invocar Python con texto o IA, pasar `PYTHONIOENCODING: 'utf-8'` y `GEMINI_API_KEY` en `env`.
