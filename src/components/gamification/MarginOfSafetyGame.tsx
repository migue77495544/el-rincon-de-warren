import React, { useState } from 'react';
import { Target, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MarginOfSafetyGameProps {
  onAddXP?: (amount: number) => void;
}

export const MarginOfSafetyGame: React.FC<MarginOfSafetyGameProps> = ({ onAddXP }) => {
  const [mosPrice, setMosPrice] = useState<number>(75);
  const consensusTarget = 100;
  const currentMosPercent = Math.round(((consensusTarget - mosPrice) / consensusTarget) * 100);
  const [mosSubmitted, setMosSubmitted] = useState<boolean>(false);
  const [mosResult, setMosResult] = useState<'win' | 'lose' | null>(null);

  const handleExecuteMosOrder = () => {
    setMosSubmitted(true);
    if (currentMosPercent >= 20) {
      setMosResult('win');
      if (onAddXP) onAddXP(75);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else {
      setMosResult('lose');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 sm:p-8 space-y-6">
      <div className="border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Juego 2 · Margen de Seguridad</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">
            Principio Fundamental de Benjamin Graham
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 font-serif mt-1">
          El desafío del consenso de analistas
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          El Precio Objetivo de consenso de analistas es de <strong>$100.00</strong>. Ajusta tu precio máximo de compra para asegurarte un descuento suficiente que te proteja ante caídas de Mr. Market.
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-500 block font-medium">Consenso de Analistas (Precio Objetivo)</span>
            <span className="text-2xl font-semibold text-white font-mono">$100.00</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-500 block font-medium">Tu Precio Límite de Entrada</span>
            <span className="text-2xl font-semibold text-white font-mono">${mosPrice}.00</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-500 block font-medium">Descuento vs Consenso</span>
            <span className={`text-2xl font-semibold font-mono ${currentMosPercent >= 20 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {currentMosPercent > 0 ? `${currentMosPercent}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Deslizador Interactivo de Precio */}
        <div className="space-y-2 p-4 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Mueve el precio al que estarías dispuesto a comprar:</span>
            <span className="font-mono font-bold text-white">${mosPrice} por acción</span>
          </div>
          <input
            type="range"
            min="40"
            max="110"
            step="1"
            value={mosPrice}
            onChange={e => {
              setMosPrice(Number(e.target.value));
              setMosSubmitted(false);
              setMosResult(null);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>$40 (60% Dto - Ganga)</span>
            <span>$75 (25% Dto - Graham)</span>
            <span>$100 (0% Dto)</span>
            <span>$110 (Sobreprecio)</span>
          </div>
        </div>

        {!mosSubmitted ? (
          <button
            onClick={handleExecuteMosOrder}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4" />
            <span>Lanzar Orden y Comprobar Precio vs Consenso</span>
          </button>
        ) : (
          <div className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-200 ${
            mosResult === 'win'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2 text-sm">
                {mosResult === 'win' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                {mosResult === 'win' ? '¡Disciplina de Warren Buffett Demostrada! (+75 XP)' : '¡Atención! Consenso sobrevalorado'}
              </span>
              <button
                onClick={() => { setMosSubmitted(false); setMosPrice(68); }}
                className="text-xs underline font-bold"
              >
                Intentar de Nuevo
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">
              {mosResult === 'win'
                ? `Compraste a $${mosPrice}, asegurando un ${currentMosPercent}% de descuento respecto al consenso de analistas (≥ 20%). Incluso si la empresa sufre una recesión inesperada del 20%, tu inversión principal está matemáticamente protegida.`
                : `Compraste a $${mosPrice} con solo un ${currentMosPercent}% de descuento. El consenso de analistas sitúa el precio objetivo cerca de tu entrada, reduciendo el colchón de protección ante imprevistos económicos.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
