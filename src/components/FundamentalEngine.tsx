import React, { useState, useEffect } from 'react';
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
import { FinancialFormulasGuide } from './FinancialFormulasGuide';
import { CompanyPriceChart } from './CompanyPriceChart';
import { RatiosDashboard } from './RatiosDashboard';
import { VitalSigns } from './VitalSigns';
import { PythonDataConsole } from './PythonDataConsole';
import { WallStreetConsensus } from './WallStreetConsensus';
import { CapmValuationCard } from './CapmValuationCard';
import { TrackingErrorCard } from './TrackingErrorCard';
import { InfoTooltip } from './SmartTooltip';
import { JairoGuillermoConsult } from './JairoGuillermoConsult';
import { SimpleViewMode, SkeletonCard } from './SimpleViewMode';
import { CustomCompanyModal, INITIAL_CUSTOM_FORM, CustomCompanyFormData } from './fundamental/CustomCompanyModal';
import { QuickInspectModal } from './fundamental/QuickInspectModal';
import { BalanceSheetVisualizer } from './fundamental/BalanceSheetVisualizer';
import { DimensionRatiosPanel } from './fundamental/DimensionRatiosPanel';

interface FundamentalEngineProps {
  companies: CompanyAnalysis[];
  selectedCompany: CompanyAnalysis;
  onSelectCompany: (company: CompanyAnalysis) => void;
  onAddCustomCompany: (custom: CompanyAnalysis) => void;
  onSelectForSimulation: (ticker: string) => void;
  customModalOpen?: boolean;
  onCloseCustomModal?: () => void;
  onUpdateCompanies?: (companies: CompanyAnalysis[]) => void;
  onOpenPythonConsole?: (ticker?: string) => void;
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
  onOpenPythonConsole
}) => {
  const { mode: viewMode, isAnalystEnabledForSection } = useViewMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'green' | 'margin' | 'moat' | 'speculative'>('all');
  const [engineViewMode, setEngineViewMode] = useState<'dashboard' | 'semaphores' | 'visualizer' | 'chart' | 'formulas' | 'all'>('dashboard');
  const [activeDimension, setActiveDimension] = useState<'all' | 'liquidez' | 'solvencia' | 'rentabilidad' | 'valoracion'>('all');
  const [internalCustomModal, setInternalCustomModal] = useState(false);
  const [isLocalPythonOpen, setIsLocalPythonOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'detail' | 'both'>('both');
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
    if (term.length < 2) {
      setLiveSearchResults([]);
      setIsSearchingLive(false);
      return;
    }

    setIsSearchingLive(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchJson(`/api/market/search?q=${encodeURIComponent(term)}`, {}, 12000);
        if (data.success && Array.isArray(data.results)) {
          setLiveSearchResults(data.results);
        }
      } catch (err) {
        console.warn('Error en consulta de búsqueda bursátil:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 200);

    return () => clearTimeout(timer);
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
           c.nombre.toLowerCase().includes(query.toLowerCase())
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
      const data = await postJson('/api/market/import', { query, ticker: query });
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

  const showCustomModal = customModalOpen !== undefined ? customModalOpen : internalCustomModal;
  const setShowCustomModal = (open: boolean) => {
    setInternalCustomModal(open);
    if (!open && onCloseCustomModal) onCloseCustomModal();
  };

  // Custom company form state
  const [customForm, setCustomForm] = useState<CustomCompanyFormData>(INITIAL_CUSTOM_FORM);

  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      c.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchTerm.toLowerCase());

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
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
              <span>📋 Catálogo ({filteredCompanies.length})</span>
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
              <span>📊 Ver Análisis: {selectedCompany.ticker}</span>
            </button>
          </div>

          {/* Live sync notification feedback in Simple Mode */}
          {syncStatusBanner && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncStatusBanner}</span>
              </div>
              <button onClick={() => setSyncStatusBanner(null)} className="text-slate-400 hover:text-slate-700 text-xs">
                ✕
              </button>
            </div>
          )}

          {/* Grid: Stock Selector Column & Simple Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: List of Companies */}
            <div className={`lg:col-span-4 space-y-4 ${mobileActiveTab === 'list' || mobileActiveTab === 'both' ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      Catálogo de Empresas
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-2xs active:scale-95"
                    title="Añadir empresa calculando estados financieros"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Añadir</span>
                  </button>
                </div>

                <div className="relative mb-3">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (filteredCompanies.length > 0) {
                        handleSelectAndOpenCompany(filteredCompanies[0]);
                        setShowSearchDropdown(false);
                      } else if (searchTerm.trim()) {
                        handleImportTicker(undefined, searchTerm);
                      }
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
                          if (filteredCompanies.length > 0) {
                            handleSelectAndOpenCompany(filteredCompanies[0]);
                            setShowSearchDropdown(false);
                          } else if (searchTerm.trim()) {
                            handleImportTicker(undefined, searchTerm);
                          }
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
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
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
      {/* Top-Down Macro Context Banner (iOS Card Style) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Enfoque Top-Down (Contexto Macroeconómico)
              </span>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                Rf: 4.0%
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              En entornos de tipos reales positivos, el capital deja de ser gratis. Las empresas sin beneficios reales sufren; los balances blindados con <strong>Moat</strong> y caja neta prosperan.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => setEngineViewMode('formulas')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-medium bg-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Guía de Fórmulas</span>
          </button>
          <button
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm active:scale-95 ring-2 ring-amber-400/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Analizar Mi Empresa</span>
          </button>
        </div>
      </div>

      {/* Live Market & Yahoo Finance Bar (Información Real de Bolsa) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Datos de Mercado en Tiempo Real
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Yahoo Finance (yfinance) • Feed Bursátil en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cotizaciones reales de Wall Street vinculadas automáticamente al motor de 11 ratios y modelo DuPont.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                if (onOpenPythonConsole) {
                  onOpenPythonConsole(selectedCompany?.ticker);
                } else {
                  setIsLocalPythonOpen(true);
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-300 active:scale-95 group cursor-pointer shrink-0"
              title="Abrir motor Python con pandas, numpy, yfinance y seaborn"
            >
              <span className="text-sm transition-transform group-hover:rotate-12">🐍</span>
              <span>Motor Python (Pandas)</span>
              <span className="text-[10px] text-emerald-700 font-mono">
                Live
              </span>
            </button>

            <button
              onClick={handleSyncPrices}
              disabled={isSyncingPrices}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all bg-transparent border active:scale-95 ${
                isSyncingPrices
                  ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 border-slate-300 hover:border-emerald-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPrices ? 'animate-spin' : ''}`} />
              <span>{isSyncingPrices ? 'Sincronizando Bolsa...' : 'Sincronizar Cotizaciones en Vivo'}</span>
            </button>
          </div>
        </div>

        {/* Quick Ticker Search & Import Real Company */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleImportTicker} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar e importar ticker o nombre (ej: TSLA, Apple, Santander, NVDA)..."
                value={importTickerInput}
                onChange={e => setImportTickerInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isImporting || !importTickerInput.trim()}
              className={`px-3.5 py-2 rounded-2xl text-xs font-medium transition-all shrink-0 bg-transparent border active:scale-95 ${
                isImporting || !importTickerInput.trim()
                  ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300 hover:border-slate-400'
              }`}
            >
              {isImporting ? 'Consultando...' : 'Cargar en Vivo'}
            </button>
          </form>

          {/* Quick Click Ticker Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar shrink-0">
            <span className="text-[11px] text-slate-500 font-medium mr-1 hidden sm:inline">Populares:</span>
            {['NVDA', 'MSFT', 'TSLA', 'GOOGL', 'META'].map(t => (
              <button
                key={t}
                onClick={() => handleImportTicker(undefined, t)}
                disabled={isImporting}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all active:scale-95"
              >
                +{t}
              </button>
            ))}
          </div>
        </div>

        {/* Live sync notification feedback */}
        {syncStatusBanner && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusBanner}</span>
            </div>
            <button onClick={() => setSyncStatusBanner(null)} className="text-slate-400 hover:text-slate-700 text-xs">
              ✕
            </button>
          </div>
        )}
      </div>

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
          <span>📋 Catálogo ({filteredCompanies.length})</span>
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
          <span>📊 Ver Análisis: {selectedCompany.ticker}</span>
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
          {/* Active Company Quick Access Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-9 h-9 rounded-2xl bg-slate-800 text-slate-100 border border-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {selectedCompany.ticker.slice(0, 3)}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono font-bold text-xs text-white">
                    {selectedCompany.ticker}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    {selectedCompany.scoreGrade}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate block">
                  ${selectedCompany.raw.precioCotizacion.toFixed(2)} · {selectedCompany.nombre}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileActiveTab('detail');
                setTimeout(() => {
                  document.getElementById('company-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
              title="Ir al análisis detallado de la empresa seleccionada"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Ver Análisis →</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Filtro Bottom-Up de Empresas
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
                  if (filteredCompanies.length > 0) {
                    handleSelectAndOpenCompany(filteredCompanies[0]);
                    setShowSearchDropdown(false);
                  } else if (searchTerm.trim()) {
                    handleImportTicker(undefined, searchTerm);
                  }
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
                      if (filteredCompanies.length > 0) {
                        handleSelectAndOpenCompany(filteredCompanies[0]);
                        setShowSearchDropdown(false);
                      } else if (searchTerm.trim()) {
                        handleImportTicker(undefined, searchTerm);
                      }
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
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  qualityFilter === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Todas ({companies.length})
              </button>
              <button
                onClick={() => setQualityFilter('green')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  qualityFilter === 'green'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Saludables (A/A+)
              </button>
              <button
                onClick={() => setQualityFilter('margin')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  qualityFilter === 'margin'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Margen &gt; 15%
              </button>
              <button
                onClick={() => setQualityFilter('speculative')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
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
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group ${
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
          {/* Navegación Móvil de Retorno */}
          <div className="flex lg:hidden items-center justify-between p-2.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setMobileActiveTab('list')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
              <span>← Volver a Lista de Empresas</span>
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              Ficha: <strong>{selectedCompany.ticker}</strong>
            </span>
          </div>
          {/* Barra de Navegación Rápida de la Empresa Activa */}
          <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Empresa:
              </span>
              {/* Dropdown Selector para cambiar al instante de empresa */}
              <div className="relative flex-1 max-w-sm">
                <select
                  value={selectedCompany.id}
                  onChange={(e) => {
                    const found = companies.find(c => c.id === e.target.value);
                    if (found) handleSelectAndOpenCompany(found);
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400 font-mono cursor-pointer shadow-xs"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.ticker} - {c.nombre} (${c.raw.precioCotizacion.toFixed(2)})
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none rotate-90" />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={handlePrevCompany}
                  disabled={companies.length <= 1}
                  className="p-1 px-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-30 shadow-2xs"
                  title="Ver empresa anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                <span className="text-[11px] font-mono text-slate-600 px-1.5 font-bold">
                  {currentCompanyIndex + 1} / {companies.length}
                </span>
                <button
                  onClick={handleNextCompany}
                  disabled={companies.length <= 1}
                  className="p-1 px-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-30 shadow-2xs"
                  title="Ver empresa siguiente"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowQuickInspectModal(true)}
                className="p-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Abrir ficha y gráfico en pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Ficha Ampliada</span>
              </button>
            </div>
          </div>

          {/* Selected Company Header Card (iOS Style) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {selectedCompany.ticker}
                  </h1>
                  <span className="text-base text-slate-700 font-medium">
                    {selectedCompany.nombre}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedCompany.sector}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  {selectedCompany.descripcion}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setEngineViewMode('chart')}
                  className={`px-3 py-2 rounded-2xl font-medium text-xs transition-all flex items-center gap-1.5 border bg-transparent ${
                    engineViewMode === 'chart'
                      ? 'border-slate-400 text-slate-900 bg-slate-100 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Gráfica del Precio</span>
                </button>
                <button
                  onClick={() => onSelectForSimulation(selectedCompany.ticker)}
                  className="px-3.5 py-2 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 font-medium text-xs transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Simular en Cartera</span>
                </button>
              </div>
            </div>

            {/* Core Badges: Scoring Linear S(a), Margen de Seguridad & Moat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                  Scoring Linear Global S(a)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {selectedCompany.linearScore}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    /100 (Nota {selectedCompany.scoreGrade})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ponderación de las 4 dimensiones financieras.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center font-mono">
                  Consenso Wall Street
                  <InfoTooltip concept="per" />
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl font-black font-mono ${
                    selectedCompany.targetConsensus?.upside_potential >= 10 ? 'text-emerald-700' :
                    selectedCompany.targetConsensus?.upside_potential >= 0 ? 'text-slate-800' :
                    'text-rose-700'
                  }`}>
                    {selectedCompany.targetConsensus
                      ? `${selectedCompany.targetConsensus.upside_potential > 0 ? '+' : ''}${Math.round(selectedCompany.targetConsensus.upside_potential * 10) / 10}%`
                      : 'N/D'}
                  </span>
                  {selectedCompany.targetConsensus && (
                    <span className="text-xs text-slate-500">
                      vs Cotización (${selectedCompany.targetConsensus.number_of_analysts} analistas)
                    </span>
                  )}
                </div>
                {selectedCompany.targetConsensus ? (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedCompany.targetConsensus.recommendation} · Objetivo medio: ${selectedCompany.targetConsensus.target_mean.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cotización actual: ${selectedCompany.raw.precioCotizacion.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center font-mono">
                  Foso Defensivo (Economic Moat)
                  <InfoTooltip concept="foso" />
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">
                    {selectedCompany.moat}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Poder de precios y barreras de entrada estructurales.
                </p>
              </div>
            </div>

            {/* Warren Verdict Heuristic */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-1 font-serif">
                <Sparkles className="w-4 h-4 text-slate-500" />
                <span>Veredicto de Value Investing de Warren:</span>
              </div>
              <p className="text-slate-600 italic">
                "{selectedCompany.warrenVerdict}"
              </p>
            </div>

            {/* SECCIÓN: Consenso de Wall Street (Precio Objetivo, Recomendaciones, Noticias) */}
            <WallStreetConsensus
              ticker={selectedCompany.ticker}
              currentPrice={selectedCompany.raw.precioCotizacion}
              consensus={selectedCompany.targetConsensus}
            />

            {/* SECCIÓN: Costo de Capital Propio (CAPM - Damodaran Betas & FRED DGS10) */}
            <CapmValuationCard
              ticker={selectedCompany.ticker}
              companyName={selectedCompany.nombre}
              companyRoe={selectedCompany.ratios?.roe?.value ? selectedCompany.ratios.roe.value * 100 : undefined}
            />

            {/* SECCIÓN: Risk Tracking (Tracking Error vs Benchmark) */}
            <TrackingErrorCard
              ticker={selectedCompany.ticker}
              companyName={selectedCompany.nombre}
              benchmark="^GSPC"
              period="1y"
            />

            {/* SECCIÓN: Consultá a Jairo y Guillermo */}
            <JairoGuillermoConsult companies={companies} />
          </div>

          {/* Selector de Modo: Dashboard vs Semáforos Contables vs Estructura Gráfica vs Fórmulas vs Todo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                onClick={() => setEngineViewMode('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-600" />
                <span>Dashboard de Ratios</span>
              </button>
              <button
                onClick={() => setEngineViewMode('semaphores')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'semaphores'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-600" />
                <span>Semáforos Contables</span>
              </button>
              <button
                onClick={() => setEngineViewMode('visualizer')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'visualizer'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-slate-600" />
                <span>Balance & DuPont</span>
              </button>
              <button
                onClick={() => setEngineViewMode('chart')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'chart'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <span>Gráfica de Cotización</span>
              </button>
              <button
                onClick={() => setEngineViewMode('formulas')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'formulas'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Guía de Fórmulas</span>
              </button>
              <button
                onClick={() => setEngineViewMode('all')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  engineViewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-slate-600" />
                <span>Vista Completa</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {engineViewMode === 'dashboard'
                  ? 'Dashboard Interactivo de Desglose de Ratios Activo'
                  : engineViewMode === 'semaphores'
                  ? 'Semáforos Contables Visibles'
                  : engineViewMode === 'visualizer'
                  ? 'Estructura Visual Activa'
                  : engineViewMode === 'chart'
                  ? 'Gráfica de Cotización en Vivo Activa'
                  : engineViewMode === 'formulas'
                  ? 'Guía de Fórmulas y Umbrales Activa'
                  : 'Modo Completo Unificado'}
              </span>
            </div>
          </div>

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

          {/* VISTA 3: GUÍA PEDAGÓGICA DE FÓRMULAS & UMBRALES VALUE */}
          {(engineViewMode === 'formulas' || engineViewMode === 'all') && (
            <FinancialFormulasGuide
              selectedCompany={selectedCompany}
              onSelectRatioForAnalysis={handleSelectRatioForAnalysis}
            />
          )}
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

            <PythonDataConsole
        isOpen={isLocalPythonOpen}
        onClose={() => setIsLocalPythonOpen(false)}
        initialTicker={selectedCompany?.ticker || 'KO'}
        onCompanyImported={onAddCustomCompany}
      />
    </div>
  );
};
