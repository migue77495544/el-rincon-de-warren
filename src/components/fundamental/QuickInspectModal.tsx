import React from 'react';
import { TrendingUp, Sparkles, X } from 'lucide-react';
import { CompanyAnalysis } from '../../types';
import { CompanyPriceChart } from '../CompanyPriceChart';
import { InfoTooltip } from '../SmartTooltip';
import { deriveVerdict } from '../../utils/verdict';

interface QuickInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAnalysis;
  onSelectForSimulation: (ticker: string) => void;
  onOpenSemaphores: () => void;
  getRatioData: (ratioKey: string) => { formatted: string; [key: string]: any };
}

export const QuickInspectModal: React.FC<QuickInspectModalProps> = ({
  isOpen,
  onClose,
  company,
  onSelectForSimulation,
  onOpenSemaphores,
  getRatioData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto no-scrollbar animate-fadeIn">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
              {company.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900 font-mono">
                  {company.ticker}
                </h3>
                <span className="text-sm font-semibold text-slate-700">
                  {company.nombre}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                  {company.sector}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cotización: <strong className="text-slate-900">${company.raw.precioCotizacion.toFixed(2)}</strong> · Consenso: <strong className="text-emerald-700">{company.targetConsensus ? `$${company.targetConsensus.target_mean.toFixed(2)}` : 'N/D'}</strong> · Potencial: <strong className={(company.targetConsensus?.upside_potential ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}>{company.targetConsensus ? `${company.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(company.targetConsensus.upside_potential * 10) / 10}%` : 'N/D'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onSelectForSimulation(company.ticker);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Simular Cartera</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-all"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>
        </div>

        {/* Gráfica de cotización interactiva */}
        <CompanyPriceChart company={company} />

        {/* Resumen ejecutivo de las 4 dimensiones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs">Scoring Global</span>
            <span className="text-lg font-semibold font-mono text-slate-900">
              {company.linearScore} / 100 ({company.scoreGrade})
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs">PER (Precio / Beneficio)</span>
            <span className="text-lg font-semibold font-mono text-slate-900">
              {getRatioData('per').formatted}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 flex items-center text-xs">
              ROE (Rentabilidad Fondos)
              <InfoTooltip concept="roe" />
            </span>
            <span className="text-lg font-semibold font-mono text-emerald-700">
              {getRatioData('roe').formatted}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 flex items-center text-xs">
              Foso Defensivo (Moat)
              <InfoTooltip concept="foso" />
            </span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-1">
              {company.moat}
            </span>
          </div>
        </div>

        {/* Veredicto calculado con los datos de la ficha */}
        <p className="m-0 p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-serif text-[15px] leading-relaxed text-slate-800">
          {deriveVerdict(company).text}
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onOpenSemaphores();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
          >
            Ver Semáforos Contables
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
