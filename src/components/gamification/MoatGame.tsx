import React, { useState } from 'react';
import { ShieldCheck, XCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MOAT_GAME_CASES } from '../../data/gamificationData';
import { InfoTooltip } from '../SmartTooltip';

interface MoatGameProps {
  onAddXP?: (amount: number) => void;
}

export const MoatGame: React.FC<MoatGameProps> = ({ onAddXP }) => {
  const [moatIndex, setMoatIndex] = useState(0);
  const [moatScore, setMoatScore] = useState(0);
  const [moatAnswered, setMoatAnswered] = useState<boolean>(false);
  const [moatIsCorrect, setMoatIsCorrect] = useState<boolean>(false);

  const currentMoatCase = MOAT_GAME_CASES[moatIndex];

  const handleMoatAnswer = (choice: 'moat' | 'trap' | 'average') => {
    if (moatAnswered) return;
    const correct = currentMoatCase.correctAnswer === choice;
    setMoatIsCorrect(correct);
    setMoatAnswered(true);

    if (correct) {
      setMoatScore(prev => prev + 1);
      if (onAddXP) onAddXP(50);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleNextMoatCase = () => {
    setMoatAnswered(false);
    setMoatIndex((prev) => (prev + 1) % MOAT_GAME_CASES.length);
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Juego 1 · Moat vs Trap</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
              Aciertos: {moatScore} / {MOAT_GAME_CASES.length}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            ¿Foso Económico o Trampa de Valor?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analiza la tarjeta fundamental de la compañía y toma tu decisión antes de que el mercado abra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Caso {moatIndex + 1} de {MOAT_GAME_CASES.length}</span>
        </div>
      </div>

      {/* Tarjeta de la Empresa del Caso */}
      <div className="bg-slate-50 p-6 rounded-xl border border-[var(--color-border)] space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-mono text-slate-500">{currentMoatCase.sector}</span>
            <h4 className="text-2xl font-black text-slate-900">{currentMoatCase.companyName}</h4>
            <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Ticker: {currentMoatCase.ticker}
            </span>
          </div>

          {/* 4 Ratios en Pantalla */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-white rounded-xl border border-[var(--color-border)]">
              <span className="text-[10px] text-slate-500 font-sans font-medium flex items-center">
                ROE
                <InfoTooltip concept="roe" />
              </span>
              <strong className={`text-base font-bold ${currentMoatCase.roe >= 15 ? 'text-success' : 'text-danger'}`}>
                {currentMoatCase.roe > 0 ? `+${currentMoatCase.roe}%` : `${currentMoatCase.roe}%`}
              </strong>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[var(--color-border)]">
              <span className="text-[10px] text-slate-500 block font-sans font-medium">Current Ratio</span>
              <strong className={`text-base font-bold ${currentMoatCase.currentRatio >= 1.2 ? 'text-success' : 'text-slate-400'}`}>
                {currentMoatCase.currentRatio}x
              </strong>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[var(--color-border)]">
              <span className="text-[10px] text-slate-500 block font-sans font-medium">Deuda / PN</span>
              <strong className={`text-base font-bold ${currentMoatCase.debtToEquity <= 1.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentMoatCase.debtToEquity}x
              </strong>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans font-medium">PER</span>
              <strong className="text-base font-bold text-white">
                {currentMoatCase.per > 0 ? `${currentMoatCase.per}x` : 'N/D (Pérdidas)'}
              </strong>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
          {currentMoatCase.description}
        </p>

        {/* Botones de Decisión */}
        {!moatAnswered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleMoatAnswer('moat')}
              className="p-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Foso Económico Sólido (Comprar)</span>
            </button>
            <button
              onClick={() => handleMoatAnswer('trap')}
              className="p-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Trampa de Valor / Especulativa (Huir)</span>
            </button>
          </div>
        ) : (
          <div className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-200 ${
            moatIsCorrect ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2 text-sm">
                {moatIsCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                {moatIsCorrect ? '¡Decisión Correcta! (+50 XP)' : 'Decisión Incorrecta'}
              </span>
              <button
                onClick={handleNextMoatCase}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs transition-all flex items-center gap-1 active:scale-95"
              >
                <span>Siguiente Caso</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">
              {currentMoatCase.explanation}
            </p>
            <div className="p-3 bg-slate-950/80 rounded-lg text-xs italic text-slate-300 border border-white/5">
              <strong>Cita de Warren:</strong> "{currentMoatCase.buffettWisdom}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
