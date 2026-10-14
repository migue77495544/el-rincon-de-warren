import React from 'react';
import { BarChart3, ArrowRight } from 'lucide-react';
import { FinancialFormulaItem } from '../../data/formulasData';
import { CompanyAnalysis } from '../../types';
import { InfoTooltip } from '../SmartTooltip';

export interface CompanyRatioDiag {
  value: number;
  formatted: string;
  status: 'green' | 'yellow' | 'red';
  numLabel: string;
  denLabel: string;
  num: number;
  den: number;
  statusText: string;
  dimension: string;
}

interface FormulaCardProps {
  formula: FinancialFormulaItem;
  isSelected: boolean;
  selectedCompany?: CompanyAnalysis;
  companyDiag?: CompanyRatioDiag | null;
  onSelect: (formula: FinancialFormulaItem) => void;
  onSelectRatioForAnalysis?: (ratioId: string, dimension?: string) => void;
}

export const FormulaCard: React.FC<FormulaCardProps> = ({
  formula,
  isSelected,
  selectedCompany,
  companyDiag,
  onSelect,
  onSelectRatioForAnalysis
}) => {
  const categoryBadge = {
    valoracion: 'bg-blue-50 text-blue-800 border-blue-200',
    rentabilidad: 'bg-purple-50 text-purple-800 border-purple-200',
    solvencia: 'bg-rose-50 text-rose-800 border-rose-200',
    liquidez: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  }[formula.category];

  return (
    <div
      onClick={() => onSelect(formula)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
        isSelected
          ? 'bg-slate-100 border-slate-400 shadow-sm ring-2 ring-slate-300'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
            isSelected ? 'bg-slate-900 text-white border-slate-950' : 'bg-slate-100 border-slate-200 text-slate-900'
          }`}>
            {formula.acronym.substring(0, 3)}
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight flex items-center">
              <span>{formula.name}</span>
              {formula.id === 'roe' && <InfoTooltip concept="roe" />}
              {formula.id === 'margin-of-safety' && <InfoTooltip concept="margenSeguridad" />}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              {formula.acronym}
            </span>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadge}`}>
          {formula.category.toUpperCase()}
        </span>
      </div>

      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
        {formula.formulaSimple}
      </div>

      {/* Estado en la empresa actual si está seleccionada */}
      {companyDiag && selectedCompany && (
        <div className="mt-2.5 p-2 bg-slate-100/70 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 font-mono text-[10px]">
            {selectedCompany.ticker}: <strong className="text-slate-950 font-bold">{companyDiag.formatted}</strong>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            companyDiag.status === 'green' ? 'bg-emerald-100 text-emerald-800' :
            companyDiag.status === 'yellow' ? 'bg-slate-200 text-slate-800' :
            'bg-rose-100 text-rose-800'
          }`}>
            {companyDiag.status === 'green' ? '🟢 Value' : companyDiag.status === 'yellow' ? '🟡 Neutro' : '🔴 Peligro'}
          </span>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 truncate max-w-[190px]">
          {formula.thresholds.green.range} ({formula.thresholds.green.label})
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {onSelectRatioForAnalysis && selectedCompany && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRatioForAnalysis(formula.id, formula.category);
              }}
              className="px-2 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-950 border border-slate-200 transition-all active:scale-95 flex items-center gap-1"
              title={`Ver en los Semáforos Contables de ${selectedCompany.ticker}`}
            >
              <BarChart3 className="w-3 h-3 text-slate-600" />
              <span>Semáforos</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(formula);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs ${
              isSelected
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-transparent text-slate-700 hover:text-slate-950 border border-slate-300 hover:bg-slate-100'
            }`}
            title="Ver fórmula, umbrales y simulador"
          >
            <span>{isSelected ? '✓ Viendo Fórmula' : 'Ver análisis'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
