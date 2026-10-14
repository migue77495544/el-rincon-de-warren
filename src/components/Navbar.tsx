import React from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Layers,
  ShieldCheck,
  TrendingUp,
  Users,
  Search,
  Zap,
  Gauge,
  Rocket
} from 'lucide-react';
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
  onOpenPythonConsole?: () => void;
  showGamificationHUD?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userXP,
  userLevel,
  motivationIndex,
  viewMode,
  setViewMode,
  onOpenSearch,
  onOpenPythonConsole,
  showGamificationHUD = true,
}) => {
  const modules = [
    {
      id: 'fundamental' as const,
      label: 'Análisis',
      title: '1. Análisis Fundamental & Ratios',
      subtitle: 'Semáforos, balance, DuPont, cotización y fórmulas',
      icon: BarChart3,
      iconColor: 'text-accent',
      tag: 'Análisis de Empresas'
    },
    {
      id: 'opportunities' as const,
      label: 'Superoportunidades',
      title: 'Escáner de Superoportunidades',
      subtitle: 'Deep Value + catalizadores en el S&P 500',
      icon: Rocket,
      iconColor: 'text-emerald-600',
      tag: 'Solo Analista'
    },
    {
      id: 'simulator' as const,
      label: 'Simulador',
      title: '2. Simulador & Modelo de Markowitz',
      subtitle: 'Portafolio $100k, Frontera Eficiente y Sharpe',
      icon: TrendingUp,
      iconColor: 'text-blue-600',
      tag: 'Markowitz Nobel'
    },
    {
      id: 'gamification' as const,
      label: 'Aprender',
      title: '3. Gamificación & Academia',
      subtitle: 'Tesis colaborativas, medallas y ligas',
      icon: BookOpen,
      iconColor: 'text-purple-600',
      tag: 'Gamificación'
    },
    {
      id: 'impact' as const,
      label: 'Impacto',
      title: '4. Evaluación DiD',
      subtitle: 'Econometría de impacto y sobreoperativa',
      icon: ShieldCheck,
      iconColor: 'text-amber-600',
      tag: 'Econometría'
    },
    {
      id: 'methodology' as const,
      label: 'Métodos',
      title: '5. Documentación Técnica & Metodológica',
      subtitle: 'Fórmulas, Score S(a), Markowitz y Referencias APA',
      icon: BookOpen,
      iconColor: 'text-slate-600',
      tag: 'Investigación'
    }
  ];

  // En Modo Simple: ocultar Simulador, Evaluación DiD y el escáner de Superoportunidades
  const visibleModules = viewMode === 'simple'
    ? modules.filter(m => m.id !== 'simulator' && m.id !== 'impact' && m.id !== 'opportunities')
    : modules;

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0"
            onClick={() => setActiveTab('fundamental')}
          >
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-black text-lg tracking-tight transition-transform group-hover:scale-105">
              w
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900">
                  El Rincón de Warren
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  viewMode === 'simple'
                    ? 'bg-blue-50 text-accent border border-blue-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {viewMode === 'simple' ? 'Modo Simple' : 'Modo Analista'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block leading-tight font-medium">
                {viewMode === 'simple'
                  ? 'Aprende a invertir como Warren Buffett'
                  : 'Value Investing & Econometría Conductual'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center bg-slate-50 p-1 rounded-lg border border-[var(--color-border)]">
            {visibleModules.map(mod => {
              const Icon = mod.icon;
              const isActive = activeTab === mod.id;
              return (
                <button
                  key={mod.id}
                  id={`nav-${mod.id}`}
                  onClick={() => setActiveTab(mod.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold border border-[var(--color-border)]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? mod.iconColor : 'text-slate-400'}`} />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search Button */}
            <button
              onClick={onOpenSearch}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-[var(--color-border)] rounded-lg text-xs font-medium transition-all"
              title="Buscar empresas, conceptos o aplicaciones (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>

            {/* Python Console (Analyst mode only) */}
            {onOpenPythonConsole && viewMode === 'analyst' && (
              <button
                onClick={onOpenPythonConsole}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-[var(--color-border)] rounded-lg text-xs font-medium transition-all"
                title="Motor de Datos Cuantitativos con Python"
              >
                <span className="text-sm">🐍</span>
                <span className="font-semibold hidden md:inline">Python</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  pandas
                </span>
              </button>
            )}

            {/* ViewMode Toggle: Simple / Analista */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-[var(--color-border)]">
              <button
                id="toggle-simple"
                type="button"
                onClick={() => setViewMode('simple')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'simple'
                    ? 'bg-white text-blue-800 font-bold border border-blue-200 shadow-[var(--shadow-card)]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Modo Simple: vista simplificada sin pestañas de alta complejidad"
              >
                <Layers className={`w-3.5 h-3.5 ${
                  viewMode === 'simple' ? 'text-blue-600' : 'text-slate-400'
                }`} />
                <span className="hidden sm:inline">Simple</span>
              </button>
              <button
                id="toggle-analyst"
                type="button"
                onClick={() => setViewMode('analyst')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'analyst'
                    ? 'bg-white text-accent font-bold border border-blue-200 shadow-[var(--shadow-card)]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Modo Analista: acceso completo a todas las pestañas y herramientas cuantitativas"
              >
                <Gauge className={`w-3.5 h-3.5 ${
                  viewMode === 'analyst' ? 'text-accent' : 'text-slate-400'
                }`} />
                <span className="hidden sm:inline">Analista</span>
              </button>
            </div>

            {/* Gamification HUD (Analyst mode only) */}
            {showGamificationHUD && viewMode === 'analyst' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Nv. {userLevel}</span>
                    <span className="text-[10px] font-mono text-slate-500">{userXP} XP</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Motivación: <strong className="text-success font-bold">{motivationIndex}%</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Scroll Nav */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 gap-1.5 border-t border-[var(--color-border)] no-scrollbar">
          {visibleModules.map(mod => {
            const Icon = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 font-bold border border-[var(--color-border)]'
                    : 'bg-slate-50 text-slate-600 border border-[var(--color-border)] hover:bg-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? mod.iconColor : 'text-slate-400'}`} />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
