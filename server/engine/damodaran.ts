// Datos de mercado de referencia: betas y múltiplos sectoriales de Damodaran, prima de riesgo
// implícita (ERP) y tasa libre de riesgo (FRED DGS10). Caché persistente y copia local de respaldo.
import { cachedPersistent, readStale } from '../store';
import { parseFirstTable, tableToRecords, cellNumber } from './htmlTable';
import { log } from './util';
import snapshot from '../data/damodaran-snapshot.json';

const DATAFILE = 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/';
const DIA_MS = 24 * 60 * 60 * 1000;

export type Fila = Record<string, string>;
type Tabla = { success: true; rows: Fila[] };

export const TABLAS = {
  betas: 'Betas.html',
  roe: 'roe.html',
  pe: 'pedata.html',
  pbv: 'pbvdata.html'
} as const;
export type NombreTabla = keyof typeof TABLAS;

async function descargarTabla(archivo: string): Promise<Tabla> {
  const res = await fetch(DATAFILE + archivo, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Damodaran respondió ${res.status} para ${archivo}`);
  const rows = tableToRecords(parseFirstTable(await res.text()));
  if (rows.length < 20) throw new Error(`Tabla de Damodaran vacía o con formato inesperado (${archivo})`);
  return { success: true, rows };
}

/** Tabla de Damodaran (24 h de caché). Si la web no responde se usa la última copia o la instantánea local */
export async function getTabla(nombre: NombreTabla): Promise<Fila[]> {
  const key = `damodaran-${nombre}`;
  try {
    return (await cachedPersistent<Tabla>(key, DIA_MS, () => descargarTabla(TABLAS[nombre]))).rows;
  } catch (err: any) {
    log(`[Damodaran] ${nombre}: ${err?.message || err}. Se usa la copia guardada.`);
    const stale = await readStale<Tabla>(key);
    return stale?.rows || ((snapshot as any).tablas?.[nombre] as Fila[]) || [];
  }
}

// ---------------------------------------------------------------
// Prima de riesgo implícita (Implied ERP FCFE, último año publicado)
// ---------------------------------------------------------------
export async function getHistimplErp(): Promise<number> {
  const cargar = async () => {
    const res = await fetch(DATAFILE + 'histimpl.html', { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Damodaran respondió ${res.status} para histimpl.html`);
    const rows = tableToRecords(parseFirstTable(await res.text()));
    const validas = rows
      .map(r => ({ anio: cellNumber(r['Year']), erp: cellNumber(r['Implied ERP (FCFE)']) }))
      .filter(r => r.anio !== null && r.erp !== null);
    const ultima = validas[validas.length - 1];
    if (!ultima) throw new Error('histimpl.html sin datos de ERP');
    return { success: true, erp: (ultima.erp as number) / 100, year: ultima.anio };
  };
  try {
    return (await cachedPersistent('damodaran-erp', 7 * DIA_MS, cargar)).erp;
  } catch (err: any) {
    log(`[ERP] No se pudo leer histimpl de Damodaran: ${err?.message || err}`);
    const stale = await readStale<{ erp: number }>('damodaran-erp');
    return stale?.erp ?? (snapshot as any).erp?.erp ?? 0.055;
  }
}

// ---------------------------------------------------------------
// Tasa libre de riesgo: bono del Tesoro a 10 años (FRED DGS10), 4 h de caché
// ---------------------------------------------------------------
export async function getRiskFreeRate(): Promise<number> {
  const cargar = async () => {
    const res = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`FRED respondió ${res.status}`);
    const lineas = (await res.text()).trim().split(/\r?\n/).slice(1);
    // Los festivos llegan vacíos o con "."; se toma el último dato publicado
    for (let i = lineas.length - 1; i >= 0; i--) {
      const valor = cellNumber(lineas[i].split(',')[1]);
      if (valor !== null) return { success: true, rate: valor / 100, fecha: lineas[i].split(',')[0] };
    }
    throw new Error('DGS10 sin observaciones');
  };
  try {
    return (await cachedPersistent('fred-dgs10', 4 * 60 * 60 * 1000, cargar)).rate;
  } catch (err: any) {
    log(`[FRED] ${err?.message || err}`);
    const stale = await readStale<{ rate: number }>('fred-dgs10');
    return stale?.rate ?? (snapshot as any).riskFree?.rate ?? 0.04;
  }
}

export function calculateCapmCostOfEquity(beta: number, rf: number, erp: number): number {
  return rf + beta * erp;
}

// ---------------------------------------------------------------
// Industrias y benchmarks sectoriales
// ---------------------------------------------------------------
const EXCLUIR = new Set([
  'number of firms', 'average beta', 'unlevered beta', 'levered beta', 'industry average', 'overall average',
  'average', 'total', 'notes', 'source', 'industry', 'beta', 'standard deviation', 'operating income', 'cash',
  'capitalization', 'cagr', 'growth', 'roe', 'roa', 'dividend', 'earnings', 'revenue', 'price', 'market', 'size', 'risk'
]);

export function limpiarIndustria(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const v = val.replace(/\s+/g, ' ').trim();
  const low = v.toLowerCase();
  if (!low || EXCLUIR.has(low)) return null;
  if (['number of firms', 'average beta', 'industry average', 'overall average'].some(t => low.includes(t))) return null;
  return v;
}

const columnaIndustria = (rows: Fila[]) => Object.keys(rows[0] || {}).find(c => c.toLowerCase().includes('industry')) || 'Industry Name';

function filaDeIndustria(rows: Fila[], industria: string): Fila | undefined {
  const col = columnaIndustria(rows);
  const objetivo = industria.toLowerCase();
  return rows.find(r => String(r[col] || '').replace(/\s+/g, ' ').trim().toLowerCase() === objetivo);
}

/** Lista cerrada de industrias válidas (filas con beta numérica) */
export async function getIndustriasDamodaran(): Promise<string[]> {
  const rows = await getTabla('betas');
  const col = columnaIndustria(rows);
  const nombres = rows
    .filter(r => cellNumber(r['Beta']) !== null)
    .map(r => limpiarIndustria(r[col]))
    .filter((v): v is string => Boolean(v));
  return [...new Set(nombres)].sort();
}

export async function getBetaDeIndustria(industria: string): Promise<{ beta: number | null; unlevered: number | null }> {
  const fila = filaDeIndustria(await getTabla('betas'), industria);
  return {
    beta: fila ? cellNumber(fila['Beta']) : null,
    unlevered: fila ? cellNumber(fila['Unlevered beta corrected for cash'] ?? fila['Unlevered beta']) : null
  };
}

/** Benchmarks sectoriales para la industria de Damodaran (solo campos con dato) */
export async function getSectorBenchmarks(industria: string, rf?: number, erp?: number): Promise<Record<string, any>> {
  const [tasa, prima] = await Promise.all([rf ?? getRiskFreeRate(), erp ?? getHistimplErp()]);
  const out: Record<string, any> = { industry_name: industria };
  const [roe, pe, pbv, betas] = await Promise.all([getTabla('roe'), getTabla('pe'), getTabla('pbv'), getTabla('betas')]);

  const fRoe = filaDeIndustria(roe, industria);
  const roeVal = cellNumber(fRoe?.['ROE (unadjusted)']) ?? cellNumber(fRoe?.['ROE (adjusted for R&D)']);
  if (roeVal !== null) out.roe_sector = Math.round(roeVal * 100) / 100;

  const pePorDefecto = cellNumber(filaDeIndustria(pe, industria)?.['Current PE']);
  if (pePorDefecto !== null) out.pe_sector = Math.round(pePorDefecto * 100) / 100;

  const pbVal = cellNumber(filaDeIndustria(pbv, industria)?.['PBV']);
  if (pbVal !== null) out.pb_sector = Math.round(pbVal * 100) / 100;

  const fBeta = filaDeIndustria(betas, industria);
  if (fBeta) {
    // D/E de Damodaran publicado en porcentaje (40.20% → 0.40x)
    const de = cellNumber(fBeta['D/E Ratio']);
    if (de !== null) out.debt_equity_sector = Math.round((de / 100) * 100) / 100;
    const beta = cellNumber(fBeta['Beta']);
    if (beta !== null) out.ke_sector = Math.round((tasa + beta * prima) * 100 * 100) / 100;
  }
  return out;
}
