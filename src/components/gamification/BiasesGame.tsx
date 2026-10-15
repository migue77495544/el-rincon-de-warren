import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BIAS_GAME_CASES } from '../../data/gamificationData';

interface BiasesGameProps {
  onAddXP?: (amount: number) => void;
}

export const BiasesGame: React.FC<BiasesGameProps> = ({ onAddXP }) => {
  const [biasIndex, setBiasIndex] = useState(0);
  const [biasScore, setBiasScore] = useState(0);
  const [biasAnswered, setBiasAnswered] = useState<boolean>(false);
  const [biasSelectedOption, setBiasSelectedOption] = useState<number | null>(null);

  const currentBiasCase = BIAS_GAME_CASES[biasIndex];

  const handleBiasAnswer = (idx: number, isCorrect: boolean) => {
    if (biasAnswered) return;
    setBiasSelectedOption(idx);
    setBiasAnswered(true);

    if (isCorrect) {
      setBiasScore(prev => prev + 1);
      if (onAddXP) onAddXP(60);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleNextBiasCase = () => {
    setBiasAnswered(false);
    setBiasSelectedOption(null);
    setBiasIndex(prev => (prev + 1) % BIAS_GAME_CASES.length);
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 sm:p-8 space-y-6">
      <div className="border-b border-[var(--color-border)] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-purple-600 uppercase">Juego 4 de 4</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 font-bold">
              Psicología del Inversor · Aciertos: {biasScore} / {BIAS_GAME_CASES.length}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-serif mt-1">
            Detector de Sesgos Conductuales del Inversor
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifica las trampas psicológicas que destruyen el patrimonio de los inversores minoristas.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500">Dilema {biasIndex + 1} de {BIAS_GAME_CASES.length}</span>
      </div>

      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
        <h4 className="text-lg font-bold text-white font-serif">{currentBiasCase.title}</h4>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-800">
          {currentBiasCase.scenario}
        </p>

        {/* Opciones */}
        <div className="space-y-2.5">
          {currentBiasCase.options.map((opt, idx) => {
            const isSelected = biasSelectedOption === idx;
            let btnStyle = 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800';
            if (biasAnswered) {
              if (opt.isCorrect) btnStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold';
              else if (isSelected) btnStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleBiasAnswer(idx, opt.isCorrect)}
                disabled={biasAnswered}
                className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
              >
                <span>{opt.label}</span>
                {biasAnswered && opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {biasAnswered && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-300">Explicación Conductual:</span>
              <button
                onClick={handleNextBiasCase}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs transition-all active:scale-95"
              >
                Siguiente Dilema →
              </button>
            </div>
            <p className="text-xs text-slate-300">{currentBiasCase.explanation}</p>
            <div className="pt-2 text-xs italic text-emerald-400">
              <strong>Antídoto de Warren:</strong> "{currentBiasCase.buffettCure}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
