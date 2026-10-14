export const SQL_SCHEMA = `
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

export const NOSQL_SCHEMA = {
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

export const PYTHON_SCRIPT = `
# ==============================================================
# "EL RINCÓN DE WARREN": MOTOR DE SCORING Y EVALUACIÓN DiD (Python 3)
# ==============================================================
import numpy as np
import pandas as pd

def calcular_scoring_linear(ratios: dict) -> dict:
    """
    Función de Scoring Linear S(a) ponderando 4 dimensiones financieras:
    S(a) = w1*f1(Liq) + w2*f2(Solv) + w3*f3(Rent) + w4*f4(Val)
    """
    w_liq = 0.20
    w_solv = 0.25
    w_rent = 0.25
    w_val = 0.30

    # Sub-funciones normalizadas 0-100
    f_liq = min(100, (ratios.get('liquidezCorriente', 1.0) / 2.0) * 100)
    f_solv = 90 if ratios.get('endeudamiento', 2.0) <= 1.0 else 45
    f_rent = min(100, (ratios.get('roe', 0.10) / 0.18) * 100)
    per = ratios.get('per', 25.0)
    f_val = 95 if per <= 18 else (65 if per <= 25 else 25)

    score = (w_liq * f_liq) + (w_solv * f_solv) + (w_rent * f_rent) + (w_val * f_val)

    grade = 'A+' if score >= 88 else ('A' if score >= 75 else ('B' if score >= 60 else 'F'))
    return {
        'score': round(score, 1),
        'grade': grade,
        'breakdown': {
            'liquidez': round(f_liq, 1),
            'solvencia': round(f_solv, 1),
            'rentabilidad': round(f_rent, 1),
            'valoracion': round(f_val, 1)
        }
    }

def estimar_diferencias_en_diferencias(df: pd.DataFrame, outcome_col: str) -> dict:
    """
    Estima el modelo OLS DiD:
    Y_it = beta0 + beta1*Treat + beta2*Post + beta3*(Treat * Post) + eps
    """
    import statsmodels.api as sm
    import statsmodels.formula.api as smf

    model = smf.ols(f"{outcome_col} ~ treatment + post + treatment:post", data=df).fit()
    return {
        'beta0_baseline': model.params['Intercept'],
        'beta1_group_diff': model.params['treatment'],
        'beta2_time_trend': model.params['post'],
        'beta3_did_effect': model.params['treatment:post'],
        'p_value_did': model.pvalues['treatment:post'],
        'r_squared': model.rsquared
    }
`.trim();

export const JS_SCRIPT = `
// ==============================================================
// MOTOR DE CÁLCULO FINANCIERO & SHARPE (TypeScript / JavaScript)
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
