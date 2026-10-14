import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Search,
  Scale,
  DollarSign,
  Layers,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Info,
  Sliders,
  RotateCcw,
  Zap
} from 'lucide-react';
import { CompanyAnalysis } from '../types';
import { InfoTooltip } from './SmartTooltip';
import { FinancialFormulaItem, FORMULAS_DATA } from '../data/formulasData';
import { FormulaCard } from './formulas/FormulaCard';

export type { FinancialFormulaItem };
export { FORMULAS_DATA };


interface FinancialFormulasGuideProps {
  selectedCompany?: CompanyAnalysis;
  onSelectRatioForAnalysis?: (ratioId: string, dimension?: string) => void;
}

export const FinancialFormulasGuide: React.FC<FinancialFormulasGuideProps> = ({
  selectedCompany,
  onSelectRatioForAnalysis
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'valoracion' | 'rentabilidad' | 'solvencia' | 'liquidez'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFormulaId, setActiveFormulaId] = useState<string>('per');
  const [mobileView, setMobileView] = useState<'catalog' | 'detail'>('catalog');

  // Helper para diagnosticar la empresa seleccionada bajo cualquier fórmula
  const getCompanyRatioDiagnostic = (formulaId: string, comp?: CompanyAnalysis) => {
    if (!comp) return null;
    const raw = comp.raw;

    switch (formulaId) {
      case 'per': {
        const bpa = Number(comp.ratios.bpa?.value) || (raw.utilidadNeta / (raw.capitalizacionBursatil / raw.precioCotizacion)) || 1;
        const perEval = comp.ratios.per;
        const perVal = perEval.value;
        const status = perEval.status;
        return {
          value: perVal,
          formatted: perEval.formatted || `${perVal.toFixed(1)}x`,
          status,
          numLabel: 'Precio Cotización ($)',
          denLabel: 'BPA Anual ($)',
          num: raw.precioCotizacion,
          den: bpa,
          statusText: status === 'green' ? '🟢 Zona de Valor (Descuento Graham)' : status === 'yellow' ? '🟡 Precio Justo' : '🔴 Exigente / Pérdidas',
          dimension: 'valoracion'
        };
      }
      case 'roe': {
        const roeEval = comp.ratios.roe;
        const roePct = roeEval.value * 100;
        const status = roeEval.status;
        return {
          value: roePct,
          formatted: roeEval.formatted || `${roePct.toFixed(1)}%`,
          status,
          numLabel: 'Beneficio Neto ($M)',
          denLabel: 'Patrimonio Neto ($M)',
          num: raw.utilidadNeta,
          den: raw.patrimonioNeto || 1,
          statusText: status === 'green' ? '🟢 Excelente (Criterio Buffett ≥ 15%)' : status === 'yellow' ? '🟡 Retorno Aceptable' : '🔴 Retorno Insuficiente',
          dimension: 'rentabilidad'
        };
      }
      case 'deuda-ebitda': {
        const ebitda = Math.max(1, Math.round(raw.ebit * 1.15));
        const netDebt = Math.max(0, raw.totalPasivo - raw.efectivo);
        const ratio = netDebt / ebitda;
        const status: 'green' | 'yellow' | 'red' = ratio <= 2.0 ? 'green' : ratio <= 3.5 ? 'yellow' : 'red';
        return {
          value: ratio,
          formatted: `${ratio.toFixed(1)}x`,
          status,
          numLabel: 'Deuda Neta ($M)',
          denLabel: 'EBITDA Operativo ($M)',
          num: netDebt,
          den: ebitda,
          statusText: status === 'green' ? '🟢 Balance Blindado (< 2.0x)' : status === 'yellow' ? '🟡 Deuda Moderada' : '🔴 Apalancamiento Excesivo',
          dimension: 'solvencia'
        };
      }
      case 'cobertura-intereses': {
        const cobEval = comp.ratios.coberturaIntereses;
        const cobVal = cobEval.value;
        const status = cobEval.status;
        return {
          value: cobVal,
          formatted: cobEval.formatted || `${cobVal.toFixed(1)}x`,
          status,
          numLabel: 'EBIT Operativo ($M)',
          denLabel: 'Intereses de Deuda ($M)',
          num: raw.ebit,
          den: raw.interesesPorPagar || 1,
          statusText: status === 'green' ? '🟢 Cobertura Confortable (≥ 5.0x)' : status === 'yellow' ? '🟡 Zona de Precaución' : '🔴 Riesgo de Insolvencia',
          dimension: 'solvencia'
        };
      }
      case 'liquidez-corriente': {
        const liqEval = comp.ratios.liquidezCorriente;
        const liqVal = liqEval.value;
        const status = liqEval.status;
        return {
          value: liqVal,
          formatted: liqEval.formatted || `${liqVal.toFixed(2)}x`,
          status,
          numLabel: 'Activo Circulante ($M)',
          denLabel: 'Pasivo Circulante ($M)',
          num: raw.activoCirculante,
          den: raw.pasivoCirculante || 1,
          statusText: status === 'green' ? '🟢 Solvencia Óptima (Graham ≥ 1.5x)' : status === 'yellow' ? '🟡 Aceptable pero Justa' : '🔴 Tensión de Tesorería',
          dimension: 'liquidez'
        };
      }
      case 'prueba-acida': {
        const acidaEval = comp.ratios.ratioTesoreriaPruebaAcida;
        const acidaVal = acidaEval.value;
        const status = acidaEval.status;
        return {
          value: acidaVal,
          formatted: acidaEval.formatted || `${acidaVal.toFixed(2)}x`,
          status,
          numLabel: 'Activo Circulante sin Inventarios ($M)',
          denLabel: 'Pasivo Circulante ($M)',
          num: Math.max(0, raw.activoCirculante - raw.inventarios),
          den: raw.pasivoCirculante || 1,
          statusText: status === 'green' ? '🟢 Liquidez Blindada (≥ 0.8x)' : status === 'yellow' ? '🟡 Margen Ajustado' : '🔴 Falta de Caja Inmediata',
          dimension: 'liquidez'
        };
      }
      case 'pb': {
        const pbEval = comp.ratios.pb;
        const pbVal = pbEval.value;
        const status = pbEval.status;
        return {
          value: pbVal,
          formatted: pbEval.formatted || `${pbVal.toFixed(2)}x`,
          status,
          numLabel: 'Capitalización Bursátil ($M)',
          denLabel: 'Patrimonio Neto ($M)',
          num: raw.capitalizacionBursatil,
          den: raw.patrimonioNeto || 1,
          statusText: status === 'green' ? '🟢 Descuento Patrimonial (≤ 2.5x)' : status === 'yellow' ? '🟡 Valor Contable en Línea' : '🔴 Prima Excesiva',
          dimension: 'valoracion'
        };
      }
      case 'margen-seguridad': {
        const ups = comp.targetConsensus?.upside_potential ?? 0;
        const target = comp.targetConsensus?.target_mean ?? 0;
        const status: 'green' | 'yellow' | 'red' = ups >= 15 ? 'green' : ups >= 0 ? 'yellow' : 'red';
        return {
          value: ups,
          formatted: `${ups > 0 ? '+' : ''}${Math.round(ups * 10) / 10}%`,
          status,
          numLabel: 'Precio Objetivo Consenso ($)',
          denLabel: 'Precio de Mercado ($)',
          num: target,
          den: raw.precioCotizacion,
          statusText: status === 'green' ? '🟢 Upside claro (≥ 15%)' : status === 'yellow' ? '🟡 Consenso moderado' : '🔴 Consenso bajista',
          dimension: 'valoracion'
        };
      }
      case 'dupont': {
        const netMargin = raw.ingresosTotales > 0 ? (raw.utilidadNeta / raw.ingresosTotales) * 100 : 15;
        const assetTurn = raw.activosTotales > 0 ? raw.ingresosTotales / raw.activosTotales : 1;
        const roeEval = comp.ratios.roe;
        const roePct = roeEval.value * 100;
        const status = roeEval.status;
        return {
          value: roePct,
          formatted: `ROE ${(roePct).toFixed(1)}%`,
          status,
          numLabel: 'Margen Neto (%)',
          denLabel: 'Rotación de Activos (x)',
          num: Number(netMargin.toFixed(1)),
          den: Number(assetTurn.toFixed(2)),
          statusText: status === 'green' ? '🟢 Rentabilidad Orgánica Moat' : status === 'yellow' ? '🟡 Rentabilidad Normal' : '🔴 Estructura Débil',
          dimension: 'rentabilidad'
        };
      }
      case 'roa': {
        const roaEval = comp.ratios.roa;
        const roaPct = roaEval.value * 100;
        const status = roaEval.status;
        return {
          value: roaPct,
          formatted: roaEval.formatted || `${roaPct.toFixed(1)}%`,
          status,
          numLabel: 'Utilidad Neta ($M)',
          denLabel: 'Activos Totales ($M)',
          num: raw.utilidadNeta,
          den: raw.activosTotales || 1,
          statusText: status === 'green' ? '🟢 Alta Productividad Asset-Light (≥ 8%)' : status === 'yellow' ? '🟡 Productividad Moderada' : '🔴 Capital Devorador',
          dimension: 'rentabilidad'
        };
      }
      case 'dividend-yield': {
        const yldEval = comp.ratios.yieldDividendo;
        const yldPct = yldEval.value * 100;
        const status = yldEval.status;
        return {
          value: yldPct,
          formatted: yldEval.formatted || `${yldPct.toFixed(2)}%`,
          status,
          numLabel: 'Dividendo Anual por Acción ($)',
          denLabel: 'Precio por Acción ($)',
          num: raw.dividendoPorAccion,
          den: raw.precioCotizacion || 1,
          statusText: status === 'green' ? '🟢 Flujo de Renta Sostenible' : status === 'yellow' ? '🟡 Rendimiento Moderado' : '🔴 Dividendo Bajo o Inexistente',
          dimension: 'valoracion'
        };
      }
      default:
        return null;
    }
  };

  // Fórmula activa actual
  const activeFormula = useMemo(() => {
    return FORMULAS_DATA.find(f => f.id === activeFormulaId) || FORMULAS_DATA[0];
  }, [activeFormulaId]);

  // Estado del Sandbox interactivo inicializado con la empresa si existe o con el default
  const initialDiag = useMemo(() => {
    return getCompanyRatioDiagnostic(activeFormulaId, selectedCompany);
  }, [activeFormulaId, selectedCompany]);

  const [sandboxNum, setSandboxNum] = useState<number>(() => initialDiag ? initialDiag.num : 60);
  const [sandboxDen, setSandboxDen] = useState<number>(() => initialDiag ? initialDiag.den : 4.2);

  // Sincronizar inputs si cambia la empresa seleccionada
  useEffect(() => {
    if (selectedCompany) {
      const diag = getCompanyRatioDiagnostic(activeFormulaId, selectedCompany);
      if (diag) {
        setSandboxNum(diag.num);
        setSandboxDen(diag.den);
      }
    }
  }, [selectedCompany?.ticker]);

  // Sincronizar inputs del sandbox al cambiar de fórmula con auto-scroll y carga inmediata
  const handleSelectFormula = (f: FinancialFormulaItem, autoScroll = true) => {
    setActiveFormulaId(f.id);
    const diag = getCompanyRatioDiagnostic(f.id, selectedCompany);
    if (diag) {
      setSandboxNum(diag.num);
      setSandboxDen(diag.den);
    } else {
      setSandboxNum(f.sampleInputs.defaultNum);
      setSandboxDen(f.sampleInputs.defaultDen);
    }

    // Cambiar a la vista detallada en móviles
    setMobileView('detail');

    if (autoScroll) {
      setTimeout(() => {
        const el = document.getElementById('formula-detail-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Cargar datos de la empresa seleccionada al sandbox si aplica
  const handleLoadCompanyValues = (targetFormulaId?: string) => {
    const fid = targetFormulaId || activeFormula.id;
    const diag = getCompanyRatioDiagnostic(fid, selectedCompany);
    if (diag) {
      setSandboxNum(diag.num);
      setSandboxDen(diag.den);
    }
  };

  // Cálculo del sandbox
  const sandboxCalculatedValue = useMemo(() => {
    if (activeFormula.sampleInputs.customCalc) {
      return activeFormula.sampleInputs.customCalc(sandboxNum, sandboxDen);
    }
    if (sandboxDen === 0) return 0;
    return sandboxNum / sandboxDen;
  }, [activeFormula, sandboxNum, sandboxDen]);

  const sandboxStatus = useMemo(() => {
    return activeFormula.sampleInputs.evaluator(sandboxCalculatedValue);
  }, [activeFormula, sandboxCalculatedValue]);

  // Filtrado de fórmulas
  const filteredFormulas = useMemo(() => {
    return FORMULAS_DATA.filter(f => {
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.acronym.toLowerCase().includes(q) ||
        f.purpose.toLowerCase().includes(q) ||
        f.formulaSimple.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6" id="financial-formulas-guide-root">
      {/* Header Banner Pedagógico de Value Investing */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-500" />
                Guía Pedagógica de Fórmulas Financieras
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold font-mono">
                Filosofía Graham & Buffett
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-serif">
              Anatomía de los Ratios & Criterios de Calificación
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              En el <strong>Value Investing</strong>, un ratio contable no es un número frío para especular a corto plazo, sino una radiografía médica del negocio. Aprende qué significa cada fórmula, cómo se calcula y cuáles son los umbrales de seguridad para no perder dinero.
            </p>
          </div>

          {selectedCompany && (
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-black text-slate-800 text-sm">
                {selectedCompany.ticker}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Empresa Seleccionada
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">
                  {selectedCompany.nombre}
                </span>
                <button
                  onClick={handleLoadCompanyValues}
                  className="text-[10px] font-bold text-slate-700 hover:text-slate-950 underline mt-0.5 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  Probar sus datos en el simulador
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Categorías / Segmented Controls & Buscador */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {[
              { id: 'all', label: 'Todas las Fórmulas', count: FORMULAS_DATA.length },
              { id: 'valoracion', label: 'Valoración & Precio', count: FORMULAS_DATA.filter(f => f.category === 'valoracion').length },
              { id: 'rentabilidad', label: 'Rentabilidad & Moat', count: FORMULAS_DATA.filter(f => f.category === 'rentabilidad').length },
              { id: 'solvencia', label: 'Solvencia & Deuda', count: FORMULAS_DATA.filter(f => f.category === 'solvencia').length },
              { id: 'liquidez', label: 'Liquidez a Corto Plazo', count: FORMULAS_DATA.filter(f => f.category === 'liquidez').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por ratio, P/E, ROE, EBITDA..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Control Móvil / Tablet de Vistas */}
      <div className="flex lg:hidden items-center justify-between p-1.5 bg-slate-100 rounded-2xl border border-slate-200 gap-1.5">
        <button
          type="button"
          onClick={() => setMobileView('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'catalog'
              ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Catálogo de Fórmulas ({filteredFormulas.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('detail')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'detail'
              ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-slate-500" />
          <span>Fórmula: {activeFormula.acronym}</span>
        </button>
      </div>

      {/* Grid Principal: Listado de Fórmulas (Izquierda) + Ficha Detallada & Simulador (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Tarjetas Resumen de Fórmulas */}
        <div className={`lg:col-span-5 space-y-3 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Catálogo de Fórmulas ({filteredFormulas.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Toca para abrir análisis y simulador
            </span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1 no-scrollbar">
            {filteredFormulas.map(formula => (
              <FormulaCard
                key={formula.id}
                formula={formula}
                isSelected={activeFormula.id === formula.id}
                selectedCompany={selectedCompany}
                companyDiag={getCompanyRatioDiagnostic(formula.id, selectedCompany)}
                onSelect={(f) => handleSelectFormula(f, true)}
                onSelectRatioForAnalysis={onSelectRatioForAnalysis}
              />
            ))}


            {filteredFormulas.length === 0 && (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No se encontraron fórmulas con ese término.</p>
                <p className="text-[11px] text-slate-500 mt-1">Intenta buscar por "ROE", "EBITDA", "PER" o "Liquidez".</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Auditoría Visual en Profundidad + Simulador Interactivo */}
        <div id="formula-detail-section" className={`lg:col-span-7 space-y-6 ${mobileView === 'catalog' ? 'hidden lg:block' : 'block'}`}>
          {/* Botón Volver para Móviles */}
          <div className="flex lg:hidden items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => setMobileView('catalog')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Volver al Catálogo de Fórmulas</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {activeFormula.acronym}
            </span>
          </div>
          {/* Tarjeta de Detalle de la Fórmula */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            {/* Cabecera del Ratio Activo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {activeFormula.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Fórmula Oficial
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-serif mt-1 flex items-center">
                  <span>{activeFormula.name}</span>
                  {activeFormula.id === 'roe' && <InfoTooltip concept="roe" />}
                  {activeFormula.id === 'margin-of-safety' && <InfoTooltip concept="margenSeguridad" />}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800">
                  {activeFormula.acronym}
                </div>
              </div>
            </div>

            {/* Diagnóstico en Vivo de la Empresa Seleccionada */}
            {selectedCompany && (() => {
              const diag = getCompanyRatioDiagnostic(activeFormula.id, selectedCompany);
              if (!diag) return null;

              return (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  diag.status === 'green'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : diag.status === 'yellow'
                    ? 'bg-slate-100/90 border-slate-300'
                    : 'bg-rose-50/80 border-rose-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono font-black text-slate-900 text-xs shrink-0 shadow-2xs">
                      {selectedCompany.ticker}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {selectedCompany.nombre} ({selectedCompany.ticker}):
                        </span>
                        <span className="font-mono font-black text-sm text-slate-950 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                          {diag.formatted}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold block mt-1">
                        {diag.statusText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxNum(diag.num);
                        setSandboxDen(diag.den);
                        document.getElementById('sandbox-calculator-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1"
                      title="Copiar datos al simulador interactivo"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-600" />
                      <span>Cargar al Sandbox</span>
                    </button>

                    {onSelectRatioForAnalysis && (
                      <button
                        type="button"
                        onClick={() => onSelectRatioForAnalysis(activeFormula.id, activeFormula.category)}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1.5"
                        title="Ver en la tabla de semáforos contables de la empresa"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Ver en Semáforos</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Representación Visual de la Fórmula (Fracción Contable) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                Estructura Matemática de Cálculo
              </span>

              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {/* Numerador */}
                <div className="text-center font-mono font-bold text-slate-900 text-sm sm:text-base px-4 py-1.5 bg-slate-50 rounded-lg border border-slate-200 w-full max-w-md">
                  {activeFormula.numeratorLabel}
                </div>

                {/* Barra de División */}
                <div className="w-full max-w-md h-0.5 bg-slate-300 my-2"></div>

                {/* Denominador */}
                <div className="text-center font-mono font-bold text-slate-900 text-sm sm:text-base px-4 py-1.5 bg-slate-50 rounded-lg border border-slate-200 w-full max-w-md">
                  {activeFormula.denominatorLabel}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                <strong>¿Qué mide?:</strong> {activeFormula.purpose}
              </p>
            </div>

            {/* Umbrales de Seguridad según Value Investing (Semáforo Pedagógico) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-600" />
                  Criterios & Umbrales de Seguridad (Graham / Buffett)
                </h4>
                <span className="text-[10px] text-slate-500">
                  Regla de Decisión
                </span>
              </div>

              {/* 3 Bloques: Verde, Amarillo, Rojo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Verde */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{activeFormula.thresholds.green.range}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    {activeFormula.thresholds.green.label}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                    {activeFormula.thresholds.green.explanation}
                  </p>
                </div>

                {/* Amarillo */}
                <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>{activeFormula.thresholds.yellow.range}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 block">
                    {activeFormula.thresholds.yellow.label}
                  </span>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {activeFormula.thresholds.yellow.explanation}
                  </p>
                </div>

                {/* Rojo */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{activeFormula.thresholds.red.range}</span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-900 block">
                    {activeFormula.thresholds.red.label}
                  </span>
                  <p className="text-[11px] text-rose-800/90 leading-relaxed">
                    {activeFormula.thresholds.red.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Razón de ser según Buffett & Cita Célebre */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs font-serif">
                <Sparkles className="w-4 h-4 text-slate-600" />
                <span>¿Por qué es fundamental para Warren Buffett?</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeFormula.whyBuffettCares}
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-700 font-serif italic">
                <span>"{activeFormula.quote}"</span>
                <span className="font-bold font-sans not-italic text-slate-800 shrink-0">— {activeFormula.quoteAuthor}</span>
              </div>
            </div>
          </div>

          {/* Simulador / Sandbox Interactivo de la Fórmula */}
          <div id="sandbox-calculator-card" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 scroll-mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Simulador Interactivo de Fórmula (Sandbox)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Modifica los números para comprobar en directo la clasificación del semáforo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSandboxNum(activeFormula.sampleInputs.defaultNum);
                    setSandboxDen(activeFormula.sampleInputs.defaultDen);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 active:scale-95"
                  title="Restablecer a valores de muestra de la fórmula"
                >
                  Valores estándar
                </button>

                {selectedCompany && (
                  <button
                    type="button"
                    onClick={() => handleLoadCompanyValues()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 active:scale-95 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cargar datos de {selectedCompany.ticker}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inputs del Sandbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium block">
                  {activeFormula.sampleInputs.numLabel}:
                </label>
                <input
                  type="number"
                  step="any"
                  value={sandboxNum}
                  onChange={e => setSandboxNum(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium block">
                  {activeFormula.sampleInputs.denLabel}:
                </label>
                <input
                  type="number"
                  step="any"
                  value={sandboxDen}
                  onChange={e => setSandboxDen(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Resultado del Sandbox con Semáforo en Tiempo Real */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              sandboxStatus === 'green'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : sandboxStatus === 'yellow'
                ? 'bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono block opacity-80">
                  Resultado del Cálculo Simulado
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono">
                    {sandboxCalculatedValue.toFixed(2)}{activeFormula.sampleInputs.isPercentage ? '%' : (activeFormula.sampleInputs.unit || '')}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    sandboxStatus === 'green'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : sandboxStatus === 'yellow'
                      ? 'bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {sandboxStatus === 'green'
                      ? '🟢 Cumple Criterio Value'
                      : sandboxStatus === 'yellow'
                      ? '🟡 Moderado / Precio Justo'
                      : '🔴 Alerta / Trampa Financiera'}
                  </span>
                </div>
              </div>

              <div className="text-xs sm:text-right max-w-xs leading-relaxed opacity-90">
                {sandboxStatus === 'green' && (
                  <p>
                    <strong>Aprobado con distinción:</strong> El valor cumple holgadamente con los estándares conservadores de preservación de capital.
                  </p>
                )}
                {sandboxStatus === 'yellow' && (
                  <p>
                    <strong>Zona neutra:</strong> Sin margen de seguridad notable; requiere que el crecimiento futuro compense la ausencia de descuento.
                  </p>
                )}
                {sandboxStatus === 'red' && (
                  <p>
                    <strong>Alto riesgo:</strong> Múltiplo sobrecalentado o tensión financiera. Warren Buffett descartaría este escenario de inmediato.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
