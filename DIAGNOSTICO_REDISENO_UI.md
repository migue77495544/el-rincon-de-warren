# El Rincón de Warren: diagnóstico y plan de rediseño de la interfaz

Documento de traspaso para continuar el trabajo en otra conversación. Fecha: 17 de octubre de 2026.

---

## 1. Contexto del proyecto

- **Qué es:** plataforma educativa de value investing para pequeños inversores principiantes. Incluye análisis fundamental, simulador de carteras (Markowitz), gamificación y evaluación de impacto (diferencias en diferencias).
- **Stack:**
  - SPA en React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4; iconos solo de `lucide-react`; gráficos con `lightweight-charts` y `recharts`.
  - API en Express (`server/app.ts`), desplegada como función de Netlify.
  - No hay Python: el motor de datos está en `server/engine/`.
- **Carpeta:** `C:\Users\PC\antigravity\El-Rincón-de-Warren-2026-09-25-12862`. Rama `feat/netlify-sin-python`.
- **Comandos:**
  - `npm run dev` arranca en http://localhost:3000.
  - `npm run lint` (`tsc --noEmit`) es la única verificación: no hay tests.
  - `npx vite build` comprueba que compila.
- **Reglas del proyecto** (están en `CLAUDE.md`):
  - Interfaz, comentarios y textos en español; identificadores técnicos en inglés.
  - Comillas simples, punto y coma, 2 espacios.
  - Estado en `App.tsx` pasado por props; nada de Redux ni Zustand.
  - Secciones pesadas cargadas con `React.lazy`.
  - El frontend solo llama a `/api/*`.
  - No tocar `server/` ni la API en el trabajo de interfaz.
  - Nunca inventar cifras: sin cobertura de analistas no hay objetivo.

### Estado de Git
- **Último commit:** `6b1dbbd Migrar el backend a Netlify Functions sin Python`. Contiene versiones anteriores de `Navbar.tsx`, `SimpleViewMode.tsx` e `index.css`.
- **Sin commit:** la mayor parte del rediseño descrito en la sección 3 (unos 50 archivos con cambios). Incluye la eliminación de `src/components/OnboardingFlow.tsx`, que aparece como borrado sin preparar (` D`).

---

## 2. Lo que pidió el usuario (en orden)

1. Que la interfaz no parezca hecha por IA, con aspecto profesional. Debía usar la skill `.claude/skills/frontend-design` y conservar la identidad «libro de cuentas»:
   - fondo de papel verdoso `#F5F7F3`;
   - acento latón `#7C5617`;
   - tipografías Source Serif 4 y Public Sans.
2. Priorizar a los principiantes, que «se embalan y se enredan»: al entrar deben entender qué hacer y completar la tarea principal, que es elegir una empresa y entender si es buena inversión.
3. Que el diseño no sea «plano y aburrido»: jerarquía, contraste y un punto memorable.
4. Que sea explicativo: cada cifra debe decir en lenguaje llano qué significa y si es buena o mala, en contexto y sin muros de texto.
5. **Petición actual, pendiente de aprobar el plan:** un rediseño inspirado en Simply Wall St, Duolingo y Airbnb sin tocar la lógica financiera. Detalle en la sección 5.

Skills disponibles en `.claude/skills` (origen y licencias en `FUENTES.md`):
- `frontend-design`
- `design-ux` (auditoría de usabilidad)
- `nielsen-heuristics-audit`
- `onboarding-cro`
- `wcag-accessibility-audit`

---

## 3. Lo que ya está hecho (sin commit)

### 3.1 Sistema visual global
- **Tamaños de texto:** los de 9–11 px pasan a 12 px (431 casos).
- **Pesos:** `font-black`/`font-extrabold` pasan a `font-semibold` (104 casos).
- **Mayúsculas:** se quitaron las mayúsculas forzadas y el tracking ancho (193 casos).
- **Radios con jerarquía**, definidos en el `@theme` de `src/index.css`: secciones 10 px (`rounded-2xl`), bloques interiores 6 px (`rounded-lg`), controles 5 px.
- **Superficies planas:**
  - Sin sombras decorativas: solo los modales y menús flotantes tienen profundidad.
  - Sin degradados ni manchas difuminadas.
  - Las utilidades heredadas `glass`, `ink-panel`, `press` y `hover-lift` se mantienen por nombre, pero ahora son planas.
- **Cifras:**
  - Nueva utilidad `cifra`: serif con números de ancho fijo para las cifras clave.
  - La clase `.font-mono` ahora pinta Public Sans tabular; la monoespaciada queda solo para código.
- **Accesibilidad:**
  - Foco visible en latón en todos los controles.
  - `MotionConfig reducedMotion="user"` en `App.tsx`; `Reveal` ya no anima.
  - El gris `text-slate-400` (`#8F9890`) pasa a `text-slate-500` (`#687169`) por contraste.
- **Limpieza de ruido:**
  - Fuera los sellos de marketing («Motor Graham & Buffett», «100 % Conforme», «Módulo N»), los emojis y las «→» de los botones.
  - Unos 45 títulos inflados reescritos en frases cortas en minúscula.
- **Tema claro en todas las secciones:** el Simulador y Markowitz estaban enteros en tema oscuro y se pasaron a la hoja clara. Las cabeceras de Impacto y Metodología también son claras.

### 3.2 Navegación
- **`Navbar.tsx`:**
  - Las pestañas van en la misma fila solo desde 1280 px; por debajo pasan a una segunda fila desplazable.
  - El selector Simple/Analista nunca se encoge, así que no se corta.
  - En móvil, la ayuda se abre desde un botón de la barra.
- **Nuevo `src/components/ui/ScrollRail.tsx`:** carril horizontal que difumina el borde y muestra una flecha donde hay más opciones. Se usa en la barra superior, en las subpestañas de la ficha y en los filtros.
- **`WarrenFAB.tsx`:** oculto por debajo de 640 px (se abre con el evento `OPEN_HELP_EVENT`); con `aria` y cierre con Escape.

### 3.3 Ficha de empresa
- **`FundamentalEngine.tsx`, cabecera en modo Analista:**
  - Hoja blanca con el nombre en serif.
  - Cifras en fila: cotización, Score S(a), potencial según analistas y foso, cada una con una lectura en lenguaje llano debajo.
  - Veredicto calculado con los datos de la ficha.
- **Nuevo `src/utils/verdict.ts`:**
  - `deriveVerdict()` sustituye al texto fijo `warrenVerdict` de los datos semilla, que contradecía los datos vivos.
  - `plainVerdict()` da el veredicto para principiantes:
    - titular, por ejemplo «Buena empresa, pero hoy no está barata»;
    - el porqué;
    - qué haría un inversor value, con el precio de compra que deja un colchón del 15 % frente al objetivo de analistas.
- **`CompanyPriceChart.tsx`:**
  - En Simple solo dibuja el precio y la línea del objetivo de analistas, que entra en la escala.
  - Selector de periodo: 6 meses, 1 año y 5 años.
  - EMA, RSI, MACD y volumen solo aparecen en Analista.
  - Colores de la paleta del sistema.
- **`RatiosDashboard.tsx` y `fundamental/DimensionRatiosPanel.tsx`:** reescritos. Primero se ve valor, semáforo y umbral, más una frase llana (`heuristicSimple`). La fórmula, los umbrales y el simulador aparecen al desplegar (con `aria-expanded`).

### 3.4 Modo Simple para principiantes (`SimpleViewMode.tsx`)
- **Fuera el modal de bienvenida:** `OnboardingFlow.tsx` está borrado. En su lugar hay «Primeros pasos» dentro de la página, con tres pasos que se marcan solos:
  1. Elegir una empresa.
  2. Leer la respuesta.
  3. Abrir «¿Qué significa?» en alguna cifra.
- **Bloque «¿Es buena inversión hoy?»:** titular en el color del semáforo, porqué, qué haría un inversor value y dos cifras («La empresa», con la nota, y «El precio»).
- **Regla del margen de seguridad (el punto memorable):** el precio de hoy situado entre «con colchón» y «analistas», sobre una franja barata / precio justo / cara.
- **Cuatro preguntas con respuesta Sí / Regular / No:**
  - ¿Gana mucho con el dinero de sus dueños? (ROE)
  - ¿Rinde más de lo que le cuesta su dinero? (ROE frente a coste del capital)
  - ¿Puede pagar sus deudas sin apuros? (liquidez y deuda)
  - ¿Tiene algo que la proteja de la competencia? (foso)
- **Definiciones a un toque:** cada pregunta lleva «¿Qué significa?», que se despliega sin depender del ratón.
- **Menos opciones en Simple:**
  - Fuera el bloque de consenso de Wall Street, que repetía el margen.
  - Los asesores quedan plegados.
  - Fuera las fichas de tickers y el botón «Añadir».
  - El selector de empresa solo aparece en móvil.
- **Lista de empresas:** titulada «Elige una empresa», con la nota y una palabra (A muy buena, B buena, C regular, D/F débil). Las filas son botones accesibles.

**Verificado:** lint y build pasan. Revisado en el navegador a 1366 px y a 375 px en Simple y Analista, sin scroll horizontal. Probado con BRK.B, KO y HYPE.

**Sin verificar:**
- Oportunidades con datos cargados.
- Los juegos de Aprender en detalle.
- Los modales (`QuickInspectModal`, `CustomCompanyModal`), revisados solo en el código.
- La auditoría de usabilidad la hizo la misma sesión que construyó la interfaz; la skill `design-ux` pide un juez independiente.

---

## 4. Auditoría de primer uso (design-ux + Nielsen)

| # | Heurística | Hallazgo | Gravedad (0-4) | Estado |
|---|---|---|---|---|
| 1 | Ayuda / reconocimiento | La bienvenida era un modal de 3 diapositivas sobre «modos» que no llevaba a la tarea. | 3 | Resuelto: primeros pasos dentro de la página. |
| 2 | Lenguaje del usuario | El veredicto decía «S(a) 85/100» y no respondía a «¿la compro?». | 4 | Resuelto: `plainVerdict()`. |
| 3 | Minimalismo | Simple apilaba catálogo con importación, selector duplicado, consenso con 3 pestañas, asesores con dos chats… | 3 | Resuelto. |
| 4 | Reconocimiento | Las definiciones dependían del hover («Pasa el cursor…»), que no existe en móvil. | 3 | Resuelto: «¿Qué significa?» a un toque. |
| 5 | Lenguaje | Jerga (ROE, Ke, «+7,3 pts», «2,75x») con el número antes que su significado. | 3 | Resuelto: preguntas con Sí/No. |
| 6 | Estado / consistencia | Número suelto (85) en la lista, sin etiqueta; filas como `div` sin teclado. | 2 | Resuelto. |
| 7 | Estética | Todo pesaba igual. | 2 | Resuelto: regla del margen. |
| 8 | Móvil | Se entraba directo a BRK.B y cambiar de empresa exigía descubrir «Catálogo». | 2 | Resuelto: selector visible y primeros pasos. |

---

## 5. Petición actual: rediseño inspirado en Simply Wall St, Duolingo y Airbnb

### 5.1 Requisitos del usuario
- Investigar en la web los tres referentes y presentar un plan antes de escribir código.
- **Inicio al estilo Airbnb:** cabecera con un buscador prominente («Busca una empresa o ETF para analizar su Margen de Seguridad»).
- **Ficha al estilo Simply Wall St:** indicador prominente del margen de seguridad (valor intrínseco frente a precio) y tarjetas por pilares (Valoración, Salud financiera, Foso económico).
- **Indicadores al estilo Duolingo:** convertir métricas complejas (PER, FCF yield, deuda) en un «Puntaje de Calidad Warren» de 0 a 100, con barras de progreso en código de colores, tooltips y microinteracciones.
- **Estética:** moderna y limpia, tipografía grande, bordes redondeados suaves, mucho espacio y buen contraste; modo claro/oscuro «si aplica».
- **Restricciones críticas:**
  - No modificar la lógica de cálculo (DCF, múltiplos, llamadas a API, estructuras de datos).
  - Tocar solo vistas, componentes, CSS y layout.
  - El proyecto debe seguir compilando.

### 5.2 Investigación (resumen)
- **Simply Wall St:**
  - El «Snowflake» es un radar de 5 ejes (valoración, crecimiento futuro, rendimiento pasado, salud financiera y dividendo).
  - Cada eje se puntúa con 6 comprobaciones de sí o no (de 0 a 6).
  - La página de valoración compara el precio con el valor estimado por DCF.
  - La de salud financiera muestra «5/6 comprobaciones», cada una explicada en una frase.
  - La propia empresa avisa de que no es una señal de compra.
- **Duolingo:**
  - Barras de progreso por tema y por lección; los usuarios las prefieren, junto con los logros, a los puntos.
  - Muestra logros conseguidos, en curso y futuros.
  - Corrige los errores con suavidad y celebra lo conseguido.
- **Airbnb:**
  - El buscador va primero, con forma de píldora y siempre visible en móvil.
  - Un único color de acento sobre superficies planas y grises; mucho espacio en blanco y una cuadrícula predecible.
  - Títulos contenidos, de 22–28 px.

Fuentes:
- [Simply Wall St: cómo funciona el Snowflake](https://support.simplywall.st/hc/en-us/articles/360001740916-How-does-the-Snowflake-work)
- [Simply Wall St: valoración de SNOW](https://www.simplywall.st/stocks/us/software/nyse-snow/snowflake/valuation)
- [Simply Wall St: salud financiera de SNOW](https://www.simplywall.st/stocks/us/software/nyse-snow/snowflake/health)
- [Reseña de Simply Wall St (QuantRoutine)](https://quantroutine.com/tools/simply-wall-st/)
- [Usabilidad de Duolingo (uxdesign.cc)](https://uxdesign.cc/duolingos-usability-analyzed-6bb44b0f2366)
- [Duolingo y el ritual (Thinkable)](https://thinkableletters.substack.com/p/duolingo-turned-repetition-into-ritual)
- [Gamificación y experiencia de usuario (uxdesign.cc)](https://uxdesign.cc/use-some-gamification-to-increase-user-experience-and-engagement-9ff104c22096)
- [Análisis de la portada de Airbnb (Landing Doctors)](https://landingdoctors.com/es/teardowns/airbnb-com)
- [Sistema de diseño de Airbnb (getdesign.md)](https://getdesign.md/design-md/airbnb/preview.html)
- [Booking frente a Airbnb en móvil (GoodUI)](https://goodui.org/blog/comparing-bookings-vs-airbnbs-mobile-homepage-ui/)

### 5.3 Diagnóstico técnico para esta petición
- **Dónde está la vista:**
  - `src/App.tsx` orquesta las pestañas.
  - `src/components/FundamentalEngine.tsx` contiene el catálogo y la ficha: modo Simple hacia la línea 527 y modo Analista después.
  - `SimpleViewMode.tsx` es la ficha para principiantes.
  - `RatiosDashboard.tsx` y `DimensionRatiosPanel.tsx` son los ratios en Analista.
  - `CompanyPriceChart.tsx` es la cotización.
- **Cálculos, que no se tocan:**
  - `src/utils/financialCalculations.ts` (`calculateFundamentalRatios`, `calculateLinearScore`);
  - `server/engine/*` (DCF en `server/engine/company.ts`, función `calcularValoracion`).
- **El DCF y el FCF yield ya se calculan, pero ninguna vista los muestra:**
  - `GET /api/python/company/:ticker` devuelve `valoracion` con `dcf.valorPorAccion`, `dcf.valorVsPrecioPct`, `fcfYieldPct`, `perTrailing`, `perForward`, `evEbitda`, `deudaNetaEbitda`, `roicPct`, `kePct`, `waccPct`…
  - El tipo `CompanyAnalysis` del catálogo no guarda `valoracion`.
  - Para mostrarlos sin tocar la lógica, la ficha puede llamar a ese endpoint desde la vista, que ya existe.
- **Sin DCF para financieras:** el motor no lo calcula para ellas (por ejemplo BRK.B). Ahí hay que comparar con el objetivo de analistas (`targetConsensus.target_mean`) e indicar siempre de qué fuente sale la cifra.
- **El Puntaje Warren de 0 a 100 ya existe:** es el Score S(a) (`linearScore`, nota `scoreGrade`). Pondera liquidez 20 %, solvencia 25 %, rentabilidad 25 % y valoración 30 %, y cada dimensión tiene su puntuación de 0 a 100 en `company.dimensiones.*.score`. Se puede renombrar en pantalla sin cambiar la fórmula.
- **Los ratios ya traen su semáforo:** `company.ratios.<clave>` incluye `value`, `formatted`, `status` (green/yellow/red), `benchmark`, `explanation` y `heuristicSimple`. Sirven para las «N de M comprobaciones» de cada pilar.
- **No hay ETF:** el motor analiza empresas a partir de su balance, y un ETF no lo tiene. El buscador no debe prometer ETF.
- **Modo oscuro:** todas las familias de color de Tailwind están reasignadas a la paleta clara en el `@theme` de `index.css`. Hacer un modo oscuro bien requiere una pasada propia.

### 5.4 Plan propuesto (pendiente de aprobación)
1. **Inicio al estilo Airbnb** (pestaña Empresas): cabecera aireada con un buscador grande en forma de píldora.
   - Texto del buscador: «Busca una empresa para ver su margen de seguridad».
   - Sugerencias como tarjetas de empresa: nota, precio y una palabra («barata», «justa», «cara»).
   - Usa la búsqueda e importación que ya existen en `FundamentalEngine`.
2. **Ficha al estilo Simply Wall St:**
   - Barra del margen de seguridad como protagonista: precio frente al valor DCF cuando exista; si no, frente al objetivo de analistas, indicando la fuente.
   - Diagrama de cuatro ejes con las dimensiones del Score (liquidez, solvencia, rentabilidad y valoración), en SVG propio. Inspirado en el de Simply Wall St, pero sin copiar su forma ni su nombre.
   - Tarjetas por pilar (Valoración, Salud financiera, Rentabilidad, Foso económico), cada una con «N de M comprobaciones» y una frase por comprobación.
3. **Indicadores al estilo Duolingo:**
   - «Puntuación Warren» de 0 a 100 en grande, con una barra por dimensión en código de color.
   - Ayuda que se abre con un toque o con el teclado.
   - Animación breve al rellenarse, que respeta la opción de movimiento reducido.
   - «Primeros pasos» convertidos en una barra de progreso con logros.
4. **Estilo general:** más aire, tipografía grande, radios suaves y alto contraste, manteniendo la identidad: papel verdoso, latón, Source Serif 4 y Public Sans.
5. **Verificación:** `npm run lint`, `npx vite build` y revisión en el navegador a 1366 px y a 375 px, en modo Simple y Analista.

**Decisiones propuestas al usuario, sin confirmar:**
- Mantener la identidad visual: lo «moderno» se consigue con espacio, escala y radios, no cambiando la paleta.
- Dejar el modo oscuro para una pasada propia.
- No anunciar ETF en el buscador.

---

## 6. Avisos para quien continúe

- **Editar desde Git Bash en Windows:** desactiva la conversión de rutas con `export MSYS_NO_PATHCONV=1`. Si no, los argumentos que empiezan por `/` o `</` se convierten en rutas.
- **Saltos de línea:** muchos archivos usan CRLF. Los scripts que editan deben conservarlos; las sustituciones que borran líneas pueden dejar retornos de carro sueltos.
- **Reinicio de la ficha Simple:** `SimpleViewMode` se vuelve a montar cada vez que se carga otra empresa (`isCompanyLoading` en `FundamentalEngine`). El estado que deba sobrevivir va fuera del componente; así se hizo con el progreso de los primeros pasos.
- **Ajustes guardados en el navegador:** `warren_view_mode` (`simple`/`analyst`) y `warren_onboarding_seen` (oculta los primeros pasos).
- **Prueba de primer uso:** borra esas claves de `localStorage` y recarga.
- **Código muerto:** no se importan `src/services/`, `src/routes/` ni `python/`.
