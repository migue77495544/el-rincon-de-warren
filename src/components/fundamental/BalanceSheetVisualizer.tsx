import React from 'react';
import { PieChart, CheckCircle2, AlertTriangle, Sparkles, Scale, Shield } from 'lucide-react';
import { CompanyAnalysis } from '../../types';
import { InfoTooltip } from '../SmartTooltip';

interface BalanceSheetVisualizerProps {
  company: CompanyAnalysis;
}

export const BalanceSheetVisualizer: React.FC<BalanceSheetVisualizerProps> = ({ company }) => {
  const raw = company.raw;
  const totalActivos = Math.max(raw.activosTotales, 1);
  const activoCirculantePct = Math.min(100, Math.max(0, Math.round((raw.activoCirculante / totalActivos) * 100)));
  const activoNoCirculante = Math.max(0, raw.activosTotales - raw.activoCirculante);
  const activoNoCirculantePct = Math.min(100, Math.max(0, Math.round((activoNoCirculante / totalActivos) * 100)));

  const efectivoPct = Math.min(100, Math.max(0, Math.round((raw.efectivo / totalActivos) * 100)));
  const cuentasCobrarPct = Math.min(100, Math.max(0, Math.round((raw.cuentasPorCobrar / totalActivos) * 100)));
  const inventariosPct = Math.min(100, Math.max(0, Math.round((raw.inventarios / totalActivos) * 100)));

  const pasivoCirculantePct = Math.min(100, Math.max(0, Math.round((raw.pasivoCirculante / totalActivos) * 100)));
  const deudaLargoPlazo = Math.max(0, raw.totalPasivo - raw.pasivoCirculante);
  const deudaLargoPlazoPct = Math.min(100, Math.max(0, Math.round((deudaLargoPlazo / totalActivos) * 100)));
  const patrimonioNetoPct = Math.min(100, Math.max(0, Math.round((raw.patrimonioNeto / totalActivos) * 100)));

  const fondoManiobra = raw.activoCirculante - raw.pasivoCirculante;

  // Descomposición DuPont de ROE
  const margenNeto = raw.ingresosTotales > 0 ? (raw.utilidadNeta / raw.ingresosTotales) * 100 : 0;
  const rotacionActivos = raw.activosTotales > 0 ? raw.ingresosTotales / raw.activosTotales : 0;
  const multiplicadorApalancamiento = raw.patrimonioNeto > 0 ? raw.activosTotales / raw.patrimonioNeto : 1;
  const roeDuPont = (margenNeto / 100) * rotacionActivos * multiplicadorApalancamiento * 100;

  return (
    <div className="space-y-6">
      {/* 1. VISUALIZADOR DE BALANCE GENERAL Y CAPITAL DE TRABAJO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
              <PieChart className="w-4 h-4 text-slate-600" />
              Estructura del balance y liquidez
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Descomposición proporcional de los Activos (Inversión) frente a Pasivos y Fondos Propios (Financiación).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Activos Totales: ${raw.activosTotales.toLocaleString()}M
            </span>
          </div>
        </div>

        {/* Diagrama de Doble Columna Proporcional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna Izquierda: Activos */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Estructura del Activo (Destino del Capital)</span>
              <span className="font-mono text-blue-700 font-semibold">100%</span>
            </div>

            {/* Barra Apilada Visual de Activos */}
            <div className="h-6 w-full bg-slate-200 rounded-xl overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${Math.max(efectivoPct, 2)}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Efectivo: ${efectivoPct}% ($${raw.efectivo}M)`}
              />
              <div
                style={{ width: `${Math.max(cuentasCobrarPct, 2)}%` }}
                className="bg-cyan-500 h-full transition-all duration-500"
                title={`Cuentas por Cobrar: ${cuentasCobrarPct}% ($${raw.cuentasPorCobrar}M)`}
              />
              <div
                style={{ width: `${Math.max(inventariosPct, 2)}%` }}
                className="bg-blue-500 h-full transition-all duration-500"
                title={`Inventarios: ${inventariosPct}% ($${raw.inventarios}M)`}
              />
              <div
                style={{ width: `${Math.max(activoNoCirculantePct, 2)}%` }}
                className="bg-indigo-600 h-full transition-all duration-500"
                title={`Activo No Circulante: ${activoNoCirculantePct}% ($${activoNoCirculante}M)`}
              />
            </div>

            {/* Leyenda de Activo */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Efectivo / Caja</span>
                  <span className="font-mono font-bold text-slate-900">${raw.efectivo}M ({efectivoPct}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Clientes (CxC)</span>
                  <span className="font-mono font-bold text-slate-900">${raw.cuentasPorCobrar}M ({cuentasCobrarPct}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Inventarios</span>
                  <span className="font-mono font-bold text-slate-900">${raw.inventarios}M ({inventariosPct}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Activo Fijo / No Circ.</span>
                  <span className="font-mono font-bold text-slate-900">${activoNoCirculante}M ({activoNoCirculantePct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Pasivo y Patrimonio */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Financiación (Pasivo Exigible y Patrimonio)</span>
              <span className="font-mono text-purple-700 font-semibold">100%</span>
            </div>

            {/* Barra Apilada Visual de Pasivo + PN */}
            <div className="h-6 w-full bg-slate-200 rounded-xl overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${Math.max(pasivoCirculantePct, 2)}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Pasivo Circulante: ${pasivoCirculantePct}% ($${raw.pasivoCirculante}M)`}
              />
              <div
                style={{ width: `${Math.max(deudaLargoPlazoPct, 2)}%` }}
                className="bg-slate-400 h-full transition-all duration-500"
                title={`Deuda a Largo Plazo: ${deudaLargoPlazoPct}% ($${deudaLargoPlazo}M)`}
              />
              <div
                style={{ width: `${Math.max(patrimonioNetoPct, 2)}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Patrimonio Neto (Fondos Propios): ${patrimonioNetoPct}% ($${raw.patrimonioNeto}M)`}
              />
            </div>

            {/* Leyenda de Financiación */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Pasivo Corto Plazo</span>
                  <span className="font-mono font-bold text-slate-900">${raw.pasivoCirculante}M ({pasivoCirculantePct}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Deuda a Largo Plazo</span>
                  <span className="font-mono font-bold text-slate-900">${deudaLargoPlazo}M ({deudaLargoPlazoPct}%)</span>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <div className="truncate">
                  <span className="text-slate-500 block">Patrimonio Neto / Capital Accionarial (Fondos Propios)</span>
                  <span className="font-mono font-bold text-emerald-800">${raw.patrimonioNeto}M ({patrimonioNetoPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fondo de Maniobra / Capital de Trabajo Heurístico */}
        <div className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          fondoManiobra >= 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="space-y-1">
            <span className="text-xs font-bold font-mono flex items-center gap-1.5">
              {fondoManiobra >= 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              Fondo de Maniobra (Capital de Trabajo Neto): ${fondoManiobra.toLocaleString()}M
            </span>
            <p className="text-xs text-slate-600">
              {fondoManiobra >= 0
                ? 'Excelente liquidez estructural: Los activos realizables a corto plazo cubren holgadamente las obligaciones inmediatas sin requerir deuda de emergencia.'
                : 'Alerta de tensión de tesorería: Los pasivos inmediatos superan al activo circulante, exigiendo rotación rápida o créditos puente.'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 whitespace-nowrap shadow-xs">
            AC / PC: {(raw.activoCirculante / Math.max(raw.pasivoCirculante, 1)).toFixed(2)}x
          </span>
        </div>
      </div>

      {/* 2. VISUALIZADOR DEL MODELO DUPONT DE RENTABILIDAD ROE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
              <Sparkles className="w-4 h-4 text-slate-600" />
              <span>Visualizador del Modelo DuPont (Descomposición del ROE)</span>
              <InfoTooltip concept="roe" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Descubre si el retorno sobre el patrimonio proviene de margen operativo real (pricing power), eficiencia de ventas, o endeudamiento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              ROE Final: {(((company.ratios.roe?.value ?? (roeDuPont / 100))) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Cadena Multiplicativa DuPont Interactiva */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Factor 1: Margen Neto */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">1. Margen Neto (Eficacia)</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                Pricing Power
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-slate-900">
              {margenNeto.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500">
              Beneficio neto por cada dólar ingresado. Empresas con foso amplio sostienen márgenes &gt; 15%.
            </p>
            <div className="p-1.5 bg-white rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
              Utilidad Neta / Ingresos
            </div>
          </div>

          {/* Factor 2: Rotación de Activos */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">2. Rotación Activos (Eficiencia)</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono">
                Velocidad
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-slate-900">
              {rotacionActivos.toFixed(2)}x
            </div>
            <p className="text-xs text-slate-500">
              Ventas generadas por cada dólar de activo en balance.
            </p>
            <div className="p-1.5 bg-white rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
              Ventas / Activos Totales
            </div>
          </div>

          {/* Factor 3: Apalancamiento Financiero */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">3. Multiplicador de Deuda</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                multiplicadorApalancamiento <= 2.5
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {multiplicadorApalancamiento <= 2.5 ? 'Conservador' : 'Alto Apalancamiento'}
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-slate-900">
              {multiplicadorApalancamiento.toFixed(2)}x
            </div>
            <p className="text-xs text-slate-500">
              Grado en que la empresa recurre a pasivos para financiar sus activos.
            </p>
            <div className="p-1.5 bg-white rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
              Activos / Patrimonio Neto
            </div>
          </div>
        </div>

        {/* Fórmula Visual */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
          <span className="text-xs font-bold text-slate-500 font-mono">
            Ecuación DuPont Integrada
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm sm:text-base font-mono font-bold text-slate-900">
            <span className="text-blue-700">{margenNeto.toFixed(1)}% Margen</span>
            <span className="text-slate-500">×</span>
            <span className="text-cyan-700">{rotacionActivos.toFixed(2)}x Rotación</span>
            <span className="text-slate-500">×</span>
            <span className="text-purple-700">{multiplicadorApalancamiento.toFixed(2)}x Apalancamiento</span>
            <span className="text-slate-500">=</span>
            <span className="text-slate-900 text-lg sm:text-xl font-semibold">
              {(((company.ratios.roe?.value ?? (roeDuPont / 100))) * 100).toFixed(1)}% ROE
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUALIZADOR DE 4 DIMENSIONES CON BARRAS DE CALIDAD */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
              <Scale className="w-4 h-4 text-slate-600" />
              Puntuación por dimensión
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ponderación lineal normalizada de 0 a 100 para evaluar la salud fundamental global.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Score Global: {company.linearScore}/100 ({company.scoreGrade})
          </span>
        </div>

        <div className="space-y-4">
          {/* Dim 1: Liquidez */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                1. Liquidez Inmediata (Peso 20%)
              </span>
              <span className="font-mono text-slate-900 font-bold">
                {Math.min(100, Math.round(((company.ratios.liquidezCorriente?.value ?? 1.5) / 2.0) * 100))}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, ((company.ratios.liquidezCorriente?.value ?? 1.5) / 2.0) * 100))}%` }}
              />
            </div>
          </div>

          {/* Dim 2: Solvencia */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                2. Solvencia Estructural (Peso 25%)
              </span>
              <span className="font-mono text-slate-900 font-bold">
                {(company.ratios.endeudamiento?.value ?? 1) <= 1.0 ? '90%' : (company.ratios.endeudamiento?.value ?? 1) <= 1.5 ? '65%' : '35%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (company.ratios.endeudamiento?.value ?? 1) <= 1.0 ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                style={{
                  width: `${(company.ratios.endeudamiento?.value ?? 1) <= 1.0 ? 90 : (company.ratios.endeudamiento?.value ?? 1) <= 1.5 ? 65 : 35}%`
                }}
              />
            </div>
          </div>

          {/* Dim 3: Rentabilidad */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                3. Rentabilidad Operativa (Peso 25%)
              </span>
              <span className="font-mono text-slate-900 font-bold">
                {Math.min(100, Math.round(((company.ratios.roe?.value ?? 0.15) / 0.18) * 100))}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, ((company.ratios.roe?.value ?? 0.15) / 0.18) * 100))}%` }}
              />
            </div>
          </div>

          {/* Dim 4: Valoración/Consenso */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                4. Consenso Wall Street (Peso 30%)
              </span>
              <span className="font-mono text-slate-900 font-bold">
                {company.targetConsensus?.upside_potential >= 15 ? '95%' : company.targetConsensus?.upside_potential >= 0 ? '70%' : '30%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  company.targetConsensus?.upside_potential >= 15 ? 'bg-emerald-500' : company.targetConsensus?.upside_potential >= 0 ? 'bg-slate-400' : 'bg-rose-500'
                }`}
                style={{
                  width: `${company.targetConsensus?.upside_potential >= 15 ? 95 : company.targetConsensus?.upside_potential >= 0 ? 70 : 30}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. VISUALIZADOR DE CONSENSO WALL STREET */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Consenso de analistas</span>
            <InfoTooltip concept="per" />
          </h3>
          {company.targetConsensus && (
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              company.targetConsensus.upside_potential >= 15
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : company.targetConsensus.upside_potential >= 0
                ? 'bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              Potencial: {company.targetConsensus.upside_potential > 0 ? '+' : ''}{company.targetConsensus.upside_potential}%
            </span>
          )}
        </div>

        {company.targetConsensus ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Precio Actual de Cotización</span>
              <span className="text-2xl font-semibold font-mono text-slate-900 mt-1 block">
                ${raw.precioCotizacion.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">Cotización en tiempo de mercado</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Precio Objetivo Medio (Consenso)</span>
              <span className="text-2xl font-semibold font-mono text-emerald-700 mt-1 block">
                ${company.targetConsensus.target_mean.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">{company.targetConsensus.number_of_analysts} analistas · {company.targetConsensus.recommendation}</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Veredicto de Consenso</span>
              <span className={`text-base font-bold font-serif mt-1 block ${
                company.targetConsensus.upside_potential >= 15
                  ? 'text-emerald-700'
                  : company.targetConsensus.upside_potential >= 0
                  ? 'text-slate-800'
                  : 'text-rose-700'
              }`}>
                {company.targetConsensus.upside_potential >= 15
                  ? 'Oportunidad de Valor Clara'
                  : company.targetConsensus.upside_potential >= 0
                  ? 'Precio Razonable'
                  : 'Sobrevalorada vs Objetivos'}
              </span>
              <span className="text-xs text-slate-500">Objetivo: &gt; 10% potencial alcista</span>
            </div>

            <div className="sm:col-span-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Precio actual: ${raw.precioCotizacion.toFixed(2)}</span>
                  <span>Media: ${company.targetConsensus.target_mean.toFixed(2)}</span>
                  <span>Máx: ${company.targetConsensus.target_high.toFixed(2)}</span>
                </div>
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
                    style={{ left: `${Math.min(100, Math.max(0, ((raw.precioCotizacion - (company.targetConsensus.target_low * 0.9)) / ((company.targetConsensus.target_high * 1.1) - (company.targetConsensus.target_low * 0.9))) * 100))}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                    style={{ left: `${Math.min(100, Math.max(0, ((company.targetConsensus.target_mean - (company.targetConsensus.target_low * 0.9)) / ((company.targetConsensus.target_high * 1.1) - (company.targetConsensus.target_low * 0.9))) * 100))}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-30"
                    style={{ left: `${Math.min(100, Math.max(0, ((company.targetConsensus.target_high - (company.targetConsensus.target_low * 0.9)) / ((company.targetConsensus.target_high * 1.1) - (company.targetConsensus.target_low * 0.9))) * 100))}%` }}
                  />
                  <div className="absolute inset-0 flex items-center">
                    <div className="h-1 w-full flex rounded-full overflow-hidden"><span className="flex-1 bg-rose-500" /><span className="flex-1 bg-amber-500" /><span className="flex-1 bg-emerald-500" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            No hay consenso de analistas disponible para {company.ticker}.
          </div>
        )}
      </div>
    </div>
  );
};
