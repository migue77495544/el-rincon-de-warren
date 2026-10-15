// Lector mínimo de tablas HTML (equivale a pandas.read_html(url, header=0)[0] para las páginas de Damodaran)

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function cellText(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Filas de la primera tabla del documento como matriz de texto */
export function parseFirstTable(html: string): string[][] {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const table = clean.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const rows: string[][] = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(cellText);
    if (cells.some(c => c !== '')) rows.push(cells);
  }
  return rows;
}

/** Tabla con la primera fila como cabecera → lista de objetos por columna */
export function tableToRecords(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const header = rows[0].map((h, i) => (i === 0 && !h ? 'Industry Name' : h));
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/** Número de una celda: admite porcentajes ("40.20%" → 40.2), separadores de miles y vacíos */
export function cellNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[,$\s]/g, '').replace('%', '');
  if (!s || s === 'NA' || s === 'N/A' || s === '#DIV/0!') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const isPercent = (v: unknown) => typeof v === 'string' && v.trim().endsWith('%');
