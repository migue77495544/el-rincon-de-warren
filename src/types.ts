// Core Types for "El Rincón de Warren"

export type TrafficLight = 'green' | 'yellow' | 'red';

export type ViewMode = 'simple' | 'analyst';

export interface FinancialRawData {
  // Balance Sheet
  activoCirculante: number; // Current Assets ($M)
  pasivoCirculante: number; // Current Liabilities ($M)
  inventarios: number; // Inventory ($M)
  otrosActivosCirculantes: number; // Other current assets ($M)
  cuentasPorCobrar: number; // Accounts Receivable ($M)
  efectivo: number; // Cash & equivalents ($M)
  totalPasivo: number; // Total Liabilities ($M)
  patrimonioNeto: number; // Shareholders' Equity ($M)
  activosTotales: number; // Total Assets ($M)

  // Income Statement
  utilidadNeta: number; // Net Income ($M)
  ebit: number; // EBIT ($M)
  interesesPorPagar: number; // Interest Expenses ($M)
  ingresosTotales: number; // Revenue ($M)

  // Market & Per Share Data
  precioCotizacion: number; // Current Stock Price ($)
  numeroAcciones: number; // Shares Outstanding (M)
  capitalizacionBursatil: number; // Market Cap ($M)
  dividendoPorAccion: number; // Dividend Per Share ($)
}

export interface RatioEvaluation {
  value: number;
  formatted: string;
  status: TrafficLight;
  benchmark: string;
  explanation: string;
  heuristicSimple: string;
}

export interface FundamentalRatios {
  // A. Liquidez
  liquidezCorriente: RatioEvaluation;
  ratioTesoreriaPruebaAcida: RatioEvaluation;
  disponibilidadInmediata: RatioEvaluation;

  // B. Solvencia
  endeudamiento: RatioEvaluation;
  coberturaIntereses: RatioEvaluation;

  // C. Rentabilidad
  roa: RatioEvaluation;
  roe: RatioEvaluation;

  // D. Valoración
  bpa: RatioEvaluation;
  per: RatioEvaluation;
  pb: RatioEvaluation;
  yieldDividendo: RatioEvaluation;
}

export interface DimensionSummary {
  name: string;
  score: number; // 0 to 100
  status: TrafficLight;
  summary: string;
  verdict: string;
}

export interface TargetConsensus {
  target_mean: number;        // Average price target ($)
  target_high: number;        // Highest price target ($)
  target_low: number;         // Lowest price target ($)
  recommendation: string;     // e.g. "Compra Fuerte", "Compra", "Mantener"
  number_of_analysts: number; // Analyst count
  upside_potential: number;   // % upside/downside vs current price
}

export interface CompanyAnalysis {
  id: string;
  ticker: string;
  nombre: string;
  sector: string;
  industria?: string;
  pais?: string;
  anioFundacion?: number;
  descripcion: string;
  businessSummary?: string;
  modeloNegocio?: string;
  usuariosActivos?: string;
  moat: 'Amplio' | 'Medio' | 'Ninguno';
  raw: FinancialRawData;
  ratios: FundamentalRatios;
  dimensiones: {
    liquidez: DimensionSummary;
    solvencia: DimensionSummary;
    rentabilidad: DimensionSummary;
    valoracion: DimensionSummary;
  };
  linearScore: number;
  scoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  targetConsensus?: TargetConsensus;
  warrenVerdict: string;
  sectorBenchmarks?: SectorBenchmarks;
}

// Module 2: Portfolio & Simulation
export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  linearScore: number;
}

export interface PortfolioTransaction {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  timestamp: string;
  biasFlag?: string; // e.g. 'Sobreoperativa', 'Sin Margen de Seguridad'
}

export interface PortfolioStats {
  cash: number;
  investedValue: number;
  totalValue: number;
  initialCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  sharpeRatio: number; // SR_p = (E(Rp) - Rf) / sigma_p
  volatilidadMuestral: number; // sigma_p
  expectedReturn: number; // E(Rp)
  riskFreeRate: number; // Rf (default 4.0%)
  averageCompanyScore: number;
  overtradingIndex: number; // frequency of operations
  detectedBiases: {
    bias: string;
    description: string;
    severity: 'warning' | 'danger' | 'info';
    recommendation: string;
  }[];
}

// Module 3: Gamification (Divay, 2024 Econometric Motivation Model)
export interface InvestmentThesis {
  id: string;
  author: string;
  avatar: string;
  ticker: string;
  title: string;
  content: string;
  moatAnalysis: string;
  upsideTarget: number; // Target upside potential %
  recommendedHorizonYears: number;
  upvotes: number;
  commentsCount: number;
  createdAt: string;
  badges: string[];
}

export interface Badge {
  id: string;
  title: string;
  category: 'Análisis' | 'Disciplina' | 'Comunidad' | 'Filosofía';
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  iconName: string;
  points: number;
}

export interface LearningStep {
  id: number;
  level: string;
  title: string;
  subtitle: string;
  xpReward: number;
  completed: boolean;
  content: string;
  keyPrinciple: string;
  quote: string;
}

export interface LeagueCompetitor {
  rank: number;
  name: string;
  avatar: string;
  sharpeRatio: number;
  annualizedReturn: number;
  volatility: number;
  portfolioScore: number;
  turnoverRatio: number; // Low turnover = true Value Investor
  badgeCount: number;
}

export interface GamificationState {
  userXP: number;
  userLevel: number;
  nextLevelXP: number;
  badges: Badge[];
  motivationIndex: number; // Predicted by econometric formula
  modelWeights: {
    colab: number; // 0.320
    recomp: number; // 0.307
    multi: number; // 0.239
    progreso: number; // 0.235
    feedback: number; // 0.151
  };
  validationMetrics: {
    cronbachAlpha: number; // > 0.7
    kmo: number; // > 0.7
    bartlettPValue: number; // p < 0.001
  };
  instantFeedbackLogs: {
    id: string;
    timestamp: string;
    title: string;
    message: string;
    errorType: string;
    heuristicSolution: string;
  }[];
}

// Module 4: Impact Evaluation (Difference-in-Differences DiD)
export interface DiDCohortData {
  cohortName: string;
  treatment: boolean; // 1 = El Rincón de Warren (Gamificado), 0 = Control (Libros estáticos)
  period: 'pre' | 'post';
  avgSharpeRatio: number;
  monthlyTradingTurnover: number; // Trades per month (lower is better in Value Investing)
  avgMarginOfSafety: number; // %
  sampleSize: number;
}

export interface DiDRegressionResults {
  beta0: number; // Intercept (Baseline control)
  beta1_treatment: number; // Treatment baseline difference
  beta2_post: number; // Macro trend effect
  beta3_did: number; // NET PEDAGOGICAL IMPACT (Treatment * Post)
  stdError: number;
  tStatistic: number;
  pValue: number;
  rSquared: number;
  conclusion: string;
}

// Module: Costo de Capital Propio (CAPM - Damodaran & FRED)
export interface CapmData {
  success: boolean;
  ticker: string;
  yfinance_industry: string;
  yfinance_sector?: string;
  matched_damodaran_industry: string;
  beta: number;
  unlevered_beta?: number;
  risk_free_rate: number;
  market_risk_premium: number;
  cost_of_equity: number;
  cost_of_equity_pct: number;
  source: string;
  error?: string;
}

export interface SectorBenchmarks {
  industry_name: string;
  roe_sector?: number;            // %
  pe_sector?: number;             // x
  pb_sector?: number;             // x
  ke_sector?: number;             // %
  current_ratio_sector?: number;  // x
  debt_equity_sector?: number;    // x
}

// Module: Tracking Error (Riesgo Activo)
export interface TrackingErrorData {
  success: boolean;
  ticker: string;
  benchmark: string;
  period: string;
  daily_tracking_error: number;
  annualized_tracking_error: number;
  annualized_active_return: number;
  information_ratio: number;
  management_style: string;
  observations: number;
  status: 'success' | 'error';
  error?: string;
}

/** VaR/CVaR diarios: importe en la divisa de la inversión y fracción del capital */
export interface VarCvar {
  var: number;
  cvar: number;
  var_pct: number;
  cvar_pct: number;
}

export interface RiskMetricsAsset {
  nombre: string;
  ticker: string;
  rendimiento_anual: number;
  volatilidad_anual: number;
  sharpe: number | null;
  beta: number | null;
  capm: number | null;
  vol_ewma_diaria: number;
  normal: VarCvar;
  ewma: VarCvar;
  /** null si el cálculo vino del respaldo sin Python (sin Random Forest) */
  ml: VarCvar | null;
}

export interface RiskMetricsData {
  success: boolean;
  ticker: string;
  benchmark: string;
  period: string;
  monto_inversion: number;
  confianza: number;
  horizonte_dias: number;
  lambda_ewma: number;
  tasa_libre_riesgo: number;
  rendimiento_mercado: number;
  observaciones: number;
  activos: RiskMetricsAsset[];
  source: 'yfinance' | 'yahoo-directo';
}

// Escáner de Superoportunidades (GET /api/analyst/super-opportunities)
export interface OpportunityCatalyst {
  tipo: 'recompra' | 'sorpresas_bpa' | 'margen_operativo';
  nombre: string;
  activo: boolean;
  valor: number | null;
  detalle: string;
  rendimientoRecompraPct?: number | null;
  sorpresas?: { trimestre: string; sorpresaPct: number }[];
  margenActualPct?: number | null;
  acelera?: boolean;
}

export interface SuperOpportunity {
  ticker: string;
  nombre: string;
  sector: string;
  industria: string;
  precio: number;
  valorIntrinseco: number | null;
  valorDcf: number | null;
  valorGraham: number | null;
  metodoValoracion: string | null;
  upsidePct: number | null;
  descuentoPct: number | null;
  roicPct: number | null;
  roePct: number | null;
  piotroski: number;
  piotroskiEvaluados: number;
  piotroskiDetalle: { criterio: string; cumple: boolean | null }[];
  altmanZ: number | null;
  fcfYieldPct: number | null;
  fcfMM: number | null;
  evMM: number | null;
  marketCapMM: number;
  volumenDiarioMM: number;
  waccPct: number | null;
  catalizadores: OpportunityCatalyst[];
  filtros: { id: string; nombre: string; cumple: boolean }[];
  score: number;
  desglose: Record<'descuento' | 'calidad' | 'balance' | 'fcf' | 'catalizadores', number>;
  tesis: string;
  alertaDatos: string | null;
}

export interface SuperOpportunitiesScan {
  success: boolean;
  status: 'listo' | 'escaneando';
  source?: string;
  generadoEn?: string;
  duracionSeg?: number;
  universo?: number;
  analizadas?: number;
  liquidas?: number;
  sinDatos?: string[];
  completo?: boolean;
  superanFiltros?: number;
  oportunidades?: SuperOpportunity[];
  candidatasCercanas?: SuperOpportunity[];
  cache?: { generadoEn: string; expiraEn: string | null };
  stale?: boolean;
  aviso?: string | null;
  message?: string;
  iniciadoEn?: string;
  ultimoResultado?: SuperOpportunitiesScan | null;
}
