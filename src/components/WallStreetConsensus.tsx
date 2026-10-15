import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Newspaper,
  ExternalLink,
  Calendar,
  RefreshCw,
  AlertCircle,
  Building2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { TargetConsensus } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { LoadingSkeleton } from './ui/Feedback';

interface AnalystTargetsData {
  success: boolean;
  ticker: string;
  currentPrice: number;
  targetLow: number;
  targetHigh: number;
  targetMean: number;
  targetMedian: number;
  upsideMeanPercent: number;
  upsideHighPercent: number;
  downsideLowPercent: number;
  numberOfAnalysts?: number | null;
  chart?: string | null;
  source?: string;
  error?: string;
}

interface RecommendationPeriod {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface UpgradeDowngrade {
  GradeDate?: string;
  Firm?: string;
  ToGrade?: string;
  FromGrade?: string;
  Action?: string;
  priceTargetAction?: string;
  currentPriceTarget?: number;
  priorPriceTarget?: number;
}

interface RecommendationsData {
  success: boolean;
  ticker: string;
  summary?: {
    period: string;
    totalAnalysts: number;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    consensus: string;
  } | null;
  recommendations: RecommendationPeriod[];
  upgradesDowngrades: UpgradeDowngrade[];
  source?: string;
  error?: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  publisher: string;
  link: string;
  pubDate: string | null;
  thumbnail: string | null;
}

interface NewsData {
  success: boolean;
  ticker: string;
  count: number;
  news: NewsItem[];
  source?: string;
  error?: string;
}

interface WallStreetConsensusProps {
  ticker: string;
  currentPrice?: number;
  consensus?: TargetConsensus;
}

export const WallStreetConsensus: React.FC<WallStreetConsensusProps> = ({
  ticker,
  currentPrice,
  consensus
}) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'recommendations' | 'news'>('targets');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [targetsData, setTargetsData] = useState<AnalystTargetsData | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsData | null>(null);
  const [newsData, setNewsData] = useState<NewsData | null>(null);

  // Control para mostrar 3 titulares iniciales con botón "Ver más"
  const [showAllNews, setShowAllNews] = useState<boolean>(false);

  // Carga de datos para el ticker actual
  const fetchConsensusData = async (symbol: string, isManualRefresh = false) => {
    if (!symbol) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const cleanTicker = symbol.toUpperCase().trim();
      const [targetsRes, recsRes, newsRes] = await Promise.allSettled([
        fetchJson(`/api/python/targets/${cleanTicker}`),
        fetchJson(`/api/python/recommendations/${cleanTicker}`),
        fetchJson(`/api/python/news/${cleanTicker}`)
      ]);

      setTargetsData(targetsRes.status === 'fulfilled' ? targetsRes.value : null);
      setRecommendationsData(recsRes.status === 'fulfilled' ? recsRes.value : null);
      setNewsData(newsRes.status === 'fulfilled' ? newsRes.value : null);

      // Si ninguna de las tres fuentes respondió, se muestra el motivo (p. ej. tiempo agotado)
      const results = [targetsRes, recsRes, newsRes];
      if (results.every(r => r.status === 'rejected')) {
        setError(errorMessage((targetsRes as PromiseRejectedResult).reason,
          'No se pudieron sincronizar los datos de consenso de Wall Street.'));
      }
    } catch (err) {
      console.error('[WallStreetConsensus] Error al consultar datos:', err);
      setError(errorMessage(err, 'No se pudieron sincronizar todos los datos de consenso de Wall Street.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setShowAllNews(false);
    fetchConsensusData(ticker);
  }, [ticker]);

  // Formato amigable de fecha
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 16);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mt-5 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-2xs">
      {/* Encabezado de la sección y barra de pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-serif tracking-tight">
                Consenso de Wall Street
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {ticker} • yfinance
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Precios objetivo, calificaciones institucionales y noticias del mercado.
            </p>
          </div>
        </div>

        {/* Pestañas de navegación con color de acento naranja para el elemento activo */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('targets')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'targets'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Precio Objetivo</span>
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'recommendations'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Recomendaciones</span>
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'news'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Noticias</span>
              {newsData?.count ? (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'news' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-300 text-slate-700'
                }`}>
                  {newsData.count}
                </span>
              ) : null}
            </button>
          </div>

          <button
            onClick={() => fetchConsensusData(ticker, true)}
            disabled={refreshing || loading}
            className="p-1.5 px-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all disabled:opacity-40 shadow-2xs"
            title="Refrescar datos en vivo de Yahoo Finance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Resumen compacto de consenso estático (TargetConsensus prop) */}
      {consensus && (
        <div className="mt-4 p-4 bg-amber-50/30 rounded-2xl border border-amber-200/50 animate-fadeIn">
          <div className="flex items-center gap-2.5 mb-3">
            <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Resumen de Consenso de Wall Street
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Precio Objetivo Medio
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                  ${consensus.target_mean.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Potencial
                </span>
                <div className={`text-xl font-black font-mono mt-0.5 ${
                  consensus.upside_potential >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {consensus.upside_potential >= 0 ? '+' : ''}{consensus.upside_potential.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Recomendación
                </span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {consensus.recommendation}
                </div>
                <span className="text-[10px] text-slate-500">
                  {consensus.number_of_analysts} analistas
                </span>
              </div>
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
            </div>
          </div>

          {/* Mini visual: precio actual vs objetivo medio vs objetivo máximo */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>${currentPrice ? currentPrice.toFixed(2) : consensus.target_mean.toFixed(2)}</span>
              <span>${consensus.target_mean.toFixed(2)}</span>
              <span>${consensus.target_high.toFixed(2)}</span>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              {currentPrice && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
                  style={{ left: `${Math.min(100, Math.max(0, ((currentPrice - (consensus.target_low * 0.9)) / ((consensus.target_high * 1.1) - (consensus.target_low * 0.9))) * 100))}%` }}
                  title={`Precio actual: $${currentPrice.toFixed(2)}`}
                />
              )}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                style={{ left: `${Math.min(100, Math.max(0, ((consensus.target_mean - (consensus.target_low * 0.9)) / ((consensus.target_high * 1.1) - (consensus.target_low * 0.9))) * 100))}%` }}
                title={`Objetivo Medio: $${consensus.target_mean.toFixed(2)}`}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-30"
                style={{ left: `${Math.min(100, Math.max(0, ((consensus.target_high - (consensus.target_low * 0.9)) / ((consensus.target_high * 1.1) - (consensus.target_low * 0.9))) * 100))}%` }}
                title={`Objetivo Máximo: $${consensus.target_high.toFixed(2)}`}
              />
              <div className="absolute inset-0 flex items-center">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Rango bajo (${consensus.target_low.toFixed(2)})</span>
              <span>Rango alto (${consensus.target_high.toFixed(2)})</span>
            </div>
          </div>
        </div>
      )}

      {/* Contenido condicional según estado de carga y pestaña activa */}
      {loading ? (
        <LoadingSkeleton label={`Consultando consenso de Wall Street para ${ticker} vía yfinance...`} />
      ) : error ? (
        <div className="py-6 text-center text-xs text-rose-600 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="pt-4">
          {/* ========================================================= */}
          {/* PESTAÑA 1: PRECIO OBJETIVO */}
          {/* ========================================================= */}
          {activeTab === 'targets' && (
            <div className="space-y-4 animate-fadeIn">
              {targetsData ? (
                <>
                  {/* Tarjetas de Métricas de Objetivos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                        Cotización Actual
                      </span>
                      <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                        ${targetsData.currentPrice?.toFixed(2) || (currentPrice ? currentPrice.toFixed(2) : '---')}
                      </div>
                      <span className="text-[10px] text-slate-500">Precio de referencia</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                        Objetivo Mínimo
                      </span>
                      <div className="text-base font-black text-rose-600 font-mono mt-0.5">
                        ${targetsData.targetLow?.toFixed(2) || '---'}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">
                        {targetsData.downsideLowPercent > 0 ? `+${targetsData.downsideLowPercent}%` : `${targetsData.downsideLowPercent}%`}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-amber-200/80 bg-amber-50/20">
                      <span className="text-[10px] uppercase font-bold text-amber-700 font-mono block">
                        Objetivo Medio (Consenso)
                      </span>
                      <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                        ${targetsData.targetMean?.toFixed(2) || '---'}
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${
                        targetsData.upsideMeanPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {targetsData.upsideMeanPercent >= 0 ? `+${targetsData.upsideMeanPercent}%` : `${targetsData.upsideMeanPercent}%`} potencial
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                        Objetivo Máximo
                      </span>
                      <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
                        ${targetsData.targetHigh?.toFixed(2) || '---'}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">
                        +{targetsData.upsideHighPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Gráfica generada por el motor Python Matplotlib */}
                  {targetsData.chart ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                          <span>Distribución Gráfica del Rango de Analistas</span>
                        </span>
                        {targetsData.numberOfAnalysts && (
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {targetsData.numberOfAnalysts} analistas de Wall Street
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-2 shadow-sm">
                        <img
                          src={targetsData.chart}
                          alt={`Precios Objetivo ${ticker}`}
                          className="w-full h-auto rounded-xl object-contain max-h-[300px] mx-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No hay gráfica disponible para este símbolo.
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No se encontraron estimaciones de precios objetivo para {ticker}.
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: RECOMENDACIONES */}
          {/* ========================================================= */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4 animate-fadeIn">
              {recommendationsData ? (
                <>
                  {/* Resumen de Consenso Actual */}
                  {recommendationsData.summary && (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                          Calificación de Consenso
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Award className="w-5 h-5 text-amber-500" />
                          <span className="text-base font-black text-slate-900 font-serif">
                            {recommendationsData.summary.consensus}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Analistas:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {recommendationsData.summary.totalAnalysts}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-600 block text-[10px]">Comprar:</span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {recommendationsData.summary.strongBuy + recommendationsData.summary.buy}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Mantener:</span>
                          <span className="font-bold text-slate-700 text-sm">
                            {recommendationsData.summary.hold}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-600 block text-[10px]">Vender:</span>
                          <span className="font-bold text-rose-700 text-sm">
                            {recommendationsData.summary.sell + recommendationsData.summary.strongSell}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla de Desglose Histórico por Periodos */}
                  {recommendationsData.recommendations && recommendationsData.recommendations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Evolución Mensual del Voto de Analistas
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Periodos (0m = mes actual)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-50/50 text-[11px] text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="p-2.5 pl-4">Periodo</th>
                              <th className="p-2.5 text-emerald-700 font-bold">Fuerte Compra</th>
                              <th className="p-2.5 text-emerald-600">Compra</th>
                              <th className="p-2.5 text-slate-600">Mantener</th>
                              <th className="p-2.5 text-rose-500">Venta</th>
                              <th className="p-2.5 text-rose-700 font-bold pr-4">Fuerte Venta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {recommendationsData.recommendations.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 pl-4 font-bold text-slate-800">
                                  {r.period === '0m' ? 'Mes Actual (0m)' : `${r.period} meses`}
                                </td>
                                <td className="p-2.5 text-emerald-700 font-bold">{r.strongBuy}</td>
                                <td className="p-2.5 text-emerald-600">{r.buy}</td>
                                <td className="p-2.5 text-slate-600">{r.hold}</td>
                                <td className="p-2.5 text-rose-500">{r.sell}</td>
                                <td className="p-2.5 text-rose-700 font-bold pr-4">{r.strongSell}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Lista de Upgrades / Downgrades Recientes */}
                  {recommendationsData.upgradesDowngrades && recommendationsData.upgradesDowngrades.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Últimos Cambios de Calificación y Acciones Institucionales
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Firmas de inversión
                        </span>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 text-xs">
                        {recommendationsData.upgradesDowngrades.slice(0, 10).map((u, i) => (
                          <div key={i} className="p-3 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {u.Firm || 'Firma de Análisis'}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {u.FromGrade && u.FromGrade !== u.ToGrade ? (
                                    <>
                                      <span className="line-through text-slate-400">{u.FromGrade}</span> →{' '}
                                    </>
                                  ) : null}
                                  <strong className="text-slate-800">{u.ToGrade || 'Revisión'}</strong>
                                  {u.Action ? ` (${u.Action})` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-right font-mono text-[11px] self-end sm:self-auto">
                              {u.currentPriceTarget ? (
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Obj. Precio:</span>
                                  <span className="font-bold text-slate-800">
                                    ${u.currentPriceTarget}
                                  </span>
                                </div>
                              ) : null}
                              <div className="text-slate-400 text-[10px] whitespace-nowrap">
                                {formatDate(u.GradeDate)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No hay calificaciones de firmas registradas para {ticker}.
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: NOTICIAS (3 titulares + botón "Ver más") */}
          {/* ========================================================= */}
          {activeTab === 'news' && (
            <div className="space-y-3 animate-fadeIn">
              {newsData && newsData.news && newsData.news.length > 0 ? (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                    <span className="font-medium">
                      Mostrando {showAllNews ? newsData.news.length : Math.min(3, newsData.news.length)} de {newsData.news.length} noticias sobre {ticker}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Fuente: Yahoo Finance
                    </span>
                  </div>

                  {/* Listado de noticias (limitado a 3 inicialmente) */}
                  <div className="space-y-2.5">
                    {(showAllNews ? newsData.news : newsData.news.slice(0, 3)).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start gap-3.5 group shadow-2xs"
                      >
                        {/* Miniatura si existe */}
                        {item.thumbnail ? (
                          <div className="w-full sm:w-28 h-24 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Ocultar imagen rota
                                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : null}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-1">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {item.publisher || 'Yahoo Finance'}
                            </span>
                            {item.pubDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {formatDate(item.pubDate)}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                            {item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-1"
                              >
                                <span>{item.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 mt-0.5" />
                              </a>
                            ) : (
                              item.title
                            )}
                          </h4>

                          {item.summary && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {item.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botón "Ver más" / "Ver menos" con color de acento naranja */}
                  {newsData.news.length > 3 && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setShowAllNews(!showAllNews)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>
                          {showAllNews
                            ? 'Ver menos noticias'
                            : `Ver más noticias (${newsData.news.length - 3} adicionales)`}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllNews ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No se encontraron noticias recientes para {ticker}.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
