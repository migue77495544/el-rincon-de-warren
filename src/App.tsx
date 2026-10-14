import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { ViewModeProvider } from './context/ViewModeContext';
import { useViewMode } from './context/ViewModeContext';
import { ViewMode } from './types';
import { FundamentalEngine } from './components/FundamentalEngine';
import { PortfolioSimulator } from './components/PortfolioSimulator';
import { GamificationHub } from './components/GamificationHub';
import { ImpactEvaluationDashboard } from './components/ImpactEvaluationDashboard';
import { InstantFeedbackModal } from './components/InstantFeedbackModal';
import { MethodologyDocumentation } from './components/MethodologyDocumentation';
import { PythonDataConsole } from './components/PythonDataConsole';
import { SpotlightSearch } from './components/SpotlightSearch';
import { WarrenFAB } from './components/WarrenFAB';
import { OnboardingFlow } from './components/OnboardingFlow';
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
  const { mode: viewMode, setMode: setViewMode, toggleMode, flags, enableAnalystForSection } = useViewMode();
  const [activeTab, setActiveTab] = useState<AppTab>('fundamental');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isPythonConsoleOpen, setIsPythonConsoleOpen] = useState(false);
  const [pythonConsoleTicker, setPythonConsoleTicker] = useState('KO');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync default tab based on view mode
  useEffect(() => {
    if (viewMode === 'simple' && (activeTab === 'simulator' || activeTab === 'impact')) {
      setActiveTab('fundamental');
    }
  }, [viewMode, activeTab]);

  // Listen for progressive disclosure events from VitalSigns
  useEffect(() => {
    const handleToggleToAnalyst = () => {
      enableAnalystForSection('fundamental');
      // Show a toast-like message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[var(--z-modal)] bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-[var(--shadow-modal)] text-xs';
      toast.innerHTML = '<span class="font-semibold text-slate-900">Modo Analista activado</span><br><span class="text-slate-500">Ahora ves todos los ratios y simuladores</span>';
      document.body.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3000);
    };
    window.addEventListener('warren:toggle-to-analyst', handleToggleToAnalyst);
    return () => window.removeEventListener('warren:toggle-to-analyst', handleToggleToAnalyst);
  }, [enableAnalystForSection]);

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
    sharpeRatio: 1.35,
    volatilidadMuestral: 0.068,
    expectedReturn: 0.132,
    riskFreeRate: 0.04,
    averageCompanyScore: 84,
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
      });
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
        returnsHistory: [0.012, 0.008, 0.019, -0.004, 0.015, 0.021, 0.014, 0.009, 0.018, 0.011, 0.016, 0.02],
        riskFreeRate: 0.04
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
      sharpeRatio: 1.35,
      volatilidadMuestral: 0.068,
      expectedReturn: 0.132,
      averageCompanyScore: 84,
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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-sans selection:bg-blue-50 selection:text-accent">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userXP={userXP}
        userLevel={userLevel}
        motivationIndex={motivationIndex}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenPythonConsole={() => {
          setPythonConsoleTicker(selectedCompany?.ticker || 'KO');
          setIsPythonConsoleOpen(true);
        }}
        showGamificationHUD={true}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            onOpenPythonConsole={(ticker) => {
              setPythonConsoleTicker(ticker || selectedCompany?.ticker || 'KO');
              setIsPythonConsoleOpen(true);
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
      </main>

      {/* Spotlight Search */}
      {isSearchOpen && (
        <SpotlightSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          companies={companies}
          onSelectCompany={(comp) => {
            setSelectedCompany(comp);
            setActiveTab('fundamental');
          }}
          onNavigateTab={setActiveTab}
          onSelectForSimulation={handleSelectForSimulation}
          onOpenCustomCompanyModal={() => setIsCustomModalOpen(true)}
        />
      )}

      {/* Python Data Console Modal */}
      <PythonDataConsole
        isOpen={isPythonConsoleOpen}
        onClose={() => setIsPythonConsoleOpen(false)}
        initialTicker={pythonConsoleTicker}
        onCompanyImported={(comp) => {
          handleAddCustomCompany(comp);
          setSelectedCompany(comp);
        }}
        onApplyPortfolioWeights={handleApplyMarkowitzAllocations}
      />

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
        <WarrenFAB onOpenPythonConsole={() => {
          setPythonConsoleTicker(selectedCompany?.ticker || 'KO');
          setIsPythonConsoleOpen(true);
        }} />
      )}

      {/* Onboarding Flow - first visit in Simple mode */}
      <OnboardingFlow />

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-6 text-center text-xs text-slate-500">
        <p className="max-w-xl mx-auto px-4 leading-relaxed">
          <strong>El Rincón de Warren</strong> · Prototipo de Educación Financiera en Value Investing y Econometría Conductual.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ViewModeProvider>
      <AppContent />
    </ViewModeProvider>
  );
}
