import React from 'react';

export interface HoveredChartPoint {
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  ema20?: number | null;
  ema50?: number | null;
  ema40?: number | null;
  ema200?: number | null;
}

interface ChartTooltipProps {
  hoveredPoint: HoveredChartPoint | null;
  showEma20: boolean;
  showEma50: boolean;
  showEma200: boolean;
  showVolume: boolean;
  currentRsi?: number | null;
  currentMacdLine?: number | null;
  currentMacdSignal?: number | null;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  hoveredPoint,
  showEma20,
  showEma50,
  showEma200,
  showVolume,
  currentRsi,
  currentMacdLine,
  currentMacdSignal
}) => {
  if (!hoveredPoint) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 text-slate-700">
      {hoveredPoint.time && <span><strong className="text-slate-900">{hoveredPoint.time}</strong></span>}
      {hoveredPoint.open !== undefined && (
        <span>O: <strong className="text-slate-900">${hoveredPoint.open.toFixed(2)}</strong></span>
      )}
      {hoveredPoint.high !== undefined && (
        <span>H: <strong className="text-emerald-700">${hoveredPoint.high.toFixed(2)}</strong></span>
      )}
      {hoveredPoint.low !== undefined && (
        <span>L: <strong className="text-rose-700">${hoveredPoint.low.toFixed(2)}</strong></span>
      )}
      {hoveredPoint.close !== undefined && (
        <span>C: <strong className="text-indigo-700">${hoveredPoint.close.toFixed(2)}</strong></span>
      )}
      {showEma20 && hoveredPoint.ema20 !== undefined && hoveredPoint.ema20 !== null && (
        <span className="text-cyan-700">EMA20: <strong>${hoveredPoint.ema20.toFixed(2)}</strong></span>
      )}
      {showEma50 && (hoveredPoint.ema50 ?? hoveredPoint.ema40) !== undefined && (hoveredPoint.ema50 ?? hoveredPoint.ema40) !== null && (
        <span className="text-amber-700">EMA50: <strong>${(hoveredPoint.ema50 ?? hoveredPoint.ema40)!.toFixed(2)}</strong></span>
      )}
      {showEma200 && hoveredPoint.ema200 !== undefined && hoveredPoint.ema200 !== null && (
        <span className="text-purple-700">EMA200: <strong>${hoveredPoint.ema200.toFixed(2)}</strong></span>
      )}
      {showVolume && hoveredPoint.volume !== undefined && (
        <span>Vol: <strong className="text-slate-600">{(hoveredPoint.volume / 1_000_000).toFixed(1)}M</strong></span>
      )}
      {currentRsi !== null && currentRsi !== undefined && (
        <span className="text-indigo-600">RSI: <strong>{currentRsi.toFixed(1)}</strong></span>
      )}
      {currentMacdLine !== null && currentMacdLine !== undefined && (
        <span className="text-blue-600">MACD: <strong>{currentMacdLine.toFixed(4)}</strong></span>
      )}
      {currentMacdSignal !== null && currentMacdSignal !== undefined && (
        <span className="text-amber-600">Señal: <strong>{currentMacdSignal.toFixed(4)}</strong></span>
      )}
    </div>
  );
};
