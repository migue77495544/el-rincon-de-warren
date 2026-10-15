// Regenera la copia local de respaldo de Damodaran y FRED (server/data/damodaran-snapshot.json).
// Uso: npx tsx scripts/actualizar-datos-referencia.ts
import fs from 'fs';
import path from 'path';
import { parseFirstTable, tableToRecords, cellNumber } from '../server/engine/htmlTable';
import { TABLAS } from '../server/engine/damodaran';

const DATAFILE = 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/';

async function tabla(archivo: string) {
  const res = await fetch(DATAFILE + archivo);
  if (!res.ok) throw new Error(`${archivo}: HTTP ${res.status}`);
  return tableToRecords(parseFirstTable(await res.text()));
}

const tablas: Record<string, unknown> = {};
for (const [nombre, archivo] of Object.entries(TABLAS)) {
  tablas[nombre] = await tabla(archivo);
  console.log(`${nombre}: ${(tablas[nombre] as unknown[]).length} filas`);
}

const hist = (await tabla('histimpl.html'))
  .map(r => ({ year: cellNumber(r['Year']), erp: cellNumber(r['Implied ERP (FCFE)']) }))
  .filter(r => r.year !== null && r.erp !== null);
const ultimo = hist[hist.length - 1];

const csv = (await (await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10')).text()).trim().split(/\r?\n/).slice(1);
const dgs10 = [...csv].reverse().map(l => l.split(',')).find(([, v]) => cellNumber(v) !== null)!;

const salida = {
  generadoEn: new Date().toISOString(),
  erp: { erp: (ultimo.erp as number) / 100, year: ultimo.year },
  riskFree: { rate: Number(dgs10[1]) / 100, fecha: dgs10[0] },
  tablas
};
fs.writeFileSync(path.resolve('server/data/damodaran-snapshot.json'), JSON.stringify(salida));
console.log('ERP', salida.erp, 'DGS10', salida.riskFree);
