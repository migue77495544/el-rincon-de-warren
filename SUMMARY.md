# El Rincón de Warren — Resumen de Arquitectura

> **Propósito del documento**: Mapa de contexto para desarrolladores y LLMs.
> Generado como parte de la FASE 1 de la auditoría de código (Octubre 2026).

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript (Vite 6) |
| Estilos | TailwindCSS 4 + CSS tokens (`styles/tokens.css`) |
| Gráficas | `lightweight-charts` (TradingView), `recharts` |
| Iconos | `lucide-react` |
| Animaciones | `motion` (Framer Motion) + `canvas-confetti` |
| Backend | Express 4 (TypeScript con `tsx` runtime) |
| IA | `@google/genai` (Gemini) — Asesores Jairo & Guillermo |
| Motor de datos | Python (yfinance, pandas, numpy) via `child_process` |
| Datos de mercado | Yahoo Finance (yfinance + API directa como fallback) |

---

## 2. Estructura de Directorios (`src/`)

```
src/
├── App.tsx                     (618 líneas)  — Orquestador principal, estado global, pestañas
├── main.tsx                    (11 líneas)   — Punto de entrada React
├── types.ts                    (307 líneas)  — Tipos e interfaces compartidos
├── index.css                   (53 bytes)    — Import de Tailwind base
│
├── components/                 — 25 archivos, ~900 KB total
│   ├── FundamentalEngine.tsx   (3,094 líneas) — MEGA-componente del módulo de análisis
│   ├── CompanyPriceChart.tsx   (1,724 líneas) — Gráfico de cotización con indicadores técnicos
│   ├── FinancialFormulasGuide.tsx (1,386 líneas) — Guía interactiva de fórmulas
│   ├── GamificationHub.tsx     (1,322 líneas) — Hub de gamificación (4 juegos + tesis + liga)
│   ├── RatiosDashboard.tsx     (1,238 líneas) — Dashboard de ratios contables
│   ├── MarkowitzOptimizer.tsx  (~1,050 líneas) — Optimizador de portafolio Markowitz
│   ├── PythonDataConsole.tsx   (~920 líneas)  — Consola de datos Python interactiva
│   ├── MethodologyDocumentation.tsx (~750 líneas) — Documentación metodológica
│   ├── JairoGuillermoConsult.tsx (~680 líneas) — Chat dual con asesores IA
│   ├── WallStreetConsensus.tsx (~690 líneas) — Panel de consenso de analistas
│   ├── ImpactEvaluationDashboard.tsx (~620 líneas) — Dashboard DiD
│   ├── PortfolioSimulator.tsx  (~590 líneas) — Simulador de portafolio
│   ├── SimpleViewMode.tsx      (~560 líneas) — Vista simplificada para principiantes
│   ├── SpotlightSearch.tsx     (~410 líneas) — Buscador tipo Spotlight (Cmd+K)
│   ├── CapmValuationCard.tsx   (~460 líneas) — Tarjeta de valoración CAPM
│   ├── Navbar.tsx              (260 líneas)  — Barra de navegación principal
│   ├── VitalSigns.tsx          (~290 líneas) — Indicadores vitales de la empresa
│   ├── TrackingErrorCard.tsx   (~260 líneas) — Tarjeta de Tracking Error
│   ├── SmartTooltip.tsx        (~140 líneas) — Tooltip inteligente pedagógico
│   ├── concepts.ts            (~450 líneas) — Catálogo de conceptos para tooltips
│   ├── DatabaseAndCodeViewer.tsx (~130 líneas) — Visor SQL/NoSQL/Python/JS
│   ├── InfoTooltip.tsx         (~70 líneas)  — Wrapper de tooltip
│   ├── WarrenFAB.tsx           (~90 líneas)  — Floating Action Button
│   ├── OnboardingFlow.tsx      (~80 líneas)  — Flujo de bienvenida
│   └── InstantFeedbackModal.tsx (~60 líneas) — Modal de retroalimentación
│
├── context/
│   └── ViewModeContext.tsx      (165 líneas)  — Modo Simple vs Analista
│
├── data/
│   ├── initialData.ts          (400 líneas)  — Empresas semilla
│   ├── popularTickersData.ts   (~220 líneas) — Catálogo de tickers populares
│   └── schemasData.ts          (~190 líneas) — Esquemas SQL/NoSQL embebidos
│
├── utils/
│   ├── dualAdvisorEngine.ts    (1,304 líneas) — Motor de IA dual
│   ├── financialCalculations.ts (454 líneas)  — Cálculos de ratios y scoring
│   └── markowitz.ts            (~270 líneas) — Algoritmo de Markowitz
│
├── services/
│   ├── technicalAnalysis.ts    (290 líneas)  — Análisis técnico via Gemini
│   ├── stockDirectory.ts       (~100 líneas) — Directorio de tickers conocidos
│   ├── marketData.ts           (~40 líneas)  — Fetching de precios en vivo
│   ├── companyAnalyzer.ts      (~20 líneas)  — Análisis fundamental
│   └── pythonEngine.ts         (~25 líneas)  — Runner del motor Python
│
├── routes/                     — Rutas Express modulares (NO usadas por server.ts)
│   ├── market.ts               (476 líneas)
│   ├── portfolio.ts            (184 líneas)
│   ├── advisor.ts              (151 líneas)
│   ├── companies.ts            (90 líneas)
│   └── python.ts               (184 líneas)
│
└── styles/
    └── tokens.css              (~110 líneas) — Design tokens CSS
```

---

## 3. Mapa de Vistas / Pestañas y Componentes Clave

```
App.tsx (AppContent) ─── ViewModeProvider
│
├── Tab: "fundamental" ────── FundamentalEngine
│   ├── CompanyPriceChart       (gráfico TradingView con EMAs, RSI, MACD)
│   ├── RatiosDashboard         (dashboard de 11 ratios contables)
│   ├── VitalSigns              (semáforo visual rápido)
│   ├── FinancialFormulasGuide  (guía pedagógica interactiva)
│   ├── WallStreetConsensus     (consenso de analistas Wall Street)
│   ├── CapmValuationCard       (CAPM + costo de capital)
│   ├── TrackingErrorCard       (tracking error vs benchmark)
│   ├── JairoGuillermoConsult   (chat IA dual: fundamental vs técnico)
│   ├── SimpleViewMode          (vista simplificada para principiantes)
│   └── PythonDataConsole       (consola yfinance interactiva)
│
├── Tab: "simulator" ─────── PortfolioSimulator
│   └── MarkowitzOptimizer     (optimización media-varianza)
│
├── Tab: "gamification" ──── GamificationHub
│   ├── Juego 1: Identifica el Moat
│   ├── Juego 2: Margen de Seguridad
│   ├── Juego 3: Markowitz Challenge
│   ├── Juego 4: Sesgos Cognitivos
│   ├── Tesis de Inversión (comunidad + votación)
│   ├── Liga de Value Investors (ranking)
│   └── Ruta de Aprendizaje (8 pasos con XP)
│
├── Tab: "impact" ────────── ImpactEvaluationDashboard
│   └── Regresión DiD (Diferencia-en-Diferencias)
│
└── Tab: "methodology" ───── MethodologyDocumentation

Modales Globales:
├── SpotlightSearch (Cmd+K)
├── PythonDataConsole (consola global)
├── InstantFeedbackModal (alertas de sesgos)
├── WarrenFAB (solo modo Analista)
└── OnboardingFlow (primera visita)
```

---

## 4. Flujo de Datos Principal

```
                    ┌─────────────┐
                    │  Yahoo Fin. │
                    │  (yfinance) │
                    └──────┬──────┘
                           │ Python child_process
                           ▼
┌────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Gemini API │────▶│   server.ts      │◀───▶│  In-Memory DB    │
│ (@google/  │     │   (Express 4)    │     │  companiesDB[]   │
│  genai)    │     │   1,919 líneas   │     │  thesesDB[]      │
└────────────┘     └──────┬───────────┘     │  badgesDB[]      │
                          │ JSON REST       └──────────────────┘
                          ▼
                   ┌──────────────────┐
                   │   React App      │
                   │   (App.tsx)      │
                   │                  │
                   │ Estado Local:    │
                   │ • companies[]    │
                   │ • portfolio{}    │
                   │ • gamification{} │
                   │ • viewMode       │
                   └──────────────────┘
```

### Integraciones API (Backend → Servicios Externos)

| Endpoint | Función | Fuente |
|----------|---------|--------|
| `/api/market/price/:ticker` | Precio en vivo | yfinance / Yahoo Finance |
| `/api/market/price-history/:ticker` | Histórico + indicadores | yfinance + Python |
| `/api/market/import` | Importar empresa nueva | yfinance (financials) |
| `/api/market/sync-prices` | Actualizar precios batch | yfinance batch |
| `/api/market/search` | Búsqueda de empresas | Directorio local + yfinance |
| `/api/python/consulta-dual` | Consulta IA Jairo + Guillermo | Gemini API |
| `/api/python/consulta-jairo` | Consulta solo Jairo | Gemini API |
| `/api/python/consulta-guillermo` | Consulta solo Guillermo | Gemini API |
| `/api/python/technical-patterns` | Patrones técnicos | Gemini API |
| `/api/python/capm/:ticker` | Cálculo CAPM | Python (FRED + Damodaran) |
| `/api/python/tracking-error/:ticker` | Tracking Error | Python (scipy, numpy) |
| `/api/portfolio/analyze` | Análisis de riesgo portafolio | Cálculo local |
| `/api/gamification/motivation` | Índice de Motivación | Cálculo econométrico |

---

## 5. Gestión de Estado

**No hay estado global** (Redux, Zustand). Todo vive en:

1. **`App.tsx`** — Estado centralizado via `useState` con props drilling
2. **`ViewModeContext`** — Context API para modo Simple/Analista
3. **`FundamentalEngine.tsx`** — 13+ hooks de estado interno

---

## 6. Archivos Críticos para Refactorización

### Prioridad Alta

| # | Archivo | Líneas | Problema Principal |
|---|---------|--------|-------------------|
| 1 | `FundamentalEngine.tsx` | **3,094** | Mega-componente: UI + fetch + estado + modales + formulario |
| 2 | `server.ts` | **1,919** | Monolito que duplica código de `routes/` y `services/` |
| 3 | `dualAdvisorEngine.ts` | **1,304** | Catálogo de empresas inline (~500 líneas) + prompts + generación |
| 4 | `CompanyPriceChart.tsx` | **1,724** | Chart config + indicadores + UI de controles mezclados |
| 5 | `GamificationHub.tsx` | **1,322** | 4 juegos + datos estáticos inline + tesis + liga |

### Prioridad Media

| # | Archivo | Líneas | Problema |
|---|---------|--------|---------|
| 6 | `FinancialFormulasGuide.tsx` | 1,386 | Datos de fórmulas (~600 líneas) mezclados con UI |
| 7 | `RatiosDashboard.tsx` | 1,238 | Cálculo de cards + UI de simulador + auditoría |
| 8 | `types.ts` | 307 | Interfaz `TargetConsensus` definida dos veces |

### Ruido / Limpieza Rápida

| Problema | Ubicación |
|----------|-----------|
| `console.log` de depuración | `JairoGuillermoConsult.tsx:528` |
| Carpeta `routes/` no utilizada | `src/routes/` (server.ts define todo inline) |
| `KNOWN_STOCK_DIRECTORY` duplicado | `server.ts` L124-158 y `services/stockDirectory.ts` |
| `analyzeCompany()` duplicado | `server.ts` L101-122 y `services/companyAnalyzer.ts` |
| `fetchLivePrice()` duplicado | `server.ts` L45-99 y `services/marketData.ts` |
| `resolveTicker()` duplicado | `server.ts` L160-181 y `services/stockDirectory.ts` |
| Scripts Python huérfanos | `remove_editor.py`, `remove_editor2.py`, `remove_editor3.py` |