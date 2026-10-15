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
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('1y');
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>('1d');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>(simpleMode ? 'line' : 'candlestick');
  const [historyData, setHistoryData] = useState<PriceHistoryResponse | null>(null);
  const [targetsData, setTargetsData] = useState<AnalystTargetsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConsensusLine, setShowConsensusLine] = useState<boolean>(true);
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(!simpleMode);

  // Estados para las 3 Medias Móviles Exponenciales (Método de Guillermo Hernández)
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showEma200, setShowEma200] = useState<boolean>(true);

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
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#059669',
        borderDownColor: '#e11d48',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e'
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
        color: isPositivePeriod ? '#10b981' : '#f43f5e',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#ffffff',
        crosshairMarkerBorderColor: isPositivePeriod ? '#10b981' : '#f43f5e',
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
        color: '#6366f1', // Indigo elegante
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Precio Objetivo Promedio: $${analystTargetMean.toFixed(2)}`
      });
    }

    // E. Línea de Precio Objetivo de Wall Street con 'createPriceLine'
    if (mainSeriesRef.current && targetMean > 0 && showConsensusLine) {
      intrinsicPriceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: targetMean,
        color: '#6366f1',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Precio Objetivo Wall St: $${targetMean.toFixed(2)}`
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
  }, [historyData]);

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
  }, [historyData]);

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/80 ${simpleMode ? 'p-4 sm:p-5 shadow-xs space-y-4' : 'p-5 sm:p-6 shadow-sm space-y-5'}`} id="company-price-chart-root">
      {/* Header del Gráfico de Cotización */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              {simpleMode ? 'Tendencia Histórica de Precios' : 'Gráfica Bursátil Profesional (Lightweight Charts)'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
              {company.ticker}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 mt-1.5">
            <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight">
              ${currentPrice.toFixed(2)}
            </span>

            <div className={`flex items-center gap-1 text-xs sm:text-sm font-bold font-mono px-2.5 py-1 rounded-xl border ${
              isPositivePeriod
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {isPositivePeriod ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{isPositivePeriod ? '+' : ''}{changeAmount.toFixed(2)} ({isPositivePeriod ? '+' : ''}{changePercent.toFixed(2)}%)</span>
              <span className="text-[10px] opacity-75 font-normal ml-0.5">en el período</span>
            </div>

            {/* Comparativa con Consenso de Wall Street */}
            <div className="flex items-center gap-1.5 text-xs font-semibold font-mono px-3 py-1 rounded-xl border bg-indigo-50 text-indigo-900 border-indigo-200">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Consenso: {targetMean > 0 ? `$${targetMean.toFixed(2)}` : 'N/D'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                isDiscounted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isDiscounted ? `+${marginOfSafetyPct}% Upside` : `${Math.abs(marginOfSafetyPct)}% Downside`}
              </span>
            </div>

            {/* Comparativa con Precio Objetivo Promedio de Analistas */}
            {analystTargetMean && (
              <div className="flex items-center gap-1.5 text-xs font-semibold font-mono px-3 py-1 rounded-xl border bg-indigo-50 text-indigo-900 border-indigo-200">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                <span>Target Wall St: ${analystTargetMean.toFixed(2)}</span>
                {targetsData?.upsideMeanPercent !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                    targetsData.upsideMeanPercent >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {targetsData.upsideMeanPercent >= 0 ? '+' : ''}{targetsData.upsideMeanPercent.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controles de Vista y Toggles de Indicadores */}
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
      </div>

      <div className="flex flex-wrap items-center justify-end text-xs">

        {/* OHLCV + EMAs Hover Tooltip Bar */}
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

      {/* Contenedor Canvas del Gráfico Lightweight Charts */}
      <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-200/80 bg-white">
        {isLoading && (!historyData?.points || historyData.points.length === 0) ? (
          <div className="absolute inset-0 z-10 flex flex-col justify-end gap-3 p-6 bg-white" role="status">
            <div className="flex-1 flex items-end gap-1.5">
              {[38, 52, 45, 63, 58, 71, 66, 80, 74, 86, 79, 92].map((h, i) => (
                <div key={i} className="skeleton flex-1" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Sincronizando feed de cotización para {company.ticker}...</span>
            </div>
          </div>
        ) : error && (!historyData?.points || historyData.points.length === 0) ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-rose-50 text-rose-800 p-4 text-center space-y-1">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span className="text-xs font-bold">{error}</span>
            <span className="text-[11px] text-rose-700">Verificá la conexión a los feeds de mercado.</span>
          </div>
        ) : null}

        {/* Div contenedor donde Lightweight Charts inyecta su canvas */}
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Overlay de carga de patrones sobre el gráfico */}
        {isPatternsLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-2xl">
            <div className="bg-white rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3 max-w-xs text-center border border-violet-100">
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-violet-600 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Gemini AI Analizando</p>
                <p className="text-xs text-slate-500 mt-0.5">Identificando soportes, resistencias y figuras chartistas en {company.ticker}...</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda obligatoria debajo del gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 -mt-1 text-[11px] text-slate-400 font-sans italic gap-1">
        <span>Análisis generado por IA, interpretación orientativa, no es asesoría financiera.</span>
        <span className="text-[10px] text-indigo-500 font-mono not-italic font-medium">Cruce integral con EMA 20/50/200, RSI (14) y MACD (12/26/9)</span>
      </div>

      {/* Barra informativa de navegación con el mouse y velas cargadas */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 px-1 -mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>💡 Arrastrá con el click presionado para explorar el histórico · Rueda del mouse para zoom in/out</span>
        </div>
        {historyData?.points && (
          <span className="text-slate-500 font-medium">
            {historyData.points.length} velas ({selectedInterval.toUpperCase()} · {selectedPeriod.toUpperCase()})
          </span>
        )}
      </div>

      {/* ============================================================= */}
      {/* PANEL RSI-14 (Oculto en Modo Simple) */}
      {/* ============================================================= */}
      {historyData?.points && historyData.points.some(p => p.rsi != null) && (
        <div className="rounded-2xl border border-indigo-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100 bg-indigo-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-xs font-bold text-indigo-900 font-mono">RSI · 14 periodos</span>
              {currentRsi !== null && currentRsi !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  currentRsi >= 80 ? 'bg-rose-100 text-rose-700' :
                  currentRsi <= 30 ? 'bg-emerald-100 text-emerald-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                  {currentRsi.toFixed(1)}{currentRsi >= 80 ? ' · Sobrecompra' : currentRsi <= 30 ? ' · Sobreventa' : ' · Neutral'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-400 inline-block rounded"></span>80 SB</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded"></span>30 SV</span>
            </div>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[130px]" />
        </div>
      )}

      {/* ============================================================= */}
      {/* PANEL MACD 12/26/9 (Oculto en Modo Simple) */}
      {/* ============================================================= */}
      {historyData?.points && historyData.points.some(p => p.macdLine != null) && (
        <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-blue-100 bg-blue-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs font-bold text-blue-900 font-mono">MACD · 12 / 26 / 9</span>
              {currentMacdLine !== null && currentMacdLine !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  (currentMacdLine ?? 0) > (currentMacdSignal ?? 0)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {(currentMacdLine ?? 0) > (currentMacdSignal ?? 0) ? '▲ Alcista' : '▼ Bajista'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded"></span>MACD</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded border-dashed"></span>Señal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-400/50 inline-block rounded"></span>Hist</span>
            </div>
          </div>
          <div ref={macdContainerRef} className="w-full h-[140px]" />
        </div>
      )}

      {/* Panel de Análisis de Patrones Técnicos con IA */}
      {showPatternsPanel && (
        <TechnicalPatternsPanel
          ticker={company.ticker}
          patternsData={patternsData}
          patternsError={patternsError}
          onClose={handleClosePatterns}
        />
      )}

      {/* Estadísticas Resumen del Gráfico Bursátil */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-medium">
            Rango 52 Semanas
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
            ${historyData?.min52w?.toFixed(2) ?? (currentPrice * 0.82).toFixed(2)} - ${historyData?.max52w?.toFixed(2) ?? (currentPrice * 1.25).toFixed(2)}
          </span>
        </div>

        <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-medium">
            Precio Objetivo (Consenso Wall St)
          </span>
          <span className="text-xs sm:text-sm font-bold text-indigo-700 font-mono block mt-0.5">
            {targetMean > 0 ? `$${targetMean.toFixed(2)}` : 'N/D'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-medium">
            Precio Objetivo Wall St
          </span>
          <span className="text-xs sm:text-sm font-bold text-indigo-700 font-mono block mt-0.5">
            {analystTargetMean ? `$${analystTargetMean.toFixed(2)}` : 'Sincronizando...'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-500 font-mono uppercase block font-medium">
            Criterio de Decisión
          </span>
          <span className={`text-xs font-bold block mt-0.5 ${
            marginOfSafetyPct >= 15
              ? 'text-emerald-700'
              : marginOfSafetyPct >= 0
              ? 'text-amber-700'
              : 'text-rose-700'
          }`}>
            {marginOfSafetyPct >= 15
              ? '🟢 Compra con Descuento'
              : marginOfSafetyPct >= 0
              ? '🟡 Precio Justo / Sin Ganga'
              : '🔴 Cotiza con Sobreprecio'}
          </span>
        </div>
      </div>
    </div>
  );
};
