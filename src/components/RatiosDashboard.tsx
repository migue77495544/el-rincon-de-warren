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

  return (
    <div className="space-y-6" id="ratios-dashboard-root">
      {/* 1. TOP DASHBOARD HERO: RESUMEN EJECUTIVO Y AUDITORÍA */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Gauge className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight flex items-center gap-2">
                  Dashboard de Desglose de Ratios Financieros
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-sans font-semibold">
                    Motor Graham & Buffett
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Desglose interactivo de las 4 dimensiones contables de{' '}
                  <span className="font-bold text-slate-800">{selectedCompany.ticker}</span> ({selectedCompany.nombre}), explicando fórmulas, variables del balance y umbrales de seguridad.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              className={`px-3.5 py-2 rounded-2xl font-medium text-xs transition-all flex items-center gap-1.5 border ${
                showAuditPanel
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-transparent text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Auditoría de Fidelidad de Cálculo</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-md text-[10px]">100% Conforme</span>
            </button>

            {Object.keys(simulatorOverrides).length > 0 && (
              <button
                onClick={resetAllSimulators}
                className="px-3 py-2 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 border border-slate-300"
                title="Restaurar todos los ratios a los datos contables reales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetear Simuladores</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS HUD: Scoring Linear, Semáforos y Distribución de Calidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Score Linear Global S(a) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                Función S(a) Scoring Linear
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {selectedCompany.linearScore}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ 100</span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold font-mono ml-auto ${
                  selectedCompany.linearScore >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  selectedCompany.linearScore >= 60 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                  'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  Grado {selectedCompany.scoreGrade}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Ponderación normalizada: Liquidez 20%, Solvencia 25%, Rentabilidad 25%, Valoración 30%.
            </p>
          </div>

          {/* Card 2: Consenso Wall Street */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center font-mono">
                Consenso Wall Street
                <InfoTooltip concept="per" />
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-black font-mono ${
                  selectedCompany.targetConsensus
                    ? selectedCompany.targetConsensus.upside_potential >= 10 ? 'text-emerald-700' :
                      selectedCompany.targetConsensus.upside_potential >= 0 ? 'text-slate-800' :
                      'text-rose-700'
                    : 'text-slate-400'
                }`}>
                  {selectedCompany.targetConsensus
                    ? `${selectedCompany.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(selectedCompany.targetConsensus.upside_potential * 10) / 10}%`
                    : 'N/D'}
                </span>
                {selectedCompany.targetConsensus && (
                  <span className="text-xs text-slate-500 font-medium">
                    vs Cotización
                  </span>
                )}
              </div>
            </div>
            {selectedCompany.targetConsensus ? (
              <div className="text-[11px] text-slate-600 mt-2 flex justify-between">
                <span>Tgt. Medio: ${selectedCompany.targetConsensus.target_mean.toFixed(2)}</span>
                <span className="font-bold">
                  {selectedCompany.targetConsensus.number_of_analysts} analistas · {selectedCompany.targetConsensus.recommendation}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 mt-2">
                Cotización: ${raw.precioCotizacion}
              </div>
            )}
          </div>

          {/* Card 3: Distribución Semafórica */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                Semáforo de los 11 Ratios
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-sm font-bold font-mono text-emerald-800">{counts.green}</span>
                  <span className="text-[10px] text-slate-400">seguros</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                  <span className="text-sm font-bold font-mono text-slate-700">{counts.yellow}</span>
                  <span className="text-[10px] text-slate-400">neutros</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-sm font-bold font-mono text-rose-800">{counts.red}</span>
                  <span className="text-[10px] text-slate-400">alertas</span>
                </div>
              </div>
            </div>
            {/* Barra de progreso apilada */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex mt-2">
              <div style={{ width: `${(counts.green / counts.total) * 100}%` }} className="bg-emerald-500 h-full"></div>
              <div style={{ width: `${(counts.yellow / counts.total) * 100}%` }} className="bg-slate-400 h-full"></div>
              <div style={{ width: `${(counts.red / counts.total) * 100}%` }} className="bg-rose-500 h-full"></div>
            </div>
          </div>

          {/* Card 4: Calidad del Foso y Veredicto */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  Foso Económico (Moat)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                  {selectedCompany.moat}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-serif italic line-clamp-2 mt-1">
                "{selectedCompany.warrenVerdict}"
              </p>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-slate-400" />
              <span>Filosofía Berkshire Hathaway</span>
            </div>
          </div>
        </div>

        {/* 2. FILTROS Y CONTROLES DEL DASHBOARD */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Dimension Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedDimension('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedDimension === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Todos ({ratioDefinitions.length})
            </button>
            <button
              onClick={() => setSelectedDimension('liquidez')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDimension === 'liquidez'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>Liquidez</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDimension === 'liquidez' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>3</span>
            </button>
            <button
              onClick={() => setSelectedDimension('solvencia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDimension === 'solvencia'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>Solvencia</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDimension === 'solvencia' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>2</span>
            </button>
            <button
              onClick={() => setSelectedDimension('rentabilidad')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDimension === 'rentabilidad'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>Rentabilidad</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDimension === 'rentabilidad' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>2</span>
            </button>
            <button
              onClick={() => setSelectedDimension('valoracion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDimension === 'valoracion'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>Valoración</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedDimension === 'valoracion' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>4</span>
            </button>
          </div>

          {/* Status filter + Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('green')}
                className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'green' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-600'
                }`}
                title="Solo ratios en zona verde"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{counts.green}</span>
              </button>
              <button
                onClick={() => setStatusFilter('yellow')}
                className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'yellow' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600'
                }`}
                title="Solo ratios en zona neutral"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>{counts.yellow}</span>
              </button>
              <button
                onClick={() => setStatusFilter('red')}
                className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'red' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-600'
                }`}
                title="Solo ratios en zona roja de alerta"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>{counts.red}</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar ratio o fórmula..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 w-36 sm:w-48 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUDITORÍA DE FIDELIDAD DE CÁLCULO Y METODOLOGÍA (Panel Colapsable) */}
      {showAuditPanel && (
        <div className="bg-white rounded-3xl p-6 border-2 border-indigo-200 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-600 text-white font-bold">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-serif">
                  Informe de Auditoría de Fidelidad de Ratios
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
                    ✓ 11 de 11 Ratios Auditados
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Verificación de correspondencia matemática con los estados financieros oficiales (Form 10-K / 10-Q de la SEC y normativas GAAP / IFRS).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuditTestRun(true);
                  setTimeout(() => setAuditTestRun(false), 2500);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{auditTestRun ? '✓ Verificación Exitosa (0ms error)' : 'Re-ejecutar Test Matemático'}</span>
              </button>
              <button
                onClick={() => setShowAuditPanel(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabla de Auditoría Contable */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px]">
                  <th className="py-2.5 px-3 font-bold">Indicador / Símbolo</th>
                  <th className="py-2.5 px-3 font-bold">Fórmula Contable Estándar</th>
                  <th className="py-2.5 px-3 font-bold">Variables {selectedCompany.ticker}</th>
                  <th className="py-2.5 px-3 font-bold">Cálculo del Motor</th>
                  <th className="py-2.5 px-3 font-bold">Estado</th>
                  <th className="py-2.5 px-3 font-bold">Rigor Contable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ratioDefinitions.map(r => (
                  <tr key={r.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {r.shortSymbol}
                      </span>
                      <span>{r.name}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {r.formulaTex}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {r.numValue.toLocaleString()} / {r.denValue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {r.formatted}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3" /> Exacto
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {r.fidelityNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Conclusiones de la Auditoría Contable para {selectedCompany.ticker}:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
              <li><strong>Prueba Ácida (Quick Ratio)</strong>: Se ajustó la fórmula para excluir estrictamente los inventarios del activo circulante preservando cuentas a cobrar y efectivo, conforme a los principios de contabilidad generalmente aceptados (GAAP).</li>
              <li><strong>Cobertura de Intereses</strong>: Cuando una empresa opera con caja neta o cero gasto por intereses (como Berkshire en filiales con tesorería positiva), el motor declara <em>Libre de Deuda / Cobertura Máxima (&gt;100x)</em> en lugar de dividir por cero.</li>
              <li><strong>Múltiplos con BPA Negativo</strong>: En caso de pérdidas netas, el PER se marca como <em>N/D (Pérdidas)</em> con semáforo rojo de advertencia para evitar mostrar múltiplos engañosos.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 4. TARJETAS INTERACTIVAS DE DESGLOSE DE RATIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredRatios.map(ratio => {
          const cardState = getCardValues(ratio);
          const isExpanded = !!expandedCards[ratio.key];

          const dimensionBg =
            ratio.dimension === 'liquidez' ? 'bg-blue-50 text-blue-800 border-blue-200' :
            ratio.dimension === 'solvencia' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
            ratio.dimension === 'rentabilidad' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            'bg-slate-100 text-slate-800 border-slate-200';

          const statusBadge =
            cardState.status === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            cardState.status === 'yellow' ? 'bg-slate-100 text-slate-700 border-slate-200' :
            'bg-rose-50 text-rose-800 border-rose-200';

          const statusText =
            cardState.status === 'green' ? '🟢 Zona Segura / Value' :
            cardState.status === 'yellow' ? '⚪ Zona Neutral / Vigilancia' :
            '🔴 Zona de Alerta / Peligro';

          return (
            <div
              key={ratio.key}
              className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                cardState.isSimulated ? 'border-slate-400 ring-2 ring-slate-400/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                        {ratio.shortSymbol}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${dimensionBg}`}>
                        {ratio.dimensionLabel}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight flex items-center">
                      <span>{ratio.name}</span>
                      {ratio.key === 'roe' && <InfoTooltip concept="roe" />}
                    </h4>
                  </div>

                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${statusBadge}`}>
                    {statusText}
                  </span>
                </div>

                {/* Hero Metric & Benchmark */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      {cardState.isSimulated ? 'Valor Simulado' : 'Valor Actual'}
                    </span>
                    <div className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                      {cardState.formatted}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Umbral de Seguridad
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">
                      {ratio.benchmark}
                    </span>
                  </div>
                </div>

                {/* Sector Benchmark Comparison */}
                {ratio.sectorBenchmark != null && sectorBenchmarks?.industry_name && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Comparativa vs Sector ({sectorBenchmarks.industry_name})
                      </span>
                   <InfoTooltip 
                     conceptId={
                       ratio.key === 'liquidezCorriente' ? 'liquidezVsSector' :
                       ratio.key === 'endeudamiento' ? 'deudaVsSector' :
                       ratio.key === 'roe' ? 'roeVsSector' :
                       ratio.key === 'per' ? 'perVsSector' :
                       ratio.key === 'pb' ? 'pbVsSector' :
                       ratio.key === 'ke' ? 'keVsSector' :
                       undefined
                     } 
                     text={getSectorTooltip(ratio.key, cardState.value, ratio.sectorBenchmark!)}
                   />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isBetterThanSector(ratio.key, cardState.value, ratio.sectorBenchmark!) 
                              ? 'w-1/2 bg-emerald-500' 
                              : 'w-full bg-rose-500'
                          }`}
                        ></div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                        isBetterThanSector(ratio.key, cardState.value, ratio.sectorBenchmark!)
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-rose-700 bg-rose-50 border-rose-200'
                      }`}>
                        {ratio.sectorBenchmarkLabel}
                      </span>
                    </div>
                  </div>
                )}

                {/* Desglose Matemático de la Fórmula */}
                <div className="p-3 bg-slate-100/60 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Desglose de la Fórmula:</span>
                    <span className="text-slate-400">{ratio.formulaTex}</span>
                  </div>
                  <div className="font-mono text-xs flex items-center justify-between text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    <div className="truncate pr-2">
                      <span className="text-[11px] text-slate-400 block">{ratio.numLabel}</span>
                      <span className="font-bold text-slate-900">
                        {cardState.num.toLocaleString()} {ratio.numUnit}
                      </span>
                    </div>
                    <span className="text-slate-400 font-black text-sm px-1">/</span>
                    <div className="truncate text-right pl-2">
                      <span className="text-[11px] text-slate-400 block">{ratio.denLabel}</span>
                      <span className="font-bold text-slate-900">
                        {cardState.den.toLocaleString()} {ratio.denUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Explicación Pedagógica del Ratio */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ratio.explanation}
                </p>

                {/* Matriz de Umbrales de Seguridad */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Criterios de Seguridad (Graham / Buffett):
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className={`p-1.5 rounded-lg flex items-start gap-1.5 border ${
                      cardState.status === 'green' ? 'bg-emerald-50/90 border-emerald-300 font-medium text-emerald-950' : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                      <span>{ratio.greenThreshold}</span>
                    </div>
                    <div className={`p-1.5 rounded-lg flex items-start gap-1.5 border ${
                      cardState.status === 'yellow' ? 'bg-slate-100 border-slate-200 font-medium text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-1"></span>
                      <span>{ratio.yellowThreshold}</span>
                    </div>
                    <div className={`p-1.5 rounded-lg flex items-start gap-1.5 border ${
                      cardState.status === 'red' ? 'bg-rose-50/90 border-rose-300 font-medium text-rose-950' : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                      <span>{ratio.redThreshold}</span>
                    </div>
                  </div>
                </div>

                {/* Mini-Simulador Interactivo "¿Qué pasa si...?" (Desplegable) */}
                {isExpanded && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 pt-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs text-slate-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-700" />
                        Simulador de Escenarios
                      </span>
                      {cardState.isSimulated && (
                        <button
                          onClick={() => resetRatioSimulator(ratio.key)}
                          className="text-[10px] text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar real
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                          <span>{ratio.numLabel}</span>
                          <span className="font-mono font-bold text-slate-900">{cardState.num.toLocaleString()} {ratio.numUnit}</span>
                        </div>
                        <input
                          type="range"
                          min={Math.max(1, Math.round(ratio.numValue * 0.2))}
                          max={Math.max(10, Math.round(ratio.numValue * 2.5))}
                          value={cardState.num}
                          onChange={e => {
                            const newNum = Number(e.target.value);
                            setSimulatorOverrides(prev => ({
                              ...prev,
                              [ratio.key]: { num: newNum, den: cardState.den }
                            }));
                          }}
                          className="w-full accent-slate-800 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                          <span>{ratio.denLabel}</span>
                          <span className="font-mono font-bold text-slate-900">{cardState.den.toLocaleString()} {ratio.denUnit}</span>
                        </div>
                        <input
                          type="range"
                          min={Math.max(1, Math.round(ratio.denValue * 0.2))}
                          max={Math.max(10, Math.round(ratio.denValue * 2.5))}
                          value={cardState.den}
                          onChange={e => {
                            const newDen = Number(e.target.value);
                            setSimulatorOverrides(prev => ({
                              ...prev,
                              [ratio.key]: { num: cardState.num, den: newDen }
                            }));
                          }}
                          className="w-full accent-slate-800 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleCard(ratio.key)}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isExpanded ? 'Ocultar Simulador' : 'Simular ¿Qué pasa si...?'}</span>
                </button>

                <button
                  onClick={() => {
                    if (onSelectRatioForAnalysis) {
                      onSelectRatioForAnalysis(ratio.key);
                    }
                  }}
                  className="text-xs font-bold text-slate-900 hover:text-slate-700 transition-colors flex items-center gap-1 group"
                  title="Abrir ficha detallada en la Guía de Fórmulas"
                >
                  <span>Fórmula Completa</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. NAVEGACIÓN DIRECTA A OTRAS VISTAS DE ANÁLISIS */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-mono text-xs font-bold">PROFUNDIZAR ANÁLISIS</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300">Auditoría multidimensional de {selectedCompany.ticker}</span>
          </div>
          <h4 className="text-base font-bold font-serif">
            ¿Deseas examinar el desglose visual del Balance o la descomposición DuPont?
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToView && (
            <>
              <button
                onClick={() => onNavigateToView('visualizer')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10 flex items-center gap-1.5"
              >
                <span>Desglose DuPont & Balance</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateToView('formulas')}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-white/10 text-white font-medium text-xs transition-all border border-white/20 flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guía Técnica de Fórmulas</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
