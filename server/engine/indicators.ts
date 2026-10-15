// Indicadores técnicos con la misma definición que pandas.ewm y la librería `ta` de Python

/**
 * pandas Series.ewm(alpha|span, adjust=False, min_periods).mean():
 * la recursión arranca en el primer valor no nulo; antes de reunir min_periods observaciones → null
 */
export function ewmMean(values: Array<number | null>, alpha: number, minPeriods = 0): Array<number | null> {
  const out: Array<number | null> = [];
  let prev: number | null = null;
  let count = 0;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) {
      out.push(prev !== null && count >= minPeriods ? prev : null);
      continue;
    }
    count++;
    prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
    out.push(count >= minPeriods ? prev : null);
  }
  return out;
}

/** EMA por span (df['Close'].ewm(span=X, adjust=False).mean()) */
export function ema(values: number[], span: number, minPeriods = 0): Array<number | null> {
  return ewmMean(values, 2 / (span + 1), minPeriods);
}

/** ta.momentum.RSIIndicator(close, window=14).rsi() */
export function rsi(close: number[], window = 14): Array<number | null> {
  const up: number[] = [];
  const down: number[] = [];
  for (let i = 0; i < close.length; i++) {
    const diff = i === 0 ? NaN : close[i] - close[i - 1];
    up.push(diff > 0 ? diff : 0);
    down.push(diff < 0 ? -diff : 0);
  }
  const emaUp = ewmMean(up, 1 / window, window);
  const emaDn = ewmMean(down, 1 / window, window);
  return emaUp.map((u, i) => {
    const d = emaDn[i];
    if (u === null || d === null) return null;
    if (d === 0) return 100;
    return 100 - 100 / (1 + u / d);
  });
}

/** ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9) */
export function macd(close: number[], fast = 12, slow = 26, sign = 9) {
  const emaFast = ema(close, fast, fast);
  const emaSlow = ema(close, slow, slow);
  const line = emaFast.map((f, i) => (f !== null && emaSlow[i] !== null ? f - (emaSlow[i] as number) : null));
  const signal = ewmMean(line, 2 / (sign + 1), sign);
  const hist = line.map((l, i) => (l !== null && signal[i] !== null ? l - (signal[i] as number) : null));
  return { line, signal, hist };
}
