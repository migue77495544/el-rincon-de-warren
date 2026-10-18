// src/components/MarkowitzOptimizer.tsx
// MODELO DE MARKOWITZ: TEORÍA MODERNA DE CARTERAS (MPT) & FRONTERA EFICIENTE

import React, { useState, useMemo, useEffect } from 'react';
import { CompanyAnalysis, PortfolioStats } from '../types';
import {
  computeMarkowitzModel,
  evaluatePortfolio,
  MarkowitzAsset,
  PortfolioPoint
} from '../utils/markowitz';
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  DollarSign,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  PieChart,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react';

interface MarkowitzOptimizerProps {
  companies: CompanyAnalysis[];
  portfolio: PortfolioStats;
  onApplyPortfolioWeights?: (targetAllocations: { ticker: string; weight: number; shares: number; price: number }[]) => void;
  onNavigateToMethodology?: () => void;
}

export const MarkowitzOptimizer: React.FC<MarkowitzOptimizerProps> = ({
  companies,
  portfolio,
  onApplyPortfolioWeights,
  onNavigateToMethodology
}) => {
  const [riskFreeRate] = useState(0.04); // 4.0% Letras del Tesoro
  const [activeSubTab, setActiveSubTab] = useState<'frontier' | 'matrix' | 'theory'>('frontier');
  const [hoveredPoint, setHoveredPoint] = useState<PortfolioPoint | null>(null);
  const [rebalanceSuccess, setRebalanceSuccess] = useState(false);

  // Modo de Universo de Optimización:
  // 'active_portfolio': Activos comprados en la cartera del usuario
  // 'full_market': Catálogo completo de empresas
  // 'custom': Selección personalizada
  const hasMultipleHoldings = portfolio.holdings.length >= 2;
  const [universeMode, setUniverseMode] = useState<'active_portfolio' | 'full_market' | 'custom'>(
    hasMultipleHoldings ? 'active_portfolio' : 'full_market'
  );
  const [customSelectedTickers, setCustomSelectedTickers] = useState<string[]>(() =>
    companies.map(c => c.ticker)
  );

  // Determinar la lista efectiva de empresas para la optimización
  const effectiveCompanies = useMemo(() => {
    if (universeMode === 'active_portfolio') {
      const activeTickers = portfolio.holdings.map(h => h.ticker);
      const filtered = companies.filter(c => activeTickers.includes(c.ticker));
      return filtered.length >= 2 ? filtered : companies;
    }
    if (universeMode === 'custom') {
      const filtered = companies.filter(c => customSelectedTickers.includes(c.ticker));
      return filtered.length >= 2 ? filtered : companies;
    }
    return companies;
  }, [universeMode, companies, portfolio.holdings, customSelectedTickers]);

  // 1. Ejecutar el modelo de Markowitz sobre el universo seleccionado
  const markowitzData = useMemo(() => {
    return computeMarkowitzModel(effectiveCompanies, riskFreeRate, 260);
  }, [effectiveCompanies, riskFreeRate]);

  const { assets, correlationMatrix, covarianceMatrix, simulatedPortfolios, frontierCurve, maxSharpePortfolio, minVariancePortfolio, equalWeightPortfolio } = markowitzData;

  // 2. Estado de pesos interactivos del usuario
  const [userWeights, setUserWeights] = useState<number[]>(() => [...maxSharpePortfolio.weights]);

  // Actualizar pesos al cambiar el conjunto de activos
  useEffect(() => {
    if (universeMode === 'active_portfolio' && portfolio.investedValue > 0 && portfolio.holdings.length >= 2) {
      // Sincronizar con los pesos reales de la cartera comprada
      const realW = assets.map(a => {
        const h = portfolio.holdings.find(holding => holding.ticker === a.ticker);
        return h ? h.totalValue / portfolio.investedValue : 0;
      });
      const sum = realW.reduce((a, b) => a + b, 0);
      setUserWeights(sum > 0 ? realW.map(w => w / sum) : [...maxSharpePortfolio.weights]);
    } else {
      setUserWeights([...maxSharpePortfolio.weights]);
    }
  }, [assets, universeMode, portfolio.holdings, portfolio.investedValue]);

  // Cartera actual calculada en base a los pesos de los deslizadores del usuario
  const currentUserPortfolio = useMemo(() => {
    const sumW = userWeights.reduce((a, b) => a + b, 0) || 1;
    const normalized = userWeights.map(w => w / sumW);
    return evaluatePortfolio(normalized, assets, covarianceMatrix, riskFreeRate);
  }, [userWeights, assets, covarianceMatrix, riskFreeRate]);

  // Cartera real actual del usuario en el simulador (si tiene posiciones en estos activos)
  const realCurrentPortfolio = useMemo(() => {
    if (portfolio.holdings.length === 0 || portfolio.investedValue <= 0) return null;
    const weights = assets.map(a => {
      const h = portfolio.holdings.find(holding => holding.ticker === a.ticker);
      return h ? h.totalValue / portfolio.investedValue : 0;
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return null;
    const normalized = weights.map(w => w / sum);
    return evaluatePortfolio(normalized, assets, covarianceMatrix, riskFreeRate);
  }, [portfolio.holdings, portfolio.investedValue, assets, covarianceMatrix, riskFreeRate]);

  // Manejador para actualizar un peso individual
  const handleWeightChange = (index: number, newPercent: number) => {
    const val = Math.max(0, Math.min(100, newPercent)) / 100;
    const newW = [...userWeights];
    newW[index] = val;
    setUserWeights(newW);
    setRebalanceSuccess(false);
  };

  // Normalizar los pesos para que sumen exactamente 100%
  const handleNormalizeWeights = () => {
    const sum = userWeights.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      setUserWeights(Array(assets.length).fill(1 / assets.length));
    } else {
      setUserWeights(userWeights.map(w => w / sum));
    }
  };

  // Cargar presets de Markowitz
  const applyPreset = (preset: 'maxSharpe' | 'minVariance' | 'equal' | 'myRealPortfolio') => {
    if (preset === 'maxSharpe') {
      setUserWeights([...maxSharpePortfolio.weights]);
    } else if (preset === 'minVariance') {
      setUserWeights([...minVariancePortfolio.weights]);
    } else if (preset === 'equal') {
      setUserWeights([...equalWeightPortfolio.weights]);
    } else if (preset === 'myRealPortfolio' && realCurrentPortfolio) {
      const realW = assets.map(a => {
        const h = portfolio.holdings.find(holding => holding.ticker === a.ticker);
        return h && portfolio.investedValue > 0 ? h.totalValue / portfolio.investedValue : 0;
      });
      const sum = realW.reduce((a, b) => a + b, 0);
      if (sum > 0) setUserWeights(realW.map(w => w / sum));
    }
    setRebalanceSuccess(false);
  };

  // Alternar selección de un ticker en modo personalizado
  const handleToggleTicker = (ticker: string) => {
    if (customSelectedTickers.includes(ticker)) {
      if (customSelectedTickers.length <= 2) return; // Mínimo 2 para covarianza
      setCustomSelectedTickers(customSelectedTickers.filter(t => t !== ticker));
    } else {
      setCustomSelectedTickers([...customSelectedTickers, ticker]);
    }
  };

  // Ejecutar el rebalanceo en la cartera del simulador
  const handleExecuteRebalance = () => {
    if (!onApplyPortfolioWeights) return;

    const sumW = userWeights.reduce((a, b) => a + b, 0) || 1;
    const normalized = userWeights.map(w => w / sumW);
    const capitalToAllocate = portfolio.totalValue > 0 ? portfolio.totalValue : 100000;

    const targetAllocations = assets.map((asset, idx) => {
      const weight = normalized[idx];
      const targetDollars = capitalToAllocate * weight;
      const shares = asset.price > 0 ? Math.floor(targetDollars / asset.price) : 0;
      return {
        ticker: asset.ticker,
        weight,
        shares,
        price: asset.price
      };
    });

    onApplyPortfolioWeights(targetAllocations);
    setRebalanceSuccess(true);
    setTimeout(() => setRebalanceSuccess(false), 4500);
  };

  // Dimensiones del gráfico SVG
  const svgWidth = 650;
  const svgHeight = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 65 };

  // Escalas matemáticas para el plano cartesiano (Volatilidad X, Retorno Y)
  const minVol = 0.08;
  const maxVol = 0.46;
  const minRet = -0.05;
  const maxRet = 0.20;

  const scaleX = (vol: number) => {
    const clamped = Math.max(minVol, Math.min(maxVol, vol));
    return padding.left + ((clamped - minVol) / (maxVol - minVol)) * (svgWidth - padding.left - padding.right);
  };

  const scaleY = (ret: number) => {
    const clamped = Math.max(minRet, Math.min(maxRet, ret));
    return svgHeight - padding.bottom - ((clamped - minRet) / (maxRet - minRet)) * (svgHeight - padding.top - padding.bottom);
  };

  // Color según Sharpe Ratio
  const getSharpeColor = (sr: number) => {
    if (sr >= 1.2) return '#10b981'; // Emerald
    if (sr >= 0.7) return '#38bdf8'; // Sky
    if (sr >= 0.3) return '#fbbf24'; // Amber
    if (sr >= 0.0) return '#fb923c'; // Orange
    return '#f87171'; // Red
  };

  const totalCurrentWeight = userWeights.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6" id="markowitz-module-root">
      {/* HUD de Cabecera del Modelo de Markowitz */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif">
              Rentabilidad esperada frente a volatilidad
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-3xl leading-relaxed">
              Harry Markowitz demostró matemáticamente que <strong className="text-slate-900">la diversificación es el único "almuerzo gratis" en finanzas</strong>: combinar activos descorrelacionados reduce el riesgo global sin reducir proporcionalmente la rentabilidad esperada.
            </p>
          </div>

          {/* Selector de subpestañas */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white p-1.5 rounded-lg border border-slate-200 shrink-0 self-stretch lg:self-auto justify-between lg:justify-start">
              <button
                onClick={() => setActiveSubTab('frontier')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'frontier'
                    ? 'bg-slate-100 text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Frontera Eficiente</span>
              </button>
              <button
                onClick={() => setActiveSubTab('matrix')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'matrix'
                    ? 'bg-slate-100 text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Matriz Correlaciones</span>
              </button>
              <button
                onClick={() => setActiveSubTab('theory')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'theory'
                    ? 'bg-slate-100 text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Fundamento Teórico</span>
              </button>
            </div>

          </div>
        </div>

        {/* 4 KPIs Clave de la Cartera Actual de Markowitz */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-200">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Retorno Esperado E(Rp)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-mono mt-1">
              {(currentUserPortfolio.expectedReturn * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-slate-600 font-mono mt-0.5">
              Anualizado proyectado
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Volatilidad Cartera (σ_p)</span>
              <Activity className="w-3.5 h-3.5 text-blue-700" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-mono mt-1">
              {(currentUserPortfolio.volatility * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-slate-600 font-mono mt-0.5">
              Desviación estándar total
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Ratio de Sharpe</span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-mono mt-1">
              {currentUserPortfolio.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 font-mono mt-0.5">
              (E(Rp) - Rf) / σ_p
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Almuerzo Gratis</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-emerald-700 font-mono mt-1">
              -{currentUserPortfolio.diversificationRatio.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 font-mono mt-0.5">
              Riesgo eliminado por covarianza
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Universo de Activos para la Optimización */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-slate-600 font-bold font-mono flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            Universo para Markowitz:
          </span>
          <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setUniverseMode('active_portfolio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                universeMode === 'active_portfolio'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mi Cartera Activa ({portfolio.holdings.length} {portfolio.holdings.length === 1 ? 'activo' : 'activos'})</span>
            </button>
            <button
              onClick={() => setUniverseMode('full_market')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                universeMode === 'full_market'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Catálogo Completo ({companies.length})</span>
            </button>
            <button
              onClick={() => setUniverseMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                universeMode === 'custom'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Selección Libre ({customSelectedTickers.length})</span>
            </button>
          </div>
        </div>

        {onNavigateToMethodology && (
          <button
            onClick={onNavigateToMethodology}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-semibold transition-all shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentación Metodológica & Fórmulas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selector de tickers en modo 'custom' */}
      {universeMode === 'custom' && (
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">
              Marca o desmarca los activos que deseas incluir en la matriz de covarianza:
            </span>
            <span className="text-xs font-mono text-slate-700">
              {customSelectedTickers.length} seleccionados (mínimo 2)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {companies.map(c => {
              const isSelected = customSelectedTickers.includes(c.ticker);
              return (
                <button
                  key={c.ticker}
                  onClick={() => handleToggleTicker(c.ticker)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-600'}`} />
                  <span>{c.ticker}</span>
                  <span className="text-xs text-slate-600 font-sans font-normal truncate max-w-[90px]">
                    {c.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Aviso pedagógico si 'active_portfolio' tiene menos de 2 activos */}
      {universeMode === 'active_portfolio' && portfolio.holdings.length < 2 && (
        <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-slate-600 shrink-0" />
            <div className="text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Requisito Matemático de Markowitz:</strong> Se necesitan al menos 2 activos distintos comprados en tu cartera para calcular la covarianza (σ_ij) y el "Almuerzo Gratis". Actualmente posees {portfolio.holdings.length} activo(s).
            </div>
          </div>
          <button
            onClick={() => setUniverseMode('full_market')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold shrink-0 transition-all border border-slate-200"
          >
            Optimizar Catálogo Completo
          </button>
        </div>
      )}

      {/* VISTA 1: FRONTERA EFICIENTE & SIMULADOR DE ASIGNACIÓN */}
      {activeSubTab === 'frontier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lado Izquierdo: Gráfico SVG de la Frontera Eficiente de Markowitz */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  Frontera Eficiente de Markowitz
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Máximo Sharpe
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Mínima Varianza
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Tu Cartera
                </span>
              </div>
            </div>

            {/* Lienzo SVG Interactivo */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-72 sm:h-80">
                {/* Cuadrícula de Referencia */}
                {[0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40].map(vol => (
                  <g key={`x-${vol}`}>
                    <line
                      x1={scaleX(vol)}
                      y1={padding.top}
                      x2={scaleX(vol)}
                      y2={svgHeight - padding.bottom}
                      stroke="#C2C9C0"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={scaleX(vol)}
                      y={svgHeight - padding.bottom + 16}
                      fill="#5C665F"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {(vol * 100).toFixed(0)}%
                    </text>
                  </g>
                ))}

                {[0.00, 0.05, 0.10, 0.15, 0.20].map(ret => (
                  <g key={`y-${ret}`}>
                    <line
                      x1={padding.left}
                      y1={scaleY(ret)}
                      x2={svgWidth - padding.right}
                      y2={scaleY(ret)}
                      stroke="#C2C9C0"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={scaleY(ret) + 3}
                      fill="#5C665F"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {(ret * 100).toFixed(0)}%
                    </text>
                  </g>
                ))}

                {/* Ejes principales */}
                <line
                  x1={padding.left}
                  y1={svgHeight - padding.bottom}
                  x2={svgWidth - padding.right}
                  y2={svgHeight - padding.bottom}
                  stroke="#C2C9C0"
                  strokeWidth="1.5"
                />
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={svgHeight - padding.bottom}
                  stroke="#C2C9C0"
                  strokeWidth="1.5"
                />

                {/* Etiquetas de Ejes */}
                <text
                  x={(svgWidth + padding.left) / 2}
                  y={svgHeight - 12}
                  fill="#5C665F"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Volatilidad Anualizada σ_p (Riesgo)
                </text>
                <text
                  x={18}
                  y={(svgHeight + padding.top) / 2}
                  fill="#5C665F"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90, 18, ${(svgHeight + padding.top) / 2})`}
                >
                  Retorno Esperado E(R_p)
                </text>

                {/* Línea de Asignación de Capital (CAL) desde Rf */}
                <line
                  x1={scaleX(0)}
                  y1={scaleY(riskFreeRate)}
                  x2={scaleX(maxSharpePortfolio.volatility * 1.5)}
                  y2={scaleY(riskFreeRate + (maxSharpePortfolio.sharpeRatio * maxSharpePortfolio.volatility * 1.5))}
                  stroke="#1F6D46"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x={scaleX(0.24)}
                  y={scaleY(riskFreeRate + (maxSharpePortfolio.sharpeRatio * 0.24)) - 8}
                  fill="#1F6D46"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  CAL (Capital Allocation Line)
                </text>

                {/* Nube de Carteras Simuladas por Monte Carlo */}
                {simulatedPortfolios.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={scaleX(p.volatility)}
                    cy={scaleY(p.expectedReturn)}
                    r="3.5"
                    fill={getSharpeColor(p.sharpeRatio)}
                    opacity="0.45"
                    className="cursor-pointer hover:opacity-100 hover:r-5 transition-all"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* Curva de la Frontera Eficiente de Markowitz (Envolvente Superior) */}
                {frontierCurve.length > 1 && (
                  <path
                    d={`M ${frontierCurve.map(pt => `${scaleX(pt.volatility)},${scaleY(pt.expectedReturn)}`).join(' L ')}`}
                    fill="none"
                    stroke="#9A6D1C"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Activos individuales en el plano */}
                {assets.map(a => (
                  <g key={a.ticker}>
                    <rect
                      x={scaleX(a.volatility) - 4}
                      y={scaleY(a.expectedReturn) - 4}
                      width="8"
                      height="8"
                      fill="#5C665F"
                      transform={`rotate(45, ${scaleX(a.volatility)}, ${scaleY(a.expectedReturn)})`}
                    />
                    <text
                      x={scaleX(a.volatility) + 7}
                      y={scaleY(a.expectedReturn) + 3}
                      fill="#4F5851"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {a.ticker}
                    </text>
                  </g>
                ))}

                {/* Punto Mínima Varianza Global (GMV) */}
                <circle
                  cx={scaleX(minVariancePortfolio.volatility)}
                  cy={scaleY(minVariancePortfolio.expectedReturn)}
                  r="7"
                  fill="#36557F"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Punto Máximo Sharpe (Cartera Tangente) */}
                <circle
                  cx={scaleX(maxSharpePortfolio.volatility)}
                  cy={scaleY(maxSharpePortfolio.expectedReturn)}
                  r="8"
                  fill="#1F6D46"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Punto Cartera Real del Simulador (si existe) */}
                {realCurrentPortfolio && (
                  <g>
                    <circle
                      cx={scaleX(realCurrentPortfolio.volatility)}
                      cy={scaleY(realCurrentPortfolio.expectedReturn)}
                      r="6"
                      fill="#7C5617"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={scaleX(realCurrentPortfolio.volatility) + 8}
                      y={scaleY(realCurrentPortfolio.expectedReturn) + 4}
                      fill="#B8872A"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Cartera Actual Simulador
                    </text>
                  </g>
                )}

                {/* Punto Seleccionado por el Usuario con los Deslizadores */}
                <g>
                  <circle
                    cx={scaleX(currentUserPortfolio.volatility)}
                    cy={scaleY(currentUserPortfolio.expectedReturn)}
                    r="9"
                    fill="#9A6D1C"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  <circle
                    cx={scaleX(currentUserPortfolio.volatility)}
                    cy={scaleY(currentUserPortfolio.expectedReturn)}
                    r="14"
                    fill="none"
                    stroke="#9A6D1C"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                </g>
              </svg>

              {/* Tooltip de cartera al pasar el cursor */}
              {hoveredPoint && (
                <div className="absolute top-4 right-4 bg-white border border-slate-300 p-3 rounded-xl text-xs font-mono space-y-1 pointer-events-none">
                  <div className="text-slate-900 font-bold">Cartera Simulada</div>
                  <div className="text-slate-700">Retorno: <strong>{(hoveredPoint.expectedReturn * 100).toFixed(2)}%</strong></div>
                  <div className="text-slate-700">Volatilidad: <strong>{(hoveredPoint.volatility * 100).toFixed(2)}%</strong></div>
                  <div className="text-slate-700">Ratio Sharpe: <strong style={{ color: getSharpeColor(hoveredPoint.sharpeRatio) }}>{hoveredPoint.sharpeRatio.toFixed(2)}</strong></div>
                </div>
              )}
            </div>

            {/* Leyenda pedagógica de puntos clave */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Máximo Sharpe
                </div>
                <div className="text-xs text-slate-700 mt-1 font-mono">
                  E(R): {(maxSharpePortfolio.expectedReturn * 100).toFixed(1)}% · σ: {(maxSharpePortfolio.volatility * 100).toFixed(1)}% · SR: {maxSharpePortfolio.sharpeRatio.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                <div className="flex items-center gap-1.5 font-bold text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Mínima Varianza
                </div>
                <div className="text-xs text-slate-700 mt-1 font-mono">
                  E(R): {(minVariancePortfolio.expectedReturn * 100).toFixed(1)}% · σ: {(minVariancePortfolio.volatility * 100).toFixed(1)}% · SR: {minVariancePortfolio.sharpeRatio.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  Tu Asignación
                </div>
                <div className="text-xs text-slate-700 mt-1 font-mono">
                  E(R): {(currentUserPortfolio.expectedReturn * 100).toFixed(1)}% · σ: {(currentUserPortfolio.volatility * 100).toFixed(1)}% · SR: {currentUserPortfolio.sharpeRatio.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Lado Derecho: Controles de Asignación de Pesos de Markowitz */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Ponderaciones de Cartera (w_i)
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                    Math.abs(totalCurrentWeight - 1.0) < 0.01
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {(totalCurrentWeight * 100).toFixed(0)}% Total
                  </span>
                  {Math.abs(totalCurrentWeight - 1.0) >= 0.01 && (
                    <button
                      onClick={handleNormalizeWeights}
                      className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold"
                      title="Ajustar proporcionalmente para que sume 100%"
                    >
                      Ajustar a 100%
                    </button>
                  )}
                </div>
              </div>

              {/* Botones de Presets Óptimos */}
              <div className={`grid ${realCurrentPortfolio ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 text-xs`}>
                <button
                  onClick={() => applyPreset('maxSharpe')}
                  className="py-1.5 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 font-bold transition-all text-center"
                  title="Cartera Tangente que maximiza el Ratio de Sharpe"
                >
                  Máx. Sharpe
                </button>
                <button
                  onClick={() => applyPreset('minVariance')}
                  className="py-1.5 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 font-bold transition-all text-center"
                  title="Cartera con la menor volatilidad posible"
                >
                  Mín. Varianza
                </button>
                <button
                  onClick={() => applyPreset('equal')}
                  className="py-1.5 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 font-bold transition-all text-center"
                  title="Ponderación homogénea 1/N"
                >
                  1/N
                </button>
                {realCurrentPortfolio && (
                  <button
                    onClick={() => applyPreset('myRealPortfolio')}
                    className="py-1.5 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 font-bold transition-all text-center"
                    title="Cargar los pesos reales de tu cartera actual en el simulador"
                  >
                    Mi Cartera
                  </button>
                )}
              </div>

              {/* Lista de Deslizadores de Activos */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                {assets.map((asset, idx) => {
                  const weightPercent = (userWeights[idx] || 0) * 100;
                  const isSpeculative = asset.ticker === 'HYPE';
                  return (
                    <div
                      key={asset.ticker}
                      className={`p-3 rounded-lg border transition-all ${
                        isSpeculative
                          ? 'bg-rose-950/20 border-rose-900/40'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {asset.ticker}
                          </span>
                          <span className="text-xs text-slate-600 truncate max-w-[130px]">
                            {asset.name}
                          </span>
                          {isSpeculative && (
                            <span className="text-xs px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold">
                              Especulativa
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 font-mono">
                            E(R): {(asset.expectedReturn * 100).toFixed(1)}% · σ: {(asset.volatility * 100).toFixed(0)}%
                          </span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">
                            {weightPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(weightPercent)}
                          onChange={e => handleWeightChange(idx, parseFloat(e.target.value))}
                          className="flex-1 accent-slate-400 h-1.5 bg-slate-50 rounded-lg cursor-pointer"
                        />
                        <div className="text-xs font-mono text-slate-600 w-16 text-right">
                          ${((portfolio.totalValue || 100000) * (weightPercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón de Acción: Rebalancear en el Simulador */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                onClick={handleExecuteRebalance}
                className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Aplicar Ponderaciones de Markowitz a mi Cartera ($100k)</span>
              </button>

              {rebalanceSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Cartera rebalanceada con éxito según las proporciones de Markowitz!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: MATRIZ DE CORRELACIONES TÉRMICA */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                Correlaciones entre acciones
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Valores entre -1.0 (descorrelación perfecta) y +1.0 (correlación idéntica). Los valores bajos (&lt; 0.40) proporcionan el mayor beneficio de diversificación.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> &lt; 0.20 (Óptima)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> 0.20 - 0.40</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-600 inline-block" /> &gt; 0.40</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-mono font-bold text-slate-600 border-b border-slate-200">Activo</th>
                  {assets.map(a => (
                    <th key={a.ticker} className="p-2 font-mono font-bold text-slate-700 border-b border-slate-200">
                      {a.ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {assets.map((rowAsset, i) => (
                  <tr key={rowAsset.ticker} className="hover:bg-slate-50">
                    <td className="p-2.5 text-left font-bold text-slate-900 font-mono flex items-center gap-2">
                      <span className="text-slate-900 font-bold">{rowAsset.ticker}</span>
                      <span className="text-xs text-slate-600 hidden sm:inline">{rowAsset.name}</span>
                    </td>
                    {assets.map((colAsset, j) => {
                      const corr = correlationMatrix[i][j];
                      const isSelf = i === j;
                      let bg = 'bg-white';
                      let text = 'text-slate-700';
                      if (isSelf) {
                        bg = 'bg-slate-50';
                        text = 'text-slate-900 font-bold';
                      } else if (corr < 0.15) {
                        bg = 'bg-emerald-900/40';
                        text = 'text-emerald-700 font-bold';
                      } else if (corr < 0.35) {
                        bg = 'bg-blue-900/40';
                        text = 'text-blue-700';
                      } else {
                        bg = 'bg-slate-50';
                        text = 'text-slate-700';
                      }

                      return (
                        <td key={colAsset.ticker} className="p-2.5">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${bg} ${text}`}>
                            {corr.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <span className="font-bold text-slate-900 block">Intuición Financiera de Markowitz:</span>
            <p className="leading-relaxed">
              Fíjate en cómo activos defensivos como <strong>Johnson & Johnson (JNJ)</strong> y <strong>Coca-Cola (KO)</strong> presentan correlaciones reducidas con <strong>Apple (AAPL)</strong> e incluso casi nulas frente a la especulación tecnológica. Al mezclar activos con covarianzas bajas, los vaivenes negativos de unos se amortiguan con la solidez de otros, permitiendo elevar el Ratio de Sharpe de la cartera total muy por encima de lo que lograrías comprando una sola acción.
            </p>
          </div>
        </div>
      )}

      {/* VISTA 3: FUNDAMENTO TEÓRICO & FÓRMULAS */}
      {activeSubTab === 'theory' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-600" />
              El modelo media-varianza
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Formulación rigurosa propuesta por Harry Markowitz en 1952 en su ensayo <em>Portfolio Selection</em> publicado en el <em>Journal of Finance</em>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fórmula 1: Retorno Esperado */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 font-mono">
                1. Retorno Esperado de la Cartera
              </div>
              <div className="p-3 bg-white rounded-xl font-mono text-sm text-center text-slate-900 font-bold">
                E(R_p) = ∑ w_i · E(R_i) = w^T R
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                El retorno esperado de un portafolio es una combinación lineal ponderada de las rentabilidades esperadas de cada acción individual según su peso <code className="text-slate-900 font-semibold">w_i</code>.
              </p>
            </div>

            {/* Fórmula 2: Varianza y Covarianza */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 font-mono">
                2. Varianza de la Cartera (Riesgo No Lineal)
              </div>
              <div className="p-3 bg-white rounded-xl font-mono text-sm text-center text-slate-900 font-bold">
                σ_p² = w^T Σ w = ∑∑ w_i w_j σ_ij
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                A diferencia del retorno, <strong>el riesgo no es el promedio ponderado</strong>: el término cruzado de covarianza <code className="text-slate-900 font-semibold">σ_ij = ρ_ij · σ_i · σ_j</code> destruye volatilidad si los activos no se mueven al unísono.
              </p>
            </div>

            {/* Fórmula 3: Cartera Tangente y Ratio de Sharpe */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 font-mono">
                3. Ratio de Sharpe & Cartera Tangente
              </div>
              <div className="p-3 bg-white rounded-xl font-mono text-sm text-center text-slate-900 font-bold">
                SR_p = [ E(R_p) - R_f ] / σ_p
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Mide el exceso de rentabilidad sobre el activo libre de riesgo <code className="text-slate-900 font-semibold">R_f (Letras del Tesoro)</code> por cada unidad de volatilidad asumida. El punto de tangencia de la Frontera Eficiente con la CAL maximiza este indicador.
              </p>
            </div>

            {/* Fórmula 4: Relación con el Value Investing de Buffett */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 font-mono">
                4. Convergencia Markowitz + Warren Buffett
              </div>
              <div className="p-3 bg-white rounded-xl font-mono text-sm text-center text-emerald-700 font-bold">
                Calidad S(a) ≥ 80 + Descorrelación = Resiliencia
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Warren Buffett no diversifica a ciegas (no compra activos mediocres solo para sumar empresas). Selecciona únicamente compañías con <strong>foso económico (Moat)</strong> y <strong>balance sólido</strong>, y utiliza la descorrelación natural entre conglomerados (BRK), consumo básico (KO) y salud (JNJ).
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
