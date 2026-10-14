import { Router, Request, Response } from 'express';
import { getCompaniesDB } from './market.js';
import { analyzeCompany } from '../services/companyAnalyzer.js';
import { INITIAL_COMPANIES } from '../data/initialData.js';
import {
  calculateFundamentalRatios,
  calculateLinearScore
} from '../utils/financialCalculations.js';
import { FinancialRawData } from '../types.js';

const router = Router();

router.get('/companies', (req: Request, res: Response) => {
  const analyzed = getCompaniesDB().map(c => analyzeCompany(c));
  res.json({
    success: true,
    total: analyzed.length,
    companies: analyzed
  });
});

router.post('/companies/calculate', (req: Request, res: Response) => {
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

router.get('/market/targets/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const { runPythonEngine } = await import('../services/pythonEngine.js');
    const data = await runPythonEngine(['targets', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/market/recommendations/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const { runPythonEngine } = await import('../services/pythonEngine.js');
    const data = await runPythonEngine(['recommendations', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/market/news/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  try {
    const { runPythonEngine } = await import('../services/pythonEngine.js');
    const data = await runPythonEngine(['news', rawTicker]);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/market/capm/:ticker', async (req: Request, res: Response) => {
  const rawTicker = req.params.ticker.toUpperCase().trim();
  const mrp = req.query.mrp ? String(req.query.mrp) : undefined;
  try {
    const { runPythonEngine } = await import('../services/pythonEngine.js');
    const args = ['capm', rawTicker, ...(mrp ? [mrp] : [])];
    const data = await runPythonEngine(args);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;