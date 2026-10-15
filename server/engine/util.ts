// Utilidades numéricas compartidas por el motor de datos (equivalentes a numpy/pandas/statistics)

/** Número finito o null (NaN, ±Infinity, null y cadenas no numéricas → null) */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Equivalente a clean_val de Python: valor numérico seguro con valor por defecto */
export function cleanVal(v: unknown, fallback = 0): number {
  return num(v) ?? fallback;
}

/** Redondeo half-even como el round() de Python (evita sesgos en .5) */
export function round(v: number, decimals = 0): number {
  const f = 10 ** decimals;
  const x = v * f;
  const r = Math.round(x);
  const isHalf = Math.abs(x % 1) === 0.5;
  const res = isHalf ? (r % 2 === 0 ? r : r - 1) : r;
  return res / f;
}

export const roundOrNull = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : round(v, d);

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Desviación típica muestral (ddof=1), como pandas Series.std() */
export function std(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function variance(xs: number[]): number {
  const s = std(xs);
  return s * s;
}

export function covariance(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc += (a[i] - ma) * (b[i] - mb);
  return acc / (a.length - 1);
}

export function correlation(a: number[], b: number[]): number {
  return covariance(a, b) / (std(a) * std(b));
}

/** Percentil con interpolación lineal (numpy.percentile por defecto) */
export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/** pandas Series.ewm(alpha=1-λ).std() con adjust=True y bias=False: último valor */
export function ewmaStd(xs: number[], lambda = 0.94): number {
  const w = xs.map((_, i) => lambda ** (xs.length - 1 - i));
  const sw = w.reduce((a, b) => a + b, 0);
  const sw2 = w.reduce((a, b) => a + b * b, 0);
  const m = xs.reduce((a, x, i) => a + w[i] * x, 0) / sw;
  const biased = xs.reduce((a, x, i) => a + w[i] * (x - m) ** 2, 0) / sw;
  return Math.sqrt(biased * (sw * sw) / (sw * sw - sw2));
}

/** Densidad de la normal estándar */
export function normPdf(z: number): number {
  return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}

/** Inversa de la normal estándar (algoritmo de Acklam, error < 1.2e-9 tras refinamiento) */
export function normInv(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  let q: number;
  let x: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - plow) {
    q = p - 0.5;
    const r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Un paso de Halley sobre la función de error para afinar
  const e = 0.5 * erfc(-x / Math.SQRT2) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}

function erfc(x: number): number {
  // Aproximación de Numerical Recipes (error relativo < 1.2e-7)
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** Generador pseudoaleatorio reproducible (mulberry32): sustituye a np.random.seed(42) */
export function seededRandom(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Muestra Exp(1) por inversión de probabilidad */
export function expSample(rand: () => number): number {
  return -Math.log(1 - rand());
}

/** Ejecuta tareas con concurrencia limitada (ThreadPoolExecutor(max_workers=n)) */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Rechaza si la promesa no termina a tiempo */
export function withTimeout<T>(p: Promise<T>, ms: number, message = 'Tiempo de espera agotado'): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

/** Formato de número con separador de miles como f'{v:,.2f}' de Python */
export function fmtMiles(v: number, decimals = 2): string {
  const [ent, dec] = Math.abs(v).toFixed(decimals).split('.');
  const conMiles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${v < 0 ? '-' : ''}${conMiles}${dec ? `.${dec}` : ''}`;
}

/** Formato con signo explícito como f'{v:+.1f}' */
export function fmtSigno(v: number, decimals = 1): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}`;
}

export function log(msg: string): void {
  console.warn(msg);
}
