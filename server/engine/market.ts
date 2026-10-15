// Mercado en vivo: cotización, velas con indicadores, consenso de analistas, recomendaciones y noticias
import { getInfo, getModule, getHistory, getChartMeta, searchNews } from './yahoo';
import { ema, rsi, macd } from './indicators';
import { targetsChart } from './charts';
import { num, cleanVal, round } from './util';

const FUENTE = 'Yahoo Finance';

export async function getLivePrice(rawTicker: string) {
  const ticker = rawTicker.toUpperCase().trim();
  try {
    const meta = await getChartMeta(ticker);
    let price = cleanVal(meta.regularMarketPrice, 0);
    let prev = cleanVal(meta.chartPreviousClose ?? meta.previousClose, price);
    if (price === 0) {
      const info = await getInfo(ticker);
      price = cleanVal(info.currentPrice || info.regularMarketPrice || info.previousClose, 0);
      prev = cleanVal(info.previousClose, price);
    }
    if (price <= 0) throw new Error(`Sin cotización para ${ticker}`);
    const change = round(price - prev, 2);
    return {
      success: true,
      ticker,
      price: round(price, 2),
      previousClose: round(prev, 2),
      change,
      changePercent: prev > 0 ? round((change / prev) * 100, 2) : 0,
      dayHigh: round(cleanVal(meta.regularMarketDayHigh), 2),
      dayLow: round(cleanVal(meta.regularMarketDayLow), 2),
      yearHigh: round(cleanVal(meta.fiftyTwoWeekHigh), 2),
      yearLow: round(cleanVal(meta.fiftyTwoWeekLow), 2),
      currency: meta.currency || 'USD',
      source: FUENTE
    };
  } catch (err: any) {
    return { success: false, ticker, error: String(err?.message || err), price: 0, previousClose: 0, change: 0, changePercent: 0, source: FUENTE };
  }
}

const vacio = (ticker: string, period: string, interval: string, error: string) => ({
  success: false, ticker, period, interval, error, points: [],
  emas: { ema20: [], ema50: [], ema40: [], ema200: [] }
});

/** Velas OHLCV con EMA 20/50/200, RSI 14 y MACD 12/26/9 */
export async function getCandlestickData(rawTicker: string, periodIn = '1y', intervalIn = '1d') {
  const ticker = rawTicker.toUpperCase().trim();
  const period = ['1mo', '3mo', '6mo', '1y', '5y', 'max'].includes(periodIn) ? periodIn : '1y';
  const interval = ['1d', '1wk', '1mo'].includes(intervalIn) ? intervalIn : '1d';

  let velas;
  try {
    velas = await getHistory(ticker, period, interval);
  } catch (err: any) {
    return { success: false, ticker, period, interval, error: String(err?.message || err), points: [] };
  }
  if (!velas.length) return vacio(ticker, period, interval, `No se obtuvieron velas para el ticker ${ticker}`);

  const cierres = velas.map(v => v.close);
  const e20 = ema(cierres, 20);
  const e50 = ema(cierres, 50);
  const e200 = ema(cierres, 200);
  const r14 = rsi(cierres, 14);
  const m = macd(cierres);
  const r = (v: number | null, d: number) => (v === null || !Number.isFinite(v) ? null : round(v, d));

  const points = velas.map((v, i) => {
    const open = Number.isFinite(v.open) && v.open > 0 ? v.open : v.close;
    const high = Number.isFinite(v.high) && v.high > 0 ? v.high : Math.max(open, v.close);
    const low = Number.isFinite(v.low) && v.low > 0 ? v.low : Math.min(open, v.close);
    const ema50 = r(e50[i], 2);
    return {
      date: v.date,
      open: round(open, 2),
      high: round(high, 2),
      low: round(low, 2),
      close: round(v.close, 2),
      price: round(v.close, 2),
      volume: Math.trunc(v.volume || 0),
      ema20: r(e20[i], 2),
      ema50,
      ema40: ema50,
      ema200: r(e200[i], 2),
      rsi: r(r14[i], 2),
      macdLine: r(m.line[i], 4),
      macdSignal: r(m.signal[i], 4),
      macdHist: r(m.hist[i], 4)
    };
  });

  const serie = (campo: keyof (typeof points)[number]) =>
    points.filter(p => p[campo] !== null).map(p => ({ time: p.date, value: p[campo] as number }));
  const first = points[0].close;
  const last = points[points.length - 1].close;
  const ultimo = points[points.length - 1];
  const precios = points.map(p => p.close);

  return {
    success: true,
    ticker,
    period,
    interval,
    points,
    emas: { ema20: serie('ema20'), ema50: serie('ema50'), ema40: serie('ema40'), ema200: serie('ema200') },
    rsi: serie('rsi'),
    macd: { line: serie('macdLine'), signal: serie('macdSignal'), hist: serie('macdHist') },
    indicators: {
      ema20: ultimo.ema20, ema50: ultimo.ema50, ema40: ultimo.ema40, ema200: ultimo.ema200,
      rsi: ultimo.rsi, macdLine: ultimo.macdLine, macdSignal: ultimo.macdSignal, macdHist: ultimo.macdHist
    },
    currentPrice: last,
    firstPrice: first,
    change: round(last - first, 2),
    changePercent: first > 0 ? round(((last - first) / first) * 100, 2) : 0,
    min52w: round(Math.min(...precios), 2),
    max52w: round(Math.max(...precios), 2),
    source: FUENTE
  };
}

/** Consenso de precios objetivo de analistas con gráfico de distribución */
export async function getAnalystPriceTargets(rawTicker: string) {
  const ticker = rawTicker.toUpperCase().trim();
  let info: Record<string, any>;
  try {
    info = await getInfo(ticker);
  } catch (err: any) {
    return { success: false, ticker, error: String(err?.message || err) };
  }

  const cur = cleanVal(info.currentPrice || info.regularMarketPrice || info.previousClose, 0);
  const mean = num(info.targetMeanPrice);
  // Sin cobertura de analistas no se fabrican objetivos (el motor anterior inventaba ±15-25 %)
  if (!mean || cur <= 0) {
    return { success: false, ticker, error: `${ticker} no tiene cobertura de analistas con precio objetivo en Yahoo Finance.` };
  }
  const low = cleanVal(info.targetLowPrice, mean);
  const high = cleanVal(info.targetHighPrice, mean);
  const median = cleanVal(info.targetMedianPrice, mean);
  const upsideMean = round(((mean - cur) / cur) * 100, 2);
  const upsideHigh = round(((high - cur) / cur) * 100, 2);
  const downsideLow = round(((low - cur) / cur) * 100, 2);
  const analistas = cleanVal(info.numberOfAnalystOpinions, 0);

  let chart: string | null = null;
  try {
    chart = targetsChart({ ticker, actual: cur, low, high, mean, median, upsideMean, upsideHigh, downsideLow, analistas });
  } catch {
    chart = null;
  }

  return {
    success: true,
    ticker,
    currentPrice: round(cur, 2),
    targetLow: round(low, 2),
    targetHigh: round(high, 2),
    targetMean: round(mean, 2),
    targetMedian: round(median, 2),
    upsideMeanPercent: upsideMean,
    upsideHighPercent: upsideHigh,
    downsideLowPercent: downsideLow,
    numberOfAnalysts: analistas > 0 ? Math.trunc(analistas) : null,
    chart,
    source: FUENTE
  };
}

const fechaTexto = (d: unknown) => {
  const t = d instanceof Date ? d : new Date(typeof d === 'number' && d < 1e12 ? d * 1000 : (d as any));
  return Number.isNaN(t.getTime()) ? null : t.toISOString().replace('T', ' ').slice(0, 19);
};

/** Recomendaciones de consenso y cambios de calificación (upgrades / downgrades) */
export async function getRecommendations(rawTicker: string) {
  const ticker = rawTicker.toUpperCase().trim();
  let trend: any;
  let historial: any;
  try {
    [trend, historial] = await Promise.all([getModule(ticker, 'recommendationTrend'), getModule(ticker, 'upgradeDowngradeHistory')]);
  } catch (err: any) {
    return { success: false, ticker, error: String(err?.message || err) };
  }

  const recommendations = (trend?.trend || []).map((t: any) => ({
    period: t.period, strongBuy: t.strongBuy ?? 0, buy: t.buy ?? 0, hold: t.hold ?? 0, sell: t.sell ?? 0, strongSell: t.strongSell ?? 0
  }));

  let summary: any = null;
  const latest = recommendations[0];
  if (latest) {
    const { strongBuy: sb, buy: b, hold: h, sell: s, strongSell: ss } = latest;
    const total = sb + b + h + s + ss;
    if (total > 0) {
      const buyRatio = (sb + b) / total;
      const sellRatio = (s + ss) / total;
      const consensus = buyRatio >= 0.7 ? 'Compra Fuerte (Strong Buy)'
        : buyRatio >= 0.5 ? 'Compra (Buy)'
        : sellRatio >= 0.4 ? 'Venta (Sell)'
        : 'Mantener (Hold)';
      summary = { period: latest.period || '0m', totalAnalysts: total, strongBuy: sb, buy: b, hold: h, sell: s, strongSell: ss, consensus };
    }
  }

  const upgradesDowngrades = [...(historial?.history || [])]
    .sort((a: any, b: any) => new Date(b.epochGradeDate).getTime() - new Date(a.epochGradeDate).getTime())
    .slice(0, 25)
    .map((u: any) => ({
      GradeDate: fechaTexto(u.epochGradeDate),
      Firm: u.firm ?? null,
      ToGrade: u.toGrade ?? null,
      FromGrade: u.fromGrade ?? null,
      Action: u.action ?? null,
      priceTargetAction: u.priceTargetAction ?? null,
      currentPriceTarget: num(u.currentPriceTarget),
      priorPriceTarget: num(u.priorPriceTarget)
    }));

  return { success: true, ticker, summary, recommendations, upgradesDowngrades, source: FUENTE };
}

export async function getCompanyNews(rawTicker: string) {
  const ticker = rawTicker.toUpperCase().trim();
  let items: any[];
  try {
    items = await searchNews(ticker, 10);
  } catch (err: any) {
    return { success: false, ticker, error: String(err?.message || err), news: [] };
  }
  const news = items
    .filter(it => it?.title)
    .map((it, i) => {
      const res = it.thumbnail?.resolutions || [];
      const thumb = res.find((r: any) => r.tag === 'original') || res[0];
      const pub = it.providerPublishTime ? new Date(it.providerPublishTime) : null;
      return {
        id: String(it.uuid || i),
        title: it.title,
        summary: it.summary || '',
        publisher: it.publisher || FUENTE,
        link: it.link || '',
        pubDate: pub && !Number.isNaN(pub.getTime()) ? pub.toISOString() : null,
        thumbnail: thumb?.url || null
      };
    });
  return { success: true, ticker, count: news.length, news, source: FUENTE };
}
