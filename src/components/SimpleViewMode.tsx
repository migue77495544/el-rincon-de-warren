import React, { useEffect, useRef, useState } from 'react';
import { CompanyAnalysis } from '../types';
import { useFeatureFlags } from '../context/ViewModeContext';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  X
} from 'lucide-react';
import { JairoGuillermoConsult } from './JairoGuillermoConsult';
import { CompanyPriceChart } from './CompanyPriceChart';
import { plainVerdict, MARGEN_EXIGIDO } from '../utils/verdict';

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
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
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

const ONBOARDING_KEY = 'warren_onboarding_seen';
const fmt = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

type Tono = 'bien' | 'medio' | 'mal' | 'sin-datos';

const TONO: Record<Tono, { chip: string; text: string; dot: string }> = {
  bien: { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  medio: { chip: 'bg-amber-50 text-amber-900 border-amber-200', text: 'text-amber-900', dot: 'bg-amber-500' },
  mal: { chip: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
  'sin-datos': { chip: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' }
};

const TONE_FROM_LIGHT = { green: 'bien', yellow: 'medio', red: 'mal' } as const;

// Progreso de los primeros pasos. Vive fuera del componente porque la ficha se vuelve
// a montar cada vez que se carga otra empresa.
const progreso = { primeraEmpresa: null as string | null, eligio: false, definicion: false };

/* ───────────────── Primeros pasos (sustituye al modal de bienvenida) ───────────────── */

const PrimerosPasos: React.FC<{ eligioEmpresa: boolean; abrioDefinicion: boolean }> = ({ eligioEmpresa, abrioDefinicion }) => {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) !== 'true'; } catch { return true; }
  });
  const cerrar = () => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
    setVisible(false);
  };
  if (!visible) return null;

  const pasos = [
    { texto: 'Elige una empresa de la lista (o deja Berkshire, la de Buffett).', hecho: eligioEmpresa },
    { texto: 'Lee la respuesta: si la empresa es buena y si su precio lo es.', hecho: eligioEmpresa || abrioDefinicion },
    { texto: 'Toca «¿Qué significa?» bajo cualquier cifra para entenderla.', hecho: abrioDefinicion }
  ];
  const completos = pasos.filter(p => p.hecho).length;

  return (
    <section aria-labelledby="primeros-pasos" className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="primeros-pasos" className="m-0 font-serif text-lg font-semibold text-slate-900">
            ¿Es buena idea invertir en esta empresa? Averígualo en tres pasos
          </h2>
          <p className="mt-0.5 mb-0 text-sm text-slate-700">
            {completos === pasos.length ? 'Listo: ya sabes leer una ficha. Prueba con otra empresa.' : `${completos} de ${pasos.length} hechos`}
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="shrink-0 w-8 h-8 rounded-md text-slate-600 hover:text-slate-900 hover:bg-amber-100 flex items-center justify-center"
          aria-label="Ocultar primeros pasos"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="m-0 mt-3 p-0 list-none grid gap-2 sm:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
            <span
              className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                p.hecho ? 'bg-emerald-700 text-white' : 'bg-white border border-amber-400 text-amber-900'
              }`}
              aria-hidden="true"
            >
              {p.hecho ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span>
              {p.texto}
              <span className="sr-only">{p.hecho ? ' (hecho)' : ' (pendiente)'}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* ───────────────── Regla del margen de seguridad ───────────────── */

const ReglaMargen: React.FC<{ price: number; target: number; buyBelow: number }> = ({ price, target, buyBelow }) => {
  const lo = Math.min(price, buyBelow) * 0.92;
  const hi = Math.max(price, target) * 1.06;
  const frac = (v: number) => (v - lo) / (hi - lo);
  const pos = (v: number) => `${frac(v) * 100}%`;
  // Las etiquetas se alinean al borde cuando su marca cae cerca de un extremo, para no cortarse
  const ancla = (v: number) => (frac(v) < 0.15 ? 'translate-x-0 items-start text-left' : frac(v) > 0.85 ? '-translate-x-full items-end text-right' : '-translate-x-1/2 items-center text-center');
  const zona = price <= buyBelow ? 'barata' : price <= target ? 'justa' : 'cara';

  return (
    <figure className="m-0">
      <figcaption className="text-sm text-slate-700 mb-8">
        Dónde está el precio hoy frente a lo que valdría con un colchón del {Math.round(MARGEN_EXIGIDO * 100)} %
      </figcaption>
      <div className="relative h-3 rounded-full overflow-visible flex" role="img"
        aria-label={`Precio hoy ${fmt(price)}. Con colchón, por debajo de ${fmt(buyBelow)}. Objetivo de analistas ${fmt(target)}. Zona: ${zona}.`}>
        <span className="h-full rounded-l-full bg-emerald-600/80" style={{ width: pos(buyBelow) }} />
        <span className="h-full bg-amber-400/80" style={{ width: `calc(${pos(target)} - ${pos(buyBelow)})` }} />
        <span className="h-full flex-1 rounded-r-full bg-rose-500/70" />

        {/* Precio de hoy: el marcador principal */}
        <span className={`absolute -top-7 flex flex-col ${ancla(price)}`} style={{ left: pos(price) }}>
          <span className="cifra text-sm font-semibold text-slate-900 whitespace-nowrap">Hoy {fmt(price)}</span>
          <span className="w-0.5 h-[34px] bg-slate-900" aria-hidden="true" />
        </span>
      </div>
      <div className="relative h-10 mt-1 text-xs text-slate-700">
        <span className={`absolute flex flex-col whitespace-nowrap ${ancla(buyBelow)}`} style={{ left: pos(buyBelow) }}>
          <span className="block w-px h-2 bg-slate-500" aria-hidden="true" />
          <span>Con colchón</span><span className="tabular font-semibold text-slate-900">{fmt(buyBelow)}</span>
        </span>
        <span className={`absolute flex flex-col whitespace-nowrap ${ancla(target)}`} style={{ left: pos(target) }}>
          <span className="block w-px h-2 bg-slate-500" aria-hidden="true" />
          <span>Analistas</span><span className="tabular font-semibold text-slate-900">{fmt(target)}</span>
        </span>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-600" aria-hidden="true">
        <span>Barata</span><span>Precio justo</span><span>Cara</span>
      </div>
    </figure>
  );
};

/* ───────────────── Una clave: pregunta, respuesta y definición a un toque ───────────────── */

interface ClaveProps {
  pregunta: string;
  respuesta: string;
  tono: Tono;
  explicacion: string;
  cifra: React.ReactNode;
  definicion: string;
  onAbrir: () => void;
}

const Clave: React.FC<ClaveProps> = ({ pregunta, respuesta, tono, explicacion, cifra, definicion, onAbrir }) => {
  const [abierta, setAbierta] = useState(false);
  const id = useRef(`def-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <li className="p-4 sm:p-5 flex flex-col gap-2">
      <h3 className="m-0 text-[15px] font-semibold text-slate-900 leading-snug">{pregunta}</h3>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-sm font-semibold ${TONO[tono].chip}`}>
          <span className={`w-2 h-2 rounded-full ${TONO[tono].dot}`} aria-hidden="true" />
          {respuesta}
        </span>
        <span className="text-sm text-slate-700">{explicacion}</span>
      </p>
      <p className="m-0 text-sm text-slate-600">{cifra}</p>
      <button
        type="button"
        onClick={() => { setAbierta(!abierta); if (!abierta) onAbrir(); }}
        aria-expanded={abierta}
        aria-controls={id}
        className="self-start -ml-1 px-1 h-7 text-sm font-medium text-amber-800 hover:text-amber-900 flex items-center gap-1 rounded"
      >
        ¿Qué significa?
        <ChevronDown className={`w-4 h-4 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {abierta && (
        <p id={id} className="m-0 text-sm text-slate-700 leading-relaxed border-l-2 border-amber-300 pl-3">
          {definicion}
        </p>
      )}
    </li>
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

  // Progreso de los primeros pasos
  if (progreso.primeraEmpresa === null) progreso.primeraEmpresa = company.id;
  const [eligioEmpresa, setEligioEmpresa] = useState(progreso.eligio);
  const [abrioDefinicion, setAbrioDefinicionState] = useState(progreso.definicion);
  const setAbrioDefinicion = (v: boolean) => { progreso.definicion = v; setAbrioDefinicionState(v); };
  const [verAsesores, setVerAsesores] = useState(false);
  useEffect(() => {
    if (company.id !== progreso.primeraEmpresa) {
      progreso.eligio = true;
      setEligioEmpresa(true);
    }
  }, [company.id]);

  const v = plainVerdict(company);
  const price = company.raw.precioCotizacion;
  const target = company.targetConsensus?.target_mean;

  // Rentabilidad (ROE) y coste del capital
  const rawRoe = company.ratios.roe?.value;
  const roe = rawRoe != null ? (Math.abs(rawRoe) > 1 ? rawRoe : rawRoe * 100) : null;
  const ke = Number((company as any)?.ke || 9.5);

  // Liquidez y deuda
  const liquidez = company.ratios.liquidezCorriente?.value ?? null;
  const deuda = company.ratios.endeudamiento?.value ?? null;

  const roeTono: Tono = roe === null ? 'sin-datos' : roe >= 15 ? 'bien' : roe >= 8 ? 'medio' : 'mal';
  const valorTono: Tono = roe === null ? 'sin-datos' : roe - ke >= 2 ? 'bien' : roe - ke >= 0 ? 'medio' : 'mal';
  const saludTono: Tono = liquidez === null || deuda === null ? 'sin-datos'
    : liquidez >= 1.2 && deuda <= 1.5 ? 'bien'
    : liquidez >= 1.0 && deuda <= 2.5 ? 'medio' : 'mal';
  const fosoTono: Tono = company.moat === 'Amplio' ? 'bien' : company.moat === 'Medio' ? 'medio' : 'mal';

  return (
    <div id="simple-view-mode" className="space-y-6">
      <PrimerosPasos eligioEmpresa={eligioEmpresa} abrioDefinicion={abrioDefinicion} />

      {/* ── Empresa ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm text-slate-600">
            <span className="font-semibold text-amber-800">{company.ticker}</span>
            <span className="text-slate-300 mx-1.5" aria-hidden="true">/</span>
            {company.sector}
          </p>
          <h1 className="mt-1 mb-0 font-serif text-[30px] sm:text-[38px] leading-[1.1] font-semibold text-slate-900">
            {company.nombre}
          </h1>
          {company.descripcion && (
            <p className="mt-2 mb-0 text-sm text-slate-700 leading-relaxed max-w-[62ch] line-clamp-2">
              {company.descripcion}
            </p>
          )}
        </div>

        {/* En escritorio la lista de la izquierda ya sirve para cambiar; aquí solo en móvil y tableta */}
        <div className="flex lg:hidden items-center gap-1.5">
          <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Empresa anterior"
            className="h-10 w-10 rounded-md border border-slate-300 bg-white text-slate-700 flex items-center justify-center disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={company.id}
            onChange={e => {
              const selected = companies.find(c => c.id === e.target.value);
              if (selected) onSelectCompany(selected);
            }}
            className="h-10 flex-1 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-900"
            aria-label="Cambiar de empresa"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button type="button" onClick={onNext} disabled={!canNext} aria-label="Empresa siguiente"
            className="h-10 w-10 rounded-md border border-slate-300 bg-white text-slate-700 flex items-center justify-center disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── La respuesta ── */}
      <section aria-labelledby="respuesta-titulo" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className={`h-1.5 ${v.tone === 'green' ? 'bg-emerald-600' : v.tone === 'red' ? 'bg-rose-600' : 'bg-amber-500'}`} aria-hidden="true" />
        <div className="p-5 sm:p-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 id="respuesta-titulo" className="m-0 text-sm font-medium text-slate-600">
              ¿Es buena inversión hoy?
            </h2>
            <p className={`m-0 mt-2 font-serif text-[28px] sm:text-[34px] leading-[1.15] font-semibold ${TONO[TONE_FROM_LIGHT[v.tone]].text}`}>
              {v.headline}
            </p>
            <p className="m-0 mt-3 text-[15px] leading-relaxed text-slate-800 max-w-[56ch]">{v.reason}</p>
            <p className="m-0 mt-3 text-[15px] leading-relaxed text-slate-900 font-medium max-w-[56ch]">{v.nextStep}</p>

            <dl className="m-0 mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-sm text-slate-600">La empresa</dt>
                <dd className="m-0 mt-0.5 flex items-baseline gap-1.5">
                  <span className="cifra text-[26px] leading-none text-slate-900">{company.scoreGrade}</span>
                  <span className="text-sm text-slate-700">
                    nota de calidad ({company.linearScore} de 100)
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-600">El precio</dt>
                <dd className="m-0 mt-0.5 flex items-baseline gap-1.5">
                  <span className="cifra text-[26px] leading-none text-slate-900">{fmt(price)}</span>
                  <span className="text-sm text-slate-700">
                    {v.margin === 'amplio' ? 'con descuento' : v.margin === 'estrecho' ? 'sin apenas descuento' : v.margin === 'sin-margen' ? 'por encima del objetivo' : 'sin objetivo de analistas'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {target && v.buyBelow ? (
            <div className="lg:border-l lg:border-slate-200 lg:pl-8">
              <ReglaMargen price={price} target={target} buyBelow={v.buyBelow} />
            </div>
          ) : (
            <p className="m-0 text-sm text-slate-700 lg:border-l lg:border-slate-200 lg:pl-8">
              Sin precio objetivo de analistas no se puede dibujar el margen de seguridad. Fíjate sobre todo en la calidad del negocio.
            </p>
          )}
        </div>
      </section>

      {/* ── Por qué ── */}
      <section aria-labelledby="claves-titulo">
        <h2 id="claves-titulo" className="m-0 mb-3 font-serif text-xl font-semibold text-slate-900">
          Por qué: cuatro preguntas sobre el negocio
        </h2>
        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 rounded-2xl border border-slate-200 overflow-hidden [&>li]:bg-white">
          <Clave
            pregunta="¿Gana mucho con el dinero de sus dueños?"
            respuesta={roeTono === 'bien' ? 'Sí' : roeTono === 'medio' ? 'Regular' : roeTono === 'mal' ? 'No' : 'Sin datos'}
            tono={roeTono}
            explicacion={roe === null ? 'No hay datos de beneficio.' : `Por cada $100 que han puesto, gana unos $${Math.max(0, roe).toFixed(0)} al año.`}
            cifra={roe === null ? 'Rentabilidad sobre el patrimonio: sin datos' : <>Rentabilidad sobre el patrimonio (ROE): <strong className="tabular font-semibold text-slate-900">{pct(roe)}</strong>. Lo bueno: más del 15 %.</>}
            definicion="El ROE mide cuánto beneficio saca la empresa del dinero que han aportado sus accionistas. Buffett busca empresas que superen el 15 % año tras año: es la huella de un buen negocio."
            onAbrir={() => setAbrioDefinicion(true)}
          />
          <Clave
            pregunta="¿Rinde más de lo que le cuesta su dinero?"
            respuesta={valorTono === 'bien' ? 'Sí' : valorTono === 'medio' ? 'Justo' : valorTono === 'mal' ? 'No' : 'Sin datos'}
            tono={valorTono}
            explicacion={roe === null ? 'No se puede comparar.' : roe >= ke ? 'Cada año hace crecer la riqueza de sus accionistas.' : 'Tu dinero rendiría más en otra inversión de riesgo parecido.'}
            cifra={roe === null ? '' : <>Gana un <strong className="tabular font-semibold text-slate-900">{pct(roe)}</strong> y un inversor exige al menos un <strong className="tabular font-semibold text-slate-900">{pct(ke)}</strong> por el riesgo.</>}
            definicion="Invertir en una empresa tiene un coste: lo que podrías ganar en otra inversión de riesgo parecido (el «coste del capital»). Si la empresa rinde más que ese coste, crea valor; si rinde menos, lo destruye aunque tenga beneficios."
            onAbrir={() => setAbrioDefinicion(true)}
          />
          <Clave
            pregunta="¿Puede pagar sus deudas sin apuros?"
            respuesta={saludTono === 'bien' ? 'Sí' : saludTono === 'medio' ? 'Con poco margen' : saludTono === 'mal' ? 'Con apuros' : 'Sin datos'}
            tono={saludTono}
            explicacion={
              liquidez === null ? 'No hay datos del balance.'
                : `Tiene $${liquidez.toFixed(2)} a mano por cada $1 que debe pagar este año${deuda !== null ? ` y debe $${deuda.toFixed(2)} por cada $1 que es suyo` : ''}.`
            }
            cifra={<>Lo bueno: más de $1,50 a mano por cada $1 que vence, y deber menos de $1 por cada $1 propio.</>}
            definicion="Una empresa con poca caja o mucha deuda puede verse obligada a pedir prestado caro, vender activos o emitir acciones en una crisis. Las que aguantan sin apuros son las que sobreviven a los malos años."
            onAbrir={() => setAbrioDefinicion(true)}
          />
          <Clave
            pregunta="¿Tiene algo que la proteja de la competencia?"
            respuesta={fosoTono === 'bien' ? 'Sí, mucho' : fosoTono === 'medio' ? 'Algo' : 'Poco'}
            tono={fosoTono}
            explicacion={
              fosoTono === 'bien' ? 'Marca, tamaño o costes que a otros les costaría años igualar.'
                : fosoTono === 'medio' ? 'Tiene ventajas, pero los competidores pueden alcanzarla.'
                : 'Cualquiera podría quitarle clientes bajando precios.'
            }
            cifra={<>Foso defensivo: <strong className="font-semibold text-slate-900">{company.moat}</strong></>}
            definicion="Buffett lo llama «foso»: lo que impide que otros copien el negocio (una marca querida, una red de clientes, costes más bajos). Con un foso ancho los beneficios duran; sin él, la competencia los erosiona."
            onAbrir={() => setAbrioDefinicion(true)}
          />
        </ul>
      </section>

      {/* ── Precio ── */}
      <CompanyPriceChart company={company} simpleMode={true} />

      {/* ── Asesores, plegados para no saturar ── */}
      <section aria-labelledby="asesores-simple" className="bg-white rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setVerAsesores(!verAsesores)}
          aria-expanded={verAsesores}
          aria-controls="asesores-simple-panel"
          className="w-full flex items-center justify-between gap-3 p-5 text-left rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <MessagesSquare className="w-5 h-5 text-amber-800 shrink-0" aria-hidden="true" />
            <span>
              <span id="asesores-simple" className="block font-serif text-lg font-semibold text-slate-900">¿Te queda una duda? Pregunta a los asesores</span>
              <span className="block text-sm text-slate-600">Jairo te lo explica desde los números del negocio; Juan Guillermo, desde el gráfico.</span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${verAsesores ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {verAsesores && (
          <div id="asesores-simple-panel" className="border-t border-slate-200 p-3 sm:p-4">
            <JairoGuillermoConsult companies={companies} isSimpleView={true} />
          </div>
        )}
      </section>

      {/* ── Paso al Modo Analista ── */}
      {isSimple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 p-5">
          <p className="m-0 text-sm text-slate-700 max-w-[60ch]">
            ¿Quieres ver todos los ratios, el balance y la valoración de {company.nombre}? El Modo Analista lo muestra todo; puedes volver cuando quieras.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('warren:toggle-to-analyst'))}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-slate-400 text-slate-900 text-sm font-semibold hover:bg-white transition-colors shrink-0"
          >
            Ver el análisis completo
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
