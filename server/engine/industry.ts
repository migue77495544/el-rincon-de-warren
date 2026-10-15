// Clasificación sectorial: industria de Yahoo → industria de Damodaran y su beta
import { getInfo } from './yahoo';
import { getIndustriasDamodaran, getBetaDeIndustria } from './damodaran';
import { getCloseMatches } from './difflib';
import { generar, geminiDisponible } from './gemini';
import { cachedPersistent } from '../store';
import { round } from './util';

const DIRECT_MAP: Record<string, string> = {
  'Banks - Diversified': 'Bank (Money Center)',
  'Banks - Regional': 'Banks (Regional)',
  'Consumer Electronics': 'Computers/Peripherals',
  'Beverages - Non-Alcoholic': 'Beverage (Soft)',
  'Beverages - Alcoholic': 'Beverage (Alcoholic)',
  'Oil & Gas Integrated': 'Oil/Gas (Integrated)',
  'Oil & Gas E&P': 'Oil/Gas (Production and Exploration)',
  'Oil & Gas Refining & Marketing': 'Oil/Gas (Refining and Marketing)',
  'Auto Manufacturers': 'Auto & Truck',
  'Semiconductors': 'Semiconductor',
  'Semiconductor Equipment & Materials': 'Semiconductor Equip',
  'Internet Content & Information': 'Information Services',
  'Software - Infrastructure': 'Software (System & Application)',
  'Software - Application': 'Software (System & Application)',
  'Discount Stores': 'Retail (General)',
  'Packaged Foods': 'Food Processing',
  'Drug Manufacturers - General': 'Drugs (Pharmaceutical)',
  'Drug Manufacturers - Specialty & Generic': 'Drugs (Pharmaceutical)',
  'Aerospace & Defense': 'Aerospace/Defense',
  'Telecom Services': 'Telecom (Services)'
};

const SIN_INDUSTRIA = 'Diversified / General Market';

async function datosYahoo(ticker: string) {
  try {
    const info = await getInfo(ticker);
    return {
      yfIndustry: info.industry || info.sector || 'General Market',
      yfSector: info.sector || 'General Market',
      nombre: info.longName || info.shortName || ticker,
      descripcion: info.longBusinessSummary || ''
    };
  } catch {
    return { yfIndustry: 'General Market', yfSector: 'General Market', nombre: ticker, descripcion: '' };
  }
}

/** get_beta_and_industry: mapeo directo + coincidencia aproximada sobre la lista de Damodaran */
export async function getBetaAndIndustry(ticker: string) {
  const { yfIndustry, yfSector } = await datosYahoo(ticker);
  const industrias = await getIndustriasDamodaran();

  let matched: string | null = null;
  const directo = DIRECT_MAP[yfIndustry];
  if (directo) {
    const objetivo = directo.toLowerCase();
    matched = industrias.find(ind => ind.toLowerCase() === objetivo || ind.toLowerCase().includes(objetivo)) || null;
  }
  if (!matched) {
    matched = getCloseMatches(yfIndustry.replace(/[-–—/]/g, ' '), industrias, 1, 0.35)[0] || null;
  }
  if (!matched && yfSector && yfSector !== 'Unknown') {
    matched = getCloseMatches(yfSector, industrias, 1, 0.35)[0] || null;
  }

  let beta = 1.0;
  let unlevered = 1.0;
  if (matched) {
    const b = await getBetaDeIndustria(matched);
    if (b.beta !== null) beta = b.beta;
    if (b.unlevered !== null) unlevered = b.unlevered;
  }
  return {
    beta: round(beta, 4),
    unlevered_beta: round(unlevered, 4),
    yfinance_industry: yfIndustry,
    yfinance_sector: yfSector,
    matched_damodaran_industry: matched || SIN_INDUSTRIA
  };
}

async function classifyIndustryWithAI(ticker: string, nombre: string, descripcion: string, yfIndustry: string, yfSector: string) {
  if (!geminiDisponible()) {
    return { matched_industry: null, confidence: 0, reasoning: 'No hay API key de Gemini configurada', source: 'fallback' };
  }
  const industrias = await getIndustriasDamodaran();
  const prompt = `Eres un analista financiero experto en clasificación sectorial según la metodología de Aswath Damodaran.

EMPRESA A CLASIFICAR:
- Ticker: ${ticker}
- Nombre: ${nombre}
- Descripción del negocio: ${descripcion}
- Industria YFinance: ${yfIndustry}
- Sector YFinance: ${yfSector}

LISTA CERRADA DE INDUSTRIAS VÁLIDAS DE DAMODARAN (elige EXCLUSIVAMENTE una de estas, NO inventes nombres):
${industrias.map(i => `- ${i}`).join('\n')}

TAREA:
Analiza la descripción del negocio y selecciona LA INDUSTRIA MÁS APROPIADA de la lista arriba.
Debes responder ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "matched_industry": "Nombre exacto de la industria de la lista",
  "confidence": 0.95,
  "reasoning": "Explicación breve de por qué esta industria encaja basándote en la descripción del negocio"
}

NO agregues texto extra, NO uses markdown, SOLO el JSON.
`;
  // Presupuesto corto: la clasificación no debe retrasar la descarga de datos de la empresa
  const texto = await generar(prompt, {
    temperature: 0.1,
    maxOutputTokens: 500,
    modelos: ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'],
    responseMimeType: 'application/json',
    presupuestoMs: 12000,
    timeoutPorModeloMs: 10000
  });
  if (!texto) return { matched_industry: null, confidence: 0, reasoning: 'IA no respondió', source: 'fallback' };

  try {
    const limpio = texto.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    const res = JSON.parse(limpio);
    const matched = String(res.matched_industry || '').trim();
    const confidence = Number(res.confidence) || 0;
    const reasoning = String(res.reasoning || '').trim();
    if (industrias.includes(matched)) return { matched_industry: matched, confidence, reasoning, source: 'gemini-ai' };
    const cercana = getCloseMatches(matched, industrias, 1, 0.6)[0];
    if (cercana) {
      return {
        matched_industry: cercana,
        confidence: confidence * 0.8,
        reasoning: `${reasoning} (Corregido por fuzzy match: ${cercana})`,
        source: 'gemini-ai-fuzzy'
      };
    }
    return { matched_industry: null, confidence: 0, reasoning: `IA devolvió industria no válida: ${matched}`, source: 'fallback' };
  } catch (err: any) {
    return { matched_industry: null, confidence: 0, reasoning: `Error parseando respuesta IA: ${err?.message}`, source: 'fallback' };
  }
}

/** get_beta_and_industry_ai: la IA elige la industria; si no responde se usa el mapeo aproximado */
export function getBetaAndIndustryAI(ticker: string) {
  return cachedPersistent(`industria-ia-${ticker.toUpperCase()}`, 7 * 24 * 60 * 60 * 1000, async () => {
    const { yfIndustry, yfSector, nombre, descripcion } = await datosYahoo(ticker);
    const ai = await classifyIndustryWithAI(ticker, nombre, descripcion || `Compañía cotizada en bolsa: ${nombre}`, yfIndustry, yfSector);

    let matched = ai.matched_industry as string | null;
    let beta = 1.0;
    let unlevered = 1.0;
    if (matched) {
      const b = await getBetaDeIndustria(matched);
      if (b.beta !== null) beta = b.beta;
      if (b.unlevered !== null) unlevered = b.unlevered;
    } else {
      // Mejora frente al motor anterior: sin IA no se cae a «mercado general», se usa el mapeo aproximado
      const aprox = await getBetaAndIndustry(ticker);
      if (aprox.matched_damodaran_industry !== SIN_INDUSTRIA) {
        matched = aprox.matched_damodaran_industry;
        beta = aprox.beta;
        unlevered = aprox.unlevered_beta;
      }
    }
    return {
      success: true,
      beta: round(beta, 4),
      unlevered_beta: round(unlevered, 4),
      yfinance_industry: yfIndustry,
      yfinance_sector: yfSector,
      matched_damodaran_industry: matched || SIN_INDUSTRIA,
      ai_classification: ai
    };
  }, { accept: (d: any) => d?.ai_classification?.source !== 'fallback' || !geminiDisponible() });
}
