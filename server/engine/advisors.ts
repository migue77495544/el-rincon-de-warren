// Asesores Jairo Agudelo (fundamental) y Juan Guillermo Hernández (técnico).
// Contexto con datos reales + Gemini; si Gemini no responde se usa el motor local de asesorLocal.ts.
import { getCompanyData } from './company';
import { getCandlestickData } from './market';
import { generar, geminiDisponible, TurnoChat } from './gemini';
import { PERFIL_JAIRO, PERFIL_GUILLERMO, EJEMPLOS_RESOLUCION } from '../data/perfiles';
import { Fundamental, Tecnico, respuestaLocalJairo, respuestaLocalGuillermo, sintesisLocal } from './asesorLocal';
import { cleanVal, num, round, mean, std, fmtMiles, fmtSigno } from './util';

export const REGLA_DE_ORO_IDIOMA =
  'IDIOMA: Responde exclusivamente en español neutro profesional. Las siglas financieras estándar se usan tal cual ' +
  '(ROE, ROIC, WACC, PER, EV/EBITDA, DCF, EBITDA, RSI, EMA, MACD); el resto de la jerga va en español: ' +
  'foso económico (no "moat"), alcista/bajista (no "bullish/bearish"), retroceso (no "pullback"), ' +
  'orden de pérdida límite ("stop loss" se admite entre paréntesis la primera vez).';

// Algo más de libertad que el valor por defecto (0,25) para que el texto no suene a plantilla; las cifras las fija el contexto
const TEMPERATURA_ASESOR = 0.6;

const AVISO_SIN_DATOS =
  '  ⚠ NO se pudieron descargar datos reales de este activo: las cifras de este bloque son valores ' +
  'genéricos de referencia. Adviértelo en la primera frase y no las presentes como datos de la empresa.\n';

const REGLAS_RESPUESTA_ASESOR =
  'QUIÉN TE ESCRIBE: un pequeño inversor, muchas veces principiante, que usa la plataforma para aprender. ' +
  'Le hablas de tú, como un mentor sentado frente a él con el gráfico o los estados financieros abiertos: ' +
  'con criterio propio, cercanía y franqueza. No eres un informe automático ni un folleto.\n\n' +
  'ANTES DE ESCRIBIR (piénsalo en silencio, no lo escribas):\n' +
  '1. ¿Qué quiere saber de verdad? Detrás de "¿debo vender?" suele haber alguien que ya tiene la acción y está nervioso; ' +
  'detrás de "¿es buena empresa?" alguien que duda si entrar. Responde a esa inquietud, no solo a las palabras literales.\n' +
  '2. ¿Qué dos o tres cifras del CONTEXTO DE DATOS deciden la respuesta? Ignora el resto.\n' +
  '3. ¿Qué es lo que más te llama la atención, lo sorprendente o lo que no cuadra? Eso es lo que un experto de verdad comenta.\n' +
  '4. Si hay conversación previa, ¿qué ya le explicaste? No lo repitas: construye sobre ello y refiérete a ello con naturalidad.\n\n' +
  'CÓMO SUENAS:\n' +
  '- Primera persona y opinión con convicción: "a mí esto me parece caro", "lo que me preocupa es...", "aquí no lo veo claro". ' +
  'Una persona con experiencia toma partido y explica por qué; no se esconde tras "depende".\n' +
  '- Conecta las cifras en un razonamiento, como una historia de causa y consecuencia: no una lista de datos sueltos. ' +
  'Por ejemplo: el margen cae, por eso el flujo libre se encoge, por eso el dividendo queda más justo.\n' +
  '- Cuando uses un concepto técnico, tradúcelo en media frase a lenguaje de calle la primera vez ' +
  '(por ejemplo: el ROIC, lo que gana el negocio por cada dólar invertido en él). Usa comparaciones cotidianas si aclaran.\n' +
  '- Sé honesto con la incertidumbre: di qué sabes con seguridad, qué es interpretación tuya y qué dato te haría cambiar de opinión.\n' +
  '- Varía cómo empiezas. Entra directo al asunto, pero no con una plantilla: a veces con la conclusión, a veces con el dato que lo explica todo, ' +
  'a veces corrigiendo una idea equivocada que trae la pregunta.\n' +
  '- Si de verdad falta información para responder bien (por ejemplo, a qué precio compró o a qué plazo invierte), ' +
  'da la respuesta para los casos más probables y termina preguntándole ese dato.\n' +
  '- Puedes cerrar, cuando salga natural, con un consejo práctico concreto o con una pregunta que le haga pensar. No siempre.\n\n' +
  'CONCORDANCIA:\n' +
  '- Responde al tema preguntado. Si preguntan por dividendos, habla de dividendos; no conviertas una pregunta puntual en un diagnóstico completo.\n' +
  '- Si preguntan por otra empresa distinta a la del contexto, dilo en una frase: solo tienes datos de la empresa del contexto.\n' +
  '- Si la pregunta no tiene relación con inversión, dilo con amabilidad y sugiere qué sí puedes analizar.\n\n' +
  'RIGOR (innegociable):\n' +
  '- Usa únicamente cifras del contexto. Si un dato figura como N/D o no está, dilo y razona con lo que hay; ' +
  'jamás inventes cifras, fechas, noticias, resultados trimestrales ni anécdotas personales.\n' +
  '- Si haces un cálculo propio (diferencial, múltiplo implícito, distancia porcentual), muestra la cuenta en una línea.\n' +
  '- Sé realista: no suavices un dato malo ni infles uno bueno. Si la evidencia es mixta, di cuál pesa más y por qué.\n' +
  '- Prohibido el relleno de manual: "es importante considerar", "cabe destacar", "en conclusión", "como inversor debes...", ' +
  '"depende de tu perfil de riesgo" sin concretar, citas célebres o tono motivacional.\n\n' +
  'FORMATO (la interfaz muestra texto plano):\n' +
  '- Pregunta puntual: prosa natural en 2 a 4 párrafos cortos, sin títulos. Unas 120-250 palabras; menos si la pregunta es simple.\n' +
  '- Diagnóstico completo (solo si se pide): bloques con título en MAYÚSCULAS seguido de dos puntos, y dentro de cada bloque prosa con opinión, ' +
  'no solo cifras. 350-500 palabras.\n' +
  '- Sin asteriscos, almohadillas ni emojis. Guiones solo si de verdad hay que listar varias cifras.\n' +
  '- Formato numérico español: coma decimal (29,47x; 2,3 %) y punto de miles (132.066 millones de dólares).\n' +
  '- No añadas descargos legales: la interfaz ya muestra que es un análisis educativo.';

function construirPromptJairo(contexto: string): string {
  return 'Eres Jairo Agudelo, analista fundamental con trayectoria en banca de inversión y finanzas corporativas. ' +
    'Evalúas cada acción como la compra de un negocio: calidad (ROIC y ROE frente al costo de capital), ' +
    'solidez del balance, durabilidad de la ventaja competitiva y precio pagado frente al valor intrínseco.\n' +
    'TU VOZ: pausada, de exbanquero que ha visto muchos ciclos. Piensas como dueño del negocio, no como apostador: ' +
    'te preguntas qué tendría que pasar para que esta empresa valga más dentro de cinco años. Eres paciente con las ' +
    'buenas empresas y despiadado con los precios exagerados. Desconfías de las modas y de los beneficios que no se convierten en caja. ' +
    'Calificas sin eufemismos (caro, frágil, extraordinario) pero explicas con calma, como quien enseña.\n\n' +
    `${REGLA_DE_ORO_IDIOMA}\n\n${REGLAS_RESPUESTA_ASESOR}\n\n` +
    'CRITERIO FUNDAMENTAL:\n' +
    '- Creación de valor: ROIC frente a WACC es la prueba principal; ROE frente a K_e la complementa. ' +
    'Si el ROE está inflado por recompras o por un patrimonio mínimo, adviértelo y apóyate en el ROIC.\n' +
    '- Valoración: contrasta PER y EV/EBITDA con el crecimiento y la calidad del negocio; un múltiplo alto solo se ' +
    'justifica con ROIC muy superior al WACC y crecimiento sostenido. Usa la rentabilidad por flujo libre como chequeo.\n' +
    '- DCF: el del contexto es un escenario mecánico con supuestos explícitos. Cítalo con sus supuestos, di si el flujo ' +
    'base te parece representativo y hacia dónde ajustarías; nunca lo presentes como precio objetivo.\n' +
    '- Margen de seguridad: exige descuento frente al valor estimado; el consenso de analistas es una referencia, no un argumento.\n' +
    '- Foso económico: la etiqueta del contexto es una heurística (ROE y endeudamiento). Júzgalo tú con márgenes, ROIC y modelo de negocio.\n' +
    '- Balance: deuda neta/EBITDA, cobertura de intereses y liquidez, leídos según el sector.\n\n' +
    'ALCANCE: no opinas de indicadores técnicos (RSI, medias móviles, MACD, soportes, resistencias). Si la pregunta es ' +
    'puramente técnica, dilo en una frase, remite a Juan Guillermo y responde el fondo de la inquietud desde la valoración ' +
    '(por ejemplo, si el precio actual ofrece o no margen de seguridad).\n\n' +
    `TU PERFIL Y REGLAS NUMÉRICAS:\n${PERFIL_JAIRO}\n\n${contexto}`;
}

function construirPromptGuillermo(contexto: string): string {
  return "Eres Juan Guillermo 'Guangui' Hernández, operador y analista técnico cuantitativo. Lees tendencia, impulso, " +
    'volatilidad y niveles de precio, y conviertes esa lectura en un plan con entrada, pérdida límite, objetivo y ' +
    'relación riesgo/beneficio. Tu regla: sin un mínimo de 2 a 1 no se opera.\n' +
    'TU VOZ: de operador de pantalla, directa y con energía. El mercado manda y tu ego no: si el gráfico no acompaña, ' +
    'lo dices aunque la empresa te guste. Hablas de escenarios ("si cierra por encima de..., entonces...") y de proteger el capital ' +
    'antes que de ganar. Conoces la psicología del principiante (perseguir el precio, no poner pérdida límite, enamorarse de una acción) ' +
    'y la señalas cuando la detectas en la pregunta. Precios exactos siempre.\n\n' +
    `${REGLA_DE_ORO_IDIOMA}\n\n${REGLAS_RESPUESTA_ASESOR}\n\n` +
    'CRITERIO TÉCNICO:\n' +
    '- Tendencia: posición del precio frente a EMA 200 (fondo), EMA 50 (medio plazo) y EMA 20 (corto), y el orden entre ellas.\n' +
    '- Impulso: RSI y MACD como confirmación, nunca como señal aislada; señala divergencias con el precio cuando los datos las muestren.\n' +
    '- Niveles: el soporte y la resistencia del contexto son el mínimo de 20 sesiones y el máximo de 120. Da siempre los precios exactos.\n' +
    '- Riesgo: calcula la relación riesgo/beneficio con los niveles del contexto y muestra la cuenta. Si no llega a 2 a 1, ' +
    'di a qué precio de entrada sí llegaría. Usa el ATR y la volatilidad para juzgar si la pérdida límite queda demasiado ceñida.\n' +
    '- Plan: entrada o condición de entrada, pérdida límite, objetivo y qué cierre de precio invalida el escenario.\n\n' +
    'ALCANCE: no opinas de estados financieros, múltiplos ni valor intrínseco. Si la pregunta es puramente fundamental, ' +
    'dilo en una frase, remite a Jairo y responde el fondo de la inquietud desde el precio (por ejemplo, si el momento de ' +
    'entrada es favorable o no).\n\n' +
    `TU PERFIL Y REGLAS NUMÉRICAS:\n${PERFIL_GUILLERMO}\n\n${contexto}`;
}

// ---------------------------------------------------------------
// Contexto de datos
// ---------------------------------------------------------------
const PALABRAS_TICKER: Array<[string, string]> = [
  ['nike', 'NKE'], ['nke', 'NKE'], ['coca', 'KO'], ['coca-cola', 'KO'], ['coca cola', 'KO'], ['ko', 'KO'],
  ['apple', 'AAPL'], ['aapl', 'AAPL'], ['iphone', 'AAPL'], ['microsoft', 'MSFT'], ['msft', 'MSFT'],
  ['berkshire', 'BRK.B'], ['buffett', 'BRK.B'], ['brk', 'BRK.B'], ['johnson', 'JNJ'], ['jnj', 'JNJ'],
  ['walmart', 'WMT'], ['wmt', 'WMT'], ['hype', 'HYPE']
];

const MODELOS_PREDEFINIDOS: Record<string, { nombre: string; sector: string; queHace: string; comoGanaDinero: string }> = {
  NKE: {
    nombre: 'NIKE, Inc.', sector: 'Calzado y Ropa Deportiva',
    queHace: 'Diseña, desarrolla y distribuye calzado, indumentaria y equipamiento atlético bajo las marcas Nike, Jordan y Converse.',
    comoGanaDinero: 'Vende al por mayor a cadenas deportivas globales y directamente al consumidor (tiendas Nike Direct y nike.com) con precios premium gracias a su marca.'
  },
  AAPL: {
    nombre: 'Apple Inc.', sector: 'Tecnología de Consumo',
    queHace: 'Fabrica hardware premium (iPhone, Mac, iPad, Apple Watch) e integra un ecosistema de software y servicios.',
    comoGanaDinero: 'Venta masiva de iPhones (~50% de ingresos) y servicios recurrentes de alto margen (App Store, suscripciones iCloud/Apple Music y comisiones de pago).'
  },
  KO: {
    nombre: 'The Coca-Cola Company', sector: 'Bebidas y Consumo Masivo',
    queHace: 'Compañía líder mundial de bebidas con más de 200 marcas de refrescos, aguas, jugos, tés y cafés.',
    comoGanaDinero: 'Vende jarabes y concentrados patentados a embotelladoras asociadas que asumen el costo de distribución, cobrando márgenes brutos superiores al 60%.'
  },
  MSFT: {
    nombre: 'Microsoft Corporation', sector: 'Software y Computación en la Nube',
    queHace: 'Desarrolla plataformas cloud empresariales (Azure), software de productividad (Office 365) y sistemas operativos.',
    comoGanaDinero: 'Cobro recurrente por consumo de infraestructura en la nube (Azure), suscripciones mensuales tipo SaaS a empresas y licencias de software.'
  },
  'BRK.B': {
    nombre: 'Berkshire Hathaway Inc.', sector: 'Conglomerado Financiero / Seguros',
    queHace: 'Holding diversificado dueño de aseguradoras (GEICO), ferrocarriles (BNSF), utilities energéticas y una masiva cartera de acciones.',
    comoGanaDinero: "Utiliza el 'float' asegurador (primas cobradas por anticipado invertidas a coste cero) y recoge beneficios operativos de sus decenas de filiales."
  }
};

function detectarTicker(pregunta: string, ticker?: string): string {
  if (ticker) return ticker.toUpperCase().trim();
  const lower = pregunta.toLowerCase();
  return PALABRAS_TICKER.find(([kw]) => lower.includes(kw))?.[1] || '';
}

const mmTexto = (v: unknown) => (typeof v === 'number' ? `${fmtMiles(v, 0)} millones de dólares` : 'N/D');

/** Pasa las cifras del contexto a formato español (1,234.56 → 1.234,56) para que el modelo no mezcle formatos */
function aEspanol(texto: string): string {
  return texto.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+/g, m => m.replace(/,/g, '§').replace('.', ',').replace(/§/g, '.'));
}

function formatearValoracion(v: any): string {
  if (!v) return 'VALORACIÓN Y COSTO DE CAPITAL: N/D (no se pudieron calcular múltiplos, ROIC, WACC ni DCF).\n';
  const f = (k: string, suf = '', pre = '') => (typeof v[k] === 'number' ? `${pre}${fmtMiles(v[k])}${suf}` : 'N/D');
  let txt = 'VALORACIÓN Y COSTO DE CAPITAL:\n' +
    `  • PER: ${f('perTrailing', 'x')} (últimos 12 meses) · ${f('perForward', 'x')} (estimado próximo ejercicio)\n` +
    `  • EV/EBITDA: ${f('evEbitda', 'x')} · Precio/Valor en libros: ${f('precioValorLibros', 'x')} · ` +
    `Precio/Flujo de caja libre: ${f('precioFcf', 'x')} (rentabilidad por flujo libre ${f('fcfYieldPct', '%')})\n` +
    `  • Márgenes: bruto ${f('margenBrutoPct', '%')} · operativo ${f('margenOperativoPct', '%')} · neto ${f('margenNetoPct', '%')}\n` +
    `  • Crecimiento interanual: ingresos ${f('crecimientoIngresosPct', '%')} · beneficios ${f('crecimientoBeneficiosPct', '%')}\n` +
    `  • Flujo de caja libre (último ejercicio): ${mmTexto(v.fcfMM)} · ` +
    (typeof v.deudaNetaMM === 'number' && v.deudaNetaMM < 0
      ? `Caja neta (tiene más caja que deuda financiera): ${mmTexto(-v.deudaNetaMM)} · `
      : `Deuda neta: ${mmTexto(v.deudaNetaMM)} · `) +
    `Deuda neta/EBITDA: ${f('deudaNetaEbitda', 'x')}\n` +
    `  • Dividendo: ${typeof v.dividendoPorAccion === 'number' && v.dividendoPorAccion > 0 ? `$${fmtMiles(v.dividendoPorAccion)} por acción al año (rentabilidad ${f('rentabilidadDividendoPct', '%')}, reparte ${f('payoutPct', '%')} del beneficio)` : 'no reparte dividendo actualmente'}\n` +
    `  • ROIC: ${f('roicPct', '%')} frente a WACC: ${f('waccPct', '%')}\n` +
    `  • WACC — componentes: K_e ${f('kePct', '%')} (CAPM: libre de riesgo ${f('tasaLibreRiesgoPct', '%')} + ` +
    `beta ${f('beta')} × prima ${f('primaRiesgoPct', '%')}), K_d ${f('kdPct', '%')}, tasa impositiva ${f('tasaImpositivaPct', '%')}\n`;
  if (v.esFinanciera) {
    txt += '  • Entidad financiera: EV/EBITDA, ROIC y DCF de flujo libre NO aplican. Valórala con ROE frente a K_e y Precio/Valor en libros.\n';
  }
  if (v.dcf) {
    const d = v.dcf;
    txt += `  • DCF de referencia (mecánico, NO es precio objetivo): $${fmtMiles(d.valorPorAccion)} por acción ` +
      `(${fmtSigno(d.valorVsPrecioPct)}% frente al precio actual: ${d.valorVsPrecioPct >= 0 ? 'el precio está POR DEBAJO de este valor' : 'el precio está POR ENCIMA de este valor, no hay descuento'}). Supuestos: flujo libre base ` +
      `$${fmtMiles(d.fcfBaseMM, 1)} MM (media de hasta 3 ejercicios), crecimiento ${d.crecimiento5aPct}% anual durante 5 años, ` +
      `${d.crecimientoTerminalPct}% perpetuo, descontado al WACC.\n`;
  } else if (!v.esFinanciera) {
    txt += '  • DCF de referencia: N/D (flujo de caja libre negativo o insuficiente).\n';
  }
  return txt;
}

async function obtenerContextoTecnico(ticker: string): Promise<Tecnico> {
  const base = 100;
  const m: Tecnico = {
    datosOk: false, precio: base, ema20: round(base * 1.01, 2), ema50: round(base * 0.97, 2), ema200: round(base * 0.94, 2),
    rsi: 52, macdLine: 0.85, macdSignal: 0.6, macdHist: 0.25, soporte: round(base * 0.92, 2), resistencia: round(base * 1.15, 2),
    stopLoss: 0, ratioRb: 0, extra: ''
  };
  if (ticker) {
    const c: any = await getCandlestickData(ticker, '1y', '1d').catch(() => null);
    const pts: any[] | null = c?.success ? c.points : null;
    if (pts && pts.length >= 30) {
      const last = pts[pts.length - 1];
      const precio = Number(last.close);
      m.precio = precio;
      const asignar = (clave: keyof Tecnico, campo: string, dec: number) => {
        if (last[campo] !== null && last[campo] !== undefined) (m as any)[clave] = round(Number(last[campo]), dec);
      };
      asignar('ema20', 'ema20', 2); asignar('ema50', 'ema50', 2); asignar('ema200', 'ema200', 2);
      asignar('rsi', 'rsi', 1); asignar('macdLine', 'macdLine', 2); asignar('macdSignal', 'macdSignal', 2); asignar('macdHist', 'macdHist', 2);
      m.soporte = round(Math.min(...pts.slice(-20).map(p => p.low)), 2);
      m.resistencia = round(Math.max(...pts.slice(-120).map(p => p.high)), 2);
      const cierres = pts.map(p => p.close);
      const cambios = cierres.slice(1).map((x, i) => x / cierres[i] - 1).slice(-30);
      const volAnual = std(cambios) * Math.sqrt(252) * 100;
      const rangos = pts.slice(-14).map((p, i) => {
        const q = pts[pts.length - 15 + i];
        return Math.max(p.high - p.low, Math.abs(p.high - q.close), Math.abs(p.low - q.close));
      });
      const atr = mean(rangos);
      const max52 = Math.max(...pts.map(p => p.high));
      const min52 = Math.min(...pts.map(p => p.low));
      const vols = pts.slice(-21, -1).map(p => p.volume || 0);
      const volMedio = mean(vols);
      const volRel = volMedio > 0 ? (last.volume || 0) / volMedio : 0;
      const rend = (n: number) => (pts.length > n ? (precio / pts[pts.length - n - 1].close - 1) * 100 : NaN);
      const s1 = (v: number) => (Number.isNaN(v) ? 'nan' : fmtSigno(v));
      m.extra =
        `  • Rango de 52 semanas: $${min52.toFixed(2)} – $${max52.toFixed(2)} (precio a ${fmtSigno((precio / max52 - 1) * 100)}% del máximo)\n` +
        `  • Rendimiento: 1 mes ${s1(rend(21))}% · 3 meses ${s1(rend(63))}% · 6 meses ${s1(rend(126))}%\n` +
        `  • Volatilidad anualizada (30 sesiones): ${volAnual.toFixed(1)}% · ATR(14): $${atr.toFixed(2)} (${((atr / precio) * 100).toFixed(1)}% del precio)\n` +
        `  • Volumen de la última sesión: ${volRel.toFixed(2)}x la media de 20 sesiones\n`;
      m.datosOk = true;
    }
  }
  m.stopLoss = round(m.soporte * 0.98, 2);
  const riesgo = m.precio - m.stopLoss;
  m.ratioRb = riesgo > 0 ? round(Math.max(0, m.resistencia - m.precio) / riesgo, 1) : 0;
  return m;
}

function formatearContextoTecnico(m: Tecnico, nombre: string, t: string): string {
  return `CONTEXTO DE DATOS TÉCNICOS (${t || 'General'}) — velas diarias:\n` +
    (m.datosOk ? '' : AVISO_SIN_DATOS) +
    `  • Empresa: ${nombre} (${t || 'N/D'})\n` +
    `  • Precio de cierre: $${m.precio.toFixed(2)}\n` +
    `  • EMA 20: $${m.ema20.toFixed(2)} · EMA 50: $${m.ema50.toFixed(2)} · EMA 200: $${m.ema200.toFixed(2)}\n` +
    `  • RSI (14): ${m.rsi.toFixed(1)}\n` +
    `  • MACD (12/26/9): línea ${fmtSigno(m.macdLine, 2)}, señal ${fmtSigno(m.macdSignal, 2)}, histograma ${fmtSigno(m.macdHist, 2)}\n` +
    `  • Soporte (mínimo de 20 sesiones): $${m.soporte.toFixed(2)}\n` +
    `  • Resistencia (máximo de 120 sesiones): $${m.resistencia.toFixed(2)}\n` +
    `  • Pérdida límite de referencia (2% bajo el soporte): $${m.stopLoss.toFixed(2)}\n` +
    `  • Relación riesgo/beneficio entrando al precio actual: ${m.ratioRb.toFixed(1)}:1\n` +
    // (resistencia − E) = 2 × (E − pérdida límite)  →  E = (resistencia + 2 × pérdida límite) / 3
    `  • Precio de entrada máximo para lograr 2 a 1 con esa pérdida límite y objetivo en la resistencia: $${((m.resistencia + 2 * m.stopLoss) / 3).toFixed(2)} (cálculo exacto; úsalo en vez de estimar otro)\n` +
    m.extra;
}

async function obtenerContextoFundamental(t: string): Promise<Fundamental> {
  const pre = MODELOS_PREDEFINIDOS[t];
  const sector = pre?.sector || 'Renta Variable Global';
  const f: Fundamental = {
    datosOk: false, t, nombre: pre?.nombre || t || 'el activo consultado', sector, precio: 100, per: '22.5', roe: 28, liquidez: 1.5,
    deuda: '1.8', cobertura: 'N/D', moat: 'Medio', potencial: 15, precioObjetivo: 0, recomendacion: 'Sin datos de recomendación',
    analistas: 0, ke: 9.5, queHace: pre?.queHace || `Compañía cotizada en bolsa con operaciones comerciales en el sector de ${sector}.`,
    comoGana: pre?.comoGanaDinero || `Genera ingresos vendiendo productos y soluciones en el mercado de ${sector} con márgenes competitivos.`,
    valoracion: null, tieneConsenso: false
  };
  if (t) {
    const d: any = await getCompanyData(t).catch(() => null);
    if (d?.success) {
      f.nombre = d.nombre || f.nombre;
      f.precio = cleanVal(d.raw?.precioCotizacion, 100);
      f.per = String(d.ratios?.per ?? '22.5');
      f.roe = cleanVal(d.ratios?.roe, f.roe);
      f.liquidez = cleanVal(d.ratios?.liquidezCorriente, f.liquidez);
      f.deuda = String(d.ratios?.endeudamiento ?? f.deuda);
      f.cobertura = String(d.ratios?.coberturaIntereses ?? f.cobertura);
      f.moat = d.moat || f.moat;
      f.sector = d.sector || f.sector;
      f.datosOk = true;
      f.valoracion = d.valoracion || null;
      if (num(f.valoracion?.kePct)) f.ke = Number(f.valoracion.kePct);
      const tc = d.target_consensus;
      if (tc) {
        if (tc.upside_potential !== null && tc.upside_potential !== undefined) f.potencial = cleanVal(tc.upside_potential, f.potencial);
        if (tc.target_mean) {
          f.precioObjetivo = cleanVal(tc.target_mean, 0);
          f.tieneConsenso = true;
        }
        if (tc.recommendation) f.recomendacion = tc.recommendation;
        if (tc.number_of_analysts) f.analistas = tc.number_of_analysts;
      }
      // queHace / comoGanaDinero ya vienen traducidos al español (perfilEs.ts); la descripción de Yahoo está en inglés
      if (!pre && d.queHace) f.queHace = d.queHace;
      if (!pre && d.comoGanaDinero) f.comoGana = d.comoGanaDinero;
    }
  }
  return f;
}

function formatearContextoFundamental(f: Fundamental): string {
  return `CONTEXTO DE DATOS FUNDAMENTALES (${f.t || 'General'}):\n` +
    (f.datosOk ? '' : AVISO_SIN_DATOS) +
    `  • Empresa: ${f.nombre} (${f.t || 'N/D'}) · Sector: ${f.sector}\n` +
    `  • Actividad: ${f.queHace}\n` +
    `  • Fuentes de ingresos: ${f.comoGana}\n` +
    `  • Precio actual: $${f.precio.toFixed(2)}\n` +
    `  • ROE: ${f.roe.toFixed(1)}% frente a K_e: ${f.ke.toFixed(1)}%\n` +
    `  • Liquidez corriente: ${f.liquidez.toFixed(2)}x · Pasivo total/Patrimonio: ${f.deuda}x · ` +
    `Cobertura de intereses (EBIT/intereses): ${f.cobertura}x\n` +
    `  • Foso económico (heurística): ${f.moat}\n` +
    `  • Consenso de analistas: objetivo medio $${f.precioObjetivo.toFixed(2)} (${fmtSigno(f.potencial)}% frente al precio), ` +
    `${f.recomendacion}, ${f.analistas} analistas\n` +
    formatearValoracion(f.valoracion);
}

function errorSinDatos(pregunta: string, t: string) {
  return {
    success: false,
    error: true,
    pregunta,
    ticker: t || null,
    message: t
      ? `No se pudieron obtener datos reales de ${t} en la fuente financiera. Reintenta la búsqueda.`
      : 'Selecciona o menciona una empresa para realizar la consulta.'
  };
}

const sinTildes = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Solo es diagnóstico completo si se pide expresamente; cualquier otra pregunta se responde de forma puntual */
function esConsultaGeneral(pregunta: string): boolean {
  const q = sinTildes(pregunta).trim();
  if (q.length < 4) return true;
  return /\b(diagnostico|evaluacion completa|analisis (general|completo|integral)|vision general|panorama general|resumen (general|integral)|informe completo|como esta (el negocio|la empresa))\b/.test(q);
}

// Palabras muy frecuentes en inglés y casi inexistentes en español: delatan párrafos sin traducir
const INGLES = /\b(the|and|with|which|its|their|this|that|from|has|have|is|are|was|were|will|would|company|revenue|growth|however|stock|price)\b/gi;

function pareceIngles(texto: string): boolean {
  const palabras = texto.split(/\s+/).length;
  const hits = (texto.match(INGLES) || []).length;
  return palabras > 0 && hits >= 4 && hits / palabras > 0.02;
}

/** Texto plano (sin Markdown) y siempre en español: si se cuela inglés, se reescribe una vez */
async function pulirRespuesta(texto: string): Promise<string> {
  if (!texto) return texto;
  let t = texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu, '')
    .trim();
  if (pareceIngles(t)) {
    const traducido = await generar(t, {
      systemInstruction: `${REGLA_DE_ORO_IDIOMA}\n\nReescribe el texto íntegramente en español neutro. Conserva exactamente las cifras, ` +
        'los títulos en MAYÚSCULAS y la estructura. Texto plano, sin asteriscos ni emojis. Devuelve solo el texto reescrito.',
      temperature: 0.1,
      presupuestoMs: 15000,
      timeoutPorModeloMs: 12000
    });
    if (traducido && !pareceIngles(traducido)) t = traducido.trim();
  }
  return t;
}

// ---------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------
export async function consultarDual(pregunta: string, tickerIn?: string) {
  const t = detectarTicker(pregunta, tickerIn);
  const [f, tec] = await Promise.all([obtenerContextoFundamental(t), obtenerContextoTecnico(t)]);
  if (tec.datosOk) f.precio = tec.precio;
  if (!f.tieneConsenso) f.precioObjetivo = round(f.precio * (1 + f.potencial / 100), 2);
  if (!f.datosOk || !tec.datosOk) return errorSinDatos(pregunta, t);

  const general = esConsultaGeneral(pregunta);
  let rJairo = '';
  let rGuillermo = '';
  if (geminiDisponible()) {
    const msgJairo = general
      ? `Diagnóstico fundamental completo de ${f.nombre} (${t || 'General'}). Bloques, en este orden: ` +
        'NEGOCIO (qué vende y de dónde sale el beneficio, en 2-3 frases), CALIDAD (ROIC frente a WACC, ROE frente a K_e, márgenes), ' +
        'BALANCE (deuda neta/EBITDA, cobertura de intereses, liquidez), VALORACIÓN (PER, EV/EBITDA, flujo libre y DCF de referencia frente al precio) y ' +
        'VEREDICTO (comprar, esperar a qué precio, o descartar, y el riesgo que lo invalida).'
      : pregunta;
    const msgGuillermo = general
      ? `Diagnóstico técnico completo de ${f.nombre} (${t || 'General'}). Bloques, en este orden: ` +
        'TENDENCIA (precio frente a EMA 200, 50 y 20), IMPULSO (RSI, MACD y volumen), ' +
        'NIVELES (soporte, resistencia y posición en el rango de 52 semanas), ' +
        'PLAN (entrada o condición de entrada, pérdida límite, objetivo y relación riesgo/beneficio con la cuenta) y ' +
        'VEREDICTO (operar ahora, esperar a qué precio, o no operar).'
      : pregunta;
    // Las dos consultas son independientes: en paralelo para no sumar latencias
    [rJairo, rGuillermo] = await Promise.all([
      generar(msgJairo, { systemInstruction: construirPromptJairo(aEspanol(formatearContextoFundamental(f))), temperature: TEMPERATURA_ASESOR, presupuestoMs: 32000 }),
      generar(msgGuillermo, { systemInstruction: construirPromptGuillermo(aEspanol(formatearContextoTecnico(tec, f.nombre, t))), temperature: TEMPERATURA_ASESOR, presupuestoMs: 32000 })
    ]);
  }
  [rJairo, rGuillermo] = await Promise.all([pulirRespuesta(rJairo), pulirRespuesta(rGuillermo)]);
  const usaGemini = Boolean(rJairo && rGuillermo);

  rJairo = rJairo || respuestaLocalJairo(general ? 'diagnóstico' : pregunta, f);
  rGuillermo = rGuillermo || respuestaLocalGuillermo(general ? 'diagnóstico' : pregunta, tec);
  const local = sintesisLocal(f, tec);

  let sintesis: string;
  let convergen: boolean;
  if (!general) {
    sintesis = 'Pregunta puntual: Jairo la responde desde el negocio y sus cifras, y Juan Guillermo desde el gráfico y el riesgo de la operación.';
    convergen = local.coinciden;
  } else {
    sintesis = '';
    if (usaGemini) {
      sintesis = await generar(
        `ANÁLISIS FUNDAMENTAL (Jairo):\n${rJairo}\n\nANÁLISIS TÉCNICO (Juan Guillermo):\n${rGuillermo}\n\nPATRONES DE RESOLUCIÓN CUANDO DIVERGEN:\n${EJEMPLOS_RESOLUCION}`,
        {
          systemInstruction: `${REGLA_DE_ORO_IDIOMA}\n\n` +
            'Eres el moderador que integra un análisis fundamental y uno técnico de la misma empresa. ' +
            'Escribe de 3 a 5 frases en texto plano, sin títulos, asteriscos ni emojis. ' +
            'La primera palabra debe ser exactamente COINCIDEN o DIVERGEN, seguida de punto. Después: ' +
            '1) en qué cifra concreta se apoya cada uno; ' +
            '2) resuelve con el criterio de que el fundamental decide QUÉ comprar y el técnico CUÁNDO; ' +
            '3) termina con una acción precisa: comprar ahora, esperar a un precio o condición concretos, o descartar. ' +
            'No repitas los análisis ni añadas cifras que no estén en ellos.',
          maxOutputTokens: 2048,
          presupuestoMs: 15000
        }
      );
    }
    sintesis = await pulirRespuesta(sintesis);
    if (!usaGemini || !sintesis) sintesis = local.texto;

    const lj = rJairo.toLowerCase();
    const lg = rGuillermo.toLowerCase();
    const pos = ['compra', 'oportunidad', 'atractiv', 'entrada', 'alcista', 'positiv', 'valor'];
    const neg = ['esperar', 'prudencia', 'riesgo', 'bajista', 'abstenerse', 'cuidado', 'evitar'];
    const has = (s: string, ks: string[]) => ks.some(k => s.includes(k));
    convergen = (has(lj, pos) && has(lg, pos)) || (has(lj, neg) && has(lg, neg)) || (!has(lj, neg) && !has(lg, neg));
    const veredicto = sintesis.trimStart().toUpperCase();
    if (veredicto.startsWith('DIVERGEN')) convergen = false;
    else if (veredicto.startsWith('COINCIDEN')) convergen = true;
  }

  return {
    success: true,
    pregunta,
    ticker: t || null,
    empresaNombre: f.nombre,
    modeloNegocio: { queHace: f.queHace, comoGanaDinero: f.comoGana, sector: f.sector },
    respuesta_jairo: rJairo,
    respuesta_guillermo: rGuillermo,
    sintesis,
    convergencia: convergen ? 'acuerdo' : 'divergencia',
    source: usaGemini ? 'gemini-live' : 'motor-analitico'
  };
}

export async function consultarJairo(pregunta: string, tickerIn?: string, historial: TurnoChat[] = []) {
  const t = detectarTicker(pregunta, tickerIn);
  const f = await obtenerContextoFundamental(t);
  if (!f.tieneConsenso) f.precioObjetivo = round(f.precio * (1 + f.potencial / 100), 2);
  if (!f.datosOk) return errorSinDatos(pregunta, t);

  let respuesta = '';
  if (geminiDisponible()) {
    respuesta = await pulirRespuesta(await generar(pregunta, { systemInstruction: construirPromptJairo(aEspanol(formatearContextoFundamental(f))), historial, temperature: TEMPERATURA_ASESOR, presupuestoMs: 40000 }));
  }
  const usaGemini = Boolean(respuesta);
  if (!respuesta) respuesta = respuestaLocalJairo(pregunta, f);
  return {
    success: true,
    pregunta,
    ticker: t || null,
    empresaNombre: f.nombre,
    modeloNegocio: { queHace: f.queHace, comoGanaDinero: f.comoGana, sector: f.sector },
    respuesta,
    source: usaGemini ? 'gemini-live' : 'motor-analitico'
  };
}

export async function consultarGuillermo(pregunta: string, tickerIn?: string, historial: TurnoChat[] = []) {
  const t = detectarTicker(pregunta, tickerIn);
  const pre = MODELOS_PREDEFINIDOS[t];
  const nombre = pre?.nombre || t || 'el activo consultado';
  const sector = pre?.sector || 'Renta Variable Global';
  const tec = await obtenerContextoTecnico(t);
  if (!tec.datosOk) return errorSinDatos(pregunta, t);

  let respuesta = '';
  if (geminiDisponible()) {
    respuesta = await pulirRespuesta(await generar(pregunta, { systemInstruction: construirPromptGuillermo(aEspanol(formatearContextoTecnico(tec, nombre, t))), historial, temperature: TEMPERATURA_ASESOR, presupuestoMs: 40000 }));
  }
  const usaGemini = Boolean(respuesta);
  if (!respuesta) respuesta = respuestaLocalGuillermo(pregunta, tec);
  return {
    success: true,
    pregunta,
    ticker: t || null,
    empresaNombre: nombre,
    modeloNegocio: {
      queHace: `Compañía cotizada en bolsa con operaciones comerciales en el sector de ${sector}.`,
      comoGanaDinero: `Genera ingresos vendiendo productos y soluciones en el mercado de ${sector} con márgenes competitivos.`,
      sector
    },
    respuesta,
    source: usaGemini ? 'gemini-live' : 'motor-analitico',
    metricasClave: {
      precio: round(tec.precio, 2), ema20: tec.ema20, ema50: tec.ema50, ema200: tec.ema200, rsi: tec.rsi,
      macdLine: tec.macdLine, macdSignal: tec.macdSignal, macdHist: tec.macdHist, soporte: tec.soporte,
      resistencia: tec.resistencia, stopLoss: tec.stopLoss, ratioRB: tec.ratioRb
    }
  };
}
