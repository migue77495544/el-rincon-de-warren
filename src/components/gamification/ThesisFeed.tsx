import React, { useState } from 'react';
import { InvestmentThesis } from '../../types';
import { MessageSquare, Plus, ThumbsUp, MessageSquareShare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { InfoTooltip } from '../SmartTooltip';

interface ThesisFeedProps {
  theses: InvestmentThesis[];
  onUpvoteThesis: (id: string) => void;
  onCreateThesis: (thesis: Partial<InvestmentThesis>) => void;
  onAddXP?: (amount: number) => void;
}

export const ThesisFeed: React.FC<ThesisFeedProps> = ({
  theses,
  onUpvoteThesis,
  onCreateThesis,
  onAddXP
}) => {
  const [showThesisModal, setShowThesisModal] = useState(false);
  const [newThesisForm, setNewThesisForm] = useState({
    ticker: 'BRK.B',
    title: '',
    content: '',
    moatAnalysis: '',
    upsideTarget: 15,
    recommendedHorizonYears: 5
  });

  const handleCreateThesisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThesisForm.title || !newThesisForm.content) return;

    onCreateThesis({
      ticker: newThesisForm.ticker,
      title: newThesisForm.title,
      content: newThesisForm.content,
      moatAnalysis: newThesisForm.moatAnalysis,
      upsideTarget: newThesisForm.upsideTarget,
      recommendedHorizonYears: newThesisForm.recommendedHorizonYears
    });

    if (onAddXP) onAddXP(200);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    setShowThesisModal(false);
    setNewThesisForm({
      ticker: 'BRK.B',
      title: '',
      content: '',
      moatAnalysis: '',
      upsideTarget: 15,
      recommendedHorizonYears: 5
    });
  };

  return (
    <div className="border-t border-slate-800 pt-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-3xl border border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <MessageSquare className="w-5 h-5 text-slate-400" />
            Foro Social de Tesis de Inversión y Comunidad
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparte tus análisis fundamentales (Bottom-Up), evalúa los fosos de las empresas y delibera colectivamente con otros inversores disciplinados.
          </p>
        </div>
        <button
          onClick={() => setShowThesisModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all shrink-0 shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Mi Tesis (+200 XP)</span>
        </button>
      </div>

      {/* Lista de Tesis de Inversión */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {theses.map(t => (
          <div
            key={t.id}
            className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3.5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.author}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {t.author}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {t.createdAt}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {t.ticker}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100 font-serif">
                {t.title}
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t.content}
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <span className="font-semibold text-slate-300 text-[11px] flex items-center">
                  Foso Defensivo (Economic Moat):
                  <InfoTooltip concept="foso" />
                </span>
                <p className="text-slate-400 text-[11px]">
                  {t.moatAnalysis}
                </p>
                <div className="flex justify-between items-center pt-2 mt-1 text-[10px] text-slate-400 border-t border-slate-800/60 font-mono">
                  <span className="flex items-center">
                    Margen de Seguridad:
                    <InfoTooltip concept="margenSeguridad" />
                    <strong className="text-emerald-400 ml-1">{t.upsideTarget}%</strong>
                  </span>
                  <span>Horizonte: <strong className="text-white">{t.recommendedHorizonYears} años</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {t.badges.map((b, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {b}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpvoteThesis(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all active:scale-95"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{t.upvotes}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Publicar Nueva Tesis */}
      {showThesisModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-serif">
                <MessageSquareShare className="w-4 h-4 text-slate-400" />
                Publicar Tesis de Inversión Fundamental
              </h3>
              <button
                onClick={() => setShowThesisModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThesisSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Ticker / Empresa</label>
                <select
                  value={newThesisForm.ticker}
                  onChange={e => setNewThesisForm({ ...newThesisForm, ticker: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                >
                  <option value="BRK.B">BRK.B - Berkshire Hathaway</option>
                  <option value="KO">KO - The Coca-Cola Company</option>
                  <option value="AAPL">AAPL - Apple Inc.</option>
                  <option value="JNJ">JNJ - Johnson & Johnson</option>
                  <option value="COST">COST - Costco Wholesale</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Título de la Tesis</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Por qué el foso de Coca-Cola resistirá la inflación..."
                  value={newThesisForm.title}
                  onChange={e => setNewThesisForm({ ...newThesisForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Argumento Fundamental (Bottom-Up)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla balances, cobertura de intereses, ROE y catalizadores..."
                  value={newThesisForm.content}
                  onChange={e => setNewThesisForm({ ...newThesisForm, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Análisis de Foso Competitivo (Economic Moat)</label>
                <input
                  type="text"
                  placeholder="ej: Marca global imbatible + poder de fijación de precios"
                  value={newThesisForm.moatAnalysis}
                  onChange={e => setNewThesisForm({ ...newThesisForm, moatAnalysis: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Margen de Seguridad Deseado (%)</label>
                  <input
                    type="number"
                    value={newThesisForm.upsideTarget}
                    onChange={e => setNewThesisForm({ ...newThesisForm, upsideTarget: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Horizonte Mínimo (Años)</label>
                  <input
                    type="number"
                    value={newThesisForm.recommendedHorizonYears}
                    onChange={e => setNewThesisForm({ ...newThesisForm, recommendedHorizonYears: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowThesisModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition-all active:scale-95"
                >
                  Publicar y Ganar 200 XP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
