import React, { useState, useEffect, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { Navbar, AppTab } from './components/Navbar';
import { ViewModeProvider } from './context/ViewModeContext';
import { useViewMode } from './context/ViewModeContext';
import { ViewMode } from './types';
import { FundamentalEngine } from './components/FundamentalEngine';
import { InstantFeedbackModal } from './components/InstantFeedbackModal';
import { WarrenFAB } from './components/WarrenFAB';
import { OPEN_SEARCH_EVENT } from './utils/events';
import {
  CompanyAnalysis,
  PortfolioStats,
  PortfolioHolding,
  PortfolioTransaction,
  GamificationState,
  Badge,
  LearningStep,
  InvestmentThesis,
  LeagueCompetitor
} from './types';
import {
  INITIAL_COMPANIES,
  INITIAL_BADGES,
  INITIAL_LEARNING_STEPS,
  INITIAL_LEAGUE,
  INITIAL_THESES
} from './data/initialData';
import {
  calculateFundamentalRatios,
  calculateLinearScore
} from './utils/financialCalculations';

// Secciones que no se ven al entrar: se descargan solo cuando el usuario las abre
const PortfolioSimulator = lazy(() => import('./components/PortfolioSimulator').then(m => ({ default: m.PortfolioSimulator })));
const GamificationHub = lazy(() => import('./components/GamificationHub').then(m => ({ default: m.GamificationHub })));
const ImpactEvaluationDashboard = lazy(() => import('./components/ImpactEvaluationDashboard').then(m => ({ default: m.ImpactEvaluationDashboard })));
const MethodologyDocumentation = lazy(() => import('./components/MethodologyDocumentation').then(m => ({ default: m.MethodologyDocumentation })));
const SpotlightSearch = lazy(() => import('./components/SpotlightSearch').then(m => ({ default: m.SpotlightSearch })));
const SuperOpportunities = lazy(() => import('./components/SuperOpportunities').then(m => ({ default: m.SuperOpportunities })));

function CargandoSeccion() {
  return (
    <div className="py-24 flex justify-center" role="status" aria-live="polite">
      <span className="text-sm text-tinta-500">Cargando sección…</span>
    </div>
  );
}

const INITIAL_COMPUTED_COMPANIES: CompanyAnalysis[] = INITIAL_COMPANIES.map(seed => {
  const ratios = calculateFundamentalRatios(seed.raw);
  const scoreData = calculateLinearScore(ratios);

  return {
    id: seed.id,
    ticker: seed.ticker,
    nombre: seed.nombre,
    sector: seed.sector,
    descripcion: seed.descripcion,
    moat: seed.moat,
    raw: seed.raw,
    ratios,
    dimensiones: scoreData.dimensions,
    linearScore: scoreData.score,
    scoreGrade: scoreData.grade,
    targetConsensus: seed.targetConsensus,
    warrenVerdict: seed.warrenVerdict
  };
});

function AppContent() {
  const { mode: viewMode, setMode: setViewMode } = useViewMode();
  const [activeTab, setActiveTab] = useState<AppTab>('fundamental');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync default tab based on view mode
  useEffect(() => {
    if (viewMode === 'simple' && (activeTab === 'simulator' || activeTab === 'impact' || activeTab === 'opportunities')) {
      setActiveTab('fundamental');
    }
  }, [viewMode, activeTab]);

  // Aviso breve al cambiar de modo desde un enlace de la propia página
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!modeNotice) return;
    const timer = setTimeout(() => setModeNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [modeNotice]);

  // «Cambiar a Modo Analista» desde VitalSigns o la ficha simple
  useEffect(() => {
    const handleToggleToAnalyst = () => {
      setViewMode('analyst');
      setModeNotice('Estás en Modo Analista. Vuelve a Simple desde la barra superior cuando quieras.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('warren:toggle-to-analyst', handleToggleToAnalyst);
    return () => window.removeEventListener('warren:toggle-to-analyst', handleToggleToAnalyst);
  }, [setViewMode]);

  // Cualquier parte de la app puede abrir el buscador de empresas (p. ej. «Primeros pasos»)
  useEffect(() => {
    const abrir = () => setIsSearchOpen(true);
    window.addEventListener(OPEN_SEARCH_EVENT, abrir);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, abrir);
  }, []);

  // Ctrl+K / Cmd+K abre el buscador desde cualquier pantalla
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Module 1 Data
  const [companies, setCompanies] = useState<CompanyAnalysis[]>(INITIAL_COMPUTED_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<CompanyAnalysis>(INITIAL_COMPUTED_COMPANIES[0]);

  // Module 2 Data: Portfolio Simulation
  const [portfolio, setPortfolio] = useState<PortfolioStats>({
    cash: 100000,
    investedValue: 0,
    totalValue: 100000,
    initialCapital: 100000,
    totalReturn: 0,
    totalReturnPercent: 0,
    holdings: [],
    transactions: [],
    // Sin posiciones no hay riesgo que medir: las métricas llegan del servidor con el histórico real
    sharpeRatio: 0,
    volatilidadMuestral: 0,
    expectedReturn: 0,
    riskFreeRate: 0.04,
    averageCompanyScore: 0,
    overtradingIndex: 0,
    detectedBiases: []
  });

  const [selectedTickerForTrade, setSelectedTickerForTrade] = useState<string>('BRK.B');

  // Module 3 Data: Gamification
  const [userXP, setUserXP] = useState<number>(450);
  const [userLevel, setUserLevel] = useState<number>(2);
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES);
  const [learningSteps, setLearningSteps] = useState<LearningStep[]>(INITIAL_LEARNING_STEPS);
  const [theses, setTheses] = useState<InvestmentThesis[]>(INITIAL_THESES);
  const [league, setLeague] = useState<LeagueCompetitor[]>(INITIAL_LEAGUE);
  const [motivationIndex, setMotivationIndex] = useState<number>(76);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    errorType: string;
    solution: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    errorType: '',
    solution: ''
  });

  const [instantFeedbackLogs, setInstantFeedbackLogs] = useState<any[]>([]);

  // Load Companies from Backend on Mount
  useEffect(() => {
    fetch('/api/companies')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
          setSelectedCompany(prev => {
            if (!prev) return data.companies[0];
            const existing = data.companies.find((c: any) => c.id === prev.id || c.ticker === prev.ticker);
            return existing || data.companies[0];
          });
        }
      })
      .catch(err => {
        console.warn('Utilizando catálogo local precalculado:', err);
      })
      // Cotizaciones y consenso del día: los datos semilla pueden tener semanas de antigüedad
      .then(() => fetch('/api/market/sync-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
      .then(res => (res && res.ok ? res.json() : null))
      .then(data => {
        if (data?.success && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
          setSelectedCompany(prev => data.companies.find((c: any) => c.id === prev?.id || c.ticker === prev?.ticker) || prev);
        }
      })
      .catch(err => console.warn('No se pudieron actualizar las cotizaciones al iniciar:', err));
  }, []);

  const recalculateMotivation = (addedXP: number = 0) => {
    const newXP = userXP + addedXP;
    setUserXP(newXP);
    if (newXP >= 1000 && userLevel < 3) setUserLevel(3);
    else if (newXP >= 500 && userLevel < 2) setUserLevel(2);

    fetch(`/api/gamification/motivation?colab=80&recomp=${Math.min(100, Math.round(newXP / 10))}&multi=65&progreso=70&feedback=85`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setMotivationIndex(data.predictedMotivation);
      })
      .catch(() => {
        setMotivationIndex(Math.min(95, 70 + Math.round(newXP / 50)));
      });
  };

  const handleExecuteTrade = (ticker: string, type: 'BUY' | 'SELL', shares: number) => {
    const stock = companies.find(c => c.ticker === ticker);
    if (!stock) return;

    const price = stock.raw.precioCotizacion;
    const totalCost = shares * price;

    let newCash = portfolio.cash;
    let newHoldings = [...portfolio.holdings];
    const existingIndex = newHoldings.findIndex(h => h.ticker === ticker);

    if (type === 'BUY') {
      if (newCash < totalCost) return;
      newCash -= totalCost;

      if (existingIndex >= 0) {
        const existing = newHoldings[existingIndex];
        const newTotalShares = existing.shares + shares;
        const newAvgPrice = ((existing.shares * existing.avgBuyPrice) + totalCost) / newTotalShares;
        newHoldings[existingIndex] = {
          ...existing,
          shares: newTotalShares,
          avgBuyPrice: newAvgPrice,
          currentPrice: price,
          totalValue: newTotalShares * price,
          unrealizedPnL: (price - newAvgPrice) * newTotalShares,
          unrealizedPnLPercent: ((price - newAvgPrice) / newAvgPrice) * 100
        };
      } else {
        newHoldings.push({
          ticker,
          shares,
          avgBuyPrice: price,
          currentPrice: price,
          totalValue: totalCost,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          linearScore: stock.linearScore
        });
      }
    } else {
      if (existingIndex < 0) return;
      const existing = newHoldings[existingIndex];
      if (existing.shares < shares) return;

      newCash += totalCost;
      if (existing.shares === shares) {
        newHoldings.splice(existingIndex, 1);
      } else {
        const remainingShares = existing.shares - shares;
        newHoldings[existingIndex] = {
          ...existing,
          shares: remainingShares,
          totalValue: remainingShares * price,
          unrealizedPnL: (price - existing.avgBuyPrice) * remainingShares,
          unrealizedPnLPercent: ((price - existing.avgBuyPrice) / existing.avgBuyPrice) * 100
        };
      }
    }

    const newInvestedValue = newHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const newTotalValue = newCash + newInvestedValue;
    const newTotalReturn = newTotalValue - portfolio.initialCapital;

    const avgScore = newHoldings.length > 0
      ? newHoldings.reduce((sum, h) => sum + (h.linearScore * h.totalValue), 0) / newInvestedValue
      : 80;

    fetch('/api/portfolio/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holdings: newHoldings,
        transactions: [...portfolio.transactions, {
          id: `tx-${Date.now()}`,
          ticker,
          type,
          shares,
          price,
          total: totalCost,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }],
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPortfolio({
            ...portfolio,
            cash: newCash,
            investedValue: newInvestedValue,
            totalValue: newTotalValue,
            totalReturn: newTotalReturn,
            totalReturnPercent: (newTotalReturn / portfolio.initialCapital) * 100,
            holdings: newHoldings,
            transactions: [...portfolio.transactions, {
              id: `tx-${Date.now()}`,
              ticker,
              type,
              shares,
              price,
              total: totalCost,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              biasFlag: ticker === 'HYPE' ? 'Sobreoperativa / Sin MoS' : undefined
            }],
            sharpeRatio: data.metrics.sharpeRatio,
            volatilidadMuestral: data.metrics.volatilidadMuestral,
            expectedReturn: data.metrics.expectedReturn,
            riskFreeRate: data.metrics.riskFreeRate ?? portfolio.riskFreeRate,
            averageCompanyScore: Math.round(avgScore),
            detectedBiases: data.detectedBiases
          });
        }
      })
      .catch(() => {
        setPortfolio({
          ...portfolio,
          cash: newCash,
          investedValue: newInvestedValue,
          totalValue: newTotalValue,
          totalReturn: newTotalReturn,
          totalReturnPercent: (newTotalReturn / portfolio.initialCapital) * 100,
          holdings: newHoldings,
          averageCompanyScore: Math.round(avgScore)
        });
      });

    recalculateMotivation(50);
  };

  const handleResetPortfolio = () => {
    setPortfolio({
      cash: 100000,
      investedValue: 0,
      totalValue: 100000,
      initialCapital: 100000,
      totalReturn: 0,
      totalReturnPercent: 0,
      holdings: [],
      transactions: [],
      sharpeRatio: 0,
      volatilidadMuestral: 0,
      expectedReturn: 0,
      riskFreeRate: portfolio.riskFreeRate,
      averageCompanyScore: 0,
      overtradingIndex: 0,
      detectedBiases: []
    });
  };

  const handleApplyMarkowitzAllocations = (allocations: { ticker: string; weight: number; shares: number; price: number }[]) => {
    let newCash = portfolio.totalValue > 0 ? portfolio.totalValue : 100000;
    const newHoldings: PortfolioHolding[] = [];
    const newTxList: PortfolioTransaction[] = [...portfolio.transactions];

    allocations.forEach(alloc => {
      if (alloc.shares > 0) {
        const stock = companies.find(c => c.ticker === alloc.ticker) || INITIAL_COMPUTED_COMPANIES.find(c => c.ticker === alloc.ticker);
        const cost = alloc.shares * alloc.price;
        if (newCash >= cost) {
          newCash -= cost;
          newHoldings.push({
            ticker: alloc.ticker,
            shares: alloc.shares,
            avgBuyPrice: alloc.price,
            currentPrice: alloc.price,
            totalValue: cost,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            linearScore: stock ? stock.linearScore : 85
          });
          newTxList.push({
            id: `tx-markowitz-${Date.now()}-${alloc.ticker}`,
            ticker: alloc.ticker,
            type: 'BUY',
            shares: alloc.shares,
            price: alloc.price,
            total: cost,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
    });

    const investedValue = newHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalValue = newCash + investedValue;
    const totalReturn = totalValue - portfolio.initialCapital;
    const avgScore = newHoldings.length > 0
      ? newHoldings.reduce((sum, h) => sum + (h.linearScore * h.totalValue), 0) / investedValue
      : 85;

    setPortfolio(prev => ({
      ...prev,
      cash: newCash,
      investedValue,
      totalValue,
      totalReturn,
      totalReturnPercent: (totalReturn / prev.initialCapital) * 100,
      holdings: newHoldings,
      transactions: newTxList,
      sharpeRatio: 1.68,
      volatilidadMuestral: 0.118,
      expectedReturn: 0.142,
      averageCompanyScore: Math.round(avgScore),
      detectedBiases: []
    }));

    recalculateMotivation(100);
  };

  const handleShowInstantFeedback = (title: string, message: string, errorType: string, solution: string) => {
    setFeedbackModal({
      isOpen: true,
      title,
      message,
      errorType,
      solution
    });

    setInstantFeedbackLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title,
        message,
        errorType,
        heuristicSolution: solution
      },
      ...prev
    ]);
  };

  const handleCreateThesis = (thesisData: Partial<InvestmentThesis>) => {
    fetch('/api/theses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...thesisData,
        author: 'Inversor Disciplinado (Tú)'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.thesis) {
          setTheses([data.thesis, ...theses]);
          setBadges(prev => prev.map(b => b.id === 'badge-community' ? { ...b, unlocked: true } : b));
          recalculateMotivation(200);
        }
      });
  };

  const handleUpvoteThesis = (id: string) => {
    fetch(`/api/theses/${id}/upvote`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTheses(theses.map(t => t.id === id ? { ...t, upvotes: data.upvotes } : t));
          recalculateMotivation(25);
        }
      });
  };

  const handleCompleteLearningStep = (stepId: number) => {
    setLearningSteps(learningSteps.map(s => s.id === stepId ? { ...s, completed: true } : s));
    recalculateMotivation(200);
  };

  const handleAddCustomCompany = (custom: CompanyAnalysis) => {
    setCompanies(prev => {
      const exists = prev.some(c => c.id === custom.id || c.ticker === custom.ticker);
      if (exists) {
        return prev.map(c => (c.id === custom.id || c.ticker === custom.ticker) ? custom : c);
      }
      return [custom, ...prev];
    });
    setSelectedCompany(custom);
  };

  const handleSelectForSimulation = (ticker: string) => {
    setSelectedTickerForTrade(ticker);
    setActiveTab('simulator');
  };

  return (
    <div data-mode={viewMode} className="min-h-screen bg-papel text-slate-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userXP={userXP}
        userLevel={userLevel}
        motivationIndex={motivationIndex}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        showGamificationHUD={true}
      />

      {modeNotice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[var(--z-modal)] max-w-[calc(100vw-32px)] flex items-center gap-3 bg-slate-900 text-slate-100 rounded-xl px-4 py-3 shadow-xl text-xs animate-fadeIn"
        >
          <span>{modeNotice}</span>
          <button
            type="button"
            onClick={() => setModeNotice(null)}
            className="text-amber-300 font-semibold hover:text-amber-200 shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div key={activeTab}>
        <Suspense fallback={<CargandoSeccion />}>
        {activeTab === 'fundamental' && (
          <FundamentalEngine
            companies={companies.length > 0 ? companies : INITIAL_COMPUTED_COMPANIES}
            selectedCompany={selectedCompany || companies[0] || INITIAL_COMPUTED_COMPANIES[0]}
            onSelectCompany={setSelectedCompany}
            onAddCustomCompany={handleAddCustomCompany}
            onSelectForSimulation={handleSelectForSimulation}
            customModalOpen={isCustomModalOpen}
            onCloseCustomModal={() => setIsCustomModalOpen(false)}
            onUpdateCompanies={setCompanies}
          />
        )}

        {activeTab === 'opportunities' && viewMode === 'analyst' && (
          <SuperOpportunities
            onLoadCompany={(company) => {
              handleAddCustomCompany(company);
              setActiveTab('fundamental');
            }}
          />
        )}

        {activeTab === 'simulator' && (
          <PortfolioSimulator
            companies={companies}
            portfolio={portfolio}
            onExecuteTrade={handleExecuteTrade}
            onResetPortfolio={handleResetPortfolio}
            selectedTickerForTrade={selectedTickerForTrade}
            onShowInstantFeedback={handleShowInstantFeedback}
            onApplyMarkowitzAllocations={handleApplyMarkowitzAllocations}
            onNavigateToMethodology={() => setActiveTab('methodology')}
          />
        )}

        {activeTab === 'gamification' && (
          <GamificationHub
            gamificationState={{
              userXP,
              userLevel,
              nextLevelXP: 1000,
              badges,
              motivationIndex,
              modelWeights: { colab: 0.320, recomp: 0.307, multi: 0.239, progreso: 0.235, feedback: 0.151 },
              validationMetrics: { cronbachAlpha: 0.884, kmo: 0.862, bartlettPValue: 0.0001 },
              instantFeedbackLogs
            }}
            theses={theses}
            badges={badges}
            learningSteps={learningSteps}
            league={league}
            onUpvoteThesis={handleUpvoteThesis}
            onCreateThesis={handleCreateThesis}
            onCompleteLearningStep={handleCompleteLearningStep}
            onAddXP={recalculateMotivation}
            onTriggerFeedbackDemo={() => {
              handleShowInstantFeedback(
                'Alerta de Sesgo: Exceso de Confianza',
                'Warren Buffett recuerda: "Lo que cuenta para la mayoría no es cuánto saben, sino con qué realismo definen lo que no saben".',
                'Exceso de Confianza & Anclaje',
                'Define siempre tu Círculo de Competencia y mantén un margen de seguridad amplio.'
              );
            }}
          />
        )}

        {activeTab === 'impact' && (
          <ImpactEvaluationDashboard />
        )}

        {activeTab === 'methodology' && (
          <MethodologyDocumentation />
        )}
        </Suspense>
        </div>
      </main>

      {/* Spotlight Search */}
      {isSearchOpen && (
        <Suspense fallback={null}>
        <SpotlightSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          companies={companies}
          onSelectCompany={(comp) => {
            setSelectedCompany(comp);
            setActiveTab('fundamental');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onCompanyImported={(comp) => {
            handleAddCustomCompany(comp);
            setActiveTab('fundamental');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateTab={setActiveTab}
        />
        </Suspense>
      )}

      {/* Instant Feedback Modal */}
      <InstantFeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        title={feedbackModal.title}
        message={feedbackModal.message}
        errorType={feedbackModal.errorType}
        solution={feedbackModal.solution}
      />

      {/* Warren FAB (FAQ + help) - only visible in Analyst mode */}
      {viewMode === 'analyst' && (
        <WarrenFAB />
      )}


      <footer className="border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="m-0">
            <span className="font-serif font-semibold text-slate-700">El Rincón de Warren</span>
            {' '}es un prototipo educativo de Value Investing y econometría conductual.
          </p>
          <p className="m-0 text-slate-500">No constituye asesoramiento financiero.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ViewModeProvider>
        <AppContent />
      </ViewModeProvider>
    </MotionConfig>
  );
}
