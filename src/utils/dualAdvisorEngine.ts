import { CompanyAnalysis } from '../types';
import { KNOWN_COMPANIES } from '../data/knownCompaniesData';
import {
  REGLA_DE_ORO_IDIOMA,
  STRICT_QUERY_FOCUS_INSTRUCTION,
  JAIRO_SYSTEM_PROMPT,
  GUILLERMO_SYSTEM_PROMPT
} from '../data/advisorPrompts';

export {
  REGLA_DE_ORO_IDIOMA,
  STRICT_QUERY_FOCUS_INSTRUCTION,
  JAIRO_SYSTEM_PROMPT,
  GUILLERMO_SYSTEM_PROMPT
};

export interface ModeloNegocio {
  queHace: string;
  comoGanaDinero: string;
  sector?: string;
  moat?: string;
}

export interface FundamentalContext {
  ticker: string;
  nombre: string;
  sector: string;
  precio: number;
  precioObjetivo: number;      // Target mean de analistas ($)
  roe: number; // % (e.g. 35.8)
  liquidez: number; // Razón Corriente (e.g. 1.82)
  apalancamiento: number | string; // Deuda/Patrimonio o Deuda/EBITDA
  upside_potential: number; // % potencial alcista vs consenso
  margenSeguridad?: number; // % margen de seguridad
  ke: number; // Costo de capital propio K_e % (e.g. 9.8)
  moat: 'Amplio' | 'Medio' | 'Ninguno';
  recommendation: string;    // e.g. "Compra", "Mantener"
  number_of_analysts: number;
  queHace: string;
  comoGanaDinero: string;
}

export interface TechnicalContext {
  ticker: string;
  nombre: string;
  precio: number; // Acción del precio actual
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number; // Lectura de RSI (14)
  macd: {
    line: number;
    signal: number;
    hist: number;
  };
  soporte: number;
  resistencia: number;
  stopLoss: number;
  ratioRB: number;
}

export interface DualAdvisorResult {
  success: boolean;
  pregunta: string;
  ticker?: string | null;
  empresaNombre?: string;
  modeloNegocio?: ModeloNegocio;
  respuesta_jairo: string;
  respuesta_guillermo: string;
  sintesis: string;
  convergencia: 'acuerdo' | 'divergencia';
  source?: 'gemini-live' | 'motor-analitico';
  metricasClave?: {
    precio: number;
    per?: number | string;
    roe?: number | string;
    liquidez?: number | string;
    apalancamiento?: number | string;
    upsidePotential?: number | string;
    targetMean?: number | string;
    recommendation?: string;
    number_of_analysts?: number;
    margenSeguridad?: number | string;
    ke?: number | string;
    moat?: string;
    deudaEbitda?: number | string;
    rsi?: number;
    ema20?: number;
    ema50?: number;
    ema40?: number;
    ema200?: number;
    macd?: string;
    soporte?: number;
    resistencia?: number;
    stopLoss?: number;
    riesgoBeneficio?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADOS INDIVIDUALES (Preguntas Puntuales)
// ─────────────────────────────────────────────────────────────────────────────

export interface JairoOnlyResult {
  success: boolean;
  pregunta: string;
  ticker?: string | null;
  empresaNombre?: string;
  respuesta: string;
  source?: 'gemini-live' | 'motor-analitico';
  metricasClave?: {
    precio: number;
    roe?: number | string;
    liquidez?: number | string;
    apalancamiento?: number | string;
    upsidePotential?: number | string;
    targetMean?: number | string;
    recommendation?: string;
    number_of_analysts?: number;
    margenSeguridad?: number | string;
    ke?: number | string;
    moat?: string;
  };
}

export interface GuillermoOnlyResult {
  success: boolean;
  pregunta: string;
  ticker?: string | null;
  empresaNombre?: string;
  respuesta: string;
  source?: 'gemini-live' | 'motor-analitico';
  metricasClave?: {
    precio: number;
    rsi?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
    macd?: string;
    soporte?: number;
    resistencia?: number;
    stopLoss?: number;
    riesgoBeneficio?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS DE SISTEMA ESTRICTOS (Importados desde ../data/advisorPrompts)
// ─────────────────────────────────────────────────────────────────────────────

export function buildJairoContext(ctx: FundamentalContext): string {
  return [
    `CONTEXTO FUNDAMENTAL (${ctx.ticker}):`,
    `• Empresa: ${ctx.nombre} (${ctx.ticker})`,
    `• Sector: ${ctx.sector}`,
    `• Precio actual: $${ctx.precio}`,
    `• Precio Objetivo (Consenso analistas): $${ctx.precioObjetivo}`,
    `• Potencial Alcista: ${ctx.upside_potential}%`,
    `• Recomendación: ${ctx.recommendation} (${ctx.number_of_analysts} analistas)`,
    `• ROE: ${ctx.roe}%`,
    `• Liquidez (Razón Corriente): ${ctx.liquidez}x`,
    `• Apalancamiento: ${ctx.apalancamiento}`,
    `• Costo de Capital Propio (K_e): ${ctx.ke}%`,
    `• Foso Económico (Moat): ${ctx.moat}`,
    `• Qué hace: ${ctx.queHace}`,
    `• Cómo gana dinero: ${ctx.comoGanaDinero}`
  ].join('\n');
}

export function buildGuillermoContext(ctx: TechnicalContext): string {
  return [
    `CONTEXTO TÉCNICO (${ctx.ticker}):`,
    `• Empresa: ${ctx.nombre} (${ctx.ticker})`,
    `• Acción del precio actual: $${ctx.precio}`,
    `• EMA 20: $${ctx.ema20}`,
    `• EMA 50: $${ctx.ema50}`,
    `• EMA 200: $${ctx.ema200}`,
    `• Lectura de RSI (14): ${ctx.rsi}`,
    `• Estructura de MACD: Línea ${ctx.macd.line > 0 ? '+' : ''}${ctx.macd.line.toFixed(2)}, Señal ${ctx.macd.signal.toFixed(2)}, Histograma ${ctx.macd.hist > 0 ? '+' : ''}${ctx.macd.hist.toFixed(2)}`,
    `• Soporte relevante: $${ctx.soporte}`,
    `• Resistencia técnica: $${ctx.resistencia}`,
    `• Stop Loss sugerido: $${ctx.stopLoss}`,
    `• Relación Riesgo/Beneficio: ${ctx.ratioRB}:1`
  ].join('\n');
}

export function buildJairoPrompt(pregunta: string, ctx: FundamentalContext): string {
  return `${JAIRO_SYSTEM_PROMPT}\n\n${buildJairoContext(ctx)}\n\nPREGUNTA DEL USUARIO:\n${pregunta}`;
}

export function buildGuillermoPrompt(pregunta: string, ctx: TechnicalContext): string {
  return `${GUILLERMO_SYSTEM_PROMPT}\n\n${buildGuillermoContext(ctx)}\n\nPREGUNTA DEL USUARIO:\n${pregunta}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo base de empresas importado desde ../data/knownCompaniesData
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Obtiene o sintetiza la explicación de qué hace la empresa y cómo gana dinero
 */
export function extractModeloNegocio(company: any, pregunta: string): ModeloNegocio {
  if (!company) {
    return {
      queHace: 'Análisis conceptual sobre inversión en valor y timing técnico de mercados financieros.',
      comoGanaDinero: 'Regla de Warren Buffett: el primer paso antes de mirar cualquier ratio contable o gráfico técnico es saber qué producto vende la empresa, a quién se lo vende y por qué los clientes no pueden o no quieren sustituirlo.',
      sector: 'General / Educación Financiera'
    };
  }

  const ticker = (company.ticker || '').toUpperCase().trim();

  if (KNOWN_COMPANIES[ticker]) {
    const k = KNOWN_COMPANIES[ticker];
    return {
      queHace: k.queHace,
      comoGanaDinero: k.comoGanaDinero,
      sector: k.sector,
      moat: k.moat
    };
  }

  const nombre = company.nombre || ticker;
  const sector = company.sector || 'Renta Variable Global';
  const desc = company.descripcion || `Compañía cotizada en bolsa: ${nombre}`;
  const moat = company.moat || 'Medio';

  const queHace = desc.length > 20
    ? desc
    : `${nombre} (${ticker}) opera en el sector de ${sector}, desarrollando y comercializando productos y servicios especializados para su base de clientes corporativos y consumidores finales.`;

  const comoGanaDinero = `Genera ingresos a través de la venta y distribución de sus soluciones en el mercado de ${sector}. Su rentabilidad se sostiene mediante su ventaja competitiva (${moat === 'Amplio' ? 'foso económico amplio que le otorga pricing power' : moat === 'Medio' ? 'foso moderado con posicionamiento sectorial' : 'mercado competitivo con márgenes ajustados'}), convirtiendo ventas brutas en flujo de caja libre operativo para el accionista.`;

  return {
    queHace,
    comoGanaDinero,
    sector,
    moat
  };
}

/**
 * Detecta qué empresa o ticker se está consultando
 */
export function identifyCompany(pregunta: string, explicitTicker?: string, companies: any[] = []): any {
  const normQ = pregunta.toLowerCase();

  // 1. Ticker explícito
  if (explicitTicker && explicitTicker.trim()) {
    const t = explicitTicker.toUpperCase().trim();
    const found = companies.find(c => c.ticker.toUpperCase() === t);
    if (found) return found;
    if (KNOWN_COMPANIES[t]) return KNOWN_COMPANIES[t];
    return { ticker: t, nombre: t };
  }

  // 2. Búsqueda por palabras clave en la pregunta
  const tickerMap: Record<string, string> = {
    'nike': 'NKE',
    'nke': 'NKE',
    'coca': 'KO',
    'coca-cola': 'KO',
    'coca cola': 'KO',
    'ko': 'KO',
    'apple': 'AAPL',
    'aapl': 'AAPL',
    'iphone': 'AAPL',
    'microsoft': 'MSFT',
    'msft': 'MSFT',
    'berkshire': 'BRK.B',
    'buffett': 'BRK.B',
    'brk': 'BRK.B',
    'johnson': 'JNJ',
    'jnj': 'JNJ',
    'walmart': 'WMT',
    'wmt': 'WMT',
    'hype': 'HYPE',
    'ecopetrol': 'ECOPETROL',
    'constellation': 'STZ',
    'unitedhealth': 'UNH'
  };

  for (const [kw, t] of Object.entries(tickerMap)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(normQ)) {
      const found = companies.find(c => c.ticker.toUpperCase() === t);
      if (found) return found;
      if (KNOWN_COMPANIES[t]) return KNOWN_COMPANIES[t];
      return { ticker: t, nombre: t };
    }
  }

  // 3. Coincidencia por nombre o ticker en companies
  for (const c of companies) {
    if (normQ.includes(c.ticker.toLowerCase()) || normQ.includes(c.nombre.toLowerCase())) {
      return c;
    }
  }

  return null;
}

/**
 * Consolida los contextos Fundamental y Técnico con todos los datos requeridos
 */
export function consolidateAdvisorContexts(
  company: any,
  modeloNegocio: ModeloNegocio
): { fundamental: FundamentalContext; technical: TechnicalContext } {
  const ticker = (company?.ticker || 'ACTIVO').toUpperCase();
  const nombre = company?.nombre || ticker;
  const sector = company?.sector || modeloNegocio.sector || 'Renta Variable Global';

  const precio = Number(company?.precio || company?.raw?.precioCotizacion || 100);
  const tc = company?.targetConsensus;
  const precioObjetivo = Number(
    tc?.target_mean || company?.precioObjetivo || Math.round(precio * 1.15 * 10) / 10
  );
  const upside_potential = typeof tc?.upside_potential === 'number'
    ? tc.upside_potential
    : Math.round(((precioObjetivo - precio) / Math.max(0.1, precioObjetivo)) * 100);
  const recommendation = tc?.recommendation || company?.recommendation || 'Mantener';
  const number_of_analysts = tc?.number_of_analysts || company?.number_of_analysts || 0;

  // Fundamental: ROE, Liquidez, Apalancamiento, Potencial Alcista, K_e, Foso Económico
  const roe = Number(
    typeof company?.roe === 'number'
      ? company.roe
      : company?.ratios?.roe?.value != null
        ? (company.ratios.roe.value > 1 ? company.ratios.roe.value : company.ratios.roe.value * 100)
        : 22.0
  );

  const liquidez = Number(
    typeof company?.liquidez === 'number'
      ? company.liquidez
      : company?.ratios?.liquidezCorriente?.value != null
        ? company.ratios.liquidezCorriente.value
        : 1.5
  );

  const apalancamiento = company?.deudaEbitda != null
    ? `${company.deudaEbitda}x`
    : company?.deudaPatrimonio != null
      ? `${company.deudaPatrimonio}x`
      : company?.ratios?.endeudamiento?.value != null
        ? `${Number(company.ratios.endeudamiento.value).toFixed(2)}x`
        : '1.8x';

  const ke = Number(company?.ke || company?.costOfEquity || 9.5);
  const moat: 'Amplio' | 'Medio' | 'Ninguno' = company?.moat || modeloNegocio?.moat || 'Medio';
  const margenSeguridad = upside_potential;

  const fundamental: FundamentalContext = {
    ticker,
    nombre,
    sector,
    precio,
    precioObjetivo,
    upside_potential,
    margenSeguridad,
    recommendation,
    number_of_analysts,
    roe: Math.round(roe * 10) / 10,
    liquidez: Math.round(liquidez * 100) / 100,
    apalancamiento,
    ke: Math.round(ke * 10) / 10,
    moat,
    queHace: modeloNegocio.queHace,
    comoGanaDinero: modeloNegocio.comoGanaDinero
  };

  // Técnico: Acción del precio actual, EMA 20, EMA 50, EMA 200, lectura de RSI (14) y estructura de MACD
  const ema20 = Number(company?.ema20 || Math.round(precio * 1.01 * 10) / 10);
  const ema50 = Number(company?.ema50 || company?.ema40 || Math.round(precio * 0.97 * 10) / 10);
  const ema200 = Number(company?.ema200 || Math.round(precio * 0.94 * 10) / 10);
  const rsi = Number(company?.rsi || 52.0);

  const macdLine = company?.macdLine ?? (precio >= ema200 ? 0.85 : -0.75);
  const macdSignal = company?.macdSignal ?? (precio >= ema200 ? 0.60 : -0.50);
  const macdHist = company?.macdHist ?? Math.round((macdLine - macdSignal) * 100) / 100;

  const soporte = Number(company?.soporte || Math.round(precio * 0.92 * 10) / 10);
  const resistencia = Number(company?.resistencia || Math.round(precio * 1.15 * 10) / 10);
  const stopLoss = Number(company?.stopLoss || Math.round(soporte * 0.97 * 10) / 10);

  const distanciaRiesgo = Math.max(0.1, Math.round((precio - stopLoss) * 100) / 100);
  const distanciaBeneficio = Math.max(0.0, Math.round((resistencia - precio) * 100) / 100);
  const ratioRB = Math.round((distanciaBeneficio / distanciaRiesgo) * 10) / 10;

  const technical: TechnicalContext = {
    ticker,
    nombre,
    precio,
    ema20,
    ema50,
    ema200,
    rsi: Math.round(rsi * 10) / 10,
    macd: {
      line: Math.round(macdLine * 100) / 100,
      signal: Math.round(macdSignal * 100) / 100,
      hist: Math.round(macdHist * 100) / 100
    },
    soporte,
    resistencia,
    stopLoss,
    ratioRB
  };

  return { fundamental, technical };
}

export type QueryTopic =
  | 'rsi'
  | 'roe'
  | 'liquidez'
  | 'apalancamiento'
  | 'consenso_wall_street'
  | 'margen_seguridad'
  | 'ke'
  | 'moat'
  | 'ema'
  | 'macd'
  | 'soporte_resistencia'
  | 'riesgo_beneficio'
  | 'precio'
  | 'general';

/**
 * Clasifica la intención de la consulta para activar el Enfoque Estricto (Strict Query Focus)
 */
export function classifyQuery(q: string): QueryTopic {
  const norm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Si la consulta solicita diagnóstico general, análisis global, evaluación completa o combina múltiples conceptos
  const isGeneral =
    /\b(diagnostico|general|evalua|evaluar|analisis general|analisis completo|vision general|panorama|como ves|que opinan|informe completo|resumen integral|diagnostico general)\b/.test(norm) ||
    (/\b(fundamental|negocio|buffett|value investing|roe|balance)\b/.test(norm) && /\b(tecnico|grafico|pantalla|guangui|rsi|ema|macd)\b/.test(norm));

  if (isGeneral) {
    return 'general';
  }

  if (/\brsi\b/.test(norm)) return 'rsi';
  if (/\broe\b/.test(norm)) return 'roe';
  if (/\b(liquidez|razon corriente|prueba acida|capital de trabajo|current ratio)\b/.test(norm)) return 'liquidez';
  if (/\b(apalancamiento|deuda|endeudamiento|leverage|deuda\/ebitda)\b/.test(norm)) return 'apalancamiento';
  if (/\b(margen de seguridad|valor intrinseco|precio objetivo|consenso de analistas|potencial alcista|objetivo de analistas|objetivo medio|recomendacion de analistas|target mean)\b/.test(norm)) return 'consenso_wall_street';
  if (/\b(k_e|ke|costo de capital|costo del capital|cost of equity)\b/.test(norm)) return 'ke';
  if (/\b(moat|foso|ventaja competitiva|pricing power)\b/.test(norm)) return 'moat';
  if (/\b(ema|medias moviles|media movil|promedios moviles|promedio movil)\b/.test(norm)) return 'ema';
  if (/\bmacd\b/.test(norm)) return 'macd';
  if (/\b(soporte|resistencia|soportes|resistencias)\b/.test(norm)) return 'soporte_resistencia';
  if (/\b(stop loss|riesgo beneficio|riesgo\/beneficio|take profit)\b/.test(norm)) return 'riesgo_beneficio';
  if (/\b(precio actual|accion del precio|cotizacion|precio de mercado)\b/.test(norm)) return 'precio';

  return 'general';
}

/**
 * Genera la respuesta especializada de Jairo Agudelo aplicando el Enfoque Estricto
 */
function buildJairoAnalysis(
  pregunta: string,
  fundamental: FundamentalContext,
  technical: TechnicalContext,
  topic: QueryTopic
): string {
  const { ticker, nombre, sector, roe, liquidez, apalancamiento, upside_potential, ke, moat, precio, precioObjetivo, recommendation, number_of_analysts, queHace, comoGanaDinero } = fundamental;
  const { ema20, ema200, soporte, resistencia } = technical;

  switch (topic) {
    case 'roe':
      return (
        `Para ${nombre} (${ticker}), el ROE (Retorno sobre Patrimonio) actual es del **${roe}%**. Este es el indicador central del Value Investing: mide cuánto beneficio genera la compañía por cada dólar de patrimonio neto de sus accionistas.\n\n` +
        `🧠 **CÓMO INTERPRETARLO:** ${roe >= 20 ? 'Un ROE superior al 20% se considera excelente y es típico de empresas con un moat amplío y poder de fijación de precios.' : roe >= 15 ? 'Un ROE entre 15-20% es saludable y está dentro del rango que buscaría Warren Buffett.' : roe >= 10 ? 'Un ROE entre 10-15% es aceptable pero no destacable.' : 'Un ROE inferior al 10% indica una creación de valor muy limitada sobre el capital invertido.'}\n\n` +
        `💰 **CONTRAVENTA CON NUESTRO K_e:** Nuestro costo de capital propio (K_e) estimado es del **${ke}%** (lo que exigiríamos como retorno mínimo por el riesgo asumido). El negocio ${roe >= ke ? `CREA valor real: genera ${(roe - ke).toFixed(1)} puntos porcentuales POR ENCIMA de nuestro costo de capital — esto es exactamente lo que multiplica el patrimonio del accionista año tras año.` : `NO supera el umbral de creación de valor: su ROE del ${roe}% está por DEBAJO del K_e del ${ke}%, lo que significa que destruye valor aunque los beneficios contables sean positivos.`}\n\n` +
        `📚 **CONTEXTUALIZADO EN ${nombre}:** ${queHace} ${comoGanaDinero}.`
      );

    case 'liquidez':
      return (
        `La Liquidez Corriente (Razón Corriente) de ${nombre} (${ticker}) se ubica en **${liquidez}x** — por cada dólar de deuda a corto plazo, la compañía dispone de $${liquidez} en activos circulantes (efectivo, cuentas por cobrar, inventario) para responder.\n\n` +
        `🛡️ **INTERPRETACIÓN:** ${liquidez >= 1.5 ? 'Una razón superior a 1.5x denota una tesorería holgada y capacidad sobrada para honrar obligaciones a corto plazo sin estrés financiero.' : liquidez >= 1.0 ? 'Una razón entre 1.0x y 1.5x es operativa: cumple con lo mínimo necesario, pero deja poco margen para imprevistos.' : 'Una razón inferior a 1.0x (pasivos circulantes superan a activos circulantes) es una ALERTA ROJA de estrechez de liquidez inmediata y posible vulnerabilidad de solvencia.'}\n\n` +
        `🔄 **CONTEXTO SECTORIAL:** Como empresa del sector ${sector.toLowerCase()}, ${liquidez >= 1.0 ? 'esta liquidez es consistente con una gestión de capital de trabajo eficiente.' : 'este nivel de liquidez requiere supervisión activa del working capital, ya que cualquier contracción del crédito o caída de ventas podría tensionar el balance.'} Comparado con la norma general del mercado (donde 1.5-2.0x es el rango cómodo), ${liquidez >= 1.5 ? 'estamos bien posicionados' : liquidez >= 1.0 ? 'estamos en el mínimo operativo' : 'estamos en terreno peligroso'}.`
      );

    case 'apalancamiento':
      return (
        `El nivel de Apalancamiento de ${nombre} (${ticker}) es de **${apalancamiento}**.\n\n` +
        `🏦 **CÓMO SE CALCULA:** ${Number(String(apalancamiento).replace(/[^0-9.]/g, '')) > 2.9 ? 'Se mide sobre la relación Deuda/EBITDA (cuántos años de beneficios operativos brutos se necesitan para pagar la deuda total).' : 'Se mide sobre la relación Deuda/Patrimonio (cuánta deuda financiada hay por cada dólar de patrimonio de los accionistas).'}\n\n` +
        `⚖️ **EVALUACIÓN:** ${
          Number(String(apalancamiento).replace(/[^0-9.]/g, '')) <= 2.5
            ? 'Un apalancamiento bajo (≤ 2.5x) se considera saludable y sostenible: los intereses son una carga manejable frente al EBITDA y no erosionan sustancialmente el margen neto.'
            : Number(String(apalancamiento).replace(/[^0-9.]/g, '')) <= 4.0
              ? 'Un apalancamiento moderado (2.5x-4.0x) es admisible si el negocio genera flujos estables y recurrentes, pero deja menos colchón ante recesiones.'
              : 'Un apalancamiento elevado (> 4.0x) es una bandera amarilla: los intereses consumen gran parte del beneficio operativo y cualquier caída de ingresos compromete la capacidad de pago.'}\n\n` +
        `🧮 **IMPACTO EN EL ACCIONISTA:** Con este nivel de deuda, el riesgo financiero reduce la atracción del valor de ${ticker}. La clave es que el ROE del ${roe}% (sobre patrimonio) compense el coste de ese endeudamiento; en un entorno de tipos altos, la deuda cara presiona márgenes y crecimiento.`
      );

    case 'consenso_wall_street':
    case 'margen_seguridad':
      return (
        `El Potencial Alcista estimado frente al consenso de analistas de Wall Street para ${nombre} (${ticker}) es del **${upside_potential}%**:\n\n` +
        `• **Precio actual de mercado:** $${precio}\n` +
        `• **Precio objetivo promedio** (media de ${number_of_analysts} analistas): $${precioObjetivo}\n` +
        `• **Recomendación dominante:** ${recommendation}\n\n` +
        `🎯 **EVALUACIÓN DEL MARGEN DE SEGURIDAD:** ${
          upside_potential >= 15
            ? 'Este es el escenario ideal para un inversor value: un margen de seguridad superior al 15% significa que el consenso anticipa una apreciación sustancial y ya hay un colchón amplio contra errores de análisis.'
            : upside_potential >= 5 && upside_potential < 15
              ? 'El margen de seguridad es positivo pero modesto. El precio actual ya descuenta buena parte del valor futuro; solo es atractivo si tienes convicción propia para superar el consenso.'
              : upside_potential >= 0
                ? 'El potencial es nulo (cotización alineada con el consenso): no hay margen de seguridad. Comprar a precio de consenso significa apostar contra Wall Street sin ventaja matemática.'
                : `ALERTA: El consenso sitúa el objetivo promedio en $${precioObjetivo}, ${Math.abs(upside_potential).toFixed(0)}% POR DEBAJO del precio actual de $${precio}. Wall Street es bajista sobre ${ticker}; el mercado anticipa deterioro de resultados.`}\n\n` +
        `📊 **RECOMENDACIÓN:** ${
          upside_potential >= 15
            ? 'Un inversor value vería aquí una zona de acumulación atractiva, siempre que la calidad del negocio (ROE, foso, balance) también respalde la tesis.'
            : upside_potential >= 5
              ? 'Zona de observación: espera una corrección del mercado que empuje el precio más cerca del objetivo medio y amplíe tu margen de seguridad.'
              : 'No se compra con el precio por encima del objetivo medio de analistas. O esperas un bajón de cotización, o buscas otra empresa con mejor relación precio/valor.'
        }`
      );

    case 'ke':
      return (
        `El Costo de Capital Propio (K_e) estimado para ${nombre} (${ticker}) es del **${ke}%**, calculado vía CAPM (tasa libre de riesgo + prima de riesgo del mercado × apalancamiento beta de la acción).\n\n` +
        `💡 **QUÉ SIGNIFICA:** El K_e es la rentabilidad MÍNIMA exigible que debería generar ${ticker} para justificar invertir en ella en lugar de en otros activos de riesgo comparable. Es nuestro "precio de entrada" teórico: si el negocio no remunera el capital por encima de este % , estamos perdiendo oportunidad.\n\n` +
        `📉 **COMPARATIVA CON EL ROE:** El ROE real de la compañía es del **${roe}%**:\n` +
        `${roe >= ke
          ? `✅ **CREACIÓN DE VALOR:** El negocio rinde ${(roe - ke).toFixed(1)} pp POR ENCIMA de nuestro K_e. Este diferencial positivo es el motor que hace crecer el valor intrínseco de la acción año tras año — el negocio usa el capital de los accionistas mejor de lo que ellos mismos podrían hacerlo.\n\n` +
            `Con un K_e del ${ke}% y un ROE del ${roe}%, ${ticker} está operando muy por encima de su umbral mínimo de rentabilidad, lo que suele reflejar un modelo de negocio con pricing power y/o ventajas competitivas duraderas.`
          : `⚠️ **DESTRUCCIÓN DE VALOR:** El negocio rinde ${(ke - roe).toFixed(1)} pp POR DEBAJO de nuestro K_e. Aunque contablemente gane dinero, no está remunerando el capital tan bien como otros usos alternativos del mismo.\n\n` +
            `Un ROE del ${roe}% contra un K_e del ${ke}% indica que el modelo actual no genera el retorno mínimo exigido por su nivel de riesgo. Solo tendría sentido mantener si la empresa está en una fase de reinversión agresiva con retorno futuro esperado.`}\n\n` +
        `🏛️ **CONTEXTO DE TIPOS:** Este K_e del ${ke}% asume un entorno de tipos de interés actuales; si las tasas libres de riesgo suben, el K_e sube y más empresas dejan de crear valor. Vigila este umbral.`
      );

    case 'moat':
      return (
        `El Foso Económico (Moat) de ${nombre} (${ticker}) está calificado como **${moat}** (escala: Ninguno / Medio / Amplio).\n\n` +
        `🏰 **QUÉ ES UN MOAT:** Es la ventaja competitiva DURADERA que protege los beneficios de la compañía frente a la competencia y le permite mantener márgenes altos durante años o décadas — sin foso, los beneficios atraen competidores y los márgenes vuelven a la media del sector.\n\n` +
        `📋 **CALIFICACIÓN APLICADA A ${ticker}:**\n` +
        `${moat === 'Amplio'
          ? '✅ **Foso amplio:** ${nombre} posee una o varias barreras de entrada formidables (marcas globalmente reconocidas con pricing power, costes de cambio altísimos para los clientes, efectos de red, ventajas de escala masiva o patentes regulatorias). Históricamente, las empresas con foso amplio generan ROE sostenido superior al 20% sobre el capital.\n\n'
          : moat === 'Medio'
            ? '⚠️ **Foso medio:** ${nombre} tiene ventajas competitivas reales pero parcialmente replicables o con límites (niche de mercado, calidad del producto, eficiencia operativa). Protege parte de los márgenes, pero la competencia puede erosionarlos con el tiempo.\n\n'
            : '🚩 **Sin foso significativo:** ${nombre} compite en un entorno de mercado donde los precios los fija la oferta y la demanda. Sin barreras de entrada, los beneficios tenderán al promedio del sector y el ROE caerá si la gestión no es excepcional.'}\n\n` +
        `📖 **EN POCAS PALABRAS SOBRE ${ticker}:** ${queHace} ${comoGanaDinero}.`
      );

    case 'rsi':
      return `El RSI (Índice de Fuerza Relativa) es un oscilador técnico de momentum (rango 0-100) que corresponde a la disciplina de Juan Guillermo en lugar del análisis fundamental de Jairo.\n\n` +
        `🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Jairo se centra en calidad de negocio, solvencia y creación de valor (ROE del **${roe}%** vs K_e del **${ke}%), no en osciladores de corto plazo que solo miden fuerza de compra/venta relativa en el precio.\n\n` +
        `🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Mientras el RSI te dice si el precio está "sobrecomprado" (>70) o "sobreventido" (<30) en lo táctico, lo que realmente importa para una inversión de valor es: si el precio actual de **$${precio}** está muy por debajo del valor intrínseco estimado y el negocio tiene un ROE del **${roe}%** creando valor frente a un K_e del **${ke}%**. En mi visión, los osciladores de precio no predicen el valor; el valor se determina con los estados financieros, no con la psicología del mercado.`;

    case 'ema':
      return `Las medias móviles exponenciales (EMA) son promedios estadísticos del precio con peso en los datos recientes — herramientas de la disciplina técnica de Juan Guillermo, no del análisis fundamental.\n\n` +
        `🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** El análisis de Jairo no opera con líneas dibujadas en un gráfico; se basa en la economía real de la empresa. Para Jairo, la "tendencia" verdadera de ${ticker} no la marca la EMA 20 ($${ema20}) ni la EMA 200 ($${ema200}), sino que la marca su ROE de **${roe}%** frente a su K_e de **${ke}%, su liquidez de **${liquidez}x** y su apalancamiento de **${apalancamiento}**.\n\n` +
        `🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Un inversor value mira el valor intrínseco. Si el precio de mercado de **$${precio}** está muy por debajo del valor intrínseco y el negocio es sólido (ROE alto, balance sano), una caída del precio es una OPORTUNIDAD, no una señal de "ruptura de tendencia". Los gráficos miden dónde ha estado el precio; los fundamentales dicen dónde debería estar.`;

    case 'macd':
      return `El MACD (Convergencia/Divergencia de Medias Móviles) es un oscilador de tendencia derivado de precios, instrumento de Juan Guillermo, no de Jairo.\n\n` +
        `🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Para Jairo, la dirección del valor de ${ticker} no se lee en la divergencia de un MACD, sino en sus fundamentales: ROE del **${roe}%** vs K_e del **${ke}%, liquidez de **${liquidez}x**, apalancamiento de **${apalancamiento}** y generación de flujo de caja libre.\n\n` +
        `🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** El MACD puede dar señales falsas en mercados volátiles o cuando el precio se desvía temporalmente del valor. Para Jairo, lo que importa es: el negocio de ${ticker} ¿crea valor con su capital? (ROE **${roe}%** > K_e **${ke}%**). Esa respuesta determina el valor; el MACD solo describe el ritmo del precio.`;

    case 'soporte_resistencia':
      return `Los niveles de soporte y resistencia son memoria de precios históricos, métricas operadas por Juan Guillermo en el plano técnico.\n\n` +
        `🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Jairo no dibuja soportes en **$${soporte}** ni resistencias en **$${resistencia}**; Jairo dibuja el "precio justo" de ${ticker} a partir de sus beneficios y su creación de valor, no de su historia de cotizaciones.\n\n` +
        `🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Para un value investor, la pregunta no es "¿dónde rebota el precio?" sino "¿a qué precio compramos con margen de seguridad?". Con un consenso que fija el objetivo medio en $${precioObjetivo} y un margen de seguridad del **${upside_potential}%** frente al precio actual de $${precio}, ahí es donde Jairo coloca su interés, no en los niveles históricos del gráfico.`;

    case 'riesgo_beneficio':
      return `La relación riesgo/beneficio (minimo 2:1) es la regla operativa de gestión de trade de Juan Guillermo en la pantalla.\n\n` +
        `🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Jairo no mide riesgo/beneficio en el precio inmediato, sino en el balance y la calidad del negocio: el verdadero riesgo de ${ticker} no es un Stop Loss, es que el ROE caiga por debajo de su K_e del **${ke}%, que el apalancamiento de **${apalancamiento}** se vuelva insostenible o que el foso económico (**${moat}**) se erosioné.\n\n` +
        `🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** El riesgo fundamental de ${ticker} se cuantifica con el apalancamiento (**${apalancamiento}**), la liquidez (**${liquidez}x**) y el margen de seguridad frente al consenso (**${upside_potential}%**). Un negocio con ROE del **${roe}%** y un foso amplio es un "buen riesgo" a largo plazo, aunque el gráfico parezca volátil hoy.`;

    case 'precio':
      return `La cotización actual de mercado para ${nombre} (${ticker}) es de **$${precio}**.\n\n` +
        `📊 **ENCIMA O DEBAJO DEL VALOR:** Frente al objetivo promedio del consenso de analistas de **$${precioObjetivo}** (con ${number_of_analysts} analistas y recomendación **${recommendation}**), el precio actual cotiza ${precio >= precioObjetivo ? 'por encima' : 'por debajo'} del consenso: ${
          precio >= precioObjetivo
            ? 'El mercado valora a la compañía MÁS de lo que los analistas esperan que valga — hay que preguntarse si ese sobreprecio está justificado por una ventaja competitiva real o es euforia especulativa.'
            : 'El mercado está valorando a la compañía POR DEBAJO del consenso: podría ser una oportunidad de descuento sobre el valor o el mercado está anticipando problemas que los analistas no han previsto.'}\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** ${
          precio < precioObjetivo
            ? `A $${precio}, el mercado parece estar descontando a ${ticker} con un margen de seguridad del **${upside_potential}%** frente al precio objetivo medio de $${precioObjetivo}. Es en este tipo de escenarios —precio inferior al valor estimado y negocio con ROE de **${roe}%** frente a un K_e de **${ke}%**— donde un value investor considera acumular.`
            : `A $${precio}, por encima del objetivo medio de $${precioObjetivo}, la relación riesgo/retorno es menos atractiva. Jairo sugeriría esperar a una corrección que acerque el precio al valor estimado, o descartar la entrada si el negocio no justifica ese sobreprecio con un crecimiento de beneficios sostenido.`}`;

    case 'general':
    default: {
      const esSaludable = roe >= 15 && Number(String(apalancamiento).replace(/[^0-9.]/g, '')) <= 3.5;
      const tieneDescuento = upside_potential > 5;

      let dictamen = '';
      if (esSaludable && tieneDescuento) {
        dictamen = `Vemos una oportunidad de valor sólida con potencial alcista del ~${upside_potential}% frente al consenso de analistas. El negocio genera caja abundante y crea valor (ROE ${roe}% > K_e ${ke}%). Recomendación fundamental: apta para acumulación metódica con horizonte de mediano a largo plazo.`;
      } else if (esSaludable && !tieneDescuento) {
        dictamen = `El negocio es extraordinario en calidad y retorno sobre el capital (ROE ${roe}%), pero el consenso de analistas no ofrece potencial alcista suficiente a precio actual. Sugiero paciencia y aguardar una corrección para entrar a mejor precio.`;
      } else {
        dictamen = `Alerta fundamental: la estructura de balance muestra fragilidad (Apalancamiento de ${apalancamiento} o ROE deficiente de ${roe}%). No hay margen de seguridad que compense el riesgo. Sugiero abstenerse hasta ver saneamiento contable.`;
      }

      return (
        `Recordemos que esta es una visión pedagógica propia y no constituye una recomendación de inversión vinculante.\n\n` +
        `🏢 **1. EL NEGOCIO PRIMERO: ¿QUÉ HACE Y CÓMO GANA DINERO?**\n` +
        `• **¿Qué hace ${nombre}?:** ${queHace}\n` +
        `• **¿Cómo gana dinero?:** ${comoGanaDinero}\n\n` +
        `📊 **2. SALUD FINANCIERA Y ESTRUCTURA DE BALANCE:**\n` +
        `Llevándolo al "coquito" con **${nombre} (${ticker})**:\n` +
        `• **Fondeo y Deuda:** Apalancamiento en torno a **${apalancamiento}** con Liquidez Corriente de **${liquidez}x**. El foso económico (Moat) es **${moat}**.\n` +
        `• **Creación de Valor:** El ROE se ubica en el **${roe}%**, frente a un costo de capital (K_e) estimado del **${ke}%**.\n` +
        `• **Consenso de Analistas:** Cotiza a **$${precio}** | Objetivo medio **$${precioObjetivo}** (${upside_potential}% upside) | ${recommendation} · ${number_of_analysts} analistas.\n\n` +
        `🔍 **3. DIAGNÓSTICO DETALLADO POR DIMENSIÓN:**\n` +
        `• **Rentabilidad:** Con un ROE del **${roe}%**, la compañía ${roe >= ke ? `supera el umbral de creación de valor frente a un K_e del ${ke}%.` : 'no alcanza a remunerar el coste de oportunidad del capital (ROE ${roe}% < K_e ${ke}%).'}\n` +
        `• **Liquidez:** La Razón Corriente de **${liquidez}x** ${liquidez >= 1.5 ? 'ofrece un colchón amplio de solvencia.' : liquidez >= 1.0 ? 'cubre el mínimo operativo.' : 'es un punto de atención por estrechez de tesorería.'}\n` +
        `• **Apalancamiento:** El nivel de **${apalancamiento}** ${Number(String(apalancamiento).replace(/[^0-9.]/g, '')) <= 2.5 ? 'es saludable y sostenible.' : 'exige disciplina frente a subidas de tipos.'}\n` +
        `• **Foso Económico:** Calificado como **${moat}** para una empresa ${sector.toLowerCase()}: ${moat === 'Amplio' ? 'las ventajas competitivas protegen márgenes a largo plazo.' : moat === 'Medio' ? 'las ventajas existen pero son parcialmente replicables.' : 'la competencia presiona los retornos hacia la media.'}\n` +
        `• **Margen de Seguridad:** El consenso valora a la empresa en **$${precioObjetivo}**; a un precio actual de **$${precio}**, el potencial alcista es del **${upside_potential}%**, ${upside_potential >= 15 ? 'lo que constituye un margen de seguridad atractivo.' : upside_potential >= 0 ? 'un margen de seguridad positivo pero moderado.' : 'negativo: el consenso anticipa depreciación.'}\n\n` +
        `🎯 **4. DICTAMEN FUNDAMENTAL DE JAIRO:** ${dictamen}`
      );
    }
  }
}

/**
 * Genera la respuesta especializada de Juan Guillermo Hernández aplicando el Enfoque Estricto
 */
function buildGuillermoAnalysis(
  pregunta: string,
  fundamental: FundamentalContext,
  technical: TechnicalContext,
  topic: QueryTopic
): string {
  const { ticker, nombre, precio, ema20, ema50, ema200, rsi, macd, soporte, resistencia, stopLoss, ratioRB } = technical;

  switch (topic) {
    case 'rsi':
      return (
        `Para ${nombre} (${ticker}), la lectura del **RSI (14)** se ubica en **${rsi} puntos** (rango 0-100).\n\n` +
        `🧠 **QUÉ MIDE EL RSI:** El Índice de Fuerza Relativa es un oscilador que compara la magnitud de las subidas recientes frente a las caídas en los últimos 14 períodos. No predice el precio: mide la FUERZA DEL IMPULSO de compra/venta reciente.\n\n` +
        `📍 **ZONA ACTUAL (${rsi} puntos):**\n` +
        `${rsi > 70
          ? `🔴 **ZONA DE SOBRECOMPRA (>70):** El impulso comprador se está agotando. Históricamente, entradas en RSI > 70 tienen probabilidad elevada de reversionarse hacia el nivel medio (50). En mi operativa: NO comprar aquí. Si ya tienes posición, ceñir el Stop Loss para proteger utilidades y mirar señales de saturación (divergencias con el precio).\n` +
            `• **Acción recomendada:** Reducir posición a nivel defensivo, no tomar nuevas entradas hasta que el RSI retroceda del 50-60 y confirme rebote.`
          : rsi < 30
            ? `🟢 **ZONA DE SOBREVENTA (<30):** El impulso vendedor está agotado. Históricamente, rebotes tácticos suelen dispararse desde RSI < 30 si el precio defiende el soporte relevante. En mi operativa: es el momento de preparar una entrada de rebote, NUNCA comprar "en el vacío".\n` +
              `• **Acción recomendada:** Preparar orden de entrada condicional si el precio rebota desde el soporte de $${soporte} con volumen creciente y el RSI cruza por encima de 30.`
            : `🟡 **ZONA NEUTRAL / CONSTRUCTIVA (30-70):** El momentum es mixto, sin distorsión extrema. En mi lectura, el precio puede continuar en cualquier dirección; la señal decisiva está en si el RSI rompe el 70 (alta) o el 30 (baja) con volumen.\n` +
              `• **Acción recomendada:** Mantener posición, supervisar el cruce del precio frente a la EMA 20 ($${ema20}) como señal de impulso.`
        }\n\n` +
        `📊 **CONTEXTO COMPLETO PARA ${ticker}:** Con precio actual en **$${precio}**, la EMA 20 en **$${ema20}** y la EMA 50 en **$${ema50}**, el contexto del RSI está ${precio > ema20 ? 'acompañando una estructura de precio sobre la EMA 20, lo que refuerza la lectura' : 'contra una estructura de precio por debajo de la EMA 20, lo que mitiga la señal del oscilador'}.`
      );

    case 'ema':
      return (
        `Para ${nombre} (${ticker}), los niveles de medias móviles exponenciales son:\n\n` +
        `• **EMA 20 (corto plazo):** $${ema20}\n` +
        `• **EMA 50 (mediano plazo):** $${ema50}\n` +
        `• **EMA 200 (estructural / directriz de tendencia de fondo):** $${ema200}\n\n` +
        `📍 **POSICIÓN DEL PRECIO ($${precio}):**\n` +
        `El precio actual cotiza ${precio >= ema200 ? 'por **ENCIMA**' : 'por **DEBAJO**'} de la EMA 200 de **$${ema200}** — la directriz estructural que separa tendencia alcista de bajista de fondo.\n\n` +
        `🧠 **QUÉ SIGNIFICA EN MI LECTURA TÉCNICA:**\n` +
        `${precio >= ema200
          ? `✅ **TENDENCIA ALCISTA CONFIRMADA:** El precio sobre la EMA 200 valida la directriz de fondo. Las caídas hacia la EMA 50 ($${ema50}) suelen ser correcciones temporales antes de la continuación del impulso alcista. No se opera en contra de la tendencia de fondo.\n` +
            `• **Plano operativo:** Buscar entradas en retrocesos hacia la EMA 50, con Stop Loss bajo el soporte de $${soporte}. Las pullbacks son oportunidades, no señales de salida.`
          : `❌ **TENDENCIA BAJISTA / CORRECTIVA:** El precio por debajo de la EMA 200 indica sesgo de fondo bajista o fase correctiva. Mi regla mecánica: NO COMPRAMOS CUCHILLOS CAYENDO. En un mercado bajista, cada rebote es una oportunidad de reducir posición, no de entrar.\n` +
            `• **Plano operativo:** Esperar a que el precio rebase la EMA 50 ($${ema50}) con volumen y no retroceda a la EMA 200 antes de considerar cualquier entrada.`
        }\n\n` +
        `📐 **DISTRIBUCIÓN DE MEDIAS:** EMA 20 ($${ema20}) ${precio > ema20 ? 'por debajo del precio' : 'por encima del precio'} — ${precio > ema20 ? 'impulso de corto plazo a favor de la posición' : 'presión a corto plazo que requiere vigilancia'}; EMA 50 ($${ema50}) ${precio > ema50 ? 'por debajo del precio, confirmando estructura constructiva' : 'por encima del precio, señal de debilidad a mediano plazo'}.`
      );

    case 'macd':
      return (
        `La estructura del **MACD (12/26/9)** para ${nombre} (${ticker}) registra:\n\n` +
        `• **Línea MACD (corto plazo):** ${macd.line > 0 ? '+' : ''}${macd.line.toFixed(2)}\n` +
        `• **Línea de Señal (largo plazo):** ${macd.signal.toFixed(2)}\n` +
        `• **Histograma (diferencia entre líneas):** ${macd.hist > 0 ? '+' : ''}${macd.hist.toFixed(2)}\n\n` +
        `🧠 **QUÉ MIDE EL MACD:** El MACD es un oscilador de momentum que mide la relación entre dos medias móviles (EMA 12 y EMA 26). Cuando la Línea cruza la Línea de Señal hacia arriba, genera señal de compra; hacia abajo, señal de venta. El histograma amplifica esa señal.\n\n` +
        `📍 **LECTURA ACTUAL:**\n` +
        `${macd.hist >= 0
          ? `🟢 **HISTOGRAMA POSITIVO (+${macd.hist.toFixed(2)}):** El momentum comprador está activo y en aceleración. La Línea MACD está por encima de la Línea de Señal, confirmando que el impulso reciente supera la media histórica.\n` +
            `• **Señal operativa:** Favorable para mantener entradas o tomar entradas tácticas. Vigila que el histograma NO comience a encogerse (contracción = agotamiento del impulso).`
          : `🔴 **HISTOGRAMA NEGATIVO (${macd.hist.toFixed(2)}):** Presión vendedora o agotamiento del impulso. La Línea MACD está por debajo de la Línea de Señal.\n` +
            `• **Señal operativa:** Evitar entradas nuevas. Si hay posición abierta, considera reducir riesgo y apretar el Stop Loss. Esperar a que el histograma cruce en positivo con volumen.`
        }\n\n` +
        `📊 **CONTEXTO DE TENDENCIA:** Con el precio en **$${precio}**, el MACD debe leerse junto a la tendencia global sobre la EMA 200 (**$${ema200}**). Un MACD positivo en un precio POR DEBAJO de la EMA 200 es un rebote temporal dentro de una tendencia mayor; un MACD negativo en un precio SOBRE la EMA 200 es una corrección dentro de una tendencia alcista de fondo.`
      );

    case 'soporte_resistencia':
      return (
        `Para ${nombre} (${ticker}), los niveles clave de memoria de precios son:\n\n` +
        `• **Soporte relevante:** $${soporte}\n` +
        `• **Resistencia técnica mayor:** $${resistencia}\n` +
        `• **Precio actual:** $${precio}\n` +
        `• **Stop Loss sugerido:** $${stopLoss}\n\n` +
        `🧠 **QUÉ SON ESTOS NIVELES:**\n` +
        `El soporte es el "suelo" donde el precio ha defendido históricamente su compra; la resistencia es el "techo" donde las ventas se han materializado. Son las "memorias" del mercado —precios donde el consenso operativo de compra y venta coincide.\n\n` +
        `📍 **DISTANCIAS DE OPERACIÓN:**\n` +
        `• **Riesgo asumido (precio → Stop Loss):** $${(precio - stopLoss).toFixed(2)} por acción (≈ ${((precio - stopLoss) / precio * 100).toFixed(1)}%)\n` +
        `• **Beneficio objetivo (precio → Resistencia):** $${(resistencia - precio).toFixed(2)} por acción (≈ ${((resistencia - precio) / precio * 100).toFixed(1)}%)\n\n` +
        `⚖️ **RELACIÓN RIESGO/BENEFICIO RESULTANTE:** ${ratioRB.toFixed(1)}:1 ${ratioRB >= 2.0 ? '✅ CUMPLE la regla de oro de mínimo 2:1' : '❌ NO CUMPLE la regla de oro de mínimo 2:1'}\n\n` +
        `📋 **PLAN DE NIVEL:**\n` +
        `${ratioRB >= 2.0
          ? `Operación con ratio favorable: entrar a precio de mercado, con Stop Loss estricto en **$${stopLoss}** y objetivo en **$${resistencia}**. Gestión de posición: tomar el 50% de utilidades al +25% y gerenciar el resto con Trailing Stop vela a vela.`
          : `Operación NO válida bajo mi disciplina: el recorrido hacia la resistencia ($${resistencia}) no cubre el doble del riesgo asumido al Stop Loss ($${stopLoss}). O esperar un pullback hacia el soporte para ceñir el Stop Loss, o descartar el trade y buscar un activo con mejor ratio riesgo/beneficio.`}`
      );

    case 'riesgo_beneficio':
      return (
        `Para ${nombre} (${ticker}), la relación Riesgo/Beneficio calculada es de **${ratioRB.toFixed(1)}:1**.\n\n` +
        `🧠 **MATEMÁTICA DEL RIESGO:**\n` +
        `• **Precio de entrada:** $${precio}\n` +
        `• **Stop Loss:** $${stopLoss} (riesgo: $${(precio - stopLoss).toFixed(2)} por acción)\n` +
        `• **Objetivo (resistencia):** $${resistencia} (beneficio: $${(resistencia - precio).toFixed(2)} por acción)\n\n` +
        `El ratio = Beneficio objetivo / Riesgo asumido = $${(resistencia - precio).toFixed(2)} / $${(precio - stopLoss).toFixed(2)} = **${ratioRB.toFixed(1)}:1**\n\n` +
        `⚖️ **VEREDICTO BAJO MI REGLA DE ORO (MÍNIMO 2:1):**\n` +
        `${ratioRB >= 2.0
          ? `✅ **OPERACIÓN APROBADA:** El recorrido hacia la resistencia duplica con creces el riesgo asumido. Incluso si el 50% de mis entradas fallan (Stop Loss), las que ganan me compensan. Probabilidad matemática a favor: con ratio ${ratioRB.toFixed(1)}:1, solo necesito un ${Math.min(99, Math.round((1 / (1 + ratioRB)) * 100))}% de aciertos para ser rentable a largo plazo.\n` +
            `• **Stop Loss:** Estricto en $${stopLoss}, NO se mueve hacia arriba.\n` +
            `• **Gestión de salida:** Toma parcial al 50% del recorrido y Trailing Stop en el resto.`
          : `❌ **OPERACIÓN DESCARTADA:** Un ratio de ${ratioRB.toFixed(1)}:1 deja las probabilidades MATEMÁTICAMENTE en contra del operador. Necesitaría un ${Math.min(99, Math.round((1 / (1 + ratioRB)) * 100))}% de aciertos para ser rentable a largo plazo, lo cual es irreal.\n` +
            `• **No se opera.** O espero un retroceso que me permita ceñir el Stop Loss cerca del soporte de $${soporte} (mejorando el ratio), o descarto la operación y busco otro activo con mejor geometría de riesgo/beneficio.`}`
      );

    case 'precio':
      return (
        `La acción del precio actual de ${nombre} (${ticker}) cotiza en **$${precio}**.\n\n` +
        `📍 **POSICIÓN EN EL GRÁFICO:**\n` +
        `• **Frente a la EMA 200 (estructural $${ema200}):** ${precio >= ema200 ? 'por ENCIMA ✅ — directriz alcista' : 'por DEBAJO ❌ — sesgo correctivo/bajista'}\n` +
        `• **Frente a la EMA 50 (mediano plazo $${ema50}):** ${precio >= ema50 ? 'por ENCIMA ✅ — estructura de mediano plazo constructiva' : 'por DEBAJO ❌ — presión a mediano plazo'}\n` +
        `• **Frente a la EMA 20 (corto plazo $${ema20}):** ${precio >= ema20 ? 'por ENCIMA ✅ — impulso táctico positivo' : 'por DEBAJO ❌ — debilidad de corto plazo'}\n` +
        `• **Distancia al soporte:** $${soporte} (${((soporte - precio) / precio * 100).toFixed(1)}%)\n` +
        `• **Distancia a la resistencia:** $${resistencia} (${((resistencia - precio) / precio * 100).toFixed(1)}%)\n\n` +
        `🧠 **LECTURA TÉCNICA COMPLETA:**\n` +
        `Con RSI en **${rsi} puntos** y MACD histograma en **${macd.hist >= 0 ? '+' : ''}${macd.hist.toFixed(2)}** (\u00ae ${macd.hist >= 0 ? 'momentum comprador' : 'momentum vendedor'}), el precio en $${precio} se interpreta como ${
          precio >= ema200 && rsi < 70 && ratioRB >= 2
            ? 'una posición FAVORABLE: estructura alcista confirmada, momentum no agotado y ratio riesgo/beneficio mínimo de 2:1'
            : precio >= ema200 && ratioRB < 2
              ? 'una posición CUESTIONABLE: estructura alcista pero el ratio riesgo/beneficio actual no justifica armar posición'
              : 'una posición NO FAVORABLE: la tendencia y/o el momentum no confirman una entrada segura'
        }. La decisión operativa final depende de si el ratio ${ratioRB.toFixed(1)}:1 cumple mi estándar de 2:1.`
      );

    case 'roe':
      return `El ROE (Retorno sobre Patrimonio) es un indicador de rentabilidad contable que analiza Jairo Agudelo en el plano fundamental. En el plano técnico de pantalla me rijo por la acción del precio actual (**$${precio}**) y su posición respecto a la directriz estructurada por la EMA 200 (**$${ema200}**).\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un ROE bajo no significa automáticamente que el precio esté "barato". El precio refleja la expectativa del mercado. En mi lectura, un ROE en caída puede preceder una corrección técnica: si el precio de ${ticker} cae por debajo de la EMA 50 ($${ema50}) con RSI en ${rsi} y MACD histograma ${macd.hist < 0 ? 'negativo' : 'positivo'}, esa es la señal técnica que confirma que el mercado ya está descontando la debilidad fundamental.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** El problema del ROE no es solo un número contable; es la pr\xf3spera de lo que la EPS (ganancia por acci\xf3n) va a hacer en el futuro. Yo lo traduco a la pregunta: ¿quién va a pagar el precio actual de $${precio} si el beneficio por acci\xf3n cae? Ah\xed es donde el Stop Loss de $${stopLoss} protege al operario.`;

    case 'liquidez':
      return `La liquidez contable de balance es evaluada por Jairo en el plano fundamental. En la operativa bursátil, yo mido la liquidez por el VOLUMEN de negociaci\xf3n y la firmeza en el soporte de **$${soporte}** y resistencia de **$${resistencia}**.\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Una liquidez contable baja (Raci\xf3n Corriente < 1.0) puede manifestarse t\xe9cnicamente como ca\xeddas aceleradas del precio, falta de apoyo en los soportes y baches profundos. Si el balance de ${ticker} es fr\xe1gil, el precio puede romper el soporte de $${soporte} con volumen y la recuperaci\xf3n t\xe9cnica se dif\xedcil de ejecutar.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** La liquidez es un indicador de SUSTENTABILIDAD del negocio a largo plazo, no de la operaci\xf3n de hoy. Yo la traduzco a: ¿qu\xe9 tan r\xe1pido puede ca\xedr el precio si hay una noticia de tensi\xf3n financiera? La respuesta la da la distancia al Stop Loss de $${stopLoss}.`;

    case 'apalancamiento':
      return `El apalancamiento financiero corresponde a la auditor\xeda de balance de Jairo en el plano fundamental. En la disciplina de trading, yo controlo el riesgo mediante un Stop Loss estricto fijado en **$${stopLoss}** y exigiendo una relaci\xf3n riesgo/beneficio m\xednima de 2:1 (actualmente en **${ratioRB.toFixed(1)}:1**).\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un apalancamiento elevado (Deuda/EBITDA > 4x) suele manifestarse t\xe9cnicamente como una ca\xedda vol\xe1til del precio. Cuando el mercado descuenta la carga de intereses, el precio rompe soportes con fuerza y el RSI se profundiza por debajo de 30. Es el momento de la defensiva: ce\xf1ir el Stop Loss y no entrar.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** El apalancamiento es un dato contable de Jairo, pero tiene un eco t\xe9cnico en mi gr\xe1fico: mayor apalancamiento = mayor probabilidad de ca\xeddas violentas = m\xe1s espacios para el Stop Loss = peor ratio riesgo/beneficio. Yo lo traduzco a: ¿cu\xe1nto Stop Loss necesito para protegerme de una ca\xedda por apalancamiento? La respuesta actual es $${stopLoss}.`;

    case 'margen_seguridad':
      return `El margen de seguridad contable lo determina Jairo en el plano fundamental. En la lectura de pantalla, nuestro margen operativo lo da la relacci\xf3n Riesgo/Beneficio de **${ratioRB.toFixed(1)}:1**, verificando si el trayecto hacia la resistencia (**$${resistencia}**) justifica el riesgo asumido al Stop Loss (**$${stopLoss}**).\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** El margen de seguridad t\xe9cnico es m\xednimo si el precio est\xe1 muy lejos del soporte. Cuanto m\xe1s cercano est\xe9 el precio al soporte de $${soporte}, m\xe1s reducido es el Stop Loss y m\xe1s amplio es el recorrido hacia la resistencia de $${resistencia}. Ese es el margen operativo t\xe9cnico: no solo mirar cu\xe1nto puede subir, sino cu\xe1nto puede perder si falla.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** El margen de seguridad de Jairo es el "cu\xe1nto est\xe1 descontado". El margen t\xe9cnico es el "cu\xe1nto puedo perder en el peor caso". Juntos forman la decisi\xf3n: si el margen de seguridad es amplio y el margen t\xe9cnico es ajustado, el trade es de alta convicci\xf3n. Si el margen de seguridad es apretado y el margen t\xe9cnico es amplio, el trade es de baja convicci\xf3n. El ratio actual de ${ratioRB.toFixed(1)}:1 ${ratioRB >= 2 ? 'favorece la entrada' : 'frena la entrada'}.`;

    case 'ke':
      return `El costo de capital K_e es una variable fundamental analizada por Jairo en el plano de la creaci\xf3n de valor. En el plano t\xe9cnico, yo me gu\xedo por la acci\xf3n del precio actual (**$${precio}**) y su tendencia sobre las medias m\xf3viles EMA 20 (**$${ema20}**) y EMA 50 (**$${ema50}**).\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un K_e alto (mayor al 12%) indica que el mercado exige un retorno alto por el riesgo de ${ticker}. T\xe9cnicamente, eso se traduce a: el precio ya est\xe1 descontando un riesgo elevado. Si el precio rompe la EMA 200 ($${ema200}) con volumen, es la confirmaci\xf3n t\xe9cnica de que el mercado est\xe1 re-pensando su valoraci\xf3n.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** El K_e es el "inter\xe9s" que el mercado cobra por invertir en ${ticker}. Yo lo traduzco a: ¿cu\xe1nto riesgo de ca\xedda estoy dispueste a asumir? La respuesta la da la distancia al Stop Loss de $${stopLoss} y la direcci\xf3n de la EMA 200. Un K_e alto + precio por debajo de la EMA 200 = \u201cesta empresa es cara para lo que ofrece\u201d y el mercado lo est\xe1 descontando.`;

    case 'moat':
      return `El foso econ\xf3mico protege el modelo de negocio a largo plazo que sigue Jairo. En el gr\xe1fico t\xe9cnico confirmamos esa ventaja cuando el precio defiende con consistencia la EMA 200 (**$${ema200}**) y rechaza ca\xeddas hacia el soporte de **$${soporte}**.\n\n` +
        `🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un moat amplio se nota en el gr\xe1fico como un precio que tiende a recuperarse r\xe1pidamente de cada ca\xedda y que rara vez rompe soportes importantes. La "memoria de precio" de un moat es fuerte: los soportes defensivos y las ca\xeddas s\xf3lo temporales.\n\n` +
        `🎯 **CONCLUSIONES PARA JAIRO:** El moat de Jairo es el "por qu\xe9" el precio se recupera; mi lectura t\xe9cnica es el "cu\xe1ndo" se recupera. Con el precio en $${precio}, el soporte en $${soporte} y la EMA 200 en $${ema200}, la estructura t\xe9cnica ${precio >= ema200 ? 'apoya la tesis de moat (precio sobre la directriz de fondo)' : 'est\xe1 cuestionando el moat (precio por debajo de la directriz de fondo, presi\xf3n vendedora).'} La direcci\xf3n del RSI (${rsi}) y del MACD (histograma ${macd.hist >= 0 ? '+' : ''}${macd.hist.toFixed(2)}) confirman o contradicen esa tesis.`;

    case 'general':
    default: {
      const estaSobreEma200 = precio >= ema200;
      const ratioValido = ratioRB >= 2.0;

      let evaluacionTecnica = '';
      let rbTexto = '';

      if (ratioValido && estaSobreEma200 && rsi < 70) {
        rbTexto = `**${ratioRB.toFixed(1)} a 1** ✅ (CUMPLE nuestra regla de oro de mínimo 2 a 1).`;
        evaluacionTecnica = `RECOMENDACIÓN TÉCNICA: OPERACIÓN VALIDADA. Estructura alcista confirmada sobre la EMA 200 ($${ema200}) y EMA 50 ($${ema50}). El RSI en ${rsi} puntos y el MACD (${macd.hist >= 0 ? 'con histograma positivo' : 'en estabilización'}) validan el momentum favorable. Relación riesgo/beneficio de ${ratioRB.toFixed(1)}:1 autoriza armar posición con Stop Loss estricto en $${stopLoss}.`;
      } else if (!ratioValido) {
        rbTexto = `**${ratioRB.toFixed(1)} a 1** ❌ (NO CUMPLE el estándar mínimo de Juan Guillermo: exigimos al menos 2 a 1).`;
        evaluacionTecnica = `RECOMENDACIÓN TÉCNICA: LA OPERACIÓN SE DESCARTA. Bajo mi disciplina mecánica de pantalla, si una entrada no ofrece una relación riesgo/beneficio de al menos 2 a 1 (${ratioRB.toFixed(1)}:1 < 2.0:1), NO SE OPERA. Sugiero esperar un retroceso (pullback) hacia el soporte de $${soporte} que permita un Stop Loss más ceñido antes de comprometer capital.`;
      } else if (!estaSobreEma200) {
        rbTexto = `**${ratioRB.toFixed(1)} a 1** ${ratioValido ? '✅' : '❌'}.`;
        evaluacionTecnica = `RECOMENDACIÓN TÉCNICA: PRECAUCIÓN POR TENDENCIA. El precio ($${precio}) está cotizando por debajo de la EMA 200 ($${ema200}). No compramos cuchillos cayendo. El RSI está en ${rsi} y el MACD refleja presión vendedora. Esperar confirmación de rebote con volumen.`;
      } else {
        rbTexto = `**${ratioRB.toFixed(1)} a 1** ⚠️ (Límite operativo ajustado).`;
        evaluacionTecnica = `El activo está en tendencia pero cerca de resistencia mayor ($${resistencia}) o con RSI elevado (${rsi}). El ratio actual de ${ratioRB.toFixed(1)}:1 no ofrece margen de maniobra. Mejor aguardar un retroceso hacia el soporte de $${soporte}.`;
      }

      return (
        `¡Vámonos a la parte que a mí me apasiona: el gráfico y la lectura de pantalla!\n\n` +
        `Miramos el gráfico de **${nombre} (${ticker})** sin romanticismos:\n\n` +
        `1. **Tendencia y Medias Móviles:** El precio actual cotiza en **$${precio}**. La EMA 200 estructural pasa por **$${ema200}** (${estaSobreEma200 ? 'precio por ENCIMA, directriz alcista' : 'precio por DEBAJO, sesgo correctivo'}). Medias de corto y mediano plazo EMA 20 ($${ema20}) y EMA 50 ($${ema50}).\n` +
        `2. **Osciladores y Momentum (RSI + MACD):** El RSI (14) se ubica en **${rsi} puntos**. El MACD marca línea en **${macd.line > 0 ? '+' : ''}${macd.line.toFixed(2)}** y señal en **${macd.signal.toFixed(2)}** (histograma ${macd.hist >= 0 ? '+' : ''}${macd.hist.toFixed(2)}).\n` +
        `3. **Memoria de Precios:** Soporte relevante en **$${soporte}** y resistencia técnica en **$${resistencia}**.\n` +
        `4. **Plan Operativo y Gestión del Riesgo:**\n` +
        `   - Ratio Riesgo/Beneficio: ${rbTexto}\n` +
        `   - Stop Loss sugerido: **$${stopLoss}**.\n` +
        `   - Toma de utilidades: venta del 50% al alcanzar **+25%** ($${(precio * 1.25).toFixed(1)}), y el resto se gerencia con Trailing Stop vela a vela.\n\n` +
        `• **Plan de Juan Guillermo:** ${evaluacionTecnica}`
      );
    }
  }
}

/**
 * Genera la síntesis coordinada adaptada a consultas puntuales o generales
 */
function buildSynthesis(
  jairo: string,
  guillermo: string,
  fundamental: FundamentalContext,
  technical: TechnicalContext,
  topic: QueryTopic
): { sintesis: string; convergencia: 'acuerdo' | 'divergencia' } {
  if (topic !== 'general') {
    return {
      convergencia: 'acuerdo',
      sintesis: `Respuesta directa y puntual: Jairo evalúa la métrica desde la solvencia, rentabilidad y creación de valor de la compañía, mientras que Juan Guillermo verifica el comportamiento de la variable en pantalla técnica y la gestión de riesgo.`
    };
  }

  const lowerJ = jairo.toLowerCase();
  const lowerG = guillermo.toLowerCase();

  const ratioValido = technical.ratioRB >= 2.0;
  const jBullish = lowerJ.includes('oportunidad') || lowerJ.includes('acumulación') || lowerJ.includes('margen de seguridad');
  const gBullish = ratioValido && (lowerG.includes('operación validada') || lowerG.includes('estructura alcista confirmada'));

  const jCautious = lowerJ.includes('alerta') || lowerJ.includes('abstenerse') || lowerJ.includes('paciencia');
  const gCautious = !ratioValido || lowerG.includes('se descarta') || lowerG.includes('no compramos cuchillos') || lowerG.includes('por debajo de la ema 200');

  const ticker = fundamental.ticker;

  if (!ratioValido) {
    return {
      convergencia: 'divergencia',
      sintesis: `Divergencia entre Fundamental y Técnico: Jairo valida la calidad del balance y el negocio de ${ticker}; sin embargo, Juan Guillermo DESCARTA la compra bajo su disciplina técnica porque la relación riesgo/beneficio (${technical.ratioRB.toFixed(1)}:1) NO cumple su regla de oro de mínimo 2 a 1. Resolución: Mantener en lista de seguimiento por fundamentales, pero abstenerse de comprar hasta que una corrección hacia el soporte permita un ratio de al menos 2:1.`
    };
  }

  if (jBullish && gBullish) {
    return {
      convergencia: 'acuerdo',
      sintesis: `Convergencia total: Jairo confirma que el modelo de negocio de ${ticker} genera caja sólida y margen de seguridad (${fundamental.margenSeguridad}%), mientras que Juan Guillermo verifica alineación técnica sobre la EMA 200 con ratio riesgo/beneficio favorable superior a 2:1 (${technical.ratioRB.toFixed(1)}:1). Ambos avalan la entrada con Stop Loss definido.`
    };
  }

  if (jCautious && gCautious) {
    return {
      convergencia: 'acuerdo',
      sintesis: `Convergencia en prudencia: Tanto Jairo (por valoración exigente o fragilidad de balance) como Juan Guillermo (por debilidad técnica o proximidad a resistencias) recomiendan mantenerse al margen. El acuerdo es evitar compras apresuradas.`
    };
  }

  return {
    convergencia: 'divergencia',
    sintesis: `Divergencia entre Fundamental y Técnico: Jairo responde positivamente al "QUÉ COMPRAR", validando el negocio y su margen de seguridad; sin embargo, Juan Guillermo frena el "CUÁNDO COMPRAR" al advertir que el gráfico aún no valida el timing de entrada o no ofrece ratio 2:1. Patrón de resolución: mantener en lista de seguimiento (watchlist) por fundamentales, pero esperar confirmación en el gráfico antes de ingresar capital.`
  };
}

/**
 * Función principal unificada
 */
export function generateDualAdvisorConsultation(
  pregunta: string,
  explicitTicker?: string,
  companies: any[] = []
): DualAdvisorResult {
  const company = identifyCompany(pregunta, explicitTicker, companies);
  const modeloNegocio = extractModeloNegocio(company, pregunta);
  const { fundamental, technical } = consolidateAdvisorContexts(company, modeloNegocio);
  const topic = classifyQuery(pregunta);

  const respuesta_jairo = buildJairoAnalysis(pregunta, fundamental, technical, topic);
  const respuesta_guillermo = buildGuillermoAnalysis(pregunta, fundamental, technical, topic);
  const { sintesis, convergencia } = buildSynthesis(
    respuesta_jairo,
    respuesta_guillermo,
    fundamental,
    technical,
    topic
  );

  const per = company?.per || (company?.ratios?.per?.value ? Number(company.ratios.per.value).toFixed(1) : undefined);
  const ratioValido = technical.ratioRB >= 2.0;

  return {
    success: true,
    pregunta,
    ticker: company ? fundamental.ticker : null,
    empresaNombre: company ? fundamental.nombre : undefined,
    modeloNegocio,
    respuesta_jairo,
    respuesta_guillermo,
    sintesis,
    convergencia,
    source: 'motor-analitico',
    metricasClave: company ? {
      precio: technical.precio,
      per,
      roe: `${fundamental.roe}%`,
      liquidez: `${fundamental.liquidez}x`,
      apalancamiento: String(fundamental.apalancamiento),
      margenSeguridad: `${fundamental.margenSeguridad}%`,
      ke: `${fundamental.ke}%`,
      moat: fundamental.moat,
      deudaEbitda: String(fundamental.apalancamiento),
      rsi: technical.rsi,
      ema20: technical.ema20,
      ema50: technical.ema50,
      ema40: technical.ema50,
      ema200: technical.ema200,
      macd: `${technical.macd.line > 0 ? '+' : ''}${technical.macd.line.toFixed(2)} (${technical.macd.hist >= 0 ? 'Alcista' : 'Bajista'})`,
      soporte: technical.soporte,
      resistencia: technical.resistencia,
      stopLoss: technical.stopLoss,
      riesgoBeneficio: `${technical.ratioRB.toFixed(1)}:1 ${ratioValido ? '✅ (Aprobado ≥2:1)' : '❌ (Insuficiente <2:1)'}`
    } : undefined
  };
}

/**
 * Genera respuesta SOLO de Jairo Agudelo (Fundamental) para preguntas puntuales
 * No incluye modelo de negocio, síntesis ni convergencia.
 */
export function generateJairoOnlyResponse(
  pregunta: string,
  explicitTicker?: string,
  companies: any[] = []
): JairoOnlyResult {
  const company = identifyCompany(pregunta, explicitTicker, companies);
  const modeloNegocio = extractModeloNegocio(company, pregunta);
  const { fundamental, technical } = consolidateAdvisorContexts(company, modeloNegocio);
  const topic = classifyQuery(pregunta);

  const respuesta = buildJairoAnalysis(pregunta, fundamental, technical, topic);

  const per = company?.per || (company?.ratios?.per?.value ? Number(company.ratios.per.value).toFixed(1) : undefined);

  return {
    success: true,
    pregunta,
    ticker: company ? fundamental.ticker : null,
    empresaNombre: company ? fundamental.nombre : undefined,
    respuesta,
    source: 'motor-analitico',
    metricasClave: company ? {
      precio: fundamental.precio,
      roe: `${fundamental.roe}%`,
      liquidez: `${fundamental.liquidez}x`,
      apalancamiento: String(fundamental.apalancamiento),
      margenSeguridad: `${fundamental.margenSeguridad}%`,
      ke: `${fundamental.ke}%`,
      moat: fundamental.moat,
    } : undefined
  };
}

/**
 * Genera respuesta SOLO de Juan Guillermo "Guangui" Hernández (Técnico) para preguntas puntuales
 * No incluye modelo de negocio, síntesis ni convergencia.
 */
export function generateGuillermoOnlyResponse(
  pregunta: string,
  explicitTicker?: string,
  companies: any[] = []
): GuillermoOnlyResult {
  const company = identifyCompany(pregunta, explicitTicker, companies);
  const modeloNegocio = extractModeloNegocio(company, pregunta);
  const { fundamental, technical } = consolidateAdvisorContexts(company, modeloNegocio);
  const topic = classifyQuery(pregunta);

  const respuesta = buildGuillermoAnalysis(pregunta, fundamental, technical, topic);

  return {
    success: true,
    pregunta,
    ticker: company ? technical.ticker : null,
    empresaNombre: company ? technical.nombre : undefined,
    respuesta,
    source: 'motor-analitico',
    metricasClave: company ? {
      precio: technical.precio,
      rsi: technical.rsi,
      ema20: technical.ema20,
      ema50: technical.ema50,
      ema200: technical.ema200,
      macd: `${technical.macd.line > 0 ? '+' : ''}${technical.macd.line.toFixed(2)} (${technical.macd.hist >= 0 ? 'Alcista' : 'Bajista'})`,
      soporte: technical.soporte,
      resistencia: technical.resistencia,
      stopLoss: technical.stopLoss,
      riesgoBeneficio: `${technical.ratioRB.toFixed(1)}:1 ${technical.ratioRB >= 2.0 ? '✅ (Aprobado ≥2:1)' : '❌ (Insuficiente <2:1)'}`
    } : undefined
  };
}
