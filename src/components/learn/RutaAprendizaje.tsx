import React, { useState } from 'react';
import { Award, Check, Flame, Lock, Star, Trophy, X } from 'lucide-react';
import { NODOS, NodoRuta, RUTA, TODAS_LAS_LECCIONES, Unidad } from '../../data/rutaAprendizaje';
import {
  Progreso,
  calcularLogros,
  completarNodo,
  desbloqueado,
  guardarProgreso,
  leerProgreso,
  rachaConActividadHoy,
  siguienteNodo
} from '../../utils/progresoAprendizaje';
import { LeccionPlayer } from './LeccionPlayer';
import { MoatGame } from '../gamification/MoatGame';
import { MarginOfSafetyGame } from '../gamification/MarginOfSafetyGame';
import { MarkowitzGame } from '../gamification/MarkowitzGame';
import { BiasesGame } from '../gamification/BiasesGame';

const XP_RETO = 50;

// Desplazamiento horizontal de los nodos para dibujar un camino sinuoso
const ZIGZAG = [0, 40, 64, 40, 0, -40, -64, -40];

interface Props {
  onAddXP?: (xp: number) => void;
}

export const RutaAprendizaje: React.FC<Props> = ({ onAddXP }) => {
  const [progreso, setProgreso] = useState<Progreso>(() => leerProgreso());
  const [abierto, setAbierto] = useState<NodoRuta | null>(null);
  const [avisoBloqueo, setAvisoBloqueo] = useState<string | null>(null);

  const actualizar = (p: Progreso) => {
    setProgreso(p);
    guardarProgreso(p);
  };

  const siguiente = siguienteNodo(progreso);
  const leccionesHechas = TODAS_LAS_LECCIONES.filter(l => progreso.completados.includes(l.id)).length;
  const logros = calcularLogros(progreso);
  const conseguidos = logros.filter(l => l.actual >= l.meta);
  const enCurso = logros.filter(l => l.actual < l.meta);

  const abrir = (n: NodoRuta) => {
    if (!desbloqueado(progreso, n.id)) {
      setAvisoBloqueo(n.id);
      return;
    }
    setAvisoBloqueo(null);
    setAbierto(n);
  };

  const numeroLeccion = (id: string) => TODAS_LAS_LECCIONES.findIndex(l => l.id === id) + 1;

  const nodo = (n: NodoRuta, i: number) => {
    const hecho = progreso.completados.includes(n.id);
    const esActual = siguiente?.id === n.id;
    const libre = desbloqueado(progreso, n.id);
    const esReto = n.tipo === 'reto';
    const titulo = n.tipo === 'leccion' ? n.leccion.titulo : n.unidad.reto!.titulo;
    const estado = hecho ? 'completado' : esActual ? 'siguiente' : libre ? 'disponible' : 'bloqueado';

    const circulo = hecho
      ? 'bg-emerald-600 border-emerald-700 text-white'
      : esActual
        ? 'bg-amber-700 border-amber-800 text-white ring-4 ring-amber-200'
        : libre
          ? 'bg-white border-amber-700 text-amber-800'
          : 'bg-slate-100 border-slate-200 text-slate-400';

    return (
      <li key={n.id} className="flex flex-col items-center" style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length]}px)` }}>
        {esActual && (
          <span className="mb-2 px-3 py-1 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-amber-800 shadow-sm">
            {leccionesHechas === 0 && n.tipo === 'leccion' && numeroLeccion(n.id) === 1 ? 'Empieza aquí' : 'Siguiente'}
          </span>
        )}
        <button
          type="button"
          onClick={() => abrir(n)}
          aria-label={`${esReto ? 'Reto' : `Lección ${numeroLeccion(n.id)}`}: ${titulo}. ${estado}`}
          className={`relative w-[72px] h-[72px] rounded-full border-b-4 flex items-center justify-center transition-transform active:translate-y-0.5 ${circulo} ${libre ? 'hover:brightness-105' : 'cursor-not-allowed'}`}
        >
          {hecho ? <Check className="w-8 h-8" strokeWidth={3} aria-hidden="true" />
            : !libre ? <Lock className="w-6 h-6" aria-hidden="true" />
            : esReto ? <Trophy className="w-7 h-7" aria-hidden="true" />
            : <span className="cifra text-2xl" aria-hidden="true">{numeroLeccion(n.id)}</span>}
        </button>
        <span className={`mt-2 max-w-[11rem] text-center text-sm leading-snug ${libre ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
          {titulo}
        </span>
        {avisoBloqueo === n.id && (
          <span role="status" className="mt-1 text-xs text-slate-600 text-center max-w-[12rem]">Termina la anterior para desbloquearla.</span>
        )}
      </li>
    );
  };

  const unidad = (u: Unidad) => {
    const nodos = NODOS.filter(n => n.unidad.id === u.id);
    const hechos = nodos.filter(n => progreso.completados.includes(n.id)).length;
    const completa = hechos === nodos.length;
    const inicio = NODOS.findIndex(n => n.unidad.id === u.id);
    return (
      <section key={u.id} aria-labelledby={`unidad-${u.id}`} className="space-y-6">
        <header className={`rounded-2xl px-5 py-4 border ${completa ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-medium text-amber-800">Unidad {u.numero}</p>
              <h2 id={`unidad-${u.id}`} className="m-0 mt-0.5 font-serif text-xl font-semibold text-slate-900">{u.titulo}</h2>
              <p className="mt-1 mb-0 text-sm text-slate-600">{u.descripcion}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular ${completa ? 'text-emerald-800' : 'text-slate-600'}`}>{hechos}/{nodos.length}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${(hechos / nodos.length) * 100}%` }} />
          </div>
        </header>
        <ol className="m-0 p-0 list-none flex flex-col items-center gap-6 py-2">
          {nodos.map((n, k) => nodo(n, inicio + k))}
        </ol>
      </section>
    );
  };

  const terminarLeccion = (n: NodoRuta, r: { xp: number; perfecta: boolean }) => {
    const ya = progreso.completados.includes(n.id);
    // Repetir una lección da la mitad de XP: anima a repasar sin inflar puntos
    const xp = ya ? Math.round(r.xp / 2) : r.xp;
    actualizar(completarNodo(progreso, n.id, xp, r.perfecta));
    onAddXP?.(xp);
    setAbierto(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-10 min-w-0">
        {/* Resumen y siguiente paso */}
        <section aria-label="Tu progreso" className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2" title="Días seguidos aprendiendo">
              <Flame className={`w-6 h-6 ${progreso.racha > 0 ? 'text-amber-600' : 'text-slate-300'}`} aria-hidden="true" />
              <span className="cifra text-2xl text-slate-900">{progreso.racha}</span>
              <span className="text-sm text-slate-600">{progreso.racha === 1 ? 'día seguido' : 'días seguidos'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" aria-hidden="true" />
              <span className="cifra text-2xl text-slate-900">{progreso.xp}</span>
              <span className="text-sm text-slate-600">XP</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-6 h-6 text-emerald-700" aria-hidden="true" />
              <span className="cifra text-2xl text-slate-900">{leccionesHechas}</span>
              <span className="text-sm text-slate-600">de {TODAS_LAS_LECCIONES.length} lecciones</span>
            </div>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-label="Progreso de la ruta"
            aria-valuemin={0} aria-valuemax={TODAS_LAS_LECCIONES.length} aria-valuenow={leccionesHechas}>
            <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-700" style={{ width: `${(leccionesHechas / TODAS_LAS_LECCIONES.length) * 100}%` }} />
          </div>
          {siguiente ? (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="m-0 text-[15px] text-slate-700">
                {leccionesHechas === 0 ? 'Empieza por aquí: ' : 'Siguiente: '}
                <span className="font-semibold text-slate-900">{siguiente.tipo === 'leccion' ? siguiente.leccion.titulo : siguiente.unidad.reto!.titulo}</span>
                {siguiente.tipo === 'leccion' && <span className="text-slate-500"> · {siguiente.leccion.minutos} min</span>}
              </p>
              <button type="button" onClick={() => abrir(siguiente)} className="shrink-0 h-11 px-6 rounded-full bg-amber-700 text-white font-semibold hover:bg-amber-800">
                {leccionesHechas === 0 ? 'Empezar' : 'Continuar'}
              </button>
            </div>
          ) : (
            <p className="mt-5 mb-0 text-[15px] font-medium text-emerald-800">Completaste toda la ruta. Repasa cualquier lección cuando quieras.</p>
          )}
        </section>

        {RUTA.map(unidad)}
      </div>

      {/* Logros */}
      <aside aria-labelledby="logros-titulo" className="lg:sticky lg:top-24 self-start rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
        <h2 id="logros-titulo" className="m-0 font-serif text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-700" aria-hidden="true" /> Logros
          <span className="ml-auto text-sm font-normal text-slate-600 tabular">{conseguidos.length}/{logros.length}</span>
        </h2>
        <ul className="m-0 p-0 list-none space-y-3">
          {[...conseguidos, ...enCurso].map(l => {
            const ok = l.actual >= l.meta;
            return (
              <li key={l.id} className="flex items-center gap-3">
                <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${ok ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'}`} aria-hidden="true">
                  {ok ? <Trophy className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${ok ? 'text-slate-900' : 'text-slate-700'}`}>{l.titulo}</span>
                  <span className="block text-xs text-slate-600">{l.descripcion}</span>
                  {!ok && l.meta > 1 && (
                    <span className="mt-1 flex items-center gap-2">
                      <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-amber-500" style={{ width: `${(l.actual / l.meta) * 100}%` }} />
                      </span>
                      <span className="text-xs text-slate-600 tabular">{l.actual}/{l.meta}</span>
                    </span>
                  )}
                </span>
                {ok && <span className="sr-only">Conseguido</span>}
              </li>
            );
          })}
        </ul>
      </aside>

      {abierto?.tipo === 'leccion' && (
        <LeccionPlayer
          leccion={abierto.leccion}
          numero={numeroLeccion(abierto.id)}
          racha={progreso.racha}
          rachaAlTerminar={rachaConActividadHoy(progreso)}
          onSalir={() => setAbierto(null)}
          onTerminar={r => terminarLeccion(abierto, r)}
        />
      )}

      {abierto?.tipo === 'reto' && (
        <Reto
          unidad={abierto.unidad}
          yaSuperado={progreso.completados.includes(abierto.id)}
          onSalir={() => setAbierto(null)}
          onXP={xp => onAddXP?.(xp)}
          onSuperar={() => {
            if (!progreso.completados.includes(abierto.id)) {
              actualizar(completarNodo(progreso, abierto.id, XP_RETO));
              onAddXP?.(XP_RETO);
            }
          }}
        />
      )}
    </div>
  );
};

/* ───────────── Reto: un juego completo al final de la unidad ───────────── */
const Reto: React.FC<{
  unidad: Unidad;
  yaSuperado: boolean;
  onSalir: () => void;
  onXP: (xp: number) => void;
  onSuperar: () => void;
}> = ({ unidad, yaSuperado, onSalir, onXP, onSuperar }) => {
  const reto = unidad.reto!;
  const [aciertos, setAciertos] = useState(0);
  const superado = yaSuperado || aciertos >= reto.aciertosNecesarios;

  // Los juegos dan XP en cada acierto: así se cuentan sin tocar su lógica
  const alAcertar = (xp: number) => {
    onXP(xp);
    const n = aciertos + 1;
    setAciertos(n);
    if (n >= reto.aciertosNecesarios) onSuperar();
  };

  const Juego = { moat: MoatGame, mos: MarginOfSafetyGame, markowitz: MarkowitzGame, biases: BiasesGame }[reto.juego];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-papel flex flex-col" role="dialog" aria-modal="true" aria-label={reto.titulo}>
      <div className="shrink-0 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button type="button" onClick={onSalir} className="w-10 h-10 -ml-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center" aria-label="Volver a la ruta">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-semibold text-slate-900 truncate">{reto.titulo}</p>
            <p className="m-0 text-xs text-slate-600 truncate">{reto.descripcion}</p>
          </div>
          <span className={`shrink-0 text-sm font-semibold tabular ${superado ? 'text-emerald-800' : 'text-slate-700'}`} aria-live="polite">
            {superado ? 'Superado' : `Aciertos ${aciertos}/${reto.aciertosNecesarios}`}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {superado && (
            <div role="status" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="m-0 font-semibold text-emerald-800">¡Reto superado! Puedes seguir jugando o volver a la ruta.</p>
              <button type="button" onClick={onSalir} className="h-10 px-5 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">Volver a la ruta</button>
            </div>
          )}
          <Juego onAddXP={alAcertar} />
        </div>
      </div>
    </div>
  );
};
