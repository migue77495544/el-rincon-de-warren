import React, { useState, useEffect, useRef } from 'react';
import { CompanyAnalysis } from '../types';
import { useViewMode } from '../context/ViewModeContext';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Command,
  Compass,
  Database,
  HelpCircle,
  Lightbulb,
  PlusCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X
} from 'lucide-react';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyAnalysis[];
  onSelectCompany: (company: CompanyAnalysis) => void;
  onNavigateTab: (tab: 'fundamental' | 'simulator' | 'gamification' | 'impact' | 'schemas') => void;
  onSelectForSimulation: (ticker: string) => void;
  onOpenCustomCompanyModal?: () => void;
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  isOpen,
  onClose,
  companies,
  onSelectCompany,
  onNavigateTab,
  onSelectForSimulation,
  onOpenCustomCompanyModal
}) => {
  const { flags } = useViewMode();
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'apps' | 'companies' | 'heuristics'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search items definition — filtered by view mode
  const allApps = [
    {
      id: 'app-fundamental',
      title: '1. Motor & Visualizador Fundamental',
      subtitle: 'Visualizador de balance, DuPont, semáforos de liquidez, solvencia, rentabilidad y valoración',
      category: 'Visualizador & Módulo 1',
      icon: BarChart3,
      iconBg: 'bg-emerald-500',
      section: 'apps',
      action: () => {
        onNavigateTab('fundamental');
        onClose();
      }
    },
    {
      id: 'app-visualizer-dupont',
      title: 'Visualizador DuPont & Balance General',
      subtitle: 'Desglose visual de ROE = Margen Neto × Rotación × Apalancamiento y capital de trabajo',
      category: 'Visualizador Gráfico',
      icon: BarChart3,
      iconBg: 'bg-amber-500',
      section: 'apps',
      action: () => {
        onNavigateTab('fundamental');
        onClose();
      }
    },
    {
      id: 'app-simulator',
      title: '2. Simulador de Inversiones Conductual',
      subtitle: 'Práctica con $100,000, cálculo de Ratio de Sharpe y detección de sesgos',
      category: 'Simulador',
      icon: TrendingUp,
      iconBg: 'bg-blue-500',
      section: 'apps',
      action: () => {
        onNavigateTab('simulator');
        onClose();
      }
    },
    {
      id: 'app-gamification',
      title: '3. Aprender Jugando',
      subtitle: 'Juegos interactivos, tesis y academía de videos',
      category: 'Comunidad & Aprendizaje',
      icon: Users,
      iconBg: 'bg-purple-500',
      section: 'apps',
      action: () => {
        onNavigateTab('gamification');
        onClose();
      }
    },
    {
      id: 'app-did',
      title: '4. Evaluación de Impacto DiD (Admin)',
      subtitle: 'Econometría de Diferencias en Diferencias y reducción de sobreoperativa',
      category: 'Analítica',
      icon: ShieldCheck,
      iconBg: 'bg-amber-500',
      section: 'apps',
      action: () => {
        onNavigateTab('impact');
        onClose();
      }
    },
    {
      id: 'app-schemas',
      title: 'Visualizador de Esquemas SQL, NoSQL & Python',
      subtitle: 'DDL PostgreSQL, colecciones MongoDB y scripts ejecutables de scoring',
      category: 'Visualizador DB & Código',
      icon: Database,
      iconBg: 'bg-slate-600',
      section: 'apps',
      action: () => {
        onNavigateTab('schemas');
        onClose();
      }
    },
    {
      id: 'app-custom-calc',
      title: 'Calculadora de Empresa Personalizada',
      subtitle: 'Ingresa estados financieros para calcular los ratios y Score S(a)',
      category: 'Herramienta',
      icon: PlusCircle,
      iconBg: 'bg-teal-500',
      section: 'apps',
      action: () => {
        onNavigateTab('fundamental');
        if (onOpenCustomCompanyModal) onOpenCustomCompanyModal();
        onClose();
      }
    }
  ];

  // Filter apps by view mode
  const apps = flags.spotlightSections.includes('apps')
    ? allApps.filter(app => {
        // En modo simple: ocultar apps avanzadas
        if (app.id === 'app-did') return false; // Solo analyst
        if (app.id === 'app-schemas') return false; // Solo analyst
        return true;
      })
    : allApps;

  const heuristics = [
    {
      id: 'h-margin',
      title: 'Margen de Seguridad (Margin of Safety)',
      subtitle: 'Regla de Benjamin Graham: comprar con al menos 15-30% de descuento respecto al valor intrínseco',
      tag: 'Principio Rector',
      icon: ShieldCheck,
      action: () => {
        onNavigateTab('fundamental');
        onClose();
      }
    },
    {
      id: 'h-moat',
      title: 'Foso Económico (Economic Moat)',
      subtitle: 'Ventaja competitiva estructural: poder de fijación de precios, marcas fuertes o costes de cambio',
      tag: 'Cualitativo',
      icon: Sparkles,
      action: () => {
        onNavigateTab('fundamental');
        onClose();
      }
    },
    {
      id: 'h-overtrading',
      title: 'Evitar el Sesgo de Sobreoperativa (Overtrading)',
      subtitle: 'Warren Buffett: El mercado es un mecanismo para transferir dinero de los impacientes a los pacientes',
      tag: 'Conductual',
      icon: ShieldAlert,
      action: () => {
        onNavigateTab('simulator');
        onClose();
      }
    },
    {
      id: 'h-sharpe',
      title: 'Ratio de Sharpe (SR_p = (E(R) - Rf) / σ)',
      subtitle: 'Premia la consistencia y castiga la volatilidad de apuestas imprudentes',
      tag: 'Gestión de Riesgo',
      icon: Compass,
      action: () => {
        onNavigateTab('simulator');
        onClose();
      }
    }
  ];

  // Filtering
  const cleanQ = query.toLowerCase().trim();

  const filteredApps = apps.filter(
    a => !cleanQ || a.title.toLowerCase().includes(cleanQ) || a.subtitle.toLowerCase().includes(cleanQ) || a.category.toLowerCase().includes(cleanQ)
  );

  const filteredCompanies = companies.filter(
    c => !cleanQ || c.ticker.toLowerCase().includes(cleanQ) || c.nombre.toLowerCase().includes(cleanQ) || c.sector.toLowerCase().includes(cleanQ) || c.scoreGrade.toLowerCase().includes(cleanQ)
  );

  const filteredHeuristics = heuristics.filter(
    h => !cleanQ || h.title.toLowerCase().includes(cleanQ) || h.subtitle.toLowerCase().includes(cleanQ) || h.tag.toLowerCase().includes(cleanQ)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* iOS Spotlight Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50">
          <Search className="w-5 h-5 text-amber-600 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar aplicaciones, empresas (AAPL, KO...), heurísticas o acciones..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full bg-slate-200 text-slate-600 hover:text-slate-900 mr-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-xl bg-white text-slate-700 hover:text-slate-900 border border-slate-200 font-medium shadow-xs"
          >
            Esc
          </button>
        </div>

        {/* Category Pills (iOS Segmented Style) */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-200 bg-slate-50/50 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => setFilterCategory('apps')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterCategory === 'apps'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Aplicaciones ({filteredApps.length})
          </button>
          <button
            onClick={() => setFilterCategory('companies')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterCategory === 'companies'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Empresas & Tickers ({filteredCompanies.length})
          </button>
          <button
            onClick={() => setFilterCategory('heuristics')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterCategory === 'heuristics'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Heurísticas Value ({filteredHeuristics.length})
          </button>
        </div>

        {/* Search Results Container */}
        <div className="max-h-[62vh] overflow-y-auto p-3 space-y-4 text-xs no-scrollbar">
          {/* Section: Aplicaciones y Módulos */}
          {(filterCategory === 'all' || filterCategory === 'apps') && filteredApps.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block font-mono">
                Aplicaciones & Módulos
              </span>
              <div className="grid grid-cols-1 gap-1">
                {filteredApps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={app.action}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${app.iconBg} flex items-center justify-center text-white shadow-xs shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-amber-600 transition-colors">
                              {app.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {app.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {app.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Empresas & Tickers */}
          {(filterCategory === 'all' || filterCategory === 'companies') && filteredCompanies.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block font-mono">
                Empresas Cotizadas & Análisis Fundamental
              </span>
              <div className="grid grid-cols-1 gap-1">
                {filteredCompanies.map(comp => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-200"
                  >
                    <button
                      onClick={() => {
                        onSelectCompany(comp);
                        onNavigateTab('fundamental');
                        onClose();
                      }}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-amber-700 shrink-0 text-xs shadow-xs">
                        {comp.ticker.slice(0, 4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-amber-700 transition-colors font-mono">
                            {comp.ticker}
                          </span>
                          <span className="text-slate-600 font-medium text-xs">
                            {comp.nombre}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            comp.linearScore >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            comp.linearScore >= 60 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            Score: {comp.linearScore} ({comp.scoreGrade})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>Precio: <strong className="text-slate-900 font-mono">${comp.raw.precioCotizacion.toFixed(2)}</strong></span>
                          <span>Margen de Seg.: <strong className={comp.targetConsensus?.upside_potential > 0 ? 'text-emerald-700' : 'text-rose-700'}>{comp.targetConsensus ? `${comp.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(comp.targetConsensus.upside_potential * 10) / 10}%` : 'N/D'}</strong></span>
                          <span className="hidden sm:inline text-slate-400 truncate max-w-[220px]">Foso: {comp.moat}</span>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onSelectForSimulation(comp.ticker);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 border border-amber-200 transition-all shrink-0 ml-2 shadow-xs"
                    >
                      Simular
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Heurísticas & Principios de Warren */}
          {(filterCategory === 'all' || filterCategory === 'heuristics') && filteredHeuristics.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block font-mono">
                Heurísticas & Principios de Inversión
              </span>
              <div className="grid grid-cols-1 gap-1">
                {filteredHeuristics.map(h => {
                  const Icon = h.icon;
                  return (
                    <button
                      key={h.id}
                      onClick={h.action}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-amber-700 transition-colors">
                              {h.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {h.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {h.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredApps.length === 0 && filteredCompanies.length === 0 && filteredHeuristics.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600">
                No se encontraron resultados para "<span className="text-slate-900 font-semibold">{query}</span>".
              </p>
              <p className="text-[11px] text-slate-500">
                Prueba buscando "Apple", "Sharpe", "DiD", "Simulador" o "Margen".
              </p>
            </div>
          )}
        </div>

        {/* iOS Spotlight Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 shadow-xs">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 shadow-xs">K</kbd>
              para buscar en cualquier momento
            </span>
          </div>
          <span>Buscador Spotlight Estilo iOS</span>
        </div>
      </div>
    </div>
  );
};
