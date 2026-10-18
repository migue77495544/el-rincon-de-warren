import React, { useEffect, useRef, useState } from 'react';
import { Check, Flame, PlayCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Leccion } from '../../data/rutaAprendizaje';
import { EjercicioActual, Resultado, titularEjercicio } from './Ejercicios';
import { VideoEmbed } from './VideoEmbed';

const XP_ACIERTO = 10;
const XP_LECCION = 20;
const XP_PERFECTA = 10;

interface Props {
  leccion: Leccion;
  numero: number;
  /** Racha actual (cabecera) */
  racha: number;
  /** Racha que tendrá al terminar hoy (pantalla final) */
  rachaAlTerminar: number;
  onSalir: () => void;
  onTerminar: (r: { xp: number; perfecta: boolean }) => void;
}

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const LeccionPlayer: React.FC<Props> = ({ leccion, numero, racha, rachaAlTerminar, onSalir, onTerminar }) => {
  const total = leccion.ejercicios.length;
  const [fase, setFase] = useState<'idea' | 'practica' | 'fin'>('idea');
  const [cola, setCola] = useState<number[]>(() => leccion.ejercicios.map((_, i) => i));
  const [aciertos, setAciertos] = useState<Set<number>>(new Set());
  const [primerIntentoOk, setPrimerIntentoOk] = useState(0);
  const [fallados, setFallados] = useState<Set<number>>(new Set());
  const [listo, setListo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [intento, setIntento] = useState(0);
  const [verVideo, setVerVideo] = useState(false);
  const comprobar = useRef<() => Resultado>(() => ({ correcto: false }));
  const resumen = useRef<{ xp: number; perfecta: boolean } | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const actual = cola[0];
  const ejercicio = actual !== undefined ? leccion.ejercicios[actual] : null;

  useEffect(() => { contenedor.current?.scrollTo({ top: 0 }); }, [actual, fase, intento]);

  const pulsarComprobar = () => {
    if (!listo || resultado || actual === undefined) return;
    const r = comprobar.current();
    setResultado(r);
    if (r.correcto) {
      setAciertos(prev => new Set(prev).add(actual));
      if (!fallados.has(actual)) setPrimerIntentoOk(n => n + 1);
    } else {
      setFallados(prev => new Set(prev).add(actual));
    }
  };

  const continuar = () => {
    if (!resultado || actual === undefined) return;
    // Lo que se falla vuelve al final de la cola, como en Duolingo
    const resto = cola.slice(1);
    const nuevaCola = resultado.correcto ? resto : [...resto, actual];
    setResultado(null);
    setListo(false);
    setIntento(i => i + 1);
    if (nuevaCola.length === 0) {
      const perfecta = fallados.size === 0;
      const xp = primerIntentoOk * XP_ACIERTO + XP_LECCION + (perfecta ? XP_PERFECTA : 0);
      resumen.current = { xp, perfecta };
      setFase('fin');
      if (!movimientoReducido()) confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ['#7C5617', '#1F6D46', '#CDA040'] });
    }
    setCola(nuevaCola);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    // Sin esto, el mismo Enter activaría también el botón «Continuar» que recibe el foco
    e.preventDefault();
    if (resultado) continuar();
    else pulsarComprobar();
  };

  const progreso = fase === 'fin' ? 100 : (aciertos.size / total) * 100;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-white flex flex-col" role="dialog" aria-modal="true" aria-label={`Lección: ${leccion.titulo}`} onKeyDown={onKeyDown}>
      {/* Cabecera: salir y barra de progreso */}
      <div className="shrink-0 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button type="button" onClick={onSalir} className="w-10 h-10 -ml-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center" aria-label="Salir de la lección">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso)} aria-label="Progreso de la lección">
            <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-out" style={{ width: `${progreso}%` }} />
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-800 tabular" title="Días seguidos aprendiendo">
            <Flame className="w-4 h-4" aria-hidden="true" />{racha}
            <span className="sr-only"> días seguidos</span>
          </span>
        </div>
      </div>

      <div ref={contenedor} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          {fase === 'idea' && (
            <article className="space-y-6">
              <div>
                <p className="m-0 text-sm font-medium text-amber-800">Lección {numero} · {leccion.minutos} min</p>
                <h1 className="mt-1 mb-0 font-serif text-[28px] sm:text-[34px] leading-tight font-semibold text-slate-900">{leccion.titulo}</h1>
                <p className="mt-2 mb-0 text-[15px] text-slate-600">Al terminar sabrás: {leccion.objetivo.charAt(0).toLowerCase() + leccion.objetivo.slice(1)}</p>
              </div>
              <div className="space-y-3">
                {leccion.idea.map(p => <p key={p} className="m-0 text-[17px] leading-relaxed text-slate-800">{p}</p>)}
              </div>
              {leccion.ejemplo && (
                <p className="m-0 p-4 rounded-xl bg-amber-50 border border-amber-200 text-[15px] leading-relaxed text-slate-800">
                  <span className="font-semibold text-amber-900">Ejemplo. </span>{leccion.ejemplo}
                </p>
              )}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <button type="button" onClick={() => setVerVideo(v => !v)} aria-expanded={verVideo}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <PlayCircle className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">¿Prefieres verlo en video? {leccion.video.duracion}</span>
                    <span className="block text-sm text-slate-600 truncate">{leccion.video.titulo} · {leccion.video.canal}</span>
                  </span>
                </button>
                {verVideo && <div className="border-t border-slate-200"><VideoEmbed video={leccion.video} autoplay /></div>}
              </div>
              <p className="m-0 text-sm text-slate-600">{total} ejercicios cortos. Si fallas, te enseñamos la respuesta y lo repasas al final.</p>
            </article>
          )}

          {fase === 'practica' && ejercicio && (
            <section key={`${actual}-${intento}`} aria-labelledby="enunciado" className="space-y-5">
              {fallados.has(actual) && !resultado && (
                <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-amber-800">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> Repaso: inténtalo otra vez
                </p>
              )}
              <h2 id="enunciado" className="m-0 font-serif text-[22px] sm:text-[26px] leading-snug font-semibold text-slate-900">
                {titularEjercicio(ejercicio)}
              </h2>
              <EjercicioActual
                ejercicio={ejercicio}
                bloqueado={Boolean(resultado)}
                onListo={setListo}
                registrarComprobacion={fn => { comprobar.current = fn; }}
              />
            </section>
          )}

          {fase === 'fin' && resumen.current && (
            <section className="text-center space-y-6 py-6" aria-live="polite">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-700" aria-hidden="true" />
              </div>
              <div>
                <h2 className="m-0 font-serif text-[30px] font-semibold text-slate-900">¡Lección completada!</h2>
                <p className="mt-2 mb-0 text-[15px] text-slate-600">{leccion.titulo}</p>
              </div>
              <dl className="m-0 grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="p-3 rounded-xl border border-slate-200">
                  <dt className="text-xs text-slate-600">XP ganados</dt>
                  <dd className="m-0 cifra text-2xl text-amber-800">+{resumen.current.xp}</dd>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <dt className="text-xs text-slate-600">Aciertos</dt>
                  <dd className="m-0 cifra text-2xl text-emerald-800">{Math.round((primerIntentoOk / total) * 100)} %</dd>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <dt className="text-xs text-slate-600">Racha</dt>
                  <dd className="m-0 cifra text-2xl text-slate-900">{rachaAlTerminar} {rachaAlTerminar === 1 ? 'día' : 'días'}</dd>
                </div>
              </dl>
              {resumen.current.perfecta && (
                <p className="m-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm font-medium text-amber-900">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Sin un solo fallo
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Pie: comprobar / corrección / continuar */}
      <div className={`shrink-0 border-t ${resultado ? (resultado.correcto ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') : 'bg-white border-slate-100'}`}>
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          {resultado && ejercicio && (
            <div className="flex-1 min-w-0" role="status" aria-live="polite">
              <p className={`m-0 font-semibold text-[17px] ${resultado.correcto ? 'text-emerald-800' : 'text-amber-900'}`}>
                {resultado.correcto ? '¡Bien hecho!' : 'Casi. Lo repasamos al final.'}
              </p>
              {!resultado.correcto && resultado.respuestaCorrecta && (
                <p className="mt-1 mb-0 text-sm text-slate-800"><span className="font-semibold">Respuesta: </span>{resultado.respuestaCorrecta}</p>
              )}
              <p className="mt-1 mb-0 text-sm text-slate-700 leading-relaxed">{ejercicio.explicacion}</p>
            </div>
          )}
          {fase === 'idea' && (
            <button type="button" onClick={() => setFase('practica')} className="sm:ml-auto h-12 px-8 rounded-full bg-amber-700 text-white font-semibold hover:bg-amber-800">
              Empezar a practicar
            </button>
          )}
          {fase === 'practica' && !resultado && (
            <button type="button" onClick={pulsarComprobar} disabled={!listo}
              className="sm:ml-auto h-12 px-8 rounded-full bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-500">
              Comprobar
            </button>
          )}
          {fase === 'practica' && resultado && (
            <button type="button" onClick={continuar} autoFocus
              className={`sm:ml-auto shrink-0 h-12 px-8 rounded-full text-white font-semibold ${resultado.correcto ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-700 hover:bg-amber-800'}`}>
              Continuar
            </button>
          )}
          {fase === 'fin' && resumen.current && (
            <button type="button" onClick={() => onTerminar(resumen.current!)} autoFocus className="sm:ml-auto h-12 px-8 rounded-full bg-amber-700 text-white font-semibold hover:bg-amber-800">
              Seguir con la ruta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
