// Acceso a Yahoo Finance desde Node (sustituye a yfinance).
// yahoo-finance2 gestiona la cookie y el «crumb» que Yahoo exige en quoteSummary.
import * as yahooFinanceModule from 'yahoo-finance2';
import { num, withTimeout } from './util';

// El paquete se carga como ESM en local y como CommonJS dentro de la función de Netlify:
// se busca la clase en las dos formas de exportación
const modulo: any = yahooFinanceModule;
const YahooFinance = [modulo.default?.default, modulo.default, modulo].find(c => typeof c === 'function');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const NO_VALIDAR = { validateResult: false };
const TIMEOUT_MS = 15000;

/** Un reintento ante cortes de red puntuales («fetch failed», ECONNRESET, 5xx) */
async function conReintento<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (!/fetch failed|ECONNRESET|ETIMEDOUT|socket|5\d\d|Too Many Requests|429/i.test(msg)) throw err;
    await new Promise(r => setTimeout(r, 700));
    return fn();
  }
}

/** Símbolo de Yahoo: las clases de acciones usan guion (BRK.B → BRK-B) */
export function yahooSymbol(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  return /^[A-Z]+\.[A-Z]$/.test(t) ? t.replace('.', '-') : t;
}

// ---------------------------------------------------------------
// info: módulos de quoteSummary fusionados como el dict stock.info de yfinance
// ---------------------------------------------------------------
const INFO_MODULES = ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'price'];
// Una sola petición por empresa sirve también a recomendaciones, calificaciones e historial de BPA
const EXTRA_MODULES = ['recommendationTrend', 'upgradeDowngradeHistory', 'earningsHistory'];
const infoCache = new Map<string, { expires: number; promise: Promise<Record<string, any>> }>();
const INFO_TTL_MS = 10 * 60 * 1000;

export function getInfo(ticker: string): Promise<Record<string, any>> {
  const symbol = yahooSymbol(ticker);
  const modules = [...INFO_MODULES, ...EXTRA_MODULES];
  const key = symbol;
  const hit = infoCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = withTimeout<any>(
    conReintento(() => yf.quoteSummary(symbol, { modules }, NO_VALIDAR)),
    TIMEOUT_MS,
    `Yahoo Finance no respondió a tiempo para ${ticker}`
  ).then((qs: any) => {
    const info: Record<string, any> = {};
    for (const m of INFO_MODULES) Object.assign(info, qs?.[m] || {});
    // Campos con el mismo nombre que en yfinance
    info.longName = qs?.price?.longName ?? info.longName;
    info.shortName = qs?.price?.shortName ?? info.shortName;
    info.regularMarketPrice = qs?.price?.regularMarketPrice ?? info.regularMarketPrice;
    info.currency = qs?.price?.currency ?? info.currency;
    info.averageDailyVolume3Month = qs?.price?.averageDailyVolume3Month ?? info.averageDailyVolume3Month;
    info._modules = qs;
    return info;
  });
  promise.catch(() => infoCache.delete(key));
  infoCache.set(key, { expires: Date.now() + INFO_TTL_MS, promise });
  return promise;
}

/** Módulo concreto de quoteSummary (recommendationTrend, upgradeDowngradeHistory, earningsHistory…) */
export async function getModule(ticker: string, module: string): Promise<any> {
  const info = await getInfo(ticker);
  return info._modules?.[module];
}

// ---------------------------------------------------------------
// Estados financieros anuales (balance, resultados y flujos) como en yfinance:
// columnas del ejercicio más reciente al más antiguo y partidas con su nombre en inglés.
// ---------------------------------------------------------------
export class Statement {
  constructor(private readonly periods: Array<Record<string, any>>) {}

  get empty(): boolean {
    return this.periods.length === 0;
  }

  get columns(): number {
    return this.periods.length;
  }

  /** Valor de la partida en la columna `col` (0 = último ejercicio); null si no existe */
  at(name: string, col: number): number | null {
    return num(this.periods[col]?.[toKey(name)]);
  }

  /** Primera partida disponible en la columna `col` (scanner: _fila) */
  first(names: string[], col = 0): number | null {
    for (const n of names) {
      const v = this.at(n, col);
      if (v !== null) return v;
    }
    return null;
  }

  /** Valor más reciente no nulo de la primera partida que tenga datos (get_bs_item de yfinance) */
  latest(names: string[]): number | null {
    for (const n of names) {
      for (let c = 0; c < this.periods.length; c++) {
        const v = this.at(n, c);
        if (v !== null) return v;
      }
    }
    return null;
  }

  /** Serie de la partida (más reciente primero) sin nulos */
  series(name: string): number[] {
    return this.periods.map(p => num(p[toKey(name)])).filter((v): v is number => v !== null);
  }

  has(name: string): boolean {
    return this.periods.some(p => num(p[toKey(name)]) !== null);
  }
}

/** 'Total Current Assets' → 'totalCurrentAssets'; 'EBIT' se mantiene */
function toKey(name: string): string {
  const words = name.split(/\s+/);
  return words
    .map((w, i) => {
      if (w === w.toUpperCase() && w.length > 1) return i === 0 ? w : w;
      const lower = w.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

const statementsCache = new Map<string, { expires: number; promise: Promise<Statement> }>();

export function getStatements(ticker: string): Promise<Statement> {
  const symbol = yahooSymbol(ticker);
  const hit = statementsCache.get(symbol);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const period1 = new Date(Date.now() - 6 * 365 * 864e5).toISOString().slice(0, 10);
  const promise = withTimeout<any[]>(
    conReintento(() => yf.fundamentalsTimeSeries(symbol, { period1, type: 'annual', module: 'all' }, NO_VALIDAR)),
    TIMEOUT_MS,
    `Yahoo Finance no devolvió estados financieros de ${ticker} a tiempo`
  ).then(rows => {
    // Una fila por fecha de cierre; si Yahoo separa partidas en varias filas con la misma fecha se fusionan
    const byDate = new Map<string, Record<string, any>>();
    for (const r of rows || []) {
      const d = new Date(r.date).toISOString().slice(0, 10);
      byDate.set(d, { ...(byDate.get(d) || {}), ...r });
    }
    const ordered = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, v]) => v);
    return new Statement(ordered);
  });
  promise.catch(() => statementsCache.delete(symbol));
  statementsCache.set(symbol, { expires: Date.now() + INFO_TTL_MS, promise });
  return promise;
}

// ---------------------------------------------------------------
// Histórico de cotizaciones (stock.history de yfinance: precios ajustados por defecto)
// ---------------------------------------------------------------
export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PERIOD_DAYS: Record<string, number> = {
  '1d': 1, '5d': 5, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 731, '5y': 1827, '10y': 3653
};

export function periodStart(period: string): Date {
  if (period === 'max') return new Date('1970-01-02');
  if (period === 'ytd') return new Date(new Date().getFullYear(), 0, 1);
  return new Date(Date.now() - (PERIOD_DAYS[period] ?? 366) * 864e5);
}

const historyCache = new Map<string, { expires: number; promise: Promise<Candle[]> }>();

export function getHistory(ticker: string, period = '1y', interval = '1d', adjust = true): Promise<Candle[]> {
  const symbol = ticker.startsWith('^') ? ticker : yahooSymbol(ticker);
  const key = `${symbol}|${period}|${interval}|${adjust}`;
  const hit = historyCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = withTimeout<any>(
    conReintento(() => yf.chart(symbol, { period1: periodStart(period), interval }, NO_VALIDAR)),
    TIMEOUT_MS,
    `Yahoo Finance no devolvió cotizaciones de ${ticker} a tiempo`
  ).then((res: any) => {
    const out: Candle[] = [];
    for (const q of res?.quotes || []) {
      const close = num(q.close);
      if (close === null || close <= 0) continue;
      const adj = adjust ? num(q.adjclose) : null;
      const f = adj && adj > 0 ? adj / close : 1;
      const o = num(q.open);
      const h = num(q.high);
      const l = num(q.low);
      out.push({
        date: new Date(q.date).toISOString().slice(0, 10),
        open: o !== null ? o * f : NaN,
        high: h !== null ? h * f : NaN,
        low: l !== null ? l * f : NaN,
        close: close * f,
        volume: num(q.volume) ?? 0
      });
    }
    return out;
  });
  promise.catch(() => historyCache.delete(key));
  historyCache.set(key, { expires: Date.now() + 5 * 60 * 1000, promise });
  return promise;
}

/** Metadatos de la serie (precio actual, cierre previo, máximos/mínimos del día y de 52 semanas) */
export async function getChartMeta(ticker: string): Promise<any> {
  const symbol = yahooSymbol(ticker);
  const res: any = await withTimeout(
    conReintento(() => yf.chart(symbol, { period1: new Date(Date.now() - 7 * 864e5), interval: '1d' }, NO_VALIDAR)),
    TIMEOUT_MS,
    `Yahoo Finance no respondió a tiempo para ${ticker}`
  );
  return res?.meta || {};
}

export async function searchNews(ticker: string, count = 10): Promise<any[]> {
  const res: any = await withTimeout(
    conReintento(() => yf.search(yahooSymbol(ticker), { newsCount: count, quotesCount: 0 }, NO_VALIDAR)),
    TIMEOUT_MS,
    `Yahoo Finance no devolvió noticias de ${ticker} a tiempo`
  );
  return res?.news || [];
}
