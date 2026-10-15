import React from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  LineChart,
  Rocket,
  Scale,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewMode } from '../types';

export type AppTab = 'fundamental' | 'opportunities' | 'simulator' | 'gamification' | 'impact' | 'methodology';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  userXP: number;
  userLevel: number;
  motivationIndex: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  showGamificationHUD?: boolean;
}

interface ModuleDef {
  id: AppTab;
  label: string;
  /** Nombre en Modo Simple, cuando difiere */
  simpleLabel?: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Visible también en Modo Simple */
  simple: boolean;
}

const MODULES: ModuleDef[] = [
  { id: 'fundamental', label: 'Análisis', simpleLabel: 'Empresas', descripcion: 'Ratios, balance, DuPont, cotización y valoración', icon: BarChart3, simple: true },
  { id: 'opportunities', label: 'Oportunidades', descripcion: 'Escáner Deep Value del S&P 500', icon: Rocket, simple: false },
  { id: 'simulator', label: 'Simulador', descripcion: 'Cartera de $100k y frontera eficiente de Markowitz', icon: LineChart, simple: false },
  { id: 'gamification', label: 'Aprender', descripcion: 'Juegos, lecciones, tesis y ligas', icon: GraduationCap, simple: true },
  { id: 'impact', label: 'Impacto', descripcion: 'Evaluación de impacto por diferencias en diferencias', icon: Scale, simple: false },
  { id: 'methodology', label: 'Metodología', simpleLabel: 'Cómo se calcula', descripcion: 'Fórmulas, Score S(a), Markowitz y referencias', icon: BookOpen, simple: true }
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userXP,
  userLevel,
  motivationIndex,
  viewMode,
  setViewMode,
  onOpenSearch,
  showGamificationHUD = true,
}) => {
  const isSimple = viewMode === 'simple';
  const visibleModules = isSimple ? MODULES.filter(m => m.simple) : MODULES;

  const renderTab = (mod: ModuleDef, compact = false) => {
    const Icon = mod.icon;
    const isActive = activeTab === mod.id;
    return (
      <button
        key={mod.id}
        id={compact ? undefined : `nav-${mod.id}`}
        type="button"
        onClick={() => setActiveTab(mod.id)}
        aria-current={isActive ? 'page' : undefined}
        title={mod.descripcion}
        className={`group relative flex items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] transition-colors ${
          compact ? 'py-2.5' : 'h-14'
        } ${
          isActive
            ? 'font-semibold text-slate-900'
            : 'font-medium text-slate-500 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
        <span>{isSimple && mod.simpleLabel ? mod.simpleLabel : mod.label}</span>
        {isActive && (
          <motion.span
            layoutId={compact ? 'nav-underline-compact' : 'nav-underline'}
            className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            aria-hidden="true"
          />
        )}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_4px_16px_-12px_rgb(27_35_30/0.25)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Marca */}
          <button
            type="button"
            className="flex items-center gap-2.5 shrink-0 text-left"
            onClick={() => setActiveTab('fundamental')}
            aria-label="El Rincón de Warren, ir al inicio"
          >
            <span className="w-8 h-8 rounded-lg ink-panel shadow-md transition-transform duration-300 hover:rotate-[-6deg] hover:scale-105 flex items-center justify-center font-serif text-[19px] font-semibold text-amber-300 leading-none">
              W
            </span>
            <span className="font-serif text-[17px] font-semibold text-slate-900 tracking-tight hidden sm:inline">
              El Rincón de Warren
            </span>
          </button>

          {/* Pestañas (escritorio) */}
          <nav className="hidden lg:flex items-stretch -mb-px" aria-label="Secciones">
            {visibleModules.map(mod => renderTab(mod))}
          </nav>

          {/* Controles */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              className="press flex items-center gap-2 h-8 px-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:shadow-sm border border-slate-200 rounded-lg text-xs font-medium"
              title="Buscar empresas, conceptos o secciones"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Buscar</span>
              <kbd className="hidden xl:inline font-sans text-[10px] text-slate-400 border border-slate-200 rounded px-1">Ctrl K</kbd>
            </button>


            {showGamificationHUD && !isSimple && (
              <div
                className="hidden 2xl:flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                title={`Motivación estimada: ${motivationIndex}%`}
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-slate-900">Nivel {userLevel}</span>
                <span className="font-mono text-slate-500">{userXP} XP</span>
              </div>
            )}

            {/* Selector de modo */}
            <div
              role="radiogroup"
              aria-label="Modo de vista"
              className="flex items-center h-8 p-0.5 rounded-lg bg-slate-100 border border-slate-200"
            >
              {([
                { id: 'simple', label: 'Simple', title: 'Modo Simple: lo esencial de cada empresa, explicado' },
                { id: 'analyst', label: 'Analista', title: 'Modo Analista: todos los ratios, modelos y herramientas' }
              ] as const).map(opt => {
                const active = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={opt.id === 'simple' ? 'toggle-simple' : 'toggle-analyst'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setViewMode(opt.id)}
                    title={opt.title}
                    className={`relative h-full px-2.5 sm:px-3 rounded-md text-xs transition-colors ${
                      active
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-500 font-medium hover:text-slate-900'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="view-mode-pill"
                        className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-amber-200"
                        transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pestañas (móvil y tableta) */}
        <nav
          className="flex lg:hidden overflow-x-auto no-scrollbar -mx-4 px-2 sm:-mx-6 sm:px-4 border-t border-slate-100"
          aria-label="Secciones"
        >
          {visibleModules.map(mod => renderTab(mod, true))}
        </nav>
      </div>
    </header>
  );
};
