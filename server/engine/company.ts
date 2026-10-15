// Datos fundamentales reales de una empresa (comando 'company' del motor anterior)
import { getInfo, getStatements, Statement } from './yahoo';
import { getRiskFreeRate, getHistimplErp, getSectorBenchmarks } from './damodaran';
import { getBetaAndIndustry, getBetaAndIndustryAI } from './industry';
import { getAnalystPriceTargets } from './market';
import { cachedPersistent } from '../store';
import { num, cleanVal, round, log } from './util';

export function recommendationMeanToLabel(value: unknown): string {
  const v = num(value);
  if (v === null) return 'Sin datos de recomendación';
  if (v < 1.5) return 'Compra Fuerte (Strong Buy)';
  if (v < 2.5) return 'Compra (Buy)';
  if (v < 3.5) return 'Mantener (Hold)';
  if (v < 4.5) return 'Venta (Sell)';
  return 'Venta Fuerte (Strong Sell)';
}

const TIPOS_NEGOCIO: Array<[string, string[]]> = [
  ['Banca / Servicios Financieros', ['bank', 'banco', 'financial services', 'servicios financieros', 'credit', 'crédito', 'lending', 'préstamo']],
  ['Seguros / Reaseguros', ['insurance', 'seguro', 'reinsurance', 'reaseguro']],
  ['Software / SaaS', ['software', 'saas', 'cloud', 'nube', 'subscription', 'suscripción', 'platform', 'plataforma']],
  ['Comercio Minorista / E-commerce', ['retail', 'minorista', 'e-commerce', 'ecommerce', 'marketplace', 'store', 'tienda']],
  ['Manufactura / Industrial', ['manufacturing', 'fabricación', 'industrial', 'production', 'producción']],
  ['Energía / Petróleo y Gas', ['energy', 'energía', 'oil', 'petróleo', 'gas', 'renewable', 'renovable']],
  ['Salud / Farmacéutica / Biotecnología', ['healthcare', 'salud', 'pharma', 'farmacéutica', 'biotech', 'biotecnología', 'medical', 'médico']],
  ['Telecomunicaciones', ['telecom', 'telecomunicaciones', 'wireless', 'móvil', 'broadband', 'banda ancha']],
  ['Bienes Raíces / REIT', ['real estate', 'inmobiliaria', 'reit', 'property', 'propiedad']],
  ['Consumo / Marcas', ['consumer', 'consumo', 'brand', 'marca', 'beverage', 'bebida', 'food', 'alimento']]
];

export function sintetizarModeloNegocio(resumen: string, sector: string, industria: string): string {
  if (!resumen) return `Empresa del sector ${sector}, industria ${industria}. Modelo de negocio no disponible.`;
  const lower = resumen.toLowerCase();
  const tipo = TIPOS_NEGOCIO.find(([, kws]) => kws.some(k => lower.includes(k)))?.[0] || 'Servicios / Operaciones Diversificadas';
  const frases = resumen.split('.').map(s => s.trim()).filter(s => s.length > 30);
  const primera = frases[0] || resumen.slice(0, 200);
  const texto = `${primera}. Opera en el sector ${sector} (${industria}) bajo un modelo de ${tipo}. ` +
    'Genera ingresos mediante la venta de productos y servicios especializados a su base de clientes global.';
  return texto.slice(0, 500);
}

/** Múltiplos, ROIC, WACC (CAPM Damodaran + FRED) y DCF de referencia a 5 años */
export async function calcularValoracion(
  info: Record<string, any>, income: Statement, cashflow: Statement, precio: number, marketCap: number,
  acciones: number, ebit: number, intereses: number, patrimonio: number, betaIn?: number | null
) {
  const n = (k: string) => num(info[k]);
  const pct = (v: number | null) => (v !== null ? round(v * 100, 2) : null);

  const esFinanciera = (info.sector || '') === 'Financial Services';
  const deuda = n('totalDebt') || 0;
  const caja = n('totalCash') || 0;
  const deudaNeta = deuda - caja;
  const ebitda = n('ebitda');
  let fcf = n('freeCashflow');
  const ev = n('enterpriseValue') || (marketCap > 0 ? marketCap + deudaNeta : null);

  // Flujo libre del estado de flujos: último ejercicio y media de los 3 últimos para el DCF
  let fcfNorm = fcf;
  const serieFcf = cashflow.series('Free Cash Flow').slice(0, 3);
  if (serieFcf.length) {
    fcf = serieFcf[0];
    fcfNorm = serieFcf.reduce((a, b) => a + b, 0) / serieFcf.length;
  }

  let tasaImp = 0.21;
  const t = income.series('Tax Rate For Calcs')[0];
  if (t !== undefined && t > 0 && t < 0.5) tasaImp = t;

  const beta = betaIn && betaIn > 0 ? betaIn : (n('beta') || 1.0);
  const [rf, erp] = await Promise.all([getRiskFreeRate(), getHistimplErp()]);
  const ke = rf + beta * erp;
  const kd = deuda > 0 && intereses > 0 ? Math.min(Math.max(intereses / deuda, rf), 0.12) : rf + 0.015;
  const capitalTotal = marketCap + deuda;
  const wacc = capitalTotal > 0 ? (marketCap / capitalTotal) * ke + (deuda / capitalTotal) * kd * (1 - tasaImp) : ke;

  const capitalInvertido = deuda + patrimonio - caja;
  const roic = capitalInvertido > 0 && !esFinanciera ? (ebit * (1 - tasaImp)) / capitalInvertido : null;

  let dcf: Record<string, number> | null = null;
  const gTerminal = 0.025;
  if (fcfNorm && fcfNorm > 0 && acciones > 0 && precio > 0 && !esFinanciera && wacc > gTerminal + 0.01) {
    const g = Math.min(Math.max(n('revenueGrowth') || 0.05, 0.02), 0.12);
    let flujo = fcfNorm + intereses * (1 - tasaImp);
    let valor = 0;
    for (let anio = 1; anio <= 5; anio++) {
      flujo *= 1 + g;
      valor += flujo / (1 + wacc) ** anio;
    }
    valor += (flujo * (1 + gTerminal) / (wacc - gTerminal)) / (1 + wacc) ** 5;
    const valorAccion = (valor - deudaNeta) / acciones;
    if (valorAccion > 0) {
      dcf = {
        valorPorAccion: round(valorAccion, 2),
        valorVsPrecioPct: round((valorAccion / precio - 1) * 100, 1),
        fcfBaseMM: round(fcfNorm / 1e6, 1),
        crecimiento5aPct: round(g * 100, 1),
        crecimientoTerminalPct: round(gTerminal * 100, 1)
      };
    }
  }

  return {
    esFinanciera,
    perTrailing: n('trailingPE'),
    perForward: n('forwardPE'),
    evEbitda: n('enterpriseToEbitda') || (ev && ebitda && ebitda > 0 ? round(ev / ebitda, 2) : null),
    precioValorLibros: n('priceToBook'),
    precioFcf: fcf && fcf > 0 && marketCap > 0 ? round(marketCap / fcf, 2) : null,
    fcfYieldPct: fcf && marketCap > 0 ? round((fcf / marketCap) * 100, 2) : null,
    margenBrutoPct: pct(n('grossMargins')),
    margenOperativoPct: pct(n('operatingMargins')),
    margenNetoPct: pct(n('profitMargins')),
    crecimientoIngresosPct: pct(n('revenueGrowth')),
    crecimientoBeneficiosPct: pct(n('earningsGrowth')),
    deudaNetaMM: round(deudaNeta / 1e6, 1),
    deudaNetaEbitda: ebitda && ebitda > 0 ? round(deudaNeta / ebitda, 2) : null,
    fcfMM: fcf !== null ? round(fcf / 1e6, 1) : null,
    roicPct: pct(roic),
    beta: round(beta, 2),
    tasaLibreRiesgoPct: pct(rf),
    primaRiesgoPct: pct(erp),
    kePct: pct(ke),
    kdPct: pct(kd),
    waccPct: pct(wacc),
    tasaImpositivaPct: pct(tasaImp),
    dcf
  };
}

const COMPANY_TTL_MS = 60 * 60 * 1000;

/** Datos reales de la empresa con caché de 1 hora (solo se guardan respuestas correctas) */
export function getCompanyData(rawTicker: string) {
  const ticker = rawTicker.toUpperCase().trim();
  return cachedPersistent(`company-${ticker}`, COMPANY_TTL_MS, () => descargarCompanyData(ticker));
}

async function descargarCompanyData(ticker: string): Promise<any> {
  let info: Record<string, any> = {};
  try {
    info = await getInfo(ticker);
  } catch (err: any) {
    log(`[company] info de ${ticker}: ${err?.message}`);
  }

  const precioReal = info.currentPrice || info.regularMarketPrice || info.previousClose;
  if (!precioReal) {
    return { success: false, ticker, error: `Yahoo Finance no devolvió cotización para ${ticker}. Verifica el símbolo bursátil.` };
  }

  const precio = cleanVal(precioReal, 0);
  const marketCap = cleanVal(info.marketCap, 0);
  const shares = cleanVal(info.sharesOutstanding, 1);
  const nombre = info.longName || info.shortName || ticker;
  const sector = info.sector || 'Renta Variable Global';
  const industria = info.industry || 'Industria General';
  const pais = info.country || 'Desconocido';
  const resumen = info.longBusinessSummary || `Compañía cotizada en bolsa: ${nombre}`;

  let st: Statement;
  try {
    st = await getStatements(ticker);
  } catch {
    st = new Statement([]);
  }
  if (st.empty || !st.has('Total Assets') || !(st.has('Net Income') || st.has('Total Revenue'))) {
    return { success: false, ticker, error: `Yahoo Finance no publica estados financieros para ${ticker}; no es posible calcular sus ratios.` };
  }

  const bs = (keys: string[], fallback: number) => st.latest(keys) ?? fallback;

  const rawEfectivo = bs(['Cash And Cash Equivalents', 'Cash Cash Equivalents And Short Term Investments'], cleanVal(info.totalCash, 5e9));
  const rawActivoCirc = bs(['Current Assets', 'Total Current Assets'], rawEfectivo * 1.8);
  const rawInventarios = bs(['Inventory', 'Total Inventories'], 0);
  const rawCuentasCobrar = bs(['Accounts Receivable', 'Receivables'], 0);
  const rawOtrosCirc = bs(['Other Current Assets'], 0);
  const rawActivosTotales = bs(['Total Assets'], cleanVal(info.totalAssets, rawActivoCirc * 3));
  const rawPasivoCirc = bs(['Current Liabilities', 'Total Current Liabilities'], rawActivoCirc * 0.6);
  const rawPasivoTotal = bs(['Total Liabilities Net Minority Interest', 'Total Debt', 'Total Liabilities'], cleanVal(info.totalDebt, rawPasivoCirc * 1.5));
  const rawPatrimonio = bs(['Stockholders Equity', 'Common Stock Equity', 'Total Stockholder Equity'], rawActivosTotales - rawPasivoTotal);

  const rawEbit = bs(['EBIT', 'Operating Income'], cleanVal(info.operatingIncome, rawActivosTotales * 0.12));
  const rawUtilidad = bs(['Net Income', 'Net Income Common Stockholders'], cleanVal(info.netIncomeToCommon, rawEbit * 0.78));
  const rawIntereses = bs(['Interest Expense', 'Interest Expense Non Operating'], cleanVal(info.interestExpense, Math.max(1, rawPasivoTotal * 0.04)));
  const rawVentas = bs(['Total Revenue', 'Operating Revenue'], cleanVal(info.totalRevenue, rawEbit * 5));
  // Yahoo ya no publica dividendRate en todos los valores: dividendo anual previsto = rentabilidad × precio
  const rawDividendo = num(info.dividendRate)
    ?? (num(info.dividendYield) !== null ? round((info.dividendYield as number) * precio, 2) : null)
    ?? cleanVal(info.trailingAnnualDividendRate, 0);

  const M = 1_000_000;
  const efectivoM = round(rawEfectivo / M, 2);
  const activoCircM = round(rawActivoCirc / M, 2);
  const inventariosM = round(rawInventarios / M, 2);
  const activosTotalesM = round(rawActivosTotales / M, 2);
  const pasivoCircM = round(rawPasivoCirc / M, 2);
  const totalPasivoM = round(rawPasivoTotal / M, 2);
  const patrimonioM = rawPatrimonio > 0 ? round(rawPatrimonio / M, 2) : 100.0;
  const ebitM = round(rawEbit / M, 2);
  const utilidadM = round(rawUtilidad / M, 2);
  const interesesM = round(rawIntereses / M, 2);
  const capM = marketCap > 0 ? round(marketCap / M, 2) : round(precio * (shares / M), 2);
  const accionesM = shares > 0 ? round(shares / M, 2) : 100.0;

  const currentRatio = pasivoCircM > 0 ? round(activoCircM / pasivoCircM, 2) : 2.0;
  const quickRatio = pasivoCircM > 0 ? round((activoCircM - inventariosM) / pasivoCircM, 2) : 1.5;
  const cashRatio = pasivoCircM > 0 ? round(efectivoM / pasivoCircM, 2) : 0.5;
  const debtToEquity = patrimonioM > 0 ? round(totalPasivoM / patrimonioM, 2) : 9.9;
  const interestCoverage = interesesM > 0 ? round(ebitM / interesesM, 2) : 99.0;
  const roe = patrimonioM > 0 ? round((utilidadM / patrimonioM) * 100, 2) : 0;
  const roa = activosTotalesM > 0 ? round((utilidadM / activosTotalesM) * 100, 2) : 0;
  const bpa = accionesM > 0 ? round(utilidadM / accionesM, 2) : round(precio / 15, 2);
  const per = bpa > 0 ? round(precio / bpa, 2) : 0;
  const pb = patrimonioM > 0 ? round(capM / patrimonioM, 2) : 1.5;
  const divYield = precio > 0 ? round((rawDividendo / precio) * 100, 2) : 0;

  const ventasM = rawVentas / M;
  const margenNeto = rawVentas > 0 ? round((utilidadM / ventasM) * 100, 2) : 15.0;
  const rotacion = activosTotalesM > 0 ? round(ventasM / activosTotalesM, 2) : 0.8;
  const apalancamiento = patrimonioM > 0 ? round(activosTotalesM / patrimonioM, 2) : 1.8;
  const hasMoat = roe >= 15 && debtToEquity <= 1.5 && ebitM > 0;

  // Benchmarks sectoriales, valoración y consenso en paralelo (antes eran secuenciales)
  const [benchmarks, valoracion, targets] = await Promise.all([
    getBetaAndIndustryAI(ticker)
      .then(ind => {
        const m = ind.matched_damodaran_industry;
        return m && m !== 'Diversified / General Market' ? getSectorBenchmarks(m) : {};
      })
      .catch(() => ({})),
    getBetaAndIndustry(ticker)
      .then(ind => calcularValoracion(info, st, st, precio, marketCap, shares, rawEbit, rawIntereses, rawPatrimonio, ind.beta))
      .catch(err => {
        log(`[VALORACION] No se pudo calcular para ${ticker}: ${err?.message}`);
        return null;
      }),
    getAnalystPriceTargets(ticker).catch(() => null)
  ]);

  let targetConsensus: any = null;
  if (targets?.success) {
    targetConsensus = {
      target_mean: cleanVal(targets.targetMean, 0),
      target_high: cleanVal(targets.targetHigh, 0),
      target_low: cleanVal(targets.targetLow, 0),
      recommendation: recommendationMeanToLabel(info.recommendationMean),
      number_of_analysts: targets.numberOfAnalysts,
      upside_potential: cleanVal(targets.upsideMeanPercent, 0)
    };
  }

  return {
    success: true,
    engine: 'Node (yahoo-finance2)',
    ticker,
    nombre,
    sector,
    industria,
    pais,
    anioFundacion: info.yearFounded || info.foundedYear || null,
    descripcion: resumen,
    businessSummary: resumen,
    modeloNegocio: sintetizarModeloNegocio(resumen, sector, industria),
    moat: hasMoat ? 'Foso Amplio (Moat)' : roe >= 10 ? 'Foso Moderado' : 'Sin Foso',
    raw: {
      precioCotizacion: precio,
      efectivo: efectivoM,
      activoCirculante: activoCircM,
      inventarios: inventariosM,
      activosTotales: activosTotalesM,
      pasivoCirculante: pasivoCircM,
      totalPasivo: totalPasivoM,
      patrimonioNeto: patrimonioM,
      ebit: ebitM,
      utilidadNeta: utilidadM,
      interesesPorPagar: interesesM,
      capitalizacionBursatil: capM,
      numeroAcciones: accionesM,
      dividendoPorAccion: rawDividendo,
      cuentasPorCobrar: round(rawCuentasCobrar / M, 2),
      otrosActivosCirculantes: round(rawOtrosCirc / M, 2),
      ingresosTotales: round(rawVentas / M, 2)
    },
    ratios: {
      liquidezCorriente: currentRatio,
      pruebaAcida: quickRatio,
      disponibilidadInmediata: cashRatio,
      endeudamiento: debtToEquity,
      coberturaIntereses: interestCoverage,
      roe,
      roa,
      bpa,
      per,
      pb,
      yieldDividendo: divYield
    },
    dupont: {
      margenNetoPercent: margenNeto,
      rotacionActivos: rotacion,
      apalancamientoFinanciero: apalancamiento,
      roeCalculado: round((margenNeto * rotacion * apalancamiento) / 100, 2)
    },
    sector_benchmarks: benchmarks,
    valoracion,
    target_consensus: targetConsensus
  };
}

/** Consenso de analistas vigente (formato target_consensus del catálogo) o null si no hay cobertura */
export async function getConsensoActual(ticker: string) {
  const [targets, info] = await Promise.all([getAnalystPriceTargets(ticker), getInfo(ticker)]);
  if (!targets?.success) return null;
  return {
    target_mean: cleanVal(targets.targetMean, 0),
    target_high: cleanVal(targets.targetHigh, 0),
    target_low: cleanVal(targets.targetLow, 0),
    recommendation: recommendationMeanToLabel(info.recommendationMean),
    number_of_analysts: targets.numberOfAnalysts,
    upside_potential: cleanVal(targets.upsideMeanPercent, 0)
  };
}
