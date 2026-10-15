// Port de difflib.SequenceMatcher.ratio y difflib.get_close_matches de Python (sin elementos basura)

function matchingSize(a: string, b: string): number {
  const b2j = new Map<string, number[]>();
  for (let j = 0; j < b.length; j++) {
    const list = b2j.get(b[j]) || [];
    list.push(j);
    b2j.set(b[j], list);
  }

  const longest = (alo: number, ahi: number, blo: number, bhi: number) => {
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const next = new Map<number, number>();
      for (const j of b2j.get(a[i]) || []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) || 0) + 1;
        next.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
      j2len = next;
    }
    return [besti, bestj, bestsize] as const;
  };

  let total = 0;
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = longest(alo, ahi, blo, bhi);
    if (k) {
      total += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return total;
}

export function ratio(a: string, b: string): number {
  const len = a.length + b.length;
  return len ? (2 * matchingSize(a, b)) / len : 1;
}

function quickRatio(a: string, b: string): number {
  const counts = new Map<string, number>();
  for (const ch of b) counts.set(ch, (counts.get(ch) || 0) + 1);
  let matches = 0;
  for (const ch of a) {
    const c = counts.get(ch) || 0;
    if (c > 0) {
      matches++;
      counts.set(ch, c - 1);
    }
  }
  const len = a.length + b.length;
  return len ? (2 * matches) / len : 1;
}

/** difflib.get_close_matches(word, possibilities, n, cutoff) */
export function getCloseMatches(word: string, possibilities: string[], n = 3, cutoff = 0.6): string[] {
  const result: Array<[number, string]> = [];
  for (const x of possibilities) {
    const len = x.length + word.length;
    const realQuick = len ? (2 * Math.min(x.length, word.length)) / len : 1;
    if (realQuick >= cutoff && quickRatio(x, word) >= cutoff) {
      const r = ratio(x, word);
      if (r >= cutoff) result.push([r, x]);
    }
  }
  // heapq.nlargest sobre tuplas: a igual puntuación gana la cadena mayor
  result.sort((p, q) => q[0] - p[0] || (q[1] > p[1] ? 1 : q[1] < p[1] ? -1 : 0));
  return result.slice(0, n).map(([, x]) => x);
}
