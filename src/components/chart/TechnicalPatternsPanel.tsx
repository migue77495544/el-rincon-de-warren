import React from 'react';
import {
  BrainCircuit,
  X,
  AlertTriangle,
  BarChart3,
  Info,
  CheckCircle2,
  Sliders,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Minus
} from 'lucide-react';
import { TechnicalPatternsResponse, TechnicalPattern, patternColor } from './chartTypes';

interface TechnicalPatternsPanelProps {
  ticker: string;
  patternsData: TechnicalPatternsResponse | null;
  patternsError: string | null;
  onClose: () => void;
}

function patternIcon(type: TechnicalPattern['type']) {
  switch (type) {
    case 'soporte':
    case 'piso_multiple':  return <ArrowUpFromLine className="w-3 h-3" />;
    case 'resistencia':
    case 'techo_multiple': return <ArrowDownFromLine className="w-3 h-3" />;
    default:               return <Minus className="w-3 h-3" />;
  }
}

export const TechnicalPatternsPanel: React.FC<TechnicalPatternsPanelProps> = ({
  ticker,
  patternsData,
  patternsError,
  onClose
}) => {
  const isContradictory =
    patternsData?.convergenceStatus === 'contradictorio' ||
    patternsData?.summary.includes('CONTRADICCIÓN');

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isContradictory
        ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-400/20 shadow-sm'
        : 'border-violet-200 bg-violet-50/50'
    }`}>
      {/* Header del panel */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isContradictory
          ? 'border-amber-200 bg-amber-100/70'
          : 'border-violet-200 bg-violet-50'
      }`}>
        <div className="flex items-center gap-2">
          <BrainCircuit className={`w-4 h-4 ${
            isContradictory ? 'text-amber-700' : 'text-violet-600'
          }`} />
          <span className={`text-sm font-bold ${
            isContradictory ? 'text-amber-950' : 'text-violet-900'
          }`}>
            Análisis de Patrones Técnicos · {ticker}
          </span>
          {patternsData && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              isContradictory
                ? 'bg-amber-200 text-amber-900'
                : 'bg-violet-200 text-violet-800'
            }`}>
              {patternsData.patterns.length} patrones
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-black/5"
          title="Cerrar análisis"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido del panel */}
      <div className="p-4 space-y-4">
        {patternsError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs">{patternsError}</p>
          </div>
        )}

        {patternsData && (
          <>
            {/* Tendencia dominante y resumen */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-3 rounded-xl bg-white border border-violet-100">
                <p className="text-[10px] font-mono font-bold uppercase text-violet-500 mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Tendencia Dominante
                </p>
                <p className="text-sm font-bold text-slate-800">{patternsData.trend}</p>
              </div>
              <div className="flex-[2] p-3 rounded-xl bg-white border border-violet-100 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[10px] font-mono font-bold uppercase text-violet-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Resumen Técnico · Convergencia de Guillermo
                  </p>
                  {patternsData.summary.includes('CONTRADICCIÓN') || patternsData.convergenceStatus === 'contradictorio' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1 font-mono">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Contradicción Técnica Detectada
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Convergencia Técnica Confirmada
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{patternsData.summary}</p>
              </div>
            </div>

            {/* Lista de patrones */}
            {patternsData.patterns.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase text-violet-500 px-1">Niveles Identificados</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {patternsData.patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white border hover:shadow-sm transition-shadow"
                      style={{ borderColor: patternColor(pattern.type) + '40' }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: patternColor(pattern.type) + '20', color: patternColor(pattern.type) }}
                      >
                        {patternIcon(pattern.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate">{pattern.name}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold flex-shrink-0"
                            style={{ backgroundColor: patternColor(pattern.type) + '15', color: patternColor(pattern.type) }}
                          >
                            ${pattern.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{pattern.explanation}</p>
                        {pattern.indicatorConfirmation && (
                          <div className="mt-2 p-2 rounded-xl bg-violet-50/80 border border-violet-200/80 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase text-violet-800 flex items-center gap-1">
                              <Sliders className="w-3 h-3 text-violet-600" />
                              Confirmación de Indicadores (EMA 200 · RSI · MACD):
                            </span>
                            <p className="font-mono text-[10.5px] leading-relaxed text-slate-700">
                              {pattern.indicatorConfirmation}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            pattern.significance === 'alta'
                              ? 'bg-rose-50 text-rose-700'
                              : pattern.significance === 'media'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {pattern.significance === 'alta' ? '⚡ Alta' : pattern.significance === 'media' ? '● Media' : '○ Baja'} significancia
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{pattern.startDate} → {pattern.endDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
