import React, { useState } from 'react';
import { InvestmentThesis, Badge, LearningStep, LeagueCompetitor, GamificationState } from '../types';
import { useViewMode } from '../context/ViewModeContext';
import {
  Award,
  Video,
  ShieldCheck,
  Target,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { MoatGame } from './gamification/MoatGame';
import { MarginOfSafetyGame } from './gamification/MarginOfSafetyGame';
import { MarkowitzGame } from './gamification/MarkowitzGame';
import { BiasesGame } from './gamification/BiasesGame';
import { VideoLessonsSection } from './gamification/VideoLessonsSection';
import { ThesisFeed } from './gamification/ThesisFeed';

interface GamificationHubProps {
  gamificationState: GamificationState;
  theses: InvestmentThesis[];
  badges: Badge[];
  learningSteps: LearningStep[];
  league: LeagueCompetitor[];
  onUpvoteThesis: (id: string) => void;
  onCreateThesis: (thesis: Partial<InvestmentThesis>) => void;
  onCompleteLearningStep: (id: number) => void;
  onTriggerFeedbackDemo: () => void;
  onAddXP?: (amount: number) => void;
}

export const GamificationHub: React.FC<GamificationHubProps> = ({
  gamificationState,
  theses,
  badges,
  learningSteps,
  league,
  onUpvoteThesis,
  onCreateThesis,
  onCompleteLearningStep,
  onTriggerFeedbackDemo,
  onAddXP
}) => {
  const { mode: viewMode, flags } = useViewMode();

  // Selector principal del Hub: Juegos vs Videos
  const [hubSection, setHubSection] = useState<'games' | 'videos'>('games');

  // Selector de los 4 Juegos (filtrado por view mode)
  const availableGames = flags.availableGames;
  const [activeGame, setActiveGame] = useState<'moat' | 'mos' | 'markowitz' | 'biases'>(
    availableGames.includes('moat') ? 'moat' : 'mos'
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HUD de Cabecera: Gamificación, Juegos & Academia */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              {viewMode === 'simple'
                ? 'Aprende a Invertir Jugando: Moat y Margen de Seguridad'
                : 'Aprende a Invertir Jugando: Disciplina, Moat y Markowitz'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
              {viewMode === 'simple'
                ? 'Dos juegos esenciales para entender cómo Warren Buffett evalúa empresas y protege tu capital.'
                : 'Pon a prueba tus habilidades de inversión con simuladores interactivos, visualiza lecciones en video con principios de Warren Buffett y Charlie Munger, y debate tesis fundamentales en el foro.'
              }
            </p>
          </div>

          {/* Navegación: Juegos vs Videos */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-[var(--color-border)] shrink-0">
            <button
              onClick={() => setHubSection('games')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                hubSection === 'games'
                  ? 'bg-accent text-white shadow-[var(--shadow-card)]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Juegos Interactivos</span>
            </button>
            <button
              onClick={() => setHubSection('videos')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                hubSection === 'videos'
                  ? 'bg-accent text-white shadow-[var(--shadow-card)]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Academia de Videos</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN 1: LOS 4 JUEGOS INTERACTIVOS PARA APRENDER A INVERTIR */}
      {/* ------------------------------------------------------------- */}
      {hubSection === 'games' && (
        <div className="space-y-6">
          {/* Selector de Juego — filtrado por view mode */}
          <div className={`grid gap-3 ${availableGames.length === 2 ? 'grid-cols-2 lg:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {availableGames.includes('moat') && (
              <button
                onClick={() => setActiveGame('moat')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeGame === 'moat'
                    ? 'bg-accent text-white border-accent shadow-[var(--shadow-card)]'
                    : 'bg-slate-50 text-slate-500 border-[var(--color-border)] hover:text-slate-900 hover:bg-white'
                }`}
              >
                <div className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Juego 1
                </div>
                <h3 className="text-sm font-bold font-serif">¿Foso o trampa de valor?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                  Detecta si la empresa tiene un foso real o va a la quiebra.
                </p>
              </button>
            )}

            {availableGames.includes('mos') && (
              <button
                onClick={() => setActiveGame('mos')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeGame === 'mos'
                    ? 'bg-success text-white border-success shadow-[var(--shadow-card)]'
                    : 'bg-slate-50 text-slate-500 border-[var(--color-border)] hover:text-slate-900 hover:bg-white'
                }`}
              >
                <div className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5" /> Juego 2
                </div>
                <h3 className="text-sm font-bold font-serif">Margen de Seguridad</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                  Pon a prueba el criterio de Graham frente a Mr. Market.
                </p>
              </button>
            )}

            {availableGames.includes('markowitz') && (
              <button
                onClick={() => setActiveGame('markowitz')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeGame === 'markowitz'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-[var(--shadow-card)]'
                    : 'bg-slate-50 text-slate-500 border-[var(--color-border)] hover:text-slate-900 hover:bg-white'
                }`}
              >
                <div className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Juego 3
                </div>
                <h3 className="text-sm font-bold font-serif">El almuerzo gratis de la diversificación</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                  Optimiza covarianza y gana rentabilidad sin riesgo.
                </p>
              </button>
            )}

            {availableGames.includes('biases') && (
              <button
                onClick={() => setActiveGame('biases')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeGame === 'biases'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-[var(--shadow-card)]'
                    : 'bg-slate-50 text-slate-500 border-[var(--color-border)] hover:text-slate-900 hover:bg-white'
                }`}
              >
                <div className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Juego 4
                </div>
                <h3 className="text-sm font-bold font-serif">Detector de Sesgos</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                  Vence al FOMO, al coste hundido y al exceso de confianza.
                </p>
              </button>
            )}
          </div>

          {/* Subcomponentes de Juegos */}
          {activeGame === 'moat' && <MoatGame onAddXP={onAddXP} />}
          {activeGame === 'mos' && <MarginOfSafetyGame onAddXP={onAddXP} />}
          {activeGame === 'markowitz' && <MarkowitzGame onAddXP={onAddXP} />}
          {activeGame === 'biases' && <BiasesGame onAddXP={onAddXP} />}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN 2: ACADEMIA DE VIDEOS CON EXPLICACIÓN DE CONCEPTOS    */}
      {/* ------------------------------------------------------------- */}
      {hubSection === 'videos' && <VideoLessonsSection onAddXP={onAddXP} />}

      {/* ------------------------------------------------------------- */}
      {/* PARTE INFERIOR: EL FORO SOCIAL DE TESIS DE INVERSIÓN         */}
      {/* ------------------------------------------------------------- */}
      <ThesisFeed
        theses={theses}
        onUpvoteThesis={onUpvoteThesis}
        onCreateThesis={onCreateThesis}
        onAddXP={onAddXP}
      />
    </div>
  );
};
