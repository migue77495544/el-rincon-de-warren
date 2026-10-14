import { Router, Request, Response } from 'express';
import { runPythonEngine, runPythonEngineWithEnv } from '../services/pythonEngine.js';
import { getCompaniesDB } from './market.js';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/python/status', async (req: Request, res: Response) => {
  try {
    const result = await runPythonEngine(['test']);
    return res.json({
      success: true,
      ...result,
      sourceSnippet: `# ==========================================================
# IMPORTACIÓN DE LIBRERÍAS
# ==========================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import yfinance as yf

plt.style.use('seaborn-v0_8')
pd.options.display.float_format = '{:,.6f}'.format

print("Librerías cargadas correctamente.")`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/company/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['company', rawTicker]);
    if (data.success && req.query.addToCatalog === 'true') {
      const companiesDB = getCompaniesDB();
      const existingIdx = companiesDB.findIndex(c => c.ticker === rawTicker);
      const newSeed = {
        id: rawTicker.toLowerCase(),
        ticker: rawTicker,
        nombre: data.nombre,
        sector: data.sector,
        descripcion: data.descripcion,
        moat: data.moat,
        raw: data.raw,
        targetConsensus: data.target_consensus,
        sectorBenchmarks: data.sector_benchmarks,
        warrenVerdict: data.moat.includes('Foso') ? 'Aprobado con Foso' : 'Vigilancia'
      };
      if (existingIdx >= 0) {
        companiesDB[existingIdx] = newSeed as any;
      } else {
        companiesDB.push(newSeed as any);
      }
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/python/markowitz', async (req: Request, res: Response) => {
  const tickers: string[] = req.body.tickers || ['BRK.B', 'KO', 'AAPL', 'JNJ', 'COST'];
  const rf = Number(req.body.riskFreeRate || 0.04);
  try {
    const result = await runPythonEngine(['markowitz', tickers.join(','), String(rf)]);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/script', (req: Request, res: Response) => {
  try {
    const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
    const content = fs.readFileSync(scriptPath, 'utf8');
    return res.json({ success: true, script: content });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/python/plots', async (req: Request, res: Response) => {
  const tickers: string[] = req.body.tickers || ['BRK.B', 'KO', 'AAPL', 'JNJ', 'COST'];
  const targetTicker: string = req.body.targetTicker || 'KO';
  try {
    const result = await runPythonEngine(['plots', tickers.join(','), targetTicker]);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/candles/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const validPeriods = ['1mo', '3mo', '6mo', '1y', '5y', 'max'];
  const validIntervals = ['1d', '1wk', '1mo'];
  const period = validPeriods.includes(String(req.query.period)) ? String(req.query.period) : '1y';
  const interval = validIntervals.includes(String(req.query.interval)) ? String(req.query.interval) : '1d';

  try {
    const data = await runPythonEngine(['candles', rawTicker, period, interval]);
    const companiesDB = getCompaniesDB();
    const company = companiesDB.find(c => c.ticker === rawTicker);
    const targetMean = company?.targetConsensus?.target_mean;
    const targetMeanVal = targetMean || (data.currentPrice ? data.currentPrice * 1.15 : 100);

    return res.json({
      ...data,
      period,
      interval,
      targetMean: Math.round(targetMeanVal * 100) / 100
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
      points: [],
      emas: { ema20: [], ema50: [], ema40: [], ema200: [] }
    });
  }
});

router.get('/python/targets/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['targets', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/recommendations/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['recommendations', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/news/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['news', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/capm/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const mrp = req.query.mrp ? String(req.query.mrp) : undefined;
  try {
    const args = ['capm', rawTicker, ...(mrp ? [mrp] : [])];
    const data = await runPythonEngine(args);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/classify-industry/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const args = ['classify-industry', rawTicker];
    const data = await runPythonEngine(args);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/python/tracking-error/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const benchmark = (req.query.benchmark as string)?.toUpperCase().trim() || '^GSPC';
  const period = (req.query.period as string) || '1y';
  try {
    const args = ['tracking-error', rawTicker, benchmark, period];
    const data = await runPythonEngine(args);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export { runPythonEngine, runPythonEngineWithEnv };
export default router;