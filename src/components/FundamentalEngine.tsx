import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CompanyAnalysis, FinancialRawData } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { abrirBuscador } from '../utils/events';
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
  Zap, X } from 'lucide-react';
import { CompanyPriceChart } from './CompanyPriceChart';
import { VitalSigns } from './VitalSigns';
import { InfoTooltip } from './SmartTooltip';
import { SimpleViewMode, SkeletonCard } from './SimpleViewMode';
import { CustomCompanyModal, INITIAL_CUSTOM_FORM, CustomCompanyFormData } from './fundamental/CustomCompanyModal';
import { QuickInspectModal } from './fundamental/QuickInspectModal';
import { AnimatePresence, motion } from 'motion/react';
import { Reveal } from './ui/Feedback';
import { ScrollRail } from './ui/ScrollRail';
import { deriveVerdict } from '../utils/verdict';

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
    <Icon className="w-4 h-4 text-slate-500" />
    <h3 className="m-0 font-serif text-lg font-semibold text-slate-900">{children}</h3>
    <span className="flex-1 h-px bg-slate-200" aria-hidden="true" />
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
          {/* Live sync notification feedback in Simple Mode */}
          {syncStatusBanner && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusBanner}</span>
              </div>
              <button onClick={() => setSyncStatusBanner(null)} className="text-slate-500 hover:text-slate-700 text-xs" aria-label="Cerrar aviso">
                <X className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>
          )}

          {/* Ficha a todo el ancho: para cambiar de empresa se usa la lupa de la barra superior */}
          <div>
            {/* Right Column: Simple Analysis View */}
            <div
              id="company-detail-panel"
              className="max-w-5xl mx-auto"
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
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar las cotizaciones de todo el catálogo desde Yahoo Finance"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isSyncingPrices ? 'animate-spin' : ''}`} />
            <span>{isSyncingPrices ? 'Actualizando…' : 'Actualizar cotizaciones'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-md text-sm font-semibold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
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

      {/* Grid: Stock Selector Column & Detailed Fundamental Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Companies (Bottom-Up Filter) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
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

            {/* iOS Filter Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3.5 pb-2 border-b border-slate-100">
              <button
                onClick={() => setQualityFilter('all')}
                className={`press px-2.5 py-1 rounded-full text-xs font-semibold ${
                  qualityFilter === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Todas ({companies.length})
              </button>
              <button
                onClick={() => setQualityFilter('green')}
                className={`press px-2.5 py-1 rounded-full text-xs font-semibold ${
                  qualityFilter === 'green'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Saludables (A/A+)
              </button>
              <button
                onClick={() => setQualityFilter('margin')}
                className={`press px-2.5 py-1 rounded-full text-xs font-semibold ${
                  qualityFilter === 'margin'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Margen &gt; 15%
              </button>
              <button
                onClick={() => setQualityFilter('speculative')}
                className={`press px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                <div className="p-5 rounded-xl border border-dashed border-slate-300 text-center my-2">
                  <p className="m-0 text-sm font-semibold text-slate-900">Ninguna empresa cumple este filtro</p>
                  <p className="mt-1 mb-3 text-sm text-slate-600">Quita el filtro o busca otra empresa con la lupa.</p>
                  <button type="button" onClick={abrirBuscador} className="h-9 px-4 rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:border-slate-400">
                    Buscar empresa
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
                      className={`p-3.5 rounded-lg border transition-all duration-200 cursor-pointer group hover:-translate-y-px hover:shadow-md ${
                        isSelected
                          ? 'bg-slate-100/90 border-slate-900 shadow-xs ring-1 ring-slate-900'
                          : isSpeculative
                          ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono font-semibold text-xs shrink-0 transition-colors ${
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
                                <span className="text-xs font-semibold px-1.5 py-0.2 rounded-md bg-slate-900 text-white">
                                  Activa
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 truncate max-w-[130px] block">
                              {c.nombre}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                            c.scoreGrade === 'A+' || c.scoreGrade === 'A'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : c.scoreGrade === 'F'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {c.scoreGrade} · {c.linearScore} pts
                          </span>
                          <span className="text-xs text-slate-700 block mt-0.5 font-mono font-bold">
                            ${c.raw.precioCotizacion.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
                        <div className="truncate">
                          <span>Foso: <strong className="text-slate-800">{c.moat.slice(0, 12)}</strong></span>
                           <span className="mx-1 text-slate-300">·</span>
                           {c.targetConsensus ? (
                             <span className={c.targetConsensus.upside_potential > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                               {c.targetConsensus.upside_potential > 0 ? '+' : ''}{c.targetConsensus.upside_potential}%
                             </span>
                           ) : (
                             <span className="text-slate-500">Sin consenso</span>
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
                            <BarChart3 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-900' : 'text-slate-500'}`} />
                            <span>{isSelected ? 'En pantalla' : 'Ver ficha'}</span>
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
          className="lg:col-span-8 space-y-6"
        >

          {/* Cabecera de la empresa: hoja del libro con las cifras clave */}
          <section
            key={selectedCompany.id}
            aria-labelledby="ficha-empresa-titulo"
            className="bg-white rounded-2xl border border-slate-200"
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <p className="m-0 flex flex-wrap items-center gap-x-2 text-sm text-slate-600 min-w-0">
                  <span className="font-semibold text-amber-800">{selectedCompany.ticker}</span>
                  <span className="text-slate-300" aria-hidden="true">/</span>
                  <span>{selectedCompany.sector}</span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center h-9 rounded-md border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={handlePrevCompany}
                      disabled={companies.length <= 1}
                      className="h-full px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-30"
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
                      className="h-full max-w-[150px] sm:max-w-[200px] border-0 border-x border-slate-200 rounded-none bg-white px-2 text-sm font-medium text-slate-800 cursor-pointer"
                      aria-label={`Cambiar de empresa (${currentCompanyIndex + 1} de ${companies.length})`}
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.ticker}: {c.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleNextCompany}
                      disabled={companies.length <= 1}
                      className="h-full px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-30"
                      aria-label="Empresa siguiente"
                      title="Empresa siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickInspectModal(true)}
                    className="h-9 w-9 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
                    title="Abrir ficha y gráfico en pantalla completa"
                    aria-label="Abrir ficha ampliada"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectForSimulation(selectedCompany.ticker)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-md bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 transition-colors"
                  >
                    <LineChart className="w-4 h-4" />
                    <span>Simular en cartera</span>
                  </button>
                </div>
              </div>

              <h2 id="ficha-empresa-titulo" className="mt-3 mb-0 font-serif text-[26px] sm:text-[34px] leading-tight font-semibold text-slate-900">
                {selectedCompany.nombre}
              </h2>
              {selectedCompany.descripcion && (
                <p className="mt-2 mb-0 text-sm text-slate-600 max-w-[68ch] leading-relaxed line-clamp-2">
                  {selectedCompany.descripcion}
                </p>
              )}
            </div>

            {/* Cifras clave, compuestas como un asiento del libro */}
            <dl className="m-0 grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200">
              <div className="p-4 sm:px-6 border-r border-b lg:border-b-0 border-slate-200">
                <dt className="text-sm text-slate-600">Cotización</dt>
                <dd className="m-0 mt-1 cifra text-[26px] leading-none text-slate-900">
                  ${selectedCompany.raw.precioCotizacion.toFixed(2)}
                </dd>
                <p className="m-0 mt-1.5 text-xs text-slate-600">Precio de una acción hoy</p>
              </div>
              <div className="p-4 sm:px-6 border-b lg:border-b-0 lg:border-r border-slate-200">
                <dt className="text-sm text-slate-600">Score S(a)</dt>
                <dd className="m-0 mt-1 flex items-baseline gap-1.5">
                  <span className="cifra text-[26px] leading-none text-slate-900">{selectedCompany.linearScore}</span>
                  <span className="text-sm text-slate-600">/100, nota {selectedCompany.scoreGrade}</span>
                </dd>
                <p className="m-0 mt-1.5 text-xs text-slate-600">
                  {selectedCompany.linearScore >= 80 ? 'Negocio de calidad alta' : selectedCompany.linearScore >= 65 ? 'Negocio sólido' : selectedCompany.linearScore >= 50 ? 'Calidad irregular' : 'Negocio débil'}
                </p>
              </div>
              <div className="p-4 sm:px-6 border-r border-slate-200">
                <dt className="text-sm text-slate-600">Potencial según analistas</dt>
                <dd className="m-0 mt-1">
                  <span className={`cifra text-[26px] leading-none ${
                    !selectedCompany.targetConsensus ? 'text-slate-500' :
                    selectedCompany.targetConsensus.upside_potential >= 10 ? 'text-emerald-700' :
                    selectedCompany.targetConsensus.upside_potential >= 0 ? 'text-slate-900' :
                    'text-rose-700'
                  }`}>
                    {selectedCompany.targetConsensus
                      ? `${selectedCompany.targetConsensus.upside_potential > 0 ? '+' : ''}${(Math.round(selectedCompany.targetConsensus.upside_potential * 10) / 10).toLocaleString('es-ES')} %`
                      : 'Sin cobertura'}
                  </span>
                  {selectedCompany.targetConsensus && (
                    <span className="block mt-1.5 text-xs text-slate-600">
                      {selectedCompany.targetConsensus.upside_potential >= 15 ? 'Descuento amplio' : selectedCompany.targetConsensus.upside_potential >= 0 ? 'Poco descuento' : 'Por encima del objetivo'}: objetivo ${selectedCompany.targetConsensus.target_mean.toFixed(2)} según {selectedCompany.targetConsensus.number_of_analysts} analistas
                    </span>
                  )}
                </dd>
              </div>
              <div className="p-4 sm:px-6">
                <dt className="text-sm text-slate-600 flex items-center">
                  Foso defensivo
                  <InfoTooltip concept="foso" />
                </dt>
                <dd className="m-0 mt-1 cifra text-[26px] leading-none text-slate-900">{selectedCompany.moat}</dd>
                <p className="m-0 mt-1.5 text-xs text-slate-600">
                  {selectedCompany.moat === 'Amplio' ? 'Difícil de copiar por la competencia' : selectedCompany.moat === 'Medio' ? 'Alguna ventaja frente a rivales' : 'Poca protección frente a rivales'}
                </p>
              </div>
            </dl>

            {/* Veredicto calculado con los datos de esta ficha (no el texto fijo de los datos semilla) */}
            {(() => {
              const verdict = deriveVerdict(selectedCompany);
              const bar = verdict.tone === 'green' ? 'bg-emerald-600' : verdict.tone === 'red' ? 'bg-rose-600' : 'bg-amber-600';
              return (
                <div className="flex gap-3 border-t border-slate-200 px-5 sm:px-6 py-4">
                  <span className={`w-[3px] shrink-0 rounded ${bar}`} aria-hidden="true" />
                  <p className="m-0 font-serif text-[17px] leading-relaxed text-slate-800 max-w-[70ch]">
                    {verdict.text}
                  </p>
                </div>
              );
            })()}
          </section>

          {/* Subpestañas del análisis (quedan pegadas bajo la barra superior) */}
          {(() => {
            const activeCategory =
              ANALYSIS_CATEGORIES.find(cat => cat.views.some(v => v.id === engineViewMode)) ?? ANALYSIS_CATEGORIES[0];
            return (
              <div className="sticky top-[var(--navbar-h)] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-papel">
                <ScrollRail
                  label="Categorías del análisis"
                  activeKey={activeCategory.id}
                  className="border-b border-slate-200"
                  innerClassName="gap-1"
                >
                  {ANALYSIS_CATEGORIES.map(cat => {
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
                        className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors ${
                          isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat.label}
                        {isActive && <span className="absolute inset-x-3 -bottom-px h-[2px] bg-amber-700" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </ScrollRail>

                {activeCategory.views.length > 1 && (
                  <div role="group" aria-label={activeCategory.descripcion} className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar">
                    {activeCategory.views.map(view => {
                      const isActive = engineViewMode === view.id;
                      return (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => setEngineViewMode(view.id)}
                          aria-pressed={isActive}
                          className={`shrink-0 whitespace-nowrap px-3 h-8 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-white border border-slate-300 text-slate-900 font-semibold'
                              : 'border border-transparent text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Cotización de {selectedCompany.ticker}
                      </h4>
                      <p className="text-xs text-slate-500">
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
                <JairoGuillermoConsult companies={companies} initialTicker={selectedCompany?.ticker} />
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
