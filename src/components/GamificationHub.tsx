import React, { useState } from 'react';
import { InvestmentThesis, Badge, LearningStep, LeagueCompetitor, GamificationState } from '../types';
import { Map as MapIcon, MessagesSquare, PlayCircle } from 'lucide-react';
import { RutaAprendizaje } from './learn/RutaAprendizaje';
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

type Seccion = 'ruta' | 'videos' | 'comunidad';

const SECCIONES: Array<{ id: Seccion; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'ruta', label: 'Tu ruta', icon: MapIcon },
  { id: 'videos', label: 'Videos', icon: PlayCircle },
  { id: 'comunidad', label: 'Comunidad', icon: MessagesSquare }
];

export const GamificationHub: React.FC<GamificationHubProps> = ({
  theses,
  onUpvoteThesis,
  onCreateThesis,
  onAddXP
}) => {
  const [seccion, setSeccion] = useState<Seccion>('ruta');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <h1 className="m-0 font-serif text-[28px] sm:text-[34px] leading-tight font-semibold text-slate-900">Aprende a invertir, paso a paso</h1>
          <p className="mt-2 mb-0 text-[15px] text-slate-600 max-w-[60ch] leading-relaxed">
            Lecciones de 3 a 5 minutos con ejercicios prácticos. Empieza por la primera: cada una desbloquea la siguiente.
          </p>
        </div>
        <div role="tablist" aria-label="Secciones de Aprender" className="w-full md:w-auto flex items-center p-1 rounded-full bg-slate-100 border border-slate-200">
          {SECCIONES.map(s => {
            const Icon = s.icon;
            const activa = seccion === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls={`panel-${s.id}`}
                onClick={() => setSeccion(s.id)}
                className={`flex-1 md:flex-none h-10 px-3 sm:px-4 rounded-full flex items-center justify-center gap-1.5 whitespace-nowrap text-sm transition-colors ${
                  activa ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-600 font-medium hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </div>
      </header>

      <div id={`panel-${seccion}`} role="tabpanel">
        {seccion === 'ruta' && <RutaAprendizaje onAddXP={onAddXP} />}
        {seccion === 'videos' && <VideoLessonsSection onAddXP={onAddXP} />}
        {seccion === 'comunidad' && (
          <ThesisFeed theses={theses} onUpvoteThesis={onUpvoteThesis} onCreateThesis={onCreateThesis} onAddXP={onAddXP} />
        )}
      </div>
    </div>
  );
};
