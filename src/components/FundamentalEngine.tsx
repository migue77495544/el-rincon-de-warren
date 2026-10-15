import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CompanyAnalysis, FinancialRawData } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { useViewMode } from '../context/ViewModeContext';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  DollarSign,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  LineChart,
  Maximize2,
  MessagesSquare,
  PieChart,
  PlusCircle,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';
import { CompanyPriceChart } from './CompanyPriceChart';
import { VitalSigns } from './VitalSigns';
import { InfoTooltip } from './SmartTooltip';
import { SimpleViewMode, SkeletonCard } from './SimpleViewMode';
import { CustomCompanyModal, INITIAL_CUSTOM_FORM, CustomCompanyFormData } from './fundamental/CustomCompanyModal';
import { QuickInspectModal } from './fundamental/QuickInspectModal';
import { AnimatePresence, motion } from 'motion/react';
import { Reveal, StatusBadge } from './ui/Feedback';

// Paneles del modo Analista: se descargan solo cuando se muestran
const FinancialFormulasGuide = lazy(() => import('./FinancialFormulasGuide').then(m => ({ default: m.FinancialFormulasGuide })));
const RatiosDashboard = lazy(() => import('./RatiosDashboard').then(m => ({ default: m.RatiosDashboard })));
const WallStreetConsensus = lazy(() => import('./WallStreetConsensus').then(m => ({ default: m.WallStreetConsensus })));
const CapmValuationCard = lazy(() => import('./CapmValuationCard').then(m => ({ default: m.CapmValuationCard })));
const TrackingErrorCard = lazy(() => import('./TrackingErrorCard').then(m => ({ default: m.TrackingErrorCard })));
const RiskMetricsCard = lazy(() => import('./RiskMetricsCard').then(m => ({ default: m.RiskMetricsCard })));
const JairoGuillermoConsult = lazy(() => import('./JairoGuillermoConsult').then(m => ({ default: m.JairoGuillermoConsult })));
const BalanceSheetVisualizer = lazy(() => import('./fundamental/BalanceSheetVisualizer').then(m => ({ default: m.BalanceSheetVisualizer })));
const DimensionRatiosPanel = lazy(() => import('./fundamental/DimensionRatiosPanel').then(m => ({ default: m.DimensionRatiosPanel })));

type EngineView = 'dashboard' | 'semaphores' | 'visualizer' | 'chart' | 'valuation' | 'advisors' | 'formulas' | 'all';

interface AnalysisCategory {
  id: string;
  label: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string }>;
  views: { id: EngineView; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

// Categorías del análisis: agrupan las vistas existentes sin añadir estado nuevo.
// La categoría activa se deriva de engineViewMode.
const ANALYSIS_CATEGORIES: AnalysisCategory[] = [
  {
    id: 'metricas',
    label: 'Métricas clave',
    descripcion: 'Ratios y semáforos por dimensión',
    icon: LayoutDashboard,
    views: [
      { id: 'dashboard', label: 'Ratios', icon: LayoutDashboard },
      { id: 'semaphores', label: 'Semáforos', icon: Layers }
    ]
  },
  {
    id: 'estados',
    label: 'Estados financieros',
    descripcion: 'Balance, fondo de maniobra y DuPont',
    icon: BarChart3,
    views: [{ id: 'visualizer', label: 'Balance y DuPont', icon: BarChart3 }]
  },
  {
    id: 'valoracion',
    label: 'Valoración y riesgo',
    descripcion: 'Consenso, CAPM, tracking error, VaR y cotización',
    icon: Scale,
    views: [
      { id: 'valuation', label: 'Valoración y riesgo', icon: Scale },
      { id: 'chart', label: 'Cotización', icon: TrendingUp }
    ]
  },
  {
    id: 'asesores',
    label: 'Asesores IA',
    descripcion: 'Consulta a Jairo y Guillermo',
    icon: MessagesSquare,
    views: [{ id: 'advisors', label: 'Asesores', icon: MessagesSquare }]
  },
  {
    id: 'formulas',
    label: 'Fórmulas',
    descripcion: 'Guía de fórmulas y umbrales Value',
    icon: BookOpen,
    views: [{ id: 'formulas', label: 'Fórmulas', icon: BookOpen }]
  },
  {
    id: 'todo',
    label: 'Todo',
    descripcion: 'Todas las secciones en una sola página',
    icon: Eye,
    views: [{ id: 'all', label: 'Todo', icon: Eye }]
  }
];

// Rótulo de subsección dentro de una categoría
const SectionLabel: React.FC<{ icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 pt-1">
    <span className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-amber-700" />
    </span>
    <h3 className="m-0 text-[13px] font-semibold text-slate-700">{children}</h3>
    <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" aria-hidden="true" />
  </div>
);

interface FundamentalEngineProps {
  companies: CompanyAnalysis[];
  selectedCompany: CompanyAnalysis;
  onSelectCompany: (company: CompanyAnalysis) => void;
  onAddCustomCompany: (custom: CompanyAnalysis) => void;
  onSelectForSimulation: (ticker: string) => void;
  customModalOpen?: boolean;
  onCloseCustomModal?: () => void;
  onUpdateCompanies?: (companies: CompanyAnalysis[]) => void;
}

export const FundamentalEngine: React.FC<FundamentalEngineProps> = ({
  companies,
  selectedCompany,
  onSelectCompany,
  onAddCustomCompany,
  onSelectForSimulation,
  customModalOpen,
  onCloseCustomModal,
  onUpdateCompanies,
}) => {
  const { mode: viewMode, isAnalystEnabledForSection } = useViewMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'green' | 'margin' | 'moat' | 'speculative'>('all');
  const [engineViewMode, setEngineViewMode] = useState<'dashboard' | 'semaphores' | 'visualizer' | 'chart' | 'valuation' | 'advisors' | 'formulas' | 'all'>('dashboard');
  const [activeDimension, setActiveDimension] = useState<'all' | 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion'>('all');
  const [internalCustomModal, setInternalCustomModal] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'detail' | 'both'>('detail');
  const [showQuickInspectModal, setShowQuickInspectModal] = useState(false);
  const [isPriceChartExpanded, setIsPriceChartExpanded] = useState(true);

  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  // Sincronizar y asegurar visibilidad del análisis cuando cambia la empresa seleccionada
  useEffect(() => {
    if (selectedCompany) {
      if (mobileActiveTab === 'list') {
        setMobileActiveTab('detail');
      }
    }
  }, [selectedCompany?.id, selectedCompany?.ticker]);

  // Función robusta para abrir y visualizar empresas garantizando el cambio de vista y auto-scroll
  const handleSelectAndOpenCompany = (
    company: CompanyAnalysis,
    targetMode?: 'dashboard' | 'semaphores' | 'visualizer' | 'chart' | 'formulas' | 'all'
  ) => {
    setIsCompanyLoading(true);
    onSelectCompany(company);
    if (mobileActiveTab === 'list') {
      setMobileActiveTab('detail');
    }
    if (targetMode) {
      setEngineViewMode(targetMode);
    } else if (engineViewMode === 'formulas') {
      setEngineViewMode('dashboard');
    }
    setTimeout(() => {
      setIsCompanyLoading(false);
      const el = document.getElementById('company-detail-panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleSelectRatioForAnalysis = (ratioId: string, dimension?: string) => {
    setEngineViewMode('semaphores');
    setMobileActiveTab('detail');
    if (dimension && ['liquidez', 'solvencia', 'rentabilidad', 'valoracion'].includes(dimension)) {
      setActiveDimension(dimension as any);
    }
    setTimeout(() => {
      const el = document.getElementById('company-detail-panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const currentCompanyIndex = companies.findIndex(
    c => c.id === selectedCompany.id || c.ticker === selectedCompany.ticker
  );

  const handlePrevCompany = () => {
    if (companies.length <= 1) return;
    const prevIdx = (currentCompanyIndex - 1 + companies.length) % companies.length;
    handleSelectAndOpenCompany(companies[prevIdx]);
  };

  const handleNextCompany = () => {
    if (companies.length <= 1) return;
    const nextIdx = (currentCompanyIndex + 1) % companies.length;
    handleSelectAndOpenCompany(companies[nextIdx]);
  };

  // Real-time API state & Live search
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);

  // Tasa libre de riesgo real (FRED DGS10) para la cabecera del modo Analista
  const [tasaLibreRiesgo, setTasaLibreRiesgo] = useState<number | null>(null);
  useEffect(() => {
    fetchJson<{ riskFreeRate: number }>('/api/market/macro')
      .then(d => setTasaLibreRiesgo(d.riskFreeRate))
      .catch(() => setTasaLibreRiesgo(null));
  }, []);
  const [syncStatusBanner, setSyncStatusBanner] = useState<string | null>(null);
  const [importTickerInput, setImportTickerInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<Array<{
    ticker: string;
    nombre: string;
    sector: string;
    inCatalog: boolean;
    price?: number;
    source: string;
  }>>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Búsqueda inteligente en vivo conectada a la API al escribir
  useEffect(() => {
    const term = searchTerm.trim();
    // Tickers de una letra (V, F, T, C) son válidos: se busca desde el primer carácter
    if (!term) {
      setLiveSearchResults([]);
      setIsSearchingLive(false);
      return;
    }

    let cancelled = false;
    setIsSearchingLive(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchJson(`/api/market/search?q=${encodeURIComponent(term)}`, {}, 12000);
        // Ignorar respuestas de búsquedas anteriores que lleguen tarde
        if (!cancelled && data.success && Array.isArray(data.results)) {
          setLiveSearchResults(data.results);
        }
      } catch (err) {
        console.warn('Error en consulta de búsqueda bursátil:', err);
      } finally {
        if (!cancelled) setIsSearchingLive(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleSyncPrices = async () => {
    setIsSyncingPrices(true);
    setSyncStatusBanner(null);
    try {
      const data = await postJson('/api/market/sync-prices', {});
      if (data.success && Array.isArray(data.companies)) {
        if (onUpdateCompanies) {
          onUpdateCompanies(data.companies);
        }
        const updatedSelected = data.companies.find((c: any) => c.id === selectedCompany.id);
        if (updatedSelected) {
          onSelectCompany(updatedSelected);
        }
        setSyncStatusBanner(data.message || 'Cotizaciones sincronizadas en vivo con Wall Street.');
      } else {
        setSyncStatusBanner('Error al conectar con el feed de mercado.');
      }
    } catch (err: any) {
      setSyncStatusBanner(errorMessage(err, 'Error de red al sincronizar con el mercado en vivo.'));
    } finally {
      setIsSyncingPrices(false);
      setTimeout(() => setSyncStatusBanner(null), 7000);
    }
  };

  const handleImportTicker = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const query = (directQuery || importTickerInput || searchTerm).trim();
    if (!query) return;

    // Verificar si ya está en las empresas cargadas en el cliente
    const localMatch = companies.find(
      c => c.ticker.toUpperCase() === query.toUpperCase() ||
           (query.length > 2 && c.nombre.toLowerCase().includes(query.toLowerCase()))
    );
    if (localMatch && !directQuery) {
      handleSelectAndOpenCompany(localMatch);
      setSearchTerm('');
      setShowSearchDropdown(false);
      setSyncStatusBanner(`Mostrando ${localMatch.nombre} (${localMatch.ticker}) que ya está en tu catálogo.`);
      return;
    }

    setIsImporting(true);
    setSyncStatusBanner(null);
    setShowSearchDropdown(false);
    try {
      // El servidor puede tardar hasta 50 s en descargar los estados financieros de un ticker nuevo
      const data = await postJson('/api/market/import', { query, ticker: query }, 60000);
      if (data.success && data.company) {
        if (onAddCustomCompany) {
          onAddCustomCompany(data.company);
        }
        handleSelectAndOpenCompany(data.company);
        setImportTickerInput('');
        setSearchTerm('');
        setSyncStatusBanner(data.message || `¡${data.company.nombre} (${data.company.ticker}) cargada en vivo con éxito!`);
      } else {
        setSyncStatusBanner(`No se pudo obtener información en vivo para "${query}".`);
      }
    } catch (err: any) {
      setSyncStatusBanner(errorMessage(err, `No se pudo consultar "${query}" en vivo. Reintenta la búsqueda.`));
    } finally {
      setIsImporting(false);
      setTimeout(() => setSyncStatusBanner(null), 7000);
    }
  };

  // Enter en el buscador: ticker exacto del catálogo → ticker exacto sugerido en vivo →
  // primera coincidencia del catálogo → importación en vivo de lo escrito
  const handleSearchSubmit = () => {
    const term = searchTerm.trim();
    if (!term) return;
    const upper = term.toUpperCase();
    const openLocal = (company: CompanyAnalysis) => {
      handleSelectAndOpenCompany(company);
      setShowSearchDropdown(false);
    };

    const exactLocal = companies.find(c => c.ticker.toUpperCase() === upper);
    if (exactLocal) return openLocal(exactLocal);

    const exactLive = liveSearchResults.find(r => r.ticker.toUpperCase() === upper);
    if (exactLive) return handleImportTicker(undefined, exactLive.ticker);

    if (filteredCompanies.length > 0) return openLocal(filteredCompanies[0]);
    handleImportTicker(undefined, term);
  };

  const showCustomModal = customModalOpen !== undefined ? customModalOpen : internalCustomModal;
  const setShowCustomModal = (open: boolean) => {
    setInternalCustomModal(open);
    if (!open && onCloseCustomModal) onCloseCustomModal();
  };

  // Custom company form state
  const [customForm, setCustomForm] = useState<CustomCompanyFormData>(INITIAL_CUSTOM_FORM);

  const filteredCompanies = companies.filter(c => {
    const term = searchTerm.trim().toLowerCase();
    // Con 1-2 caracteres ("V", "MA") solo cuenta el inicio del ticker o del nombre:
    // "contiene" casaba con casi todo el catálogo y Enter abría una empresa equivocada
    const matchesSearch = term.length <= 2
      ? c.ticker.toLowerCase().startsWith(term) || c.nombre.toLowerCase().startsWith(term)
      : c.ticker.toLowerCase().includes(term) ||
        c.nombre.toLowerCase().includes(term) ||
        c.sector.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (qualityFilter === 'green') {
      return c.scoreGrade === 'A+' || c.scoreGrade === 'A';
    }
    if (qualityFilter === 'margin') {
      return c.targetConsensus?.upside_potential >= 10;
    }
    if (qualityFilter === 'moat') {
      return c.moat.toLowerCase().includes('alto') || c.moat.toLowerCase().includes('amplio') || c.moat.toLowerCase().includes('monopolio') || c.moat.toLowerCase().includes('marca');
    }
    if (qualityFilter === 'speculative') {
      return c.scoreGrade === 'F' || c.ticker === 'HYPE';
    }
    return true;
  });

  // Métricas calculadas para el Visualizador Gráfico Integral
  const raw = selectedCompany.raw;
  const totalActivos = Math.max(raw.activosTotales, 1);
  const activoCirculantePct = Math.min(100, Math.max(0, Math.round((raw.activoCirculante / totalActivos) * 100)));
  const activoNoCirculante = Math.max(0, raw.activosTotales - raw.activoCirculante);
  const activoNoCirculantePct = Math.min(100, Math.max(0, Math.round((activoNoCirculante / totalActivos) * 100)));

  const efectivoPct = Math.min(100, Math.max(0, Math.round((raw.efectivo / totalActivos) * 100)));
  const cuentasCobrarPct = Math.min(100, Math.max(0, Math.round((raw.cuentasPorCobrar / totalActivos) * 100)));
  const inventariosPct = Math.min(100, Math.max(0, Math.round((raw.inventarios / totalActivos) * 100)));

  const pasivoCirculantePct = Math.min(100, Math.max(0, Math.round((raw.pasivoCirculante / totalActivos) * 100)));
  const deudaLargoPlazo = Math.max(0, raw.totalPasivo - raw.pasivoCirculante);
  const deudaLargoPlazoPct = Math.min(100, Math.max(0, Math.round((deudaLargoPlazo / totalActivos) * 100)));
  const patrimonioNetoPct = Math.min(100, Math.max(0, Math.round((raw.patrimonioNeto / totalActivos) * 100)));

  const fondoManiobra = raw.activoCirculante - raw.pasivoCirculante;

  // Descomposición DuPont de ROE
  const margenNeto = raw.ingresosTotales > 0 ? (raw.utilidadNeta / raw.ingresosTotales) * 100 : 0;
  const rotacionActivos = raw.activosTotales > 0 ? raw.ingresosTotales / raw.activosTotales : 0;
  const multiplicadorApalancamiento = raw.patrimonioNeto > 0 ? raw.activosTotales / raw.patrimonioNeto : 1;
  const roeDuPont = (margenNeto / 100) * rotacionActivos * multiplicadorApalancamiento * 100;

  // Helper seguro para extraer status, valor formateado, explicación y heurística de cualquier ratio contable
  const getRatioData = (ratioKey: string) => {
    const rObj = (selectedCompany.ratios as any)?.[ratioKey];
    if (rObj && typeof rObj === 'object') {
      return {
        value: typeof rObj.value === 'number' ? rObj.value : 0,
        formatted: rObj.formatted || String(rObj.value ?? '-'),
        status: (rObj.status === 'green' || rObj.status === 'yellow' || rObj.status === 'red') ? rObj.status : ('green' as const),
        benchmark: rObj.benchmark || '',
        explanation: rObj.explanation || '',
        heuristicSimple: rObj.heuristicSimple || ''
      };
    }
    const num = typeof rObj === 'number' ? rObj : 0;
    return {
      value: num,
      formatted: num.toFixed(2),
      status: 'yellow' as const,
      benchmark: '',
      explanation: '',
      heuristicSimple: ''
    };
  };

  const getStatusBadge = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Saludable (Verde)
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Precaución (Atención)
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Peligro (Rojo)
          </span>
        );
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/companies/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm)
      });
      const data = await res.json();
      if (data.success) {
        const customComp: CompanyAnalysis = {
          id: `custom-${Date.now()}`,
          ticker: customForm.ticker.toUpperCase(),
          nombre: customForm.nombre,
          sector: customForm.sector,
          descripcion: 'Empresa analizada manualmente. Completa los datos contables del balance y la cuenta de resultados en la sección de abajo para generar el análisis de ratios y el scoring S(a).',
          moat: data.linearScore >= 75 ? 'Amplio' : data.linearScore >= 55 ? 'Medio' : 'Ninguno',
          raw: customForm,
          ratios: data.ratios,
          dimensiones: data.dimensiones,
          linearScore: data.linearScore,
          scoreGrade: data.scoreGrade,
          targetConsensus: {
            target_mean: Math.round(customForm.precioCotizacion * 1.15 * 10) / 10,
            target_high: Math.round(customForm.precioCotizacion * 1.25 * 10) / 10,
            target_low: Math.round(customForm.precioCotizacion * 1.05 * 10) / 10,
            recommendation: 'Mantener',
            number_of_analysts: 15,
            upside_potential: 15
          },
          warrenVerdict: data.linearScore >= 75 ? 'Excelente candidato para una cartera Value con disciplina.' : 'Requiere mayor margen de seguridad o reducir pasivos.'
        };
        onAddCustomCompany(customComp);
        handleSelectAndOpenCompany(customComp);
        setShowCustomModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simple Mode: Clean, minimal interface with only essential elements */}
      {viewMode === 'simple' && !isAnalystEnabledForSection('fundamental') ? (
        <div className="space-y-6">
          {/* Mobile / Tablet Segmented Control for Simple Mode */}
          <div className="flex lg:hidden items-center justify-between p-1 bg-slate-200/80 rounded-2xl border border-slate-200 gap-1">
            <button
              onClick={() => setMobileActiveTab('list')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileActiveTab === 'list'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Catálogo ({filteredCompanies.length})</span>
            </button>

            <button
              onClick={() => {
                setMobileActiveTab('detail');
                setTimeout(() => {
                  document.getElementById('company-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileActiveTab === 'detail'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Ficha de {selectedCompany.ticker}</span>
            </button>
          </div>

          {/* Live sync notification feedback in Simple Mode */}
          {syncStatusBanner && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusBanner}</span>
              </div>
              <button onClick={() => setSyncStatusBanner(null)} className="text-slate-400 hover:text-slate-700 text-xs" aria-label="Cerrar aviso">
                ✕
              </button>
            </div>
          )}

          {/* Grid: Stock Selector Column & Simple Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: List of Companies */}
            <div className={`lg:col-span-4 space-y-4 ${mobileActiveTab === 'list' || mobileActiveTab === 'both' ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <h2 className="m-0 font-serif text-lg font-semibold text-slate-900">
                      Empresas
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-2xs active:scale-95"
                    title="Añadir empresa calculando estados financieros"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="relative mb-3">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSearchSubmit();
                    }}
                    className="relative"
                  >
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar ticker (NVDA, TSLA) o empresa..."
                      value={searchTerm}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-16 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
                    />
                    <div className="absolute right-2.5 top-2 flex items-center gap-1">
                      {isSearchingLive && (
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin mr-1" />
                      )}
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setShowSearchDropdown(false);
                          }}
                          className="text-slate-400 hover:text-slate-700 text-xs p-1"
                          title="Limpiar búsqueda"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!searchTerm.trim() || isImporting}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Buscar o importar en vivo"
                      >
                        <Search className="w-3 h-3" />
                      </button>
                    </div>
                  </form>

                  {/* Dropdown flotante con resultados en vivo mientras se escribe */}
                  {showSearchDropdown && searchTerm.trim().length >= 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 max-h-72 overflow-y-auto no-scrollbar animate-fadeIn">
                      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100 text-[10px] text-slate-500 font-mono">
                        <span>Sugerencias de Mercado en Vivo</span>
                        {isSearchingLive ? (
                          <span className="text-slate-500 animate-pulse">Consultando Wall Street...</span>
                        ) : (
                          <span>Pulsa Enter para cargar</span>
                        )}
                      </div>

                      {liveSearchResults.length > 0 ? (
                        <div className="space-y-1">
                          {liveSearchResults.map(item => {
                            const local = companies.find(c => c.ticker === item.ticker);
                            return (
                              <div
                                key={item.ticker}
                                onClick={() => {
                                  if (local) {
                                    handleSelectAndOpenCompany(local);
                                    setSearchTerm('');
                                    setShowSearchDropdown(false);
                                  } else {
                                    handleImportTicker(undefined, item.ticker);
                                  }
                                }}
                                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-9 h-6 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-[11px] text-slate-800 flex items-center justify-center shrink-0">
                                    {item.ticker}
                                  </span>
                                  <div className="text-left truncate max-w-[140px]">
                                    <span className="text-xs font-semibold text-slate-900 block truncate">
                                      {item.nombre}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {item.sector}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  {local ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      En Cartera
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-transparent text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                                      + Cargar en Vivo
                                    </span>
                                  )}
                                  {item.price && (
                                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                      ${item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : !isSearchingLive ? (
                        <div className="p-3 text-center">
                          <p className="text-xs text-slate-700">
                            ¿Cargar <strong>"{searchTerm}"</strong> directamente desde Wall Street?
                          </p>
                          <button
                            onClick={() => handleImportTicker(undefined, searchTerm)}
                            disabled={isImporting}
                            className="mt-2 w-full py-1.5 px-3 rounded-xl bg-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-300 hover:border-slate-400 text-xs font-medium transition-all"
                          >
                            {isImporting ? 'Consultando...' : `Buscar "${searchTerm}" en Bolsa`}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Popular Ticker Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3.5 pb-1">
                  <span className="text-[10px] text-slate-500 font-medium mr-1 shrink-0">Populares:</span>
                  {['NVDA', 'MSFT', 'TSLA', 'GOOGL', 'META', 'AAPL', 'KO'].map(t => {
                    const local = companies.find(c => c.ticker === t);
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          if (isImporting) return;
                          if (local) {
                            handleSelectAndOpenCompany(local);
                          } else {
                            handleImportTicker(undefined, t);
                          }
                        }}
                        disabled={isImporting}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all active:scale-95 shrink-0 ${
                          local
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {local ? t : `+ ${t}`}
                      </button>
                    );
                  })}
                </div>

                {/* Company List */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredCompanies.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3 my-2 animate-fadeIn shadow-sm">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                          "{searchTerm}" no está en el catálogo
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto">
                          ¿Deseas buscarla e importarla directamente desde la Bolsa en tiempo real vía Yahoo Finance?
                        </p>
                      </div>
                      <button
                        onClick={() => handleImportTicker(undefined, searchTerm)}
                        disabled={isImporting || !searchTerm.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-40 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                        <span>{isImporting ? 'Consultando Wall Street...' : `Cargar "${searchTerm}" en Vivo`}</span>
                      </button>
                    </div>
                  ) : (
                    filteredCompanies.map(c => {
                      const isSelected = c.id === selectedCompany.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectAndOpenCompany(c)}
                          className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:-translate-y-px hover:shadow-md ${
                            isSelected
                              ? 'bg-slate-900/5 border-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-100 border-slate-200 text-slate-800'
                              }`}>
                                {c.ticker.slice(0, 3)}
                              </div>
                              <div>
                                <span className="font-mono font-bold text-xs text-slate-900 block">
                                  {c.ticker}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate block max-w-[140px]">
                                  {c.nombre}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.scoreGrade === 'A+' || c.scoreGrade === 'A'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : c.scoreGrade === 'F'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <span>
                                {c.linearScore}
                              </span>
</span>
                          </div>
                        </div>
                      )
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Simple Analysis View */}
            <div
              id="company-detail-panel"
              className={`lg:col-span-8 ${mobileActiveTab === 'detail' || mobileActiveTab === 'both' ? 'block' : 'hidden lg:block'}`}
            >
              {isCompanyLoading ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-48"></div>
                      <div className="h-3 bg-slate-200 rounded w-32"></div>
                    </div>
                  </div>
                  <SkeletonCard lines={5} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={3} />
                  </div>
                  <SkeletonCard lines={4} />
                  <SkeletonCard lines={6} />
                </div>
              ) : (
                <SimpleViewMode
                  company={selectedCompany}
                  companies={companies}
                  onSelectCompany={handleSelectAndOpenCompany}
                  onPrev={handlePrevCompany}
                  onNext={handleNextCompany}
                  canPrev={companies.length > 1}
                  canNext={companies.length > 1}
                />
              )}
            </div>
          </div>
        </div>
) : (
          /* Analyst Mode or expanded section: Full complex interface */
          <div className="space-y-6">
      {/* Barra de herramientas del Modo Analista */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-serif text-[28px] leading-tight font-semibold text-slate-900">
            Análisis fundamental
            <span className="block h-[3px] w-12 mt-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-300" aria-hidden="true" />
          </h1>
          <p className="mt-1 mb-0 text-sm text-slate-600 max-w-[72ch] leading-relaxed">
            Tasa libre de riesgo{' '}
            <span className="tabular font-semibold text-slate-800">
              {tasaLibreRiesgo !== null ? `${(tasaLibreRiesgo * 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %` : '…'}
            </span>{' '}
            (bono del Tesoro a 10 años). Con tipos reales positivos el capital deja de ser gratis: resisten los balances con foso y caja neta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncPrices}
            disabled={isSyncingPrices}
            className="press flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar las cotizaciones de todo el catálogo desde Yahoo Finance"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isSyncingPrices ? 'animate-spin' : ''}`} />
            <span>{isSyncingPrices ? 'Actualizando…' : 'Actualizar cotizaciones'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="press flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-glow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Analizar mi empresa</span>
          </button>
        </div>
      </div>

      {syncStatusBanner && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusBanner}</span>
          </div>
          <button type="button" onClick={() => setSyncStatusBanner(null)} className="text-emerald-800 hover:text-emerald-950 text-xs font-semibold">
            Cerrar
          </button>
        </div>
      )}

      {/* Mobile / Tablet Segmented Control: Lista de Empresas vs Análisis Fundamental vs Ambos */}
      <div className="flex lg:hidden items-center justify-between p-1 bg-slate-200/80 rounded-2xl border border-slate-200 mb-4 gap-1">
        <button
          onClick={() => setMobileActiveTab('list')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileActiveTab === 'list'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Catálogo ({filteredCompanies.length})</span>
        </button>

        <button
          onClick={() => {
            setMobileActiveTab('detail');
            setTimeout(() => {
              document.getElementById('company-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileActiveTab === 'detail'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
          <span>Ficha de {selectedCompany.ticker}</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('both')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileActiveTab === 'both'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Ver Catálogo y Análisis en una sola vista"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Ambos</span>
        </button>
      </div>

      {/* Grid: Stock Selector Column & Detailed Fundamental Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Companies (Bottom-Up Filter) */}
        <div className={`lg:col-span-4 space-y-4 ${mobileActiveTab === 'list' || mobileActiveTab === 'both' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h2 className="m-0 font-serif text-lg font-semibold text-slate-900">
                  Empresas
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {filteredCompanies.length} empresas
              </span>
            </div>

            {/* iOS Styled Search Bar with Live Market Suggestions & Enter Handling */}
            <div className="relative mb-3">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSearchSubmit();
                }}
                className="relative"
              >
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar ticker (NVDA) o empresa (Tesla)..."
                  value={searchTerm}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-16 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
                />
                <div className="absolute right-2.5 top-2 flex items-center gap-1">
                  {isSearchingLive && (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin mr-1" />
                  )}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setShowSearchDropdown(false);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xs p-1"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!searchTerm.trim() || isImporting}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Buscar e importar"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              </form>

              {/* Dropdown flotante con resultados en vivo mientras se escribe */}
              {showSearchDropdown && searchTerm.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 max-h-72 overflow-y-auto no-scrollbar animate-fadeIn">
                  <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100 text-[10px] text-slate-500 font-mono">
                    <span>Sugerencias de Mercado en Vivo</span>
                    {isSearchingLive ? (
                      <span className="text-slate-500 animate-pulse">Consultando Wall Street...</span>
                    ) : (
                      <span>Pulsa Enter para cargar</span>
                    )}
                  </div>

                  {liveSearchResults.length > 0 ? (
                    <div className="space-y-1">
                      {liveSearchResults.map(item => {
                        const local = companies.find(c => c.ticker === item.ticker);
                        return (
                          <div
                            key={item.ticker}
                            onClick={() => {
                              if (local) {
                                handleSelectAndOpenCompany(local);
                                setSearchTerm('');
                                setShowSearchDropdown(false);
                              } else {
                                handleImportTicker(undefined, item.ticker);
                              }
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-9 h-6 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-[11px] text-slate-800 flex items-center justify-center shrink-0">
                                {item.ticker}
                              </span>
                              <div className="text-left truncate max-w-[140px]">
                                <span className="text-xs font-semibold text-slate-900 block truncate">
                                  {item.nombre}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {item.sector}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {local ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  En Cartera
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-transparent text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                                  + Cargar en Vivo
                                </span>
                              )}
                              {item.price && (
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                  ${item.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !isSearchingLive ? (
                    <div className="p-3 text-center">
                      <p className="text-xs text-slate-700">
                        ¿Cargar <strong>"{searchTerm}"</strong> directamente desde Wall Street?
                      </p>
                      <button
                        onClick={() => handleImportTicker(undefined, searchTerm)}
                        disabled={isImporting}
                        className="mt-2 w-full py-1.5 px-3 rounded-xl bg-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-300 hover:border-slate-400 text-xs font-medium transition-all"
                      >
                        {isImporting ? 'Consultando...' : `Buscar "${searchTerm}" en Bolsa`}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Accesos rápidos a Tickers Populares */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider shrink-0 mr-1">
                Top:
              </span>
              {['NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'SAN', 'DIS'].map(t => {
                const inCatalog = companies.some(c => c.ticker === t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const local = companies.find(c => c.ticker === t);
                      if (local) {
                        handleSelectAndOpenCompany(local);
                      } else {
                        handleImportTicker(undefined, t);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 ${
                      inCatalog
                        ? 'bg-slate-200 text-slate-800 border border-slate-300 hover:bg-slate-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-400 hover:text-slate-900'
                    }`}
                    title={inCatalog ? `Ver ${t} en cartera` : `Cargar ${t} en vivo`}
                  >
                    {inCatalog ? `✓ ${t}` : `+ ${t}`}
                  </button>
                );
              })}
            </div>

            {/* iOS Filter Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3.5 pb-2 border-b border-slate-100">
              <button
                onClick={() => setQualityFilter('all')}
                className={`press px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  qualityFilter === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Todas ({companies.length})
              </button>
              <button
                onClick={() => setQualityFilter('green')}
                className={`press px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  qualityFilter === 'green'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Saludables (A/A+)
              </button>
              <button
                onClick={() => setQualityFilter('margin')}
                className={`press px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  qualityFilter === 'margin'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Margen &gt; 15%
              </button>
              <button
                onClick={() => setQualityFilter('speculative')}
                className={`press px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  qualityFilter === 'speculative'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Alerta / Trampas
              </button>
            </div>

            {/* Company Cards List (iOS Squircle List) */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 no-scrollbar">
              {filteredCompanies.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3 my-2 animate-fadeIn shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      "{searchTerm}" no está en el catálogo local
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto">
                      ¿Deseas buscarla e importarla directamente desde la Bolsa en tiempo real vía Yahoo Finance?
                    </p>
                  </div>
                  <button
                    onClick={() => handleImportTicker(undefined, searchTerm)}
                    disabled={isImporting || !searchTerm.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-300 hover:border-slate-400 transition-all active:scale-95 disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                    <span>{isImporting ? 'Consultando Wall Street...' : `Cargar "${searchTerm}" en Vivo`}</span>
                  </button>
                </div>
              ) : (
                filteredCompanies.map(c => {
                  const isSelected = c.id === selectedCompany.id;
                  const isSpeculative = c.scoreGrade === 'F' || c.ticker === 'HYPE';
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectAndOpenCompany(c)}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group hover:-translate-y-px hover:shadow-md ${
                        isSelected
                          ? 'bg-slate-100/90 border-slate-900 shadow-xs ring-1 ring-slate-900'
                          : isSpeculative
                          ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono font-black text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}>
                            {c.ticker.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900 block">
                                {c.ticker}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-900 text-white">
                                  Activa
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate max-w-[130px] block">
                              {c.nombre}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            c.scoreGrade === 'A+' || c.scoreGrade === 'A'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : c.scoreGrade === 'F'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {c.scoreGrade} · {c.linearScore} pts
                          </span>
                          <span className="text-[11px] text-slate-700 block mt-0.5 font-mono font-bold">
                            ${c.raw.precioCotizacion.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
                        <div className="truncate">
                          <span>Foso: <strong className="text-slate-800">{c.moat.slice(0, 12)}</strong></span>
                           <span className="mx-1 text-slate-300">·</span>
                           {c.targetConsensus ? (
                             <span className={c.targetConsensus.upside_potential > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                               {c.targetConsensus.upside_potential > 0 ? '+' : ''}{c.targetConsensus.upside_potential}%
                             </span>
                           ) : (
                             <span className="text-slate-400">Sin consenso</span>
                           )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAndOpenCompany(c);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all bg-transparent border active:scale-95 ${
                              isSelected
                                ? 'border-slate-400 text-slate-900 bg-slate-200/60 font-semibold'
                                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                            title="Ver análisis y semáforos de esta empresa"
                          >
                            <BarChart3 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`} />
                            <span>{isSelected ? 'Viendo Análisis' : 'Ver Análisis →'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Financial Audit, Price Chart & Semaphores */}
        <div
          id="company-detail-panel"
          className={`lg:col-span-8 space-y-6 ${mobileActiveTab === 'detail' || mobileActiveTab === 'both' ? 'block' : 'hidden lg:block'}`}
        >
          {/* Volver al catálogo (móvil) */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('list')}
            className="flex lg:hidden items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al catálogo</span>
          </button>

          {/* Cabecera de la empresa */}
          <Reveal key={selectedCompany.id}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
            <div className="ink-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                  <span className="font-mono font-semibold text-amber-300">{selectedCompany.ticker}</span>
                  <span aria-hidden="true">/</span>
                  <span>{selectedCompany.sector}</span>
                  <span aria-hidden="true">/</span>
                  <span className="tabular">${selectedCompany.raw.precioCotizacion.toFixed(2)}</span>
                </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <div className="flex items-center h-9 rounded-lg border border-white/15 bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={handlePrevCompany}
                    disabled={companies.length <= 1}
                    className="h-full px-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                    aria-label="Empresa anterior"
                    title="Empresa anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <select
                    value={selectedCompany.id}
                    onChange={(e) => {
                      const found = companies.find(c => c.id === e.target.value);
                      if (found) handleSelectAndOpenCompany(found);
                    }}
                    className="h-full max-w-[180px] border-0 border-x border-white/15 rounded-none bg-transparent px-2 text-xs font-semibold text-white cursor-pointer"
                    aria-label="Cambiar de empresa"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id} className="text-slate-900">
                        {c.ticker} · {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleNextCompany}
                    disabled={companies.length <= 1}
                    className="h-full px-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                    aria-label="Empresa siguiente"
                    title="Empresa siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="font-mono text-[11px] text-slate-500 px-1">
                  {currentCompanyIndex + 1}/{companies.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickInspectModal(true)}
                  className="press h-9 w-9 rounded-lg border border-white/15 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center"
                  title="Abrir ficha y gráfico en pantalla completa"
                  aria-label="Ficha ampliada"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectForSimulation(selectedCompany.ticker)}
                  className="press flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-500 text-slate-950 text-[13px] font-semibold hover:bg-amber-400 shadow-glow"
                >
                  <LineChart className="w-4 h-4" />
                  <span>Simular en cartera</span>
                </button>
              </div>
              </div>
              <h2 className="mt-2 mb-0 font-serif text-[30px] leading-tight font-semibold text-white">
                {selectedCompany.nombre}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={selectedCompany.scoreGrade === 'A+' || selectedCompany.scoreGrade === 'A' ? 'green' : selectedCompany.scoreGrade === 'F' ? 'red' : 'yellow'}
                  title="Nota del Score lineal S(a)"
                >
                  Nota {selectedCompany.scoreGrade}
                </StatusBadge>
                {selectedCompany.targetConsensus && (
                  <StatusBadge
                    tone={selectedCompany.targetConsensus.upside_potential >= 15 ? 'green' : selectedCompany.targetConsensus.upside_potential >= 0 ? 'yellow' : 'red'}
                    title="Margen de seguridad estimado frente al precio objetivo medio del consenso"
                  >
                    {selectedCompany.targetConsensus.upside_potential >= 15
                      ? 'Margen de seguridad amplio'
                      : selectedCompany.targetConsensus.upside_potential >= 0
                      ? 'Margen de seguridad estrecho'
                      : 'Sin margen de seguridad'}
                  </StatusBadge>
                )}
              </div>
              {selectedCompany.descripcion && (
                <p className="mt-3 mb-0 text-[13px] text-slate-300 max-w-[72ch] leading-relaxed line-clamp-2">
                  {selectedCompany.descripcion}
                </p>
              )}
            </div>

            {/* Cifras clave */}
            <dl className="m-0 grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 border-t border-slate-200 [&>div]:bg-white">
              <div className="p-4 sm:px-6">
                <dt className="text-xs text-slate-500">Score lineal S(a)</dt>
                <dd className="m-0 mt-1 flex items-baseline gap-2">
                  <span className="tabular text-2xl font-semibold text-slate-900">{selectedCompany.linearScore}</span>
                  <span className="text-xs text-slate-500">/100 · nota {selectedCompany.scoreGrade}</span>
                </dd>
              </div>
              <div className="p-4 sm:px-6">
                <dt className="text-xs text-slate-500 flex items-center">
                  Potencial según consenso
                  <InfoTooltip concept="per" />
                </dt>
                <dd className="m-0 mt-1 flex items-baseline gap-2 flex-wrap">
                  <span className={`tabular text-2xl font-semibold ${
                    !selectedCompany.targetConsensus ? 'text-slate-400' :
                    selectedCompany.targetConsensus.upside_potential >= 10 ? 'text-emerald-700' :
                    selectedCompany.targetConsensus.upside_potential >= 0 ? 'text-slate-900' :
                    'text-rose-700'
                  }`}>
                    {selectedCompany.targetConsensus
                      ? `${selectedCompany.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(selectedCompany.targetConsensus.upside_potential * 10) / 10}%`
                      : 'N/D'}
                  </span>
                  {selectedCompany.targetConsensus && (
                    <span className="text-xs text-slate-500">
                      {selectedCompany.targetConsensus.number_of_analysts} analistas, objetivo ${selectedCompany.targetConsensus.target_mean.toFixed(2)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="p-4 sm:px-6">
                <dt className="text-xs text-slate-500 flex items-center">
                  Foso defensivo
                  <InfoTooltip concept="foso" />
                </dt>
                <dd className="m-0 mt-1 text-sm font-semibold text-slate-900">{selectedCompany.moat}</dd>
              </div>
            </dl>

            {/* Veredicto */}
            <div className="relative border-t border-slate-200 px-5 sm:px-6 py-4">
              <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-amber-500" aria-hidden="true" />
              <p className="m-0 font-serif text-[17px] leading-relaxed text-slate-800">
                «{selectedCompany.warrenVerdict}»
              </p>
            </div>
          </div>
          </Reveal>

          {/* Subpestañas del análisis (quedan pegadas bajo la barra superior) */}
          {(() => {
            const activeCategory =
              ANALYSIS_CATEGORIES.find(cat => cat.views.some(v => v.id === engineViewMode)) ?? ANALYSIS_CATEGORIES[0];
            return (
              <div className="sticky top-[var(--navbar-h)] z-20 -mx-1 px-1 py-2 bg-papel/90 backdrop-blur-md">
                <nav
                  aria-label="Categorías del análisis"
                  className="glass flex gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar"
                >
                  {ANALYSIS_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isActive = cat.id === activeCategory.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (!isActive) setEngineViewMode(cat.views[0].id);
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        title={cat.descripcion}
                        className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-[13px] transition-colors ${
                          isActive ? 'font-semibold text-white' : 'font-medium text-slate-600 hover:text-slate-900 hover:bg-white/70'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="analysis-category-pill"
                            className="absolute inset-0 rounded-xl ink-panel shadow-md"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            aria-hidden="true"
                          />
                        )}
                        <Icon className={`relative w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                        <span className="relative">{cat.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {activeCategory.views.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto no-scrollbar animate-fadeIn">
                    <span className="text-[11px] text-slate-500 mr-1 shrink-0">{activeCategory.descripcion}:</span>
                    {activeCategory.views.map(view => {
                      const Icon = view.icon;
                      const isActive = engineViewMode === view.id;
                      return (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => setEngineViewMode(view.id)}
                          aria-current={isActive ? 'true' : undefined}
                          className={`press flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs border ${
                            isActive
                              ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
                          {view.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={engineViewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <Suspense fallback={<SkeletonCard lines={6} />}>
              {/* VISTA: DASHBOARD DE INDICADORES VITALES (Simple) o RATIOS COMPLETO (Analyst) */}
              {(engineViewMode === 'dashboard' || engineViewMode === 'all') && (
                <>
                  {viewMode === 'simple' && !isAnalystEnabledForSection('fundamental') ? (
                    <VitalSigns
                      company={selectedCompany}
                      onNavigateToDetail={() => {
                        window.dispatchEvent(new CustomEvent('warren:toggle-to-analyst'));
                      }}
                    />
                  ) : (
                    <RatiosDashboard
                      selectedCompany={selectedCompany}
                      onSelectRatioForAnalysis={(ratioKey) => handleSelectRatioForAnalysis(ratioKey)}
                      onNavigateToView={(view) => setEngineViewMode(view)}
                    />
                  )}
                </>
              )}

              {/* VISTA: GRÁFICA DE COTIZACIÓN EN BOLSA & MARGEN DE SEGURIDAD */}
              {(engineViewMode === 'chart' || engineViewMode === 'all') && (
                <div className="space-y-4">
                  <CompanyPriceChart company={selectedCompany} />
                </div>
              )}

              {/* Banner Rápido para Desplegar Gráfica si estás en Semáforos o Visualizador */}
              {(engineViewMode === 'semaphores' || engineViewMode === 'visualizer') && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Gráfica de Cotización Histórica: {selectedCompany.ticker}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Precio actual: ${selectedCompany.raw.precioCotizacion.toFixed(2)} · Objetivo Medio: ${selectedCompany.targetConsensus?.target_mean.toFixed(2) ?? 'N/D'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPriceChartExpanded(!isPriceChartExpanded)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all shadow-2xs"
                    >
                      {isPriceChartExpanded ? 'Ocultar Gráfica' : 'Ver Gráfica Aquí'}
                    </button>
                    <button
                      onClick={() => setEngineViewMode('chart')}
                      className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <span>Pantalla Completa</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Gráfica desplegable en modo Semáforos/Visualizador si el usuario la tiene expandida */}
              {(engineViewMode === 'semaphores' || engineViewMode === 'visualizer') && isPriceChartExpanded && (
                <div className="animate-fadeIn">
                  <CompanyPriceChart company={selectedCompany} />
                </div>
              )}

              {/* VISTA: VALORACIÓN (consenso, CAPM, tracking error y, en modo Analista, VaR/CVaR) */}
              {(engineViewMode === 'valuation' || engineViewMode === 'all') && (
                <div className="space-y-6">
                  <Reveal className="space-y-3">
                    <SectionLabel icon={Globe}>Consenso de Wall Street</SectionLabel>
                    <WallStreetConsensus
                      ticker={selectedCompany.ticker}
                      currentPrice={selectedCompany.raw.precioCotizacion}
                      consensus={selectedCompany.targetConsensus}
                    />
                  </Reveal>
                  <Reveal delay={0.06} className="space-y-3">
                    <SectionLabel icon={DollarSign}>Coste de capital (CAPM)</SectionLabel>
                    <CapmValuationCard
                      ticker={selectedCompany.ticker}
                      companyName={selectedCompany.nombre}
                      companyRoe={selectedCompany.ratios?.roe?.value ? selectedCompany.ratios.roe.value * 100 : undefined}
                    />
                  </Reveal>
                  <Reveal delay={0.12} className="space-y-3">
                    <SectionLabel icon={Shield}>Riesgo frente al mercado</SectionLabel>
                    <TrackingErrorCard
                      ticker={selectedCompany.ticker}
                      companyName={selectedCompany.nombre}
                      benchmark="^GSPC"
                      period="1y"
                    />
                    {!(viewMode === 'simple' && !isAnalystEnabledForSection('fundamental')) && (
                      <RiskMetricsCard
                        ticker={selectedCompany.ticker}
                        companyName={selectedCompany.nombre}
                      />
                    )}
                  </Reveal>
                </div>
              )}

              {/* VISTA 1: VISUALIZADOR GRÁFICO INTEGRAL */}
              {(engineViewMode === 'visualizer' || engineViewMode === 'all') && (
                <BalanceSheetVisualizer company={selectedCompany} />
              )}

              {/* VISTA 2: DETALLE DE LOS 11 RATIOS CONTABLES POR DIMENSION CON SEMAFORO */}
              {(engineViewMode === 'semaphores' || engineViewMode === 'all') && (
                <DimensionRatiosPanel
                  company={selectedCompany}
                  activeDimension={activeDimension}
                  onDimensionChange={setActiveDimension}
                />
              )}

              {/* VISTA: ASESORES JAIRO Y GUILLERMO */}
              {(engineViewMode === 'advisors' || engineViewMode === 'all') && (
                <JairoGuillermoConsult companies={companies} />
              )}

              {/* VISTA 3: GUÍA PEDAGÓGICA DE FÓRMULAS & UMBRALES VALUE */}
              {(engineViewMode === 'formulas' || engineViewMode === 'all') && (
                <FinancialFormulasGuide
                  selectedCompany={selectedCompany}
                  onSelectRatioForAnalysis={handleSelectRatioForAnalysis}
                />
              )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
</div>
       </div>
       </div>
      )}

      {/* Modal: Analizar Mi Empresa Personalizada (iOS Style Sheet) */}
      {/* Modal: Analizar Mi Empresa Personalizada (iOS Style Sheet) */}
      <CustomCompanyModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSubmit={handleCustomSubmit}
        customForm={customForm}
        setCustomForm={setCustomForm}
      />

      {/* Modal: Ficha Ampliada en Pantalla Completa con Grafica y Diagnostico */}
      <QuickInspectModal
        isOpen={showQuickInspectModal}
        onClose={() => setShowQuickInspectModal(false)}
        company={selectedCompany}
        onSelectForSimulation={onSelectForSimulation}
        onOpenSemaphores={() => setEngineViewMode('semaphores')}
        getRatioData={getRatioData}
      />
    </div>
  );
};
