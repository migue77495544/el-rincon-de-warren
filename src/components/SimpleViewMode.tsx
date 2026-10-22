import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CompanyAnalysis } from '../types';
import { useFeatureFlags } from '../context/ViewModeContext';
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessagesSquare,
  Minus,
  Search,
  X
} from 'lucide-react';
import { calcularPilares, aprobadas, Pilar } from '../utils/pilares';
import { abrirBuscador } from '../utils/events';
import { CompanyPriceChart } from './CompanyPriceChartLazy';
import { plainVerdict, MARGEN_EXIGIDO } from '../utils/verdict';

// Los asesores solo se ven al desplegarlos: se descargan entonces
const JairoGuillermoConsult = lazy(() => import('./JairoGuillermoConsult').then(m => ({ default: m.JairoGuillermoConsult })));

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
    { texto: 'Busca una empresa con la lupa de arriba (o quédate con Berkshire, la de Buffett).', hecho: eligioEmpresa, accion: true },
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
              {'accion' in p && !p.hecho && (
                <button type="button" onClick={abrirBuscador}
                  className="mt-1.5 flex items-center gap-1.5 h-8 px-3 rounded-full border border-amber-400 bg-white text-sm font-medium text-amber-900 hover:bg-amber-100">
                  <Search className="w-3.5 h-3.5" aria-hidden="true" /> Buscar empresa
                </button>
              )}
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

/* ───────────────── Puntuación Warren: la nota y sus cuatro dimensiones ───────────────── */

const DIMENSIONES: Array<{ clave: 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion'; nombre: string; ayuda: string }> = [
  { clave: 'rentabilidad', nombre: 'Rentabilidad', ayuda: 'cuánto gana con su dinero' },
  { clave: 'solvencia', nombre: 'Solvencia', ayuda: 'cuánto debe y si puede pagarlo' },
  { clave: 'liquidez', nombre: 'Liquidez', ayuda: 'caja para el corto plazo' },
  { clave: 'valoracion', nombre: 'Valoración', ayuda: 'si el precio es razonable' }
];

const lectura = (v: number) =>
  v >= 80 ? { palabra: 'Muy bien', barra: 'bg-emerald-600', texto: 'text-emerald-800' }
    : v >= 60 ? { palabra: 'Bien', barra: 'bg-emerald-500', texto: 'text-emerald-800' }
    : v >= 40 ? { palabra: 'Regular', barra: 'bg-amber-500', texto: 'text-amber-900' }
    : { palabra: 'Flojo', barra: 'bg-rose-500', texto: 'text-rose-800' };

const PuntuacionWarren: React.FC<{ company: CompanyAnalysis }> = ({ company }) => {
  const nota = company.linearScore;
  const l = lectura(nota);
  return (
    <section aria-labelledby="puntuacion-titulo" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:items-center">
        <div>
          <h2 id="puntuacion-titulo" className="m-0 text-sm font-medium text-slate-600">Puntuación Warren</h2>
          <p className="m-0 mt-1 flex items-baseline gap-1.5">
            <span className="cifra text-[56px] leading-none text-slate-900">{nota}</span>
            <span className="text-lg text-slate-500">/100</span>
          </p>
          <p className={`m-0 mt-2 text-[15px] font-semibold ${l.texto}`}>
            Nota {company.scoreGrade}: calidad {nota >= 80 ? 'alta' : nota >= 65 ? 'buena' : nota >= 50 ? 'irregular' : 'débil'}
          </p>
          <p className="m-0 mt-1 text-sm text-slate-600">Resume en un número la salud del negocio, de 0 a 100.</p>
        </div>
        <ul className="m-0 p-0 list-none grid gap-4">
          {DIMENSIONES.map(d => {
            const v = Math.round(company.dimensiones?.[d.clave]?.score ?? 0);
            const lv = lectura(v);
            return (
              <li key={d.clave}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold text-slate-900">{d.nombre}</span>
                    <span className="hidden sm:inline text-slate-600">: {d.ayuda}</span>
                  </span>
                  <span className={`shrink-0 font-semibold ${lv.texto}`}>
                    {lv.palabra} <span className="tabular text-slate-600 font-normal">{v}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-slate-100 overflow-hidden" role="meter" aria-label={d.nombre} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
                  <div className={`h-full rounded-full ${lv.barra} motion-safe:transition-[width] motion-safe:duration-700`} style={{ width: `${v}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

/* ───────────────── Un pilar: comprobaciones de sí/no y definición a un toque ───────────────── */

const PilarFicha: React.FC<{ pilar: Pilar; onAbrir: () => void }> = ({ pilar, onAbrir }) => {
  const [abierta, setAbierta] = useState(false);
  const id = `def-${pilar.id}`;
  const ok = aprobadas(pilar);
  const total = pilar.comprobaciones.length;
  const tono = ok / total >= 0.75 ? 'text-emerald-800' : ok / total >= 0.4 ? 'text-amber-900' : 'text-rose-800';
  return (
    <li className="p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 font-serif text-lg font-semibold text-slate-900">{pilar.titulo}</h3>
          <p className="m-0 text-sm text-slate-600">{pilar.pregunta}</p>
        </div>
        <p className={`m-0 shrink-0 text-right ${tono}`}>
          <span className="cifra text-2xl">{ok}</span>
          <span className="text-sm"> de {total}</span>
          <span className="block text-xs text-slate-600">comprobaciones</span>
        </p>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {pilar.comprobaciones.map((c, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${c.ok === true ? 'bg-emerald-500' : c.ok === false ? 'bg-amber-300' : 'bg-slate-200'}`} />
        ))}
      </div>
      <ul className="m-0 p-0 list-none grid gap-2">
        {pilar.comprobaciones.map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-snug text-slate-800">
            <span
              className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${
                c.ok === true ? 'bg-emerald-100 text-emerald-800' : c.ok === false ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
              }`}
              aria-hidden="true"
            >
              {c.ok === true ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : c.ok === false ? <X className="w-3.5 h-3.5" strokeWidth={3} /> : <Minus className="w-3.5 h-3.5" />}
            </span>
            <span>
              <span className="sr-only">{c.ok === true ? 'Cumple: ' : c.ok === false ? 'No cumple: ' : 'Sin datos: '}</span>
              {c.texto}
            </span>
          </li>
        ))}
      </ul>
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
        <p id={id} className="m-0 text-sm text-slate-700 leading-relaxed border-l-2 border-amber-300 pl-3">{pilar.definicion}</p>
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

  const pilares = calcularPilares(company);

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
        <p className="m-0 shrink-0 sm:text-right">
          <span className="block text-sm text-slate-600">Precio hoy</span>
          <span className="cifra text-[30px] leading-none text-slate-900">{fmt(price)}</span>
        </p>
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

      {/* ── Puntuación Warren ── */}
      <PuntuacionWarren company={company} />

      {/* ── Los cuatro pilares ── */}
      <section aria-labelledby="pilares-titulo">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 id="pilares-titulo" className="m-0 font-serif text-xl font-semibold text-slate-900">Por qué: cuatro pilares del negocio</h2>
          <p className="m-0 text-sm text-slate-600">Cada pilar suma las comprobaciones que supera.</p>
        </div>
        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 rounded-2xl border border-slate-200 overflow-hidden [&>li]:bg-white">
          {pilares.map(p => <PilarFicha key={p.id} pilar={p} onAbrir={() => setAbrioDefinicion(true)} />)}
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
            <Suspense fallback={<SkeletonCard lines={3} />}>
              <JairoGuillermoConsult companies={companies} isSimpleView={true} initialTicker={company.ticker} />
            </Suspense>
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
