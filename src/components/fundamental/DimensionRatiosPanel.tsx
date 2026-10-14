import React, { useState } from 'react';
import { Layers, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { CompanyAnalysis } from '../../types';

export type FinancialDimensionType = 'all' | 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion';

interface DimensionRatiosPanelProps {
  company: CompanyAnalysis;
  activeDimension?: FinancialDimensionType;
  onDimensionChange?: (dim: FinancialDimensionType) => void;
}

export const DimensionRatiosPanel: React.FC<DimensionRatiosPanelProps> = ({
  company,
  activeDimension: controlledDimension,
  onDimensionChange,
}) => {
  const [internalDimension, setInternalDimension] = useState<FinancialDimensionType>('all');
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
        value: typeof rObj.value === 'number' ? rObj.value : 0,
        formatted: rObj.formatted || String(rObj.value ?? '-'),
        status: (rObj.status === 'green' || rObj.status === 'yellow' || rObj.status === 'red') ? rObj.status : ('green' as const),
        benchmark: rObj.benchmark || '',
        explanation: rObj.explanation || '',
        heuristicSimple: rObj.heuristicSimple || ''
      };
    }
    const num = typeof rObj === 'number' ? rObj : 0;
    return {
      value: num,
      formatted: num.toFixed(2),
      status: 'yellow' as const,
      benchmark: '',
      explanation: '',
      heuristicSimple: ''
    };
  };

  const getStatusBadge = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Saludable (Verde)
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            Precaución (Atención)
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Peligro (Rojo)
          </span>
        );
    }
  };

  const all11Keys = [
    'liquidezCorriente',
    'ratioTesoreriaPruebaAcida',
    'disponibilidadInmediata',
    'endeudamiento',
    'coberturaIntereses',
    'roa',
    'roe',
    'bpa',
    'per',
    'pb',
    'yieldDividendo'
  ];
  const list = all11Keys.map(k => getRatioData(k));
  const greens = list.filter(r => r.status === 'green').length;
  const yellows = list.filter(r => r.status === 'yellow').length;
  const reds = list.filter(r => r.status === 'red').length;

  return (
    <div className="space-y-6">
      {/* Diagnóstico Global de Semáforos Contables */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Semáforo Contable Integral: {company.nombre} ({company.ticker})
            </h4>
            <p className="text-xs text-slate-500">
              Auditoría de 11 ratios fundamentales divididos en 4 dimensiones de valor.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{greens} Verdes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span>{yellows} Neutros</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>{reds} Rojos</span>
          </div>
        </div>
      </div>

      {/* iOS Segmented Control: Filter by Dimension */}
      <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar shadow-sm">
        {[
          { id: 'all', label: 'Todas las Dimensiones (11 Ratios)' },
          { id: 'liquidez', label: '1. Liquidez (3 Ratios)' },
          { id: 'solvencia', label: '2. Solvencia (2 Ratios)' },
          { id: 'rentabilidad', label: '3. Rentabilidad (2 Ratios)' },
          { id: 'valoracion', label: '4. Valoración (4 Ratios)' }
        ].map(dim => (
          <button
            key={dim.id}
            onClick={() => handleDimensionClick(dim.id as FinancialDimensionType)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeDimension === dim.id
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {dim.label}
          </button>
        ))}
      </div>

      {/* Detailed Financial Dimensions & Ratios */}
      <div className="space-y-6">
        {/* DIMENSIÓN 1: LIQUIDEZ */}
        {(activeDimension === 'all' || activeDimension === 'liquidez') && (() => {
          const rLiq = getRatioData('liquidezCorriente');
          const rAcida = getRatioData('ratioTesoreriaPruebaAcida');
          const rDisp = getRatioData('disponibilidadInmediata');

          return (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    Dimensión 1: Liquidez Financiera a Corto Plazo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evalúa la capacidad de la empresa para cumplir sus obligaciones inmediatas sin refinanciar deuda.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Peso: 20%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Liquidez Corriente */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Liquidez Corriente</span>
                    {getStatusBadge(rLiq.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rLiq.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rLiq.benchmark || 'Meta: > 1.5x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Activo Circulante / Pasivo Circulante
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rLiq.explanation || 'Capacidad para responder a las deudas que vencen en menos de 12 meses.'}
                  </p>
                  {rLiq.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rLiq.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* Ratio de Tesorería (Prueba Ácida) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Ratio Tesorería (Prueba Ácida)</span>
                    {getStatusBadge(rAcida.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rAcida.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rAcida.benchmark || 'Meta: > 0.8x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    (Act.Circ - Inv - Otros - CxC) / Pas.Circ
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rAcida.explanation || 'Liquidez estricta eliminando inventarios y cuentas pendientes.'}
                  </p>
                  {rAcida.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rAcida.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* Disponibilidad Inmediata */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Disponibilidad Inmediata (Cash)</span>
                    {getStatusBadge(rDisp.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rDisp.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rDisp.benchmark || 'Meta: > 0.3x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Efectivo / Pasivo Circulante
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rDisp.explanation || 'Dinero líquido en caja frente a compromisos inmediatos.'}
                  </p>
                  {rDisp.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rDisp.heuristicSimple}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DIMENSIÓN 2: SOLVENCIA */}
        {(activeDimension === 'all' || activeDimension === 'solvencia') && (() => {
          const rEndeud = getRatioData('endeudamiento');
          const rCob = getRatioData('coberturaIntereses');

          return (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Dimensión 2: Solvencia & Estructura de Capital
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mide la resiliencia ante crisis macroeconómicas prolongadas y subidas de tipos de interés.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Peso: 25%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Endeudamiento */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Ratio de Endeudamiento (Debt / Equity)</span>
                    {getStatusBadge(rEndeud.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rEndeud.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rEndeud.benchmark || 'Meta: < 1.0x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Total Pasivo / Patrimonio Neto
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rEndeud.explanation || 'Deuda total frente al capital de los accionistas.'}
                  </p>
                  {rEndeud.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rEndeud.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* Cobertura de Intereses */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Cobertura de Intereses</span>
                    {getStatusBadge(rCob.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rCob.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rCob.benchmark || 'Meta: > 5.0x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    EBIT / Intereses por Pagar
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rCob.explanation || 'Veces que el beneficio operativo cubre los intereses financieros.'}
                  </p>
                  {rCob.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rCob.heuristicSimple}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DIMENSIÓN 3: RENTABILIDAD */}
        {(activeDimension === 'all' || activeDimension === 'rentabilidad') && (() => {
          const rRoa = getRatioData('roa');
          const rRoe = getRatioData('roe');

          return (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                    Dimensión 3: Rentabilidad & Foso Económico (Moat)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Warren Buffett busca empresas con retornos sobre capital constantemente elevados sin excesivo apalancamiento.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  Peso: 25%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ROA */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">ROA (Rentabilidad sobre Activos)</span>
                    {getStatusBadge(rRoa.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rRoa.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rRoa.benchmark || 'Meta: > 8.0%'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Utilidad Neta / Activos Totales
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rRoa.explanation || 'Eficiencia en la utilización de los activos de la empresa para generar beneficios netos.'}
                  </p>
                  {rRoa.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rRoa.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* ROE */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">ROE (Rentabilidad sobre Patrimonio)</span>
                    {getStatusBadge(rRoe.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rRoe.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rRoe.benchmark || 'Meta: > 15.0%'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Utilidad Neta / Patrimonio Neto
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rRoe.explanation || 'El ratio preferido de Buffett: rendimiento del dinero de los inversores retenido.'}
                  </p>
                  {rRoe.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rRoe.heuristicSimple}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DIMENSIÓN 4: VALORACIÓN */}
        {(activeDimension === 'all' || activeDimension === 'valoracion') && (() => {
          const rBpa = getRatioData('bpa');
          const rPer = getRatioData('per');
          const rPb = getRatioData('pb');
          const rYield = getRatioData('yieldDividendo');

          return (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Dimensión 4: Valoración Bursátil & Margen de Seguridad
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    "El precio es lo que pagas, el valor es lo que recibes." Compara el precio de mercado con el valor intrínseco.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Peso: 30%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* BPA */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">BPA (EPS)</span>
                    {getStatusBadge(rBpa.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rBpa.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rBpa.benchmark || 'Meta: > $2.00'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Utilidad Neta / Acciones
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rBpa.explanation || 'Beneficio neto correspondiente a cada acción en circulación.'}
                  </p>
                  {rBpa.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rBpa.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* PER */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">PER (P/E Ratio)</span>
                    {getStatusBadge(rPer.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rPer.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rPer.benchmark || 'Meta: < 20x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Precio Cotización / BPA
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rPer.explanation || 'Años necesarios de beneficios actuales para recuperar el precio pagado.'}
                  </p>
                  {rPer.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rPer.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* P/B */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Precio / Valor Contable (P/B)</span>
                    {getStatusBadge(rPb.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rPb.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rPb.benchmark || 'Meta: < 2.5x'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Cap.Bursátil / Patrimonio
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rPb.explanation || 'Relación entre valor de mercado y activos contables netos.'}
                  </p>
                  {rPb.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rPb.heuristicSimple}
                    </div>
                  )}
                </div>

                {/* Dividend Yield */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Dividend Yield</span>
                    {getStatusBadge(rYield.status)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rYield.formatted}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({rYield.benchmark || 'Meta: > 2.0%'})
                    </span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200">
                    Dividendo / Precio Acción
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rYield.explanation || 'Rendimiento anual pagado directamente en dividendos.'}
                  </p>
                  {rYield.heuristicSimple && (
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-200 font-medium">
                      💡 {rYield.heuristicSimple}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
