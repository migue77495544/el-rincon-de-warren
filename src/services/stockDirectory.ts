export interface StockDirectoryEntry {
  ticker: string;
  names: string[];
  sector: string;
  formalName: string;
}

export const KNOWN_STOCK_DIRECTORY: StockDirectoryEntry[] = [
  { ticker: 'AAPL', names: ['apple', 'apple inc', 'iphone', 'mac'], sector: 'Tecnología de Consumo', formalName: 'Apple Inc.' },
  { ticker: 'MSFT', names: ['microsoft', 'microsoft corp', 'windows', 'azure'], sector: 'Software & Cloud', formalName: 'Microsoft Corporation' },
  { ticker: 'NVDA', names: ['nvidia', 'nvidia corp', 'geforce', 'cuda'], sector: 'Semiconductores & IA', formalName: 'NVIDIA Corporation' },
  { ticker: 'GOOGL', names: ['google', 'alphabet', 'youtube', 'android'], sector: 'Servicios de Internet & IA', formalName: 'Alphabet Inc.' },
  { ticker: 'AMZN', names: ['amazon', 'amazon.com', 'aws', 'prime'], sector: 'Comercio & Cloud', formalName: 'Amazon.com, Inc.' },
  { ticker: 'META', names: ['meta', 'facebook', 'instagram', 'whatsapp'], sector: 'Redes Sociales', formalName: 'Meta Platforms, Inc.' },
  { ticker: 'TSLA', names: ['tesla', 'tesla inc', 'musk', 'cybertruck'], sector: 'Vehículos Eléctricos & Energía', formalName: 'Tesla, Inc.' },
  { ticker: 'BRK.B', names: ['berkshire', 'berkshire hathaway', 'buffett', 'munger', 'brk'], sector: 'Conglomerado Financiero', formalName: 'Berkshire Hathaway Inc.' },
  { ticker: 'KO', names: ['coca cola', 'cocacola', 'coca-cola', 'coke'], sector: 'Bebidas & Consumo', formalName: 'The Coca-Cola Company' },
  { ticker: 'PEP', names: ['pepsi', 'pepsico'], sector: 'Bebidas & Snacks', formalName: 'PepsiCo, Inc.' },
  { ticker: 'JNJ', names: ['johnson', 'johnson & johnson', 'j&j'], sector: 'Salud & Farmacéutica', formalName: 'Johnson & Johnson' },
  { ticker: 'WMT', names: ['walmart', 'wal-mart'], sector: 'Retail Defensivo', formalName: 'Walmart Inc.' },
  { ticker: 'DIS', names: ['disney', 'walt disney', 'marvel', 'pixar'], sector: 'Entretenimiento & Medios', formalName: 'The Walt Disney Company' },
  { ticker: 'NFLX', names: ['netflix', 'streaming'], sector: 'Streaming Digital', formalName: 'Netflix, Inc.' },
  { ticker: 'AMD', names: ['amd', 'advanced micro devices', 'ryzen'], sector: 'Semiconductores', formalName: 'Advanced Micro Devices, Inc.' },
  { ticker: 'INTC', names: ['intel', 'intel corp'], sector: 'Semiconductores', formalName: 'Intel Corporation' },
  { ticker: 'PLTR', names: ['palantir', 'palantir technologies', 'karp'], sector: 'Software & Inteligencia Artificial', formalName: 'Palantir Technologies Inc.' },
  { ticker: 'SAN', names: ['santander', 'banco santander', 'botin'], sector: 'Banca & Servicios Financieros', formalName: 'Banco Santander, S.A.' },
  { ticker: 'BBVA', names: ['bbva', 'banco bilbao vizcaya'], sector: 'Banca & Servicios Financieros', formalName: 'Banco Bilbao Vizcaya Argentaria' },
  { ticker: 'BABA', names: ['alibaba', 'ali baba', 'jack ma'], sector: 'Comercio Electrónico', formalName: 'Alibaba Group Holding' },
  { ticker: 'V', names: ['visa', 'visa inc'], sector: 'Pagos Digitales', formalName: 'Visa Inc.' },
  { ticker: 'MA', names: ['mastercard', 'master card'], sector: 'Pagos Digitales', formalName: 'Mastercard Incorporated' },
  { ticker: 'COST', names: ['costco', 'costco wholesale'], sector: 'Comercio Mayorista', formalName: 'Costco Wholesale Corp.' },
  { ticker: 'NKE', names: ['nike', 'nike inc'], sector: 'Calzado & Moda Deportiva', formalName: 'Nike, Inc.' },
  { ticker: 'MCD', names: ['mcdonalds', "mcdonald's"], sector: 'Restauración', formalName: "McDonald's Corporation" },
  { ticker: 'SBUX', names: ['starbucks', 'starbucks coffee'], sector: 'Cafeterías & Consumo', formalName: 'Starbucks Corporation' },
  { ticker: 'UBER', names: ['uber', 'uber technologies'], sector: 'Movilidad & Delivery', formalName: 'Uber Technologies, Inc.' },
  { ticker: 'CRM', names: ['salesforce', 'salesforce.com'], sector: 'Software CRM', formalName: 'Salesforce, Inc.' },
  { ticker: 'ORCL', names: ['oracle', 'oracle corp'], sector: 'Bases de Datos & Cloud', formalName: 'Oracle Corporation' },
  { ticker: 'ADBE', names: ['adobe', 'adobe systems', 'photoshop'], sector: 'Software Creativo', formalName: 'Adobe Inc.' },
  { ticker: 'SPOT', names: ['spotify', 'spotify technology'], sector: 'Música & Streaming', formalName: 'Spotify Technology S.A.' },
  { ticker: 'PYPL', names: ['paypal', 'paypal holdings'], sector: 'Pagos Digitales', formalName: 'PayPal Holdings, Inc.' }
];

export function resolveTicker(query: string): { ticker: string; formalName?: string; sector?: string } {
  const clean = query.trim().toUpperCase();
  const lower = query.trim().toLowerCase();

  const exactMatch = KNOWN_STOCK_DIRECTORY.find(k => k.ticker === clean);
  if (exactMatch) {
    return { ticker: exactMatch.ticker, formalName: exactMatch.formalName, sector: exactMatch.sector };
  }

  const nameMatch = KNOWN_STOCK_DIRECTORY.find(k =>
    k.names.some(n => lower === n || lower.includes(n) || n.includes(lower))
  );
  if (nameMatch) {
    return { ticker: nameMatch.ticker, formalName: nameMatch.formalName, sector: nameMatch.sector };
  }

  const sanitized = clean.replace(/[^A-Z0-9.\-]/g, '').slice(0, 8);
  return { ticker: sanitized || clean };
}