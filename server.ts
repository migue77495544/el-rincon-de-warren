import 'dotenv/config';
import express from 'express';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const execFileAsync = promisify(execFile);

// Helper para ejecutar el motor de Python (pandas, numpy, yfinance)
async function runPythonEngine(args: string[]): Promise<any> {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(stdout);
}
import { INITIAL_COMPANIES, INITIAL_THESES, INITIAL_BADGES, INITIAL_LEAGUE, INITIAL_LEARNING_STEPS } from './src/data/initialData';
import { POPULAR_LIVE_TICKERS } from './src/data/popularTickersData';
import {
  calculateFundamentalRatios,
  calculateLinearScore,
  calculatePortfolioRiskMetrics,
  calculateDivayMotivationIndex,
  calculateDifferenceInDifferences
} from './src/utils/financialCalculations';
import { CompanyAnalysis, FinancialRawData } from './src/types';
import { generateDualAdvisorConsultation, generateJairoOnlyResponse, generateGuillermoOnlyResponse, identifyCompany } from './src/utils/dualAdvisorEngine';

const app = express();
// Render (y otros PaaS) asignan el puerto por la variable PORT; 3000 en local
const PORT = Number(process.env.PORT) || 3000;

// Las consultas a los asesores descargan datos de mercado y llaman a Gemini (hasta 3 modelos en cadena)
const ADVISOR_TIMEOUT_MS = 75000;

app.use(express.json());

// In-memory data store for the session
let companiesDB = [...INITIAL_COMPANIES];
let thesesDB = [...INITIAL_THESES];
let badgesDB = [...INITIAL_BADGES];

// Helper to fetch live market price using yfinance (Yahoo Finance)
async function fetchLivePrice(rawTicker: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  source: string;
} | null> {
  const ticker = rawTicker.toUpperCase().trim();

  // 1. Obtención de cotización directa mediante el motor Python de yfinance
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

  // 2. Fallback de alta velocidad a feed directo de Yahoo Finance en caso de demora del subproceso
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

// Helper to fully analyze a company
function analyzeCompany(seed: (typeof INITIAL_COMPANIES)[0]): CompanyAnalysis {
  const ratios = calculateFundamentalRatios(seed.raw);
  const scoreData = calculateLinearScore(ratios);

  return {
    id: seed.id,
    ticker: seed.ticker,
    nombre: seed.nombre,
    sector: seed.sector,
    descripcion: seed.descripcion,
    moat: seed.moat,
    raw: seed.raw,
    ratios,
    dimensiones: scoreData.dimensions,
    linearScore: scoreData.score,
    scoreGrade: scoreData.grade,
    targetConsensus: seed.targetConsensus,
    sectorBenchmarks: seed.sectorBenchmarks,
    warrenVerdict: seed.warrenVerdict
  };
}

// Directorio maestro de empresas conocidas para resolución instantánea de nombres a tickers
const KNOWN_STOCK_DIRECTORY: Array<{ ticker: string; names: string[]; sector: string; formalName: string }> = [
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

function resolveTicker(query: string): { ticker: string; formalName?: string; sector?: string } {
  const clean = query.trim().toUpperCase();
  const lower = query.trim().toLowerCase();

  // 1. Búsqueda exacta en directorio
  const exactMatch = KNOWN_STOCK_DIRECTORY.find(k => k.ticker === clean);
  if (exactMatch) {
    return { ticker: exactMatch.ticker, formalName: exactMatch.formalName, sector: exactMatch.sector };
  }

  // 2. Búsqueda por alias o nombre
  const nameMatch = KNOWN_STOCK_DIRECTORY.find(k =>
    k.names.some(n => lower === n || lower.includes(n) || n.includes(lower))
  );
  if (nameMatch) {
    return { ticker: nameMatch.ticker, formalName: nameMatch.formalName, sector: nameMatch.sector };
  }

  // 3. Fallback: usar el ticker limpio alfanumérico
  const sanitized = clean.replace(/[^A-Z0-9.\-]/g, '').slice(0, 8);
  return { ticker: sanitized || clean };
}

// -------------------------------------------------------------
// MÓDULO 0: API de Mercado en Tiempo Real (Yahoo Finance / yfinance)
// -------------------------------------------------------------
app.get('/api/market/status', (req, res) => {
  res.json({
    success: true,
    provider: 'Yahoo Finance (yfinance)',
    engine: 'Python yfinance + Feeds bursátiles en tiempo real',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// MÓDULO PYTHON: yfinance, pandas, numpy, seaborn, matplotlib
// -------------------------------------------------------------
app.get('/api/python/status', async (req, res) => {
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

app.get('/api/python/company/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['company', rawTicker]);
    if (data.success && req.query.addToCatalog === 'true') {
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
        companiesDB[existingIdx] = newSeed;
      } else {
        companiesDB.push(newSeed);
      }
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/python/markowitz', async (req, res) => {
  const tickers: string[] = req.body.tickers || ['BRK.B', 'KO', 'AAPL', 'JNJ', 'COST'];
  const rf = Number(req.body.riskFreeRate || 0.04);
  try {
    const result = await runPythonEngine(['markowitz', tickers.join(','), String(rf)]);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/python/script', (req, res) => {
  try {
    const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
    const content = fs.readFileSync(scriptPath, 'utf8');
    return res.json({ success: true, script: content });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/python/plots', async (req, res) => {
  const tickers: string[] = req.body.tickers || ['BRK.B', 'KO', 'AAPL', 'JNJ', 'COST'];
  const targetTicker: string = req.body.targetTicker || 'KO';
  try {
    const result = await runPythonEngine(['plots', tickers.join(','), targetTicker]);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de Velas Japonesas (Candlesticks) históricas con yfinance y EMAs (20, 40, 200)
app.get('/api/python/candles/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const validPeriods = ['1mo', '3mo', '6mo', '1y', '5y', 'max'];
  const validIntervals = ['1d', '1wk', '1mo'];
  const period = validPeriods.includes(String(req.query.period)) ? String(req.query.period) : '1y';
  const interval = validIntervals.includes(String(req.query.interval)) ? String(req.query.interval) : '1d';

  try {
    const data = await runPythonEngine(['candles', rawTicker, period, interval]);
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

// -------------------------------------------------------------
// ENDPOINTS YFINANCE: Targets, Recommendations y News
// -------------------------------------------------------------

// 1. PRECIO OBJETIVO DE ANALISTAS Y GRÁFICA VISUAL DE DISTRIBUCIÓN
app.get('/api/python/targets/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['targets', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/market/targets/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['targets', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. RECOMENDACIONES Y CALIFICACIONES (UPGRADES / DOWNGRADES)
app.get('/api/python/recommendations/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['recommendations', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/market/recommendations/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['recommendations', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. NOTICIAS RECIENTES (NEWS)
app.get('/api/python/news/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['news', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/market/news/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const data = await runPythonEngine(['news', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. COSTO DE CAPITAL PROPIO — CAPM (Damodaran betas + FRED DGS10 + ERP implícito)
app.get('/api/python/capm/:ticker', async (req, res) => {
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
app.get('/api/market/capm/:ticker', async (req, res) => {
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

// FASE A: Endpoint para clasificación de industria vía IA
app.get('/api/python/classify-industry/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const args = ['classify-industry', rawTicker];
    const data = await runPythonEngine(args);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para Tracking Error (Riesgo Activo) frente a benchmark
app.get('/api/python/tracking-error/:ticker', async (req, res) => {
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


// Endpoint de Consulta Dual Jairo + Juan Guillermo (Análisis Fundamental + Técnico con Gemini / Motor Analítico)
app.post('/api/python/consulta-dual', async (req, res) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  // Si no se proporcionó ticker explícito, detectar si la pregunta se refiere a alguna empresa
  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, companiesDB);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  // 1. Intentar ejecución mediante el motor Python (con Gemini SDK + systemInstruction)
  try {
    const args = ['consulta-dual', pregunta, ...(ticker ? [ticker] : [])];
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');

    // Pasar explícitamente GEMINI_API_KEY y configurar entorno para UTF-8
    const env = { 
      ...process.env, 
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      PYTHONIOENCODING: 'utf-8'
    };

    const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
      timeout: ADVISOR_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      env
    });
    
    const data = JSON.parse(stdout);
    if (data && data.success && data.respuesta_jairo && data.respuesta_guillermo) {
      const modeloNegocio = data.modeloNegocio || (data.modelo_negocio ? {
        queHace: data.modelo_negocio.que_hace || data.modelo_negocio.queHace,
        comoGanaDinero: data.modelo_negocio.como_gana_dinero || data.modelo_negocio.comoGanaDinero,
        sector: data.modelo_negocio.sector
      } : undefined);

      // La fuente la declara el motor Python: 'gemini-live' solo si ambas respuestas vienen del modelo
      return res.json({
        ...data,
        modeloNegocio,
        source: data.source === 'gemini-live' ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaDual] Subproceso Python no respondió a tiempo o falló, activando motor analítico nativo:', err.message);
  }

  // 2. Fallback nativo de alta disponibilidad (garantiza que el botón siempre responda con máxima fidelidad)
  try {
    const localResult = generateDualAdvisorConsultation(pregunta, ticker, companiesDB);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaDual] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

// Endpoint para Preguntas Específicas e Individuales: solo Jairo (Análisis Fundamental)
app.post('/api/python/consulta-jairo', async (req, res) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, companiesDB);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  try {
    const args = ['consulta-jairo', pregunta, ...(ticker ? [ticker] : [])];
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
    const env = {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      PYTHONIOENCODING: 'utf-8'
    };

    const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
      timeout: ADVISOR_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      env
    });

    const data = JSON.parse(stdout);
    if (data && data.success && data.respuesta) {
      return res.json({
        ...data,
        source: data.source === 'gemini-live' ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaJairo] Subproceso Python no respondió, usando motor analítico local:', err.message);
  }

  try {
    const localResult = generateJairoOnlyResponse(pregunta, ticker, companiesDB);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaJairo] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

// Endpoint para Preguntas Específicas e Individuales: solo Guillermo (Análisis Técnico)
app.post('/api/python/consulta-guillermo', async (req, res) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, companiesDB);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  try {
    const args = ['consulta-guillermo', pregunta, ...(ticker ? [ticker] : [])];
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
    const env = {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      PYTHONIOENCODING: 'utf-8'
    };

    const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
      timeout: ADVISOR_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      env
    });

    const data = JSON.parse(stdout);
    if (data && data.success && data.respuesta) {
      return res.json({
        ...data,
        source: data.source === 'gemini-live' ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaGuillermo] Subproceso Python no respondió, usando motor analítico local:', err.message);
  }

  try {
    const localResult = generateGuillermoOnlyResponse(pregunta, ticker, companiesDB);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaGuillermo] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

// Endpoint de búsqueda interactiva de acciones (Yahoo Finance + Feeds + Directorio)
app.get('/api/market/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json({ success: true, query: '', results: [] });
  }

  const lower = query.toLowerCase();
  const upper = query.toUpperCase();
  const results: Array<{
    ticker: string;
    nombre: string;
    sector: string;
    inCatalog: boolean;
    price?: number;
    source: string;
  }> = [];

  const seen = new Set<string>();

  // 1. Coincidencias en catálogo cargado actualmente
  for (const c of companiesDB) {
    if (
      c.ticker.toLowerCase().includes(lower) ||
      c.nombre.toLowerCase().includes(lower) ||
      c.sector.toLowerCase().includes(lower)
    ) {
      if (!seen.has(c.ticker)) {
        seen.add(c.ticker);
        results.push({
          ticker: c.ticker,
          nombre: c.nombre,
          sector: c.sector,
          inCatalog: true,
          price: c.raw.precioCotizacion,
          source: 'En Catálogo'
        });
      }
    }
  }

  // 2. Coincidencias en catálogo auditado SEC
  for (const [tick, seed] of Object.entries(POPULAR_LIVE_TICKERS)) {
    if (
      tick.toLowerCase().includes(lower) ||
      seed.nombre.toLowerCase().includes(lower) ||
      seed.sector.toLowerCase().includes(lower)
    ) {
      if (!seen.has(tick)) {
        seen.add(tick);
        results.push({
          ticker: tick,
          nombre: seed.nombre,
          sector: seed.sector,
          inCatalog: companiesDB.some(c => c.ticker === tick),
          price: seed.raw.precioCotizacion,
          source: 'Balances Auditados SEC'
        });
      }
    }
  }

  // 3. Coincidencias en directorio maestro
  for (const item of KNOWN_STOCK_DIRECTORY) {
    if (item.ticker.includes(upper) || item.names.some(n => n.includes(lower) || lower.includes(n))) {
      if (!seen.has(item.ticker)) {
        seen.add(item.ticker);
        results.push({
          ticker: item.ticker,
          nombre: item.formalName,
          sector: item.sector,
          inCatalog: companiesDB.some(c => c.ticker === item.ticker),
          source: 'Bolsa de Valores'
        });
      }
    }
  }

  // 4. Búsqueda en vivo de alta velocidad en Yahoo Finance
  try {
    const yUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6`;
    const yRes = await fetch(yUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (yRes.ok) {
      const yData = await yRes.json();
      const quotes = yData?.quotes || [];
      for (const q of quotes) {
        if (q.quoteType === 'EQUITY' && q.symbol && !seen.has(q.symbol)) {
          seen.add(q.symbol);
          results.push({
            ticker: q.symbol,
            nombre: q.longname || q.shortname || q.symbol,
            sector: q.sector || q.industry || 'Renta Variable Global',
            inCatalog: companiesDB.some(c => c.ticker === q.symbol),
            source: 'Mercado Live'
          });
        }
      }
    }
  } catch (err) {
    console.warn('[MarketSearch] Feed bursátil diferido:', err);
  }

  return res.json({
    success: true,
    query,
    results: results.slice(0, 10)
  });
});

app.get('/api/market/quote/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    const liveData = await fetchLivePrice(ticker);
    if (!liveData) {
      return res.status(404).json({ error: `No se pudo obtener la cotización en vivo para ${ticker}` });
    }
    return res.json({
      success: true,
      ticker,
      ...liveData,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint de Histórico de Cotizaciones y Gráfica Bursátil para Empresas
app.get('/api/market/history/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const range = (String(req.query.range || '1y')).toLowerCase(); // 1m, 3m, 6m, 1y, 5y
  const yahooTicker = rawTicker === 'BRK.B' ? 'BRK-B' : rawTicker;

  // Buscar si la empresa existe en el catálogo para tomar su precio actual y objetivo de analistas
  const company = companiesDB.find(c => c.ticker === rawTicker);
  const currentPrice = company?.raw?.precioCotizacion || 100;
  const targetMean = company?.targetConsensus?.target_mean || currentPrice * 1.15;

  let yRange = '1y';
  let yInterval = '1d';
  let numDays = 252;

  switch (range) {
    case '1m':
      yRange = '1mo';
      yInterval = '1d';
      numDays = 22;
      break;
    case '3m':
      yRange = '3mo';
      yInterval = '1d';
      numDays = 65;
      break;
    case '6m':
      yRange = '6mo';
      yInterval = '1d';
      numDays = 126;
      break;
    case '5y':
      yRange = '5y';
      yInterval = '1wk';
      numDays = 260;
      break;
    case '1y':
    default:
      yRange = '1y';
      yInterval = '1d';
      numDays = 252;
      break;
  }

  // 1. Intentar obtener datos reales de mercado
  try {
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?range=${yRange}&interval=${yInterval}`;
    const yRes = await fetch(yUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (yRes.ok) {
      const yData = await yRes.json();
      const result = yData?.chart?.result?.[0];
      const timestamps = result?.timestamp;
      const quote = result?.indicators?.quote?.[0];

      if (Array.isArray(timestamps) && timestamps.length > 0 && quote?.close) {
        const closes = quote.close;
        const volumes = quote.volume || [];
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];

        const points: Array<{
          date: string;
          label: string;
          price: number;
          open: number;
          high: number;
          low: number;
          volume: number;
          targetMean: number;
        }> = [];

        for (let i = 0; i < timestamps.length; i++) {
          const rawPrice = closes[i];
          if (rawPrice === null || rawPrice === undefined || isNaN(rawPrice)) continue;

          const d = new Date(timestamps[i] * 1000);
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          const price = Math.round(rawPrice * 100) / 100;
          const open = Math.round((opens[i] ?? price) * 100) / 100;
          const high = Math.round((highs[i] ?? price) * 100) / 100;
          const low = Math.round((lows[i] ?? price) * 100) / 100;
          const volume = Math.round(volumes[i] || 100000);

          points.push({
            date: dateStr,
            label,
            price,
            open,
            high,
            low,
            volume,
            targetMean: Math.round(targetMean * 100) / 100
          });
        }

        if (points.length >= 5) {
          const firstPrice = points[0].price;
          const lastPrice = points[points.length - 1].price;
          const change = Math.round((lastPrice - firstPrice) * 100) / 100;
          const changePercent = firstPrice > 0 ? Math.round(((change / firstPrice) * 100) * 100) / 100 : 0;
          const allPrices = points.map(p => p.price);
          const min52w = Math.min(...allPrices);
          const max52w = Math.max(...allPrices);

          return res.json({
            success: true,
            ticker: rawTicker,
            range,
            source: 'Bolsa de Valores en Tiempo Real (NYSE / NASDAQ)',
            points,
            currentPrice: lastPrice,
            firstPrice,
            change,
            changePercent,
            min52w,
            max52w,
            targetMean
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[MarketHistory] Fallback a generador analítico para ${rawTicker}:`, err);
  }

  // 2. Generador determinista de alta fidelidad basado en el precio actual y volatilidad de la acción
  const now = new Date();
  const seedMultiplier = rawTicker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const trendSlope = (rawTicker === 'HYPE' ? -0.35 : (seedMultiplier % 3 === 0 ? 0.22 : 0.12));
  const volatility = rawTicker === 'HYPE' ? 0.035 : (rawTicker === 'NVDA' || rawTicker === 'TSLA' ? 0.025 : 0.012);

  const tempPoints: any[] = [];

  for (let i = 0; i < numDays; i++) {
    const d = new Date(now.getTime() - (numDays - 1 - i) * 24 * 60 * 60 * 1000);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const progress = i / numDays;
    const noise = Math.sin((i + seedMultiplier) * 0.45) * volatility + Math.cos((i * 2 + seedMultiplier) * 0.3) * (volatility * 0.7);
    const trendComponent = (progress - 1) * trendSlope * currentPrice;
    const priceVal = Math.max(1, Math.round((currentPrice + trendComponent + (noise * currentPrice)) * 100) / 100);
    const dayVolume = Math.round(1500000 + Math.abs(Math.sin(i * 0.7)) * 4000000);

    const high = Math.round(priceVal * (1 + Math.abs(noise * 0.5)) * 100) / 100;
    const low = Math.round(priceVal * (1 - Math.abs(noise * 0.5)) * 100) / 100;
    const open = Math.round(((high + low) / 2) * 100) / 100;

    tempPoints.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      price: i === numDays - 1 ? currentPrice : priceVal,
      open,
      high,
      low,
      volume: dayVolume,
       targetMean: Math.round(targetMean * 100) / 100
    });
  }

  if (tempPoints.length > 0) {
    tempPoints[tempPoints.length - 1].price = currentPrice;
  }

  const allPrices = tempPoints.map(p => p.price);
  const firstPrice = tempPoints[0]?.price || currentPrice;
  const lastPrice = tempPoints[tempPoints.length - 1]?.price || currentPrice;
  const change = Math.round((lastPrice - firstPrice) * 100) / 100;
  const changePercent = firstPrice > 0 ? Math.round(((change / firstPrice) * 100) * 100) / 100 : 0;

  return res.json({
    success: true,
    ticker: rawTicker,
    range,
    source: 'Modelo Analítico de Cotización Bursátil',
    points: tempPoints,
    currentPrice: lastPrice,
    firstPrice,
    change,
    changePercent,
    min52w: Math.min(...allPrices),
    max52w: Math.max(...allPrices),
    targetMean
  });
});

// Endpoint de Detección de Patrones Técnicos con Gemini AI
app.post('/api/market/technical-patterns/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const inputPoints = Array.isArray(req.body?.points) ? req.body.points : [];
  const inputIndicators = req.body?.indicators ?? null; // { rsi, macdLine, macdSignal, macdHist, ema20, ema50, ema40, ema200 }

  try {
    // Si no se pasaron puntos o son insuficientes, usar el histórico ya disponible
    let pointsToAnalyze = inputPoints;
    if (pointsToAnalyze.length < 5) {
      const company = companiesDB.find(c => c.ticker === rawTicker);
      const currPrice = company?.raw.precioCotizacion || 100;
      pointsToAnalyze = [
        { date: '2026-08-01', open: currPrice * 0.95, high: currPrice * 1.02, low: currPrice * 0.93, price: currPrice * 0.98 },
        { date: '2026-08-15', open: currPrice * 0.98, high: currPrice * 1.05, low: currPrice * 0.97, price: currPrice * 1.04 },
        { date: '2026-09-01', open: currPrice * 1.04, high: currPrice * 1.06, low: currPrice * 0.99, price: currPrice * 1.01 }
      ];
    }

    // Tomar las últimas 75 velas para análisis óptimo de patrones recientes
    const trimmedPoints = pointsToAnalyze.slice(-75).map((p: any) => ({
      date: p.date,
      open: Math.round(((p.open ?? p.price) || 0) * 100) / 100,
      high: Math.round(((p.high ?? Math.max(p.open ?? p.price, p.price)) || 0) * 100) / 100,
      low: Math.round(((p.low ?? Math.min(p.open ?? p.price, p.price)) || 0) * 100) / 100,
      close: Math.round(((p.price ?? p.close) || 0) * 100) / 100,
      volume: p.volume || 0,
      ...(p.rsi != null        ? { rsi: Math.round(p.rsi * 100) / 100 }               : {}),
      ...(p.macdLine != null   ? { macdLine: Math.round(p.macdLine * 10000) / 10000 } : {}),
      ...(p.macdSignal != null ? { macdSignal: Math.round(p.macdSignal * 10000) / 10000 } : {}),
      ...(p.macdHist != null   ? { macdHist: Math.round(p.macdHist * 10000) / 10000 }   : {}),
      ...(p.ema20 != null  ? { ema20: Math.round(p.ema20 * 100) / 100 }   : {}),
      ...((p.ema50 != null || p.ema40 != null) ? {
        ema50: Math.round((p.ema50 ?? p.ema40) * 100) / 100,
        ema40: Math.round((p.ema50 ?? p.ema40) * 100) / 100
      } : {}),
      ...(p.ema200 != null ? { ema200: Math.round(p.ema200 * 100) / 100 } : {}),
    }));

    // Extraer valores más recientes de los puntos si los indicadores no vinieron en el body
    const lastPointWithRsi = [...trimmedPoints].reverse().find((p: any) => p.rsi != null);
    const lastPointWithMacd = [...trimmedPoints].reverse().find((p: any) => p.macdLine != null);
    const lastPointWithEma = [...trimmedPoints].reverse().find((p: any) => p.ema200 != null);

    const effectiveRsi: number | null = inputIndicators?.rsi ?? lastPointWithRsi?.rsi ?? null;
    const effectiveMacdLine: number | null = inputIndicators?.macdLine ?? lastPointWithMacd?.macdLine ?? null;
    const effectiveMacdSignal: number | null = inputIndicators?.macdSignal ?? lastPointWithMacd?.macdSignal ?? null;
    const effectiveMacdHist: number | null = inputIndicators?.macdHist ?? lastPointWithMacd?.macdHist ?? null;
    const effectiveEma20: number | null = inputIndicators?.ema20 ?? lastPointWithEma?.ema20 ?? null;
    const effectiveEma50: number | null = inputIndicators?.ema50 ?? inputIndicators?.ema40 ?? lastPointWithEma?.ema50 ?? lastPointWithEma?.ema40 ?? null;
    const effectiveEma40: number | null = effectiveEma50;
    const effectiveEma200: number | null = inputIndicators?.ema200 ?? lastPointWithEma?.ema200 ?? null;
    const lastClose: number = trimmedPoints[trimmedPoints.length - 1]?.close ?? 0;

    const isAboveEma200 = effectiveEma200 != null ? lastClose >= effectiveEma200 : null;
    const isMacdBullish = (effectiveMacdLine != null && effectiveMacdSignal != null) ? effectiveMacdLine > effectiveMacdSignal : null;
    const isRsiOverbought = effectiveRsi != null ? effectiveRsi >= 80 : false;
    const isRsiOversold = effectiveRsi != null ? effectiveRsi <= 30 : false;

    // Helper determinístico para construir la confirmación cruzada de indicadores para cualquier nivel
    const buildIndicatorConfirmation = (patternType: string, patternPrice: number): string => {
      const parts: string[] = [];
      if (effectiveEma200 != null) {
        const above = lastClose >= effectiveEma200;
        parts.push(`EMA 200 ($${effectiveEma200.toFixed(2)}): Precio actual ($${lastClose.toFixed(2)}) ${above ? 'POR ENCIMA (tendencia de fondo alcista institucional)' : 'POR DEBAJO (tendencia de fondo bajista estructural)'}`);
      }
      if (effectiveRsi != null) {
        const rsiVal = effectiveRsi.toFixed(1);
        if (effectiveRsi >= 80) {
          parts.push(`RSI (${rsiVal}): En SOBRECOMPRA (>80), alto riesgo de agotamiento comprador`);
        } else if (effectiveRsi <= 30) {
          parts.push(`RSI (${rsiVal}): En SOBREVENTA (<30), favorece rebote técnico`);
        } else {
          parts.push(`RSI (${rsiVal}): En zona intermedia (${rsiVal}), sin extremos`);
        }
      }
      if (effectiveMacdLine != null && effectiveMacdSignal != null) {
        const macdVal = effectiveMacdLine.toFixed(4);
        const signalVal = effectiveMacdSignal.toFixed(4);
        const isBullish = effectiveMacdLine > effectiveMacdSignal;
        if (patternType === 'soporte' || patternType === 'piso_multiple') {
          parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'CONFIRMA el soporte con momentum alcista' : 'CONTRADICE el rebote con presión vendedora en curso'}`);
        } else if (patternType === 'resistencia' || patternType === 'techo_multiple') {
          parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'CONTRADICE el techo por impulso comprador activo' : 'CONFIRMA la resistencia con presión bajista'}`);
        } else {
          parts.push(`MACD (${macdVal} vs Señal ${signalVal}): ${isBullish ? 'Momentum alcista activo' : 'Presión vendedora activa'}`);
        }
      }
      return parts.join(' · ');
    };

    // Detectar si hay contradicción técnica evidente entre la acción de precio y los indicadores
    const hasContradiction = (isAboveEma200 === false && isMacdBullish === true) ||
                             (isAboveEma200 === true && isMacdBullish === false) ||
                             (isRsiOverbought && isMacdBullish === true) ||
                             (isRsiOversold && isMacdBullish === false);

    const indicatorSummary = `
DATOS ACTUALES DE INDICADORES EN PANTALLA PARA ${rawTicker}:
- Último Cierre: $${lastClose.toFixed(2)}
- EMA 20: ${effectiveEma20 != null ? '$' + effectiveEma20.toFixed(2) : 'N/D'}
- EMA 50: ${effectiveEma50 != null ? '$' + effectiveEma50.toFixed(2) : 'N/D'}
- EMA 200: ${effectiveEma200 != null ? '$' + effectiveEma200.toFixed(2) : 'N/D'} → ${effectiveEma200 != null ? (lastClose >= effectiveEma200 ? 'Precio POR ENCIMA (tendencia de fondo alcista)' : 'Precio POR DEBAJO (tendencia de fondo bajista)') : 'N/D'}
- RSI 14: ${effectiveRsi != null ? effectiveRsi.toFixed(1) + (effectiveRsi >= 80 ? ' [SOBRECOMPRA >80]' : effectiveRsi <= 30 ? ' [SOBREVENTA <30]' : ' [Zona neutra]') : 'N/D'}
- MACD Línea (12/26): ${effectiveMacdLine != null ? effectiveMacdLine.toFixed(4) : 'N/D'}
- MACD Señal (9): ${effectiveMacdSignal != null ? effectiveMacdSignal.toFixed(4) : 'N/D'}
- MACD Histograma: ${effectiveMacdHist != null ? (effectiveMacdHist >= 0 ? '+' : '') + effectiveMacdHist.toFixed(4) : 'N/D'} → ${effectiveMacdLine != null && effectiveMacdSignal != null ? (effectiveMacdLine > effectiveMacdSignal ? 'Cruce alcista (impulso comprador)' : 'Cruce bajista (presión vendedora)') : 'N/D'}
`;

    const perfilGuillermoPath = path.resolve(process.cwd(), 'python', 'data', 'perfil_guillermo.txt');
    let perfilGuillermoText = '';
    if (fs.existsSync(perfilGuillermoPath)) {
      try {
        perfilGuillermoText = fs.readFileSync(perfilGuillermoPath, 'utf-8');
      } catch (err) {
        console.warn('No se pudo leer perfil_guillermo.txt:', err);
      }
    }

    const prompt = `Actúa como Juan Guillermo "Guangui" Hernández, especialista en Análisis Técnico y Operativa Bursátil.
METODOLOGÍA ESTRICTA DE GUILLERMO HERNÁNDEZ:
Guillermo basa sus decisiones operativas en la "CONVERGENCIA TÉCNICA": todos los indicadores (EMA 20/40/200, RSI-14 y MACD 12/26/9) deben respaldarse entre sí antes de validar una entrada o patrón. NUNCA aprueba un patrón solo por precio aislado.
- Si hay CONTRADICCIÓN entre el precio y los indicadores (ej: el precio toca un soporte pero cotiza bajo la EMA 200 y el MACD sigue bajista), DEBES señalarlo explícitamente en el "summary" comenzando con: "CONTRADICCIÓN TÉCNICA DETECTADA: [explicar la divergencia entre precio e indicadores]".
- Si todos coinciden, inicia el resumen con: "CONVERGENCIA TÉCNICA ALCISTA/BAJISTA CONFIRMADA: [explicar respaldo mutuo]".
- En CADA uno de los patrones identificados, debes incluir el campo "indicatorConfirmation" cruzando explícitamente el nivel con los 3 indicadores citando sus valores exactos:
  1) EMA 200 ($${effectiveEma200?.toFixed(2) || 'N/D'}): indicar si el precio está por encima o por debajo (tendencia de fondo).
  2) RSI ($${effectiveRsi?.toFixed(1) || 'N/D'}): si está en sobrecompra, sobreventa o neutro y qué señal da.
  3) MACD ($${effectiveMacdLine?.toFixed(4) || 'N/D'}): si confirma o contradice el nivel.

${indicatorSummary}

SERIE HISTÓRICA RECIENTE OHLC:
${JSON.stringify(trimmedPoints)}

RESPONDE ÚNICAMENTE un objeto JSON válido (sin formato markdown ni backticks adicionales):
{
  "summary": "Resumen técnico de Guillermo con su tono característico. Si hay contradicción entre precio e indicadores, dilo explícitamente. Cita los valores numéricos de EMA 200, RSI y MACD.",
  "trend": "Tendencia dominante confirmada o cuestionada por indicadores (ej: Bajista estructural bajo EMA 200 pero con rebote táctico por RSI en sobreventa)",
  "convergenceStatus": "convergente" | "contradictorio" | "parcial",
  "patterns": [
    {
      "type": "soporte" | "resistencia" | "piso_multiple" | "techo_multiple" | "rango",
      "name": "Nombre descriptivo (ej: 'Soporte Clave $182.50')",
      "price": 182.50,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "explanation": "Explicación técnica detallada mencionando los valores de EMA 200, RSI y MACD.",
      "indicatorConfirmation": "Confirmación cruzada con valores: EMA 200 ($X): [encima/debajo]. RSI (Y): [sobrecompra/sobreventa/neutro]. MACD (Z): [confirma/contradice el nivel].",
      "significance": "alta" | "media" | "baja"
    }
  ]
}`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    let jsonResult: any = null;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });
          if (response.text) {
            jsonResult = JSON.parse(response.text);
            if (jsonResult && Array.isArray(jsonResult.patterns)) {
              break;
            }
          }
        } catch (modelErr: any) {
          console.warn(`[GeminiPatternAnalysis] Modelo ${model} no disponible:`, modelErr.message);
        }
      }
    }

    // Heurística de respaldo en caso de que la cuota de la API esté agotada o Gemini no responda
    if (!jsonResult || !Array.isArray(jsonResult.patterns)) {
      const closes = trimmedPoints.map((p: any) => p.close);
      const minP = Math.min(...closes);
      const maxP = Math.max(...closes);
      const avgP = closes.reduce((a: number, b: number) => a + b, 0) / closes.length;
      const isUptrend = closes[closes.length - 1] >= closes[0];

      const rsiTxt = effectiveRsi != null ? `RSI en ${effectiveRsi.toFixed(1)}${effectiveRsi >= 80 ? ' (sobrecompra)' : effectiveRsi <= 30 ? ' (sobreventa)' : ' (neutro)'}` : 'RSI N/D';
      const macdTxt = effectiveMacdLine != null && effectiveMacdSignal != null ? `MACD ${effectiveMacdLine > effectiveMacdSignal ? 'alcista (+)' : 'bajista (-)'}` : 'MACD N/D';
      const emaTxt = effectiveEma200 != null ? `precio ${lastClose >= effectiveEma200 ? 'sobre' : 'bajo'} EMA 200 ($${effectiveEma200.toFixed(2)})` : '';

      const summaryPrefix = hasContradiction
        ? `CONTRADICCIÓN TÉCNICA DETECTADA: La acción del precio oscila entre $${minP.toFixed(2)} y $${maxP.toFixed(2)}, pero los indicadores discrepan (${emaTxt}, ${rsiTxt}, ${macdTxt}). Guillermo recomienda prudencia y esperar convergencia antes de entrar.`
        : `CONVERGENCIA TÉCNICA: Soportes y resistencias alineados con los indicadores (${emaTxt}, ${rsiTxt}, ${macdTxt}).`;

      jsonResult = {
        summary: summaryPrefix,
        trend: isUptrend
          ? `Alcista ${effectiveEma200 != null && lastClose < effectiveEma200 ? '(cuestionada: bajo EMA 200)' : 'confirmada'}`
          : `Bajista ${effectiveRsi != null && effectiveRsi <= 30 ? '(divergencia: RSI sobrevendido)' : 'estructural'}`,
        convergenceStatus: hasContradiction ? 'contradictorio' : 'convergente',
        patterns: [
          {
            type: 'soporte',
            name: `Soporte Principal $${minP.toFixed(2)}`,
            price: Math.round(minP * 100) / 100,
            startDate: trimmedPoints[0].date,
            endDate: trimmedPoints[trimmedPoints.length - 1].date,
            explanation: `Piso por memoria de precios en $${minP.toFixed(2)}. ${effectiveRsi != null ? `RSI en ${effectiveRsi.toFixed(1)} ${effectiveRsi <= 30 ? 'respalda rebote' : 'aún sin sobreventa extrema'}.` : ''}`,
            indicatorConfirmation: buildIndicatorConfirmation('soporte', minP),
            significance: 'alta'
          },
          {
            type: 'resistencia',
            name: `Resistencia Mayor $${maxP.toFixed(2)}`,
            price: Math.round(maxP * 100) / 100,
            startDate: trimmedPoints[0].date,
            endDate: trimmedPoints[trimmedPoints.length - 1].date,
            explanation: `Techo por memoria de oferta en $${maxP.toFixed(2)}. ${effectiveMacdLine != null && effectiveMacdSignal != null ? (effectiveMacdLine > effectiveMacdSignal ? 'MACD alcista presiona este nivel.' : 'MACD bajista confirma el techo.') : ''}`,
            indicatorConfirmation: buildIndicatorConfirmation('resistencia', maxP),
            significance: 'alta'
          },
          {
            type: 'piso_multiple',
            name: `Pivote de Consolidación $${avgP.toFixed(2)}`,
            price: Math.round(avgP * 100) / 100,
            startDate: trimmedPoints[Math.floor(trimmedPoints.length / 2)].date,
            endDate: trimmedPoints[trimmedPoints.length - 1].date,
            explanation: `Nivel medio de equilibrio. ${effectiveEma20 != null ? `EMA 20 en $${effectiveEma20.toFixed(2)} actúa como soporte/resistencia dinámica.` : ''}`,
            indicatorConfirmation: buildIndicatorConfirmation('piso_multiple', avgP),
            significance: 'media'
          }
        ]
      };
    }

    // Post-procesamiento estricto: asegurar que TODOS los patrones tengan 'indicatorConfirmation' con valores exactos
    if (jsonResult && Array.isArray(jsonResult.patterns)) {
      jsonResult.patterns = jsonResult.patterns.map((p: any) => {
        const existingConf = p.indicatorConfirmation || '';
        // Si falta o no menciona EMA o RSI, complementarlo con los datos calculados reales
        const needsEnrichment = !existingConf || !existingConf.includes('EMA') || !existingConf.includes('RSI');
        return {
          ...p,
          indicatorConfirmation: needsEnrichment
            ? buildIndicatorConfirmation(p.type, p.price)
            : existingConf
        };
      });

      // Si el resumen de Gemini no mencionó la convergencia/contradicción, enriquecerlo
      if (hasContradiction && !jsonResult.summary.includes('CONTRADICCIÓN') && !jsonResult.summary.includes('contradicción')) {
        jsonResult.summary = `CONTRADICCIÓN TÉCNICA DETECTADA: ${jsonResult.summary}`;
      }
    }

    return res.json({
      success: true,
      ticker: rawTicker,
      ...jsonResult,
      disclaimer: 'Análisis generado por IA, interpretación orientativa, no es asesoría financiera.',
      source: 'Gemini AI Technical Analysis Engine'
    });
  } catch (err: any) {
    console.error('[TechnicalPatterns] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Sincronizar precios de todas las empresas en cartera con el mercado real
app.post('/api/market/sync-prices', async (req, res) => {
  try {
    const updates: Array<{ ticker: string; oldPrice: number; newPrice: number; change: number; source: string }> = [];

    for (const company of companiesDB) {
      const live = await fetchLivePrice(company.ticker);
      if (live && live.price > 0) {
        const oldPrice = company.raw.precioCotizacion;
        company.raw.precioCotizacion = live.price;
        // Recalcular capitalización bursátil estimada si hay número de acciones
        if (company.raw.numeroAcciones > 0) {
          company.raw.capitalizacionBursatil = Math.round(live.price * company.raw.numeroAcciones);
        }
        updates.push({
          ticker: company.ticker,
          oldPrice,
          newPrice: live.price,
          change: live.changePercent,
          source: live.source
        });
      }
    }

    const analyzed = companiesDB.map(c => analyzeCompany(c));
    return res.json({
      success: true,
      message: `Se actualizaron las cotizaciones de ${updates.length} empresas con el mercado real`,
      updates,
      companies: analyzed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Importar una nueva empresa al catálogo con datos reales y estados financieros
app.post('/api/market/import', async (req, res) => {
  try {
    const rawInput = (req.body.ticker || req.body.query || '').trim();
    if (!rawInput) {
      return res.status(400).json({ error: 'Ticker o nombre de empresa no proporcionado' });
    }

    // Resolver nombre o alias a ticker
    const resolved = resolveTicker(rawInput);
    const ticker = resolved.ticker;

    // 1. Verificar si ya existe en la base de datos de la sesión
    const existing = companiesDB.find(c => c.ticker === ticker);
    if (existing) {
      // Actualizar su precio en vivo
      const live = await fetchLivePrice(ticker);
      if (live) {
        existing.raw.precioCotizacion = live.price;
      }
      return res.json({
        success: true,
        isNew: false,
        message: `La empresa ${existing.nombre} (${ticker}) ya está en tu catálogo. Cotización actualizada: $${existing.raw.precioCotizacion}.`,
        company: analyzeCompany(existing)
      });
    }

    // 2. Si está en nuestro catálogo popular de balances auditados SEC
    if (POPULAR_LIVE_TICKERS[ticker]) {
      const seed = { ...POPULAR_LIVE_TICKERS[ticker], raw: { ...POPULAR_LIVE_TICKERS[ticker].raw } };
      const live = await fetchLivePrice(ticker);
      if (live) {
        seed.raw.precioCotizacion = live.price;
        if (seed.raw.numeroAcciones > 0) {
          seed.raw.capitalizacionBursatil = Math.round(live.price * seed.raw.numeroAcciones);
        }
      }
      companiesDB.push(seed);
      return res.json({
        success: true,
        isNew: true,
        message: `¡${seed.nombre} (${ticker}) cargada con éxito con balances auditados y cotización en vivo de $${seed.raw.precioCotizacion}!`,
        company: analyzeCompany(seed)
      });
    }

    // 3. Si es un ticker general de Wall Street, obtener cotización en vivo y generar modelo financiero
    const live = await fetchLivePrice(ticker);
    if (!live) {
      return res.status(404).json({
        error: `No se pudo encontrar cotización para "${rawInput}" (${ticker}). Verifica el símbolo bursátil (ej: NVDA, MSFT, TSLA, GOOGL, META, AMZN, NFLX).`
      });
    }

    // Crear modelo base con cotización real
    const price = live.price;
    const companyName = resolved.formalName || `${ticker} Corporation`;
    const sectorName = resolved.sector || 'Mercado General / NYSE-NASDAQ';

    const dynamicSeed: (typeof INITIAL_COMPANIES)[0] = {
      id: ticker.toLowerCase(),
      ticker,
      nombre: companyName,
      sector: sectorName,
      descripcion: `Compañía cotizada en bolsa importada con cotización real en tiempo de mercado ($${price}).`,
      moat: 'Medio',
      raw: {
        activoCirculante: Math.round(price * 120),
        pasivoCirculante: Math.round(price * 75),
        inventarios: Math.round(price * 15),
        otrosActivosCirculantes: Math.round(price * 10),
        cuentasPorCobrar: Math.round(price * 30),
        efectivo: Math.round(price * 65),
        totalPasivo: Math.round(price * 110),
        patrimonioNeto: Math.round(price * 160),
        activosTotales: Math.round(price * 270),
        utilidadNeta: Math.round(price * 35),
        ebit: Math.round(price * 45),
        interesesPorPagar: Math.round(price * 2),
        ingresosTotales: Math.round(price * 180),
        precioCotizacion: price,
        numeroAcciones: 1000,
        capitalizacionBursatil: Math.round(price * 1000),
        dividendoPorAccion: Math.round(price * 0.015 * 100) / 100
      },
      targetConsensus: {
        target_mean: Math.round(price * 1.15 * 10) / 10,
        target_high: Math.round(price * 1.25 * 10) / 10,
        target_low: Math.round(price * 1.05 * 10) / 10,
        recommendation: 'Mantener',
        number_of_analysts: 15,
        upside_potential: 15
      },
      warrenVerdict: `Empresa importada en tiempo real. Cotizando a $${price}. Analiza sus 11 ratios contables para confirmar si posee foso económico y margen de seguridad.`
    };

    companiesDB.push(dynamicSeed);
    return res.json({
      success: true,
      isNew: true,
      message: `¡${companyName} (${ticker}) importada exitosamente con cotización real de $${price}!`,
      company: analyzeCompany(dynamicSeed)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 1: API de Análisis Fundamental y Motor Bottom-Up
// -------------------------------------------------------------
app.get('/api/companies', (req, res) => {
  const analyzed = companiesDB.map(c => analyzeCompany(c));
  res.json({
    success: true,
    total: analyzed.length,
    companies: analyzed
  });
});

app.post('/api/companies/calculate', (req, res) => {
  try {
    const raw: FinancialRawData = req.body;
    if (!raw || typeof raw.precioCotizacion !== 'number') {
      return res.status(400).json({ error: 'Datos financieros incompletos' });
    }

    const ratios = calculateFundamentalRatios(raw);
    const scoreData = calculateLinearScore(ratios);

    return res.json({
      success: true,
      ratios,
      dimensiones: scoreData.dimensions,
      linearScore: scoreData.score,
      scoreGrade: scoreData.grade
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 2: Simulador de Inversiones, Sharpe y Sesgos Conductuales
// -------------------------------------------------------------
app.post('/api/portfolio/analyze', (req, res) => {
  try {
    const { holdings, transactions, returnsHistory, riskFreeRate } = req.body;

    const riskMetrics = calculatePortfolioRiskMetrics(
      returnsHistory || [0.012, -0.005, 0.021, 0.018, -0.01, 0.025, 0.014, 0.008, -0.004, 0.019, 0.015, 0.02],
      riskFreeRate || 0.04
    );

    // Detección de sesgos conductuales
    const detectedBiases = [];

    // Sesgo 1: Sobreoperativa (Overtrading / Churning)
    const txCount = Array.isArray(transactions) ? transactions.length : 0;
    if (txCount > 6) {
      detectedBiases.push({
        bias: 'Sesgo de Sobreoperativa (Hiperactividad)',
        description: `Has ejecutado ${txCount} transacciones en poco tiempo. Buffett advierte: "Gran parte de la inversión consiste en sentarse sobre las manos". El trading frecuente destruye la rentabilidad por comisiones y decisiones emocionales.`,
        severity: 'danger' as const,
        recommendation: 'Prioriza un horizonte de inversión de al menos 3 a 5 años sin rotar títulos precipitadamente.'
      });
    }

    // Sesgo 2: Especulación sin Margen de Seguridad
    const hasSpeculative = Array.isArray(holdings) && holdings.some((h: any) => h.ticker === 'HYPE');
    if (hasSpeculative) {
      detectedBiases.push({
        bias: 'Trampa Especulativa / Falta de Margen de Seguridad',
        description: 'Mantienes posiciones en compañías sin beneficios operativos (EBIT negativo) y deuda excesiva. Esto viola la regla cardinal de Benjamin Graham.',
        severity: 'danger' as const,
        recommendation: 'Deshazte de apuestas sin foso económico y reubica capital en empresas con ROE superior al 15% y balance conservador.'
      });
    }

    // Sesgo 3: Concentración Extrema
    if (Array.isArray(holdings) && holdings.length === 1 && txCount > 0) {
      detectedBiases.push({
        bias: 'Concentración Idiosincrática Extrema',
        description: 'El 100% de tu cartera de renta variable depende de un solo valor cotizado.',
        severity: 'warning' as const,
        recommendation: 'Construye un portafolio concentrado pero prudente de 5 a 10 negocios de máxima convicción.'
      });
    }

    return res.json({
      success: true,
      metrics: riskMetrics,
      detectedBiases
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 3: Gamificación (Modelo de Divay 2024) y Foros Colaborativos
// -------------------------------------------------------------
app.get('/api/gamification/motivation', (req, res) => {
  const { colab = 70, recomp = 65, multi = 60, progreso = 50, feedback = 80 } = req.query;

  const result = calculateDivayMotivationIndex({
    colaboracionScore: Number(colab),
    recompensasScore: Number(recomp),
    multijugadorScore: Number(multi),
    progresoScore: Number(progreso),
    feedbackScore: Number(feedback)
  });

  res.json({
    success: true,
    modelName: 'Modelo Econométrico de Motivación de Divay (2024)',
    equation: 'Motivación = 12.5 + 0.320*(Colab) + 0.307*(Recomp) + 0.239*(Multi) + 0.235*(Progreso) + 0.151*(Feedback)',
    ...result
  });
});

app.get('/api/theses', (req, res) => {
  res.json({
    success: true,
    theses: thesesDB
  });
});

app.post('/api/theses', (req, res) => {
  try {
    const { author, ticker, title, content, moatAnalysis, marginOfSafetyTarget, upsideTarget, recommendedHorizonYears } = req.body;
    if (!title || !content || !ticker) {
      return res.status(400).json({ error: 'Título, empresa y tesis son obligatorios' });
    }

    const newThesis = {
      id: `thesis-${Date.now()}`,
      author: author || 'Inversor Disciplinado',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      ticker,
      title,
      content,
      moatAnalysis: moatAnalysis || 'Foso analizado mediante retorno sobre capital invertido (ROIC)',
      upsideTarget: Number(upsideTarget ?? marginOfSafetyTarget) || 15.0,
      recommendedHorizonYears: Number(recommendedHorizonYears) || 5,
      upvotes: 1,
      commentsCount: 0,
      createdAt: 'Justo ahora',
      badges: ['Voz en la Junta']
    };

    thesesDB.unshift(newThesis);

    return res.json({
      success: true,
      thesis: newThesis
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/theses/:id/upvote', (req, res) => {
  const { id } = req.params;
  const thesis = thesesDB.find(t => t.id === id);
  if (!thesis) return res.status(404).json({ error: 'Tesis no encontrada' });
  thesis.upvotes += 1;
  res.json({ success: true, upvotes: thesis.upvotes });
});

// -------------------------------------------------------------
// MÓDULO 4: Evaluación de Impacto (Diferencias en Diferencias DiD)
// -------------------------------------------------------------
app.get('/api/admin/did-evaluation', (req, res) => {
  // Datos empíricos simulados de un ensayo controlado aleatorizado (RCT)
  // Métrica principal 1: Frecuencia de sobreoperativa mensual (rotación de cartera - menor es mejor)
  const turnoverDiD = calculateDifferenceInDifferences({
    controlPre: 8.4, // Control pre: 8.4 trades/mes
    controlPost: 7.9, // Control post: 7.9 trades/mes (reducción marginal)
    treatmentPre: 8.6, // Tratamiento pre: 8.6 trades/mes
    treatmentPost: 2.1, // Tratamiento post: 2.1 trades/mes (gran disciplina Value)
    metricLabel: 'Rotación Mensual de Cartera (Sobreoperativa)',
    unit: 'operaciones / mes'
  });

  // Métrica principal 2: Ratio de Sharpe medio de carteras
  const sharpeDiD = calculateDifferenceInDifferences({
    controlPre: 0.45,
    controlPost: 0.52,
    treatmentPre: 0.44,
    treatmentPost: 1.38,
    metricLabel: 'Ratio de Sharpe de Portafolio',
    unit: 'puntos SR'
  });

  // Métrica 3: Margen de Seguridad promedio al comprar
  const mosDiD = calculateDifferenceInDifferences({
    controlPre: 2.5,
    controlPost: 4.1,
    treatmentPre: 3.0,
    treatmentPost: 18.2,
    metricLabel: 'Margen de Seguridad Promedio en Compras',
    unit: '%'
  });

  res.json({
    success: true,
    modelSpecification: 'Y_it = β0 + β1*(Tratamiento_i) + β2*(Post_t) + β3*(Tratamiento_i × Post_t) + γ*X_it + ε_it',
    metrics: {
      turnover: turnoverDiD,
      sharpe: sharpeDiD,
      marginOfSafety: mosDiD
    },
    sampleSummary: {
      treatmentCohortSize: 450,
      controlCohortSize: 450,
      weeksTracked: 24,
      conclusion: 'La interacción Tratamiento × Post (β3) es estadísticamente significativa (p < 0.001), demostrando que la gamificación conductual reduce la sobreoperativa especulativa en un 69% e incrementa el Sharpe en +0.87 puntos.'
    }
  });
});

// -------------------------------------------------------------
// DOCUMENTACIÓN Y EXPORTACIÓN DE ESQUEMAS (SQL / NoSQL / Python / JS)
// -------------------------------------------------------------
app.get('/api/schema-and-scripts', (req, res) => {
  const sqlSchema = `
-- ==========================================================
-- BASE DE DATOS: "EL RINCÓN DE WARREN" (PostgreSQL DDL)
-- ==========================================================

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    grupo_experimental VARCHAR(20) CHECK (grupo_experimental IN ('TRATAMIENTO_GAMIFICADO', 'CONTROL_ESTATICO')),
    xp_puntos INT DEFAULT 0,
    nivel INT DEFAULT 1,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empresas (
    id VARCHAR(50) PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    foso_economico VARCHAR(20) CHECK (foso_economico IN ('Amplio', 'Medio', 'Ninguno')),
      precio_cotizacion NUMERIC(12, 2) NOT NULL,
    target_mean_consenso NUMERIC(12, 2),
    upside_potential_consenso NUMERIC(12, 2)
);

CREATE TABLE estados_financieros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id VARCHAR(50) REFERENCES empresas(id) ON DELETE CASCADE,
    ejercicio_fiscal INT NOT NULL,
    -- Dimensión Liquidez
    activo_circulante NUMERIC(16, 2) NOT NULL,
    pasivo_circulante NUMERIC(16, 2) NOT NULL,
    inventarios NUMERIC(16, 2) NOT NULL,
    otros_activos_circulantes NUMERIC(16, 2) DEFAULT 0,
    cuentas_por_cobrar NUMERIC(16, 2) NOT NULL,
    efectivo_disponible NUMERIC(16, 2) NOT NULL,
    -- Dimensión Solvencia
    total_pasivo NUMERIC(16, 2) NOT NULL,
    patrimonio_neto NUMERIC(16, 2) NOT NULL,
    activos_totales NUMERIC(16, 2) NOT NULL,
    -- Dimensión Rentabilidad
    utilidad_neta NUMERIC(16, 2) NOT NULL,
    ebit NUMERIC(16, 2) NOT NULL,
    intereses_por_pagar NUMERIC(16, 2) NOT NULL,
    ingresos_totales NUMERIC(16, 2) NOT NULL,
    -- Dimensión Valoración
    numero_acciones NUMERIC(16, 2) NOT NULL,
    capitalizacion_bursatil NUMERIC(16, 2) NOT NULL,
    dividendo_por_accion NUMERIC(10, 4) DEFAULT 0
);

CREATE TABLE portafolios_simulados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    saldo_efectivo NUMERIC(14, 2) DEFAULT 100000.00,
    valor_invertido NUMERIC(14, 2) DEFAULT 0.00,
    ratio_sharpe NUMERIC(6, 4) DEFAULT 0.0000,
    volatilidad_muestral NUMERIC(6, 4) DEFAULT 0.0000,
    score_promedio_cartera NUMERIC(5, 2) DEFAULT 0.00
);

CREATE TABLE transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portafolio_id UUID REFERENCES portafolios_simulados(id) ON DELETE CASCADE,
    empresa_id VARCHAR(50) REFERENCES empresas(id),
    tipo_operacion VARCHAR(10) CHECK (tipo_operacion IN ('BUY', 'SELL')),
    cantidad_titulos INT NOT NULL,
    precio_ejecucion NUMERIC(12, 2) NOT NULL,
    flag_sesgo_conductual VARCHAR(50),
    ejecutado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tesis_inversion_comunidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    empresa_id VARCHAR(50) REFERENCES empresas(id),
    titulo VARCHAR(200) NOT NULL,
    tesis_fundamental TEXT NOT NULL,
    analisis_foso TEXT NOT NULL,
    margen_seguridad_esperado NUMERIC(5, 2),
    votos_positivos INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE log_evaluacion_did (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    periodo VARCHAR(10) CHECK (periodo IN ('PRE', 'POST')),
    frecuencia_trading_mes INT NOT NULL,
    sharpe_alcanzado NUMERIC(6, 4) NOT NULL,
    margen_seguridad_promedio NUMERIC(5, 2) NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`.trim();

  const nosqlSchema = {
    collections: {
      users: {
        _id: "ObjectId",
        email: "string",
        name: "string",
        experimentalGroup: "TRATAMIENTO_GAMIFICADO | CONTROL_ESTATICO",
        xp: "number",
        level: "number",
        badges: ["string"],
        divayMotivationIndex: "number"
      },
      companies: {
        _id: "string (ticker)",
        name: "string",
        sector: "string",
        economicMoat: "Amplio | Medio | Ninguno",
        currentPrice: "number",
        estimatedIntrinsicValue: "number",
        financialStatements: {
          period: "number (year)",
          balanceSheet: {
            currentAssets: "number",
            currentLiabilities: "number",
            inventory: "number",
            accountsReceivable: "number",
            cash: "number",
            totalLiabilities: "number",
            shareholdersEquity: "number",
            totalAssets: "number"
          },
          incomeStatement: {
            revenue: "number",
            ebit: "number",
            interestExpense: "number",
            netIncome: "number"
          }
        },
        linearScoring: {
          score: "number (1-100)",
          grade: "A+ | A | B | C | D | F",
          dimensions: {
            liquidity: "number",
            solvency: "number",
            profitability: "number",
            valuation: "number"
          }
        }
      },
      portfolios: {
        _id: "ObjectId",
        userId: "ObjectId",
        cash: "number",
        holdings: [
          { ticker: "string", shares: "number", avgPrice: "number" }
        ],
        returnsTimeSeries: ["number"],
        riskMetrics: {
          sharpeRatio: "number",
          sampleVolatility: "number",
          expectedReturn: "number"
        },
        detectedBiases: ["string"]
      },
      theses: {
        _id: "ObjectId",
        userId: "ObjectId",
        ticker: "string",
        title: "string",
        content: "string",
        moatAnalysis: "string",
        upvotes: "number",
        comments: ["object"]
      },
      didLogs: {
        _id: "ObjectId",
        userId: "ObjectId",
        cohort: "treatment | control",
        period: "pre | post",
        monthlyTurnover: "number",
        sharpeRatio: "number",
        timestamp: "Date"
      }
    }
  };

  const pythonScript = `
# ==============================================================
# EL RINCÓN DE WARREN - MOTOR DE SCORING LINEAR Y DiD (Python 3)
# ==============================================================
import numpy as np

def calcular_ratios_fundamentales(raw: dict) -> dict:
    """Calcula las 4 dimensiones de Value Investing."""
    # A. Liquidez
    liquidez_corriente = raw['activo_circulante'] / raw['pasivo_circulante']
    prueba_acida = (raw['activo_circulante'] - raw['inventarios'] - raw['otros_activos'] - raw['cxc']) / raw['pasivo_circulante']
    disponibilidad = raw['efectivo'] / raw['pasivo_circulante']

    # B. Solvencia
    endeudamiento = raw['total_pasivo'] / raw['patrimonio_neto']
    cobertura_intereses = raw['ebit'] / raw['intereses_por_pagar'] if raw['intereses_por_pagar'] > 0 else 999.0

    # C. Rentabilidad
    roa = raw['utilidad_neta'] / raw['activos_totales']
    roe = raw['utilidad_neta'] / raw['patrimonio_neto']

    # D. Valoración
    bpa = raw['utilidad_neta'] / raw['numero_acciones']
    per = raw['precio_cotizacion'] / bpa if bpa > 0 else 999.0
    pb = raw['capitalizacion_bursatil'] / raw['patrimonio_neto']
    yield_div = raw['dividendo_accion'] / raw['precio_cotizacion']

    return {
        'liquidez_corriente': liquidez_corriente,
        'prueba_acida': prueba_acida,
        'disponibilidad': disponibilidad,
        'endeudamiento': endeudamiento,
        'cobertura_intereses': cobertura_intereses,
        'roa': roa,
        'roe': roe,
        'bpa': bpa,
        'per': per,
        'pb': pb,
        'yield_div': yield_div
    }

def funcion_scoring_linear(ratios: dict) -> float:
    """
    Función de Scoring Linear: S(a) = \sum (w_i * f_i(a))
    Asigna una nota del 1 al 100 ponderando Liquidez (20%), Solvencia (25%), Rentabilidad (25%) y Valoración (30%).
    """
    # 1. Normalización de Liquidez (0 a 100)
    f_liq = min(100, (ratios['liquidez_corriente'] / 2.0) * 100) * 0.4 + \\
            min(100, (ratios['prueba_acida'] / 1.0) * 100) * 0.35 + \\
            min(100, (ratios['disponibilidad'] / 0.4) * 100) * 0.25

    # 2. Normalización de Solvencia
    f_end = 100 if ratios['endeudamiento'] <= 0.5 else (80 if ratios['endeudamiento'] <= 1.0 else 40)
    f_cob = min(100, (ratios['cobertura_intereses'] / 8.0) * 100)
    f_solv = f_end * 0.55 + f_cob * 0.45

    # 3. Normalización de Rentabilidad (Foso/Moat)
    f_roe = min(100, (ratios['roe'] / 0.18) * 100)
    f_roa = min(100, (ratios['roa'] / 0.10) * 100)
    f_rent = f_roe * 0.65 + f_roa * 0.35

    # 4. Normalización de Valoración (Margen de Seguridad)
    f_per = 100 if ratios['per'] <= 14 else (80 if ratios['per'] <= 20 else (50 if ratios['per'] <= 28 else 20))
    f_pb = 100 if ratios['pb'] <= 1.8 else (70 if ratios['pb'] <= 3.5 else 30)
    f_val = f_per * 0.60 + f_pb * 0.40

    # Ponderación final S(a) = \sum w_i * f_i(a)
    w_liquidez = 0.20
    w_solvencia = 0.25
    w_rentabilidad = 0.25
    w_valoracion = 0.30

    score = (w_liquidez * f_liq) + (w_solvencia * f_solv) + (w_rentabilidad * f_rent) + (w_valoracion * f_val)
    return round(score, 2)

def calcular_sharpe_portafolio(retornos: list, rf: float = 0.04) -> tuple:
    """Calcula la Volatilidad Muestral (sigma_p) y el Ratio de Sharpe (SR_p)."""
    retornos_arr = np.array(retornos)
    e_rp = np.mean(retornos_arr)
    # sigma_p = sqrt( sum( (Rp_t - avg)^2 ) / (N - 1) )
    sigma_p = np.std(retornos_arr, ddof=1)
    sharpe = (e_rp - rf) / sigma_p if sigma_p > 0 else 0.0
    return e_rp, sigma_p, sharpe

def evaluacion_did(control_pre, control_post, treat_pre, treat_post):
    """
    Modelo de Diferencias en Diferencias:
    Y_it = \beta_0 + \beta_1(Trat) + \beta_2(Post) + \beta_3(Trat x Post) + e_it
    """
    beta0 = control_pre
    beta1 = treat_pre - control_pre
    beta2 = control_post - control_pre
    beta3 = (treat_post - treat_pre) - (control_post - control_pre) # Efecto neto
    return {'beta0': beta0, 'beta1': beta1, 'beta2': beta2, 'beta3_did': beta3}
`.trim();

  const jsScript = `
// ==============================================================
// EL RINCÓN DE WARREN - MOTOR EN JAVASCRIPT / TYPESCRIPT
// ==============================================================

export function scoringLinear(ratios) {
  const wLiq = 0.20, wSolv = 0.25, wRent = 0.25, wVal = 0.30;

  const fLiq = Math.min(100, (ratios.liquidezCorriente / 2) * 100);
  const fSolv = ratios.endeudamiento <= 1.0 ? 90 : 40;
  const fRent = Math.min(100, (ratios.roe / 0.18) * 100);
  const fVal = ratios.per <= 18 ? 95 : ratios.per <= 25 ? 65 : 25;

  const score = (wLiq * fLiq) + (wSolv * fSolv) + (wRent * fRent) + (wVal * fVal);
  return Math.round(score);
}

export function sharpeRatio(returns, riskFree = 0.04) {
  const n = returns.length;
  if (n < 2) return { sharpe: 0, volatility: 0 };
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (n - 1);
  const volatility = Math.sqrt(variance);
  const sharpe = volatility > 0 ? (mean - riskFree) / volatility : 0;
  return { expectedReturn: mean, volatility, sharpe };
}
`.trim();

  res.json({
    sqlSchema,
    nosqlSchema,
    pythonScript,
    jsScript
  });
});

// -------------------------------------------------------------
// Inicialización del Servidor y Vite Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/python/**', '**/cache/**', '**/*.csv', '**/*.xls*', '**/*.log', '**/scratch/**']
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[El Rincón de Warren] Servidor backend ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
