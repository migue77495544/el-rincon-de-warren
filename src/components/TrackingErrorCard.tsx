import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  HelpCircle,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import { TrackingErrorData } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { InfoTooltip } from './SmartTooltip';
import { LoadingSkeleton } from './ui/Feedback';

interface TrackingErrorCardProps {
  ticker: string;
  companyName?: string;
  benchmark?: string;
  period?: string;
  /** When true, shows a compact summary for portfolio-level display */
  compact?: boolean;
}

const MANAGEMENT_STYLE_CONFIG: Record<string, {
  label: string;
  color: 'emerald' | 'amber' | 'rose';
  description: string;
}> = {
  'Closet Indexing / Réplica Pasiva': {
    label: 'Closet Indexing / Réplica Pasiva',
    color: 'emerald',
    description: 'Tu inversión sigue casi idénticamente al índice. Muy baja volatilidad relativa.'
  },
  'Moderate Active Management / Sector Selection': {
    label: 'Gestión Activa Moderada / Selección Sectorial',
    color: 'amber',
    description: 'Tu inversión desvía moderadamente del índice, buscando alpha sectorial.'
  },
  'High Active Management / Conviction Strategy': {
    label: 'Alta Gestión Activa / Estrategia de Convicción',
    color: 'rose',
    description: 'Tu inversión se desvía fuertemente del índice. Alto riesgo activo, potencial alto de alpha.'
  }
};

const getManagementStyleConfig = (style: string) => {
  for (const key of Object.keys(MANAGEMENT_STYLE_CONFIG)) {
    if (style.includes(key)) return MANAGEMENT_STYLE_CONFIG[key];
  }
  return MANAGEMENT_STYLE_CONFIG[Object.keys(MANAGEMENT_STYLE_CONFIG)[0]];
};

export const TrackingErrorCard: React.FC<TrackingErrorCardProps> = ({
  ticker,
  companyName,
  benchmark = '^GSPC',
  period = '1y',
  compact = false
}) => {
  const [data, setData] = useState<TrackingErrorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingError = async (isManual = false) => {
    if (!ticker) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const cleanTicker = ticker.toUpperCase().trim();
      const params = new URLSearchParams({
        benchmark,
        period
      });
      const json = await fetchJson<TrackingErrorData>(`/api/python/tracking-error/${cleanTicker}?${params}`);
      setData(json);
    } catch (err) {
      console.error('[TrackingErrorCard] Error:', err);
      setError(errorMessage(err, 'No se pudo calcular el Risk Tracking en vivo. Reintenta en unos segundos.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingError();
  }, [ticker, benchmark, period]);

  // Formatear el TE anualizado como porcentaje
  const teAnnual = data?.annualized_tracking_error ? data.annualized_tracking_error * 100 : 0;
  const activeReturn = data?.annualized_active_return ? data.annualized_active_return * 100 : 0;
  const ir = data?.information_ratio ?? 0;
  const styleConfig = data?.management_style ? getManagementStyleConfig(data.management_style) : null;

  if (compact) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700">Risk Tracking (TE)</span>
            <InfoTooltip concept="trackingError" />
          </div>
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <span className="text-sm font-mono font-bold text-slate-800">{teAnnual.toFixed(2)}%</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Risk Tracking (Tracking Error)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                Riesgo Activo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Desviación relativa vs {benchmark} ({data?.period || period})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTrackingError(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all disabled:opacity-50"
            title="Recalcular con datos de yfinance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-violet-600' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <LoadingSkeleton label="Calculando Tracking Error en vivo..." />
      ) : error ? (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchTrackingError(true)}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-800 font-bold hover:bg-rose-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : data && (
        <div className="mt-5 space-y-5">
          {/* Hero Card: TE Anualizado + Gestión Style Badge */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-violet-950 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300 font-mono flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  Tracking Error Anualizado
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                    {teAnnual.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    anual
                  </span>
                </div>
                <p className="text-xs text-slate-300/80 mt-1 max-w-md">
                  {companyName ? `${companyName} ` : ''}se desvía un {teAnnual.toFixed(2)}% anual respecto a {benchmark}.
                </p>
              </div>

              {/* Management Style Badge */}
              {styleConfig && (
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                    styleConfig.color === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : styleConfig.color === 'amber'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {styleConfig.label}
                  </span>
                  <span className={`text-[10px] text-slate-300/80 ${
                    styleConfig.color === 'emerald'
                      ? 'text-emerald-300/80'
                      : styleConfig.color === 'amber'
                      ? 'text-amber-300/80'
                      : 'text-rose-300/80'
                  }`}>
                    {styleConfig.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Desglose: Active Return, IR, Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1 mb-1.5">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                Retorno Activo Anual
              </span>
              <span className={`text-2xl font-mono font-bold ${
                activeReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {activeReturn >= 0 ? '+' : ''}{activeReturn.toFixed(2)}%
              </span>
              <InfoTooltip concept="trackingError" text="El retorno activo es la diferencia anualizada entre el retorno de tu acción y el del benchmark." />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1 mb-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                Ratio de Información
              </span>
              <span className={`text-2xl font-mono font-bold ${
                ir >= 0.5 ? 'text-emerald-600' : ir >= 0 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {ir.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {ir >= 0.5 ? 'Excelente ratio riesgo-eficiencia' : ir >= 0 ? 'Moderado' : 'Alpha negativo'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1 mb-1.5">
                <Shield className="w-3 h-3 text-violet-500" />
                Observaciones
              </span>
              <span className="text-sm font-mono font-bold text-slate-800">
                {data?.observations ?? 252}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                días de datos
              </span>
            </div>
          </div>

          {/* Explicación Pedagógica */}
          <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 text-xs text-slate-700 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-violet-900 mb-1.5">
              <HelpCircle className="w-4 h-4 text-violet-600" />
              <span>¿Cómo interpretar el Risk Tracking?</span>
            </div>
            <p className="leading-relaxed text-slate-600 mb-2">
              El Tracking Error (TE) mide la <strong>volatilidad del exceso de retorno</strong> respecto a tu benchmark.
              Se calcula como la desviación estándar de (R_p - R_b) anualizada con √252.
            </p>
            <div className="font-mono text-center p-2 bg-white/80 rounded-lg border border-violet-200/60 text-xs font-bold text-slate-800">
              TE = σ(R_p − R_b) × √252 · Act. Return = E(R_p − R_b) × 252 · IR = Act. Return / TE
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
