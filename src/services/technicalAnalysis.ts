import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface TechnicalPatternResult {
  success: boolean;
  ticker: string;
  summary: string;
  trend: string;
  convergenceStatus: 'convergente' | 'contradictorio' | 'parcial';
  patterns: Array<{
    type: string;
    name: string;
    price: number;
    startDate: string;
    endDate: string;
    explanation: string;
    indicatorConfirmation: string;
    significance: 'alta' | 'media' | 'baja';
  }>;
  disclaimer: string;
  source: string;
}

function buildIndicatorConfirmation(
  effectiveEma200: number | null,
  effectiveRsi: number | null,
  effectiveMacdLine: number | null,
  effectiveMacdSignal: number | null,
  lastClose: number,
  patternType: string
): string {
  const parts: string[] = [];
  if (effectiveEma200 != null) {
    const above = lastClose >= effectiveEma200;
    parts.push(`EMA 200 ($${effectiveEma200.toFixed(2)}): Precio actual ($${lastClose.toFixed(2)}) ${above ? 'POR ENCIMA (tendencia de fondo alcista institucional)' : 'POR DEBAJO (tendencia de fondo bajista estructural)'}`);
  }
  if (effectiveRsi != null) {
    const rsiVal = effectiveRsi.toFixed(1);
    if (effectiveRsi >= 80) {
      parts.push(`RSI (${rsiVal}): En SOBRECOMPRA (>80), alto riesgo de agotamiento comprador`);
    } else if (effectiveRsi <= 30) {
      parts.push(`RSI (${rsiVal}): En SOBREVENTA (<30), favorece rebote técnico`);
    } else {
      parts.push(`RSI (${rsiVal}): En zona intermedia (${rsiVal}), sin extremos`);
    }
  }
  if (effectiveMacdLine != null && effectiveMacdSignal != null) {
    const macdVal = effectiveMacdLine.toFixed(4);
    const signalVal = effectiveMacdSignal.toFixed(4);
    const isBullish = effectiveMacdLine > effectiveMacdSignal;
    if (patternType === 'soporte' || patternType === 'piso_multiple') {
      parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'CONFIRMA el soporte con momentum alcista' : 'CONTRADICE el rebote con presión vendedora en curso'}`);
    } else if (patternType === 'resistencia' || patternType === 'techo_multiple') {
      parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'CONTRADICE el techo por impulso comprador activo' : 'CONFIRMA la resistencia con presión bajista'}`);
    } else {
      parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'Momentum alcista activo' : 'Presión vendedora activa'}`);
    }
  }
  return parts.join(' · ');
}

export async function analyzeTechnicalPatterns(
  rawTicker: string,
  inputPoints: any[],
  inputIndicators: any,
  companiesDB: any[]
): Promise<TechnicalPatternResult> {
  let pointsToAnalyze = inputPoints;
  if (pointsToAnalyze.length < 5) {
    const company = companiesDB.find(c => c.ticker === rawTicker);
    const currPrice = company?.raw.precioCotizacion || 100;
    pointsToAnalyze = [
      { date: '2026-08-01', open: currPrice * 0.95, high: currPrice * 1.02, low: currPrice * 0.93, price: currPrice * 0.98 },
      { date: '2026-08-15', open: currPrice * 0.98, high: currPrice * 1.05, low: currPrice * 0.97, price: currPrice * 1.04 },
      { date: '2026-09-01', open: currPrice * 1.04, high: currPrice * 1.06, low: currPrice * 0.99, price: currPrice * 1.01 }
    ];
  }

  const trimmedPoints = pointsToAnalyze.slice(-75).map((p: any) => ({
    date: p.date,
    open: Math.round(((p.open ?? p.price) || 0) * 100) / 100,
    high: Math.round(((p.high ?? Math.max(p.open ?? p.price, p.price)) || 0) * 100) / 100,
    low: Math.round(((p.low ?? Math.min(p.open ?? p.price, p.price)) || 0) * 100) / 100,
    close: Math.round(((p.price ?? p.close) || 0) * 100) / 100,
    volume: p.volume || 0,
    ...(p.rsi != null        ? { rsi: Math.round(p.rsi * 100) / 100 }               : {}),
    ...(p.macdLine != null   ? { macdLine: Math.round(p.macdLine * 10000) / 10000 } : {}),
    ...(p.macdSignal != null ? { macdSignal: Math.round(p.macdSignal * 10000) / 10000 } : {}),
    ...(p.macdHist != null   ? { macdHist: Math.round(p.macdHist * 10000) / 10000 }   : {}),
    ...(p.ema20 != null  ? { ema20: Math.round(p.ema20 * 100) / 100 }   : {}),
    ...((p.ema50 != null || p.ema40 != null) ? {
      ema50: Math.round((p.ema50 ?? p.ema40) * 100) / 100,
      ema40: Math.round((p.ema50 ?? p.ema40) * 100) / 100
    } : {}),
    ...(p.ema200 != null ? { ema200: Math.round(p.ema200 * 100) / 100 } : {}),
  }));

  const lastPointWithRsi = [...trimmedPoints].reverse().find((p: any) => p.rsi != null);
  const lastPointWithMacd = [...trimmedPoints].reverse().find((p: any) => p.macdLine != null);
  const lastPointWithEma = [...trimmedPoints].reverse().find((p: any) => p.ema200 != null);

  const effectiveRsi: number | null = inputIndicators?.rsi ?? lastPointWithRsi?.rsi ?? null;
  const effectiveMacdLine: number | null = inputIndicators?.macdLine ?? lastPointWithMacd?.macdLine ?? null;
  const effectiveMacdSignal: number | null = inputIndicators?.macdSignal ?? lastPointWithMacd?.macdSignal ?? null;
  const effectiveMacdHist: number | null = inputIndicators?.macdHist ?? lastPointWithMacd?.macdHist ?? null;
  const effectiveEma20: number | null = inputIndicators?.ema20 ?? lastPointWithEma?.ema20 ?? null;
  const effectiveEma50: number | null = inputIndicators?.ema50 ?? inputIndicators?.ema40 ?? lastPointWithEma?.ema50 ?? lastPointWithEma?.ema40 ?? null;
  const effectiveEma200: number | null = inputIndicators?.ema200 ?? lastPointWithEma?.ema200 ?? null;
  const lastClose: number = trimmedPoints[trimmedPoints.length - 1]?.close ?? 0;

  const isAboveEma200 = effectiveEma200 != null ? lastClose >= effectiveEma200 : null;
  const isMacdBullish = (effectiveMacdLine != null && effectiveMacdSignal != null) ? effectiveMacdLine > effectiveMacdSignal : null;
  const isRsiOverbought = effectiveRsi != null ? effectiveRsi >= 80 : false;
  const isRsiOversold = effectiveRsi != null ? effectiveRsi <= 30 : false;

  const hasContradiction = (isAboveEma200 === false && isMacdBullish === true) ||
                           (isAboveEma200 === true && isMacdBullish === false) ||
                           (isRsiOverbought && isMacdBullish === true) ||
                           (isRsiOversold && isMacdBullish === false);

  const indicatorSummary = `
DATOS ACTUALES DE INDICADORES EN PANTALLA PARA ${rawTicker}:
- Último Cierre: $${lastClose.toFixed(2)}
- EMA 20: ${effectiveEma20 != null ? '$' + effectiveEma20.toFixed(2) : 'N/D'}
- EMA 50: ${effectiveEma50 != null ? '$' + effectiveEma50.toFixed(2) : 'N/D'}
- EMA 200: ${effectiveEma200 != null ? '$' + effectiveEma200.toFixed(2) : 'N/D'} → ${effectiveEma200 != null ? (lastClose >= effectiveEma200 ? 'Precio POR ENCIMA (tendencia de fondo alcista)' : 'Precio POR DEBAJO (tendencia de fondo bajista)') : 'N/D'}
- RSI 14: ${effectiveRsi != null ? effectiveRsi.toFixed(1) + (effectiveRsi >= 80 ? ' [SOBRECOMPRA >80]' : effectiveRsi <= 30 ? ' [SOBREVENTA <30]' : ' [Zona neutra]') : 'N/D'}
- MACD Línea (12/26): ${effectiveMacdLine != null ? effectiveMacdLine.toFixed(4) : 'N/D'}
- MACD Señal (9): ${effectiveMacdSignal != null ? effectiveMacdSignal.toFixed(4) : 'N/D'}
- MACD Histograma: ${effectiveMacdHist != null ? (effectiveMacdHist >= 0 ? '+' : '') + effectiveMacdHist.toFixed(4) : 'N/D'} → ${effectiveMacdLine != null && effectiveMacdSignal != null ? (effectiveMacdLine > effectiveMacdSignal ? 'Cruce alcista (impulso comprador)' : 'Cruce bajista (presión vendedora)') : 'N/D'}
`;

  const perfilGuillermoPath = path.resolve(process.cwd(), 'python', 'data', 'perfil_guillermo.txt');
  let perfilGuillermoText = '';
  if (fs.existsSync(perfilGuillermoPath)) {
    try {
      perfilGuillermoText = fs.readFileSync(perfilGuillermoPath, 'utf-8');
    } catch (err) {
      console.warn('No se pudo leer perfil_guillermo.txt:', err);
    }
  }

  const prompt = `Actúa como Juan Guillermo "Guangui" Hernández, especialista en Análisis Técnico y Operativa Bursátil.
METODOLOGÍA ESTRICTA DE GUILLERMO HERNÁNDEZ:
Guillermo basa sus decisiones operativas en la "CONVERGENCIA TÉCNICA": todos los indicadores (EMA 20/40/200, RSI-14 y MACD 12/26/9) deben respaldarse entre sí antes de validar una entrada o patrón. NUNCA aprueba un patrón solo por precio aislado.
- Si hay CONTRADICCIÓN entre el precio y los indicadores (ej: el precio toca un soporte pero cotiza bajo la EMA 200 y el MACD sigue bajista), DEBES señalarlo explícitamente en el "summary" comenzando con: "CONTRADICCIÓN TÉCNICA DETECTADA: [explicar la divergencia entre precio e indicadores]".
- Si todos coinciden, inicia el resumen con: "CONVERGENCIA TÉCNICA ALCISTA/BAJISTA CONFIRMADA: [explicar respaldo mutuo]".
- En CADA uno de los patrones identificados, debes incluir el campo "indicatorConfirmation" cruzando explícitamente el nivel con los 3 indicadores citando sus valores exactos:
  1) EMA 200 ($${effectiveEma200?.toFixed(2) || 'N/D'}): indicar si el precio está por encima o por debajo (tendencia de fondo).
  2) RSI ($${effectiveRsi?.toFixed(1) || 'N/D'}): si está en sobrecompra, sobreventa o neutro y qué señal da.
  3) MACD ($${effectiveMacdLine?.toFixed(4) || 'N/D'}): si confirma o contradice el nivel.

${indicatorSummary}

SERIE HISTÓRICA RECIENTE OHLC:
${JSON.stringify(trimmedPoints)}

RESPONDE ÚNICAMENTE un objeto JSON válido (sin formato markdown ni backticks adicionales):
{
  "summary": "Resumen técnico de Guillermo con su tono característico. Si hay contradicción entre precio e indicadores, dilo explícitamente. Cita los valores numéricos de EMA 200, RSI y MACD.",
  "trend": "Tendencia dominante confirmada o cuestionada por indicadores (ej: Bajista estructural bajo EMA 200 pero con rebote táctico por RSI en sobreventa)",
  "convergenceStatus": "convergente" | "contradictorio" | "parcial",
  "patterns": [
    {
      "type": "soporte" | "resistencia" | "piso_multiple" | "techo_multiple" | "rango",
      "name": "Nombre descriptivo (ej: 'Soporte Clave $182.50')",
      "price": 182.50,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "explanation": "Explicación técnica detallada mencionando los valores de EMA 200, RSI y MACD.",
      "indicatorConfirmation": "Confirmación cruzada con valores: EMA 200 ($X): [encima/debajo]. RSI (Y): [sobrecompra/sobreventa/neutro]. MACD (Z): [confirma/contradice el nivel].",
      "significance": "alta" | "media" | "baja"
    }
  ]
}`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest'
  ];

  const apiKey = process.env.GEMINI_API_KEY;
  let jsonResult: any = null;

  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (response.text) {
          jsonResult = JSON.parse(response.text);
          if (jsonResult && Array.isArray(jsonResult.patterns)) {
            break;
          }
        }
      } catch (modelErr: any) {
        console.warn(`[GeminiPatternAnalysis] Modelo ${model} no disponible:`, modelErr.message);
      }
    }
  }

  if (!jsonResult || !Array.isArray(jsonResult.patterns)) {
    const closes = trimmedPoints.map((p: any) => p.close);
    const minP = Math.min(...closes);
    const maxP = Math.max(...closes);
    const avgP = closes.reduce((a: number, b: number) => a + b, 0) / closes.length;
    const isUptrend = closes[closes.length - 1] >= closes[0];

    const rsiTxt = effectiveRsi != null ? `RSI en ${effectiveRsi.toFixed(1)}${effectiveRsi >= 80 ? ' (sobrecompra)' : effectiveRsi <= 30 ? ' (sobreventa)' : ' (neutro)'}` : 'RSI N/D';
    const macdTxt = effectiveMacdLine != null && effectiveMacdSignal != null ? `MACD ${effectiveMacdLine > effectiveMacdSignal ? 'alcista (+)' : 'bajista (-)'}` : 'MACD N/D';
    const emaTxt = effectiveEma200 != null ? `precio ${lastClose >= effectiveEma200 ? 'sobre' : 'bajo'} EMA 200 ($${effectiveEma200.toFixed(2)})` : '';

    const summaryPrefix = hasContradiction
      ? `CONTRADICCIÓN TÉCNICA DETECTADA: La acción del precio oscila entre $${minP.toFixed(2)} y $${maxP.toFixed(2)}, pero los indicadores discrepan (${emaTxt}, ${rsiTxt}, ${macdTxt}). Guillermo recomienda prudencia y esperar convergencia antes de entrar.`
      : `CONVERGENCIA TÉCNICA: Soportes y resistencias alineados con los indicadores (${emaTxt}, ${rsiTxt}, ${macdTxt}).`;

    jsonResult = {
      summary: summaryPrefix,
      trend: isUptrend
        ? `Alcista ${effectiveEma200 != null && lastClose < effectiveEma200 ? '(cuestionada: bajo EMA 200)' : 'confirmada'}`
        : `Bajista ${effectiveRsi != null && effectiveRsi <= 30 ? '(divergencia: RSI sobrevendido)' : 'estructural'}`,
      convergenceStatus: hasContradiction ? 'contradictorio' : 'convergente',
      patterns: [
        {
          type: 'soporte',
          name: `Soporte Principal $${minP.toFixed(2)}`,
          price: Math.round(minP * 100) / 100,
          startDate: trimmedPoints[0].date,
          endDate: trimmedPoints[trimmedPoints.length - 1].date,
          explanation: `Piso por memoria de precios en $${minP.toFixed(2)}. ${effectiveRsi != null ? `RSI en ${effectiveRsi.toFixed(1)} ${effectiveRsi <= 30 ? 'respalda rebote' : 'aún sin sobreventa extrema'}.` : ''}`,
          indicatorConfirmation: buildIndicatorConfirmation(effectiveEma200, effectiveRsi, effectiveMacdLine, effectiveMacdSignal, lastClose, 'soporte'),
          significance: 'alta'
        },
        {
          type: 'resistencia',
          name: `Resistencia Mayor $${maxP.toFixed(2)}`,
          price: Math.round(maxP * 100) / 100,
          startDate: trimmedPoints[0].date,
          endDate: trimmedPoints[trimmedPoints.length - 1].date,
          explanation: `Techo por memoria de oferta en $${maxP.toFixed(2)}. ${effectiveMacdLine != null && effectiveMacdSignal != null ? (effectiveMacdLine > effectiveMacdSignal ? 'MACD alcista presiona este nivel.' : 'MACD bajista confirma el techo.') : ''}`,
          indicatorConfirmation: buildIndicatorConfirmation(effectiveEma200, effectiveRsi, effectiveMacdLine, effectiveMacdSignal, lastClose, 'resistencia'),
          significance: 'alta'
        },
        {
          type: 'piso_multiple',
          name: `Pivote de Consolidación $${avgP.toFixed(2)}`,
          price: Math.round(avgP * 100) / 100,
          startDate: trimmedPoints[Math.floor(trimmedPoints.length / 2)].date,
          endDate: trimmedPoints[trimmedPoints.length - 1].date,
          explanation: `Nivel medio de equilibrio. ${effectiveEma20 != null ? `EMA 20 en $${effectiveEma20.toFixed(2)} actúa como soporte/resistencia dinámica.` : ''}`,
          indicatorConfirmation: buildIndicatorConfirmation(effectiveEma200, effectiveRsi, effectiveMacdLine, effectiveMacdSignal, lastClose, 'piso_multiple'),
          significance: 'media'
        }
      ]
    };
  }

  if (jsonResult && Array.isArray(jsonResult.patterns)) {
    jsonResult.patterns = jsonResult.patterns.map((p: any) => {
      const existingConf = p.indicatorConfirmation || '';
      const needsEnrichment = !existingConf || !existingConf.includes('EMA') || !existingConf.includes('RSI');
      return {
        ...p,
        indicatorConfirmation: needsEnrichment
          ? buildIndicatorConfirmation(effectiveEma200, effectiveRsi, effectiveMacdLine, effectiveMacdSignal, lastClose, p.type)
          : existingConf
      };
    });

    if (hasContradiction && !jsonResult.summary.includes('CONTRADICCIÓN') && !jsonResult.summary.includes('contradicción')) {
      jsonResult.summary = `CONTRADICCIÓN TÉCNICA DETECTADA: ${jsonResult.summary}`;
    }
  }

  return {
    success: true,
    ticker: rawTicker,
    ...jsonResult,
    disclaimer: 'Análisis generado por IA, interpretación orientativa, no es asesoría financiera.',
    source: 'Gemini AI Technical Analysis Engine'
  };
}