import React, { useState } from 'react';
import { CompanyAnalysis, PortfolioStats, PortfolioHolding, PortfolioTransaction } from '../types';
import { MarkowitzOptimizer } from './MarkowitzOptimizer';
import { TrackingErrorCard } from './TrackingErrorCard';
import { InfoTooltip } from './SmartTooltip';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  DollarSign,
  History,
  Info,
  LineChart,
  PieChart,
  Repeat,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react';

interface PortfolioSimulatorProps {
  companies: CompanyAnalysis[];
  portfolio: PortfolioStats;
  onExecuteTrade: (ticker: string, type: 'BUY' | 'SELL', shares: number) => void;
  onResetPortfolio: () => void;
  selectedTickerForTrade?: string;
  onShowInstantFeedback: (biasTitle: string, message: string, errorType: string, solution: string) => void;
  onApplyMarkowitzAllocations?: (allocations: { ticker: string; weight: number; shares: number; price: number }[]) => void;
  onNavigateToMethodology?: () => void;
}

export const PortfolioSimulator: React.FC<PortfolioSimulatorProps> = ({
  companies,
  portfolio,
  onExecuteTrade,
  onResetPortfolio,
  selectedTickerForTrade,
  onShowInstantFeedback,
  onApplyMarkowitzAllocations,
  onNavigateToMethodology
}) => {
  const [subView, setSubView] = useState<'trading' | 'markowitz'>('trading');
  const [tradeTicker, setTradeTicker] = useState(selectedTickerForTrade || 'BRK.B');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeShares, setTradeShares] = useState<number>(10);

  const selectedStock = companies.find(c => c.ticker === tradeTicker) || companies[0];
  const existingHolding = portfolio.holdings.find(h => h.ticker === tradeTicker);
  const tradeCost = tradeShares * (selectedStock ? selectedStock.raw.precioCotizacion : 0);

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || tradeShares <= 0) return;

    // Behavioral Checks for immediate cognitive feedback
    if (tradeType === 'BUY' && selectedStock.ticker === 'HYPE') {
      onShowInstantFeedback(
        'Alerta de Sesgo: Trampa Especulativa',
        `Has intentado comprar ${selectedStock.nombre} (HYPE), una compañía con EBIT negativo (-$110M) y sin margen de seguridad. Comprar activos sin beneficios reales no es inversión en valor, sino pura lotería especulativa.`,
        'Falta de Margen de Seguridad & Moat',
        'Enfócate en empresas con historial comprobado de ROE > 15%, baja deuda y marcas con foso defensivo.'
      );
    } else if (portfolio.transactions.length >= 4) {
      onShowInstantFeedback(
        'Alerta de Sesgo: Sobreoperativa (Overtrading)',
        `Has alcanzado ${portfolio.transactions.length + 1} operaciones en el simulador. Warren Buffett enseña que los inversores inteligentes toman muy pocas decisiones de asignación de capital al año y dejan que la capitalización compuesta haga el trabajo pesado.`,
        'Hiperactividad y Ansiedad Financiera',
        'Reduce la frecuencia de compra/venta. La paciencia disciplinada es el mayor generador de alfa a largo plazo.'
      );
    }

    onExecuteTrade(tradeTicker, tradeType, tradeShares);
  };

  const getSharpeStatusColor = (sr: number) => {
    if (sr >= 1.2) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (sr >= 0.7) return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
    if (sr >= 0) return 'text-slate-300 bg-white/10 border-white/20';
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mitigating Overtrading & Promoting Compounding */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-lg shadow-black/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Módulo 2: Simulador de Inversiones & Modelo de Markowitz
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-semibold border border-white/10">
              Capital Inicial: $100,000 Simulado
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1 font-serif">
            Gestión Disciplinada de Portafolio & Optimización Cuantitativa
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            El objetivo no es apostar a la suerte, sino <strong>maximizar el Ratio de Sharpe</strong>, aplicar la <strong>Frontera Eficiente de Markowitz</strong> y mantener un <strong>Scoring Linear S(a)</strong> alto en tu cartera sin sesgos de sobreoperativa.
          </p>
        </div>
        <button
          onClick={onResetPortfolio}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-white/10 shrink-0 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar Cartera</span>
        </button>
      </div>

      {/* Selector de Modo: Operaciones vs Modelo de Markowitz */}
      <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setSubView('trading')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'trading'
                ? 'bg-white/10 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Operaciones & Cartera ($100k)</span>
          </button>
          <button
            onClick={() => setSubView('markowitz')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'markowitz'
                ? 'bg-white/10 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Modelo de Markowitz & Frontera Eficiente</span>
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 pr-3">
          <span>Sharpe Actual:</span>
          <strong className="text-white">{portfolio.sharpeRatio.toFixed(2)}</strong>
        </div>
      </div>

      {subView === 'markowitz' ? (
        <MarkowitzOptimizer
          companies={companies}
          portfolio={portfolio}
          onApplyPortfolioWeights={onApplyMarkowitzAllocations}
          onNavigateToMethodology={onNavigateToMethodology}
        />
      ) : (
        <div className="space-y-6">
          {/* Portfolio Financial & Risk KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Valor Total de Cartera</span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={portfolio.totalReturn >= 0 ? 'text-emerald-400 font-bold flex items-center' : 'text-rose-400 font-bold flex items-center'}>
              {portfolio.totalReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {portfolio.totalReturn >= 0 ? `+$${portfolio.totalReturn.toFixed(2)}` : `-$${Math.abs(portfolio.totalReturn).toFixed(2)}`} ({portfolio.totalReturnPercent.toFixed(2)}%)
            </span>
            <span className="text-slate-500 font-medium">vs inicial</span>
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>Efectivo: <strong className="text-slate-200 font-mono">${portfolio.cash.toFixed(2)}</strong></span>
            <span>Invertido: <strong className="text-slate-200 font-mono">${portfolio.investedValue.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Ratio de Sharpe */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ratio de Sharpe (SR_p)</span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {portfolio.sharpeRatio.toFixed(2)}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSharpeStatusColor(portfolio.sharpeRatio)}`}>
              {portfolio.sharpeRatio >= 1.2 ? 'Excelente' : portfolio.sharpeRatio >= 0.7 ? 'Bueno' : 'Bajo'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            SR = (E(Rp) - Rf) / σ_p
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
            Premia retornos con <em>baja volatilidad</em> y castiga apuestas erráticas.
          </div>
        </div>

        {/* Volatilidad Muestral (Riesgo) */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Volatilidad Muestral (σ_p)</span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {(portfolio.volatilidadMuestral * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-slate-400">desv. estándar</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate">
            σ_p = √[ Σ(Rp,t - Rp_avg)² / (N-1) ]
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
            E(Rp): <strong className="text-slate-200">{(portfolio.expectedReturn * 100).toFixed(1)}%</strong> · Rf: <strong className="text-slate-200">4.0%</strong>
          </div>
        </div>

        {/* Calidad Media de Cartera (Linear Score Promedio) */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Calidad Media Cartera</span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {portfolio.averageCompanyScore.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400">/100 pts S(a)</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Media ponderada por valor de cada acción.
          </div>
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex justify-between">
            <span>Operaciones: <strong className="text-slate-200">{portfolio.transactions.length}</strong></span>
            <span>Posiciones: <strong className="text-slate-200">{portfolio.holdings.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Behavioral Bias Detection Alerts Banner */}
      {portfolio.detectedBiases && portfolio.detectedBiases.length > 0 && (
        <div className="space-y-3">
          {portfolio.detectedBiases.map((b, idx) => (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-3.5 backdrop-blur-xl ${
                b.severity === 'danger'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900 border-slate-700 text-slate-200 shadow-lg shadow-black/20'
              }`}
            >
              <div className={`p-2 rounded-2xl shrink-0 ${b.severity === 'danger' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-300'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {b.bias}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    b.severity === 'danger' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/10 text-slate-300 border border-white/20'
                  }`}>
                    {b.severity === 'danger' ? 'Sesgo Crítico' : 'Alerta Conductual'}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {b.description}
                </p>
                <p className="text-white font-bold pt-1">
                  Recomendación de Warren: {b.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Trading Form & Active Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trade Execution Panel (iOS Styled Card) */}
        <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg shadow-black/20 h-fit space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Repeat className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Operar en el Simulador
            </h3>
          </div>

          <form onSubmit={handleTradeSubmit} className="space-y-4 text-xs">
            {/* iOS Segmented Control for BUY / SELL */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setTradeType('BUY')}
                className={`py-2 rounded-xl font-bold transition-all ${
                  tradeType === 'BUY'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Comprar (Long)
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SELL')}
                className={`py-2 rounded-xl font-bold transition-all ${
                  tradeType === 'SELL'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vender
              </button>
            </div>

            {/* Select Stock */}
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                Seleccionar Empresa
              </label>
              <select
                value={tradeTicker}
                onChange={e => setTradeTicker(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-slate-400 font-mono text-xs shadow-inner"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.ticker}>
                    {c.ticker} - {c.nombre} (${c.raw.precioCotizacion.toFixed(2)}) · Nota {c.scoreGrade}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Stock Mini Summary */}
            {selectedStock && (
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Precio actual:</span>
                  <span className="font-mono font-bold text-white">
                    ${selectedStock.raw.precioCotizacion.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scoring Linear S(a):</span>
                  <span className="font-bold text-white font-mono">
                    {selectedStock.linearScore}/100 ({selectedStock.scoreGrade})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center">
                    Potencial Alcista:
                    <InfoTooltip concept="margenSeguridad" />
                  </span>
                  <span className={selectedStock.targetConsensus?.upside_potential > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {selectedStock.targetConsensus ? `${selectedStock.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(selectedStock.targetConsensus.upside_potential * 10) / 10}%` : 'N/D'}
                  </span>
                </div>
                {existingHolding && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-slate-300">
                    <span>En cartera actualmente:</span>
                    <span className="font-mono font-bold">{existingHolding.shares} títulos</span>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Error (Risk Tracking) for the selected stock */}
            {selectedStock && (
              <TrackingErrorCard
                ticker={selectedStock.ticker}
                companyName={selectedStock.nombre}
                benchmark="^GSPC"
                period="1y"
                compact
              />
            )}

            {/* Number of Shares & Quick Pick Pills */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-400 font-medium">Número de Acciones</label>
                <div className="flex gap-1">
                  {[5, 10, 25, 50].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTradeShares(amt)}
                      className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-mono border border-white/5"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                max={tradeType === 'SELL' && existingHolding ? existingHolding.shares : 5000}
                value={tradeShares}
                onChange={e => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-white font-mono focus:outline-none focus:border-slate-400 shadow-inner"
              />
            </div>

            {/* Total Estimated Cost */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 flex justify-between items-center">
              <span className="text-slate-300 font-medium">Importe Total Estimado:</span>
              <span className="text-base font-bold font-mono text-white">
                ${tradeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Submit Trade Button */}
            <button
              type="submit"
              disabled={tradeType === 'BUY' && tradeCost > portfolio.cash}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all shadow-md active:scale-95 ${
                tradeType === 'BUY' && tradeCost > portfolio.cash
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : (!existingHolding && tradeType === 'SELL') || (existingHolding && existingHolding.shares < tradeShares && tradeType === 'SELL')
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {tradeType === 'BUY'
                ? tradeCost > portfolio.cash ? 'Saldo insuficiente en efectivo' : `Comprar ${tradeShares} acciones de ${tradeTicker}`
                : !existingHolding ? 'No tienes acciones para vender' : `Vender ${tradeShares} acciones de ${tradeTicker}`}
            </button>
          </form>
        </div>

        {/* Right: Portfolio Holdings Table & Transaction History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Holdings Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-400" />
                Posiciones Actuales en Cartera ({portfolio.holdings.length})
              </h3>
              <span className="text-xs text-slate-400">
                Efectivo no invertido: <strong className="text-white font-mono">${portfolio.cash.toFixed(2)}</strong>
              </span>
            </div>

            {portfolio.holdings.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl space-y-2">
                <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Aún no tienes activos en cartera. Utiliza el panel de la izquierda para adquirir tus primeras acciones basadas en análisis fundamental.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Activo</th>
                      <th className="pb-3 font-semibold">Títulos</th>
                      <th className="pb-3 font-semibold">Precio Compra</th>
                      <th className="pb-3 font-semibold">Cotización</th>
                      <th className="pb-3 font-semibold">Valor Total</th>
                      <th className="pb-3 font-semibold">P&L Latente</th>
                      <th className="pb-3 font-semibold text-center">Score S(a)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {portfolio.holdings.map(h => (
                      <tr key={h.ticker} className="hover:bg-slate-800/30">
                        <td className="py-3 font-mono font-bold text-white">
                          {h.ticker}
                        </td>
                        <td className="py-3 text-slate-300 font-mono">
                          {h.shares}
                        </td>
                        <td className="py-3 text-slate-400 font-mono">
                          ${h.avgBuyPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-slate-200 font-mono">
                          ${h.currentPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-white font-mono font-semibold">
                          ${h.totalValue.toFixed(2)}
                        </td>
                        <td className={`py-3 font-mono font-semibold ${h.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.unrealizedPnL >= 0 ? `+$${h.unrealizedPnL.toFixed(2)}` : `-$${Math.abs(h.unrealizedPnL).toFixed(2)}`} ({h.unrealizedPnLPercent.toFixed(1)}%)
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-bold text-slate-200 bg-white/10 px-2 py-0.5 rounded text-[11px] border border-white/10">
                            {h.linearScore} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction History & Bias Flags */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Historial de Decisiones de Trading ({portfolio.transactions.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Auditoría de sesgos conductuales
              </span>
            </div>

            {portfolio.transactions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay transacciones registradas.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {portfolio.transactions.slice().reverse().map(tx => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-950/60 rounded-2xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tx.type === 'BUY' ? 'COMPRA' : 'VENTA'}
                      </span>
                      <span className="font-mono font-bold text-white">
                        {tx.shares}x {tx.ticker}
                      </span>
                      <span className="text-slate-400">
                        a ${tx.price.toFixed(2)} (${tx.total.toFixed(2)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tx.biasFlag && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300 border border-white/10 font-semibold">
                          {tx.biasFlag}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        {tx.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
  );
};
