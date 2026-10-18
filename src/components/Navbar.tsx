import React from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  HelpCircle,
  LineChart,
  Rocket,
  Scale,
  Search
} from 'lucide-react';
import { ViewMode } from '../types';
import { OPEN_HELP_EVENT } from './WarrenFAB';
import { ScrollRail } from './ui/ScrollRail';

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
        className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors ${
          compact ? 'py-2.5' : 'h-14'
        } ${
          isActive
            ? 'font-semibold text-slate-900'
            : 'font-medium text-slate-600 hover:text-slate-900'
        }`}
      >
        {compact && <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-slate-500'}`} />}
        <span>{isSimple && mod.simpleLabel ? mod.simpleLabel : mod.label}</span>
        {isActive && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-amber-700" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-papel/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Marca */}
          <button
            type="button"
            className="flex items-center gap-2.5 shrink-0 text-left rounded-md"
            onClick={() => setActiveTab('fundamental')}
            aria-label="El Rincón de Warren, ir al inicio"
          >
            <span className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center font-serif text-[19px] font-semibold text-amber-300 leading-none">
              W
            </span>
            <span className="font-serif text-[17px] font-semibold text-slate-900 hidden md:inline">
              El Rincón de Warren
            </span>
          </button>

          {/* Pestañas en la misma fila solo cuando caben todas */}
          <nav className="hidden xl:flex items-stretch -mb-px" aria-label="Secciones">
            {visibleModules.map(mod => renderTab(mod))}
          </nav>

          {/* Buscador único de empresas, en forma de píldora y siempre visible */}
          <div className="flex-1 min-w-0 flex xl:flex-none xl:order-none justify-center">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full max-w-[22rem] xl:w-64 flex items-center gap-2.5 h-10 pl-3.5 pr-2 rounded-full border border-slate-300 bg-white text-left text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors"
              title="Buscar una empresa (Ctrl K)"
              aria-label="Buscar una empresa"
              aria-haspopup="dialog"
            >
              <Search className="w-4 h-4 shrink-0 text-slate-700" />
              <span className="flex-1 min-w-0 truncate">
                <span className="sm:hidden">Buscar</span>
                <span className="hidden sm:inline">Busca una empresa</span>
              </span>
              <kbd className="hidden lg:inline font-sans text-xs text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">Ctrl K</kbd>
            </button>
          </div>

          {/* Controles: nunca se encogen, así el selector de modo no se corta */}
          <div className="flex items-center gap-2 shrink-0">

            {!isSimple && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_HELP_EVENT))}
                className="sm:hidden flex items-center justify-center w-9 h-9 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md"
                aria-label="Abrir preguntas frecuentes"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {showGamificationHUD && !isSimple && (
              <div
                className="hidden 2xl:flex items-center gap-2 h-9 px-2.5 text-sm text-slate-600"
                title={`Motivación estimada: ${motivationIndex}%`}
              >
                <Award className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-slate-900">Nivel {userLevel}</span>
                <span className="tabular">{userXP} XP</span>
              </div>
            )}

            {/* Selector de modo */}
            <div
              role="radiogroup"
              aria-label="Modo de vista"
              className="flex items-center h-9 p-0.5 rounded-md bg-slate-100 border border-slate-200"
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
                    className={`h-full px-3 rounded text-sm transition-colors ${
                      active
                        ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                        : 'text-slate-600 font-medium hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pestañas en segunda fila (móvil, tableta y portátil estrecho) */}
        <ScrollRail
          label="Secciones"
          activeKey={`${activeTab}-${viewMode}`}
          className="xl:hidden -mx-4 sm:-mx-6 border-t border-slate-200"
          innerClassName="px-2 sm:px-4"
        >
          {visibleModules.map(mod => renderTab(mod, true))}
        </ScrollRail>
      </div>
    </header>
  );
};
