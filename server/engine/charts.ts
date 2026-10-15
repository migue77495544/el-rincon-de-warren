// Gráficos estáticos en SVG (sustituyen a las figuras PNG de matplotlib/seaborn).
// Se devuelven como data URL para que el frontend los muestre en un <img> igual que antes.

const FONDO = '#0f172a';
const PANEL = '#1e293b';
const BORDE = '#334155';
const TEXTO = '#f8fafc';
const TEXTO_SEC = '#94a3b8';
const FUENTE = "font-family='Public Sans, Segoe UI, Arial, sans-serif'";

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f2 = (v: number) => v.toFixed(2);

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
}

function marco(w: number, h: number, titulo: string, cuerpo: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}' ${FUENTE}>` +
    `<rect width='${w}' height='${h}' fill='${FONDO}'/>` +
    `<text x='${w / 2}' y='30' fill='${TEXTO}' font-size='17' font-weight='700' text-anchor='middle'>${esc(titulo)}</text>` +
    cuerpo + '</svg>';
}

/** Escala lineal con márgenes «bonitos» para los ejes */
function ticks(min: number, max: number, n = 5): number[] {
  const span = max - min || 1;
  const paso0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= paso0) || paso0;
  const out: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) out.push(Number(v.toFixed(10)));
  return out;
}

// ---------------------------------------------------------------
// Precios objetivo de analistas (rango, mediana, media y cotización)
// ---------------------------------------------------------------
export function targetsChart(p: {
  ticker: string; actual: number; low: number; high: number; mean: number; median: number;
  upsideMean: number; upsideHigh: number; downsideLow: number; analistas: number;
}): string {
  const W = 850, H = 340;
  const x0 = 50, x1 = W - 50, yBar = 130;
  const rango = Math.max(p.high - p.low, 1);
  const min = Math.min(p.low, p.actual) - rango * 0.08;
  const max = Math.max(p.high, p.actual) + rango * 0.08;
  const X = (v: number) => x0 + ((v - min) / (max - min)) * (x1 - x0);

  let cuerpo = '';
  for (const t of ticks(min, max, 6)) {
    cuerpo += `<line x1='${X(t)}' y1='70' x2='${X(t)}' y2='190' stroke='#64748b' stroke-opacity='0.15' stroke-dasharray='4 4'/>` +
      `<text x='${X(t)}' y='210' fill='${TEXTO_SEC}' font-size='12' text-anchor='middle'>${t.toFixed(0)}</text>`;
  }
  cuerpo += `<text x='${W / 2}' y='232' fill='${TEXTO_SEC}' font-size='12' text-anchor='middle'>Precio Estimado en Bolsa (USD)</text>`;
  cuerpo += `<rect x='${X(p.low)}' y='${yBar - 15}' width='${X(p.high) - X(p.low)}' height='30' fill='${PANEL}' stroke='${BORDE}' stroke-width='1.5'/>`;
  cuerpo += `<rect x='${X(p.low)}' y='${yBar - 15}' width='${Math.max(0, X(p.median) - X(p.low))}' height='30' fill='#0284c7' fill-opacity='0.25'/>`;
  cuerpo += `<line x1='${X(p.actual)}' y1='70' x2='${X(p.actual)}' y2='190' stroke='#38bdf8' stroke-opacity='0.5' stroke-dasharray='2 3'/>`;

  const marca = (v: number, color: string, forma: string) => {
    const x = X(v), y = yBar;
    if (forma === 'circulo') return `<circle cx='${x}' cy='${y}' r='9' fill='${color}' stroke='#fff' stroke-width='1.5'/>`;
    if (forma === 'abajo') return `<path d='M${x - 8},${y - 6} L${x + 8},${y - 6} L${x},${y + 8} Z' fill='${color}' stroke='#fff' stroke-width='1.2'/>`;
    if (forma === 'arriba') return `<path d='M${x - 8},${y + 6} L${x + 8},${y + 6} L${x},${y - 8} Z' fill='${color}' stroke='#fff' stroke-width='1.2'/>`;
    if (forma === 'cuadrado') return `<rect x='${x - 6}' y='${y - 6}' width='12' height='12' fill='${color}' stroke='#fff' stroke-width='1.2'/>`;
    return `<path d='M${x},${y - 9} L${x + 8},${y} L${x},${y + 9} L${x - 8},${y} Z' fill='${color}' stroke='#fff' stroke-width='1.2'/>`;
  };
  const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const series: Array<[number, string, string, string]> = [
    [p.low, '#ef4444', 'abajo', `Mínimo: $${f2(p.low)} (${sg(p.downsideLow)})`],
    [p.median, '#a855f7', 'cuadrado', `Mediana: $${f2(p.median)}`],
    [p.mean, '#f59e0b', 'rombo', `Media: $${f2(p.mean)} (${sg(p.upsideMean)})`],
    [p.high, '#10b981', 'arriba', `Máximo: $${f2(p.high)} (${sg(p.upsideHigh)})`],
    [p.actual, '#38bdf8', 'circulo', `Cotización Actual: $${f2(p.actual)}`]
  ];
  for (const [v, c, forma] of series) cuerpo += marca(v, c, forma);

  // Leyenda en tres columnas bajo el gráfico
  const leyenda = [series[4], series[0], series[1], series[2], series[3]];
  const lx = 90, ly = 262, colW = 240;
  cuerpo += `<rect x='${lx - 20}' y='${ly - 18}' width='${colW * 3 + 30}' height='64' rx='4' fill='${PANEL}' stroke='${BORDE}'/>`;
  leyenda.forEach(([, c, , label], i) => {
    const cx = lx + (i % 3) * colW, cy = ly + Math.floor(i / 3) * 26;
    cuerpo += `<circle cx='${cx}' cy='${cy}' r='5' fill='${c}'/><text x='${cx + 12}' y='${cy + 4}' fill='#e2e8f0' font-size='12'>${esc(label)}</text>`;
  });

  const titulo = `Precios Objetivo de Analistas de Wall Street (${p.ticker})${p.analistas > 0 ? ` • ${p.analistas} Analistas` : ''}`;
  return svgDataUrl(marco(W, H, titulo, cuerpo));
}

// ---------------------------------------------------------------
// Mapa de calor de correlaciones
// ---------------------------------------------------------------
function colorDivergente(v: number): string {
  // Paleta azul-blanco-rojo (vlag de seaborn) para r ∈ [-1, 1]
  const t = (Math.max(-1, Math.min(1, v)) + 1) / 2;
  const azul = [33, 102, 172], blanco = [247, 247, 247], rojo = [178, 24, 43];
  const mix = (a: number[], b: number[], k: number) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
  const [r, g, b] = t < 0.5 ? mix(azul, blanco, t / 0.5) : mix(blanco, rojo, (t - 0.5) / 0.5);
  return `rgb(${r},${g},${b})`;
}

export function correlationHeatmap(tickers: string[], corr: number[][]): string {
  const n = tickers.length;
  const celda = Math.min(80, 400 / n);
  const W = 650, H = 500;
  const ox = 110, oy = 60;
  let cuerpo = '';
  for (let i = 0; i < n; i++) {
    cuerpo += `<text x='${ox - 10}' y='${oy + i * celda + celda / 2 + 4}' fill='${TEXTO_SEC}' font-size='12' text-anchor='end'>${esc(tickers[i])}</text>`;
    cuerpo += `<text x='${ox + i * celda + celda / 2}' y='${oy + n * celda + 18}' fill='${TEXTO_SEC}' font-size='12' text-anchor='middle'>${esc(tickers[i])}</text>`;
    for (let j = 0; j < n; j++) {
      const v = corr[i][j];
      cuerpo += `<rect x='${ox + j * celda}' y='${oy + i * celda}' width='${celda}' height='${celda}' fill='${colorDivergente(v)}' stroke='${PANEL}' stroke-width='1.5'/>` +
        `<text x='${ox + j * celda + celda / 2}' y='${oy + i * celda + celda / 2 + 4}' font-size='12' text-anchor='middle' fill='${Math.abs(v) > 0.6 ? '#fff' : '#111827'}'>${v.toFixed(2)}</text>`;
    }
  }
  // Barra de color
  const bx = ox + n * celda + 30, bh = n * celda;
  for (let k = 0; k < 40; k++) {
    const v = 1 - (2 * k) / 39;
    cuerpo += `<rect x='${bx}' y='${oy + (k * bh) / 40}' width='16' height='${bh / 40 + 0.5}' fill='${colorDivergente(v)}'/>`;
  }
  [1, 0, -1].forEach((v, i) => {
    cuerpo += `<text x='${bx + 22}' y='${oy + (i * bh) / 2 + 4}' fill='${TEXTO_SEC}' font-size='11'>${v.toFixed(1)}</text>`;
  });
  cuerpo += `<text x='${bx + 60}' y='${oy + bh / 2}' fill='${TEXTO_SEC}' font-size='11' transform='rotate(90 ${bx + 60} ${oy + bh / 2})' text-anchor='middle'>Coeficiente Pearson (r)</text>`;
  return svgDataUrl(marco(W, H, 'Matriz de Correlación de Rendimientos Diarios', cuerpo));
}

// ---------------------------------------------------------------
// Ejes cartesianos compartidos
// ---------------------------------------------------------------
function ejes(W: number, H: number, xs: number[], ys: number[], etiquetaX: string, etiquetaY: string) {
  const m = { l: 70, r: 40, t: 50, b: 60 };
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const padX = (xmax - xmin || 1) * 0.06, padY = (ymax - ymin || 1) * 0.08;
  const [x0, x1, y0, y1] = [xmin - padX, xmax + padX, ymin - padY, ymax + padY];
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const Y = (v: number) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
  let svg = '';
  for (const t of ticks(x0, x1)) {
    svg += `<line x1='${X(t)}' y1='${m.t}' x2='${X(t)}' y2='${H - m.b}' stroke='#64748b' stroke-opacity='0.2' stroke-dasharray='4 4'/>` +
      `<text x='${X(t)}' y='${H - m.b + 18}' fill='${TEXTO_SEC}' font-size='11' text-anchor='middle'>${t}</text>`;
  }
  for (const t of ticks(y0, y1)) {
    svg += `<line x1='${m.l}' y1='${Y(t)}' x2='${W - m.r}' y2='${Y(t)}' stroke='#64748b' stroke-opacity='0.2' stroke-dasharray='4 4'/>` +
      `<text x='${m.l - 8}' y='${Y(t) + 4}' fill='${TEXTO_SEC}' font-size='11' text-anchor='end'>${t}</text>`;
  }
  svg += `<text x='${(m.l + W - m.r) / 2}' y='${H - 18}' fill='${TEXTO_SEC}' font-size='12' text-anchor='middle'>${esc(etiquetaX)}</text>` +
    `<text x='18' y='${(m.t + H - m.b) / 2}' fill='${TEXTO_SEC}' font-size='12' text-anchor='middle' transform='rotate(-90 18 ${(m.t + H - m.b) / 2})'>${esc(etiquetaY)}</text>`;
  return { X, Y, svg };
}

function viridis(t: number): string {
  const stops = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  const k = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * (k - i)));
  return `rgb(${c.join(',')})`;
}

export function frontierChart(vols: number[], rets: number[], sharpes: number[], maxIdx: number, minIdx: number): string {
  const W = 700, H = 480;
  const xs = vols.map(v => v * 100), ys = rets.map(r => r * 100);
  const { X, Y, svg } = ejes(W, H, xs, ys, 'Volatilidad Anualizada σ (%)', 'Rendimiento Esperado E(R) (%)');
  const sMin = Math.min(...sharpes), sMax = Math.max(...sharpes);
  let cuerpo = svg;
  xs.forEach((x, i) => {
    cuerpo += `<circle cx='${X(x)}' cy='${Y(ys[i])}' r='3.5' fill='${viridis((sharpes[i] - sMin) / (sMax - sMin || 1))}' fill-opacity='0.85'/>`;
  });
  const estrella = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 === 0 ? r : r * 0.45;
      pts.push(`${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`);
    }
    return pts.join(' ');
  };
  cuerpo += `<polygon points='${estrella(X(xs[maxIdx]), Y(ys[maxIdx]), 12)}' fill='#f59e0b' stroke='#fff' stroke-width='1.5'/>`;
  cuerpo += `<path d='M${X(xs[minIdx])},${Y(ys[minIdx]) - 9} l9,9 l-9,9 l-9,-9 Z' fill='#10b981' stroke='#fff' stroke-width='1.5'/>`;
  cuerpo += `<rect x='90' y='58' width='270' height='50' rx='4' fill='${PANEL}' stroke='${BORDE}'/>` +
    `<circle cx='104' cy='74' r='5' fill='#f59e0b'/><text x='116' y='78' fill='#e2e8f0' font-size='11'>Máximo Sharpe (Cartera Tangente)</text>` +
    `<circle cx='104' cy='94' r='5' fill='#10b981'/><text x='116' y='98' fill='#e2e8f0' font-size='11'>Mínima Varianza Global (GMV)</text>`;
  return svgDataUrl(marco(W, H, 'Frontera Eficiente de Markowitz (simulación Monte Carlo)', cuerpo));
}

export function returnsDistributionChart(ticker: string, rets: number[]): string {
  const W = 650, H = 450;
  const datos = rets.map(r => r * 100);
  const min = Math.min(...datos), max = Math.max(...datos);
  const bins = 35;
  const ancho = (max - min) / bins || 1;
  const cuentas = new Array(bins).fill(0);
  for (const d of datos) cuentas[Math.min(bins - 1, Math.floor((d - min) / ancho))]++;
  const dens = cuentas.map(c => c / (datos.length * ancho));
  // KDE gaussiana con ancho de banda de Scott (como seaborn)
  const sd = Math.sqrt(datos.reduce((a, x) => a + (x - datos.reduce((p, q) => p + q, 0) / datos.length) ** 2, 0) / (datos.length - 1));
  const h = sd * datos.length ** (-1 / 5);
  const kx = Array.from({ length: 120 }, (_, i) => min + ((max - min) * i) / 119);
  const ky = kx.map(x => datos.reduce((a, d) => a + Math.exp(-0.5 * ((x - d) / h) ** 2), 0) / (datos.length * h * Math.sqrt(2 * Math.PI)));
  const { X, Y, svg } = ejes(W, H, [min, max, 0], [0, ...dens, ...ky], 'Rendimiento Diario (%)', 'Densidad Probabilística');
  let cuerpo = svg;
  dens.forEach((d, i) => {
    const xa = X(min + i * ancho), xb = X(min + (i + 1) * ancho);
    cuerpo += `<rect x='${xa}' y='${Y(d)}' width='${Math.max(0, xb - xa - 1)}' height='${Y(0) - Y(d)}' fill='#38bdf8' fill-opacity='0.6'/>`;
  });
  cuerpo += `<polyline points='${kx.map((x, i) => `${X(x)},${Y(ky[i])}`).join(' ')}' fill='none' stroke='#38bdf8' stroke-width='2'/>`;
  cuerpo += `<line x1='${X(0)}' y1='50' x2='${X(0)}' y2='${H - 60}' stroke='#ef4444' stroke-width='1.5' stroke-dasharray='6 4'/>`;
  cuerpo += `<rect x='${W - 170}' y='58' width='130' height='28' rx='4' fill='${PANEL}' stroke='${BORDE}'/>` +
    `<line x1='${W - 160}' y1='72' x2='${W - 140}' y2='72' stroke='#ef4444' stroke-width='1.5' stroke-dasharray='6 4'/>` +
    `<text x='${W - 132}' y='76' fill='#e2e8f0' font-size='11'>Retorno 0%</text>`;
  return svgDataUrl(marco(W, H, `Distribución de Rendimientos Diarios: ${ticker}`, cuerpo));
}
