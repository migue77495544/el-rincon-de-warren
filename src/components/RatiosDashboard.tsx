import React, { useState, useMemo } from 'react';
import { CompanyAnalysis, TrafficLight } from '../types';
import {
  Layers,
  Shield,
  Scale,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Building,
  DollarSign,
  Percent,
  Gauge
} from 'lucide-react';
import { InfoTooltip } from './SmartTooltip';
import { ScrollRail } from './ui/ScrollRail';

interface RatiosDashboardProps {
  selectedCompany: CompanyAnalysis;
  onSelectRatioForAnalysis?: (ratioKey: string) => void;
  onNavigateToView?: (view: 'semaphores' | 'visualizer' | 'chart' | 'formulas') => void;
}

type DimensionFilter = 'all' | 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion';
type StatusFilter = 'all' | 'green' | 'yellow' | 'red';

interface RatioCardDef {
  key: string;
  name: string;
  shortSymbol: string;
  dimension: 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion';
  dimensionLabel: string;
  value: number;
  formatted: string;
  status: TrafficLight;
  benchmark: string;
  numLabel: string;
  denLabel: string;
  numValue: number;
  denValue: number;
  numUnit: string;
  denUnit: string;
  isPercent?: boolean;
  explanation: string;
  greenThreshold: string;
  yellowThreshold: string;
  redThreshold: string;
  fidelityNote: string;
  formulaTex: string;
  sectorBenchmark?: number;
  sectorBenchmarkLabel?: string;
}

export const RatiosDashboard: React.FC<RatiosDashboardProps> = ({
  selectedCompany,
  onSelectRatioForAnalysis,
  onNavigateToView
}) => {
  const [selectedDimension, setSelectedDimension] = useState<DimensionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [simulatorOverrides, setSimulatorOverrides] = useState<Record<string, { num: number; den: number }>>({});
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
  const [auditTestRun, setAuditTestRun] = useState<boolean>(false);

  const raw = selectedCompany.raw;
  const ratios = selectedCompany.ratios;
  const sectorBenchmarks = selectedCompany.sectorBenchmarks;

  // Determine if company value is better than sector benchmark
  const isBetterThanSector = (key: string, companyVal: number, sectorVal: number): boolean => {
    if (key === 'endeudamiento' || key === 'per' || key === 'pb' || key === 'ke') {
      return companyVal < sectorVal;
    }
    return companyVal > sectorVal;
  };

  // Format sector comparison string
  const formatSectorLabel = (key: string, sectorVal: number): string => {
    if (key === 'liquidezCorriente' || key === 'endeudamiento' || key === 'per' || key === 'pb' || key === 'current_ratio') {
      return `${sectorVal.toFixed(2)}x`;
    }
    if (key === 'roe' || key === 'yieldDividendo' || key === 'ke') {
      return `${sectorVal.toFixed(1)}%`;
    }
    return `${sectorVal.toFixed(2)}`;
  };

  // Generate dynamic tooltip text for sector comparison
  const getSectorTooltip = (key: string, companyVal: number, sectorVal: number): string => {
    const diff = companyVal - sectorVal;
    const diffPct = sectorVal !== 0 ? (diff / sectorVal) * 100 : 0;
    const isBetter = isBetterThanSector(key, companyVal, sectorVal);
    
    switch (key) {
      case 'liquidezCorriente':
        return isBetter
          ? `Liquidez ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x (+${diff.toFixed(2)}x). Superior liquidez que brinda colchón frente a deudas a corto plazo.`
          : `Liquidez ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x (${diff.toFixed(2)}x menos). La empresa podría tener dificultades frente a sus pares en pagos inmediatos.`;
      case 'endeudamiento':
        return isBetter
          ? `Deuda/Patrimonio ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Menor apalancamiento reduce riesgo financiero y presión de intereses.`
          : `Deuda/Patrimonio ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Mayor apalancamiento incrementa riesgo financiero frente a la industria.`;
      case 'roe':
        return isBetter
          ? `ROE ${companyVal.toFixed(1)}% vs Sector ${sectorVal.toFixed(1)}% (+${diff.toFixed(1)} pp). Un ROE superior al promedio del sector indica ventaja competitiva o mayor eficiencia en la generación de utilidades.`
          : `ROE ${companyVal.toFixed(1)}% vs Sector ${sectorVal.toFixed(1)}% (${Math.abs(diff).toFixed(1)} pp menos). ROE por debajo del sector sugiere falta de ventaja competitiva o comoditización.`;
      case 'per':
        return isBetter
          ? `PER ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. La acción cotiza con descuento relativo, lo que puede indicar valor relativo o problemas de crecimiento.`
          : `PER ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. La acción cotiza con prima frente al sector, posible sobrevaloración o expectativas de crecimiento.`;
      case 'pb':
        return isBetter
          ? `P/B ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Valoración más moderada respecto al balance contable frente a pares.`
          : `P/B ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Valoración por encima del sector, posible sobrevaluación o prima de intangibles.`;
      default:
        return `Empresa: ${companyVal.toFixed(2)} vs Sector: ${sectorVal.toFixed(2)} (${diffPct.toFixed(1)}%)`;
    }
  };

  // Toggle card expansion
  const toggleCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset simulator override for a ratio
  const resetRatioSimulator = (key: string) => {
    setSimulatorOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Reset all simulators
  const resetAllSimulators = () => {
    setSimulatorOverrides({});
  };

  // Map of all 11 core ratios + Graham Margin
  const ratioDefinitions: RatioCardDef[] = useMemo(() => {
    // Valores reales o derivados de la empresa
    const bpaVal = ratios.bpa.value || (raw.numeroAcciones > 0 ? (raw.utilidadNeta * 1000000) / (raw.numeroAcciones * 1000000) : 0);
    const inventarios = Math.max(0, raw.inventarios);
    const numeradorAcida = Math.max(0, raw.activoCirculante - inventarios);
    const sb = sectorBenchmarks;

    const getSectorVal = (key: string): number | undefined => {
      switch (key) {
        case 'liquidezCorriente': return sb?.current_ratio_sector;
        case 'endeudamiento': return sb?.debt_equity_sector;
        case 'roe': return sb?.roe_sector;
        case 'per': return sb?.pe_sector;
        case 'pb': return sb?.pb_sector;
        case 'ke': return sb?.ke_sector;
        default: return undefined;
      }
    };

    return [
      // --- LIQUIDEZ ---
      {
        key: 'liquidezCorriente',
        name: 'Liquidez Corriente',
        shortSymbol: 'CR',
        dimension: 'liquidez',
        dimensionLabel: 'Liquidez',
        value: ratios.liquidezCorriente.value,
        formatted: ratios.liquidezCorriente.formatted,
        status: ratios.liquidezCorriente.status,
        benchmark: '≥ 1.50x (Graham)',
        numLabel: 'Activo Circulante',
        denLabel: 'Pasivo Circulante',
        numValue: raw.activoCirculante,
        denValue: raw.pasivoCirculante || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: 'Activo Circulante / Pasivo Circulante',
        explanation: 'Evalúa la capacidad de pago a corto plazo (<12 meses). Mide cuántos dólares en activos líquidos existen por cada dólar de deuda que vence en el año.',
        greenThreshold: '≥ 1.50x: Colchón de tesorería confortable según el estándar clásico de Benjamin Graham.',
        yellowThreshold: '1.10x – 1.49x: Liquidez ajustada. Requiere cobros ágiles para no tensionar caja.',
        redThreshold: '< 1.10x: Riesgo inminente de cesación de pagos o necesidad de créditos puente urgentes.',
        fidelityNote: 'Fidelidad 100%: Extrae Activo y Pasivo Corriente directamente del Balance General (10-K).',
        sectorBenchmark: getSectorVal('liquidezCorriente'),
        sectorBenchmarkLabel: sb?.current_ratio_sector != null ? `vs Sector: ${sb.current_ratio_sector.toFixed(2)}x` : undefined
      },
      {
        key: 'ratioTesoreriaPruebaAcida',
        name: 'Prueba Ácida (Quick Ratio)',
        shortSymbol: 'QR',
        dimension: 'liquidez',
        dimensionLabel: 'Liquidez',
        value: ratios.ratioTesoreriaPruebaAcida.value,
        formatted: ratios.ratioTesoreriaPruebaAcida.formatted,
        status: ratios.ratioTesoreriaPruebaAcida.status,
        benchmark: '≥ 1.00x (Sin Inventario)',
        numLabel: 'Activo Circulante - Inventarios',
        denLabel: 'Pasivo Circulante',
        numValue: numeradorAcida,
        denValue: raw.pasivoCirculante || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: '(Activo Circulante - Inventarios) / Pasivo Circulante',
        explanation: 'Filtra los inventarios por ser el activo circulante menos líquido y sujeto a obsolescencia o descuentos forzados. Valora si el efectivo y clientes cubren toda la deuda inmediata.',
        greenThreshold: '≥ 1.00x: Cobertura total de pasivos corrientes sin verse forzado a liquidar stock.',
        yellowThreshold: '0.50x – 0.99x: Dependencia parcial de ventas de inventario para honrar compromisos.',
        redThreshold: '< 0.50x: Fuerte vulnerabilidad ante frenazos de ventas o retrasos en cobros.',
        fidelityNote: 'Fidelidad 100%: Aplica rigurosamente el estándar internacional excluyendo exclusivamente el stock de inventario.'
      },
      {
        key: 'disponibilidadInmediata',
        name: 'Disponibilidad Inmediata',
        shortSymbol: 'CASH',
        dimension: 'liquidez',
        dimensionLabel: 'Liquidez',
        value: ratios.disponibilidadInmediata.value,
        formatted: ratios.disponibilidadInmediata.formatted,
        status: ratios.disponibilidadInmediata.status,
        benchmark: '≥ 0.30x (Efectivo Puro)',
        numLabel: 'Efectivo y Equivalentes',
        denLabel: 'Pasivo Circulante',
        numValue: raw.efectivo,
        denValue: raw.pasivoCirculante || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: 'Efectivo y Equivalentes / Pasivo Circulante',
        explanation: 'Mide la proporción de dinero contante y sonante (caja y depósitos a la vista) frente a todas las deudas exigibles de forma inmediata.',
        greenThreshold: '≥ 0.30x: Capacidad para amortizar 30% del pasivo corriente en 24 horas.',
        yellowThreshold: '0.15x – 0.29x: Nivel de caja operativo estándar en industrias de rotación rápida.',
        redThreshold: '< 0.15x: Asfixia monetaria; cualquier imprevisto exige financiamiento bancario.',
        fidelityNote: 'Fidelidad 100%: Coteja la partida de Caja e Inversiones a corto plazo de máxima liquidez.'
      },

      // --- SOLVENCIA ---
      {
        key: 'endeudamiento',
        name: 'Ratio de Endeudamiento (D/E)',
        shortSymbol: 'D/E',
        dimension: 'solvencia',
        dimensionLabel: 'Solvencia',
        value: ratios.endeudamiento.value,
        formatted: ratios.endeudamiento.formatted,
        status: ratios.endeudamiento.status,
        benchmark: '≤ 1.00x (Conservador)',
        numLabel: 'Pasivo Total',
        denLabel: 'Patrimonio Neto',
        numValue: raw.totalPasivo,
        denValue: raw.patrimonioNeto || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: 'Total Pasivo / Patrimonio Neto',
        explanation: 'Apalancamiento patrimonial: Compara los recursos ajenos frente a los fondos propios aportados por accionistas y beneficios acumulados.',
        greenThreshold: '≤ 1.00x: Estructura conservadora. El negocio pertenece mayoritariamente a sus dueños.',
        yellowThreshold: '1.01x – 2.00x: Endeudamiento moderado; requiere supervisión de tipos de interés.',
        redThreshold: '> 2.00x: Sobreendeudamiento peligroso. Los acreedores asumen el control financiero.',
        fidelityNote: 'Fidelidad 100%: Total Pasivo auditado entre Fondos Propios contables del Balance.',
        sectorBenchmark: getSectorVal('endeudamiento'),
        sectorBenchmarkLabel: sb?.debt_equity_sector != null ? `vs Sector: ${sb.debt_equity_sector.toFixed(2)}x` : undefined
      },
      {
        key: 'coberturaIntereses',
        name: 'Cobertura de Intereses (ICR)',
        shortSymbol: 'ICR',
        dimension: 'solvencia',
        dimensionLabel: 'Solvencia',
        value: ratios.coberturaIntereses.value,
        formatted: ratios.coberturaIntereses.formatted,
        status: ratios.coberturaIntereses.status,
        benchmark: '≥ 5.0x (Holgura Operativa)',
        numLabel: 'EBIT (Beneficio Operativo)',
        denLabel: 'Gastos Financieros por Intereses',
        numValue: raw.ebit,
        denValue: raw.interesesPorPagar > 0 ? raw.interesesPorPagar : 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: 'EBIT / Gastos de Intereses',
        explanation: 'Cuántas veces el resultado de explotación operativo es capaz de pagar la factura financiera de la deuda. Clave para evitar crisis de refinanciación.',
        greenThreshold: '≥ 5.0x: Capacidad sobrada para absorber incrementos en el coste de financiación.',
        yellowThreshold: '2.5x – 4.9x: Cobertura justa. Sensible a caídas de margen operativo.',
        redThreshold: '< 2.5x: Zona de alerta crediticia grave. El beneficio es devorado por bancos.',
        fidelityNote: 'Fidelidad 100%: Considera EBIT del Estado de Resultados e intereses devengados.'
      },

      // --- RENTABILIDAD ---
      {
        key: 'roe',
        name: 'Rentabilidad sobre Fondos Propios (ROE)',
        shortSymbol: 'ROE',
        dimension: 'rentabilidad',
        dimensionLabel: 'Rentabilidad',
        value: ratios.roe.value * 100,
        formatted: ratios.roe.formatted,
        status: ratios.roe.status,
        benchmark: '≥ 15.0% (Criterio Buffett)',
        numLabel: 'Utilidad Neta Anual',
        denLabel: 'Patrimonio Neto Promedio',
        numValue: raw.utilidadNeta,
        denValue: raw.patrimonioNeto || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: true,
        formulaTex: '(Utilidad Neta / Patrimonio Neto) × 100',
        explanation: 'El indicador de excelencia de Warren Buffett: Retorno generado por cada dólar que los accionistas mantienen retenido en la empresa. Refleja el poder del foso económico (Moat).',
        greenThreshold: '≥ 15.0%: Foso competitivo amplio. Capacidad sobresaliente de asignación de capital.',
        yellowThreshold: '8.0% – 14.9%: Rentabilidad media alineada con el coste de capital medio de mercado.',
        redThreshold: '< 8.0%: Destrucción de valor o negocio comoditizado sin ventaja competitiva.',
        fidelityNote: 'Fidelidad 100%: Resultado del ejercicio neto dividido entre capital contable limpio.',
        sectorBenchmark: getSectorVal('roe'),
        sectorBenchmarkLabel: sb?.roe_sector != null ? `vs Sector: ${sb.roe_sector.toFixed(1)}%` : undefined
      },
      {
        key: 'roa',
        name: 'Rentabilidad sobre Activos Totales (ROA)',
        shortSymbol: 'ROA',
        dimension: 'rentabilidad',
        dimensionLabel: 'Rentabilidad',
        value: ratios.roa.value * 100,
        formatted: ratios.roa.formatted,
        status: ratios.roa.status,
        benchmark: '≥ 8.0% (Asset-Light)',
        numLabel: 'Utilidad Neta Anual',
        denLabel: 'Activos Totales en Balance',
        numValue: raw.utilidadNeta,
        denValue: raw.activosTotales || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: true,
        formulaTex: '(Utilidad Neta / Activos Totales) × 100',
        explanation: 'Mide la eficiencia de la máquina operativa sin el sesgo del apalancamiento. Cuánta ganancia neta produce cada dólar invertido en instalaciones, inventario y activos.',
        greenThreshold: '≥ 8.0%: Negocio intensivo en propiedad intelectual y ligero en activos (Asset-Light).',
        yellowThreshold: '4.0% – 7.9%: Rendimiento aceptable para compañías manufactureras o de distribución.',
        redThreshold: '< 4.0%: Industria excesivamente devoradora de capital con baja productividad.',
        fidelityNote: 'Fidelidad 100%: Vinculación directa entre cuenta de pérdidas y activo total consolidado.'
      },

      // --- VALORACIÓN ---
      {
        key: 'per',
        name: 'Múltiplo Precio / Beneficio (PER)',
        shortSymbol: 'P/E',
        dimension: 'valoracion',
        dimensionLabel: 'Valoración',
        value: ratios.per.value,
        formatted: ratios.per.formatted,
        status: ratios.per.status,
        benchmark: '≤ 18.0x (Zona Graham)',
        numLabel: 'Precio de Cotización Actual',
        denLabel: 'Beneficio por Acción (BPA / EPS)',
        numValue: raw.precioCotizacion,
        denValue: bpaVal > 0 ? bpaVal : 1,
        numUnit: '$',
        denUnit: '$/acc',
        isPercent: false,
        formulaTex: 'Precio de Cotización / BPA',
        explanation: 'Número de años de beneficios actuales que pagas en el precio de la acción. Inverso del Earnings Yield. Indica si compras a precio razonable o con euforia de mercado.',
        greenThreshold: '1.0x – 18.0x: Zona de valor histórico o descuento atractivo (Criterio Benjamin Graham).',
        yellowThreshold: '18.1x – 26.0x: Precio justo para compañías excelentes con crecimiento predecible.',
        redThreshold: '> 26.0x o Pérdidas: Valoración muy exigente; descuenta crecimientos que no admiten errores.',
        fidelityNote: 'Fidelidad 100%: Cotización real de bolsa dividida entre el BPA diluido del ejercicio.',
        sectorBenchmark: getSectorVal('per'),
        sectorBenchmarkLabel: sb?.pe_sector != null ? `vs Sector: ${sb.pe_sector.toFixed(2)}x` : undefined
      },
      {
        key: 'pb',
        name: 'Precio / Valor Contable (P/B)',
        shortSymbol: 'P/B',
        dimension: 'valoracion',
        dimensionLabel: 'Valoración',
        value: ratios.pb.value,
        formatted: ratios.pb.formatted,
        status: ratios.pb.status,
        benchmark: '≤ 2.50x (Valor Contable)',
        numLabel: 'Capitalización Bursátil',
        denLabel: 'Patrimonio Neto Contable',
        numValue: raw.capitalizacionBursatil,
        denValue: raw.patrimonioNeto || 1,
        numUnit: '$M',
        denUnit: '$M',
        isPercent: false,
        formulaTex: 'Capitalización Bursátil / Patrimonio Neto',
        explanation: 'Prima o descuento de la bolsa respecto al valor en libros de los activos netos. Muy útil en empresas industriales, financieras y defensivas.',
        greenThreshold: '≤ 2.50x: Descuento patrimonial. Adquisición cerca del suelo de liquidación contable.',
        yellowThreshold: '2.51x – 5.00x: Prima estándar de mercado por intangibles y fondo de comercio.',
        redThreshold: '> 5.00x: Desconexión total del balance físico; depende exclusivamente de flujos futuros.',
        fidelityNote: 'Fidelidad 100%: MktCap (Precio × Acciones) entre Equity en libros.',
        sectorBenchmark: getSectorVal('pb'),
        sectorBenchmarkLabel: sb?.pb_sector != null ? `vs Sector: ${sb.pb_sector.toFixed(2)}x` : undefined
      },
      {
        key: 'bpa',
        name: 'Beneficio por Acción (BPA / EPS)',
        shortSymbol: 'EPS',
        dimension: 'valoracion',
        dimensionLabel: 'Valoración',
        value: ratios.bpa.value,
        formatted: ratios.bpa.formatted,
        status: ratios.bpa.status,
        benchmark: '> $0.00 (Ganancias Reales)',
        numLabel: 'Utilidad Neta',
        denLabel: 'Número de Acciones en Circulación',
        numValue: raw.utilidadNeta,
        denValue: raw.numeroAcciones || 1,
        numUnit: '$M',
        denUnit: 'M acciones',
        isPercent: false,
        formulaTex: 'Utilidad Neta / N° Acciones Diluidas',
        explanation: 'El beneficio neto atribuible a cada acción. Es la base sobre la que se calculan el dividendo, el PER y el valor intrínseco Graham.',
        greenThreshold: '> $0.00 y en crecimiento sostenido anual: Negocio rentable que genera riqueza por acción.',
        yellowThreshold: 'Estancamiento frente al año anterior: Alerta sobre falta de apalancamiento operativo.',
        redThreshold: '≤ $0.00: Pérdidas netas contables; la compañía quema capital accionarial.',
        fidelityNote: 'Fidelidad 100%: Beneficio neto entre acciones diluidas totales.'
      },
      {
        key: 'yieldDividendo',
        name: 'Rendimiento por Dividendo (Yield)',
        shortSymbol: 'DIV',
        dimension: 'valoracion',
        dimensionLabel: 'Valoración',
        value: ratios.yieldDividendo.value * 100,
        formatted: ratios.yieldDividendo.formatted,
        status: ratios.yieldDividendo.status,
        benchmark: '≥ 2.0% (Flujo al Inversor)',
        numLabel: 'Dividendo Anual por Acción',
        denLabel: 'Precio de Cotización',
        numValue: raw.dividendoPorAccion,
        denValue: raw.precioCotizacion || 1,
        numUnit: '$/acc',
        denUnit: '$/acc',
        isPercent: true,
        formulaTex: '(Dividendo por Acción / Precio Cotización) × 100',
        explanation: 'Rendimiento en efectivo inmediato devuelto directamente al bolsillo del accionista como porcentaje del capital desembolsado.',
        greenThreshold: '≥ 2.50%: Generosa renta periódica que compensa la volatilidad del mercado.',
        yellowThreshold: '1.00% – 2.49%: Dividendo conservador con alta tasa de reinversión en el negocio.',
        redThreshold: '< 1.00% o 0.0%: Dividendo nulo (típico en crecimiento) o riesgo de recorte si el payout es alto.',
        fidelityNote: 'Fidelidad 100%: Dividendo efectivo anualizado reportado entre cotización viva.'
      }
    ];
  }, [ratios, raw, sectorBenchmarks]);

  // Filtered ratios list
  const filteredRatios = useMemo(() => {
    return ratioDefinitions.filter(ratio => {
      // Dimension filter
      if (selectedDimension !== 'all' && ratio.dimension !== selectedDimension) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && ratio.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ratio.name.toLowerCase().includes(q) ||
          ratio.shortSymbol.toLowerCase().includes(q) ||
          ratio.dimensionLabel.toLowerCase().includes(q) ||
          ratio.explanation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ratioDefinitions, selectedDimension, statusFilter, searchQuery]);

  // Statistics counters
  const counts = useMemo(() => {
    let green = 0;
    let yellow = 0;
    let red = 0;
    ratioDefinitions.forEach(r => {
      if (r.status === 'green') green++;
      else if (r.status === 'yellow') yellow++;
      else red++;
    });
    return { green, yellow, red, total: ratioDefinitions.length };
  }, [ratioDefinitions]);

  // Calculate simulated value for a card
  const getCardValues = (ratio: RatioCardDef) => {
    const override = simulatorOverrides[ratio.key];
    const num = override ? override.num : ratio.numValue;
    const den = override ? override.den : ratio.denValue;
    const isSimulated = !!override;

    let simVal = 0;
    if (den > 0) {
      simVal = ratio.isPercent ? (num / den) * 100 : num / den;
    }

    // Dynamic simulated status based on ratio thresholds
    let simStatus: TrafficLight = ratio.status;
    if (isSimulated) {
      if (ratio.key === 'liquidezCorriente') {
        simStatus = simVal >= 1.5 ? 'green' : simVal >= 1.1 ? 'yellow' : 'red';
      } else if (ratio.key === 'ratioTesoreriaPruebaAcida') {
        simStatus = simVal >= 1.0 ? 'green' : simVal >= 0.5 ? 'yellow' : 'red';
      } else if (ratio.key === 'disponibilidadInmediata') {
        simStatus = simVal >= 0.3 ? 'green' : simVal >= 0.15 ? 'yellow' : 'red';
      } else if (ratio.key === 'endeudamiento') {
        simStatus = simVal <= 1.0 ? 'green' : simVal <= 2.0 ? 'yellow' : 'red';
      } else if (ratio.key === 'coberturaIntereses') {
        simStatus = simVal >= 5.0 ? 'green' : simVal >= 2.5 ? 'yellow' : 'red';
      } else if (ratio.key === 'roe') {
        simStatus = simVal >= 15.0 ? 'green' : simVal >= 8.0 ? 'yellow' : 'red';
      } else if (ratio.key === 'roa') {
        simStatus = simVal >= 8.0 ? 'green' : simVal >= 4.0 ? 'yellow' : 'red';
      } else if (ratio.key === 'per') {
        simStatus = simVal > 0 && simVal <= 18 ? 'green' : simVal <= 26 ? 'yellow' : 'red';
      } else if (ratio.key === 'pb') {
        simStatus = simVal > 0 && simVal <= 2.5 ? 'green' : simVal <= 5.0 ? 'yellow' : 'red';
      } else if (ratio.key === 'bpa') {
        simStatus = simVal > 0 ? 'green' : 'red';
      } else if (ratio.key === 'yieldDividendo') {
        simStatus = simVal >= 2.5 ? 'green' : simVal >= 1.0 ? 'yellow' : 'red';
      }
    }

    return {
      num,
      den,
      value: isSimulated ? simVal : ratio.value,
      formatted: isSimulated
        ? ratio.isPercent
          ? `${simVal.toFixed(1)}%`
          : `${simVal.toFixed(2)}${ratio.key === 'per' || ratio.key === 'pb' ? 'x' : ratio.key === 'bpa' ? '$' : 'x'}`
        : ratio.formatted,
      status: simStatus,
      isSimulated
    };
  };

  const STATUS_META: Record<TrafficLight, { label: string; dot: string; text: string }> = {
    green: { label: 'Sano', dot: 'bg-emerald-600', text: 'text-emerald-800' },
    yellow: { label: 'Vigilar', dot: 'bg-amber-500', text: 'text-amber-800' },
    red: { label: 'Alerta', dot: 'bg-rose-600', text: 'text-rose-800' }
  };

  const DIMENSION_TABS: { id: DimensionFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'liquidez', label: 'Liquidez' },
    { id: 'solvencia', label: 'Solvencia' },
    { id: 'rentabilidad', label: 'Rentabilidad' },
    { id: 'valoracion', label: 'Valoración' }
  ];
  const dimensionCount = (id: DimensionFilter) =>
    id === 'all' ? ratioDefinitions.length : ratioDefinitions.filter(r => r.dimension === id).length;

  return (
    <div className="space-y-5" id="ratios-dashboard-root">
      {/* Resumen y filtros */}
      <section aria-labelledby="ratios-titulo" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 id="ratios-titulo" className="m-0 font-serif text-[22px] font-semibold text-slate-900">
              Los 11 ratios de {selectedCompany.ticker}
            </h2>
            <p className="mt-1 mb-0 text-sm text-slate-600 max-w-[64ch]">
              Liquidez, solvencia, rentabilidad y valoración frente a los umbrales de Graham y Buffett. Despliega un ratio para ver su fórmula y simular escenarios.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {Object.keys(simulatorOverrides).length > 0 && (
              <button
                type="button"
                onClick={resetAllSimulators}
                className="h-9 px-3 rounded-md text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 flex items-center gap-1.5 transition-colors"
                title="Restaurar todos los ratios a los datos contables reales"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar datos reales</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              aria-expanded={showAuditPanel}
              aria-controls="ratios-calculo"
              className={`h-9 px-3 rounded-md text-sm font-medium border flex items-center gap-1.5 transition-colors ${
                showAuditPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{showAuditPanel ? 'Ocultar cálculos' : 'Ver cálculos'}</span>
            </button>
          </div>
        </div>

        {/* Semáforo agregado */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            {(['green', 'yellow', 'red'] as TrafficLight[]).map(st => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[st].dot}`} aria-hidden="true" />
                <span className="tabular font-semibold text-slate-900">{counts[st]}</span>
                <span className="text-slate-600">{STATUS_META[st].label.toLowerCase()}</span>
              </span>
            ))}
          </div>
          <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-slate-100" aria-hidden="true">
            <div style={{ width: `${(counts.green / counts.total) * 100}%` }} className="bg-emerald-600" />
            <div style={{ width: `${(counts.yellow / counts.total) * 100}%` }} className="bg-amber-500" />
            <div style={{ width: `${(counts.red / counts.total) * 100}%` }} className="bg-rose-600" />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <ScrollRail as="div" label="Filtrar por dimensión" fadeFrom="from-white" activeKey={selectedDimension} className="min-w-0 max-w-full" innerClassName="gap-1">
            {DIMENSION_TABS.map(tab => {
              const active = selectedDimension === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedDimension(tab.id)}
                  aria-pressed={active}
                  aria-current={active ? 'true' : undefined}
                  className={`shrink-0 h-8 px-3 rounded-md text-sm whitespace-nowrap transition-colors ${
                    active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label} <span className={`tabular ${active ? 'text-slate-300' : 'text-slate-500'}`}>{dimensionCount(tab.id)}</span>
                </button>
              );
            })}
          </ScrollRail>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filtrar por semáforo" className="flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200">
              {(['all', 'green', 'yellow', 'red'] as StatusFilter[]).map(st => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    aria-pressed={active}
                    aria-label={st === 'all' ? 'Todos los estados' : `Solo ${STATUS_META[st as TrafficLight].label.toLowerCase()}`}
                    className={`h-7 px-2.5 rounded text-sm flex items-center gap-1.5 transition-colors ${
                      active ? 'bg-white border border-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all' ? 'Todos' : (
                      <>
                        <span className={`w-2 h-2 rounded-full ${STATUS_META[st as TrafficLight].dot}`} aria-hidden="true" />
                        <span className="tabular">{counts[st as TrafficLight]}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar ratio"
                aria-label="Buscar ratio o fórmula"
                className="h-9 w-40 pl-8 pr-3 rounded-md border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cálculo de cada ratio con los datos del balance */}
      {showAuditPanel && (
        <section id="ratios-calculo" aria-labelledby="ratios-calculo-titulo" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="ratios-calculo-titulo" className="m-0 font-serif text-lg font-semibold text-slate-900">Cómo se calcula cada ratio</h3>
              <p className="mt-1 mb-0 text-sm text-slate-600 max-w-[68ch]">
                Fórmula contable, cifras de {selectedCompany.ticker} que intervienen y resultado. Las cifras proceden de los estados financieros publicados (10-K y 10-Q).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAuditPanel(false)}
              className="w-8 h-8 shrink-0 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
              aria-label="Cerrar cálculos"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th scope="col" className="py-2 px-3 font-semibold">Ratio</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Fórmula</th>
                  <th scope="col" className="py-2 px-3 font-semibold text-right">Numerador / denominador</th>
                  <th scope="col" className="py-2 px-3 font-semibold text-right">Resultado</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {ratioDefinitions.map(r => (
                  <tr key={r.key}>
                    <th scope="row" className="py-2.5 px-3 font-medium text-slate-900">{r.name}</th>
                    <td className="py-2.5 px-3 text-slate-600">{r.formulaTex}</td>
                    <td className="py-2.5 px-3 tabular text-right whitespace-nowrap">
                      {r.numValue.toLocaleString('es-ES')} / {r.denValue.toLocaleString('es-ES')}
                    </td>
                    <td className="py-2.5 px-3 tabular text-right font-semibold text-slate-900">{r.formatted}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.fidelityNote.replace(/^Fidelidad[^:]*:\s*/, '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 pl-5 space-y-1 text-sm text-slate-600 list-disc max-w-[80ch]">
            <li>La prueba ácida excluye los inventarios y conserva efectivo y cuentas a cobrar (criterio GAAP).</li>
            <li>Sin gasto por intereses, la cobertura se muestra como «sin deuda» en lugar de dividir por cero.</li>
            <li>Con beneficio negativo, el PER se marca como no disponible y en rojo para no enseñar un múltiplo engañoso.</li>
          </ul>
        </section>
      )}

      {/* Ratios: valor, semáforo y umbral; el detalle al desplegar */}
      {filteredRatios.length === 0 ? (
        <p className="m-0 py-10 text-center text-sm text-slate-600">
          Ningún ratio coincide con los filtros. Cambia la dimensión, el semáforo o la búsqueda.
        </p>
      ) : (
        <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredRatios.map(ratio => {
            const cardState = getCardValues(ratio);
            const isExpanded = !!expandedCards[ratio.key];
            const meta = STATUS_META[cardState.status];
            const detailId = `ratio-detalle-${ratio.key}`;
            const better = ratio.sectorBenchmark != null && isBetterThanSector(ratio.key, cardState.value, ratio.sectorBenchmark);

            return (
              <li
                key={ratio.key}
                className={`bg-white rounded-lg border ${cardState.isSimulated ? 'border-amber-400' : 'border-slate-200'} ${isExpanded ? 'sm:col-span-2 xl:col-span-3' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="m-0 text-[15px] font-semibold text-slate-900 leading-snug flex items-center">
                      {ratio.name}
                      {ratio.key === 'roe' && <InfoTooltip concept="roe" />}
                    </h4>
                    <span className={`shrink-0 flex items-center gap-1.5 text-sm font-medium ${meta.text}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-2 cifra text-[30px] leading-none text-slate-900">
                    {cardState.formatted}
                  </div>
                  {!cardState.isSimulated && (ratios as any)?.[ratio.key]?.heuristicSimple && (
                    <p className="mt-2 mb-0 text-sm text-slate-800 leading-snug">
                      {(ratios as any)[ratio.key].heuristicSimple}.
                    </p>
                  )}
                  <p className="mt-1.5 mb-0 text-sm text-slate-600">
                    Umbral <span className="tabular font-medium text-slate-800">{ratio.benchmark}</span>
                  </p>

                  <p className="mt-1 mb-0 text-xs text-slate-600">
                    {ratio.dimensionLabel}
                    {cardState.isSimulated && <span className="text-amber-800">, valor simulado</span>}
                    {ratio.sectorBenchmark != null && sectorBenchmarks?.industry_name && (
                      <>
                        {', '}
                        <span className={better ? 'text-emerald-700' : 'text-rose-700'}>
                          {better ? 'mejor' : 'peor'} que su sector ({ratio.sectorBenchmarkLabel})
                        </span>
                      </>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => toggleCard(ratio.key)}
                    aria-expanded={isExpanded}
                    aria-controls={detailId}
                    className="mt-3 -ml-1 px-1 h-8 text-sm font-medium text-amber-800 hover:text-amber-900 flex items-center gap-1 rounded"
                  >
                    {isExpanded ? 'Ocultar detalle' : 'Ver fórmula y simular'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                </div>

                {isExpanded && (
                  <div id={detailId} className="border-t border-slate-200 p-4 grid gap-5 lg:grid-cols-3">
                    {/* Fórmula con las cifras de la empresa */}
                    <div className="space-y-2">
                      <h5 className="m-0 text-sm font-semibold text-slate-900">Fórmula</h5>
                      <p className="m-0 text-sm text-slate-600">{ratio.formulaTex}</p>
                      <dl className="m-0 text-sm divide-y divide-slate-200 border-y border-slate-200">
                        <div className="flex justify-between gap-3 py-2">
                          <dt className="text-slate-600">{ratio.numLabel}</dt>
                          <dd className="m-0 tabular font-semibold text-slate-900 text-right">{cardState.num.toLocaleString('es-ES')} {ratio.numUnit}</dd>
                        </div>
                        <div className="flex justify-between gap-3 py-2">
                          <dt className="text-slate-600">{ratio.denLabel}</dt>
                          <dd className="m-0 tabular font-semibold text-slate-900 text-right">{cardState.den.toLocaleString('es-ES')} {ratio.denUnit}</dd>
                        </div>
                      </dl>
                      <p className="m-0 text-sm text-slate-700 leading-relaxed">{ratio.explanation}</p>
                    </div>

                    {/* Umbrales */}
                    <div className="space-y-2">
                      <h5 className="m-0 text-sm font-semibold text-slate-900">Umbrales</h5>
                      <ul className="m-0 p-0 list-none space-y-1.5 text-sm">
                        {([
                          ['green', ratio.greenThreshold],
                          ['yellow', ratio.yellowThreshold],
                          ['red', ratio.redThreshold]
                        ] as [TrafficLight, string][]).map(([st, txt]) => (
                          <li
                            key={st}
                            className={`flex items-start gap-2 ${cardState.status === st ? 'font-medium text-slate-900' : 'text-slate-600'}`}
                          >
                            <span className={`w-2 h-2 mt-1.5 shrink-0 rounded-full ${STATUS_META[st].dot}`} aria-hidden="true" />
                            <span>
                              {txt}
                              {cardState.status === st && <span className="sr-only"> (situación actual)</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Simulador */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="m-0 text-sm font-semibold text-slate-900">¿Qué pasaría si…?</h5>
                        {cardState.isSimulated && (
                          <button
                            type="button"
                            onClick={() => resetRatioSimulator(ratio.key)}
                            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                        )}
                      </div>
                      <label className="block text-sm">
                        <span className="flex justify-between gap-2 text-slate-600 mb-1">
                          <span>{ratio.numLabel}</span>
                          <span className="tabular font-semibold text-slate-900">{cardState.num.toLocaleString('es-ES')}</span>
                        </span>
                        <input
                          type="range"
                          min={Math.max(1, Math.round(ratio.numValue * 0.2))}
                          max={Math.max(10, Math.round(ratio.numValue * 2.5))}
                          value={cardState.num}
                          onChange={e => {
                            const newNum = Number(e.target.value);
                            setSimulatorOverrides(prev => ({ ...prev, [ratio.key]: { num: newNum, den: cardState.den } }));
                          }}
                          className="w-full accent-amber-700"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="flex justify-between gap-2 text-slate-600 mb-1">
                          <span>{ratio.denLabel}</span>
                          <span className="tabular font-semibold text-slate-900">{cardState.den.toLocaleString('es-ES')}</span>
                        </span>
                        <input
                          type="range"
                          min={Math.max(1, Math.round(ratio.denValue * 0.2))}
                          max={Math.max(10, Math.round(ratio.denValue * 2.5))}
                          value={cardState.den}
                          onChange={e => {
                            const newDen = Number(e.target.value);
                            setSimulatorOverrides(prev => ({ ...prev, [ratio.key]: { num: cardState.num, den: newDen } }));
                          }}
                          className="w-full accent-amber-700"
                        />
                      </label>
                      {onSelectRatioForAnalysis && (
                        <button
                          type="button"
                          onClick={() => onSelectRatioForAnalysis(ratio.key)}
                          className="text-sm font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2"
                        >
                          Abrir en la guía de fórmulas
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onNavigateToView && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <p className="m-0 text-sm text-slate-600">Para ver de dónde salen estas cifras, abre el balance o la guía de fórmulas.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigateToView('visualizer')}
              className="h-9 px-3 rounded-md text-sm font-medium border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-colors"
            >
              Balance y DuPont
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView('formulas')}
              className="h-9 px-3 rounded-md text-sm font-medium border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-colors"
            >
              Guía de fórmulas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
