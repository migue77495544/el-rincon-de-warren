// src/utils/markowitz.ts
// TEORÍA MODERNA DE PORTAFOLIOS DE HARRY MARKOWITZ (1952)
// Modelo de Media-Varianza, Frontera Eficiente, Matriz de Covarianza y Cartera Tangente (Máximo Sharpe)

import { CompanyAnalysis } from '../types';

export interface MarkowitzAsset {
  ticker: string;
  name: string;
  expectedReturn: number; // E(R_i) anualizado (ej. 0.12 para 12%)
  volatility: number;     // \sigma_i anualizada (ej. 0.15 para 15%)
  price: number;
  linearScore: number;
  sector: string;
  moat: string;
}

export interface PortfolioPoint {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  diversificationRatio: number;
}

export interface EfficientFrontierResult {
  assets: MarkowitzAsset[];
  correlationMatrix: number[][];
  covarianceMatrix: number[][];
  simulatedPortfolios: PortfolioPoint[];
  frontierCurve: { volatility: number; expectedReturn: number; sharpeRatio: number }[];
  maxSharpePortfolio: PortfolioPoint;
  minVariancePortfolio: PortfolioPoint;
  equalWeightPortfolio: PortfolioPoint;
  riskFreeRate: number;
}

/**
 * Parámetros predeterminados de rentabilidad esperada y volatilidad
 * calibrados con los fundamentales y betas de las empresas del ecosistema
 */
export const ASSET_FINANCIAL_PROFILES: Record<string, { expectedReturn: number; volatility: number }> = {
  'BRK.B': { expectedReturn: 0.135, volatility: 0.142 }, // Fuerte ROE, tesorería masiva, baja volatilidad
  'KO':    { expectedReturn: 0.098, volatility: 0.128 }, // Consumo básico defensivo, beta baja, dividendo
  'AAPL':  { expectedReturn: 0.162, volatility: 0.224 }, // Gran crecimiento, foso amplio, mayor volatilidad
  'JNJ':   { expectedReturn: 0.088, volatility: 0.115 }, // Salud defensiva, mínima volatilidad
  'COST':  { expectedReturn: 0.141, volatility: 0.165 }, // Retail defensivo recurrente
  'HYPE':  { expectedReturn: -0.045, volatility: 0.440 }, // Especulativa, pérdidas operativas, volatilidad extrema
};

/**
 * Matriz de correlaciones base empírica entre las empresas del universo
 */
const DEFAULT_CORRELATIONS: Record<string, Record<string, number>> = {
  'BRK.B': { 'BRK.B': 1.00, 'KO': 0.38, 'AAPL': 0.45, 'JNJ': 0.28, 'COST': 0.42, 'HYPE': 0.08 },
  'KO':    { 'BRK.B': 0.38, 'KO': 1.00, 'AAPL': 0.22, 'JNJ': 0.44, 'COST': 0.35, 'HYPE': 0.02 },
  'AAPL':  { 'BRK.B': 0.45, 'KO': 0.22, 'AAPL': 1.00, 'JNJ': 0.18, 'COST': 0.48, 'HYPE': 0.25 },
  'JNJ':   { 'BRK.B': 0.28, 'KO': 0.44, 'AAPL': 0.18, 'JNJ': 1.00, 'COST': 0.26, 'HYPE': -0.05 },
  'COST':  { 'BRK.B': 0.42, 'KO': 0.35, 'AAPL': 0.48, 'JNJ': 0.26, 'COST': 1.00, 'HYPE': 0.12 },
  'HYPE':  { 'BRK.B': 0.08, 'KO': 0.02, 'AAPL': 0.25, 'JNJ': -0.05, 'COST': 0.12, 'HYPE': 1.00 },
};

/**
 * Extrae o estima los parámetros de Markowitz para un conjunto de empresas
 */
export function extractMarkowitzAssets(companies: CompanyAnalysis[]): MarkowitzAsset[] {
  return companies.map(c => {
    const profile = ASSET_FINANCIAL_PROFILES[c.ticker];
    if (profile) {
      return {
        ticker: c.ticker,
        name: c.nombre,
        expectedReturn: profile.expectedReturn,
        volatility: profile.volatility,
        price: c.raw.precioCotizacion,
        linearScore: c.linearScore,
        sector: c.sector,
        moat: c.moat
      };
    }

    // Si es una empresa personalizada o desconocida, deducir con rigor fundamental
    const roeVal = c.ratios.roe?.value ?? 0.12;
    const yieldVal = c.ratios.yieldDividendo?.value ?? 0.02;
    const debtVal = c.ratios.endeudamiento?.value ?? 1.0;
    const isLossMaking = (c.raw.utilidadNeta || 0) <= 0 || (c.raw.ebit || 0) <= 0;

    let expectedReturn = isLossMaking
      ? -0.03
      : Math.min(0.25, Math.max(0.04, (roeVal * 0.6) + (yieldVal * 0.4) + 0.03));

    let volatility = Math.min(0.48, Math.max(0.12, 0.14 + (debtVal * 0.05) + (isLossMaking ? 0.20 : 0)));

    return {
      ticker: c.ticker,
      name: c.nombre,
      expectedReturn,
      volatility,
      price: c.raw.precioCotizacion,
      linearScore: c.linearScore,
      sector: c.sector,
      moat: c.moat
    };
  });
}

/**
 * Genera la matriz de correlación simétrica \rho_{ij} para una lista de activos
 */
export function buildCorrelationMatrix(assets: MarkowitzAsset[]): number[][] {
  const n = assets.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        const tickI = assets[i].ticker;
        const tickJ = assets[j].ticker;
        if (DEFAULT_CORRELATIONS[tickI] && DEFAULT_CORRELATIONS[tickI][tickJ] !== undefined) {
          matrix[i][j] = DEFAULT_CORRELATIONS[tickI][tickJ];
        } else if (DEFAULT_CORRELATIONS[tickJ] && DEFAULT_CORRELATIONS[tickJ][tickI] !== undefined) {
          matrix[i][j] = DEFAULT_CORRELATIONS[tickJ][tickI];
        } else {
          // Si son de sectores afines, correlación moderada, si no, baja
          matrix[i][j] = assets[i].sector === assets[j].sector ? 0.45 : 0.25;
        }
      }
    }
  }

  return matrix;
}

/**
 * Calcula la matriz de covarianza \Sigma_{ij} = \rho_{ij} \times \sigma_i \times \sigma_j
 */
export function buildCovarianceMatrix(assets: MarkowitzAsset[], corrMatrix: number[][]): number[][] {
  const n = assets.length;
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] = corrMatrix[i][j] * assets[i].volatility * assets[j].volatility;
    }
  }

  return cov;
}

/**
 * Calcula las métricas de un portafolio con pesos w_i:
 * E(R_p) = w^T R
 * \sigma_p^2 = w^T \Sigma w
 * Sharpe = (E(R_p) - R_f) / \sigma_p
 */
export function evaluatePortfolio(
  weights: number[],
  assets: MarkowitzAsset[],
  covMatrix: number[][],
  riskFreeRate: number = 0.04
): PortfolioPoint {
  const n = assets.length;

  // 1. Retorno esperado E(R_p)
  let expectedReturn = 0;
  for (let i = 0; i < n; i++) {
    expectedReturn += weights[i] * assets[i].expectedReturn;
  }

  // 2. Varianza de cartera \sigma_p^2 = \sum_i \sum_j w_i w_j \sigma_{ij}
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }

  // Evitar valores negativos por precisión flotante
  const volatility = Math.sqrt(Math.max(0.000001, variance));

  // 3. Sharpe Ratio
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  // 4. Beneficio de diversificación (Weighted Vol vs Real Vol)
  let weightedVol = 0;
  for (let i = 0; i < n; i++) {
    weightedVol += weights[i] * assets[i].volatility;
  }
  const diversificationRatio = weightedVol > 0 ? ((weightedVol - volatility) / weightedVol) * 100 : 0;

  return {
    weights: [...weights],
    expectedReturn,
    volatility,
    sharpeRatio,
    diversificationRatio
  };
}

/**
 * Genera carteras aleatorias distribuidas en el simplex (Dirichlet uniforme)
 */
function sampleRandomWeights(n: number): number[] {
  // Generar exponenciales aleatorias para una distribución Dirichlet uniforme
  const values = Array.from({ length: n }, () => -Math.log(Math.max(0.0001, Math.random())));
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map(v => v / sum);
}

/**
 * Motor de optimización y simulación de la Frontera Eficiente de Markowitz
 * Optimizado para alto rendimiento y mínimo consumo de memoria RAM
 */
export function computeMarkowitzModel(
  companies: CompanyAnalysis[],
  riskFreeRate: number = 0.04,
  sampleSize: number = 140
): EfficientFrontierResult {
  const assets = extractMarkowitzAssets(companies);
  const n = assets.length;

  // Si no hay suficientes activos (mínimo 2 requeridos para covarianza)
  if (n < 2) {
    const fallbackAsset: MarkowitzAsset = assets[0] || {
      ticker: 'KO',
      name: 'The Coca-Cola Company',
      expectedReturn: 0.098,
      volatility: 0.128,
      price: 68.5,
      linearScore: 88,
      sector: 'Bebidas & Consumo',
      moat: 'Foso Amplio (Moat)'
    };
    const singlePoint: PortfolioPoint = {
      weights: [1.0],
      expectedReturn: fallbackAsset.expectedReturn,
      volatility: fallbackAsset.volatility,
      sharpeRatio: (fallbackAsset.expectedReturn - riskFreeRate) / fallbackAsset.volatility,
      diversificationRatio: 0
    };
    return {
      assets: [fallbackAsset],
      correlationMatrix: [[1.0]],
      covarianceMatrix: [[fallbackAsset.volatility * fallbackAsset.volatility]],
      simulatedPortfolios: [singlePoint],
      frontierCurve: [{
        volatility: fallbackAsset.volatility,
        expectedReturn: fallbackAsset.expectedReturn,
        sharpeRatio: singlePoint.sharpeRatio
      }],
      maxSharpePortfolio: singlePoint,
      minVariancePortfolio: singlePoint,
      equalWeightPortfolio: singlePoint,
      riskFreeRate
    };
  }

  const corrMatrix = buildCorrelationMatrix(assets);
  const covMatrix = buildCovarianceMatrix(assets, corrMatrix);

  const simulatedPortfolios: PortfolioPoint[] = [];

  // 1. Cartera equiponderada (1/N)
  const equalWeights = Array(n).fill(1 / n);
  const equalWeightPortfolio = evaluatePortfolio(equalWeights, assets, covMatrix, riskFreeRate);
  simulatedPortfolios.push(equalWeightPortfolio);

  // 2. Carteras monovalor (100% en cada activo individual)
  for (let i = 0; i < n; i++) {
    const singleWeights = Array(n).fill(0);
    singleWeights[i] = 1.0;
    simulatedPortfolios.push(evaluatePortfolio(singleWeights, assets, covMatrix, riskFreeRate));
  }

  // 3. Muestreo de Monte Carlo en el simplex (acotado y eficiente)
  const effectiveSamples = Math.min(180, Math.max(80, sampleSize));
  for (let s = 0; s < effectiveSamples; s++) {
    const w = sampleRandomWeights(n);
    simulatedPortfolios.push(evaluatePortfolio(w, assets, covMatrix, riskFreeRate));
  }

  // 4. Búsqueda y refinamiento de la Cartera de Máximo Sharpe (Tangente)
  let maxSharpe = simulatedPortfolios[0];
  let minVar = simulatedPortfolios[0];

  for (let i = 0; i < simulatedPortfolios.length; i++) {
    const p = simulatedPortfolios[i];
    if (p.sharpeRatio > maxSharpe.sharpeRatio) {
      maxSharpe = p;
    }
    if (p.volatility < minVar.volatility) {
      minVar = p;
    }
  }

  // Optimización por gradiente suave acotada a 30 iteraciones (previene bloqueo de hilo de render)
  let refinedWeights = [...maxSharpe.weights];
  const step = 0.025;
  for (let iter = 0; iter < 30; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (refinedWeights[j] > step) {
          const testWeights = [...refinedWeights];
          testWeights[i] += step;
          testWeights[j] -= step;
          const candidate = evaluatePortfolio(testWeights, assets, covMatrix, riskFreeRate);
          if (candidate.sharpeRatio > maxSharpe.sharpeRatio) {
            maxSharpe = candidate;
            refinedWeights = testWeights;
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }

  // Optimización local acotada para mínima varianza
  let minVarWeights = [...minVar.weights];
  for (let iter = 0; iter < 30; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (minVarWeights[j] > step) {
          const testWeights = [...minVarWeights];
          testWeights[i] += step;
          testWeights[j] -= step;
          const candidate = evaluatePortfolio(testWeights, assets, covMatrix, riskFreeRate);
          if (candidate.volatility < minVar.volatility) {
            minVar = candidate;
            minVarWeights = testWeights;
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }

  // 5. Construcción de la curva de la Frontera Eficiente (envolvente superior)
  const numBuckets = 30;
  const minVol = minVar.volatility * 0.98;
  const maxVol = Math.max(...assets.map(a => a.volatility)) * 1.02;
  const volRange = Math.max(0.01, maxVol - minVol);

  const buckets: ({ maxReturn: number; point: PortfolioPoint } | null)[] = Array(numBuckets).fill(null);

  for (let i = 0; i < simulatedPortfolios.length; i++) {
    const p = simulatedPortfolios[i];
    if (p.expectedReturn < minVar.expectedReturn) continue; // Descartar rama inferior ineficiente
    const rawBucket = Math.floor(((p.volatility - minVol) / volRange) * numBuckets);
    const bucketIdx = Math.max(0, Math.min(numBuckets - 1, rawBucket));
    const current = buckets[bucketIdx];
    if (!current || p.expectedReturn > current.maxReturn) {
      buckets[bucketIdx] = { maxReturn: p.expectedReturn, point: p };
    }
  }

  const frontierCurve = buckets
    .filter((b): b is { maxReturn: number; point: PortfolioPoint } => b !== null)
    .map(b => ({
      volatility: b.point.volatility,
      expectedReturn: b.point.expectedReturn,
      sharpeRatio: b.point.sharpeRatio
    }))
    .sort((a, b) => a.volatility - b.volatility);

  return {
    assets,
    correlationMatrix: corrMatrix,
    covarianceMatrix: covMatrix,
    simulatedPortfolios,
    frontierCurve,
    maxSharpePortfolio: maxSharpe,
    minVariancePortfolio: minVar,
    equalWeightPortfolio,
    riskFreeRate
  };
}
