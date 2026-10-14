import { LineStyle } from 'lightweight-charts';

export interface PricePoint {
  date: string;
  label?: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  ema20?: number | null;
  ema50?: number | null;
  ema40?: number | null;
  ema200?: number | null;
  targetConsensus?: {
    target_mean: number;
    target_high: number;
    target_low: number;
  };
  rsi?: number | null;
  macdLine?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
}

export interface EmaSeriesPoint {
  time: string;
  value: number;
}

export interface PriceHistoryResponse {
  success: boolean;
  ticker: string;
  range?: string;
  period?: string;
  interval?: string;
  source: string;
  points: PricePoint[];
  emas?: {
    ema20: EmaSeriesPoint[];
    ema50: EmaSeriesPoint[];
    ema40?: EmaSeriesPoint[];
    ema200: EmaSeriesPoint[];
  };
  rsi?: EmaSeriesPoint[];
  macd?: {
    line: EmaSeriesPoint[];
    signal: EmaSeriesPoint[];
    hist: EmaSeriesPoint[];
  };
  indicators?: {
    ema20?: number | null;
    ema50?: number | null;
    ema40?: number | null;
    ema200?: number | null;
    rsi?: number | null;
    macdLine?: number | null;
    macdSignal?: number | null;
    macdHist?: number | null;
  };
  currentPrice: number;
  firstPrice: number;
  change: number;
  changePercent: number;
  min52w: number;
  max52w: number;
}

export interface AnalystTargetsResponse {
  success: boolean;
  ticker: string;
  targetMean?: number;
  targetMedian?: number;
  targetHigh?: number;
  targetLow?: number;
  numberOfAnalysts?: number;
  upsideMeanPercent?: number;
}

export interface TechnicalPattern {
  type: 'soporte' | 'resistencia' | 'piso_multiple' | 'techo_multiple' | 'rango';
  name: string;
  price: number;
  startDate: string;
  endDate: string;
  explanation: string;
  significance: 'alta' | 'media' | 'baja';
  indicatorConfirmation?: string;
}

export interface TechnicalPatternsResponse {
  success: boolean;
  ticker: string;
  summary: string;
  trend: string;
  convergenceStatus?: 'convergente' | 'contradictorio' | 'parcial';
  patterns: TechnicalPattern[];
  disclaimer: string;
  source: string;
}

export type ChartPeriod = '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';
export type ChartInterval = '1d' | '1wk' | '1mo';

export function patternColor(type: TechnicalPattern['type']): string {
  switch (type) {
    case 'soporte':        return '#10b981'; // Emerald
    case 'piso_multiple':  return '#06b6d4'; // Cyan
    case 'resistencia':    return '#f43f5e'; // Rose
    case 'techo_multiple': return '#fb923c'; // Orange
    case 'rango':          return '#a855f7'; // Purple
    default:               return '#94a3b8';
  }
}

export function patternLineStyle(type: TechnicalPattern['type']): LineStyle {
  switch (type) {
    case 'soporte':
    case 'piso_multiple':  return LineStyle.Solid;
    case 'resistencia':
    case 'techo_multiple': return LineStyle.Dashed;
    case 'rango':          return LineStyle.Dotted;
    default:               return LineStyle.Solid;
  }
}
