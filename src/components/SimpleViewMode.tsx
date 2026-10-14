import React, { useState } from 'react';
import { CompanyAnalysis } from '../types';
import { useFeatureFlags } from '../context/ViewModeContext';
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Scale,
  Percent,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { JairoGuillermoConsult } from './JairoGuillermoConsult';
import { CompanyPriceChart } from './CompanyPriceChart';
import { WallStreetConsensus } from './WallStreetConsensus';

interface SimpleViewModeProps {
  company: CompanyAnalysis;
  companies: CompanyAnalysis[];
  onSelectCompany: (company: CompanyAnalysis) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 4 }) => (
  <div className="animate-pulse bg-slate-100/60 rounded-2xl border border-slate-200 p-5 space-y-3">
    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-2 bg-slate-200 rounded"
        style={{ width: `${60 - i * 10}%` }}
      ></div>
    ))}
  </div>
);

// Componente de Tooltip pedagógico minimalista estilo Linear
const IndicatorTooltip: React.FC<{ title: string; explanation: string; idealValue: string }> = ({
  title,
  explanation,
  idealValue
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label={`Información sobre ${title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-[11px] rounded-xl shadow-xl z-50 pointer-events-none animate-fadeIn border border-slate-800 leading-relaxed">
          <p className="font-semibold text-white mb-1">{title}</p>
          <p className="text-slate-300">{explanation}</p>
          <p className="text-emerald-400 font-mono mt-1.5 pt-1.5 border-t border-slate-800 font-medium">
            🎯 Objetivo: {idealValue}
          </p>
        </div>
      )}
    </div>
  );
};

export const SimpleViewMode: React.FC<SimpleViewModeProps> = ({
  company,
  companies,
  onSelectCompany,
  onPrev,
  onNext,
  canPrev,
  canNext
}) => {
  const { mode, isAnalyst } = useFeatureFlags();
  const isSimple = mode === 'simple' && !isAnalyst;

  // 1. Margen de Seguridad
  const currentPrice = company.raw.precioCotizacion;
  const targetPrice = company.targetConsensus?.target_mean;
  const upsidePotential = company.targetConsensus?.upside_potential ?? (
    targetPrice && currentPrice > 0 ? Math.round(((targetPrice - currentPrice) / currentPrice) * 100) : null
  );
  const discountPct = targetPrice && targetPrice > 0 ? Math.round(((targetPrice - currentPrice) / targetPrice) * 100) : upsidePotential;
  const hasMarginData = upsidePotential !== null && !isNaN(upsidePotential);
  const isDiscounted = hasMarginData && upsidePotential >= 0;

  // 2. Rentabilidad (ROE / ROIC)
  const rawRoe = company.ratios.roe?.value;
  const roe = rawRoe != null ? (rawRoe > 1 ? rawRoe : rawRoe * 100) : 22.0;
  const rawRoa = company.ratios.roa?.value;
  const roa = rawRoa != null ? (rawRoa > 1 ? rawRoa : rawRoa * 100) : null;
  const isRoeHighQuality = roe >= 15;

  // 3. Creación de Valor (ROE vs K_e)
  const ke = Number(company?.ke || 9.5); // Costo de capital propio estimado K_e
  const spread = roe - ke;
  const createsValue = spread >= 0;

  // 4. Salud Financiera (Deuda y Liquidez)
  const liquidez = company.ratios.liquidezCorriente?.value ?? 1.5;
  const endeudamiento = company.ratios.endeudamiento?.value ?? 1.2;
  const endeudamientoNum = typeof endeudamiento === 'number' ? endeudamiento : parseFloat(String(endeudamiento)) || 1.2;
  const isHealthyDebt = liquidez >= 1.2 && endeudamientoNum <= 2.5;

  return (
    <div
      id="simple-view-mode"
      className="space-y-6 transition-all duration-300"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CABECERA MINIMALISTA & SELECTOR RÁPIDO                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {company.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {company.nombre}
                </h1>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {company.ticker}
                </span>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                  {company.sector}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-2xl leading-relaxed">
                {company.descripcion}
              </p>
            </div>
          </div>

          {/* Navegación y selector de empresa */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={onPrev}
              disabled={!canPrev}
              className={`p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center ${
                canPrev
                  ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                  : 'text-slate-300 border border-slate-200 cursor-not-allowed opacity-40'
              }`}
              title="Empresa anterior"
              aria-label="Empresa anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <select
                value={company.id}
                onChange={e => {
                  const selected = companies.find(c => c.id === e.target.value);
                  if (selected) onSelectCompany(selected);
                }}
                className="text-xs font-mono font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer pr-1"
                title="Cambiar de empresa"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.ticker} · {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onNext}
              disabled={!canNext}
              className={`p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center ${
                canNext
                  ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                  : 'text-slate-300 border border-slate-200 cursor-not-allowed opacity-40'
              }`}
              title="Empresa siguiente"
              aria-label="Empresa siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. EL GRÁFICO DE PRECIOS HISTÓRICO (VISTA LIMPIA Y DIRECTA)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="transition-all duration-300">
        <CompanyPriceChart company={company} simpleMode={true} />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1b. CONSENSO Y PRECIO OBJETIVO WALL STREET                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <WallStreetConsensus
        ticker={company.ticker}
        currentPrice={company.raw.precioCotizacion}
        consensus={company.targetConsensus}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PANEL DE LOS 4 INDICADORES ESENCIALES (VALUE INVESTING)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Los 4 Indicadores Esenciales (Value Investing)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Disciplina de Warren Buffett
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* ─────────────────────────────────────────────────────── */}
          {/* TARJETA 1: MARGEN DE SEGURIDAD                          */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  Margen de Seguridad
                </span>
                <IndicatorTooltip
                  title="Margen de Seguridad"
                  explanation="Indica cuánto más barata cotiza la acción frente al precio objetivo de consenso. Un margen alto protege tu capital ante crisis o errores de estimación."
                  idealValue="> +15% de descuento respecto al objetivo"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono tracking-tight ${
                    hasMarginData
                      ? upsidePotential >= 15
                        ? 'text-emerald-700'
                        : upsidePotential >= 0
                        ? 'text-slate-800'
                        : 'text-rose-700'
                      : 'text-slate-400'
                  }`}>
                    {hasMarginData ? `${upsidePotential > 0 ? '+' : ''}${upsidePotential}%` : 'N/D'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hasMarginData
                      ? upsidePotential >= 15
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : upsidePotential >= 0
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {hasMarginData
                      ? upsidePotential >= 15
                        ? 'Descuento Atractivo'
                        : upsidePotential >= 0
                        ? 'Precio Razonable'
                        : 'Sobrevalorada'
                      : 'Sin Datos'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Cotiza a <strong>${currentPrice.toFixed(2)}</strong> vs Objetivo <strong>${targetPrice ? targetPrice.toFixed(2) : 'N/D'}</strong>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 leading-snug">
                {hasMarginData && upsidePotential >= 15
                  ? '💡 Descuento superior al 15%: margen amplio de protección contra pérdidas de capital.'
                  : hasMarginData && upsidePotential >= 0
                  ? '💡 Cotiza cerca de su valor razonable: no hay descuento amplio, exige mayor disciplina.'
                  : '⚠️ Cotiza por encima del consenso de analistas: sin colchón protector al precio actual.'}
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* TARJETA 2: RENTABILIDAD (ROE / ROIC)                    */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  Rentabilidad (ROE)
                </span>
                <IndicatorTooltip
                  title="Rentabilidad sobre Patrimonio (ROE)"
                  explanation="Mide la eficiencia con la que la empresa genera beneficios netos a partir del capital aportado por sus socios. Es el sello de un negocio de calidad."
                  idealValue="ROE > 15% sostenido en el tiempo"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono tracking-tight ${
                    roe >= 15 ? 'text-emerald-700' : roe >= 10 ? 'text-slate-800' : 'text-rose-700'
                  }`}>
                    {roe.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    roe >= 20
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : roe >= 12
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {roe >= 20 ? 'Excelente Calidad' : roe >= 12 ? 'Rentabilidad Aceptable' : 'Bajo Rendimiento'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Retorno sobre fondos propios {roa !== null ? `· ROA: ${roa.toFixed(1)}%` : ''}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 leading-snug">
                {roe >= 15
                  ? `💡 Genera $${roe.toFixed(0)} de beneficio neto por cada $100 de capital; clara ventaja competitiva.`
                  : roe >= 10
                  ? `💡 Rendimiento promedio de mercado ($${roe.toFixed(0)} por cada $100); monitorear consistencia.`
                  : '⚠️ Rendimiento modesto: la empresa le saca poco provecho al capital de sus accionistas.'}
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* TARJETA 3: CREACIÓN DE VALOR (ROE vs K_e)               */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  Creación de Valor
                </span>
                <IndicatorTooltip
                  title="Creación de Valor Económico (Spread ROE - K_e)"
                  explanation="Compara el ROE con el Costo de Capital Propio (K_e ~9.5%). Si el ROE supera a K_e, la empresa multiplica el capital; si no, está destruyendo riqueza."
                  idealValue="ROE > K_e (Spread positivo)"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-black tracking-tight flex items-center gap-1.5 ${
                    createsValue ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {createsValue ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{createsValue ? 'Crea Valor' : 'Destruye Valor'}</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    createsValue
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {createsValue ? `+${spread.toFixed(1)}%` : `${spread.toFixed(1)}%`}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  ROE {roe.toFixed(1)}% vs Costo de Capital (K_e) {ke.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 leading-snug">
                {createsValue
                  ? `💡 Supera el costo exigido en ${(roe - ke).toFixed(1)} puntos; multiplica la riqueza del inversor.`
                  : '⚠️ El negocio rinde menos que la tasa mínima exigida; el capital rinde poco para su riesgo.'}
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* TARJETA 4: SALUD FINANCIERA (DEUDA & LIQUIDEZ)          */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  Salud Financiera
                </span>
                <IndicatorTooltip
                  title="Solidez de Balance y Deuda"
                  explanation="Evalúa si la empresa tiene suficiente liquidez inmediata (Razón Corriente >= 1.5x) y un endeudamiento bajo para resistir recesiones sin quebrar."
                  idealValue="Liquidez > 1.5x y Deuda/Patrimonio < 2.0x"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-black tracking-tight ${
                    isHealthyDebt ? 'text-emerald-700' : liquidez >= 1.0 ? 'text-slate-800' : 'text-rose-700'
                  }`}>
                    {isHealthyDebt ? 'Solvente y Blindada' : liquidez >= 1.0 ? 'Estable / Controlada' : 'Deuda Exigente'}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isHealthyDebt
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : liquidez >= 1.0
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {liquidez.toFixed(2)}x
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Liquidez {liquidez.toFixed(2)}x · Deuda/Patrimonio {endeudamientoNum.toFixed(2)}x
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 leading-snug">
                {isHealthyDebt
                  ? '💡 Cuenta con $1.5+ de activo circulante por cada $1 de deuda inmediata; sin riesgo de insolvencia.'
                  : liquidez >= 1.0
                  ? '💡 Posición de caja equilibrada; los flujos operativos cubren los vencimientos a corto plazo.'
                  : '⚠️ Pasivos inmediatos elevados; vigilar el fondo de maniobra para evitar tensión de caja.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VEREDICTO VALUE INVESTING & FOSO ECONÓMICO (MOAT)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Veredicto Value Investing
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  company.scoreGrade === 'A+' || company.scoreGrade === 'A'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : company.scoreGrade === 'F'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  Score: {company.linearScore}/100 ({company.scoreGrade})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                  Foso: {company.moat}
                </span>
              </div>
              <p className="text-xs text-slate-700 italic mt-1 leading-relaxed font-serif">
                "{company.warrenVerdict}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ASESORES FINANCIEROS (JAIRO & GUANGUI CONSULT)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <JairoGuillermoConsult companies={companies} isSimpleView={true} />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ENLACE PROGRESIVO HACIA EL MODO ANALISTA                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSimple && (
        <div className="flex items-center justify-center pt-2 pb-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('warren:toggle-to-analyst'))}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 transition-all shadow-2xs active:scale-95"
          >
            <span>¿Querés profundizar en los 11 ratios contables, modelo DuPont y balances completos?</span>
            <span className="font-bold text-slate-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Cambiar a Modo Analista <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};