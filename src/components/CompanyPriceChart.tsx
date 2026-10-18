import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
  CandlestickChart,
  LineChart as LineChartIcon,
  Target,
  BrainCircuit,
  X,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Minus,
  BarChart3,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Clock,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  ColorType,
  CrosshairMode
} from 'lightweight-charts';
import { CompanyAnalysis } from '../types';
import { useViewMode } from '../context/ViewModeContext';
import { fetchJson, postJson, errorMessage } from '../utils/api';

import {
  PricePoint,
  EmaSeriesPoint,
  PriceHistoryResponse,
  AnalystTargetsResponse,
  TechnicalPattern,
  TechnicalPatternsResponse,
  ChartPeriod,
  ChartInterval,
  patternColor,
  patternLineStyle
} from './chart/chartTypes';
import { ChartControls } from './chart/ChartControls';
import { ChartTooltip } from './chart/ChartTooltip';
import { TechnicalPatternsPanel } from './chart/TechnicalPatternsPanel';

export interface CompanyPriceChartProps {
  company: CompanyAnalysis;
  simpleMode?: boolean;
}

export const CompanyPriceChart: React.FC<CompanyPriceChartProps> = ({ company, simpleMode = false }) => {
  // En Modo Simple solo se dibuja el precio y, si existe, el objetivo de analistas
  const { mode, isAnalystEnabledForSection } = useViewMode();
  const isSimple = simpleMode || (mode === 'simple' && !isAnalystEnabledForSection('fundamental'));
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('1y');
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>('1d');
  const [chartTypePref, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [historyData, setHistoryData] = useState<PriceHistoryResponse | null>(null);
  const [targetsData, setTargetsData] = useState<AnalystTargetsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConsensusLinePref, setShowConsensusLine] = useState<boolean>(true);
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);
  const [showVolumePref, setShowVolume] = useState<boolean>(true);

  // Estados para las 3 Medias Móviles Exponenciales (Método de Guillermo Hernández)
  const [showEma20Pref, setShowEma20] = useState<boolean>(true);
  const [showEma50Pref, setShowEma50] = useState<boolean>(true);
  const [showEma200Pref, setShowEma200] = useState<boolean>(true);

  // Estado del análisis de patrones técnicos
  const [patternsData, setPatternsData] = useState<TechnicalPatternsResponse | null>(null);
  const [isPatternsLoading, setIsPatternsLoading] = useState<boolean>(false);
  const [patternsError, setPatternsError] = useState<string | null>(null);
  const [showPatternsPanel, setShowPatternsPanel] = useState<boolean>(false);

  // Hovered point data para el tooltip superior dinámico (incluye EMAs)
  const [hoveredPoint, setHoveredPoint] = useState<{
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
  } | null>(null);

  // Referencias a los objetos de Lightweight Charts
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const analystPriceLineRef = useRef<IPriceLine | null>(null);
  const intrinsicPriceLineRef = useRef<IPriceLine | null>(null);
  const patternLinesRef = useRef<IPriceLine[]>([]);

  // Refs para los paneles de RSI y MACD
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // Helpers para interactuar y navegar el histórico con el mouse
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (logicalRange) {
        const span = logicalRange.to - logicalRange.from;
        const newSpan = Math.max(8, span * 0.7);
        const center = (logicalRange.from + logicalRange.to) / 2;
        timeScale.setVisibleLogicalRange({
          from: center - newSpan / 2,
          to: center + newSpan / 2
        });
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (logicalRange) {
        const span = logicalRange.to - logicalRange.from;
        const newSpan = span * 1.45;
        const center = (logicalRange.from + logicalRange.to) / 2;
        timeScale.setVisibleLogicalRange({
          from: center - newSpan / 2,
          to: center + newSpan / 2
        });
      }
    }
  }, []);

  // 1. Cargar histórico de velas (candlestick) desde el motor Python (yfinance)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    // Resetear análisis al cambiar empresa o parámetros de velas
    setPatternsData(null);
    setShowPatternsPanel(false);
    patternLinesRef.current = [];

    const fetchHistory = async () => {
      try {
        const data = await fetchJson(
          `/api/python/candles/${encodeURIComponent(company.ticker)}?period=${selectedPeriod}&interval=${selectedInterval}`
        );
        if (isMounted) setHistoryData(data);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Error al cargar velas desde motor Python:', err);
        // Respaldo: histórico real directo de Yahoo Finance (sin indicadores). Si también falla, se muestra el error.
        try {
          const fallbackRange = selectedPeriod === 'max' ? '5y' : selectedPeriod.replace('o', '');
          const fallbackData = await fetchJson(`/api/market/history/${encodeURIComponent(company.ticker)}?range=${fallbackRange}`, {}, 15000);
          if (isMounted) setHistoryData(fallbackData);
        } catch (fallbackErr) {
          if (isMounted) {
            setHistoryData(null);
            setError(errorMessage(fallbackErr, errorMessage(err, 'No fue posible cargar el feed de precios.')));
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [company.ticker, selectedPeriod, selectedInterval]);

  // 2. Cargar precio objetivo promedio de analistas (get_analyst_price_targets)
  useEffect(() => {
    let isMounted = true;

    const fetchTargets = async () => {
      try {
        const data = await fetchJson(`/api/python/targets/${encodeURIComponent(company.ticker)}`);
        if (isMounted) setTargetsData(data);
      } catch (err) {
        // Sin consenso disponible: el gráfico se muestra sin línea objetivo
        if (isMounted) setTargetsData(null);
        console.warn('Error al consultar targets de analistas:', err);
      }
    };

    fetchTargets();

    return () => {
      isMounted = false;
    };
  }, [company.ticker]);

  // Métricas calculadas para cabecera y estadísticas
  const analystTargetMean = targetsData?.targetMean;
  const currentPrice = historyData?.currentPrice ?? company.raw.precioCotizacion;
  // Solo consenso real de analistas; 0 = sin consenso (no se dibuja ni se calcula margen)
  const targetMean: number = company.targetConsensus?.target_mean ?? analystTargetMean ?? 0;

  const chartType = isSimple ? 'line' : chartTypePref;
  const showVolume = !isSimple && showVolumePref;
  const showEma20 = !isSimple && showEma20Pref;
  const showEma50 = !isSimple && showEma50Pref;
  const showEma200 = !isSimple && showEma200Pref;
  // En Modo Simple una sola línea objetivo: la de analistas en vivo o, si falta, la del consenso guardado
  const showConsensusLine = showConsensusLinePref && (!isSimple || !analystTargetMean);
  const changePercent = historyData?.changePercent ?? 0;
  const changeAmount = historyData?.change ?? 0;
  const isPositivePeriod = changeAmount >= 0;

  // Medias Móviles Exponenciales (Guillermo Hernández) calculadas más recientes
  const latestPoint = historyData?.points && historyData.points.length > 0
    ? historyData.points[historyData.points.length - 1]
    : null;
  const currentEma20 = historyData?.indicators?.ema20 ?? latestPoint?.ema20;
  const currentEma50 = historyData?.indicators?.ema50 ?? historyData?.indicators?.ema40 ?? latestPoint?.ema50 ?? latestPoint?.ema40;
  const currentEma40 = currentEma50;
  const currentEma200 = historyData?.indicators?.ema200 ?? latestPoint?.ema200;

  // 5. Llamar al endpoint de análisis de patrones técnicos con Gemini AI
  const handleAnalyzePatterns = useCallback(async () => {
    if (!historyData?.points || historyData.points.length === 0) return;
    setIsPatternsLoading(true);
    setPatternsError(null);
    setShowPatternsPanel(true);
    try {
      // Enriquecer los puntos con RSI y MACD para el análisis de Gemini
      const enrichedPoints = historyData.points.map(p => ({
        date: p.date,
        open: p.open ?? p.price,
        high: p.high ?? p.price,
        low: p.low ?? p.price,
        price: p.price,
        volume: p.volume ?? 0,
        rsi: p.rsi ?? null,
        macdLine: p.macdLine ?? null,
        macdSignal: p.macdSignal ?? null,
        macdHist: p.macdHist ?? null,
        ema20: p.ema20 ?? null,
        ema50: p.ema50 ?? p.ema40 ?? null,
        ema40: p.ema50 ?? p.ema40 ?? null,
        ema200: p.ema200 ?? null,
      }));

      // El servidor recorre la cadena de modelos de Gemini con un presupuesto de 40 s
      const data = await postJson<TechnicalPatternsResponse>(
        `/api/market/technical-patterns/${encodeURIComponent(company.ticker)}`,
        { points: enrichedPoints, indicators: historyData.indicators ?? null },
        65000
      );
      if (Array.isArray(data.patterns)) {
        setPatternsData(data);
      } else {
        setPatternsError('No se pudieron identificar patrones técnicos. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('[AnalyzePatterns] Error:', err);
      setPatternsError(errorMessage(err, 'Error al conectar con el motor de análisis. Verifica la conexión.'));
    } finally {
      setIsPatternsLoading(false);
    }
  }, [historyData, company.ticker]);

  const handleClosePatterns = useCallback(() => {
    setPatternsData(null);
    setShowPatternsPanel(false);
    setPatternsError(null);
    patternLinesRef.current = [];
  }, []);

  const marginOfSafetyPct = targetMean > 0
    ? Math.round(((targetMean - currentPrice) / targetMean) * 1000) / 10
    : 0;
  const isDiscounted = marginOfSafetyPct > 0;

  // Indicadores técnicos actuales para leyenda
  const currentRsi = historyData?.indicators?.rsi ?? null;
  const currentMacdLine = historyData?.indicators?.macdLine ?? null;
  const currentMacdSignal = historyData?.indicators?.macdSignal ?? null;

  // 3. Montar y configurar Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Crear la instancia del gráfico con estilos elegantes
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: simpleMode ? 320 : 380,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#cbd5e1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b'
        },
        horzLine: {
          color: '#cbd5e1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b'
        }
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22
        }
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 0.5
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true
        },
        mouseWheel: true,
        pinch: true
      }
    });

    chartRef.current = chart;

    // Responsive ResizeObserver
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
      analystPriceLineRef.current = null;
      intrinsicPriceLineRef.current = null;
    };
  }, []);

  // 4. Renderizar o actualizar las series y el switch 'CandlestickSeries' vs 'LineSeries'
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !historyData?.points || historyData.points.length === 0) return;

    // Limpiar series previas para reconstruir con el tipo seleccionado
    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
      analystPriceLineRef.current = null;
      intrinsicPriceLineRef.current = null;
      patternLinesRef.current = [];
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }
    if (ema20SeriesRef.current) {
      chart.removeSeries(ema20SeriesRef.current);
      ema20SeriesRef.current = null;
    }
    if (ema50SeriesRef.current) {
      chart.removeSeries(ema50SeriesRef.current);
      ema50SeriesRef.current = null;
    }
    if (ema200SeriesRef.current) {
      chart.removeSeries(ema200SeriesRef.current);
      ema200SeriesRef.current = null;
    }

    // Filtrar y ordenar cronológicamente
    const sortedPoints = [...historyData.points]
      .filter(p => !!p.date)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    // Deduplicar fechas si existieran
    const uniquePoints = sortedPoints.filter(
      (pt, idx, arr) => idx === 0 || pt.date !== arr[idx - 1].date
    );

    if (uniquePoints.length === 0) return;

    // A. Crear Serie Principal: CandlestickSeries o LineSeries según el switch
    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#2A8556',
        downColor: '#B9463A',
        borderUpColor: '#1F6D46',
        borderDownColor: '#A0372D',
        wickUpColor: '#2A8556',
        wickDownColor: '#B9463A'
      });

      const candleData = uniquePoints
        .map(p => {
          const o = Number(p.open ?? p.price);
          const h = Number(p.high ?? p.price);
          const l = Number(p.low ?? p.price);
          const c = Number(p.price);
          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || c <= 0) return null;
          return {
            time: p.date,
            open: o,
            high: Math.max(o, h, l, c),
            low: Math.min(o, h, l, c),
            close: c
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      candlestickSeries.setData(candleData as any);
      mainSeriesRef.current = candlestickSeries;
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: isPositivePeriod ? '#1F6D46' : '#A0372D',
        lineWidth: 2,
        // El objetivo de analistas entra en la escala para que su línea siempre se vea
        autoscaleInfoProvider: (original: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
          const res = original();
          const target = analystTargetMean ?? (targetMean > 0 ? targetMean : null);
          if (!res || !target) return res;
          return {
            ...res,
            priceRange: {
              minValue: Math.min(res.priceRange.minValue, target),
              maxValue: Math.max(res.priceRange.maxValue, target)
            }
          };
        },
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#ffffff',
        crosshairMarkerBorderColor: isPositivePeriod ? '#1F6D46' : '#A0372D',
        crosshairMarkerBorderWidth: 2
      });

      const lineData = uniquePoints.map(p => ({
        time: p.date,
        value: p.price
      }));

      lineSeries.setData(lineData as any);
      mainSeriesRef.current = lineSeries;
    }

    // B. Crear Serie de Volumen (HistogramSeries) si está habilitada
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume'
        },
        priceScaleId: 'volume',
        color: '#94a3b8'
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0
        }
      });

      const volumeData = uniquePoints.map(p => {
        const isUp = (p.price >= (p.open ?? p.price));
        return {
          time: p.date,
          value: p.volume ?? 0,
          color: isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'
        };
      });

      volumeSeries.setData(volumeData as any);
      volumeSeriesRef.current = volumeSeries;
    }

    // C. Medias Móviles Exponenciales (EMA 20, 50, 200) superpuestas con LineSeries nativas (Método Guillermo Hernández)
    // Utiliza las series pre-computadas de historyData.emas (ya en formato {time, value})
    // con fallback a valores individuales de cada punto si emas no está disponible.

    // Helper: construir serie EMA desde la API pre-computada o desde los puntos individuales
    const buildEmaData = (
      precomputed: EmaSeriesPoint[] | undefined,
      pointExtractor: (p: PricePoint) => number | null | undefined
    ): EmaSeriesPoint[] => {
      // Preferir la serie pre-computada del backend (ya deduplicada y ordenada)
      if (precomputed && precomputed.length > 0) {
        return precomputed
          .filter(e => e && e.time && typeof e.value === 'number' && !isNaN(e.value));
      }
      // Fallback: extraer de cada punto individual
      return uniquePoints
        .filter(p => {
          const v = pointExtractor(p);
          return typeof v === 'number' && !isNaN(v);
        })
        .map(p => ({ time: p.date, value: pointExtractor(p) as number }));
    };

    // EMA 20 (Rápida - Cyan #06b6d4)
    if (showEma20) {
      const ema20Data = buildEmaData(historyData.emas?.ema20, p => p.ema20 ?? null);
      if (ema20Data.length > 0) {
        const ema20Series = chart.addSeries(LineSeries, {
          color: '#06b6d4',
          lineWidth: 2,
          title: 'EMA 20',
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          lastValueVisible: true,
          priceLineVisible: false
        });
        ema20Series.setData(ema20Data as any);
        ema20SeriesRef.current = ema20Series;
      }
    }

    // EMA 50 (Intermedia - Ámbar / Naranja dorado #f59e0b)
    if (showEma50) {
      const ema50Pre = historyData.emas?.ema50 ?? historyData.emas?.ema40;
      const ema50Data = buildEmaData(ema50Pre, p => p.ema50 ?? p.ema40 ?? null);
      if (ema50Data.length > 0) {
        const ema50Series = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 2,
          title: 'EMA 50',
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          lastValueVisible: true,
          priceLineVisible: false
        });
        ema50Series.setData(ema50Data as any);
        ema50SeriesRef.current = ema50Series;
      }
    }

    // EMA 200 (Institucional / Largo Plazo - Violeta / Púrpura #8b5cf6)
    if (showEma200) {
      const ema200Data = buildEmaData(historyData.emas?.ema200, p => p.ema200 ?? null);
      if (ema200Data.length > 0) {
        const ema200Series = chart.addSeries(LineSeries, {
          color: '#8b5cf6',
          lineWidth: 2,
          title: 'EMA 200',
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          lastValueVisible: true,
          priceLineVisible: false
        });
        ema200Series.setData(ema200Data as any);
        ema200SeriesRef.current = ema200Series;
      }
    }

    // D. Línea de Precio Objetivo de Analistas con 'createPriceLine'
    if (mainSeriesRef.current && analystTargetMean && showTargetLine) {
      analystPriceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: analystTargetMean,
        color: '#7C5617',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Objetivo analistas'
      });
    }

    // E. Línea de Precio Objetivo de Wall Street con 'createPriceLine'
    if (mainSeriesRef.current && targetMean > 0 && showConsensusLine) {
      intrinsicPriceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: targetMean,
        color: '#9A6D1C',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Consenso guardado'
      });
    }

    // F. Líneas de patrones técnicos (si ya hay un análisis cargado)
    if (mainSeriesRef.current && patternsData?.patterns) {
      patternLinesRef.current = [];
      for (const pattern of patternsData.patterns) {
        if (typeof pattern.price !== 'number' || isNaN(pattern.price)) continue;
        try {
          const pLine = mainSeriesRef.current.createPriceLine({
            price: pattern.price,
            color: patternColor(pattern.type),
            lineWidth: pattern.significance === 'alta' ? 2 : 1,
            lineStyle: patternLineStyle(pattern.type),
            axisLabelVisible: true,
            title: `${pattern.name} · $${pattern.price.toFixed(2)}`
          });
          patternLinesRef.current.push(pLine);
        } catch (e) {
          console.warn('[Patterns] Error al crear línea de patrón:', e);
        }
      }
    }

    // Guardar referencia al handler para poder desuscribirse en el cleanup
    const crosshairHandler = (param: any) => {
      if (
        !param.point ||
        !param.time ||
        !mainSeriesRef.current ||
        !param.seriesData.has(mainSeriesRef.current)
      ) {
        const last = uniquePoints[uniquePoints.length - 1];
        setHoveredPoint(last ? {
          time: last.date,
          open: last.open ?? last.price,
          high: last.high ?? last.price,
          low: last.low ?? last.price,
          close: last.price,
          volume: last.volume,
          ema20: last.ema20,
          ema50: last.ema50 ?? last.ema40,
          ema40: last.ema50 ?? last.ema40,
          ema200: last.ema200
        } : null);
        return;
      }

      const sData: any = param.seriesData.get(mainSeriesRef.current);
      if (sData) {
        const timeStr = typeof param.time === 'string' ? param.time : '';
        const vData: any = volumeSeriesRef.current && param.seriesData.get(volumeSeriesRef.current);
        const matchingPoint = uniquePoints.find(p => p.date === timeStr);

        setHoveredPoint({
          time: timeStr,
          open: sData.open ?? sData.value,
          high: sData.high ?? sData.value,
          low: sData.low ?? sData.value,
          close: sData.close ?? sData.value,
          volume: vData?.value ?? matchingPoint?.volume,
          ema20: matchingPoint?.ema20,
          ema50: matchingPoint?.ema50 ?? matchingPoint?.ema40,
          ema40: matchingPoint?.ema50 ?? matchingPoint?.ema40,
          ema200: matchingPoint?.ema200
        });
      }
    };

    chart.subscribeCrosshairMove(crosshairHandler);

    // Fijar último punto como valor por defecto del tooltip
    const last = uniquePoints[uniquePoints.length - 1];
    if (last) {
      setHoveredPoint({
        time: last.date,
        open: last.open ?? last.price,
        high: last.high ?? last.price,
        low: last.low ?? last.price,
        close: last.price,
        volume: last.volume,
        ema20: last.ema20,
        ema50: last.ema50 ?? last.ema40,
        ema40: last.ema50 ?? last.ema40,
        ema200: last.ema200
      });
    }

    chart.timeScale().fitContent();

    // Cleanup: desuscribir el handler de crosshair para evitar acumulación
    return () => {
      if (chartRef.current) {
        try { chartRef.current.unsubscribeCrosshairMove(crosshairHandler); } catch {}
      }
    };
  }, [
    historyData,
    chartType,
    analystTargetMean,
    showTargetLine,
      showConsensusLine,
    showVolume,
    showEma20,
    showEma50,
    showEma200,
    isPositivePeriod,
    targetMean,
    patternsData
  ]);

  // =====================================================================
  // 6. Panel RSI-14 (gráfico nativo Lightweight Charts separado, sincronizado)
  // =====================================================================
  useEffect(() => {
    const container = rsiContainerRef.current;
    if (!container || !historyData?.points || historyData.points.length === 0) return;

    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

    const rsiChart = createChart(container, {
      width: container.clientWidth,
      height: 130,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e2e8f0', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: '#e2e8f0', timeVisible: true, secondsVisible: false, visible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true }
    });

    rsiChartRef.current = rsiChart;

    const sortedRsiPts = [...historyData.points]
      .filter(p => !!p.date)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .filter((pt, idx, arr) => idx === 0 || pt.date !== arr[idx - 1].date);

    const rsiLineSeries = rsiChart.addSeries(LineSeries, {
      color: '#6366f1', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: 'RSI 14'
    });

    const rsiData = sortedRsiPts
      .filter(p => typeof p.rsi === 'number' && !isNaN(p.rsi as number))
      .map(p => ({ time: p.date, value: p.rsi as number }));

    if (rsiData.length > 0) rsiLineSeries.setData(rsiData as any);

    rsiLineSeries.createPriceLine({
      price: 80, color: '#f43f5e', lineWidth: 1, lineStyle: LineStyle.Dashed,
      axisLabelVisible: true, title: 'Sobrecompra 80'
    });
    rsiLineSeries.createPriceLine({
      price: 30, color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed,
      axisLabelVisible: true, title: 'Sobreventa 30'
    });

    rsiChart.timeScale().fitContent();

    const mainChart = chartRef.current;
    if (mainChart) {
      const syncRsi = (range: any) => { if (range && rsiChartRef.current) rsiChartRef.current.timeScale().setVisibleLogicalRange(range); };
      const syncMain = (range: any) => { if (range && chartRef.current) chartRef.current.timeScale().setVisibleLogicalRange(range); };
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncRsi);
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(syncMain);
    }

    const rsiResize = new ResizeObserver(() => {
      if (container && rsiChartRef.current) rsiChartRef.current.applyOptions({ width: container.clientWidth });
    });
    rsiResize.observe(container);

    return () => {
      rsiResize.disconnect();
      if (rsiChartRef.current) { try { rsiChartRef.current.remove(); } catch {} rsiChartRef.current = null; }
    };
  }, [historyData, isSimple]);

  // =====================================================================
  // 7. Panel MACD 12/26/9 (gráfico nativo separado, sincronizado)
  // =====================================================================
  useEffect(() => {
    const container = macdContainerRef.current;
    if (!container || !historyData?.points || historyData.points.length === 0) return;

    if (macdChartRef.current) {
      macdChartRef.current.remove();
      macdChartRef.current = null;
    }

    const macdChart = createChart(container, {
      width: container.clientWidth,
      height: 140,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e2e8f0', scaleMargins: { top: 0.15, bottom: 0.15 } },
      timeScale: { borderColor: '#e2e8f0', timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true }
    });

    macdChartRef.current = macdChart;

    const sortedMacdPts = [...historyData.points]
      .filter(p => !!p.date)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .filter((pt, idx, arr) => idx === 0 || pt.date !== arr[idx - 1].date);

    const macdHistSeries = macdChart.addSeries(HistogramSeries, {
      priceLineVisible: false, lastValueVisible: false, title: 'MACD Hist'
    });
    const histData = sortedMacdPts
      .filter(p => typeof p.macdHist === 'number' && !isNaN(p.macdHist as number))
      .map(p => ({
        time: p.date,
        value: p.macdHist as number,
        color: (p.macdHist as number) >= 0 ? 'rgba(16,185,129,0.55)' : 'rgba(244,63,94,0.55)'
      }));
    if (histData.length > 0) macdHistSeries.setData(histData as any);

    const macdLineSeries = macdChart.addSeries(LineSeries, {
      color: '#3b82f6', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: 'MACD'
    });
    const macdLineData = sortedMacdPts
      .filter(p => typeof p.macdLine === 'number' && !isNaN(p.macdLine as number))
      .map(p => ({ time: p.date, value: p.macdLine as number }));
    if (macdLineData.length > 0) macdLineSeries.setData(macdLineData as any);

    const macdSignalSeries = macdChart.addSeries(LineSeries, {
      color: '#f59e0b', lineWidth: 2, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: true, title: 'Señal'
    });
    const macdSignalData = sortedMacdPts
      .filter(p => typeof p.macdSignal === 'number' && !isNaN(p.macdSignal as number))
      .map(p => ({ time: p.date, value: p.macdSignal as number }));
    if (macdSignalData.length > 0) macdSignalSeries.setData(macdSignalData as any);

    macdChart.timeScale().fitContent();

    const mainChart = chartRef.current;
    if (mainChart) {
      const syncMacd = (range: any) => { if (range && macdChartRef.current) macdChartRef.current.timeScale().setVisibleLogicalRange(range); };
      const syncMain = (range: any) => { if (range && chartRef.current) chartRef.current.timeScale().setVisibleLogicalRange(range); };
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncMacd);
      macdChart.timeScale().subscribeVisibleLogicalRangeChange(syncMain);
    }

    const macdResize = new ResizeObserver(() => {
      if (container && macdChartRef.current) macdChartRef.current.applyOptions({ width: container.clientWidth });
    });
    macdResize.observe(container);

    return () => {
      macdResize.disconnect();
      if (macdChartRef.current) { try { macdChartRef.current.remove(); } catch {} macdChartRef.current = null; }
    };
  }, [historyData, isSimple]);

  // Objetivo único que se enseña en cabecera y resumen (analistas en vivo o consenso guardado)
  const shownTarget = analystTargetMean ?? (targetMean > 0 ? targetMean : null);

  return (
    <section
      aria-label={`Cotización de ${company.ticker}`}
      className={`bg-white rounded-2xl border border-slate-200 ${isSimple ? 'p-4 sm:p-5 space-y-4' : 'p-5 sm:p-6 space-y-5'}`}
      id="company-price-chart-root"
    >
      {/* Cabecera: precio, variación del periodo y objetivo de analistas */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="m-0 font-serif text-lg font-semibold text-slate-900">
            {isSimple ? 'Evolución del precio' : 'Cotización'}
          </h3>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
            <span className="cifra text-[34px] leading-none text-slate-900">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`tabular text-sm font-semibold ${isPositivePeriod ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isPositivePeriod ? '+' : ''}{changeAmount.toFixed(2)} ({isPositivePeriod ? '+' : ''}{changePercent.toFixed(2)} %)
              <span className="font-normal text-slate-600"> en el periodo</span>
            </span>
            <span className="tabular text-sm text-slate-600">
              {shownTarget
                ? <>Objetivo de analistas <strong className="font-semibold text-slate-900">${shownTarget.toFixed(2)}</strong>
                    {targetMean > 0 && (
                      <span className={isDiscounted ? 'text-emerald-700' : 'text-rose-700'}>
                        {' '}({isDiscounted ? '+' : ''}{marginOfSafetyPct} %)
                      </span>
                    )}
                  </>
                : 'Sin objetivo de analistas'}
            </span>
          </div>
        </div>

        {isSimple ? (
          <div role="group" aria-label="Periodo del gráfico" className="flex items-center gap-1 p-0.5 rounded-md bg-slate-100 border border-slate-200 self-start lg:self-auto">
            {([
              { id: '6mo', label: '6 meses' },
              { id: '1y', label: '1 año' },
              { id: '5y', label: '5 años' }
            ] as { id: ChartPeriod; label: string }[]).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id)}
                aria-pressed={selectedPeriod === p.id}
                className={`h-8 px-3 rounded text-sm whitespace-nowrap transition-colors ${
                  selectedPeriod === p.id
                    ? 'bg-white border border-slate-200 font-semibold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <ChartControls
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            selectedInterval={selectedInterval}
            onSelectInterval={setSelectedInterval}
            chartType={chartType}
            onToggleChartType={setChartType}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            isPatternsLoading={isPatternsLoading}
            hasPatternsData={Boolean(patternsData)}
            onTogglePatterns={patternsData ? handleClosePatterns : handleAnalyzePatterns}
            showEma20={showEma20}
            onToggleEma20={() => setShowEma20(!showEma20)}
            currentEma20={currentEma20}
            showEma50={showEma50}
            onToggleEma50={() => setShowEma50(!showEma50)}
            currentEma50={currentEma50}
            showEma200={showEma200}
            onToggleEma200={() => setShowEma200(!showEma200)}
            currentEma200={currentEma200}
            showVolume={showVolume}
            onToggleVolume={() => setShowVolume(!showVolume)}
            showTargetLine={showTargetLine}
            onToggleTargetLine={() => setShowTargetLine(!showTargetLine)}
            analystTargetMean={analystTargetMean}
            showConsensusLine={showConsensusLine}
            onToggleConsensusLine={() => setShowConsensusLine(!showConsensusLine)}
            targetMean={targetMean}
          />
        )}
      </div>

      {!isSimple && (
        <div className="flex flex-wrap items-center justify-end text-xs">
          <ChartTooltip
            hoveredPoint={hoveredPoint}
            showEma20={showEma20}
            showEma50={showEma50}
            showEma200={showEma200}
            showVolume={showVolume}
            currentRsi={currentRsi}
            currentMacdLine={currentMacdLine}
            currentMacdSignal={currentMacdSignal}
          />
        </div>
      )}

      {/* Lienzo de Lightweight Charts */}
      <div className={`relative w-full ${isSimple ? 'h-[300px]' : 'h-[380px]'} rounded-lg overflow-hidden border border-slate-200 bg-white`}>
        {isLoading && (!historyData?.points || historyData.points.length === 0) ? (
          <div className="absolute inset-0 z-10 flex flex-col justify-end gap-3 p-6 bg-white" role="status">
            <div className="flex-1 flex items-end gap-1.5">
              {[38, 52, 45, 63, 58, 71, 66, 80, 74, 86, 79, 92].map((h, i) => (
                <div key={i} className="skeleton flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
              <span>Cargando la cotización de {company.ticker}…</span>
            </div>
          </div>
        ) : error && (!historyData?.points || historyData.points.length === 0) ? (
          <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-rose-50 text-rose-800 p-4 text-center gap-1">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
            <span className="text-sm font-semibold">{error}</span>
            <span className="text-sm text-rose-700">Comprueba la conexión y vuelve a cargar la ficha.</span>
          </div>
        ) : null}

        <div ref={chartContainerRef} className="w-full h-full" />

        {isPatternsLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30" role="status">
            <div className="bg-white rounded-lg px-5 py-4 shadow-xl flex items-center gap-3 max-w-xs border border-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-amber-700 shrink-0" />
              <p className="m-0 text-sm text-slate-700">Buscando soportes, resistencias y figuras en {company.ticker}…</p>
            </div>
          </div>
        )}
      </div>

      {isSimple ? (
        <p className="m-0 text-sm text-slate-600">
          La línea discontinua marca el precio objetivo medio de los analistas. Si el precio está muy por debajo, hay más margen de seguridad.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
          <span>Arrastra para recorrer el histórico; la rueda del ratón acerca y aleja.</span>
          {historyData?.points && (
            <span className="tabular">
              {historyData.points.length} velas, intervalo {selectedInterval}, periodo {selectedPeriod}
            </span>
          )}
        </div>
      )}

      {/* RSI y MACD: solo en Modo Analista */}
      {!isSimple && historyData?.points && historyData.points.some(p => p.rsi != null) && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">RSI (14)</span>
              {currentRsi !== null && currentRsi !== undefined && (
                <span className={`tabular ${currentRsi >= 80 ? 'text-rose-700' : currentRsi <= 30 ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {currentRsi.toFixed(1)}, {currentRsi >= 80 ? 'sobrecompra' : currentRsi <= 30 ? 'sobreventa' : 'neutral'}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-600">Bandas 30 y 80</span>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[130px]" />
        </div>
      )}

      {!isSimple && historyData?.points && historyData.points.some(p => p.macdLine != null) && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">MACD (12, 26, 9)</span>
              {currentMacdLine !== null && currentMacdLine !== undefined && (
                <span className={(currentMacdLine ?? 0) > (currentMacdSignal ?? 0) ? 'text-emerald-700' : 'text-rose-700'}>
                  {(currentMacdLine ?? 0) > (currentMacdSignal ?? 0) ? 'Por encima de la señal' : 'Por debajo de la señal'}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-600">Línea, señal e histograma</span>
          </div>
          <div ref={macdContainerRef} className="w-full h-[140px]" />
        </div>
      )}

      {!isSimple && showPatternsPanel && (
        <TechnicalPatternsPanel
          ticker={company.ticker}
          patternsData={patternsData}
          patternsError={patternsError}
          onClose={handleClosePatterns}
        />
      )}

      {/* Resumen */}
      <dl className={`m-0 grid ${isSimple ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-x-6 gap-y-3 pt-4 border-t border-slate-200`}>
        <div>
          <dt className="text-sm text-slate-600">Rango de 52 semanas</dt>
          <dd className="m-0 mt-0.5 tabular text-sm font-semibold text-slate-900">
            {historyData?.min52w != null && historyData?.max52w != null
              ? `$${historyData.min52w.toFixed(2)} a $${historyData.max52w.toFixed(2)}`
              : 'Sin datos'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Objetivo medio de analistas</dt>
          <dd className="m-0 mt-0.5 tabular text-sm font-semibold text-slate-900">
            {shownTarget ? `$${shownTarget.toFixed(2)}` : 'Sin cobertura'}
          </dd>
        </div>
        {!isSimple && (
          <div>
            <dt className="text-sm text-slate-600">Lectura del precio</dt>
            <dd className={`m-0 mt-0.5 text-sm font-semibold ${
              targetMean <= 0 ? 'text-slate-600' :
              marginOfSafetyPct >= 15 ? 'text-emerald-700' :
              marginOfSafetyPct >= 0 ? 'text-amber-700' :
              'text-rose-700'
            }`}>
              {targetMean <= 0
                ? 'Sin objetivo con el que comparar'
                : marginOfSafetyPct >= 15
                ? 'Cotiza con descuento'
                : marginOfSafetyPct >= 0
                ? 'Precio cercano al objetivo'
                : 'Cotiza por encima del objetivo'}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
};
