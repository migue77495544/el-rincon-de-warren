import React, { useState } from 'react';
import { CompanyAnalysis } from '../types';
import { InfoTooltip } from './SmartTooltip';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  DollarSign,
  Percent,
  Scale,
  Sparkles
} from 'lucide-react';
import { useFeatureFlags } from '../context/ViewModeContext';

// Helper para generar tooltip dinámico de comparación sectorial
const getVitalSectorTooltip = (id: string, companyVal: number, sectorVal: number): string => {
  const isDeuda = id === 'deuda';
  const isBetter = isDeuda ? companyVal < sectorVal : companyVal > sectorVal;
  const diff = Math.abs(companyVal - sectorVal);
  
  switch (id) {
    case 'liquidez':
      return isBetter
        ? `Liquidez ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x (+${diff.toFixed(2)}x). Superior liquidez frente a pares, mayor capacidad para pagar deudas a corto plazo.`
        : `Liquidez ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x (${diff.toFixed(2)}x menos). Riesgo moderado de tensiones de caja frente al sector.`;
    case 'deuda':
      return isBetter
        ? `Deuda/Patrimonio ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Menor apalancamiento que el sector, menor riesgo financiero.`
        : `Deuda/Patrimonio ${companyVal.toFixed(2)}x vs Sector ${sectorVal.toFixed(2)}x. Mayor apalancamiento que el sector, mayor exposición a tipos de interés.`;
    case 'roe':
      return isBetter
        ? `ROE ${companyVal.toFixed(1)}% vs Sector ${sectorVal.toFixed(1)}% (+${diff.toFixed(1)} pp). Un ROE superior al promedio del sector indica una ventaja competitiva o mayor eficiencia en la generación de utilidades.`
        : `ROE ${companyVal.toFixed(1)}% vs Sector ${sectorVal.toFixed(1)}% (${diff.toFixed(1)} pp menos). ROE por debajo del sector sugiere falta de ventaja competitiva.`;
    default:
      return `Empresa: ${companyVal.toFixed(2)} vs Sector: ${sectorVal.toFixed(2)}`;
  }
};

interface VitalSignsProps {
  company: CompanyAnalysis;
  onNavigateToDetail?: () => void;
}

type VitalMetric = {
  id: string;
  name: string;
  shortLabel: string;
  value: string;
  numericValue: number;
  status: 'green' | 'yellow' | 'red';
  explanation: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  sectorValue?: number;
  sectorComparison?: 'better' | 'worse' | 'neutral';
};

export const VitalSigns: React.FC<VitalSignsProps> = ({
  company,
  onNavigateToDetail
}) => {
  const flags = useFeatureFlags();

  // Calcular los 4 indicadores vitaes
  const getVitalSigns = (): VitalMetric[] => {
    const raw = company.raw;
    const r = company.ratios;
    const sb = company.sectorBenchmarks;

    // Helper para comparar contra el sector
    const getSectorComparison = (key: 'liquidez' | 'deuda' | 'roe', companyVal: number, sectorVal: number | undefined): 'better' | 'worse' | 'neutral' => {
      if (sectorVal == null) return 'neutral';
      if (key === 'deuda') {
        return companyVal < sectorVal ? 'better' : companyVal > sectorVal ? 'worse' : 'neutral';
      }
      return companyVal > sectorVal ? 'better' : companyVal < sectorVal ? 'worse' : 'neutral';
    };

    return [
      {
        id: 'liquidez',
        name: 'Liquidez',
        shortLabel: '¿Puede pagar sus deudas?',
        value: r.liquidezCorriente.formatted || 'N/D',
        numericValue: r.liquidezCorriente.value,
        status: r.liquidezCorriente.status,
        explanation: r.liquidezCorriente.explanation,
        icon: <Scale className="w-5 h-5" />,
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-600',
        sectorValue: sb?.current_ratio_sector,
        sectorComparison: getSectorComparison('liquidez', r.liquidezCorriente.value, sb?.current_ratio_sector)
      },
      {
        id: 'deuda',
        name: 'Apalancamiento',
        shortLabel: '¿Tiene demasiada deuda?',
        value: r.endeudamiento.formatted || 'N/D',
        numericValue: r.endeudamiento.value,
        status: r.endeudamiento.status,
        explanation: r.endeudamiento.explanation,
        icon: <ShieldCheck className="w-5 h-5" />,
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-600',
        sectorValue: sb?.debt_equity_sector,
        sectorComparison: getSectorComparison('deuda', r.endeudamiento.value, sb?.debt_equity_sector)
      },
      {
        id: 'roe',
        name: 'Rentabilidad (ROE)',
        shortLabel: '¿Genera ganancias por cada $1 invertido?',
        value: r.roe.formatted || 'N/D',
        numericValue: r.roe.value * 100,
        status: r.roe.status,
        explanation: r.roe.explanation,
        icon: <TrendingUp className="w-5 h-5" />,
        bgClass: 'bg-green-50',
        textClass: 'text-green-600',
        sectorValue: sb?.roe_sector,
        sectorComparison: getSectorComparison('roe', r.roe.value * 100, sb?.roe_sector)
      },
      {
        id: 'consenso',
        name: 'Consenso Wall Street',
        shortLabel: '¿Valoración vs objetivos de analistas?',
        value: company.targetConsensus
          ? `${company.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(company.targetConsensus.upside_potential * 10) / 10}%`
          : 'N/D',
        numericValue: company.targetConsensus?.upside_potential ?? 0,
        status: company.targetConsensus?.upside_potential >= 10 ? 'green' :
                company.targetConsensus?.upside_potential >= 0 ? 'yellow' : 'red',
        explanation: company.targetConsensus
          ? `${company.targetConsensus.recommendation} · ${company.targetConsensus.number_of_analysts} analistas · Objetivo medio: $${company.targetConsensus.target_mean.toFixed(2)}`
          : 'Sin consenso de analistas disponible',
        icon: <DollarSign className="w-5 h-5" />,
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-600'
      },
    ];
  };

  const vitals = getVitalSigns();

  // Contar semáforos
  const greenCount = vitals.filter(v => v.status === 'green').length;
  const totalCount = vitals.length;

  // Veredicto simple
  const getVerdict = () => {
    if (greenCount === totalCount) return { text: '¡Excelente oportunidad!', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/30' };
    if (greenCount >= totalCount - 1) return { text: 'Prometedora, observa', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/30' };
    return { text: 'Precaución recomendada', color: 'text-danger', bgColor: 'bg-danger/10', borderColor: 'border-danger/30' };
  };

  const verdict = getVerdict();

  const statusIcons = {
    green: '✅',
    yellow: '⚠️',
    red: '🛑'
  };

  return (
    <div className="space-y-6" id="vital-signs-root">
      {/* Score S(a) Global + Veredicto */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-[var(--color-border)] flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Score S(a) Global</span>
                <InfoTooltip conceptId="roe" />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-black font-mono text-slate-900">
                  {company.linearScore}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  company.scoreGrade === 'A+' ? 'bg-success/10 text-success border border-success/20' :
                  company.scoreGrade === 'A' ? 'bg-success/10 text-success border border-success/20' :
                  company.scoreGrade === 'B' ? 'bg-warning/10 text-warning border border-warning/20' :
                  'bg-danger/10 text-danger border border-danger/20'
                }`}>
                  Grado {company.scoreGrade}
                </span>
              </div>
            </div>
          </div>

          <div className={`px-4 py-2.5 rounded-xl border text-center ${verdict.bgColor} ${verdict.borderColor}`}>
            <span className={`text-sm font-bold ${verdict.color} font-serif`}>
              {verdict.text}
            </span>
            <div className="text-[10px] text-slate-500 mt-1">
              {greenCount}/{totalCount} indicadores saludables
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de los 4 indicadores vitaes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vitals.map((vital) => (
          <div
            key={vital.id}
            className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col transition-all"
          >
            {/* Header de la tarjeta */}
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${vital.bgClass} flex items-center justify-center ${vital.textClass}`}>
                {vital.icon}
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                vital.status === 'green' ? 'bg-success/10 text-success border border-success/20' :
                vital.status === 'yellow' ? 'bg-warning/10 text-warning border border-warning/20' :
                'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {statusIcons[vital.status]} {vital.status === 'green' ? 'Saludable' : vital.status === 'yellow' ? 'Vigilancia' : 'Alerta'}
              </span>
            </div>

            {/* Nombre y valor */}
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                {vital.name}
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {vital.shortLabel}
              </p>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {vital.value}
              </div>
            </div>

            {/* Sector Comparison Badge */}
            {vital.sectorValue != null && company.sectorBenchmarks?.industry_name && (
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">vs Sector:</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                  vital.sectorComparison === 'better' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                  vital.sectorComparison === 'worse' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                  'text-slate-700 bg-slate-50 border-slate-200'
                }`}>
                  {vital.sectorValue.toFixed(vital.id === 'roe' ? 1 : 2)}{vital.id === 'roe' ? '%' : ''}
                </span>
                <InfoTooltip 
                  text={getVitalSectorTooltip(vital.id, vital.numericValue, vital.sectorValue)}
                />
              </div>
            )}

            {/* Tooltip de explicación solo en analyst mode o al hacer click */}
            {flags.isAnalyst ? (
              <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                {vital.explanation}
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between">
                <InfoTooltip conceptId={vital.id === 'liquidez' ? 'liquidezCorriente' : vital.id === 'deuda' ? 'deudaPatrimonio' : vital.id === 'roe' ? 'roe' : 'margenSeguridad'} />
                <button
                  onClick={onNavigateToDetail}
                  className="text-[10px] font-semibold text-accent hover:text-accent-hover transition-colors"
                >
                  Ver análisis completo →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Foso Económico + Veredicto de Warren */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Foso Económico
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                {company.moat}
              </span>
            </div>
            <p className="text-sm text-slate-700 italic font-serif leading-relaxed">
              "{company.warrenVerdict}"
            </p>
          </div>
        </div>
      </div>

      {/* Botón de acceso rápido a Modo Analista (Progressive Disclosure) */}
      {!flags.isAnalyst && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => {
              // Usa el método del contexto para activar analista solo en esta sección
              // El ViewModeContext necesita estar envuelto
              window.dispatchEvent(new CustomEvent('warren:toggle-to-analyst'));
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-accent hover:text-accent-hover hover:bg-slate-50 border border-[var(--color-border)] rounded-lg transition-all"
          >
            <span>¿Quieres ver todos los ratios y simuladores?</span>
            <span>→ Cambiar a Modo Analista</span>
          </button>
        </div>
      )}
    </div>
  );
};
