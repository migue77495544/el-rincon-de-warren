export interface LivePriceData {
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  source: string;
}

export async function fetchLivePrice(rawTicker: string): Promise<LivePriceData | null> {
  const ticker = rawTicker.toUpperCase().trim();
  const { runPythonEngine } = await import('./pythonEngine.js');

  try {
    const live = await runPythonEngine(['price', ticker]);
    if (live && live.success && live.price > 0) {
      return {
        price: live.price,
        previousClose: live.previousClose || live.price,
        change: live.change,
        changePercent: live.changePercent,
        source: live.source || 'Yahoo Finance (yfinance)'
      };
    }
  } catch (err) {
    console.warn(`[LiveMarket] Error en motor yfinance para ${ticker}:`, err);
  }

  try {
    const yahooTicker = ticker === 'BRK.B' ? 'BRK-B' : ticker;
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}`;
    const yRes = await fetch(yUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (yRes.ok) {
      const yData = await yRes.json();
      const meta = yData?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || price;
        const change = price - prev;
        const changePercent = prev > 0 ? (change / prev) * 100 : 0;
        return {
          price: Math.round(price * 100) / 100,
          previousClose: Math.round(prev * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          source: 'Yahoo Finance (Direct Stream)'
        };
      }
    }
  } catch (err) {
    console.warn(`[LiveMarket] Error en feed directo de Yahoo Finance para ${ticker}:`, err);
  }

  return null;
}