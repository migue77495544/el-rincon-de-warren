import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CompanyAnalysis, TrafficLight } from '../../types';
import { ScrollRail } from '../ui/ScrollRail';

export type FinancialDimensionType = 'all' | 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion';

interface DimensionRatiosPanelProps {
  company: CompanyAnalysis;
  activeDimension?: FinancialDimensionType;
  onDimensionChange?: (dim: FinancialDimensionType) => void;
}

interface RatioDef {
  key: string;
  name: string;
  formula: string;
  defaultBenchmark: string;
  defaultExplanation: string;
}

interface DimensionDef {
  id: Exclude<FinancialDimensionType, 'all'>;
  title: string;
  description: string;
  weight: number;
  ratios: RatioDef[];
}

const DIMENSIONS: DimensionDef[] = [
  {
    id: 'liquidez',
    title: 'Liquidez a corto plazo',
    description: 'Capacidad para pagar lo que vence en los próximos doce meses sin refinanciar deuda.',
    weight: 20,
    ratios: [
      { key: 'liquidezCorriente', name: 'Liquidez corriente', formula: 'Activo circulante / pasivo circulante', defaultBenchmark: '> 1,5x', defaultExplanation: 'Capacidad para responder a las deudas que vencen en menos de 12 meses.' },
      { key: 'ratioTesoreriaPruebaAcida', name: 'Prueba ácida', formula: '(Activo circulante − inventarios − otros − cuentas a cobrar) / pasivo circulante', defaultBenchmark: '> 0,8x', defaultExplanation: 'Liquidez estricta eliminando inventarios y cuentas pendientes.' },
      { key: 'disponibilidadInmediata', name: 'Disponibilidad inmediata', formula: 'Efectivo / pasivo circulante', defaultBenchmark: '> 0,3x', defaultExplanation: 'Dinero líquido en caja frente a compromisos inmediatos.' }
    ]
  },
  {
    id: 'solvencia',
    title: 'Solvencia y estructura de capital',
    description: 'Resistencia ante crisis prolongadas y subidas de tipos de interés.',
    weight: 25,
    ratios: [
      { key: 'endeudamiento', name: 'Endeudamiento', formula: 'Total pasivo / patrimonio neto', defaultBenchmark: '< 1,0x', defaultExplanation: 'Deuda total frente al capital de los accionistas.' },
      { key: 'coberturaIntereses', name: 'Cobertura de intereses', formula: 'EBIT / intereses', defaultBenchmark: '> 5,0x', defaultExplanation: 'Veces que el beneficio operativo cubre los intereses financieros.' }
    ]
  },
  {
    id: 'rentabilidad',
    title: 'Rentabilidad',
    description: 'Retornos sobre el capital altos y constantes sin apalancamiento excesivo: lo que delata un foso.',
    weight: 25,
    ratios: [
      { key: 'roa', name: 'ROA (rentabilidad sobre activos)', formula: 'Beneficio neto / activos totales', defaultBenchmark: '> 8 %', defaultExplanation: 'Eficiencia en la utilización de los activos para generar beneficio neto.' },
      { key: 'roe', name: 'ROE (rentabilidad sobre patrimonio)', formula: 'Beneficio neto / patrimonio neto', defaultBenchmark: '> 15 %', defaultExplanation: 'El ratio preferido de Buffett: rendimiento del dinero de los accionistas.' }
    ]
  },
  {
    id: 'valoracion',
    title: 'Valoración y margen de seguridad',
    description: 'Lo que se paga frente a lo que se recibe.',
    weight: 30,
    ratios: [
      { key: 'bpa', name: 'BPA (beneficio por acción)', formula: 'Beneficio neto / acciones', defaultBenchmark: '> $2,00', defaultExplanation: 'Beneficio neto correspondiente a cada acción en circulación.' },
      { key: 'per', name: 'PER', formula: 'Precio / BPA', defaultBenchmark: '< 20x', defaultExplanation: 'Años de beneficios actuales necesarios para recuperar el precio pagado.' },
      { key: 'pb', name: 'Precio / valor contable', formula: 'Capitalización / patrimonio neto', defaultBenchmark: '< 2,5x', defaultExplanation: 'Relación entre el valor de mercado y los activos contables netos.' },
      { key: 'yieldDividendo', name: 'Rentabilidad por dividendo', formula: 'Dividendo / precio de la acción', defaultBenchmark: '> 2 %', defaultExplanation: 'Rendimiento anual pagado directamente en dividendos.' }
    ]
  }
];

const STATUS_META: Record<TrafficLight, { label: string; dot: string; text: string }> = {
  green: { label: 'Sano', dot: 'bg-emerald-600', text: 'text-emerald-800' },
  yellow: { label: 'Vigilar', dot: 'bg-amber-500', text: 'text-amber-800' },
  red: { label: 'Alerta', dot: 'bg-rose-600', text: 'text-rose-800' }
};

export const DimensionRatiosPanel: React.FC<DimensionRatiosPanelProps> = ({
  company,
  activeDimension: controlledDimension,
  onDimensionChange,
}) => {
  const [internalDimension, setInternalDimension] = useState<FinancialDimensionType>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeDimension = controlledDimension ?? internalDimension;

  const handleDimensionClick = (dim: FinancialDimensionType) => {
    if (onDimensionChange) {
      onDimensionChange(dim);
    } else {
      setInternalDimension(dim);
    }
  };

  const getRatioData = (ratioKey: string) => {
    const rObj = (company.ratios as any)?.[ratioKey];
    if (rObj && typeof rObj === 'object') {
      return {
        formatted: rObj.formatted || String(rObj.value ?? '-'),
        status: (rObj.status === 'green' || rObj.status === 'yellow' || rObj.status === 'red') ? rObj.status as TrafficLight : 'green' as TrafficLight,
        benchmark: rObj.benchmark || '',
        explanation: rObj.explanation || '',
        heuristicSimple: rObj.heuristicSimple || ''
      };
    }
    const num = typeof rObj === 'number' ? rObj : 0;
    return { formatted: num.toFixed(2), status: 'yellow' as TrafficLight, benchmark: '', explanation: '', heuristicSimple: '' };
  };

  const allRatios = DIMENSIONS.flatMap(d => d.ratios.map(r => getRatioData(r.key)));
  const count = (st: TrafficLight) => allRatios.filter(r => r.status === st).length;
  const visible = DIMENSIONS.filter(d => activeDimension === 'all' || activeDimension === d.id);

  return (
    <div className="space-y-5">
      {/* Resumen y filtro por dimensión */}
      <section aria-labelledby="semaforos-titulo" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 id="semaforos-titulo" className="m-0 font-serif text-[22px] font-semibold text-slate-900">
              Semáforos por dimensión
            </h2>
            <p className="mt-1 mb-0 text-sm text-slate-600">
              Los 11 ratios de {company.nombre} agrupados en las cuatro dimensiones del Score S(a).
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {(['green', 'yellow', 'red'] as TrafficLight[]).map(st => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[st].dot}`} aria-hidden="true" />
                <span className="tabular font-semibold text-slate-900">{count(st)}</span>
                <span className="text-slate-600">{STATUS_META[st].label.toLowerCase()}</span>
              </span>
            ))}
          </div>
        </div>

        <ScrollRail as="div" label="Filtrar por dimensión" fadeFrom="from-white" activeKey={activeDimension} innerClassName="gap-1">
          {[{ id: 'all' as FinancialDimensionType, label: 'Todas' }, ...DIMENSIONS.map(d => ({ id: d.id as FinancialDimensionType, label: d.title.split(' ')[0] }))].map(dim => {
            const active = activeDimension === dim.id;
            return (
              <button
                key={dim.id}
                type="button"
                onClick={() => handleDimensionClick(dim.id)}
                aria-pressed={active}
                aria-current={active ? 'true' : undefined}
                className={`shrink-0 h-8 px-3 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {dim.label}
              </button>
            );
          })}
        </ScrollRail>
      </section>

      {/* Una hoja por dimensión; cada ratio es una fila: valor, semáforo y umbral */}
      {visible.map(dim => (
        <section key={dim.id} aria-labelledby={`dim-${dim.id}`} className="bg-white rounded-2xl border border-slate-200">
          <header className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
            <div>
              <h3 id={`dim-${dim.id}`} className="m-0 font-serif text-lg font-semibold text-slate-900">{dim.title}</h3>
              <p className="mt-0.5 mb-0 text-sm text-slate-600">{dim.description}</p>
            </div>
            <span className="shrink-0 text-sm text-slate-600 tabular" title="Peso de la dimensión en el Score S(a)">
              Peso {dim.weight} %
            </span>
          </header>

          <ul className="m-0 p-0 list-none border-t border-slate-200 divide-y divide-slate-200">
            {dim.ratios.map(def => {
              const r = getRatioData(def.key);
              const meta = STATUS_META[r.status];
              const isOpen = !!expanded[def.key];
              const detailId = `semaforo-detalle-${def.key}`;
              return (
                <li key={def.key}>
                  <button
                    type="button"
                    onClick={() => setExpanded(prev => ({ ...prev, [def.key]: !prev[def.key] }))}
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    className="w-full text-left px-5 sm:px-6 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_7rem_6.5rem_8rem_1rem] items-center gap-x-4 gap-y-1 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-[15px] font-medium text-slate-900">{def.name}</span>
                    <span className="cifra text-[22px] leading-none text-slate-900 text-right">{r.formatted}</span>
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${meta.text}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                      {meta.label}
                    </span>
                    <span className="text-sm text-slate-600 tabular text-right sm:text-left">
                      <span className="sm:hidden">Umbral </span>{r.benchmark || def.defaultBenchmark}
                    </span>
                    <ChevronDown className={`hidden sm:block w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div id={detailId} className="px-5 sm:px-6 pb-4 space-y-2 text-sm max-w-[72ch]">
                      <p className="m-0 text-slate-600">
                        <span className="font-medium text-slate-800">Fórmula: </span>{def.formula}
                      </p>
                      <p className="m-0 text-slate-700 leading-relaxed">{r.explanation || def.defaultExplanation}</p>
                      {r.heuristicSimple && (
                        <p className="m-0 text-slate-700 leading-relaxed">
                          <span className="font-medium text-slate-900">En pocas palabras: </span>{r.heuristicSimple}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
