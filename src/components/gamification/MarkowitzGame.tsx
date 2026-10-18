import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MarkowitzGameProps {
  onAddXP?: (amount: number) => void;
}

export const MarkowitzGame: React.FC<MarkowitzGameProps> = ({ onAddXP }) => {
  const [weightDef, setWeightDef] = useState<number>(40);
  const [weightTech, setWeightTech] = useState<number>(35);
  const [weightHealth, setWeightHealth] = useState<number>(25);
  const [markowitzChallengePassed, setMarkowitzChallengePassed] = useState<boolean>(false);

  // Cálculos matemáticos del Juego 3 (Markowitz)
  const totalW = weightDef + weightTech + weightHealth || 100;
  const w1 = weightDef / totalW;
  const w2 = weightTech / totalW;
  const w3 = weightHealth / totalW;

  // Parámetros de activos
  const r1 = 0.09, s1 = 0.12; // Defensiva
  const r2 = 0.16, s2 = 0.23; // Tech
  const r3 = 0.10, s3 = 0.11; // Salud

  const rho12 = 0.22, rho13 = 0.28, rho23 = 0.18;
  const cov12 = rho12 * s1 * s2;
  const cov13 = rho13 * s1 * s3;
  const cov23 = rho23 * s2 * s3;

  const portReturn = (w1 * r1) + (w2 * r2) + (w3 * r3);
  const portVar = (w1 * w1 * s1 * s1) + (w2 * w2 * s2 * s2) + (w3 * w3 * s3 * s3) +
                  (2 * w1 * w2 * cov12) + (2 * w1 * w3 * cov13) + (2 * w2 * w3 * cov23);
  const portVol = Math.sqrt(Math.max(0.0001, portVar));
  const sharpeGame = (portReturn - 0.04) / portVol;
  const weightedVol = (w1 * s1) + (w2 * s2) + (w3 * s3);
  const freeLunchPercent = Math.max(0, ((weightedVol - portVol) / weightedVol) * 100);

  const checkMarkowitzSuccess = () => {
    if (freeLunchPercent >= 22 && sharpeGame >= 1.25) {
      setMarkowitzChallengePassed(true);
      if (onAddXP) onAddXP(100);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 sm:p-8 space-y-6">
      <div className="border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-600">Juego 3 de 4</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 font-bold">
            Harry Markowitz (Premio Nobel)
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 font-serif mt-1">
          Diversificar: el único almuerzo gratis
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Mueve las proporciones de los 3 activos para lograr la magia de la descorrelación: <strong>eliminar al menos un 20% del riesgo</strong> mediante covarianza y conseguir un <strong>Sharpe Ratio ≥ 1.25</strong>.
        </p>
      </div>

      {/* Indicadores en Vivo del Laboratorio */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
          <span className="text-xs text-slate-500 block font-medium">Retorno Esperado E(Rp)</span>
          <span className="text-lg font-semibold text-white font-mono">{(portReturn * 100).toFixed(1)}%</span>
        </div>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
          <span className="text-xs text-slate-500 block font-medium">Volatilidad Total σ_p</span>
          <span className="text-lg font-semibold text-blue-400 font-mono">{(portVol * 100).toFixed(1)}%</span>
        </div>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
          <span className="text-xs text-slate-500 block font-medium">Ratio de Sharpe</span>
          <span className={`text-lg font-semibold font-mono ${sharpeGame >= 1.25 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {sharpeGame.toFixed(2)}
          </span>
        </div>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
          <span className="text-xs text-slate-500 block font-medium">Almuerzo Gratis</span>
          <span className={`text-lg font-semibold font-mono ${freeLunchPercent >= 20 ? 'text-emerald-400' : 'text-purple-400'}`}>
            -{freeLunchPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Deslizadores de los 3 Activos */}
      <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-bold">1. Consumo Básico Defensivo (KO) - σ: 12%</span>
            <span className="font-mono text-white font-bold">{Math.round(w1 * 100)}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            value={weightDef}
            onChange={e => setWeightDef(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg accent-slate-400 cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-bold">2. Tecnología de Alto Crecimiento (AAPL) - σ: 23%</span>
            <span className="font-mono text-white font-bold">{Math.round(w2 * 100)}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            value={weightTech}
            onChange={e => setWeightTech(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg accent-slate-400 cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-bold">3. Salud y Farma Defensiva (JNJ) - σ: 11%</span>
            <span className="font-mono text-white font-bold">{Math.round(w3 * 100)}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            value={weightHealth}
            onChange={e => setWeightHealth(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg accent-slate-400 cursor-pointer"
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Objetivo: <strong>Almuerzo Gratis ≥ 20%</strong> y <strong>Sharpe ≥ 1.25</strong>
          </div>
          <button
            onClick={checkMarkowitzSuccess}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all shadow-md active:scale-95"
          >
            Verificar Asignación Cuantitativa
          </button>
        </div>

        {markowitzChallengePassed && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ¡Objetivo de Markowitz Completado! Has desbloqueado el Almuerzo Gratis (+100 XP).
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
