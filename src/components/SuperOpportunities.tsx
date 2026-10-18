import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Factory,
  Flame,
  HeartPulse,
  Info,
  Loader2,
  Mountain,
  Radio,
  RefreshCw,
  Rocket,
  ShoppingBag,
  ShoppingCart,
  XCircle
} from 'lucide-react';
import { CompanyAnalysis, SuperOpportunitiesScan, SuperOpportunity } from '../types';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { industriaEs } from '../utils/industrias';

interface SuperOpportunitiesProps {
  /** Recibe la empresa importada con datos reales para abrirla en el análisis fundamental (DCF/CAPM). */
  onLoadCompany: (company: CompanyAnalysis) => void;
}

const POLL_MS = 8000;

const SECTOR_ICONS: Record<string, React.ElementType> = {
  'Technology': Cpu,
  'Communication Services': Radio,
  'Consumer Cyclical': ShoppingBag,
  'Consumer Defensive': ShoppingCart,
  'Healthcare': HeartPulse,
  'Industrials': Factory,
  'Energy': Flame,
  'Basic Materials': Mountain
};

const SECTOR_LABELS: Record<string, string> = {
  'Technology': 'Tecnología',
  'Communication Services': 'Comunicaciones',
  'Consumer Cyclical': 'Consumo discrecional',
  'Consumer Defensive': 'Consumo básico',
  'Healthcare': 'Salud',
  'Industrials': 'Industria',
  'Energy': 'Energía',
  'Basic Materials': 'Materiales'
};

const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? 'N/D' : `${v.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;

const fmtUsd = (v: number | null | undefined) =>
  v === null || v === undefined ? 'N/D' : `$${v.toLocaleString('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const fmtFecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '';

function scoreTone(score: number) {
  if (score >= 75) return { ring: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Excepcional' };
  if (score >= 60) return { ring: 'border-blue-200 bg-blue-50 text-accent', label: 'Muy sólida' };
  return { ring: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Sólida' };
}

// Comparativa Precio vs Valor intrínseco: dos barras sobre la misma escala en USD
const PriceVsValueChart: React.FC<{ op: SuperOpportunity }> = ({ op }) => {
  const valor = op.valorIntrinseco ?? 0;
  const max = Math.max(op.precio, valor, op.valorDcf ?? 0, op.valorGraham ?? 0) || 1;
  const rows = [
    { label: 'Precio actual', value: op.precio, bar: 'bg-slate-400' },
    { label: 'Valor intrínseco', value: valor, bar: 'bg-[var(--color-success)]' }
  ];
  return (
    <div className="space-y-2" role="img" aria-label={`Precio ${fmtUsd(op.precio)} frente a valor intrínseco ${fmtUsd(valor)}`}>
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[96px_1fr_auto] items-center gap-2" title={`${r.label}: ${fmtUsd(r.value)}`}>
          <span className="text-xs text-slate-500">{r.label}</span>
          <div className="h-3 rounded-r bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-r ${r.bar}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-900 w-20 text-right">{fmtUsd(r.value)}</span>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
        <span>
          DCF {fmtUsd(op.valorDcf)} · Graham {fmtUsd(op.valorGraham)}
          {op.metodoValoracion && <span className="text-slate-500"> · se usa {op.metodoValoracion}</span>}
        </span>
        <span className="font-semibold text-[var(--color-success)]">
          Upside {fmtPct(op.upsidePct, 0)} · descuento {fmtPct(op.descuentoPct, 0)}
        </span>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; ok: boolean; hint: string }> = ({ label, value, ok, hint }) => (
  <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-slate-50" title={hint}>
    <div className="text-xs text-slate-500 font-semibold">{label}</div>
    <div className="flex items-center gap-1 mt-0.5">
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
      <span className="text-sm font-bold font-mono text-slate-900">{value}</span>
    </div>
  </div>
);

const OpportunityCard: React.FC<{
  op: SuperOpportunity;
  rank: number;
  loading: boolean;
  error?: string;
  onLoad: () => void;
}> = ({ op, rank, loading, error, onLoad }) => {
  const [expanded, setExpanded] = useState(false);
  const SectorIcon = SECTOR_ICONS[op.sector] || Building2;
  const tone = scoreTone(op.score);
  const calidadRoic = op.roicPct !== null && op.roicPct > 15;
  const activos = op.catalizadores.filter(c => c.activo);

  return (
    <article className="p-5 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)] flex flex-col gap-4">
      {/* Cabecera: identidad + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center">
            <SectorIcon className="w-4 h-4 opacity-80" />
            <span className="text-xs font-bold font-mono leading-tight">{op.ticker}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">#{rank}</span>
              <h3 className="font-bold text-slate-900 truncate">{op.nombre}</h3>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {op.ticker} · {SECTOR_LABELS[op.sector] || op.sector}{op.industria ? ` · ${industriaEs(op.industria)}` : ''}
            </p>
          </div>
        </div>
        <div className={`shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl border ${tone.ring}`} title="Opportunity Score (1-100)">
          <span className="text-xl font-semibold leading-none font-mono">{op.score}</span>
          <span className="text-xs font-semibold">{tone.label}</span>
        </div>
      </div>

      <PriceVsValueChart op={op} />

      {/* Tesis del catalizador */}
      <div className="p-3 rounded-xl bg-[var(--color-success-light)] border border-emerald-100">
        <div className="text-xs font-bold text-emerald-800 mb-1">Tesis del catalizador</div>
        <p className="text-xs text-slate-800 leading-relaxed">{op.tesis}</p>
      </div>

      {op.alertaDatos && (
        <div className="flex gap-2 p-2.5 rounded-xl bg-[var(--color-warning-light)] border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-warning)]" />
          <span>{op.alertaDatos}</span>
        </div>
      )}

      {/* Desglose cuantitativo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="FCF Yield" value={fmtPct(op.fcfYieldPct)} ok={(op.fcfYieldPct ?? 0) > 6} hint="Flujo de caja libre / Enterprise Value (umbral > 6 %)" />
        <Metric
          label={calidadRoic ? 'ROIC' : 'ROE'}
          value={fmtPct(calidadRoic ? op.roicPct : op.roePct)}
          ok={calidadRoic || (op.roePct ?? 0) > 20}
          hint="ROIC > 15 % o ROE > 20 %"
        />
        <Metric label="Piotroski" value={`${op.piotroski}/9`} ok={op.piotroski >= 7} hint={`F-Score (umbral >= 7). Criterios evaluables: ${op.piotroskiEvaluados}/9`} />
        <Metric label="Altman Z" value={op.altmanZ?.toLocaleString('es-ES') ?? 'N/D'} ok={(op.altmanZ ?? 0) > 2.8} hint="Zona segura > 2,8" />
      </div>

      {/* Catalizadores */}
      <ul className="space-y-1.5">
        {op.catalizadores.map(c => (
          <li key={c.tipo} className="flex items-start gap-2 text-xs">
            {c.activo
              ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-success)]" />
              : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-300" />}
            <span className={c.activo ? 'text-slate-800' : 'text-slate-500'}>
              <strong className="font-semibold">{c.nombre}:</strong> {c.detalle}
            </span>
          </li>
        ))}
      </ul>

      {expanded && (
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600 border-t border-[var(--color-border)] pt-3">
          <div>
            <div className="font-bold text-slate-800 mb-1">Piotroski F-Score</div>
            <ul className="space-y-0.5">
              {op.piotroskiDetalle.map(p => (
                <li key={p.criterio} className="flex items-center gap-1.5">
                  {p.cumple === null
                    ? <span className="w-3 text-center text-slate-300">–</span>
                    : p.cumple
                      ? <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                      : <XCircle className="w-3 h-3 text-slate-300" />}
                  <span>{p.criterio}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-1">Composición del score</div>
            <ul className="space-y-0.5 font-mono">
              <li>Descuento: {op.desglose.descuento} / 30</li>
              <li>Calidad (ROIC/ROE): {op.desglose.calidad} / 20</li>
              <li>Balance: {op.desglose.balance} / 15</li>
              <li>FCF Yield: {op.desglose.fcf} / 15</li>
              <li>Catalizadores ({activos.length}/3): {op.desglose.catalizadores} / 20</li>
            </ul>
            <div className="mt-2 text-slate-500">
              WACC {fmtPct(op.waccPct)} · Cap. {Math.round(op.marketCapMM / 1000).toLocaleString('es-ES')} mil M USD
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-auto pt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Ocultar desglose' : 'Ver desglose'}
        </button>
        <button
          onClick={onLoad}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-accent hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          {loading ? 'Cargando datos reales...' : 'Cargar en el DCF'}
        </button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </article>
  );
};

export const SuperOpportunities: React.FC<SuperOpportunitiesProps> = ({ onLoadCompany }) => {
  const [scan, setScan] = useState<SuperOpportunitiesScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMethod, setShowMethod] = useState(false);
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchScan = useCallback(async (refresh = false) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<SuperOpportunitiesScan>(
        `/api/analyst/super-opportunities${refresh ? '?refresh=true' : ''}`, {}, 55000
      );
      setScan(data);
      if (data.status === 'escaneando') {
        pollRef.current = setTimeout(() => fetchScan(false), POLL_MS);
      }
    } catch (err) {
      setError(errorMessage(err, 'No se pudo obtener el escaneo de Superoportunidades. Reintenta en unos minutos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScan();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [fetchScan]);

  const handleLoad = async (ticker: string) => {
    setLoadingTicker(ticker);
    setLoadErrors(prev => ({ ...prev, [ticker]: '' }));
    try {
      // El servidor puede tardar hasta 50 s en descargar los estados financieros de un ticker nuevo
      const data = await postJson('/api/market/import', { ticker }, 60000);
      if (data.success && data.company) onLoadCompany(data.company);
    } catch (err) {
      setLoadErrors(prev => ({ ...prev, [ticker]: errorMessage(err, `No se pudo cargar ${ticker}. Reintenta.`) }));
    } finally {
      setLoadingTicker(null);
    }
  };

  const isScanning = scan?.status === 'escaneando';
  // Mientras se escanea se muestra el último resultado disponible, si existe
  const view: SuperOpportunitiesScan | null = isScanning ? (scan?.ultimoResultado ?? null) : scan;
  const oportunidades = view?.oportunidades ?? [];
  const cercanas = view?.candidatasCercanas ?? [];

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <section className="p-5 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Superoportunidades</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Deep Value + Catalizadores
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Escáner del S&P 500 líquido: solo aparecen las empresas que superan los cinco filtros a la vez.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMethod(!showMethod)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200"
            >
              <Info className="w-3.5 h-3.5" />
              {showMethod ? 'Ocultar criterios' : 'Criterios'}
            </button>
            <button
              onClick={() => fetchScan(true)}
              disabled={loading || isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50"
              title="Recalcular con datos de Yahoo Finance (como mucho cada 15 minutos)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || isScanning ? 'animate-spin' : ''}`} />
              Reescanear
            </button>
          </div>
        </div>

        {view?.generadoEn && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>Universo: <strong className="text-slate-800">{view.universo}</strong></span>
            <span>Analizadas: <strong className="text-slate-800">{view.analizadas}</strong></span>
            <span>Líquidas: <strong className="text-slate-800">{view.liquidas}</strong></span>
            <span>Superan los 5 filtros: <strong className="text-slate-800">{view.superanFiltros}</strong></span>
            {(view.sinDatos?.length ?? 0) > 0 && (
              <span className="text-amber-700" title={view.sinDatos?.join(', ')}>
                Sin datos de Yahoo: <strong>{view.sinDatos?.length}</strong> (escaneo parcial, se reintenta en 1 h)
              </span>
            )}
            <span>Escaneo: {fmtFecha(view.generadoEn)}</span>
            <span>Fuente: {view.source}</span>
          </div>
        )}

        {showMethod && (
          <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs text-slate-600">
            <ol className="space-y-1 list-decimal list-inside">
              <li><strong>Descuento:</strong> valor intrínseco más de un 30 % por encima del precio. Se toma el menor entre DCF (5 años + Gordon, WACC con CAPM) y Graham revisado (BPA × (8,5 + 2g) × 4,4 / Y).</li>
              <li><strong>Rentabilidad:</strong> ROIC &gt; 15 % o ROE &gt; 20 %.</li>
              <li><strong>Balance:</strong> Piotroski F-Score ≥ 7 o Altman Z-Score &gt; 2,8.</li>
              <li><strong>FCF Yield:</strong> flujo de caja libre / Enterprise Value &gt; 6 %.</li>
              <li><strong>Catalizador activo:</strong> recompra neta &gt; 3 % anual, dos o más trimestres seguidos batiendo el BPA estimado en más de un 5 %, o margen operativo +1 pp interanual.</li>
            </ol>
            <div className="space-y-2">
              <p>
                <strong>Opportunity Score (1-100):</strong> descuento 30 · calidad 20 · balance 15 · FCF Yield 15 · catalizadores 20.
                Se muestran como máximo las 10 mejores.
              </p>
              <p>
                Universo de ~170 empresas no financieras del S&P 500 con más de 100 M USD de volumen diario. Se excluyen bancos,
                aseguradoras, REIT y eléctricas porque FCF, ROIC y Altman Z no son comparables en ellas.
              </p>
              <p className="text-slate-500">
                Herramienta educativa: los datos de Yahoo Finance pueden contener partidas extraordinarias. No es una recomendación de inversión.
              </p>
            </div>
          </div>
        )}
      </section>

      {isScanning && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 bg-[var(--color-accent-light)] text-xs text-slate-800">
          <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
          <span>
            {scan?.message}
            {view ? ' Mientras tanto se muestra el último escaneo disponible.' : ''}
          </span>
        </div>
      )}

      {scan?.stale && scan.aviso && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-[var(--color-warning-light)] text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-warning)]" />
          <span>{scan.aviso} Se muestra el último escaneo guardado.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-red-200 bg-[var(--color-danger-light)] text-xs text-red-900">
          <span>{error}</span>
          <button onClick={() => fetchScan()} className="font-semibold underline shrink-0">Reintentar</button>
        </div>
      )}

      {loading && !scan && !error && (
        <div className="grid lg:grid-cols-2 gap-4">
          {[0, 1].map(i => <div key={i} className="h-80 rounded-lg skeleton" />)}
        </div>
      )}

      {view && oportunidades.length === 0 && (
        <div className="p-6 rounded-lg border border-dashed border-[var(--color-border-strong)] text-center text-sm text-slate-600">
          Hoy ninguna empresa del universo supera los cinco filtros a la vez. Es un resultado válido: el mercado no siempre ofrece superoportunidades.
        </div>
      )}

      {oportunidades.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          {oportunidades.map((op, i) => (
            <OpportunityCard
              key={op.ticker}
              op={op}
              rank={i + 1}
              loading={loadingTicker === op.ticker}
              error={loadErrors[op.ticker]}
              onLoad={() => handleLoad(op.ticker)}
            />
          ))}
        </div>
      )}

      {cercanas.length > 0 && (
        <section className="p-5 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-slate-900">En vigilancia: fallan un solo filtro</h3>
          <p className="text-xs text-slate-500 mb-3">No son superoportunidades; se listan para seguirlas de cerca.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-[var(--color-border)]">
                  <th className="py-2 pr-3">Empresa</th>
                  <th className="py-2 pr-3 text-right">Score</th>
                  <th className="py-2 pr-3 text-right">Upside</th>
                  <th className="py-2 pr-3 text-right">FCF Yield</th>
                  <th className="py-2 pr-3 text-right">Piotroski</th>
                  <th className="py-2 pr-3">Filtro que falla</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {cercanas.map(op => (
                  <tr key={op.ticker} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-mono font-bold text-slate-900">{op.ticker}</span>
                      <span className="text-slate-500"> · {op.nombre}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{op.score}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtPct(op.upsidePct, 0)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtPct(op.fcfYieldPct)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{op.piotroski}/9</td>
                    <td className="py-2 pr-3 text-amber-800">{op.filtros.filter(f => !f.cumple).map(f => f.nombre).join(', ')}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleLoad(op.ticker)}
                        disabled={loadingTicker === op.ticker}
                        className="text-accent font-semibold hover:underline disabled:opacity-60 whitespace-nowrap"
                      >
                        {loadingTicker === op.ticker ? 'Cargando...' : 'Cargar en el DCF'}
                      </button>
                      {loadErrors[op.ticker] && <div className="text-xs text-[var(--color-danger)]">{loadErrors[op.ticker]}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
