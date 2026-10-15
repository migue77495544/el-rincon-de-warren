import React, { useState } from 'react';
import { CompanyAnalysis } from '../types';
import { useFeatureFlags } from '../context/ViewModeContext';
import {
  ArrowRight,
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
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-card">
    <div className="skeleton h-3 w-3/4"></div>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton h-2"
        style={{ width: `${60 - i * 10}%` }}
      ></div>
    ))}
  </div>
);

// Explicación breve de cada indicador (hover, foco o toque)
const IndicatorTooltip: React.FC<{ title: string; explanation: string; idealValue: string }> = ({
  title,
  explanation,
  idealValue
}) => {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full transition-colors"
        aria-label={`Qué es ${title}`}
        aria-expanded={open}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl z-50 pointer-events-none animate-fadeIn leading-relaxed text-left"
        >
          <span className="block font-semibold text-white mb-1">{title}</span>
          <span className="block text-slate-300">{explanation}</span>
          <span className="block text-amber-300 mt-2 pt-2 border-t border-slate-700">
            Lo deseable: {idealValue}
          </span>
        </span>
      )}
    </span>
  );
};

type Tono = 'bien' | 'neutro' | 'mal' | 'sin-datos';

const TONO_TEXTO: Record<Tono, string> = {
  bien: 'text-emerald-700',
  neutro: 'text-slate-800',
  mal: 'text-rose-700',
  'sin-datos': 'text-slate-400'
};

const TONO_MARCA: Record<Tono, string> = {
  bien: 'bg-emerald-600',
  neutro: 'bg-slate-400',
  mal: 'bg-rose-600',
  'sin-datos': 'bg-slate-300'
};

interface IndicadorProps {
  titulo: string;
  ayuda: { title: string; explanation: string; idealValue: string };
  valor: string;
  estado: string;
  tono: Tono;
  detalle: React.ReactNode;
  lectura: string;
}

// Una columna del libro: título, cifra, estado y qué significa
const Indicador: React.FC<IndicadorProps> = ({ titulo, ayuda, valor, estado, tono, detalle, lectura }) => (
  <div className="p-5 flex flex-col gap-3">
    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
      <span>{titulo}</span>
      <IndicatorTooltip {...ayuda} />
    </div>

    <div>
      <div className={`tabular text-[30px] leading-none font-semibold tracking-tight ${TONO_TEXTO[tono]}`}>
        {valor}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
        <span className={`w-2 h-2 rounded-full ${TONO_MARCA[tono]}`} aria-hidden="true" />
        {estado}
      </div>
      <div className="mt-1 text-xs text-slate-500">{detalle}</div>
    </div>

    <p className="m-0 text-[13px] leading-relaxed text-slate-600">{lectura}</p>
  </div>
);

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
  const hasMarginData = upsidePotential !== null && !isNaN(upsidePotential);
  const margenTono: Tono = !hasMarginData ? 'sin-datos' : upsidePotential >= 15 ? 'bien' : upsidePotential >= 0 ? 'neutro' : 'mal';

  // 2. Rentabilidad (ROE / ROA)
  const rawRoe = company.ratios.roe?.value;
  const roe = rawRoe != null ? (rawRoe > 1 ? rawRoe : rawRoe * 100) : 22.0;
  const rawRoa = company.ratios.roa?.value;
  const roa = rawRoa != null ? (rawRoa > 1 ? rawRoa : rawRoa * 100) : null;
  const roeTono: Tono = roe >= 15 ? 'bien' : roe >= 10 ? 'neutro' : 'mal';

  // 3. Creación de Valor (ROE vs K_e)
  const ke = Number(company?.ke || 9.5);
  const spread = roe - ke;
  const createsValue = spread >= 0;

  // 4. Salud Financiera (Deuda y Liquidez)
  const liquidez = company.ratios.liquidezCorriente?.value ?? 1.5;
  const endeudamiento = company.ratios.endeudamiento?.value ?? 1.2;
  const endeudamientoNum = typeof endeudamiento === 'number' ? endeudamiento : parseFloat(String(endeudamiento)) || 1.2;
  const isHealthyDebt = liquidez >= 1.2 && endeudamientoNum <= 2.5;
  const saludTono: Tono = isHealthyDebt ? 'bien' : liquidez >= 1.0 ? 'neutro' : 'mal';

  const gradeTono: Tono = company.scoreGrade === 'A+' || company.scoreGrade === 'A'
    ? 'bien'
    : company.scoreGrade === 'F' ? 'mal' : 'neutro';

  return (
    <div id="simple-view-mode" className="space-y-6">
      {/* ── Cabecera: empresa y navegación ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-700">{company.ticker}</span>
            <span aria-hidden="true">/</span>
            <span>{company.sector}</span>
          </div>
          <h1 className="mt-1 mb-0 font-serif text-[32px] sm:text-[38px] leading-[1.1] font-semibold tracking-tight text-slate-900">
            {company.nombre}
          </h1>
          {company.descripcion && (
            <p className="mt-2 mb-0 text-sm text-slate-600 leading-relaxed max-w-[62ch] line-clamp-2">
              {company.descripcion}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Empresa anterior"
            title="Empresa anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={company.id}
            onChange={e => {
              const selected = companies.find(c => c.id === e.target.value);
              if (selected) onSelectCompany(selected);
            }}
            className="h-9 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 cursor-pointer"
            aria-label="Cambiar de empresa"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.ticker} · {c.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Empresa siguiente"
            title="Empresa siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Veredicto: la respuesta primero ── */}
      <section
        aria-labelledby="veredicto-titulo"
        className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden"
      >
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" aria-hidden="true" />
        <div className="p-6 sm:p-8 sm:pl-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 id="veredicto-titulo" className="m-0 text-[13px] font-semibold text-amber-700">
              Qué diría Warren
            </h2>
            <blockquote className="m-0 mt-3 font-serif text-[22px] sm:text-[26px] leading-[1.35] text-slate-900 max-w-[46ch]">
              «{company.warrenVerdict}»
            </blockquote>
          </div>

          <dl className="m-0 flex md:flex-col gap-6 md:gap-4 md:pl-8 md:border-l md:border-slate-200 md:min-w-[150px]">
            <div>
              <dt className="text-xs text-slate-500">Nota de calidad</dt>
              <dd className="m-0 mt-1 flex items-baseline gap-1.5">
                <span className={`font-serif text-[40px] leading-none font-semibold ${TONO_TEXTO[gradeTono]}`}>
                  {company.scoreGrade}
                </span>
                <span className="tabular text-xs text-slate-500">{company.linearScore}/100</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Foso defensivo</dt>
              <dd className="m-0 mt-1 text-sm font-semibold text-slate-900">{company.moat}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Los cuatro motivos ── */}
      <section aria-labelledby="claves-titulo">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 id="claves-titulo" className="m-0 font-serif text-xl font-semibold text-slate-900">
            Las cuatro claves
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">Pasa el cursor por el signo de interrogación para ver cada definición</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 rounded-2xl border border-slate-200 overflow-hidden [&>*]:bg-white">
          <Indicador
            titulo="Margen de seguridad"
            ayuda={{
              title: 'Margen de seguridad',
              explanation: 'Cuánto más barata cotiza la acción frente al precio objetivo de los analistas. Un margen amplio protege tu capital si te equivocas al estimar.',
              idealValue: 'más de un 15 % por debajo del objetivo'
            }}
            valor={hasMarginData ? `${upsidePotential > 0 ? '+' : ''}${upsidePotential}%` : 'N/D'}
            estado={margenTono === 'bien' ? 'Descuento atractivo' : margenTono === 'neutro' ? 'Precio razonable' : margenTono === 'mal' ? 'Cara' : 'Sin datos'}
            tono={margenTono}
            detalle={<>Cotiza a <span className="tabular">${currentPrice.toFixed(2)}</span> · objetivo <span className="tabular">{targetPrice ? `$${targetPrice.toFixed(2)}` : 'N/D'}</span></>}
            lectura={
              margenTono === 'bien'
                ? 'Hay un colchón amplio entre el precio y lo que vale según los analistas.'
                : margenTono === 'neutro'
                ? 'Cotiza cerca de su valor estimado: no hay descuento que te proteja.'
                : margenTono === 'mal'
                ? 'Cotiza por encima del objetivo: pagarías más de lo que se estima que vale.'
                : 'No hay precio objetivo de analistas para esta empresa.'
            }
          />

          <Indicador
            titulo="Rentabilidad (ROE)"
            ayuda={{
              title: 'Rentabilidad sobre el patrimonio (ROE)',
              explanation: 'Beneficio que genera la empresa por cada dólar que han puesto sus accionistas. Es la huella de un buen negocio.',
              idealValue: 'ROE por encima del 15 % de forma sostenida'
            }}
            valor={`${roe.toFixed(1)}%`}
            estado={roe >= 20 ? 'Excelente' : roe >= 15 ? 'Buena' : roe >= 10 ? 'Aceptable' : 'Baja'}
            tono={roeTono}
            detalle={roa !== null ? <>ROA <span className="tabular">{roa.toFixed(1)}%</span></> : 'Retorno sobre fondos propios'}
            lectura={
              roe >= 10
                ? `Gana unos $${roe.toFixed(0)} al año por cada $100 de capital de sus socios.`
                : 'Le saca poco provecho al dinero de sus accionistas.'
            }
          />

          <Indicador
            titulo="Creación de valor"
            ayuda={{
              title: 'Creación de valor (ROE frente a Ke)',
              explanation: 'Compara la rentabilidad con lo mínimo que exige un inversor por el riesgo (coste del capital, Ke). Si la supera, el negocio multiplica tu dinero.',
              idealValue: 'ROE mayor que Ke'
            }}
            valor={`${spread >= 0 ? '+' : ''}${spread.toFixed(1)} pts`}
            estado={createsValue ? 'Crea valor' : 'Destruye valor'}
            tono={createsValue ? 'bien' : 'mal'}
            detalle={<>ROE <span className="tabular">{roe.toFixed(1)}%</span> frente a Ke <span className="tabular">{ke.toFixed(1)}%</span></>}
            lectura={
              createsValue
                ? 'Rinde más de lo que cuesta su capital: cada año hace crecer la riqueza del accionista.'
                : 'Rinde menos de lo que se exige por su riesgo: el capital estaría mejor en otro sitio.'
            }
          />

          <Indicador
            titulo="Salud financiera"
            ayuda={{
              title: 'Liquidez y deuda',
              explanation: 'Si la empresa puede pagar lo que vence pronto (liquidez) y si su deuda es moderada frente a su patrimonio, para aguantar una crisis.',
              idealValue: 'liquidez por encima de 1,5x y deuda/patrimonio por debajo de 2x'
            }}
            valor={`${liquidez.toFixed(2)}x`}
            estado={saludTono === 'bien' ? 'Sólida' : saludTono === 'neutro' ? 'Estable' : 'Ajustada'}
            tono={saludTono}
            detalle={<>Deuda/patrimonio <span className="tabular">{endeudamientoNum.toFixed(2)}x</span></>}
            lectura={
              saludTono === 'bien'
                ? 'Tiene activos de sobra para cubrir sus pagos cercanos y una deuda prudente.'
                : saludTono === 'neutro'
                ? 'Cubre sus pagos a corto plazo, aunque sin mucho margen.'
                : 'Sus pagos inmediatos superan lo que tiene a mano: vigila la caja.'
            }
          />
        </div>
      </section>

      {/* ── Precio ── */}
      <CompanyPriceChart company={company} simpleMode={true} />

      {/* ── Qué opinan los analistas ── */}
      <WallStreetConsensus
        ticker={company.ticker}
        currentPrice={company.raw.precioCotizacion}
        consensus={company.targetConsensus}
      />

      {/* ── Asesores ── */}
      <JairoGuillermoConsult companies={companies} isSimpleView={true} />

      {/* ── Paso al Modo Analista ── */}
      {isSimple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-5">
          <p className="m-0 text-sm text-slate-600 max-w-[60ch]">
            ¿Quieres ver los 11 ratios contables, el modelo DuPont, el balance completo y la valoración por CAPM de {company.nombre}?
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('warren:toggle-to-analyst'))}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors shrink-0"
          >
            Cambiar a Modo Analista
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
