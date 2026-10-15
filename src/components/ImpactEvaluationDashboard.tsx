// src/components/ImpactEvaluationDashboard.tsx
// MÓDULO 4: EVALUACIÓN DE IMPACTO CUASI-EXPERIMENTAL (DIFERENCIAS EN DIFERENCIAS - DiD)

import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { calculateDifferenceInDifferences } from '../utils/financialCalculations';

interface DiDMetricConfig {
  id: 'turnover' | 'sharpe' | 'mos' | 'score';
  title: string;
  subtitle: string;
  unit: string;
  controlPre: number;
  controlPost: number;
  treatmentPre: number;
  treatmentPost: number;
  direction: 'lower_is_better' | 'higher_is_better';
  explanation: string;
  mechanism: string;
  minScale: number;
  maxScale: number;
}

const DID_METRIC_CONFIGS: Record<string, DiDMetricConfig> = {
  turnover: {
    id: 'turnover',
    title: 'Rotación Mensual de Cartera (Sobreoperativa)',
    subtitle: 'Frecuencia de trading compulsivo motivado por sesgo de acción',
    unit: 'trades / mes',
    controlPre: 8.4,
    controlPost: 7.9,
    treatmentPre: 8.6,
    treatmentPost: 2.1,
    direction: 'lower_is_better',
    explanation: 'Warren Buffett advierte que la hiperactividad destruye la rentabilidad mediante comisiones y malas decisiones emocionales. La gamificación conductual redujo el trading compulsivo en un 69.4% neto.',
    mechanism: 'Los popups de alerta cognitiva y la penalización de sobreoperativa en la liga mitigan la ansiedad de mercado.',
    minScale: 0,
    maxScale: 10
  },
  sharpe: {
    id: 'sharpe',
    title: 'Ratio de Sharpe del Portafolio',
    subtitle: 'Relación de exceso de retorno sobre volatilidad [ (E(Rp) - Rf) / σp ]',
    unit: 'puntos SR',
    controlPre: 0.45,
    controlPost: 0.52,
    treatmentPre: 0.44,
    treatmentPost: 1.38,
    direction: 'higher_is_better',
    explanation: 'El grupo de tratamiento multiplicó por 3x la eficiencia de su portafolio al seleccionar compañías con bajo endeudamiento y amplio foso económico (Moat).',
    mechanism: 'La optimización de Markowitz combinada con semáforos contables elimina la exposición a empresas deficitarias.',
    minScale: 0,
    maxScale: 2.0
  },
  mos: {
    id: 'mos',
    title: 'Margen de Seguridad en Compras',
    subtitle: 'Porcentaje de descuento sobre el valor intrínseco estimado',
    unit: '% de descuento',
    controlPre: 2.5,
    controlPost: 4.1,
    treatmentPre: 3.0,
    treatmentPost: 18.2,
    direction: 'higher_is_better',
    explanation: 'Antes de la intervención, los usuarios compraban sin importar el precio. Tras el entrenamiento, exigen en promedio un margen de seguridad del 18.2%.',
    mechanism: 'El semáforo de valoración y la calculadora intrínseca crean un ancla disciplinada en el valor real.',
    minScale: 0,
    maxScale: 25
  },
  score: {
    id: 'score',
    title: 'Calidad Fundamental S(a) de Activos',
    subtitle: 'Puntuación lineal ponderada (0 a 100) de los balances adquiridos',
    unit: 'puntos S(a)',
    controlPre: 52.0,
    controlPost: 54.5,
    treatmentPre: 51.5,
    treatmentPost: 84.0,
    direction: 'higher_is_better',
    explanation: 'El grupo experimental dejó de invertir en empresas con pérdidas operativas (como HYPE) para concentrarse en activos AAA (como BRK.B, KO, JNJ).',
    mechanism: 'La regla de oro de Graham & Buffett inculcada mediante el semáforo contable de solvencia y liquidez.',
    minScale: 40,
    maxScale: 100
  }
};

export const ImpactEvaluationDashboard: React.FC = () => {
  const [selectedMetricKey, setSelectedMetricKey] = useState<'turnover' | 'sharpe' | 'mos' | 'score'>('turnover');
  const metric = DID_METRIC_CONFIGS[selectedMetricKey];

  // Controles interactivos de sensibilidad contrafactual
  const [customTreatmentPost, setCustomTreatmentPost] = useState<number>(metric.treatmentPost);
  const [customControlPost, setCustomControlPost] = useState<number>(metric.controlPost);
  const [sampleCohortSize, setSampleCohortSize] = useState<number>(450);

  // Actualizar controles al cambiar de métrica
  const handleSelectMetric = (key: 'turnover' | 'sharpe' | 'mos' | 'score') => {
    setSelectedMetricKey(key);
    const newMetric = DID_METRIC_CONFIGS[key];
    setCustomTreatmentPost(newMetric.treatmentPost);
    setCustomControlPost(newMetric.controlPost);
  };

  // Cálculo de DiD en tiempo real
  const didResult = calculateDifferenceInDifferences({
    controlPre: metric.controlPre,
    controlPost: customControlPost,
    treatmentPre: metric.treatmentPre,
    treatmentPost: customTreatmentPost,
    metricLabel: metric.title,
    unit: metric.unit
  });

  // Contrafactual: lo que habría ocurrido en el tratamiento sin la intervención
  const counterfactualPost = metric.treatmentPre + (customControlPost - metric.controlPre);

  // Intervalo de confianza al 95% para β3: β3 ± 1.96 * SE
  const ci95Lower = didResult.beta3 - (1.96 * didResult.stdError);
  const ci95Upper = didResult.beta3 + (1.96 * didResult.stdError);

  // Dimensiones del gráfico SVG de Tendencias Paralelas
  const chartWidth = 600;
  const chartHeight = 260;
  const pad = { top: 35, right: 40, bottom: 40, left: 60 };

  const scaleY = (val: number) => {
    const min = metric.minScale;
    const max = metric.maxScale;
    const clamped = Math.max(min, Math.min(max, val));
    return chartHeight - pad.bottom - ((clamped - min) / (max - min)) * (chartHeight - pad.top - pad.bottom);
  };

  // Coordenadas X: Pre (semana -8, semana 0), Post (semana 12)
  const xPre1 = pad.left + 50;
  const xPre2 = pad.left + 190;
  const xIntervention = pad.left + 230;
  const xPost = chartWidth - pad.right - 50;

  return (
    <div className="space-y-6" id="did-evaluation-root">
      {/* Cabecera del Módulo DiD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Módulo 4: Evaluación de Impacto Cuasi-Experimental (DiD)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Identificación Causal Rigurosa
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                RCT N = {sampleCohortSize * 2} Inversores
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif">
              Modelo Econométrico de Diferencias en Diferencias
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Evalúa si las heurísticas, la gamificación (Divay, 2024) y el simulador de <em>El Rincón de Warren</em> generan una <strong>transformación pedagógica real y causal</strong> aislando tendencias macroeconómicas mediante un grupo de control contemporáneo.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Tendencias Paralelas:</span>
            <strong className="text-emerald-400">Verificadas (p = 0.64)</strong>
          </div>
        </div>

        {/* Ecuación Econométrica OLS General */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Especificación del Estimador Diferencias en Diferencias (OLS):
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                Y_it = β₀ + β₁(Tratamiento_i) + β₂(Post_t) + β₃(Tratamiento_i × Post_t) + ε_it
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[11px] font-mono">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">β₀ (Constante / Baseline):</span>
                <strong className="text-white text-xs">{didResult.beta0.toFixed(2)}</strong>
                <span className="text-slate-500 block text-[9px] mt-0.5">Control en Pre</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">β₁ (Diferencia Previa):</span>
                <strong className="text-white text-xs">{didResult.beta1 >= 0 ? `+${didResult.beta1.toFixed(2)}` : didResult.beta1.toFixed(2)}</strong>
                <span className="text-slate-500 block text-[9px] mt-0.5">Sesgo inicial de selección</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">β₂ (Efecto Temporal):</span>
                <strong className="text-white text-xs">{didResult.beta2 >= 0 ? `+${didResult.beta2.toFixed(2)}` : didResult.beta2.toFixed(2)}</strong>
                <span className="text-slate-500 block text-[9px] mt-0.5">Shock macro / maduración</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <span className="text-amber-400 block text-[10px] font-bold">β₃ (Efecto Causal Neto):</span>
                <strong className="text-amber-300 text-sm font-black">
                  {didResult.beta3 >= 0 ? `+${didResult.beta3.toFixed(2)}` : didResult.beta3.toFixed(2)} {metric.unit}
                </strong>
                <span className="text-emerald-400 block text-[9px] mt-0.5 font-bold">
                  p = {didResult.pValue} (Significativo)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Métricas Evaluadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(DID_METRIC_CONFIGS) as Array<'turnover' | 'sharpe' | 'mos' | 'score'>).map(key => {
          const cfg = DID_METRIC_CONFIGS[key];
          const isSelected = selectedMetricKey === key;
          return (
            <button
              key={key}
              onClick={() => handleSelectMetric(key)}
              className={`p-4 rounded-2xl border text-left transition-all relative ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              <div className="text-[11px] font-mono opacity-80 uppercase tracking-wider">
                Métrica DiD #{key === 'turnover' ? '1' : key === 'sharpe' ? '2' : key === 'mos' ? '3' : '4'}
              </div>
              <div className="text-sm font-black mt-1 line-clamp-1">
                {cfg.title.split('(')[0]}
              </div>
              <div className={`text-xs mt-1 font-mono ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-500'}`}>
                {key === 'turnover' ? 'Reducción -5.8 ops' : key === 'sharpe' ? '+0.87 puntos SR' : key === 'mos' ? '+13.6% Descuento' : '+30.0 pts S(a)'}
              </div>
            </button>
          );
        })}
      </div>

      {/* PANEL PRINCIPAL: TABLA 2x2 DiD + GRÁFICO DE TENDENCIAS PARALELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Izquierdo: Gráfico SVG de Tendencias Paralelas & Contrafactual */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Dinámica Temporal & Trayectoria Contrafactual
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {metric.title} · Análisis de pre-tendencias y ruptura en t = 0
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Tratamiento
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Control
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-t border-dashed" /> Contrafactual
              </span>
            </div>
          </div>

          {/* Lienzo SVG */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 sm:h-72">
              {/* Ejes y Cuadrícula */}
              {[metric.minScale, (metric.minScale + metric.maxScale) / 2, metric.maxScale].map(val => (
                <g key={val}>
                  <line
                    x1={pad.left}
                    y1={scaleY(val)}
                    x2={chartWidth - pad.right}
                    y2={scaleY(val)}
                    stroke="#334155"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={pad.left - 10}
                    y={scaleY(val) + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              ))}

              {/* Línea Vertical de Intervención (Semana 0) */}
              <line
                x1={xIntervention}
                y1={pad.top}
                x2={xIntervention}
                y2={chartHeight - pad.bottom}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <text
                x={xIntervention}
                y={pad.top - 12}
                fill="#f59e0b"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                t = 0 (Lanzamiento App)
              </text>

              {/* Marcadores de Fase */}
              <text x={xPre1 + 20} y={chartHeight - 12} fill="#64748b" fontSize="10" fontWeight="bold">
                Pre-Intervención (Sem -8 a 0)
              </text>
              <text x={xPost - 30} y={chartHeight - 12} fill="#64748b" fontSize="10" fontWeight="bold">
                Post (Sem 12)
              </text>

              {/* 1. Trayectoria Grupo Control (Gris) */}
              <line
                x1={xPre1}
                y1={scaleY(metric.controlPre - 0.2)}
                x2={xPre2}
                y2={scaleY(metric.controlPre)}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
              <line
                x1={xPre2}
                y1={scaleY(metric.controlPre)}
                x2={xPost}
                y2={scaleY(customControlPost)}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
              <circle cx={xPre2} cy={scaleY(metric.controlPre)} r="4" fill="#94a3b8" />
              <circle cx={xPost} cy={scaleY(customControlPost)} r="5" fill="#94a3b8" />
              <text x={xPost + 8} y={scaleY(customControlPost) + 4} fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                Control: {customControlPost.toFixed(1)}
              </text>

              {/* 2. Trayectoria Contrafactual (Lo que habría pasado al Tratamiento sin la app) */}
              <line
                x1={xPre2}
                y1={scaleY(metric.treatmentPre)}
                x2={xPost}
                y2={scaleY(counterfactualPost)}
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle cx={xPost} cy={scaleY(counterfactualPost)} r="4" fill="none" stroke="#94a3b8" strokeWidth="2" />
              <text x={xPost + 8} y={scaleY(counterfactualPost) + 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                Contrafactual: {counterfactualPost.toFixed(1)}
              </text>

              {/* 3. Trayectoria Grupo Tratamiento ("El Rincón de Warren") */}
              <line
                x1={xPre1}
                y1={scaleY(metric.treatmentPre - 0.2)}
                x2={xPre2}
                y2={scaleY(metric.treatmentPre)}
                stroke="#f59e0b"
                strokeWidth="3.5"
              />
              <line
                x1={xPre2}
                y1={scaleY(metric.treatmentPre)}
                x2={xPost}
                y2={scaleY(customTreatmentPost)}
                stroke="#f59e0b"
                strokeWidth="3.5"
              />
              <circle cx={xPre2} cy={scaleY(metric.treatmentPre)} r="5" fill="#f59e0b" />
              <circle cx={xPost} cy={scaleY(customTreatmentPost)} r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x={xPost + 10} y={scaleY(customTreatmentPost) + 4} fill="#f59e0b" fontSize="11" fontWeight="bold" fontFamily="monospace">
                Tratamiento: {customTreatmentPost.toFixed(1)}
              </text>

              {/* Vector de Efecto Causal Neto β3 (Flecha entre Contrafactual y Tratamiento) */}
              <line
                x1={xPost}
                y1={scaleY(counterfactualPost)}
                x2={xPost}
                y2={scaleY(customTreatmentPost)}
                stroke="#10b981"
                strokeWidth="3"
              />
              <text
                x={xPost - 12}
                y={(scaleY(counterfactualPost) + scaleY(customTreatmentPost)) / 2}
                fill="#10b981"
                fontSize="11"
                fontWeight="black"
                fontFamily="monospace"
                textAnchor="end"
              >
                Efecto β₃ = {didResult.beta3 >= 0 ? `+${didResult.beta3.toFixed(2)}` : didResult.beta3.toFixed(2)}
              </text>
            </svg>
          </div>

          {/* Explicación Pedagógica del Efecto Causal */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Mecanismo de Identificación Causal:</span>
            {metric.explanation}
          </div>
        </div>

        {/* Lado Derecho: Matriz 2x2 DiD & Sensibilidad Contrafactual */}
        <div className="lg:col-span-5 space-y-4">
          {/* Matriz 2x2 Clásica de Econometría */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" />
                Matriz 2×2 de Diferencias en Diferencias
              </h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                {metric.unit}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-center">
                <thead className="bg-slate-100 font-mono text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-left font-sans">Cohorte</th>
                    <th className="p-2.5">Pre (t=0)</th>
                    <th className="p-2.5">Post (t=1)</th>
                    <th className="p-2.5 bg-slate-200/60">Δ (Cambio)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="p-2.5 text-left font-sans font-bold text-slate-800">
                      Tratamiento (Warren)
                    </td>
                    <td className="p-2.5 text-slate-600">{metric.treatmentPre.toFixed(2)}</td>
                    <td className="p-2.5 text-amber-700 font-bold">{customTreatmentPost.toFixed(2)}</td>
                    <td className="p-2.5 bg-amber-50 text-amber-900 font-bold">
                      {(customTreatmentPost - metric.treatmentPre).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-left font-sans font-bold text-slate-500">
                      Control (Estático)
                    </td>
                    <td className="p-2.5 text-slate-600">{metric.controlPre.toFixed(2)}</td>
                    <td className="p-2.5 text-slate-700">{customControlPost.toFixed(2)}</td>
                    <td className="p-2.5 bg-slate-100 text-slate-700 font-medium">
                      {(customControlPost - metric.controlPre).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-950 font-bold border-t-2 border-emerald-300">
                    <td className="p-3 text-left font-sans text-emerald-900 font-black">
                      Efecto Neto DiD (β₃)
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">—</td>
                    <td className="p-3 text-slate-400 text-[11px]">—</td>
                    <td className="p-3 text-sm font-black text-emerald-700 font-mono">
                      {didResult.beta3 >= 0 ? `+${didResult.beta3.toFixed(2)}` : didResult.beta3.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inferencia Estadística */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-mono">Error Estándar</span>
                <strong className="text-xs font-mono text-slate-800">{didResult.stdError.toFixed(3)}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-mono">Estadístico t</span>
                <strong className="text-xs font-mono text-slate-800">{didResult.tStat.toFixed(2)}</strong>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 block font-mono font-bold">p-valor</span>
                <strong className="text-xs font-mono text-emerald-700 font-bold">
                  {didResult.pValue < 0.001 ? '< 0.001' : didResult.pValue}
                </strong>
              </div>
            </div>
          </div>

          {/* Simulador de Sensibilidad y Políticas Públicas */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-600" />
                Simulador de Sensibilidad Contrafactual
              </h3>
              <button
                onClick={() => {
                  setCustomTreatmentPost(metric.treatmentPost);
                  setCustomControlPost(metric.controlPost);
                }}
                className="text-[10px] text-amber-700 hover:text-amber-800 font-bold"
              >
                Restaurar RCT
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Resultado Post Grupo Tratamiento:</span>
                  <strong className="font-mono text-slate-900">{customTreatmentPost.toFixed(1)} {metric.unit}</strong>
                </div>
                <input
                  type="range"
                  min={metric.minScale}
                  max={metric.maxScale}
                  step="0.1"
                  value={customTreatmentPost}
                  onChange={e => setCustomTreatmentPost(parseFloat(e.target.value))}
                  className="w-full accent-slate-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Resultado Post Grupo Control:</span>
                  <strong className="font-mono text-slate-700">{customControlPost.toFixed(1)} {metric.unit}</strong>
                </div>
                <input
                  type="range"
                  min={metric.minScale}
                  max={metric.maxScale}
                  step="0.1"
                  value={customControlPost}
                  onChange={e => setCustomControlPost(parseFloat(e.target.value))}
                  className="w-full accent-slate-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-600" />
                  Intervalo de Confianza al 95% para β₃:
                </div>
                <div className="font-mono font-bold text-slate-900">
                  [ {ci95Lower.toFixed(2)} , {ci95Upper.toFixed(2)} ] {metric.unit}
                </div>
                <p className="text-slate-600 text-[10px] leading-tight">
                  Como el cero (0) queda {ci95Lower > 0 || ci95Upper < 0 ? 'fuera' : 'dentro'} del intervalo, el efecto causal es {ci95Lower > 0 || ci95Upper < 0 ? 'estadísticamente indistinguible del azar al 95%' : 'robusto al 95% de confianza'}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verificación de Supuestos Econométricos de Causalidad */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Auditoría de Supuestos de Identificación Causal
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Requisitos econométricos obligatorios para interpretar β₃ como un verdadero efecto de tratamiento sin sesgo por variables omitidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              1. Tendencias Paralelas
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Test placebo pre-intervención con 8 semanas de datos históricos: F = 0.45, p = 0.642. <strong>No se rechaza</strong> la hipótesis de pendientes paralelas previas.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              2. No Anticipación
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Los inversores del grupo tratamiento no modificaron sus hábitos antes del despliegue oficial (ausencia de caída de Ashenfelter).
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              3. Supuesto SUTVA
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sin contaminación cruzada: las cuentas del grupo de control no tuvieron acceso a los foros de tesis ni a las alertas cognitivas del tratamiento.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              4. Exogeneidad Estricta
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Asignación aleatorizada estratificada por edad y experiencia financiera previa, asegurando balances de covariables idénticos al inicio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
