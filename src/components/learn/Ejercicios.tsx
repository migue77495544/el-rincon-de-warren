import React, { useMemo, useState } from 'react';
import { Check, Lightbulb, RotateCcw } from 'lucide-react';
import { Ejercicio } from '../../data/rutaAprendizaje';

/** Cada ejercicio informa su resultado y la respuesta correcta en texto, para el panel de corrección */
export interface Resultado {
  correcto: boolean;
  respuestaCorrecta?: string;
}

interface Props<T extends Ejercicio['tipo']> {
  ejercicio: Extract<Ejercicio, { tipo: T }>;
  bloqueado: boolean;
  onListo: (listo: boolean) => void;
  /** El padre llama a esta función al pulsar «Comprobar» */
  registrarComprobacion: (fn: () => Resultado) => void;
}

const barajar = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Nunca se muestra ya resuelto
  if (a.length > 1 && a.every((x, i) => x === xs[i])) [a[0], a[1]] = [a[1], a[0]];
  return a;
};

const opcionCls = (seleccionada: boolean, bloqueado: boolean) =>
  `w-full text-left px-4 py-3.5 rounded-xl border-2 text-[15px] leading-snug transition-colors ${
    seleccionada ? 'border-amber-700 bg-amber-50 text-slate-900 font-medium' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
  } ${bloqueado ? 'cursor-default' : ''}`;

/* ───────────── Elegir una opción ───────────── */
export const EjEleccion: React.FC<Props<'eleccion'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const [sel, setSel] = useState<number | null>(null);
  registrarComprobacion(() => ({ correcto: sel === ejercicio.correcta, respuestaCorrecta: ejercicio.opciones[ejercicio.correcta] }));
  return (
    <div className="space-y-4">
      {ejercicio.contexto && <p className="m-0 text-[15px] text-slate-700">{ejercicio.contexto}</p>}
      <div role="radiogroup" aria-label={ejercicio.pregunta} className="grid gap-2.5">
        {ejercicio.opciones.map((op, i) => (
          <button key={i} type="button" role="radio" aria-checked={sel === i} disabled={bloqueado}
            onClick={() => { setSel(i); onListo(true); }} className={opcionCls(sel === i, bloqueado)}>
            {op}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ───────────── Verdadero o falso ───────────── */
export const EjVerdaderoFalso: React.FC<Props<'verdadero-falso'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const [sel, setSel] = useState<boolean | null>(null);
  registrarComprobacion(() => ({ correcto: sel === ejercicio.correcta, respuestaCorrecta: ejercicio.correcta ? 'Verdadero' : 'Falso' }));
  return (
    <div className="space-y-4">
      <blockquote className="m-0 px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 font-serif text-lg text-slate-900 leading-snug">
        «{ejercicio.afirmacion}»
      </blockquote>
      <div role="radiogroup" aria-label="¿Es verdadero o falso?" className="grid grid-cols-2 gap-2.5">
        {[true, false].map(v => (
          <button key={String(v)} type="button" role="radio" aria-checked={sel === v} disabled={bloqueado}
            onClick={() => { setSel(v); onListo(true); }} className={`${opcionCls(sel === v, bloqueado)} text-center font-semibold`}>
            {v ? 'Verdadero' : 'Falso'}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ───────────── Emparejar ───────────── */
export const EjEmparejar: React.FC<Props<'emparejar'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const derecha = useMemo(() => barajar(ejercicio.pares.map(p => p[1])), [ejercicio]);
  const [izq, setIzq] = useState<number | null>(null);
  const [hechos, setHechos] = useState<number[]>([]);
  const [fallos, setFallos] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  registrarComprobacion(() => ({ correcto: fallos === 0, respuestaCorrecta: ejercicio.pares.map(p => `${p[0]}: ${p[1]}`).join(' · ') }));

  const elegirDerecha = (texto: string) => {
    if (izq === null || bloqueado) return;
    if (ejercicio.pares[izq][1] === texto) {
      const nuevos = [...hechos, izq];
      setHechos(nuevos);
      setAviso(null);
      if (nuevos.length === ejercicio.pares.length) onListo(true);
    } else {
      setFallos(f => f + 1);
      setAviso(`«${ejercicio.pares[izq][0]}» no va con esa definición. Prueba otra.`);
    }
    setIzq(null);
  };

  const parCls = (activo: boolean, hecho: boolean) =>
    `w-full min-h-[52px] text-left px-3 py-2.5 rounded-xl border-2 text-sm leading-snug transition-colors ${
      hecho ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : activo ? 'border-amber-700 bg-amber-50 text-slate-900' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
    }`;

  return (
    <div className="space-y-3">
      <p className="m-0 text-sm text-slate-600">Toca un concepto y después su pareja.</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-2.5 content-start">
          {ejercicio.pares.map(([a], i) => (
            <button key={a} type="button" disabled={bloqueado || hechos.includes(i)} aria-pressed={izq === i}
              onClick={() => setIzq(i)} className={`${parCls(izq === i, hechos.includes(i))} font-semibold`}>
              {hechos.includes(i) && <Check className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />}
              {a}
            </button>
          ))}
        </div>
        <div className="grid gap-2.5 content-start">
          {derecha.map(b => {
            const hecho = hechos.some(i => ejercicio.pares[i][1] === b);
            return (
              <button key={b} type="button" disabled={bloqueado || hecho || izq === null} onClick={() => elegirDerecha(b)} className={parCls(false, hecho)}>
                {b}
              </button>
            );
          })}
        </div>
      </div>
      <p aria-live="polite" className="m-0 min-h-[20px] text-sm text-amber-900">{aviso}</p>
    </div>
  );
};

/* ───────────── Ordenar ───────────── */
export const EjOrdenar: React.FC<Props<'ordenar'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const banco = useMemo(() => barajar(ejercicio.elementos), [ejercicio]);
  const [orden, setOrden] = useState<string[]>([]);
  registrarComprobacion(() => ({
    correcto: orden.every((x, i) => x === ejercicio.elementos[i]),
    respuestaCorrecta: ejercicio.elementos.map((x, i) => `${i + 1}. ${x}`).join('  ')
  }));
  const poner = (x: string) => {
    const nuevo = [...orden, x];
    setOrden(nuevo);
    onListo(nuevo.length === ejercicio.elementos.length);
  };
  const quitar = (x: string) => {
    setOrden(orden.filter(o => o !== x));
    onListo(false);
  };
  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-slate-600">Toca los elementos en orden. Toca uno ya colocado para quitarlo.</p>
      <ol className="m-0 p-3 list-none rounded-xl border-2 border-dashed border-slate-300 min-h-[64px] grid gap-2" aria-label="Tu orden">
        {orden.length === 0 && <li className="text-sm text-slate-500 self-center text-center">Tu respuesta aparecerá aquí</li>}
        {orden.map((x, i) => (
          <li key={x}>
            <button type="button" disabled={bloqueado} onClick={() => quitar(x)}
              className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-sm text-slate-900">
              <span className="w-6 h-6 shrink-0 rounded-full bg-amber-700 text-white text-xs font-semibold flex items-center justify-center">{i + 1}</span>
              {x}
            </button>
          </li>
        ))}
      </ol>
      <div className="grid gap-2">
        {banco.filter(x => !orden.includes(x)).map(x => (
          <button key={x} type="button" disabled={bloqueado} onClick={() => poner(x)} className={opcionCls(false, bloqueado)}>{x}</button>
        ))}
      </div>
    </div>
  );
};

/* ───────────── Clasificar en dos grupos ───────────── */
export const EjClasificar: React.FC<Props<'clasificar'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const elementos = useMemo(() => barajar(ejercicio.elementos), [ejercicio]);
  const [asignado, setAsignado] = useState<Record<string, 0 | 1>>({});
  registrarComprobacion(() => ({
    correcto: elementos.every(e => asignado[e.texto] === e.grupo),
    respuestaCorrecta: ejercicio.grupos.map((g, gi) => `${g}: ${ejercicio.elementos.filter(e => e.grupo === gi).map(e => e.texto).join('; ')}`).join(' — ')
  }));
  const asignar = (texto: string, g: 0 | 1) => {
    const nuevo = { ...asignado, [texto]: g };
    setAsignado(nuevo);
    onListo(Object.keys(nuevo).length === elementos.length);
  };
  return (
    <ul className="m-0 p-0 list-none grid gap-2.5">
      {elementos.map(e => (
        <li key={e.texto} className="p-3 rounded-xl border border-slate-200 bg-white">
          <p className="m-0 mb-2.5 text-[15px] text-slate-900 leading-snug">{e.texto}</p>
          <div role="radiogroup" aria-label={e.texto} className="grid grid-cols-2 gap-2">
            {ejercicio.grupos.map((g, gi) => {
              const sel = asignado[e.texto] === gi;
              return (
                <button key={g} type="button" role="radio" aria-checked={sel} disabled={bloqueado} onClick={() => asignar(e.texto, gi as 0 | 1)}
                  className={`h-10 px-2 rounded-lg border-2 text-sm font-medium transition-colors ${sel ? 'border-amber-700 bg-amber-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                  {g}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
};

/* ───────────── Deslizador ───────────── */
export const EjDeslizador: React.FC<Props<'deslizador'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const [valor, setValor] = useState(ejercicio.inicial);
  const fmt = (v: number) => `${ejercicio.prefijo ?? ''}${v.toLocaleString('es-ES')}${ejercicio.sufijo ?? ''}`;
  registrarComprobacion(() => ({
    correcto: valor >= ejercicio.objetivo.desde && valor <= ejercicio.objetivo.hasta,
    respuestaCorrecta: `entre ${fmt(ejercicio.objetivo.desde)} y ${fmt(ejercicio.objetivo.hasta)}`
  }));
  const frac = (v: number) => ((v - ejercicio.min) / (ejercicio.max - ejercicio.min)) * 100;
  return (
    <div className="space-y-5">
      <p className="m-0 text-[15px] text-slate-700">{ejercicio.contexto}</p>
      <p className="m-0 text-center cifra text-4xl text-slate-900" aria-live="polite">{fmt(valor)}</p>
      <div className="relative pt-2">
        <input
          type="range"
          min={ejercicio.min}
          max={ejercicio.max}
          step={ejercicio.paso}
          value={valor}
          disabled={bloqueado}
          aria-label={ejercicio.pregunta}
          aria-valuetext={fmt(valor)}
          onChange={e => { setValor(Number(e.target.value)); onListo(true); }}
          className="w-full accent-amber-700 h-2"
        />
        {bloqueado && (
          <span className="absolute top-0 h-1.5 rounded-full bg-emerald-500/40 pointer-events-none" aria-hidden="true"
            style={{ left: `${frac(ejercicio.objetivo.desde)}%`, width: `${frac(ejercicio.objetivo.hasta) - frac(ejercicio.objetivo.desde)}%` }} />
        )}
        <div className="flex justify-between text-xs text-slate-500 mt-1" aria-hidden="true">
          <span>{fmt(ejercicio.min)}</span><span>{fmt(ejercicio.max)}</span>
        </div>
      </div>
    </div>
  );
};

/* ───────────── Calcular ───────────── */
export const EjCalcular: React.FC<Props<'calcular'>> = ({ ejercicio, bloqueado, onListo, registrarComprobacion }) => {
  const [texto, setTexto] = useState('');
  const [pista, setPista] = useState(false);
  // Admite coma o punto decimal y separadores de miles con punto («1.210»)
  const leer = (s: string) => {
    const limpio = s.replace(/[$%\s]/g, '');
    const normal = /^\d{1,3}(\.\d{3})+$/.test(limpio) ? limpio.replace(/\./g, '') : limpio.replace(',', '.');
    return Number(normal);
  };
  const fmt = (v: number) => `${v.toLocaleString('es-ES')}${ejercicio.sufijo ? ` ${ejercicio.sufijo}` : ''}`;
  registrarComprobacion(() => ({
    correcto: Math.abs(leer(texto) - ejercicio.respuesta) <= ejercicio.tolerancia,
    respuestaCorrecta: fmt(ejercicio.respuesta)
  }));
  return (
    <div className="space-y-4">
      <ul className="m-0 p-4 list-none rounded-xl bg-slate-50 border border-slate-200 grid gap-1.5">
        {ejercicio.datos.map(d => <li key={d} className="text-[15px] text-slate-800">{d}</li>)}
      </ul>
      <label className="block">
        <span className="block mb-1.5 text-sm font-medium text-slate-700">Tu resultado{ejercicio.sufijo ? ` (${ejercicio.sufijo})` : ''}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          disabled={bloqueado}
          onChange={e => { setTexto(e.target.value); onListo(e.target.value.trim() !== '' && Number.isFinite(leer(e.target.value))); }}
          className="w-full h-12 px-4 rounded-xl border-2 border-slate-300 text-lg tabular text-slate-900 focus:border-amber-700"
          placeholder="Escribe un número"
        />
      </label>
      {!bloqueado && (
        pista ? (
          <p className="m-0 flex gap-2 text-sm text-slate-700"><Lightbulb className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" aria-hidden="true" />{ejercicio.pista}</p>
        ) : (
          <button type="button" onClick={() => setPista(true)} className="flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-900">
            <Lightbulb className="w-4 h-4" aria-hidden="true" /> Ver una pista
          </button>
        )
      )}
    </div>
  );
};

export const EjercicioActual: React.FC<{
  ejercicio: Ejercicio;
  bloqueado: boolean;
  onListo: (listo: boolean) => void;
  registrarComprobacion: (fn: () => Resultado) => void;
}> = props => {
  const { ejercicio } = props;
  switch (ejercicio.tipo) {
    case 'eleccion': return <EjEleccion {...props} ejercicio={ejercicio} />;
    case 'verdadero-falso': return <EjVerdaderoFalso {...props} ejercicio={ejercicio} />;
    case 'emparejar': return <EjEmparejar {...props} ejercicio={ejercicio} />;
    case 'ordenar': return <EjOrdenar {...props} ejercicio={ejercicio} />;
    case 'clasificar': return <EjClasificar {...props} ejercicio={ejercicio} />;
    case 'deslizador': return <EjDeslizador {...props} ejercicio={ejercicio} />;
    case 'calcular': return <EjCalcular {...props} ejercicio={ejercicio} />;
  }
};

export const titularEjercicio = (e: Ejercicio): string =>
  e.tipo === 'verdadero-falso' ? '¿Verdadero o falso?' : e.pregunta;

export const IconoReintento = RotateCcw;
