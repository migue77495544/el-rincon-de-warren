import { INITIAL_COMPANIES } from '../data/initialData.js';
import {
  calculateFundamentalRatios,
  calculateLinearScore
} from '../utils/financialCalculations.js';
import { CompanyAnalysis } from '../types.js';

type CompanySeed = (typeof INITIAL_COMPANIES)[0];

export function analyzeCompany(seed: CompanySeed): CompanyAnalysis {
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