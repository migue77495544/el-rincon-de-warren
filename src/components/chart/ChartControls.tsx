import React from 'react';
import {
  Calendar,
  Clock,
  CandlestickChart,
  LineChart as LineChartIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BrainCircuit,
  Loader2,
  Layers
} from 'lucide-react';
import { ChartPeriod, ChartInterval } from './chartTypes';

interface ChartControlsProps {
  selectedPeriod: ChartPeriod;
  onSelectPeriod: (period: ChartPeriod) => void;
  selectedInterval: ChartInterval;
  onSelectInterval: (interval: ChartInterval) => void;
  chartType: 'candlestick' | 'line';
  onToggleChartType: (type: 'candlestick' | 'line') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isPatternsLoading: boolean;
  hasPatternsData: boolean;
  onTogglePatterns: () => void;
  // Indicator toggles
  showEma20: boolean;
  onToggleEma20: () => void;
  currentEma20?: number | null;
  showEma50: boolean;
  onToggleEma50: () => void;
  currentEma50?: number | null;
  showEma200: boolean;
  onToggleEma200: () => void;
  currentEma200?: number | null;
  showVolume: boolean;
  onToggleVolume: () => void;
  showTargetLine: boolean;
  onToggleTargetLine: () => void;
  analystTargetMean?: number;
  showConsensusLine: boolean;
  onToggleConsensusLine: () => void;
  targetMean: number;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  selectedPeriod,
  onSelectPeriod,
  selectedInterval,
  onSelectInterval,
  chartType,
  onToggleChartType,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isPatternsLoading,
  hasPatternsData,
  onTogglePatterns,
  showEma20,
  onToggleEma20,
  currentEma20,
  showEma50,
  onToggleEma50,
  currentEma50,
  showEma200,
  onToggleEma200,
  currentEma200,
  showVolume,
  onToggleVolume,
  showTargetLine,
  onToggleTargetLine,
  analystTargetMean,
  showConsensusLine,
  onToggleConsensusLine,
  targetMean
}) => {
  return (
    <div className="space-y-3">
      {/* Barra superior de controles */}
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
        {/* SWITCH NATIVO: CandlestickSeries vs LineSeries */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            onClick={() => onToggleChartType('candlestick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              chartType === 'candlestick'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Ver gráfico de Velas Japonesas (Candlestick)"
          >
            <CandlestickChart className="w-3.5 h-3.5 text-indigo-600" />
            <span>Velas</span>
          </button>

          <button
            onClick={() => onToggleChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              chartType === 'line'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Ver gráfico de Línea Continua (LineSeries)"
          >
            <LineChartIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Línea</span>
          </button>
        </div>

        {/* Selector de Temporalidad de Velas (Intervalo: 1D, 1S, 1M) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 px-1 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="hidden lg:inline">Velas:</span>
          </span>

          <div className="flex items-center gap-1">
            {[
              { id: '1d', label: '1D', title: 'Velas Diarias (1 Día)' },
              { id: '1wk', label: '1S', title: 'Velas Semanales (1 Semana)' },
              { id: '1mo', label: '1M', title: 'Velas Mensuales (1 Mes)' }
            ].map(item => (
              <button
                key={item.id}
                id={`btn-interval-${item.id}`}
                onClick={() => onSelectInterval(item.id as ChartInterval)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedInterval === item.id
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={item.title}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Período Histórico (Rango: 1M, 3M, 6M, 1A, 5A, MAX) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 px-1 font-mono flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span className="hidden lg:inline">Rango:</span>
          </span>

          <div className="flex items-center gap-1">
            {[
              { id: '1mo', label: '1M', title: '1 Mes de histórico' },
              { id: '3mo', label: '3M', title: '3 Meses de histórico' },
              { id: '6mo', label: '6M', title: '6 Meses de histórico' },
              { id: '1y', label: '1A', title: '1 Año de histórico' },
              { id: '5y', label: '5A', title: '5 Años de histórico' },
              { id: 'max', label: 'MAX', title: 'Máximo histórico disponible' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`btn-period-${tab.id}`}
                onClick={() => onSelectPeriod(tab.id as ChartPeriod)}
                className={`px-2 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedPeriod === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={tab.title}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botones de Zoom y Navegación */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            title="Acercar gráfico (Zoom In) · O usá la rueda del mouse"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            title="Alejar gráfico (Zoom Out) · O usá la rueda del mouse"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            title="Centrar histórico completo (Reset Zoom)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Botón "Analizar Patrones Técnicos" */}
        <button
          id="btn-analizar-patrones-tecnicos"
          onClick={onTogglePatterns}
          disabled={isPatternsLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
            hasPatternsData
              ? 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700'
              : isPatternsLoading
              ? 'bg-violet-100 text-violet-500 border-violet-200 cursor-wait'
              : 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100 hover:border-violet-300'
          }`}
          title="Analizar patrones técnicos con Gemini AI"
        >
          {isPatternsLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BrainCircuit className="w-3.5 h-3.5" />
          )}
          <span>
            {isPatternsLoading
              ? 'Analizando...'
              : hasPatternsData
              ? 'Limpiar Análisis'
              : 'Analizar Patrones Técnicos'}
          </span>
        </button>
      </div>

      {/* Barra de Toggles de Indicadores y Líneas */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="toggle-ema-20"
            onClick={onToggleEma20}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-medium border transition-all cursor-pointer ${
              showEma20
                ? 'bg-cyan-50 text-cyan-900 border-cyan-300 font-bold shadow-2xs ring-1 ring-cyan-400/20'
                : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
            }`}
            title="Mostrar / Ocultar Media Móvil Exponencial rápida (EMA 20 períodos)"
          >
            <span className="w-2.5 h-1 bg-cyan-500 inline-block rounded-full"></span>
            <span>EMA 20 {currentEma20 ? `($${currentEma20.toFixed(2)})` : ''}</span>
          </button>

          <button
            id="toggle-ema-50"
            onClick={onToggleEma50}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-medium border transition-all cursor-pointer ${
              showEma50
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs ring-1 ring-amber-400/20'
                : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
            }`}
            title="Mostrar / Ocultar Media Móvil Exponencial intermedia (EMA 50 períodos)"
          >
            <span className="w-2.5 h-1 bg-amber-500 inline-block rounded-full"></span>
            <span>EMA 50 {currentEma50 ? `($${currentEma50.toFixed(2)})` : ''}</span>
          </button>

          <button
            id="toggle-ema-200"
            onClick={onToggleEma200}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-medium border transition-all cursor-pointer ${
              showEma200
                ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold shadow-2xs ring-1 ring-purple-400/20'
                : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
            }`}
            title="Mostrar / Ocultar Media Móvil Exponencial de largo plazo (EMA 200 períodos)"
          >
            <span className="w-2.5 h-1 bg-purple-500 inline-block rounded-full"></span>
            <span>EMA 200 {currentEma200 ? `($${currentEma200.toFixed(2)})` : ''}</span>
          </button>

          <button
            onClick={onToggleVolume}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-medium border transition-all cursor-pointer ${
              showVolume
                ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold'
                : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Volumen</span>
          </button>

          {analystTargetMean && (
            <button
              onClick={onToggleTargetLine}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-medium border transition-all cursor-pointer ${
                showTargetLine
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
              }`}
              title="Mostrar/Ocultar línea de Precio Objetivo Promedio de analistas"
            >
              <span className="w-2.5 h-0.5 bg-indigo-600 inline-block border-t border-b border-indigo-600"></span>
              <span>Target Wall St (~${analystTargetMean.toFixed(2)})</span>
            </button>
          )}

          <button
            onClick={onToggleConsensusLine}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-medium border transition-all cursor-pointer ${
              showConsensusLine
                ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 line-through opacity-60'
            }`}
            title="Mostrar/Ocultar línea de Precio Objetivo de Wall Street"
          >
            <span className="w-2.5 h-0.5 bg-indigo-600 inline-block border-t border-b border-indigo-600"></span>
            <span>Consenso ({targetMean > 0 ? `~$${targetMean.toFixed(2)}` : 'N/D'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
