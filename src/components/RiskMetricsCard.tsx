import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  Sigma,
  Waves
} from 'lucide-react';
import { RiskMetricsData, RiskMetricsAsset, VarCvar } from '../types';
import { fetchJson, errorMessage } from '../utils/api';
import { InfoTooltip } from './SmartTooltip';
import { LoadingSkeleton } from './ui/Feedback';

interface RiskMetricsCardProps {
  ticker: string;
  companyName?: string;
}

const PERIODOS = [
  { id: '6mo', label: '6 meses' },
  { id: '1y', label: '1 año' },
  { id: '2y', label: '2 años' },
  { id: '5y', label: '5 años' }
];
const CONFIANZAS = [0.9, 0.95, 0.975, 0.99];

const METODOS: { key: 'normal' | 'ewma' | 'ml'; label: string; descripcion: string; icon: React.ElementType }[] = [
  { key: 'normal', label: 'Normal', descripcion: 'Volatilidad histórica, retornos gaussianos', icon: Sigma },
  { key: 'ewma', label: 'EWMA', descripcion: 'Volatilidad reciente (λ = 0,94)', icon: Waves },
  { key: 'ml', label: 'Random Forest', descripcion: 'Residuos de un modelo con 5 rezagos', icon: BrainCircuit }
];

const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const pct = (n: number | null | undefined, digits = 2) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(digits)}%`);
const num = (n: number | null | undefined, digits = 2) => (n === null || n === undefined ? '—' : n.toFixed(digits));

export const RiskMetricsCard: React.FC<RiskMetricsCardProps> = ({ ticker, companyName }) => {
  const [data, setData] = useState<RiskMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('1y');
  const [confianza, setConfianza] = useState<number>(0.95);
  const [monto, setMonto] = useState<number>(100000);
  const [montoInput, setMontoInput] = useState<string>('100000');

  const fetchRiskMetrics = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period, confianza: String(confianza), monto: String(monto) });
      const json = await fetchJson<RiskMetricsData>(`/api/python/risk-metrics/${ticker.toUpperCase().trim()}?${params}`);
      setData(json);
    } catch (err) {
      console.error('[RiskMetricsCard] Error:', err);
      setError(errorMessage(err, 'No se pudieron calcular las medidas de riesgo. Reintenta en unos segundos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskMetrics();
  }, [ticker, period, confianza, monto]);

  const aplicarMonto = () => {
    const valor = Math.round(Number(montoInput));
    if (Number.isFinite(valor) && valor > 0 && valor <= 1e9) setMonto(valor);
    else setMontoInput(String(monto));
  };

  const accion = data?.activos[0];
  const mercado = data?.activos[1];
  const nivel = `${(confianza * 100).toLocaleString('es-ES')}%`;

  const filasRendimiento: { label: string; render: (a: RiskMetricsAsset) => string }[] = [
    { label: 'Rendimiento anual', render: a => pct(a.rendimiento_anual) },
    { label: 'Volatilidad anual', render: a => pct(a.volatilidad_anual) },
    { label: 'Sharpe', render: a => num(a.sharpe, 3) },
    { label: 'Beta', render: a => num(a.beta, 3) },
    { label: 'CAPM (rend. exigido)', render: a => pct(a.capm) }
  ];

  const celdaRiesgo = (v: VarCvar | null, campo: 'var' | 'cvar') =>
    v ? (
      <>
        <span className="font-mono font-bold text-slate-800">{money(v[campo])}</span>
        <span className="block text-[10px] font-mono text-slate-400">{pct(v[`${campo}_pct`])}</span>
      </>
    ) : (
      <span className="text-[10px] text-slate-400">No disponible</span>
    );

  return (
    <div className="mt-5 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Medidas de Riesgo (VaR y CVaR)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                Analista
              </span>
              <InfoTooltip concept="valueAtRisk" />
            </div>
            <p className="text-xs text-slate-500">
              Pérdida potencial a 1 día de {money(monto)} invertidos en {companyName || ticker} vs S&P 500
            </p>
          </div>
        </div>

        {/* Parámetros */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-slate-500">
            Monto
            <input
              type="number"
              min={1}
              value={montoInput}
              onChange={e => setMontoInput(e.target.value)}
              onBlur={aplicarMonto}
              onKeyDown={e => e.key === 'Enter' && aplicarMonto()}
              className="w-28 px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </label>
          <select
            value={confianza}
            onChange={e => setConfianza(Number(e.target.value))}
            className="px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            title="Nivel de confianza"
          >
            {CONFIANZAS.map(c => (
              <option key={c} value={c}>{(c * 100).toLocaleString('es-ES')}%</option>
            ))}
          </select>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            title="Ventana histórica"
          >
            {PERIODOS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={fetchRiskMetrics}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all disabled:opacity-50"
            title="Recalcular con datos de yfinance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingSkeleton label="Calculando VaR y CVaR (Normal, EWMA y Random Forest)..." />
      ) : error ? (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between gap-3 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRiskMetrics}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-rose-800 font-bold hover:bg-rose-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : data && accion && mercado && (
        <div className={`mt-5 space-y-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {/* Resumen por método para la acción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METODOS.map(({ key, label, descripcion, icon: Icon }) => {
              const v = accion[key];
              return (
                <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1 mb-1.5">
                    <Icon className="w-3 h-3 text-rose-500" />
                    {label}
                  </span>
                  {v ? (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400">VaR {nivel}</span>
                        <span className="text-lg font-mono font-bold text-rose-600">{money(v.var)}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400">CVaR</span>
                        <span className="text-lg font-mono font-bold text-rose-800">{money(v.cvar)}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">No disponible sin el motor Python</span>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1">{descripcion}</span>
                </div>
              );
            })}
          </div>

          {/* Tabla comparativa acción vs benchmark */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-bold uppercase tracking-wide text-[10px] px-4 py-2.5">Métrica</th>
                  {data.activos.map(a => (
                    <th key={a.ticker} className="text-right font-bold uppercase tracking-wide text-[10px] px-4 py-2.5">{a.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filasRendimiento.map(fila => (
                  <tr key={fila.label}>
                    <td className="px-4 py-2 text-slate-600 font-medium">{fila.label}</td>
                    {data.activos.map(a => (
                      <td key={a.ticker} className="px-4 py-2 text-right font-mono font-bold text-slate-800">{fila.render(a)}</td>
                    ))}
                  </tr>
                ))}
                {METODOS.flatMap(({ key, label }) =>
                  (['var', 'cvar'] as const).map(campo => (
                    <tr key={`${key}-${campo}`} className={campo === 'var' ? 'bg-rose-50/30' : ''}>
                      <td className="px-4 py-2 text-slate-600 font-medium">
                        {campo === 'var' ? 'VaR' : 'CVaR'} {label}
                      </td>
                      {data.activos.map(a => (
                        <td key={a.ticker} className="px-4 py-2 text-right">{celdaRiesgo(a[key], campo)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-400">
            {data.observaciones} retornos logarítmicos diarios · tasa libre de riesgo {pct(data.tasa_libre_riesgo)}
            {data.source === 'yfinance' ? ' (FRED DGS10)' : ' (supuesta)'} · rendimiento de mercado {pct(data.rendimiento_mercado)} ·
            fuente: {data.source === 'yfinance' ? 'motor Python (yfinance)' : 'Yahoo Finance directo'}
          </p>

          {/* Explicación pedagógica */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-rose-900 mb-1.5">
              <HelpCircle className="w-4 h-4 text-rose-600" />
              <span>¿Cómo leer esta tabla?</span>
            </div>
            <p className="leading-relaxed text-slate-600 mb-2">
              Con un {nivel} de confianza, en un día normal no deberías perder más que el <strong>VaR</strong>.
              El <strong>CVaR</strong> es la pérdida media en los días que sí lo superan. Si los tres métodos discrepan mucho,
              el riesgo reciente (EWMA) o las colas gruesas (Random Forest) cuentan una historia distinta a la campana normal.
            </p>
            <div className="font-mono text-center p-2 bg-white/80 rounded-lg border border-rose-200/60 text-[11px] font-bold text-slate-800">
              VaR = −σ·z · CVaR = σ·φ(z)/(1−c) · σ²ₜ (EWMA) = λσ²ₜ₋₁ + (1−λ)r²ₜ₋₁ · CAPM = r_f + β(R_m − r_f)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
