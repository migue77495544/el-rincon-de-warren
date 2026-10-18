import React, { useRef, useState } from 'react';
import {
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Users,
  ChevronDown,
  Info,
  Sparkles,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Building2,
  HelpCircle,
  Coins,
  Wifi,
  Cpu
} from 'lucide-react';
import { CompanyAnalysis } from '../types';
import { ModeloNegocio, identifyCompany } from '../utils/dualAdvisorEngine';
import { postJson, errorMessage } from '../utils/api';

// Algo por encima del timeout del servidor para los asesores (45 s)
// El servidor corta a los 50 s; Netlify, a los 60 s
const ADVISOR_CLIENT_TIMEOUT_MS = 58000;

interface JairoGuillermoConsultProps {
  companies: CompanyAnalysis[];
  isSimpleView?: boolean;
}

type ViewMode = 'initial' | 'diagnosis' | 'specific';
type Advisor = 'jairo' | 'guillermo';

interface DualResponse {
  success: boolean;
  pregunta: string;
  ticker?: string | null;
  empresaNombre?: string;
  modeloNegocio?: ModeloNegocio;
  respuesta_jairo: string;
  respuesta_guillermo: string;
  sintesis: string;
  convergencia: 'acuerdo' | 'divergencia';
  source?: 'gemini-live' | 'motor-analitico';
  metricasClave?: {
    precio: number;
    per?: number | string;
    roe?: number | string;
    deudaEbitda?: number | string;
    rsi?: number;
    ema50?: number;
    ema40?: number;
    ema200?: number;
    macd?: string;
    soporte?: number;
    resistencia?: number;
    riesgoBeneficio?: string;
  };
  error?: string;
}

interface SingleResponse {
  success: boolean;
  pregunta: string;
  ticker?: string | null;
  empresaNombre?: string;
  modeloNegocio?: ModeloNegocio;
  respuesta: string;
  source?: 'gemini-live' | 'motor-analitico';
  metricasClave?: Record<string, unknown>;
  error?: string;
}

// Estado del chat puntual de un asesor (independiente del otro asesor)
interface AdvisorChat {
  loading: boolean;
  pregunta: string;
  result: SingleResponse | null;
  error: string | null;
}

const EMPTY_CHAT: AdvisorChat = { loading: false, pregunta: '', result: null, error: null };

function AdvisorCard({
  name,
  role,
  roleColor,
  avatar,
  response,
  isLoading,
  specialtyTag,
  icon: Icon,
  isSimpleView = false,
  chat,
  onRetry
}: {
  name: string;
  role: string;
  roleColor: string;
  avatar: string;
  response: string;
  isLoading: boolean;
  specialtyTag: string;
  icon: any;
  isSimpleView?: boolean;
  // Solo en consultas puntuales: pregunta, fuente y error propios de este asesor
  chat?: AdvisorChat;
  onRetry?: () => void;
}) {
  return (
    <div className={`flex-1 min-w-0 rounded-lg border-2 ${roleColor} bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
      <div className={`flex items-center justify-between px-4 py-3.5 border-b-2 ${roleColor} ${isSimpleView ? 'bg-slate-50' : 'bg-white'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0 ${isSimpleView ? 'bg-slate-700' : 'bg-amber-700 shadow-amber-500/30'}`}>
            {avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            <p className={`text-xs font-semibold truncate ${isSimpleView ? 'text-slate-600' : 'text-orange-700'}`}>{role}</p>
          </div>
        </div>
        <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs shrink-0 ${isSimpleView ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-white/80 border border-orange-200 text-orange-800'}`}>
          <Icon className={`w-3 h-3 ${isSimpleView ? 'text-slate-600' : 'text-orange-600'}`} />
          {specialtyTag}
        </span>
      </div>

      <div className="p-4.5 flex-1 min-h-[190px] flex flex-col justify-between">
        {chat?.pregunta && (
          <div className="mb-3 pb-3 border-b border-slate-100 space-y-1.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Tu pregunta:</strong> {chat.pregunta}
            </p>
            {chat.result && !isLoading && (
              <div className="flex flex-wrap items-center gap-1.5">
                {chat.result.ticker && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-orange-600 text-white font-semibold font-mono">
                    {chat.result.ticker}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  chat.result.source === 'gemini-live'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {chat.result.source === 'gemini-live' ? <Wifi className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                  {chat.result.source === 'gemini-live' ? 'Gemini Live' : 'Motor Analítico'}
                </span>
              </div>
            )}
          </div>
        )}
        {chat?.error && !isLoading ? (
          <div className="my-auto py-6 text-center space-y-2">
            <p className="text-xs font-semibold text-rose-700">{chat.error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center w-full gap-2.5 py-10 text-slate-500 my-auto">
            <Loader2 className={`w-7 h-7 animate-spin ${isSimpleView ? 'text-slate-500' : 'text-amber-500'}`} />
            <span className="text-xs font-semibold text-slate-500">
              Consultando perspectiva de {name.split(' ')[0]}...
            </span>
          </div>
        ) : response ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
              {response}
            </div>
          </div>
        ) : (
          <div className="my-auto py-6 text-center">
            <p className="text-xs text-slate-500 italic">
              La respuesta aparecerá aquí cuando envíes tu consulta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const JairoGuillermoConsult: React.FC<JairoGuillermoConsultProps> = ({ companies, isSimpleView = false }) => {
  const [pregunta, setPregunta] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  // Cada asesor tiene su propio chat: pregunta, respuesta, carga y error no se comparten
  const [chats, setChats] = useState<Record<Advisor, AdvisorChat>>({ jairo: EMPTY_CHAT, guillermo: EMPTY_CHAT });
  const [diagnosis, setDiagnosis] = useState<DualResponse | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('initial');
  const [error, setError] = useState<string | null>(null);
  // Identificador de la última petición de cada canal: descarta respuestas que llegan tarde
  const requestIds = useRef({ jairo: 0, guillermo: 0, diagnosis: 0 });

  const patchChat = (advisor: Advisor, patch: Partial<AdvisorChat>) =>
    setChats(prev => ({ ...prev, [advisor]: { ...prev[advisor], ...patch } }));

  const isLoading = diagnosisLoading || chats.jairo.loading || chats.guillermo.loading;
  const hasResults = !!(diagnosis || chats.jairo.result || chats.guillermo.result);
  const hasChatError = !!(chats.jairo.error || chats.guillermo.error);

  const knownTickers: Set<string> = React.useMemo(() => {
    const set = new Set<string>();
    companies.forEach(c => set.add(c.ticker.toUpperCase()));
    const popular = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK.B', 'KO', 'JNJ', 'WMT', 'DIS', 'NFLX', 'AMD', 'INTC', 'PLTR', 'NKE', 'MCD', 'SBUX', 'V', 'MA', 'JPM', 'XOM'];
    popular.forEach(t => set.add(t));
    return set;
  }, [companies]);

  const detectTickerFromText = (text: string): string | null => {
    const normalized = text.toUpperCase();
    for (const ticker of knownTickers) {
      const escapedTicker = ticker.replace('.', '\\.');
      const regex = new RegExp(`\\b${escapedTicker}\\b`, 'i');
      if (regex.test(normalized)) {
        return ticker;
      }
    }
    const wordRegex = /\b([A-Z]{2,5})(\.B)?\b/g;
    let match;
    while ((match = wordRegex.exec(normalized)) !== null) {
      const candidate = match[1] + (match[2] || '');
      if (knownTickers.has(candidate)) {
        return candidate;
      }
    }
    const identified = identifyCompany(text, undefined, companies);
    return identified?.ticker || null;
  };

  const handleDiagnosis = async () => {
    if (!selectedTicker) {
      setError('Selecciona una empresa para generar el diagnóstico general.');
      return;
    }

    // El diagnóstico ocupa ambas tarjetas: invalida las consultas puntuales en curso y las limpia
    const requestId = ++requestIds.current.diagnosis;
    requestIds.current.jairo++;
    requestIds.current.guillermo++;
    setChats({ jairo: EMPTY_CHAT, guillermo: EMPTY_CHAT });
    setDiagnosisLoading(true);
    setError(null);
    setDiagnosis(null);
    setViewMode('diagnosis');

    const ticker = selectedTicker;
    const q = 'Diagnóstico: Evaluación completa del negocio. Jairo analiza el modelo de negocio, estados financieros y creación de valor; Juan Guillermo analiza la acción del precio, tendencias y operativa de trading.';
    const isCurrent = () => requestIds.current.diagnosis === requestId;

    try {
      const data = await postJson<DualResponse>('/api/python/consulta-dual', { pregunta: q, ticker }, ADVISOR_CLIENT_TIMEOUT_MS);
      if (isCurrent()) setDiagnosis(data);
    } catch (err) {
      // Sin respuesta real no se muestra un diagnóstico estimado: se informa el error
      if (isCurrent()) setError(errorMessage(err, 'No se pudo generar el diagnóstico. Reintenta la consulta.'));
    } finally {
      if (isCurrent()) setDiagnosisLoading(false);
    }
  };

  const handleSingleQuestion = async (advisor: Advisor, retryQuestion?: string) => {
    const q = (retryQuestion ?? pregunta).trim();
    if (!q) return;

    let resolvedTicker = selectedTicker;
    if (!resolvedTicker) {
      const detected = detectTickerFromText(q);
      if (!detected) {
        setError('Por favor selecciona o menciona una empresa para realizar la consulta.');
        return;
      }
      resolvedTicker = detected;
      setSelectedTicker(detected);
    }

    // Solo se toca el canal del asesor elegido; el chat del otro asesor queda intacto.
    const requestId = ++requestIds.current[advisor];
    const isCurrent = () => requestIds.current[advisor] === requestId;
    patchChat(advisor, { loading: true, pregunta: q, result: null, error: null });
    setError(null);
    if (diagnosis || diagnosisLoading) {
      requestIds.current.diagnosis++;
      setDiagnosis(null);
      setDiagnosisLoading(false);
    }
    setViewMode('specific');

    const endpoint = advisor === 'jairo' ? '/api/python/consulta-jairo' : '/api/python/consulta-guillermo';

    try {
      const data = await postJson<SingleResponse>(endpoint, { pregunta: q, ticker: resolvedTicker || undefined }, ADVISOR_CLIENT_TIMEOUT_MS);
      if (isCurrent()) patchChat(advisor, { result: data, loading: false });
    } catch (err) {
      if (isCurrent()) {
        patchChat(advisor, { loading: false, error: errorMessage(err, 'No se pudo procesar la consulta. Reintenta.') });
      }
    }
  };

  const reset = () => {
    requestIds.current.jairo++;
    requestIds.current.guillermo++;
    requestIds.current.diagnosis++;
    setChats({ jairo: EMPTY_CHAT, guillermo: EMPTY_CHAT });
    setDiagnosis(null);
    setDiagnosisLoading(false);
    setError(null);
    setPregunta('');
    setViewMode('initial');
  };

  const resultViewMode: ViewMode = diagnosis || diagnosisLoading ? 'diagnosis' : viewMode;
  const isDiagnosisView = resultViewMode === 'diagnosis';

  const isGeminiLive = diagnosis?.source === 'gemini-live';
  // Cada botón solo se bloquea por la consulta de su propio asesor (o por el diagnóstico dual)
  const jairoBusy = diagnosisLoading || chats.jairo.loading;
  const guillermoBusy = diagnosisLoading || chats.guillermo.loading;

  return (
    <section id="jairo-guillermo-consult" className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isSimpleView ? 'border-slate-200' : 'border-orange-200/90'}`}>
      {/* Encabezado */}
      <div className={`px-6 py-5 ${isSimpleView ? 'bg-slate-50 border-b border-slate-200' : 'bg-white border-b border-orange-200/80'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md shrink-0 text-white ${isSimpleView ? 'bg-slate-800' : 'bg-amber-700'}`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Consulta a Jairo y Juan Guillermo
                </h2>
                {!isSimpleView && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-semibold flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-orange-600" />
                    Fundamental + Técnico
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {!isSimpleView
                  ? <>Dos perspectivas sobre la misma empresa: <strong className="font-semibold text-slate-900">Jairo Agudelo</strong> desde lo fundamental y <strong className="font-semibold text-slate-900">Juan Guillermo Hernández</strong> desde la operativa técnica.</>
                  : 'Dos asesores analíticos que te explican la empresa en lenguaje claro: Jairo desde lo fundamental y Juan Guillermo desde la operativa técnica.'}
              </p>
            </div>
          </div>

          {(!isSimpleView || hasResults || isLoading) && (
            <button
              onClick={reset}
              className="self-end sm:self-auto text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-semibold shadow-2xs"
              title="Nueva consulta"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva Consulta
            </button>
          )}
        </div>
      </div>

        <div className="p-6 space-y-5">
        {/* SECCIÓN 1: Diagnóstico del negocio */}
        <div className={`rounded-lg border-2 p-5 shadow-sm space-y-3 ${isSimpleView ? 'border-slate-200 bg-white' : 'border-amber-200/90 bg-white'} ${hasResults && !isSimpleView ? "opacity-30 pointer-events-none" : ""}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xs shrink-0 text-white ${isLoading ? "animate-pulse" : ""} ${isSimpleView ? 'bg-slate-700' : 'bg-amber-700'}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                Diagnóstico del negocio
                {!isSimpleView && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-semibold">
                    Doble Visión
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                {isSimpleView
                  ? 'Selecciona una empresa y obtén el diagnóstico integral desde las dos perspectivas.'
                  : 'Elegir una empresa genera un diagnóstico integral: modelo de negocio, salud financiera, ROE vs K_e, foso económico y análisis técnico con convergencia de visiones.'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  id="consult-ticker-selector-diagnosis"
                  value={selectedTicker}
                  onChange={e => setSelectedTicker(e.target.value)}
                  disabled={isLoading}
                  className="w-full appearance-none text-sm font-semibold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <option value="">Selecciona una empresa</option>
                  {companies.map(c => (
                    <option key={c.ticker} value={c.ticker}>
                      {c.ticker} — {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button
                id="btn-diagnostico-general"
                type="button"
                onClick={handleDiagnosis}
                disabled={isLoading || !selectedTicker}
                className={`flex items-center justify-center gap-2 px-5 py-2.75 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  isLoading || !selectedTicker
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                    : isSimpleView
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900'
                    : 'bg-amber-700 text-white hover:bg-amber-800 hover:shadow-md active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Generando diagnóstico...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Ver Diagnóstico</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-start gap-2.5 mb-3">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              <strong>Consulta puntual:</strong> Escribe tu pregunta específica sobre una empresa y elige con qué asesor consultar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <textarea
              id="consult-pregunta-input-specific"
              value={pregunta}
              onChange={e => setPregunta(e.target.value)}
              placeholder="¿Qué opinas del ROE de AAPL? ¿El momento es bueno para comprar?"
              rows={3}
              disabled={diagnosisLoading}
              className="flex-1 text-sm text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none transition-all placeholder:text-slate-500 shadow-2xs disabled:opacity-50"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (pregunta.trim() && !jairoBusy) {
                    handleSingleQuestion('jairo');
                  }
                }
              }}
            />

            <div className="flex flex-col gap-2.5 sm:justify-between">
              <button
                type="button"
                data-advisor="jairo"
                onClick={() => handleSingleQuestion('jairo')}
                disabled={jairoBusy || !pregunta.trim()}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  jairoBusy || !pregunta.trim()
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                    : 'border-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 cursor-pointer'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Preguntar a Jairo</span>
              </button>
              <button
                type="button"
                data-advisor="guillermo"
                onClick={() => handleSingleQuestion('guillermo')}
                disabled={guillermoBusy || !pregunta.trim()}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  guillermoBusy || !pregunta.trim()
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                    : 'border-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 cursor-pointer'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Preguntar a Guangui</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold">{error}</p>
            </div>
            {/* Los errores de una consulta puntual se reintentan desde la tarjeta de su asesor */}
            {isDiagnosisView && (
              <button
                onClick={handleDiagnosis}
                className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {/* Contenedor de resultados */}
        {(hasResults || isLoading || hasChatError) && (
          <div className="space-y-4 pt-2">
            {/* Ticker, nombre y fuente */}
            {diagnosis?.ticker && !diagnosisLoading && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-orange-50/70 border border-orange-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-600 text-white font-semibold font-mono shadow-2xs">
                    {diagnosis.ticker}
                  </span>
                  {diagnosis.empresaNombre && (
                    <span className="text-xs font-bold text-slate-800">
                      {diagnosis.empresaNombre}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                    isGeminiLive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {isGeminiLive ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span>Gemini Live</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3 h-3" />
                        <span>Motor Analítico</span>
                      </>
                    )}
                  </span>


                </div>
              </div>
            )}

            {/* Modelo de Negocio (solo en Diagnóstico y no en Simple mode) */}
            {diagnosis && !isSimpleView && diagnosis.modeloNegocio && !diagnosisLoading && (
              <div className="rounded-lg border-2 border-orange-200/90 bg-white p-4.5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                        Modelo de Negocio: {diagnosis.empresaNombre || diagnosis.ticker || 'Análisis del Emisor'}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-semibold">
                          Diagnóstico
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Regla de oro de Warren Buffett: nunca inviertas en un negocio sin entender primero con claridad meridiana qué vende y de dónde proviene su dinero.
                      </p>
                    </div>
                  </div>
                  {diagnosis.modeloNegocio.sector && (
                    <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                      Sector: <strong className="text-slate-900">{diagnosis.modeloNegocio.sector}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="bg-white/95 rounded-xl p-3.5 border border-amber-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-1">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>1. ¿Qué hace la compañía? (Actividad Principal)</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {diagnosis.modeloNegocio.queHace}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/95 rounded-xl p-3.5 border border-emerald-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 mb-1">
                        <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>2. ¿Cómo gana dinero? (Fuentes de Monetización)</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {diagnosis.modeloNegocio.comoGanaDinero}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tarjetas de analistas */}
            <div className="flex flex-col md:flex-row gap-4">
              <AdvisorCard
                name="Jairo Agudelo"
                role={isDiagnosisView ? "Análisis Fundamental · Macroeconomía" : "Respuesta Específica"}
                roleColor={isDiagnosisView ? "border-amber-300" : "border-slate-300"}
                avatar="JA"
                specialtyTag={isDiagnosisView ? "Visión Fundamental" : "Consulta Puntual"}
                icon={ShieldCheck}
                response={isDiagnosisView ? (diagnosis?.respuesta_jairo ?? '') : (chats.jairo.result?.respuesta ?? '')}
                isLoading={jairoBusy}
                isSimpleView={isSimpleView}
                chat={isDiagnosisView ? undefined : chats.jairo}
                onRetry={() => handleSingleQuestion('jairo', chats.jairo.pregunta)}
              />
              <AdvisorCard
                name="Juan Guillermo Hernández (Guangui)"
                role={isDiagnosisView ? "Análisis Técnico · Operativa Bursátil" : "Respuesta Específica"}
                roleColor={isDiagnosisView ? "border-orange-300" : "border-slate-300"}
                avatar="JG"
                specialtyTag={isDiagnosisView ? "Visión Técnica" : "Consulta Puntual"}
                icon={TrendingUp}
                response={isDiagnosisView ? (diagnosis?.respuesta_guillermo ?? '') : (chats.guillermo.result?.respuesta ?? '')}
                isLoading={guillermoBusy}
                isSimpleView={isSimpleView}
                chat={isDiagnosisView ? undefined : chats.guillermo}
                onRetry={() => handleSingleQuestion('guillermo', chats.guillermo.pregunta)}
              />
            </div>

            {/* Síntesis / Convergencia (solo en diagnóstico general) */}
            {diagnosis && diagnosis.sintesis && !diagnosisLoading && (
              <div
                className={`rounded-lg border p-4.5 space-y-2 transition-all shadow-sm ${
                  diagnosis.convergencia === 'acuerdo'
                    ? 'bg-emerald-50/90 border-emerald-300'
                    : 'bg-amber-50/90 border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {diagnosis.convergencia === 'acuerdo' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      diagnosis.convergencia === 'acuerdo' ? 'text-emerald-800' : 'text-amber-900'
                    }`}
                  >
                    {diagnosis.convergencia === 'acuerdo'
                      ? 'Convergencia de visiones — Ambos asesores coinciden'
                      : 'Resolución de Divergencia — "Qué Comprar" vs "Cuándo Comprar"'}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed font-medium ${
                    diagnosis.convergencia === 'acuerdo' ? 'text-emerald-950' : 'text-amber-950'
                  }`}
                >
                  {diagnosis.sintesis}
                </p>
              </div>
            )}

            {/* Nota y Descargo de Responsabilidad */}
            {hasResults && !isLoading && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-700">Nota metodológica:</strong> Jairo Agudelo y Juan Guillermo Hernández son <em>perfiles analíticos de referencia integrados</em> inspirados en su filosofía divulgativa y operativa. Sus respuestas se basan en datos financieros reales, ratios contables y parámetros técnicos estandarizados con fines estrictamente pedagógicos y formativos. <strong>No constituyen asesoría financiera personalizada ni recomendación vinculante.</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial con las tarjetas de advisor */}
        {!hasResults && !isLoading && !hasChatError && !error && (
          <div className="flex flex-col md:flex-row gap-4 opacity-50 pointer-events-none select-none">
            <AdvisorCard
              name="Jairo Agudelo"
              role="Análisis Fundamental · Macroeconomía"
              roleColor="border-amber-200"
              avatar="JA"
              specialtyTag="Visión Fundamental"
              icon={ShieldCheck}
              response=""
              isLoading={false}
              isSimpleView={isSimpleView}
            />
            <AdvisorCard
              name="Juan Guillermo Hernández (Guangui)"
              role="Análisis Técnico · Operativa Bursátil"
              roleColor="border-orange-200"
              avatar="JG"
              specialtyTag="Visión Técnica"
              icon={TrendingUp}
              response=""
              isLoading={false}
              isSimpleView={isSimpleView}
            />
          </div>
        )}
      </div>
    </section>
  );
};