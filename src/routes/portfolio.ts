import { Router, Request, Response } from 'express';
import { getCompaniesDB } from './market.js';
import {
  calculatePortfolioRiskMetrics,
  calculateDivayMotivationIndex,
  calculateDifferenceInDifferences
} from '../utils/financialCalculations.js';
import { INITIAL_LEAGUE, INITIAL_BADGES } from '../data/initialData.js';

let thesesDB: any[] = [];
export function setThesesDB(theses: any[]) { thesesDB = theses; }
export function getThesesDB() { return thesesDB; }

const router = Router();

router.post('/portfolio/analyze', (req: Request, res: Response) => {
  try {
    const { holdings, transactions, returnsHistory, riskFreeRate } = req.body;

    const riskMetrics = calculatePortfolioRiskMetrics(
      returnsHistory || [0.012, -0.005, 0.021, 0.018, -0.01, 0.025, 0.014, 0.008, -0.004, 0.019, 0.015, 0.02],
      riskFreeRate || 0.04
    );

    const detectedBiases: Array<{
      bias: string;
      description: string;
      severity: 'warning' | 'danger' | 'info';
      recommendation: string;
    }> = [];

    const txCount = Array.isArray(transactions) ? transactions.length : 0;
    if (txCount > 6) {
      detectedBiases.push({
        bias: 'Sesgo de Sobreoperativa (Hiperactividad)',
        description: `Has ejecutado ${txCount} transacciones en poco tiempo. Buffett advierte: "Gran parte de la inversión consiste en sentarse sobre las manos". El trading frecuente destruye la rentabilidad por comisiones y decisiones emocionales.`,
        severity: 'danger',
        recommendation: 'Prioriza un horizonte de inversión de al menos 3 a 5 años sin rotar títulos precipitadamente.'
      });
    }

    const hasSpeculative = Array.isArray(holdings) && holdings.some((h: any) => h.ticker === 'HYPE');
    if (hasSpeculative) {
      detectedBiases.push({
        bias: 'Trampa Especulativa / Falta de Margen de Seguridad',
        description: 'Mantienes posiciones en compañías sin beneficios operativos (EBIT negativo) y deuda excesiva. Esto viola la regla cardinal de Benjamin Graham.',
        severity: 'danger',
        recommendation: 'Deshazte de apuestas sin foso económico y reubica capital en empresas con ROE superior al 15% y balance conservador.'
      });
    }

    if (Array.isArray(holdings) && holdings.length === 1 && txCount > 0) {
      detectedBiases.push({
        bias: 'Concentración Idiosincrática Extrema',
        description: 'El 100% de tu cartera de renta variable depende de un solo valor cotizado.',
        severity: 'warning',
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

router.get('/gamification/motivation', (req: Request, res: Response) => {
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

router.get('/theses', (req: Request, res: Response) => {
  res.json({
    success: true,
    theses: thesesDB
  });
});

router.post('/theses', (req: Request, res: Response) => {
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

router.post('/theses/:id/upvote', (req: Request, res: Response) => {
  const { id } = req.params;
  const thesis = thesesDB.find(t => t.id === id);
  if (!thesis) return res.status(404).json({ error: 'Tesis no encontrada' });
  thesis.upvotes += 1;
  res.json({ success: true, upvotes: thesis.upvotes });
});

router.get('/admin/did-evaluation', (req: Request, res: Response) => {
  const turnoverDiD = calculateDifferenceInDifferences({
    controlPre: 8.4,
    controlPost: 7.9,
    treatmentPre: 8.6,
    treatmentPost: 2.1,
    metricLabel: 'Rotación Mensual de Cartera (Sobreoperativa)',
    unit: 'operaciones / mes'
  });

  const sharpeDiD = calculateDifferenceInDifferences({
    controlPre: 0.45,
    controlPost: 0.52,
    treatmentPre: 0.44,
    treatmentPost: 1.38,
    metricLabel: 'Ratio de Sharpe de Portafolio',
    unit: 'puntos SR'
  });

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

export default router;