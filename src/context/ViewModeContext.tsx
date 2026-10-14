import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ViewMode = 'simple' | 'analyst';

export interface ViewModeFeatureFlags {
  /** Muestra fórmulas brutas y desglose matemático completo */
  showRawFormulas: boolean;
  /** Muestra simuladores interactivos ("¿Qué pasa si...?") */
  showSimulators: boolean;
  /** Muestra panel de auditoría de fidelidad contable */
  showAuditPanel: boolean;
  /** Filtros avanzados (dimensión, status, búsqueda) */
  showAdvancedFilters: boolean;
  /** Número máximo de ratios visibles en dashboard */
  maxRatiosVisible: number;
  /** Pestaña por defecto al entrar */
  defaultTab: 'fundamental' | 'simulator' | 'gamification';
  /** Mostrar consola Python en Navbar */
  showPythonConsole: boolean;
  /** Mostrar métricas de gamificación (XP, Level, Liga) en Navbar */
  showGamificationHUD: boolean;
  /** Qué juegos de gamificación están disponibles */
  availableGames: ('moat' | 'mos' | 'markowitz' | 'biases')[];
  /** Qué secciones de Spotlight están disponibles */
  spotlightSections: ('apps' | 'companies' | 'heuristics')[];
}

const SIMPLE_FLAGS: ViewModeFeatureFlags = {
  showRawFormulas: false,
  showSimulators: false,
  showAuditPanel: false,
  showAdvancedFilters: false,
  maxRatiosVisible: 4,
  defaultTab: 'fundamental',
  showPythonConsole: false,
  showGamificationHUD: false,
  availableGames: ['moat', 'mos'],
  spotlightSections: ['companies', 'heuristics'],
};

const ANALYST_FLAGS: ViewModeFeatureFlags = {
  showRawFormulas: true,
  showSimulators: true,
  showAuditPanel: true,
  showAdvancedFilters: true,
  maxRatiosVisible: 11,
  defaultTab: 'fundamental',
  showPythonConsole: true,
  showGamificationHUD: true,
  availableGames: ['moat', 'mos', 'markowitz', 'biases'],
  spotlightSections: ['apps', 'companies', 'heuristics'],
};

interface ViewModeContextValue {
  mode: ViewMode;
  flags: ViewModeFeatureFlags;
  toggleMode: () => void;
  setMode: (mode: ViewMode) => void;
  /** Para progressive disclosure: habilita features de analyst solo para una sección */
  enableAnalystForSection: (section: string) => void;
  disableAnalystForSection: (section: string) => void;
  isAnalystEnabledForSection: (section: string) => boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

const STORAGE_KEY = 'warren_view_mode';
const SECTION_OVERRIDE_KEY = 'warren_analyst_sections';

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'simple' || saved === 'analyst') return saved;
    } catch {}
    return 'simple'; // Default a Simple para onboarding
  });

  const [analystSections, setAnalystSections] = useState<Set<string>>(new Set());

  // Persistir modo
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  // Persistir secciones con override
  useEffect(() => {
    try {
      localStorage.setItem(SECTION_OVERRIDE_KEY, JSON.stringify([...analystSections]));
    } catch {}
  }, [analystSections]);

  // Cargar overrides guardados
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SECTION_OVERRIDE_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) setAnalystSections(new Set(arr));
      }
    } catch {}
  }, []);

  const flags = mode === 'simple' ? SIMPLE_FLAGS : ANALYST_FLAGS;

  const toggleMode = () => {
    setModeState(prev => prev === 'simple' ? 'analyst' : 'simple');
    // Limpiar overrides al cambiar modo global
    setAnalystSections(new Set());
  };

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    setAnalystSections(new Set());
  };

  const enableAnalystForSection = (section: string) => {
    setAnalystSections(prev => new Set([...prev, section]));
  };

  const disableAnalystForSection = (section: string) => {
    setAnalystSections(prev => {
      const next = new Set(prev);
      next.delete(section);
      return next;
    });
  };

  const isAnalystEnabledForSection = (section: string) => {
    return mode === 'analyst' || analystSections.has(section);
  };

  return (
    <ViewModeContext.Provider value={{
      mode,
      flags,
      toggleMode,
      setMode,
      enableAnalystForSection,
      disableAnalystForSection,
      isAnalystEnabledForSection,
    }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode debe usarse dentro de ViewModeProvider');
  return ctx;
}

/** Hook de conveniencia para feature flags directos */
export function useFeatureFlags() {
  const { flags, mode, isAnalystEnabledForSection } = useViewMode();
  return {
    ...flags,
    mode,
    isAnalyst: mode === 'analyst',
    isAnalystForSection: isAnalystEnabledForSection,
  };
}