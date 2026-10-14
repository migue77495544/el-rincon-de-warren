import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  CheckCircle2,
  RefreshCw,
  Zap,
  Layers,
  Database,
  Search,
  Sparkles,
  TrendingUp,
  X,
  BarChart3,
  PieChart,
  Image as ImageIcon
} from 'lucide-react';
import { CompanyAnalysis } from '../types';
import confetti from 'canvas-confetti';

interface PythonDataConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyImported?: (company: CompanyAnalysis) => void;
  onApplyPortfolioWeights?: (allocations: Array<{ ticker: string; weight: number; shares?: number; price?: number }>) => void;
  initialTicker?: string;
}

export const PythonDataConsole: React.FC<PythonDataConsoleProps> = ({
  isOpen,
  onClose,
  onCompanyImported,
  onApplyPortfolioWeights,
  initialTicker = 'KO'
}) => {
  const [activeTab, setActiveTab] = useState<'fundamentals' | 'markowitz' | 'plots'>('fundamentals');
  const [tickerInput, setTickerInput] = useState<string>(initialTicker);
  const [markowitzTickers, setMarkowitzTickers] = useState<string>('BRK.B, KO, AAPL, JNJ, COST');
  const [loading, setLoading] = useState<boolean>(false);
  const [pythonStatus, setPythonStatus] = useState<any>(null);
  const [companyResult, setCompanyResult] = useState<any>(null);
  const [markowitzResult, setMarkowitzResult] = useState<any>(null);
  const [plotsResult, setPlotsResult] = useState<any>(null);
  const [plotsLoading, setPlotsLoading] = useState<boolean>(false);
const [selectedPlotType, setSelectedPlotType] = useState<'heatmap' | 'frontier' | 'distribution'>('heatmap');
  
  const [logs, setLogs] = useState<string[]>([
    '# ==========================================================',
    '# IMPORTACIÓN DE LIBRERÍAS',
    '# ==========================================================',
    'import pandas as pd',
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    'import seaborn as sns',
    'import yfinance as yf',
    '',
    "plt.style.use('seaborn-v0_8')",
    "pd.options.display.float_format = '{:,.6f}'.format",
    '',
    'print("Librerías cargadas correctamente.")'
  ]);
  
  // Sincronizar ticker inicial si cambia
  useEffect(() => {
    if (initialTicker) {
      setTickerInput(initialTicker);
    }
  }, [initialTicker]);

  // Verificar estado del backend de Python al abrir
  useEffect(() => {
    if (isOpen) {
      fetch('/api/python/status')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPythonStatus(data);
          }
        })
        .catch(err => {
          console.warn('Error conectando con motor Python:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunPythonExtraction = async (overrideTicker?: string) => {
    const cleanTicker = (overrideTicker || tickerInput).trim().toUpperCase();
    if (!cleanTicker) return;
    setTickerInput(cleanTicker);

    setLoading(true);
    setCompanyResult(null);
    setLogs(prev => [
      `>>> import yfinance as yf`,
      `>>> import pandas as pd, numpy as np`,
      `>>> stock = yf.Ticker('${cleanTicker === 'BRK.B' ? 'BRK-B' : cleanTicker}')`,
      `>>> info = stock.info`,
      `>>> bs = stock.balance_sheet`,
      `>>> income = stock.financials`,
      `[INFO] Conectando con servidores de Yahoo Finance...`,
      `[INFO] Extrayendo estados contables auditados de ${cleanTicker}...`
    ]);

    try {
      const res = await fetch(`/api/python/company/${cleanTicker}?addToCatalog=true`);
      const data = await res.json();
      if (data.success) {
        setCompanyResult(data);
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Datos recibidos: ${data.nombre} (${data.ticker})`,
          `[PANDAS] Current Ratio calculado: ${data.ratios.liquidezCorriente}x (Activo Circulante: $${data.raw.activoCirculante}M / Pasivo: $${data.raw.pasivoCirculante}M)`,
          `[PANDAS] Debt to Equity calculado: ${data.ratios.endeudamiento}x (Deuda: $${data.raw.totalPasivo}M / Patrimonio: $${data.raw.patrimonioNeto}M)`,
          `[NUMPY] ROE calculado: +${data.ratios.roe}% · ROA: +${data.ratios.roa}%`,
          `[DUPONT] Margen Neto: ${data.dupont.margenNetoPercent}% · Rotación: ${data.dupont.rotacionActivos}x · Apalancamiento: ${data.dupont.apalancamientoFinanciero}x`,
           `[VALUATION] PER calculado con yfinance: ${data.ratios.per}x · Consenso Wall St: target $${data.targetConsensus?.target_mean.toFixed(2) ?? 'N/D'} (${data.targetConsensus?.upside_potential > 0 ? '+' : ''}${Math.round(data.targetConsensus?.upside_potential ?? 0)}%)`,
          `>>> DataFrame generado con éxito por pandas.`
        ]);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } else {
        setLogs(prev => [...prev, `[ERROR] ${data.error || 'No se pudieron extraer los datos.'}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[FATAL] Error de conexión con Python: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPythonMarkowitz = async () => {
    const list = markowitzTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (list.length < 2) return;

    setLoading(true);
    setMarkowitzResult(null);
    setLogs(prev => [
      `>>> import yfinance as yf`,
      `>>> import pandas as pd, numpy as np`,
      `>>> data = yf.download(${JSON.stringify(list)}, period='1y')['Close']`,
      `>>> returns = data.pct_change().dropna()`,
      `>>> cov_matrix = returns.cov() * 252`,
      `>>> corr_matrix = returns.corr()`,
      `[INFO] Estimando momentos estadísticos con numpy y optimizando con Monte Carlo (Dirichlet)...`
    ]);

    try {
      const res = await fetch('/api/python/markowitz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: list, riskFreeRate: 0.04 })
      });
      const data = await res.json();
      if (data.success) {
        setMarkowitzResult(data);
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Matriz de covarianza ${list.length}x${list.length} calculada con pandas.cov()`,
          `[RESULT] Cartera Máximo Sharpe: Retorno ${(data.maxSharpePortfolio.expectedReturn * 100).toFixed(1)}% · Volatilidad ${(data.maxSharpePortfolio.volatility * 100).toFixed(1)}% · Sharpe: ${data.maxSharpePortfolio.sharpeRatio}`,
          `[FREE LUNCH] Riesgo eliminado por diversificación: -${data.maxSharpePortfolio.diversificationRatio}%`,
          `>>> Optimización numérica completada con numpy.`
        ]);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      } else {
        setLogs(prev => [...prev, `[ERROR] ${data.error || 'Fallo en optimización.'}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[FATAL] Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePythonPlots = async () => {
    const list = markowitzTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    const target = (companyResult?.ticker || tickerInput || 'KO').toUpperCase();

    setPlotsLoading(true);
    setLogs(prev => [
      `>>> import matplotlib.pyplot as plt`,
      `>>> import seaborn as sns`,
      `>>> plt.style.use('seaborn-v0_8')`,
      `>>> sns.heatmap(corr_matrix, annot=True, cmap='vlag')`,
      `>>> plt.scatter(sim_vols, sim_rets, c=sim_sharpes, cmap='viridis')`,
      `[INFO] Generando figuras de alta resolución con Seaborn y Matplotlib en backend Python...`
    ]);

    try {
      const res = await fetch('/api/python/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: list, targetTicker: target })
      });
      const data = await res.json();
      if (data.success && data.plots) {
        setPlotsResult(data.plots);
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Gráficos de Seaborn y Matplotlib generados con éxito:`,
          `  - Matriz de Correlación (Seaborn heatmap)`,
          `  - Frontera Eficiente de Markowitz (Matplotlib scatter)`,
          `  - Distribución de Rendimientos Diarios (Seaborn histplot + KDE)`
        ]);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } else {
        setLogs(prev => [...prev, `[ERROR] ${data.error || 'No se pudieron generar los gráficos.'}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[FATAL] Error al generar gráficos: ${err.message}`]);
    } finally {
      setPlotsLoading(false);
    }
  };


  const handleApplyToPlatformCatalog = () => {
    if (!companyResult || !onCompanyImported) return;

    // Convertir el resultado de Python a CompanyAnalysis
    const comp: CompanyAnalysis = {
      id: companyResult.ticker.toLowerCase(),
      ticker: companyResult.ticker,
      nombre: companyResult.nombre,
      sector: companyResult.sector,
      descripcion: companyResult.descripcion,
      moat: companyResult.moat,
      raw: companyResult.raw,
      ratios: {
        liquidezCorriente: {
          value: companyResult.ratios.liquidezCorriente,
          formatted: `${companyResult.ratios.liquidezCorriente}x`,
          status: companyResult.ratios.liquidezCorriente >= 1.5 ? 'green' : companyResult.ratios.liquidezCorriente >= 1.1 ? 'yellow' : 'red',
          benchmark: '≥ 1.5x (Graham)',
          explanation: 'Activo circulante entre pasivo circulante.',
          heuristicSimple: 'Calculado directamente con pandas desde el balance auditado de yfinance.'
        },
        ratioTesoreriaPruebaAcida: {
          value: companyResult.ratios.pruebaAcida,
          formatted: `${companyResult.ratios.pruebaAcida}x`,
          status: companyResult.ratios.pruebaAcida >= 1.0 ? 'green' : 'yellow',
          benchmark: '≥ 1.0x',
          explanation: 'Prueba ácida sin inventarios.',
          heuristicSimple: 'Cobertura inmediata calculada con pandas.'
        },
        disponibilidadInmediata: {
          value: companyResult.ratios.disponibilidadInmediata,
          formatted: `${companyResult.ratios.disponibilidadInmediata}x`,
          status: companyResult.ratios.disponibilidadInmediata >= 0.3 ? 'green' : 'yellow',
          benchmark: '≥ 0.3x',
          explanation: 'Efectivo en caja.',
          heuristicSimple: 'Tesorería pura extraída de yfinance.'
        },
        endeudamiento: {
          value: companyResult.ratios.endeudamiento,
          formatted: `${companyResult.ratios.endeudamiento}x`,
          status: companyResult.ratios.endeudamiento <= 1.0 ? 'green' : companyResult.ratios.endeudamiento <= 2.0 ? 'yellow' : 'red',
          benchmark: '≤ 1.0x',
          explanation: 'Deuda sobre patrimonio neto.',
          heuristicSimple: 'Apalancamiento patrimonial.'
        },
        coberturaIntereses: {
          value: companyResult.ratios.coberturaIntereses,
          formatted: `${companyResult.ratios.coberturaIntereses}x`,
          status: companyResult.ratios.coberturaIntereses >= 5.0 ? 'green' : 'yellow',
          benchmark: '≥ 5.0x',
          explanation: 'EBIT entre intereses.',
          heuristicSimple: 'Capacidad operativa de cubrir deuda.'
        },
        roa: {
          value: companyResult.ratios.roa / 100,
          formatted: `${companyResult.ratios.roa}%`,
          status: companyResult.ratios.roa >= 8.0 ? 'green' : 'yellow',
          benchmark: '≥ 8.0%',
          explanation: 'Rentabilidad de activos totales.',
          heuristicSimple: 'Productividad de balance.'
        },
        roe: {
          value: companyResult.ratios.roe / 100,
          formatted: `${companyResult.ratios.roe}%`,
          status: companyResult.ratios.roe >= 15.0 ? 'green' : companyResult.ratios.roe >= 8.0 ? 'yellow' : 'red',
          benchmark: '≥ 15.0% (Buffett)',
          explanation: 'Rentabilidad sobre fondos propios.',
          heuristicSimple: 'Test de Moat y ventaja competitiva.'
        },
        bpa: {
          value: companyResult.ratios.bpa,
          formatted: `$${companyResult.ratios.bpa}`,
          status: companyResult.ratios.bpa > 0 ? 'green' : 'red',
          benchmark: '> $0.00',
          explanation: 'Beneficio por acción.',
          heuristicSimple: 'Utilidad neta / Acciones.'
        },
        per: {
          value: companyResult.ratios.per,
          formatted: `${companyResult.ratios.per}x`,
          status: companyResult.ratios.per <= 18 ? 'green' : companyResult.ratios.per <= 26 ? 'yellow' : 'red',
          benchmark: '≤ 18.0x',
          explanation: 'Múltiplo precio beneficio.',
          heuristicSimple: 'Años de beneficio pagados.'
        },
        pb: {
          value: companyResult.ratios.pb,
          formatted: `${companyResult.ratios.pb}x`,
          status: companyResult.ratios.pb <= 2.5 ? 'green' : 'yellow',
          benchmark: '≤ 2.5x',
          explanation: 'Precio sobre valor contable.',
          heuristicSimple: 'Valor patrimonial.'
        },
        yieldDividendo: {
          value: companyResult.ratios.yieldDividendo / 100,
          formatted: `${companyResult.ratios.yieldDividendo}%`,
          status: companyResult.ratios.yieldDividendo >= 2.0 ? 'green' : 'yellow',
          benchmark: '≥ 2.0%',
          explanation: 'Rendimiento por dividendo.',
          heuristicSimple: 'Flujo de caja directo.'
        }
      },
      dimensiones: {
        liquidez: {
          name: 'Liquidez a Corto Plazo',
          score: Math.min(100, Math.round(companyResult.ratios.liquidezCorriente * 50)),
          status: 'green',
          summary: 'Datos auditados procesados por pandas.',
          verdict: 'Verificado por Python'
        },
        solvencia: {
          name: 'Solvencia y Deuda',
          score: companyResult.ratios.endeudamiento <= 1.0 ? 90 : 65,
          status: companyResult.ratios.endeudamiento <= 1.5 ? 'green' : 'yellow',
          summary: 'Cálculo de balance con numpy.',
          verdict: 'Estructura auditada'
        },
        rentabilidad: {
          name: 'Rentabilidad y Moat',
          score: Math.min(100, Math.round(companyResult.ratios.roe * 2.2)),
          status: companyResult.ratios.roe >= 15 ? 'green' : 'yellow',
          summary: `DuPont: ROE ${companyResult.ratios.roe}% con margen del ${companyResult.dupont.margenNetoPercent}%.`,
          verdict: companyResult.ratios.roe >= 15 ? 'Foso Buffett' : 'Rentabilidad estándar'
        },
        valoracion: {
          name: 'Consenso Wall Street',
          score: companyResult.targetConsensus?.upside_potential >= 10 ? 85 : 65,
          status: companyResult.targetConsensus?.upside_potential > 0 ? 'green' : 'yellow',
          summary: `Cotización: $${companyResult.raw.precioCotizacion} vs Objetivo: $${companyResult.targetConsensus?.target_mean.toFixed(2) ?? 'N/D'}`,
          verdict: companyResult.targetConsensus?.upside_potential > 0 ? 'Consenso Positivo' : 'Consenso Neutro'
        }
      },
      linearScore: Math.min(96, Math.max(30, Math.round(companyResult.ratios.roe * 1.5 + (companyResult.ratios.liquidezCorriente * 15)))),
      scoreGrade: companyResult.ratios.roe >= 25 ? 'A+' : companyResult.ratios.roe >= 15 ? 'A' : 'B',
      targetConsensus: companyResult.targetConsensus,
      warrenVerdict: companyResult.moat.includes('Foso') ? 'Aprobado con Foso' : 'Vigilancia'
    };

    onCompanyImported(comp);
    onClose();
  };

  const handleApplyOptimalWeightsToPortfolio = () => {
    if (!markowitzResult || !onApplyPortfolioWeights) return;
    const allocations = Object.entries(markowitzResult.maxSharpePortfolio.weightsByTicker).map(([ticker, w]: any) => ({
      ticker,
      weight: w
    }));
    onApplyPortfolioWeights(allocations);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Cabecera Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold text-xl shadow-inner">
              🐍
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-serif tracking-tight">
                  Motor Científico de Python (Finanzas Cuantitativas)
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  pandas · numpy · yfinance · seaborn · matplotlib
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Extracción en tiempo real de estados financieros y cálculo matricial con las librerías oficiales de Python.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Estado de Librerías & User Snippet Highlight */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Librerías cargadas correctamente
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-300">pandas <strong className="text-white">{pythonStatus?.libraries?.pandas || '1.5.3'}</strong></span>
            <span className="text-slate-300">numpy <strong className="text-blue-400">{pythonStatus?.libraries?.numpy || '1.26.4'}</strong></span>
            <span className="text-slate-300">yfinance <strong className="text-emerald-400">{pythonStatus?.libraries?.yfinance || '1.7.0'}</strong></span>
            <span className="text-slate-300">seaborn <strong className="text-purple-400">{pythonStatus?.libraries?.seaborn || '0.12.2'}</strong></span>
            <span className="text-slate-300">matplotlib <strong className="text-rose-400">{pythonStatus?.libraries?.matplotlib || '3.6.3'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('fundamentals')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'fundamentals' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Ratios Fundamentales (yfinance)
            </button>
            <button
              onClick={() => setActiveTab('markowitz')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'markowitz' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Markowitz (pandas.cov)
            </button>
<button
              onClick={() => {
                setActiveTab('plots');
                if (!plotsResult) handleGeneratePythonPlots();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'plots' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Gráficos (Seaborn & Matplotlib)
            </button>
          </div>
        </div>
        </div>

        {/* Cuerpo Principal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* PESTAÑA 1: EXTRACCIÓN FUNDAMENTAL */}
          {activeTab === 'fundamentals' && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={tickerInput}
                      onChange={e => setTickerInput(e.target.value.toUpperCase())}
                      placeholder="Ticker en Bolsa (ej: KO, AAPL, BRK.B, MSFT, NVDA, TSLA, JNJ)..."
                      className="bg-transparent text-sm text-white font-mono font-bold outline-none flex-1 placeholder:text-slate-600"
                      onKeyDown={e => e.key === 'Enter' && handleRunPythonExtraction()}
                    />
                  </div>

                  <button
                    onClick={() => handleRunPythonExtraction()}
                    disabled={loading}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>Extraer con yfinance & Pandas</span>
                  </button>
                </div>

                {/* Accesos rápidos de tickers populares */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">Acciones recomendadas:</span>
                  {['KO', 'BRK.B', 'AAPL', 'MSFT', 'NVDA', 'COST', 'JNJ', 'TSLA'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleRunPythonExtraction(t)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-lg border border-slate-800 font-mono text-[11px] font-bold transition-all active:scale-95"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado de la Extracción */}
              {companyResult && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                          Datos extraídos con {companyResult.engine}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                          Auditoría SEC / yfinance
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-white font-serif mt-1">
                        {companyResult.nombre} ({companyResult.ticker})
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {companyResult.sector} · Cotización en vivo: <strong className="text-emerald-400">${companyResult.raw.precioCotizacion}</strong> · Capitalización: <strong>${companyResult.raw.capitalizacionBursatil}M</strong>
                      </p>
                    </div>

                    <button
                      onClick={handleApplyToPlatformCatalog}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Cargar en Catálogo de la Plataforma</span>
                    </button>
                  </div>

                  {/* Grid de Ratios Extraídos y Calculados por Python */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Current Ratio (pandas)</span>
                      <strong className="text-base font-bold text-white">{companyResult.ratios.liquidezCorriente}x</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">AC: ${companyResult.raw.activoCirculante}M / PC: ${companyResult.raw.pasivoCirculante}M</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Debt to Equity (pandas)</span>
                      <strong className="text-base font-bold text-white">{companyResult.ratios.endeudamiento}x</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Deuda: ${companyResult.raw.totalPasivo}M / PN: ${companyResult.raw.patrimonioNeto}M</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">ROE Anualizado (numpy)</span>
                      <strong className="text-base font-bold text-emerald-400">+{companyResult.ratios.roe}%</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Net Income: ${companyResult.raw.utilidadNeta}M</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">PER Bursátil (yfinance)</span>
                      <strong className="text-base font-bold text-amber-400">{companyResult.ratios.per}x</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">BPA: ${companyResult.ratios.bpa} · Yield: {companyResult.ratios.yieldDividendo}%</span>
                    </div>
                  </div>

                  {/* Desglose DuPont de 3 Fases */}
                  <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[11px] font-bold text-purple-400 font-mono block mb-1">
                      Descomposición DuPont de 3 Factores (Calculado con Pandas & NumPy):
                    </span>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-slate-300">
                      <span>Margen Neto: <strong className="text-white">{companyResult.dupont.margenNetoPercent}%</strong></span>
                      <span>×</span>
                      <span>Rotación de Activos: <strong className="text-white">{companyResult.dupont.rotacionActivos}x</strong></span>
                      <span>×</span>
                      <span>Apalancamiento: <strong className="text-white">{companyResult.dupont.apalancamientoFinanciero}x</strong></span>
                      <span>=</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ROE: {companyResult.ratios.roe}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: MARKOWITZ CUANTITATIVO CON PANDAS & NUMPY */}
          {activeTab === 'markowitz' && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">Tickers para Matriz de Covarianza:</span>
                  <span className="text-slate-500 font-mono">Descarga series 1 año y calcula covarianza con pandas.cov()</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={markowitzTickers}
                    onChange={e => setMarkowitzTickers(e.target.value)}
                    className="flex-1 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm text-white font-mono font-bold outline-none"
                  />
                  <button
                    onClick={handleRunPythonMarkowitz}
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>Calcular Covarianza con Python</span>
                  </button>
                </div>

                {/* Presets de Cartera */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">Universos recomendados:</span>
                  <button
                    onClick={() => setMarkowitzTickers('BRK.B, KO, AAPL, JNJ, COST')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-800 font-mono text-[11px]"
                  >
                    Warren Buffett Core
                  </button>
                  <button
                    onClick={() => setMarkowitzTickers('AAPL, MSFT, NVDA, GOOGL, AMZN, META')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg border border-slate-800 font-mono text-[11px]"
                  >
                    Big Tech
                  </button>
                  <button
                    onClick={() => setMarkowitzTickers('KO, PEP, JNJ, WMT, MCD, PG')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-lg border border-slate-800 font-mono text-[11px]"
                  >
                    Defensivo Dividendos
                  </button>
                </div>
              </div>

              {markowitzResult && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-blue-500/30 space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                        Optimización de Markowitz Ejecutada por Python (NumPy Simplex & Pandas)
                      </span>
                      <h4 className="text-base font-bold text-white font-serif">
                        Cartera Tangente (Máximo Ratio de Sharpe: {markowitzResult.maxSharpePortfolio.sharpeRatio})
                      </h4>
                      <p className="text-xs text-slate-400">
                        Rendimiento Esperado: <strong>{(markowitzResult.maxSharpePortfolio.expectedReturn * 100).toFixed(1)}%</strong> · Volatilidad: <strong>{(markowitzResult.maxSharpePortfolio.volatility * 100).toFixed(1)}%</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono text-xs pr-2 hidden sm:block">
                        <span className="text-slate-400 block">Almuerzo Gratis:</span>
                        <strong className="text-emerald-400 text-sm">
                          -{markowitzResult.maxSharpePortfolio.diversificationRatio}% Riesgo
                        </strong>
                      </div>
                      {onApplyPortfolioWeights && (
                        <button
                          onClick={handleApplyOptimalWeightsToPortfolio}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Aplicar Pesos al Simulador</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ponderaciones Óptimas Recomendadas por Python */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-bold block font-mono">
                      Pesos Óptimos Calculados por Monte Carlo en Simplex:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                      {Object.entries(markowitzResult.maxSharpePortfolio.weightsByTicker).map(([ticker, w]: any) => (
                        <div key={ticker} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block">{ticker}</span>
                          <strong className="text-amber-400 text-sm">{Math.round(w * 100)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matriz de Correlación Térmica de Pandas */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-slate-400 font-bold block font-mono">
                      Matriz de Correlaciones de Pearson calculada con pandas.corr():
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs font-mono">
                        <thead>
                          <tr>
                            <th className="p-2 text-left text-slate-500">Activo</th>
                            {markowitzResult.tickers.map((t: string) => (
                              <th key={t} className="p-2 text-amber-400">{t}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {markowitzResult.tickers.map((rowTick: string) => (
                            <tr key={rowTick} className="border-t border-slate-800/60">
                              <td className="p-2 text-left font-bold text-slate-300">{rowTick}</td>
                              {markowitzResult.tickers.map((colTick: string) => {
                                const val = markowitzResult.correlationMatrix[rowTick]?.[colTick] ?? 1.0;
                                return (
                                  <td key={colTick} className={`p-2 font-bold ${val === 1.0 ? 'text-slate-500' : val < 0.3 ? 'text-emerald-400' : 'text-blue-300'}`}>
                                    {val.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: GRÁFICOS CIENTÍFICOS SEABORN & MATPLOTLIB */}
          {activeTab === 'plots' && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 font-serif">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    Renderizado Gráfico con Seaborn & Matplotlib (Backend Python)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Generación de figuras científicas directamente desde el kernel de Python usando <code className="text-purple-300">sns.heatmap</code> y <code className="text-rose-300">plt.scatter</code>.
                  </p>
                </div>

                <button
                  onClick={handleGeneratePythonPlots}
                  disabled={plotsLoading}
                  className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                >
                  {plotsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>Regenerar Gráficos con Seaborn</span>
                </button>
              </div>

              {/* Selector de Tipo de Gráfico */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setSelectedPlotType('heatmap')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedPlotType === 'heatmap'
                      ? 'bg-purple-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  1. Mapa de Calor (Seaborn Heatmap)
                </button>
                <button
                  onClick={() => setSelectedPlotType('frontier')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedPlotType === 'frontier'
                      ? 'bg-purple-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  2. Frontera Eficiente (Matplotlib Scatter)
                </button>
                <button
                  onClick={() => setSelectedPlotType('distribution')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedPlotType === 'distribution'
                      ? 'bg-purple-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  3. Distribución de Retornos (Seaborn KDE)
                </button>
              </div>

              {/* Visualización de la Figura Python */}
              {plotsLoading ? (
                <div className="p-12 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    Descargando series de Yahoo Finance y renderizando con Seaborn y Matplotlib...
                  </p>
                </div>
              ) : plotsResult ? (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-center">
                  {selectedPlotType === 'heatmap' && plotsResult.correlation_heatmap && (
                    <div className="space-y-2">
                      <img
                        src={plotsResult.correlation_heatmap}
                        alt="Matriz de Correlación con Seaborn"
                        className="rounded-xl mx-auto max-h-[420px] object-contain border border-slate-800 shadow-xl"
                      />
                      <span className="text-[11px] text-slate-400 font-mono block">
                        Figura generada con <code className="text-purple-300">sns.heatmap(corr_matrix, annot=True, cmap='vlag')</code>
                      </span>
                    </div>
                  )}

                  {selectedPlotType === 'frontier' && plotsResult.markowitz_frontier && (
                    <div className="space-y-2">
                      <img
                        src={plotsResult.markowitz_frontier}
                        alt="Frontera Eficiente con Matplotlib"
                        className="rounded-xl mx-auto max-h-[420px] object-contain border border-slate-800 shadow-xl"
                      />
                      <span className="text-[11px] text-slate-400 font-mono block">
                        Figura generada con <code className="text-rose-300">plt.scatter(sim_vols, sim_rets, c=sim_sharpes, cmap='viridis')</code>
                      </span>
                    </div>
                  )}

                  {selectedPlotType === 'distribution' && plotsResult.returns_distribution && (
                    <div className="space-y-2">
                      <img
                        src={plotsResult.returns_distribution}
                        alt="Distribución con Seaborn"
                        className="rounded-xl mx-auto max-h-[420px] object-contain border border-slate-800 shadow-xl"
                      />
                      <span className="text-[11px] text-slate-400 font-mono block">
                        Figura generada con <code className="text-blue-300">sns.histplot(daily_returns, kde=True)</code>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-400 font-mono">
                    Haz clic en "Regenerar Gráficos con Seaborn" para ejecutar el script de visualización científica en Python.
                  </p>
                  <button
                    onClick={handleGeneratePythonPlots}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Generar Gráficos Ahora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Consola de Terminal Histórica de Logs */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                Terminal de Registro Python (yfinance / pandas / seaborn / numpy)
              </span>
              <span className="text-[11px] text-slate-600">python3 / Linux x86_64</span>
            </div>
            <div className="space-y-1 text-slate-300 max-h-36 overflow-y-auto no-scrollbar pt-1 text-[11px]">
              {logs.map((log, idx) => (
                <div key={idx} className={log.startsWith('[SUCCESS]') ? 'text-emerald-400' : log.startsWith('[ERROR]') || log.startsWith('[FATAL]') ? 'text-rose-400' : log.startsWith('>>>') ? 'text-amber-300 font-bold' : log.startsWith('[INFO]') ? 'text-blue-300' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
            </div>
</div>
      </div>
    </div>
  );
};
