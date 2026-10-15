import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Percent,
  ShieldCheck,
  RefreshCw,
  Sliders,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calculator,
  ArrowRight,
  Scale
} from 'lucide-react';
import { CapmData } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { InfoTooltip } from './SmartTooltip';
import { useViewMode } from '../context/ViewModeContext';
import { LoadingSkeleton } from './ui/Feedback';

interface CapmValuationCardProps {
  ticker: string;
  companyName?: string;
  companyRoe?: number; // % opcional para comparar con el Costo de Capital
}

export const CapmValuationCard: React.FC<CapmValuationCardProps> = ({
  ticker,
  companyName,
  companyRoe
}) => {
  const { viewMode } = useViewMode();
  const [data, setData] = useState<CapmData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estados interactivos para simulación local
  const [customMrp, setCustomMrp] = useState<number>(5.5); // %
  const [useUnlevered, setUseUnlevered] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Función para consultar la API
  const fetchCapmData = async (symbol: string, isManual = false) => {
    if (!symbol) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const cleanTicker = symbol.toUpperCase().trim();
      const json = await fetchJson<CapmData>(`/api/python/capm/${cleanTicker}`);
      setData(json);
      if (json.market_risk_premium) {
        setCustomMrp(Math.round(json.market_risk_premium * 1000) / 10);
      }
    } catch (err) {
      console.error('[CapmValuationCard] Error:', err);
      setError(errorMessage(err, 'No se pudo calcular el CAPM en vivo. Reintenta en unos segundos.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCapmData(ticker);
  }, [ticker]);

  // Cálculos dinámicos interactivos con el slider de ERP y el switch de beta
  const rf = data?.risk_free_rate ? data.risk_free_rate * 100 : 5.18; // %
  const baseBeta = useUnlevered && data?.unlevered_beta ? data.unlevered_beta : (data?.beta ?? 1.0);
  const currentErp = customMrp; // %
  const dynamicCostOfEquity = rf + baseBeta * currentErp;

  // Comparación pedagógica con el ROE
  const roeValue = companyRoe !== undefined ? companyRoe : null;
  const createsEconomicValue = roeValue !== null ? roeValue >= dynamicCostOfEquity : null;

  return (
    <div className="mt-5 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Costo de Capital Propio (CAPM)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Damodaran & FRED
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tasa mínima de rentabilidad exigida (Hurdle Rate) para {companyName || ticker}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Ver explicación y heurística de Warren Buffett"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>{showExplanation ? 'Ocultar info' : '¿Cómo funciona?'}</span>
          </button>

          <button
            onClick={() => fetchCapmData(ticker, true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all disabled:opacity-50"
            title="Recalcular con datos de FRED y Damodaran"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Explicación Pedagógica Desplegable */}
      {showExplanation && (
        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>El Costo de Capital en el Value Investing de Warren Buffett</span>
          </div>
          <p className="leading-relaxed text-indigo-900/90">
            En la teoría financiera clásica de Wall Street, el <strong>CAPM (Capital Asset Pricing Model)</strong> define
            el retorno mínimo que exigen los accionistas como:
          </p>
          <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-200/60 font-mono text-center text-xs font-bold text-indigo-900 shadow-2xs">
            K_e = Tasa Libre de Riesgo (R_f) + Beta (β) × Prima de Riesgo de Mercado (ERP)
          </div>
          <p className="leading-relaxed text-indigo-900/80">
            <strong>¿Qué opina Warren Buffett?</strong> A Buffett no le gusta usar la volatilidad (Beta) como medida de riesgo intrínseco,
            pero reconoce que el <strong>Bono del Tesoro a 10 años (R_f)</strong> es la "gravedad de las valoraciones": cuanto más alta sea la tasa libre
            de riesgo, más barata debe comprarse una empresa para justificar el costo de oportunidad.
          </p>
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <LoadingSkeleton label="Calculando CAPM en vivo..." />
      ) : error ? (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCapmData(ticker, true)}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-800 font-bold hover:bg-rose-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : viewMode === 'simple' ? (
        // Simple Mode: Justified Verdict
        <div className="mt-4">
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="text-xs font-mono font-bold text-indigo-700 uppercase">
                  Costo de Capital (K_e)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black font-mono text-indigo-700">
                    {dynamicCostOfEquity.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">anual</span>
                </div>
              </div>
            </div>

            {roeValue !== null && (
              <div className="flex items-center gap-2">
                {createsEconomicValue ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span className="text-xs font-bold text-success">
                      ROE {roeValue.toFixed(1)}% &gt; K_e → Crea Valor
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                    <span className="text-xs font-bold text-danger">
                      ROE {roeValue.toFixed(1)}% &lt; K_e → Exigente
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {roeValue !== null && (
            <p className="mt-2 text-xs text-slate-500">
              El costo de capital de {ticker} es {dynamicCostOfEquity.toFixed(1)}%. Con un ROE del {roeValue.toFixed(1)}%, {createsEconomicValue ? 'la empresa genera valor económico.' : 'el ROE no cubre el costo del capital.'}
            </p>
          )}

          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <span>{showExplanation ? 'Ocultar' : '¿Cómo funciona?'}</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showExplanation && (
            <div className="mt-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Costo de Capital Propio (CAPM)</span>
              </div>
              <p>K_e = R_f + β × ERP</p>
              <p className="text-[10px] text-indigo-800/80">
                La tasa mínima que debe rendir {ticker} para compensar el riesgo. Warren Buffett usa esta "gravedad" para valorar empresas.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Card Hero: Costo de Capital Resultante + Fórmula Visual */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  Costo del Capital Propio Estimado (K_e)
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                    {dynamicCostOfEquity.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    anual en USD
                  </span>
                </div>
                <p className="text-xs text-slate-300/80 mt-1 max-w-md">
                  Rentabilidad anual mínima que el negocio de {ticker} debe rendir para compensar el costo del capital y el riesgo sectorial.
                </p>
              </div>

              {/* Comparador con ROE si existe */}
              {roeValue !== null && (
                <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 flex flex-col justify-center min-w-[200px]">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center">
                      ROE Reportado:
                      <InfoTooltip concept="roe" />
                    </span>
                    <span className="font-mono font-bold text-white">{roeValue.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
                    <span>Costo K_e (CAPM):</span>
                    <span className="font-mono font-bold text-indigo-300">{dynamicCostOfEquity.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5">
                    {createsEconomicValue ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-300">
                          Crea Valor Económico (ROE &gt; K_e)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-[11px] font-bold text-amber-200">
                          Exigente (ROE &lt; K_e)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desglose Matemático Interactivo */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  1. Tasa Libre Riesgo (R_f)
                </span>
                <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {rf.toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Tesoro 10Y EE.UU. (FRED DGS10)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center">
                  2. Beta Sectorial ({useUnlevered ? 'β Desap.' : 'β Apal.'})
                  <InfoTooltip concept="beta" />
                </span>
                <span className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
                  {baseBeta.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {data?.matched_damodaran_industry || 'Damodaran 2026'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  3. Prima de Riesgo (ERP)
                </span>
                <span className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                  {currentErp.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Premio sobre el bono soberano
                </span>
              </div>
            </div>
          </div>

          {/* Mapeo de Industria Damodaran */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-700">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Emparejamiento de Industria
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-slate-800">
                    {data?.yfinance_industry || 'Industria YFinance'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {data?.matched_damodaran_industry || 'Damodaran'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 font-mono flex items-center">
                  Beta Apalancado
                  <InfoTooltip concept="beta" />
                </span>
                <span className="font-mono font-bold text-slate-800">{data?.beta?.toFixed(2) ?? '1.00'}</span>
              </div>
              {data?.unlevered_beta !== undefined && (
                <div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center">
                    Beta Desapalancado
                    <InfoTooltip concept="beta" />
                  </span>
                  <span className="font-mono font-bold text-slate-800">{data.unlevered_beta.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controles de Simulación Interactiva */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">
                  Simulador de Supuestos Sensibles
                </span>
              </div>
              <button
                onClick={() => {
                  setCustomMrp(5.5);
                  setUseUnlevered(false);
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Restablecer Valores Base
              </button>
            </div>

            {/* Slider de Prima de Riesgo (ERP) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600">
                  Prima de Riesgo de Mercado (ERP / MRP):
                </span>
                <span className="font-mono font-bold text-indigo-600 text-sm">
                  {customMrp.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="9.0"
                step="0.1"
                value={customMrp}
                onChange={(e) => setCustomMrp(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>3.0% (Mínimo histórico)</span>
                <span>5.5% (Base Damodaran)</span>
                <span>9.0% (Crisis / Alta prima)</span>
              </div>
            </div>

            {/* Toggle de Beta: Apalancado vs Desapalancado */}
            {data?.unlevered_beta !== undefined && (
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Usar Beta Desapalancado (Unlevered Beta)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Aísla el riesgo puro del negocio eliminando el efecto de la deuda financiera (β = {data.unlevered_beta.toFixed(2)})
                  </span>
                </div>
                <button
                  onClick={() => setUseUnlevered(!useUnlevered)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                    useUnlevered ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useUnlevered ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Enlaces de Fuentes Oficiales */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Datos integrados en tiempo real sin descarga manual.
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/Betas.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <span>Damodaran Betas</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <a
                href="https://fred.stlouisfed.org/series/DGS10"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <span>FRED DGS10 (10Y)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
