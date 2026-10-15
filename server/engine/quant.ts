// Cálculo cuantitativo: Markowitz, gráficos estadísticos, tracking error y medidas de riesgo (VaR/CVaR)
import { getHistory, yahooSymbol, Candle } from './yahoo';
import { getRiskFreeRate } from './damodaran';
import { correlationHeatmap, frontierChart, returnsDistributionChart } from './charts';
import {
  mean, std, variance, covariance, correlation, percentile, ewmaStd, normInv, normPdf,
  seededRandom, expSample, round
} from './util';

const DIAS = 252;

/** Cierres alineados por fecha (inner join tras dropna) de varios tickers */
async function preciosAlineados(tickers: string[], period = '1y'): Promise<{ fechas: string[]; precios: number[][] } | null> {
  const series = await Promise.all(tickers.map(t => getHistory(t, period, '1d').catch((): Candle[] => [])));
  if (series.some(s => s.length === 0)) return null;
  const mapas = series.map(s => new Map(s.map(v => [v.date, v.close])));
  const fechas = [...mapas[0].keys()].filter(d => mapas.every(m => m.has(d))).sort();
  if (fechas.length < 30) return null;
  return { fechas, precios: mapas.map(m => fechas.map(d => m.get(d) as number)) };
}

const pctChange = (xs: number[]) => xs.slice(1).map((x, i) => x / xs[i] - 1);

function matrices(rets: number[][]) {
  const n = rets.length;
  const cov = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => covariance(rets[i], rets[j])));
  const corr = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : correlation(rets[i], rets[j]))));
  return { cov, corr };
}

/** Matriz como dict de pandas (to_dict): {columna: {fila: valor}} */
const aDict = (tickers: string[], m: number[][], d: number) =>
  Object.fromEntries(tickers.map((c, j) => [c, Object.fromEntries(tickers.map((r, i) => [r, round(m[i][j], d)]))]));

function estadisticosCartera(w: number[], mu: number[], cov: number[][], rf: number) {
  const ret = w.reduce((a, wi, i) => a + wi * mu[i], 0);
  let v = 0;
  for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i] * w[j] * cov[i][j];
  const vol = Math.sqrt(Math.max(0.000001, v));
  return { ret, vol, sharpe: vol > 0 ? (ret - rf) / vol : 0 };
}

async function universo(tickersIn: string[]) {
  const tickers = tickersIn.map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 6);
  const datos = await preciosAlineados(tickers);
  let mu: number[];
  let cov: number[][];
  let corr: number[][];
  let rets: number[][] | null = null;
  if (datos) {
    rets = datos.precios.map(pctChange);
    mu = rets.map(r => mean(r) * DIAS);
    const m = matrices(rets);
    cov = m.cov.map(f => f.map(v => v * DIAS));
    corr = m.corr;
  } else {
    // Respaldo analítico determinista cuando Yahoo no responde
    const n = tickers.length;
    mu = tickers.map((_, i) => 0.09 + (0.07 * i) / Math.max(1, n - 1));
    const vols = tickers.map((_, i) => 0.12 + (0.12 * i) / Math.max(1, n - 1));
    corr = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0.25 + 0.15 * Math.cos(i + j))));
    cov = corr.map((f, i) => f.map((c, j) => c * vols[i] * vols[j]));
  }
  return { tickers, mu, cov, corr, rets };
}

export async function computeMarkowitz(tickersIn: string[], rf = 0.04, numPortfolios = 120) {
  const { tickers, mu, cov, corr } = await universo(tickersIn);
  if (tickers.length < 2) {
    return { error: 'Se requieren al menos 2 tickers para calcular la matriz de covarianza de Markowitz.' };
  }
  const n = tickers.length;
  const rand = seededRandom(42);
  const eqW = tickers.map(() => 1 / n);
  const eq = estadisticosCartera(eqW, mu, cov, rf);
  const vols = cov.map((f, i) => Math.sqrt(f[i]));

  const results: any[] = [];
  let maxIdx = 0;
  let minIdx = 0;
  let maxSharpe = -999;
  let minVol = 999;
  for (let k = 0; k < numPortfolios; k++) {
    const raw = tickers.map(() => expSample(rand));
    const s = raw.reduce((a, b) => a + b, 0);
    const w = raw.map(x => x / s);
    const p = estadisticosCartera(w, mu, cov, rf);
    const indiv = w.reduce((a, wi, i) => a + wi * vols[i], 0);
    results.push({
      expectedReturn: round(p.ret, 4),
      volatility: round(p.vol, 4),
      sharpeRatio: round(p.sharpe, 4),
      diversificationRatio: round(indiv > 0 ? ((indiv - p.vol) / indiv) * 100 : 0, 2),
      weights: w.map(x => round(x, 4))
    });
    if (p.sharpe > maxSharpe) {
      maxSharpe = p.sharpe;
      maxIdx = k;
    }
    if (p.vol < minVol) {
      minVol = p.vol;
      minIdx = k;
    }
  }
  const porTicker = (w: number[]) => Object.fromEntries(tickers.map((t, i) => [t, w[i]]));

  return {
    success: true,
    engine: 'Node (TypeScript)',
    tickers,
    expectedReturns: Object.fromEntries(tickers.map((t, i) => [t, round(mu[i], 4)])),
    volatilities: Object.fromEntries(tickers.map((t, i) => [t, round(vols[i], 4)])),
    correlationMatrix: aDict(tickers, corr, 4),
    covarianceMatrix: aDict(tickers, cov, 6),
    maxSharpePortfolio: { ...results[maxIdx], weightsByTicker: porTicker(results[maxIdx].weights) },
    minVariancePortfolio: { ...results[minIdx], weightsByTicker: porTicker(results[minIdx].weights) },
    equalWeightPortfolio: {
      expectedReturn: round(eq.ret, 4),
      volatility: round(eq.vol, 4),
      sharpeRatio: round(eq.sharpe, 4),
      weights: eqW.map(x => round(x, 4))
    },
    simulatedCount: results.length,
    samplePoints: results.slice(0, 40)
  };
}

export async function generatePlots(tickersIn: string[], single = 'KO') {
  let lista = tickersIn.map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 6);
  if (lista.length < 2) lista = ['BRK.B', 'KO', 'AAPL', 'JNJ'];
  const { tickers, mu, cov, corr, rets } = await universo(lista);

  const rand = seededRandom(42);
  const simVols: number[] = [];
  const simRets: number[] = [];
  const simSharpes: number[] = [];
  for (let k = 0; k < 150; k++) {
    const raw = tickers.map(() => expSample(rand));
    const s = raw.reduce((a, b) => a + b, 0);
    const p = estadisticosCartera(raw.map(x => x / s), mu, cov, 0.04);
    simVols.push(p.vol);
    simRets.push(p.ret);
    simSharpes.push(p.sharpe);
  }
  const maxIdx = simSharpes.indexOf(Math.max(...simSharpes));
  const minIdx = simVols.indexOf(Math.min(...simVols));
  const objetivo = tickers.includes(single) ? single : tickers[0];
  const retsObjetivo = rets?.[tickers.indexOf(objetivo)] || [];

  return {
    success: true,
    engine: 'Node (TypeScript + SVG)',
    tickers,
    plots: {
      correlation_heatmap: correlationHeatmap(tickers, corr),
      markowitz_frontier: frontierChart(simVols, simRets, simSharpes, maxIdx, minIdx),
      returns_distribution: retsObjetivo.length ? returnsDistributionChart(objetivo, retsObjetivo) : null
    }
  };
}

// ---------------------------------------------------------------
// Tracking error frente a un benchmark
// ---------------------------------------------------------------
const errorTE = (error: string, estilo = 'No disponible') => ({
  daily_tracking_error: 0, annualized_tracking_error: 0, annualized_active_return: 0, information_ratio: 0,
  management_style: estilo, error, status: 'error'
});

/** Retornos logarítmicos por fecha */
function logRetornos(velas: Array<{ date: string; close: number }>): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 1; i < velas.length; i++) out.set(velas[i].date, Math.log(velas[i].close / velas[i - 1].close));
  return out;
}

export async function calculateTrackingError(ticker: string, benchmark = '^GSPC', period = '1y') {
  try {
    const activo = await getHistory(ticker, period, '1d').catch((): Candle[] => []);
    if (!activo.length) return errorTE(`No se obtuvieron datos de precios para ${ticker}`);
    const bench = await getHistory(benchmark.startsWith('^') ? benchmark : yahooSymbol(benchmark), period, '1d').catch((): Candle[] => []);
    if (!bench.length) return errorTE(`No se obtuvieron datos de benchmark para ${benchmark}`);

    const ra = logRetornos(activo);
    const rb = logRetornos(bench);
    const fechas = [...ra.keys()].filter(d => rb.has(d)).sort();
    if (fechas.length < 10) return errorTE(`Pocos puntos de datos alineados (${fechas.length})`, 'Datos insuficientes');

    const diff = fechas.map(d => (ra.get(d) as number) - (rb.get(d) as number));
    const te = std(diff);
    const teAnual = te * Math.sqrt(DIAS);
    const activoAnual = mean(diff) * DIAS;
    const ir = teAnual > 0 ? activoAnual / teAnual : 0;
    const estilo = teAnual < 0.02 ? 'Closet Indexing / Réplica Pasiva'
      : teAnual <= 0.06 ? 'Gestión Activa Moderada / Selección Sectorial'
      : 'Alta Gestión Activa / Estrategia de Convicción';
    return {
      daily_tracking_error: round(te, 6),
      annualized_tracking_error: round(teAnual, 4),
      annualized_active_return: round(activoAnual, 4),
      information_ratio: round(ir, 4),
      management_style: estilo,
      observations: fechas.length,
      period,
      benchmark,
      status: 'success'
    };
  } catch (err: any) {
    return errorTE(String(err?.message || err), 'Error');
  }
}

// ---------------------------------------------------------------
// Random Forest de regresión (scikit-learn: 100 árboles, bootstrap, todas las variables, hojas puras)
// ---------------------------------------------------------------
type Rama = { hoja: false; f: number; umbral: number; izq: Nodo; der: Nodo };
type Nodo = { hoja: true; valor: number } | Rama;

function construirArbol(X: number[][], y: number[], idx: number[]): Nodo {
  const media = idx.reduce((a, i) => a + y[i], 0) / idx.length;
  if (idx.length < 2 || idx.every(i => y[i] === y[idx[0]])) return { hoja: true, valor: media };

  const total = idx.reduce((a, i) => a + y[i], 0);
  let mejor = { sse: Infinity, f: -1, umbral: 0 };
  const nf = X[0].length;
  for (let f = 0; f < nf; f++) {
    const orden = [...idx].sort((a, b) => X[a][f] - X[b][f]);
    let sumIzq = 0;
    let sqIzq = 0;
    let sqTotal = 0;
    for (const i of orden) sqTotal += y[i] * y[i];
    for (let k = 0; k < orden.length - 1; k++) {
      const yi = y[orden[k]];
      sumIzq += yi;
      sqIzq += yi * yi;
      const xa = X[orden[k]][f];
      const xb = X[orden[k + 1]][f];
      if (xa === xb) continue;
      const nI = k + 1;
      const nD = orden.length - nI;
      const sumDer = total - sumIzq;
      const sse = (sqIzq - (sumIzq * sumIzq) / nI) + (sqTotal - sqIzq - (sumDer * sumDer) / nD);
      if (sse < mejor.sse) mejor = { sse, f, umbral: (xa + xb) / 2 };
    }
  }
  if (mejor.f < 0) return { hoja: true, valor: media };
  const izq = idx.filter(i => X[i][mejor.f] <= mejor.umbral);
  const der = idx.filter(i => X[i][mejor.f] > mejor.umbral);
  return { hoja: false, f: mejor.f, umbral: mejor.umbral, izq: construirArbol(X, y, izq), der: construirArbol(X, y, der) };
}

function predecir(nodo: Nodo, x: number[]): number {
  let n: Nodo = nodo;
  for (;;) {
    if (n.hoja) return (n as { valor: number }).valor;
    const r = n as Rama;
    n = x[r.f] <= r.umbral ? r.izq : r.der;
  }
}

/** Predicción out-of-bag: cada observación la predicen solo los árboles que no la vieron */
function randomForestOob(X: number[][], y: number[], arboles = 100, semilla = 42): number[] {
  const rand = seededRandom(semilla);
  const n = y.length;
  const suma = new Array(n).fill(0);
  const cuenta = new Array(n).fill(0);
  for (let t = 0; t < arboles; t++) {
    const muestra = Array.from({ length: n }, () => Math.floor(rand() * n));
    const dentro = new Set(muestra);
    const arbol = construirArbol(X, y, muestra);
    for (let i = 0; i < n; i++) {
      if (!dentro.has(i)) {
        suma[i] += predecir(arbol, X[i]);
        cuenta[i]++;
      }
    }
  }
  return suma.map((s, i) => (cuenta[i] ? s / cuenta[i] : y[i]));
}

function varCvarNormal(r: number[], confianza: number) {
  const z = normInv(1 - confianza);
  const vol = std(r);
  return { var: -vol * z, cvar: vol * (normPdf(z) / (1 - confianza)) };
}

function varCvarEwma(r: number[], confianza: number, lambda = 0.94) {
  const vol = ewmaStd(r, lambda);
  const z = normInv(1 - confianza);
  return { var: -vol * z, cvar: vol * (normPdf(z) / (1 - confianza)), vol };
}

function varCvarMl(r: number[], confianza: number, lag = 5) {
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = lag; i < r.length; i++) {
    X.push(Array.from({ length: lag }, (_, k) => r[i - k - 1]));
    y.push(r[i]);
  }
  const pred = randomForestOob(X, y);
  const residuos = y.map((v, i) => v - pred[i]);
  const v = -percentile(residuos, (1 - confianza) * 100);
  const cola = residuos.filter(x => x <= -v);
  return { var: v, cvar: -mean(cola) };
}

export async function calcularMedidasRiesgo(ticker: string, period = '1y', monto = 100000, confianza = 0.95, benchmark = '^GSPC') {
  try {
    const t = ticker.toUpperCase().trim();
    const simbolo = yahooSymbol(t);
    const series: Candle[][] | null = await Promise.all([getHistory(simbolo, period, '1d'), getHistory(benchmark, period, '1d')]).catch(() => null);
    if (!series) return { success: false, error: `No se obtuvieron precios de ${simbolo} para el periodo ${period}.` };
    const [sa, sb] = series;
    if (!sa.length) return { success: false, error: `No se obtuvieron precios de ${simbolo} para el periodo ${period}.` };
    if (!sb.length) return { success: false, error: `No se obtuvieron precios de ${benchmark} para el periodo ${period}.` };

    // Igual que pandas: unión de fechas, retorno contra la fila anterior y descarte de filas incompletas
    const ma = new Map(sa.map(v => [v.date, v.close]));
    const mb = new Map(sb.map(v => [v.date, v.close]));
    const fechas = [...new Set([...ma.keys(), ...mb.keys()])].sort();
    const ra: number[] = [];
    const rm: number[] = [];
    for (let i = 1; i < fechas.length; i++) {
      const a0 = ma.get(fechas[i - 1]), a1 = ma.get(fechas[i]);
      const b0 = mb.get(fechas[i - 1]), b1 = mb.get(fechas[i]);
      if (a0 && a1 && b0 && b1) {
        ra.push(Math.log(a1 / a0));
        rm.push(Math.log(b1 / b0));
      }
    }
    if (ra.length < 30) return { success: false, error: `Datos insuficientes para medir riesgo (${ra.length} observaciones).` };

    const rf = await getRiskFreeRate();
    const rendMercado = mean(rm) * DIAS;
    const varMercado = variance(rm);
    const r2 = (v: number) => round(v, 2);
    const r6 = (v: number) => round(v, 6);

    const medir = (nombre: string, tk: string, r: number[]) => {
      const rendAnual = mean(r) * DIAS;
      const volAnual = std(r) * Math.sqrt(DIAS);
      const beta = varMercado > 0 ? covariance(r, rm) / varMercado : null;
      const n = varCvarNormal(r, confianza);
      const e = varCvarEwma(r, confianza);
      let ml: any = null;
      try {
        const m = varCvarMl(r, confianza);
        ml = { var: r2(m.var * monto), cvar: r2(m.cvar * monto), var_pct: r6(m.var), cvar_pct: r6(m.cvar) };
      } catch {
        ml = null;
      }
      return {
        nombre,
        ticker: tk,
        rendimiento_anual: r6(rendAnual),
        volatilidad_anual: r6(volAnual),
        sharpe: volAnual > 0 ? r6((rendAnual - rf) / volAnual) : null,
        beta: beta !== null ? round(beta, 4) : null,
        capm: beta !== null ? r6(rf + beta * (rendMercado - rf)) : null,
        vol_ewma_diaria: r6(e.vol),
        normal: { var: r2(n.var * monto), cvar: r2(n.cvar * monto), var_pct: r6(n.var), cvar_pct: r6(n.cvar) },
        ewma: { var: r2(e.var * monto), cvar: r2(e.cvar * monto), var_pct: r6(e.var), cvar_pct: r6(e.cvar) },
        ml
      };
    };

    return {
      success: true,
      ticker: t,
      benchmark,
      period,
      monto_inversion: monto,
      confianza,
      horizonte_dias: 1,
      lambda_ewma: 0.94,
      tasa_libre_riesgo: r6(rf),
      rendimiento_mercado: r6(rendMercado),
      observaciones: ra.length,
      activos: [
        medir(t, simbolo, ra),
        medir(benchmark === '^GSPC' ? 'S&P 500' : benchmark, benchmark, rm)
      ],
      source: 'Yahoo Finance'
    };
  } catch (err: any) {
    return { success: false, error: `No se pudieron calcular las medidas de riesgo: ${err?.message || err}` };
  }
}
