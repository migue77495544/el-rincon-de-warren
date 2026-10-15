// Escáner de Superoportunidades (Deep Value + Catalizadores) sobre empresas líquidas del S&P 500.
// En Netlify cada petición dura como mucho 60 s, así que el escaneo avanza por tandas: cada consulta
// de la interfaz analiza las empresas que quepan en su presupuesto y guarda el progreso en el almacén.
import { getInfo, getModule, getStatements, Statement } from './yahoo';
import { calcularValoracion } from './company';
import { getRiskFreeRate, getHistimplErp } from './damodaran';
import { cachedPersistent, readJSON, writeJSON } from '../store';
import { num, round, roundOrNull, mapLimit, log } from './util';
import snapshotEscaneo from '../data/super-opportunities-snapshot.json';

export const UNIVERSO_SP500 = [
  // Tecnología
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'CSCO', 'ACN', 'IBM',
  'QCOM', 'TXN', 'AMD', 'INTU', 'AMAT', 'LRCX', 'KLAC', 'MU', 'ADI', 'NOW', 'PANW', 'ANET',
  'DELL', 'HPQ', 'CDNS', 'SNPS', 'NXPI', 'MCHP', 'FTNT', 'IT', 'CTSH', 'GDDY',
  // Comunicaciones
  'NFLX', 'CMCSA', 'T', 'VZ', 'TMUS', 'DIS', 'CHTR', 'EA', 'OMC',
  // Consumo discrecional
  'AMZN', 'TSLA', 'HD', 'LOW', 'MCD', 'NKE', 'SBUX', 'TJX', 'BKNG', 'CMG', 'ORLY', 'AZO', 'ROST',
  'GM', 'F', 'MAR', 'HLT', 'YUM', 'DPZ', 'LULU', 'DECK', 'ULTA', 'EBAY', 'BBY', 'DHI', 'LEN',
  'NVR', 'PHM', 'TPR',
  // Consumo básico
  'WMT', 'COST', 'PG', 'KO', 'PEP', 'PM', 'MO', 'MDLZ', 'CL', 'KMB', 'GIS', 'HSY', 'KR', 'TGT',
  'KHC', 'KDP', 'STZ', 'MNST', 'CHD', 'CLX',
  // Salud
  'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'AMGN', 'GILD', 'BMY', 'VRTX',
  'REGN', 'ISRG', 'MDT', 'SYK', 'ZTS', 'CVS', 'CI', 'ELV', 'HCA', 'MCK', 'CAH', 'BIIB', 'IDXX',
  // Industria
  'CAT', 'DE', 'HON', 'GE', 'UNP', 'UPS', 'RTX', 'LMT', 'GD', 'NOC', 'MMM', 'ETN', 'EMR', 'ITW',
  'PH', 'CSX', 'NSC', 'FDX', 'WM', 'ROK', 'PCAR', 'CMI', 'GWW', 'FAST', 'OTIS', 'CTAS', 'PAYX', 'ADP',
  // Energía
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'MPC', 'VLO', 'OXY', 'DVN', 'FANG', 'HAL',
  // Materiales
  'LIN', 'SHW', 'APD', 'NUE', 'FCX', 'DOW', 'LYB', 'MLM', 'VMC', 'NEM'
];

export const UMBRALES = {
  upsideMinPct: 30.0,
  roicMinPct: 15.0,
  roeMinPct: 20.0,
  piotroskiMin: 7,
  altmanMin: 2.8,
  fcfYieldMinPct: 6.0,
  recompraMinPct: 3.0,
  sorpresaEpsMinPct: 5.0,
  sorpresasConsecutivasMin: 2,
  expansionMargenMinPp: 1.0,
  volumenMinMM: 100.0,
  upsideAtipicoPct: 150.0
};

const TOP_MAX = 10;
const CANDIDATAS_MAX = 5;
const CONCURRENCIA = 6;
const DIA_MS = 24 * 60 * 60 * 1000;
const TTL_PARCIAL_MS = 60 * 60 * 1000;

const div = (a: number | null, b: number | null) => (a !== null && b !== null && b !== 0 ? a / b : null);

function calcularPiotroski(inc: Statement, bs: Statement, cf: Statement) {
  const ni = (c: number) => inc.first(['Net Income', 'Net Income Common Stockholders'], c);
  const ta = (c: number) => bs.first(['Total Assets'], c);
  const cfo = (c: number) => cf.first(['Operating Cash Flow', 'Cash Flow From Continuing Operating Activities'], c);
  const ltd = (c: number) => bs.first(['Long Term Debt', 'Long Term Debt And Capital Lease Obligation'], c) || 0;
  const ca = (c: number) => bs.first(['Current Assets'], c);
  const cl = (c: number) => bs.first(['Current Liabilities'], c);
  const acc = (c: number) => bs.first(['Ordinary Shares Number', 'Share Issued'], c);
  const gp = (c: number) => inc.first(['Gross Profit'], c);
  const rev = (c: number) => inc.first(['Total Revenue', 'Operating Revenue'], c);
  const roa = (c: number) => div(ni(c), ta(c + 1) || ta(c));
  const comparar = (a: number | null, b: number | null, mayor = true) => (a === null || b === null ? null : mayor ? a > b : a < b);

  const criterios: Array<[string, boolean | null]> = [
    ['ROA positivo', roa(0) !== null ? (roa(0) as number) > 0 : null],
    ['Flujo operativo positivo', cfo(0) !== null ? (cfo(0) as number) > 0 : null],
    ['ROA creciente', comparar(roa(0), roa(1))],
    ['Flujo operativo > beneficio neto', cfo(0) !== null && ni(0) !== null ? (cfo(0) as number) > (ni(0) as number) : null],
    ['Menor apalancamiento a largo plazo', ta(0) && ta(1) ? comparar(div(ltd(0), ta(0)), div(ltd(1), ta(1)), false) : null],
    ['Mayor ratio de liquidez', comparar(div(ca(0), cl(0)), div(ca(1), cl(1)))],
    ['Sin emisión de acciones', acc(0) && acc(1) ? (acc(0) as number) <= (acc(1) as number) : null],
    ['Mayor margen bruto', comparar(div(gp(0), rev(0)), div(gp(1), rev(1)))],
    ['Mayor rotación de activos', comparar(div(rev(0), ta(1) || ta(0)), div(rev(1), ta(2) || ta(1)))]
  ];
  const evaluados = criterios.filter(([, ok]) => ok !== null);
  return {
    score: evaluados.filter(([, ok]) => ok).length,
    evaluados: evaluados.length,
    detalle: criterios.map(([criterio, cumple]) => ({ criterio, cumple }))
  };
}

function calcularAltman(inc: Statement, bs: Statement, marketCap: number): number | null {
  const ta = bs.first(['Total Assets']);
  const tl = bs.first(['Total Liabilities Net Minority Interest', 'Total Liabilities']);
  const ca = bs.first(['Current Assets']);
  const cl = bs.first(['Current Liabilities']);
  const re = bs.first(['Retained Earnings']);
  const ebit = inc.first(['EBIT', 'Operating Income']);
  const ventas = inc.first(['Total Revenue', 'Operating Revenue']);
  if (!ta || !tl || ca === null || cl === null || ebit === null || ventas === null || marketCap <= 0) return null;
  const z = 1.2 * (ca - cl) / ta + 1.4 * (re || 0) / ta + 3.3 * ebit / ta + 0.6 * marketCap / tl + 1.0 * ventas / ta;
  return round(z, 2);
}

async function detectarCatalizadores(ticker: string, inc: Statement, bs: Statement, cf: Statement, marketCap: number) {
  const catalizadores: any[] = [];

  const acc0 = bs.first(['Ordinary Shares Number', 'Share Issued'], 0);
  const acc1 = bs.first(['Ordinary Shares Number', 'Share Issued'], 1);
  const reduccion = acc0 && acc1 ? (1 - acc0 / acc1) * 100 : null;
  const recompra = cf.first(['Repurchase Of Capital Stock', 'Common Stock Payments'], 0);
  const rendRecompra = recompra !== null && marketCap > 0 ? (-recompra / marketCap) * 100 : null;
  let detalle = 'Sin datos de acciones en circulación';
  if (reduccion !== null) {
    detalle = `Acciones en circulación ${(-reduccion >= 0 ? '+' : '') + (-reduccion).toFixed(1)} % en el último ejercicio`;
    if (rendRecompra && rendRecompra > 0) detalle += `; recompras equivalentes al ${rendRecompra.toFixed(1)} % de la capitalización`;
  }
  catalizadores.push({
    tipo: 'recompra',
    nombre: 'Recompra acelerada de acciones',
    activo: reduccion !== null && reduccion > UMBRALES.recompraMinPct,
    valor: roundOrNull(reduccion, 2),
    detalle,
    rendimientoRecompraPct: roundOrNull(rendRecompra, 2)
  });

  let consecutivas = 0;
  const sorpresas: Array<{ trimestre: string; sorpresaPct: number }> = [];
  try {
    const eh = await getModule(ticker, 'earningsHistory');
    const hist = [...(eh?.history || [])].sort((a: any, b: any) => new Date(b.quarter).getTime() - new Date(a.quarter).getTime());
    for (const fila of hist) {
      const real = num(fila.epsActual);
      const est = num(fila.epsEstimate);
      if (real === null || est === null || est === 0) break;
      sorpresas.push({ trimestre: new Date(fila.quarter).toISOString().slice(0, 10), sorpresaPct: round(((real - est) / Math.abs(est)) * 100, 2) });
    }
    for (const s of sorpresas) {
      if (s.sorpresaPct > UMBRALES.sorpresaEpsMinPct) consecutivas++;
      else break;
    }
  } catch (err: any) {
    log(`[SCAN] earningsHistory no disponible: ${err?.message}`);
  }
  catalizadores.push({
    tipo: 'sorpresas_bpa',
    nombre: 'Sorpresas consecutivas en BPA',
    activo: consecutivas >= UMBRALES.sorpresasConsecutivasMin,
    valor: consecutivas,
    detalle: sorpresas.length
      ? `${consecutivas} trimestre(s) seguidos superando la estimación en más de un ${UMBRALES.sorpresaEpsMinPct.toFixed(0)} %`
      : 'Sin historial de estimaciones',
    sorpresas: sorpresas.slice(0, 4)
  });

  const margen = (c: number) => {
    const m = div(inc.first(['Operating Income', 'EBIT'], c), inc.first(['Total Revenue', 'Operating Revenue'], c));
    return m !== null ? m * 100 : null;
  };
  const [m0, m1, m2] = [margen(0), margen(1), margen(2)];
  const expansion = m0 !== null && m1 !== null ? m0 - m1 : null;
  const acelera = expansion !== null && m2 !== null && m1 !== null && expansion > m1 - m2;
  catalizadores.push({
    tipo: 'margen_operativo',
    nombre: 'Expansión del margen operativo',
    activo: expansion !== null && expansion >= UMBRALES.expansionMargenMinPp,
    valor: roundOrNull(expansion, 2),
    detalle: expansion !== null
      ? `Margen operativo ${(m1 as number).toFixed(1)} % → ${(m0 as number).toFixed(1)} % (${expansion >= 0 ? '+' : ''}${expansion.toFixed(1)} pp)` +
        (acelera && expansion > 0 ? ', y se acelera respecto al año anterior' : '')
      : 'Sin datos de margen operativo',
    margenActualPct: roundOrNull(m0, 2),
    acelera
  });
  return catalizadores;
}

/** Graham revisado: V = BPA × (8,5 + 2g) × 4,4 / Y */
function valorGraham(info: Record<string, any>, rf: number): number | null {
  const eps = num(info.trailingEps);
  const epsFwd = num(info.forwardEps);
  if (!eps || eps <= 0) return null;
  let g = epsFwd && epsFwd > 0 ? (epsFwd / eps - 1) * 100 : 5;
  g = Math.min(Math.max(g, 0), 10);
  const y = Math.max(rf * 100 + 1, 4.4);
  return (eps * (8.5 + 2 * g) * 4.4) / y;
}

async function analizarEmpresa(ticker: string, rf: number): Promise<any> {
  const info = await getInfo(ticker);
  const precio = num(info.currentPrice || info.regularMarketPrice || info.previousClose);
  if (!precio) throw new Error(`Sin cotización para ${ticker}`);
  const st = await getStatements(ticker);
  if (st.empty) throw new Error(`Sin estados financieros para ${ticker}`);

  const marketCap = num(info.marketCap) || 0;
  const acciones = num(info.sharesOutstanding) || (marketCap ? marketCap / precio : 0);
  const volumenMM = ((num(info.averageDailyVolume3Month) || 0) * precio) / 1e6;
  const ebit = st.first(['EBIT', 'Operating Income']) || 0;
  const intereses = st.first(['Interest Expense', 'Interest Expense Non Operating']) || 0;
  const patrimonio = st.first(['Stockholders Equity', 'Common Stock Equity']) || 0;

  const valoracion = await calcularValoracion(info, st, st, precio, marketCap, acciones, ebit, Math.abs(intereses), patrimonio, num(info.beta));
  const dcf = valoracion.dcf?.valorPorAccion ?? null;
  const graham = valorGraham(info, rf);
  const metodos = [dcf, graham].filter((v): v is number => Boolean(v && v > 0));
  const intrinseco = metodos.length ? Math.min(...metodos) : null;
  const upside = intrinseco ? (intrinseco / precio - 1) * 100 : null;
  const descuento = intrinseco ? (1 - precio / intrinseco) * 100 : null;

  const netIncome = st.first(['Net Income', 'Net Income Common Stockholders']);
  const roe = netIncome !== null && patrimonio > 0 ? (netIncome / patrimonio) * 100 : null;
  const ev = num(info.enterpriseValue);
  const fcf = st.first(['Free Cash Flow']);
  const fcfYield = fcf !== null && ev && ev > 0 ? (fcf / ev) * 100 : null;
  const piotroski = calcularPiotroski(st, st, st);

  return {
    ticker,
    nombre: info.longName || info.shortName || ticker,
    sector: info.sector || 'Sin sector',
    industria: info.industry || '',
    precio: round(precio, 2),
    valorIntrinseco: roundOrNull(intrinseco),
    valorDcf: roundOrNull(dcf),
    valorGraham: roundOrNull(graham),
    upsidePct: roundOrNull(upside, 1),
    descuentoPct: roundOrNull(descuento, 1),
    metodoValoracion: metodos.length ? (metodos.length === 2 ? 'min(DCF, Graham)' : dcf && dcf > 0 ? 'DCF' : 'Graham') : null,
    roicPct: roundOrNull(valoracion.roicPct, 1),
    roePct: roundOrNull(roe, 1),
    piotroski: piotroski.score,
    piotroskiEvaluados: piotroski.evaluados,
    piotroskiDetalle: piotroski.detalle,
    altmanZ: calcularAltman(st, st, marketCap),
    fcfYieldPct: roundOrNull(fcfYield, 2),
    fcfMM: roundOrNull(fcf !== null ? fcf / 1e6 : null, 1),
    evMM: roundOrNull(ev ? ev / 1e6 : null, 1),
    marketCapMM: round(marketCap / 1e6, 1),
    volumenDiarioMM: round(volumenMM, 1),
    waccPct: valoracion.waccPct,
    catalizadores: await detectarCatalizadores(ticker, st, st, st, marketCap)
  };
}

function evaluarFiltros(d: any) {
  const u = UMBRALES;
  const calidad = (d.roicPct !== null && d.roicPct > u.roicMinPct) || (d.roePct !== null && d.roePct > u.roeMinPct);
  const balance = d.piotroski >= u.piotroskiMin || (d.altmanZ !== null && d.altmanZ > u.altmanMin);
  const activos = d.catalizadores.filter((c: any) => c.activo);
  return [
    { id: 'descuento', nombre: 'Upside > 30 % sobre valor intrínseco', cumple: d.upsidePct !== null && d.upsidePct > u.upsideMinPct },
    { id: 'rentabilidad', nombre: 'ROIC > 15 % o ROE > 20 %', cumple: Boolean(calidad) },
    { id: 'balance', nombre: 'Piotroski >= 7 o Altman Z > 2,8', cumple: Boolean(balance) },
    { id: 'fcf', nombre: 'FCF Yield (FCF / EV) > 6 %', cumple: d.fcfYieldPct !== null && d.fcfYieldPct > u.fcfYieldMinPct },
    { id: 'catalizador', nombre: 'Al menos un catalizador activo', cumple: activos.length > 0 }
  ];
}

function calcularScore(d: any) {
  const tope = (x: number) => Math.max(0, Math.min(1, x));
  const descuento = 30 * tope((d.upsidePct || 0) / 100);
  const calidad = 20 * Math.max(tope((d.roicPct || 0) / 30), tope((d.roePct || 0) / 40));
  const balance = 15 * (0.6 * d.piotroski / 9 + 0.4 * tope((d.altmanZ || 0) / 6));
  const fcf = 15 * tope((d.fcfYieldPct || 0) / 12);
  const catalizadores = (20 * d.catalizadores.filter((c: any) => c.activo).length) / 3;
  const total = descuento + calidad + balance + fcf + catalizadores;
  return {
    score: Math.trunc(Math.max(1, Math.min(100, Math.round(total)))),
    desglose: {
      descuento: round(descuento, 1), calidad: round(calidad, 1), balance: round(balance, 1),
      fcf: round(fcf, 1), catalizadores: round(catalizadores, 1)
    }
  };
}

function redactarTesis(d: any): string {
  const partes: string[] = [];
  for (const c of d.catalizadores) {
    if (!c.activo) continue;
    if (c.tipo === 'recompra') partes.push(`Recompra de acciones del ${c.valor.toFixed(1)} % anual`);
    else if (c.tipo === 'sorpresas_bpa') partes.push(`${c.valor} trimestres seguidos batiendo el BPA estimado`);
    else if (c.tipo === 'margen_operativo') partes.push(`margen operativo ${c.valor >= 0 ? '+' : ''}${c.valor.toFixed(1)} pp${c.acelera ? ' y acelerando' : ''}`);
  }
  if (d.roicPct !== null && d.roicPct > UMBRALES.roicMinPct) partes.push(`ROIC del ${d.roicPct.toFixed(0)} %`);
  else if (d.roePct !== null) partes.push(`ROE del ${d.roePct.toFixed(0)} %`);
  if (d.fcfYieldPct !== null) partes.push(`FCF Yield del ${d.fcfYieldPct.toFixed(1)} %`);
  let tesis = partes.join(' + ');
  if (d.upsidePct !== null) {
    tesis += `. Cotiza con un descuento del ${d.descuentoPct.toFixed(0)} % sobre su valor intrínseco conservador (upside del ${d.upsidePct.toFixed(0)} %).`;
  }
  return tesis.charAt(0).toUpperCase() + tesis.slice(1);
}

function construirResultado(analizadas: any[], errores: string[], inicio: number) {
  if (analizadas.length < UNIVERSO_SP500.length * 0.5) {
    return {
      success: false,
      error: `Yahoo Finance solo devolvió datos de ${analizadas.length} de ${UNIVERSO_SP500.length} empresas (posible límite de peticiones). Reintenta en unos minutos.`
    };
  }
  const liquidas = analizadas.filter(d => d.volumenDiarioMM >= UMBRALES.volumenMinMM);
  const superan: any[] = [];
  const cercanas: any[] = [];
  for (const base of liquidas) {
    const filtros = evaluarFiltros(base);
    const alerta = base.upsidePct !== null && base.upsidePct > UMBRALES.upsideAtipicoPct
      ? 'Upside superior al 150 %: revisa si hay escisiones, partidas extraordinarias o flujos no recurrentes que distorsionen el DCF antes de confiar en la cifra.'
      : null;
    const d = { ...base, filtros, ...calcularScore(base), tesis: redactarTesis(base), alertaDatos: alerta };
    const cumplidos = filtros.filter(f => f.cumple).length;
    if (cumplidos === filtros.length) superan.push(d);
    else if (cumplidos === filtros.length - 1) cercanas.push(d);
  }
  superan.sort((a, b) => b.score - a.score);
  cercanas.sort((a, b) => b.score - a.score);
  return {
    success: true,
    source: 'Yahoo Finance + FRED DGS10 + Damodaran ERP',
    generadoEn: new Date().toISOString(),
    duracionSeg: round((Date.now() - inicio) / 1000, 1),
    universo: UNIVERSO_SP500.length,
    analizadas: analizadas.length,
    liquidas: liquidas.length,
    sinDatos: [...errores].sort(),
    completo: errores.length === 0,
    superanFiltros: superan.length,
    umbrales: UMBRALES,
    oportunidades: superan.slice(0, TOP_MAX),
    candidatasCercanas: cercanas.slice(0, CANDIDATAS_MAX)
  };
}

// ---------------------------------------------------------------
// Estado del escaneo por tandas
// ---------------------------------------------------------------
interface EstadoEscaneo {
  iniciadoEn: number;
  refrescar: boolean;
  pendientes: string[];
  hechas: string[];
  errores: string[];
  intentos: Record<string, number>;
}

const CLAVE_ESTADO = 'scan/estado';
const CLAVE_RESULTADO = 'scan/resultado';

export async function leerResultado(): Promise<{ data: any; generatedAt: number } | null> {
  return readJSON(CLAVE_RESULTADO);
}

/** Último escaneo disponible aunque haya caducado; si nunca se escaneó, la copia incluida en el despliegue */
export async function resultadoGuardado(): Promise<any | null> {
  const r = await leerResultado();
  if (r?.data?.success) return r.data;
  return (snapshotEscaneo as any)?.success ? snapshotEscaneo : null;
}

export function resultadoVigente(r: { data: any; generatedAt: number } | null): boolean {
  if (!r?.data?.success) return false;
  const edad = Date.now() - r.generatedAt;
  return r.data.completo ? edad < DIA_MS : edad < TTL_PARCIAL_MS;
}

export async function estadoActual(): Promise<EstadoEscaneo | null> {
  return readJSON<EstadoEscaneo>(CLAVE_ESTADO);
}

export async function iniciarEscaneo(refrescar: boolean): Promise<EstadoEscaneo> {
  const estado: EstadoEscaneo = { iniciadoEn: Date.now(), refrescar, pendientes: [...UNIVERSO_SP500], hechas: [], errores: [], intentos: {} };
  await writeJSON(CLAVE_ESTADO, estado);
  return estado;
}

/**
 * Analiza empresas pendientes hasta agotar el presupuesto de tiempo. Devuelve el resultado final
 * cuando ya no quedan pendientes, o null si el escaneo sigue en curso.
 */
export async function avanzarEscaneo(presupuestoMs: number): Promise<{ resultado: any | null; estado: EstadoEscaneo }> {
  const limite = Date.now() + presupuestoMs;
  const estado = (await estadoActual()) || (await iniciarEscaneo(false));
  const [rf] = await Promise.all([getRiskFreeRate(), getHistimplErp()]);
  const ttl = estado.refrescar ? 60 * 1000 : DIA_MS;

  while (estado.pendientes.length && Date.now() < limite - 8000) {
    const tanda = estado.pendientes.splice(0, CONCURRENCIA * 2);
    const res = await mapLimit(tanda, CONCURRENCIA, t =>
      cachedPersistent(`scan-${t}`, ttl, () => analizarEmpresa(t, rf), { accept: (d: any) => Boolean(d?.ticker) })
    );
    res.forEach((r, i) => {
      const t = tanda[i];
      if (r.status === 'fulfilled') estado.hechas.push(t);
      else {
        estado.intentos[t] = (estado.intentos[t] || 0) + 1;
        log(`[SCAN] ${t}: ${(r.reason as any)?.message || r.reason}`);
        // Hasta 3 intentos por empresa (el fallo suele ser un corte o un límite puntual de Yahoo)
        if (estado.intentos[t] < 3) estado.pendientes.push(t);
        else estado.errores.push(t);
      }
    });
    await writeJSON(CLAVE_ESTADO, estado);
    // Tanda entera fallida: Yahoo está limitando; se reintenta en la siguiente consulta de la interfaz
    if (res.every(r => r.status === 'rejected')) break;
  }

  if (estado.pendientes.length) return { resultado: null, estado };

  const analizadas = (await Promise.all(estado.hechas.map(t => readJSON<{ data: any }>(`cache/scan-${t}`))))
    .map(e => e?.data)
    .filter(Boolean);
  const resultado = construirResultado(analizadas, estado.errores, estado.iniciadoEn);
  if (resultado.success) await writeJSON(CLAVE_RESULTADO, { data: resultado, generatedAt: Date.now() });
  await writeJSON(CLAVE_ESTADO, null);
  return { resultado, estado };
}
