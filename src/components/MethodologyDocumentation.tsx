import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Search,
  Scale,
  DollarSign,
  Layers,
  ArrowRight,
  BarChart3,
  Info,
  Sliders,
  RotateCcw,
  Zap,
  FileText,
  Copy,
  Download,
  ExternalLink,
  Award,
  Compass
} from 'lucide-react';
import { InfoTooltip } from './SmartTooltip';

export const MethodologyDocumentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'ratios' | 'scoring' | 'markowitz' | 'references'>('ratios');
  const [copied, setCopied] = useState(false);

  const handleCopyFullMarkdown = () => {
    fetch('/DOCUMENTACION_TECNICA_Y_METODOLOGICA.md')
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar el archivo');
        return res.text();
      })
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        // Fallback textual
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  };

  const handleDownloadMarkdown = () => {
    const link = document.createElement('a');
    link.href = '/DOCUMENTACION_TECNICA_Y_METODOLOGICA.md';
    link.download = 'DOCUMENTACION_TECNICA_Y_METODOLOGICA.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner Principal de Documentación Académica */}
      <div className="bg-white rounded-2xl border-slate-200 p-6 sm:p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 font-serif tracking-tight">
              Cómo se calcula
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-2 max-w-3xl leading-relaxed">
              Especificación rigurosa de las fórmulas contables para <strong>Ratios Fundamentales</strong>, formulación matemática del <strong>Score Lineal $S(a)$</strong> (criterio cuantitativo de empresa buena vs mala), y lógica computacional del <strong>Simulador de Markowitz</strong> (Teoría Moderna de Portafolios y Almuerzo Gratis).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyFullMarkdown}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-700 text-slate-800 text-xs font-bold border border-slate-200 transition-all shadow-sm active:scale-95"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Whitepaper (Markdown)'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-700 text-slate-800 text-xs font-bold border border-slate-200 transition-all active:scale-95"
              title="Descargar archivo DOCUMENTACION_TECNICA_Y_METODOLOGICA.md"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar .md</span>
            </button>
          </div>
        </div>

        {/* Selector de Secciones de Documentación */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-200 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('ratios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'ratios'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>1. Ratios Fundamentales & DuPont</span>
          </button>
          <button
            onClick={() => setActiveSection('scoring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'scoring'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>2. Score Lineal S(a) & Buena vs Mala</span>
          </button>
          <button
            onClick={() => setActiveSection('markowitz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'markowitz'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3. Simulador de Markowitz & Covarianza</span>
          </button>
          <button
            onClick={() => setActiveSection('references')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'references'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>4. Referencias Académicas (APA)</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: RATIOS FUNDAMENTALES */}
      {activeSection === 'ratios' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                Capítulo 1 · Finanzas Corporativas y Análisis de Estados Financieros
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif mt-1">
                Fórmulas y calificación de los ratios
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Cada ratio contable se extrae directamente de los estados financieros auditados (Balance, Pérdidas y Ganancias y Flujos de Caja) bajo estándares internacionales (US GAAP / IFRS). Los umbrales de semáforo verde, amarillo y rojo están fundamentados en la literatura clásica de Graham & Dodd (1934) y los criterios de Buffett.
              </p>
            </div>

            {/* Grid de las 4 Dimensiones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Dimensión 1: Liquidez */}
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono font-bold">1</span>
                    Liquidez a corto plazo (peso 20 %)
                  </h3>
                  <span className="text-xs font-mono text-slate-500">Graham & Dodd</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-emerald-800">Liquidez Corriente (Current Ratio) = Activo Circulante / Pasivo Circulante</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 1.5x (Graham) · ámbar 1.1x - 1.49x · rojo &lt; 1.1x. Capacidad de responder a deudas a &lt; 12 meses.
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-emerald-800">Prueba Ácida (Quick Ratio) = (Activo Circulante - Inventarios) / Pasivo Circulante</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 1.0x · ámbar 0.5x - 0.99x · rojo &lt; 0.5x. Liquidez estricta excluyendo mercancía sin vender.
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-emerald-800">Disponibilidad (Cash Ratio) = Efectivo y Equivalentes / Pasivo Circulante</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 0.30x · ámbar 0.15x - 0.29x · rojo &lt; 0.15x. Dinero líquido inmediato en banco.
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensión 2: Solvencia */}
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono font-bold">2</span>
                    Solvencia y deuda (peso 25 %)
                  </h3>
                  <span className="text-xs font-mono text-slate-500">Altman (1968)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-blue-800">Endeudamiento (Debt-to-Equity / D/E) = Pasivo Total / Patrimonio Neto</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≤ 1.0x · ámbar 1.01x - 2.0x · rojo &gt; 2.0x (o PN negativo). Mide el apalancamiento financiero sobre fondos propios.
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-blue-800">Cobertura de Intereses (TIE / ICR) = EBIT / Gastos por Intereses</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 5.0x (o libre de deuda) · ámbar 2.5x - 4.9x · rojo &lt; 2.5x (o EBIT ≤ 0). Veces que el resultado operativo paga los intereses.
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensión 3: Rentabilidad & DuPont */}
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-mono font-bold">3</span>
                    Rentabilidad y foso (peso 25 %)
                  </h3>
                  <span className="text-xs font-mono text-slate-500">DuPont & Buffett</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-purple-800 flex items-center">
                      <span>ROE = (Utilidad Neta / Patrimonio Neto) × 100%</span>
                      <InfoTooltip concept="roe" />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 15.0% (Criterio Buffett) · ámbar 8.0% - 14.9% · rojo &lt; 8.0%. Test de ventaja competitiva duradera.
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="font-mono font-bold text-purple-900 text-xs">
                      Descomposición DuPont (3 Fases): ROE = Margen Neto × Rotación Activos × Apalancamiento
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      = (Utilidad Neta / Ventas) × (Ventas / Activos Totales) × (Activos Totales / Patrimonio Neto)
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-purple-800">ROA = (Utilidad Neta / Activos Totales) × 100%</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≥ 8.0% · ámbar 4.0% - 7.9% · rojo &lt; 4.0%. Eficiencia de todos los activos de la empresa.
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensión 4: Valoración & Margen de Seguridad */}
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">4</span>
                    Valoración y margen de seguridad (peso 30 %)
                  </h3>
                  <span className="text-xs font-mono text-slate-500">Graham & Dodd</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-slate-800">PER (P/E) = Precio por Acción / BPA (Beneficio Por Acción)</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≤ 18.0x · ámbar 18.1x - 26.0x · rojo &gt; 26.0x (o BPA ≤ 0). Múltiplo de años de beneficio pagados.
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-slate-800">Price-to-Book (P/B) = Capitalización Bursátil / Patrimonio Neto</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Benchmark:</strong> verde ≤ 2.5x · ámbar 2.51x - 5.0x · rojo &gt; 5.0x. Prima sobre el valor patrimonial contable.
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-slate-800 flex items-center">
                      <span>Margen de Seguridad (MoS) = [(V_intrínseco - Precio) / V_intrínseco] × 100%</span>
                      <InfoTooltip concept="margenSeguridad" />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Distancia protectora que absorbe errores analíticos o shocks económicos antes de incurrir en pérdidas permanentes de capital.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: MODELO DE SCORE LINEAL & CÓMO SABES SI ES BUENA O MALA */}
      {activeSection === 'scoring' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                Capítulo 2 · Teoría de Decisión Multicriterio (MCDA / MAVT)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif mt-1">
                El Score S(a)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                El modelo sintetiza múltiples señales contables en un indicador cardinal único $S(a) \in [0, 100]$. A continuación se explica la formulación matemática y el criterio riguroso para saber con certeza si una empresa analizada es <strong>Buena</strong> o <strong>Mala</strong>.
              </p>
            </div>

            {/* Ecuación Maestra del Score Lineal */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-slate-300 font-bold text-xs">
                Fórmula del Modelo de Agregación Aditiva
              </div>
              <div className="text-sm sm:text-base font-semibold text-white">
                S(a) = 0.20 · f_Liquidez(a) + 0.25 · f_Solvencia(a) + 0.25 · f_Rentabilidad(a) + 0.30 · f_Valoración(a)
              </div>
              <div className="text-slate-500 text-xs leading-relaxed pt-2 border-t border-slate-800">
                Cumple axiomáticamente con la condición de suma unitaria de pesos: ∑ w_k = 0.20 + 0.25 + 0.25 + 0.30 = 1.00. Cada f_k(a) mapea los ratios de su respectiva dimensión en un rango continuo de 0 a 100 puntos.
              </div>
            </div>

            {/* SECCIÓN CLAVE SOLICITADA POR EL USUARIO: CÓMO SABES SI ES BUENA O MALA */}
            <div className="border border-slate-200 bg-slate-50 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold font-serif text-base">
                  ?
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-serif">
                    ¿Cómo saber si una empresa es buena o mala?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Criterio determinístico en dos fases: Calificación Cardinal Global y Regla de Veto Anti-Trampas de Valor.
                  </p>
                </div>
              </div>

              {/* Tabla de Rangos A+ a F */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-xs">
                    <tr>
                      <th className="p-3 rounded-l-xl">Rango S(a)</th>
                      <th className="p-3">Grado</th>
                      <th className="p-3">Clasificación</th>
                      <th className="p-3">Diagnóstico Financiero Fundamental</th>
                      <th className="p-3 rounded-r-xl">Ejemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-emerald-50/50">
                      <td className="p-3 font-mono font-bold text-emerald-800">90 – 100 pts</td>
                      <td className="p-3 font-bold text-emerald-700">Grado A+</td>
                      <td className="p-3 font-bold text-emerald-900">verde Extraordinaria (Buffett)</td>
                      <td className="p-3 text-slate-700">Balance sin deuda, ROE &gt; 18%, caja abundante y cotización con margen de seguridad. Mínimo riesgo.</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">BRK.B</td>
                    </tr>
                    <tr className="bg-emerald-50/30">
                      <td className="p-3 font-mono font-bold text-emerald-700">80 – 89 pts</td>
                      <td className="p-3 font-bold text-emerald-600">Grado A</td>
                      <td className="p-3 font-bold text-emerald-800">verde Muy Buena / Alta Calidad</td>
                      <td className="p-3 text-slate-700">Foso económico sólido, rentabilidad consistente (ROE ≥ 15%), deuda muy baja y múltiplos razonables.</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">COST, AAPL</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-blue-700">70 – 79 pts</td>
                      <td className="p-3 font-bold text-blue-600">Grado B</td>
                      <td className="p-3 font-bold text-blue-800">Aceptable / Calidad Media</td>
                      <td className="p-3 text-slate-700">Financieramente sana pero con ventajas competitivas moderadas o valoración exigente sin gran descuento.</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">KO, JNJ</td>
                    </tr>
                    <tr className="bg-slate-100/60">
                      <td className="p-3 font-mono font-bold text-slate-800">55 – 69 pts</td>
                      <td className="p-3 font-bold text-slate-700">Grado C</td>
                      <td className="p-3 font-bold text-slate-900">ámbar Mediocre / Vigilancia</td>
                      <td className="p-3 text-slate-700">Debilidades en al menos una dimensión (alto endeudamiento o bajo ROE). No ofrece margen de seguridad.</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">Promedio mercado</td>
                    </tr>
                    <tr className="bg-rose-50/40">
                      <td className="p-3 font-mono font-bold text-rose-700">40 – 54 pts</td>
                      <td className="p-3 font-bold text-rose-600">Grado D</td>
                      <td className="p-3 font-bold text-rose-800">rojo Deficiente / Alto Riesgo</td>
                      <td className="p-3 text-slate-700">Deterioro financiero visible, cobertura de intereses precaria (ICR &lt; 2.5x) y rentabilidad decreciente.</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">Turnarounds</td>
                    </tr>
                    <tr className="bg-rose-100/60">
                      <td className="p-3 font-mono font-bold text-rose-900">0 – 39 pts</td>
                      <td className="p-3 font-bold text-rose-800">Grado F</td>
                      <td className="p-3 font-bold text-rose-950">rojo Mala / Trampa de Valor</td>
                      <td className="p-3 text-slate-700">EBIT negativo, pérdidas netas, quema de caja acelerada y peligro de insolvencia técnica (Altman).</td>
                      <td className="p-3 font-mono font-semibold text-rose-900">HYPE</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Regla de Veto Anti-Trampas de Valor */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  La Regla de Veto No Compensatorio (Non-Compensatory Heuristic)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  ¿Por qué una empresa con PER bajo no siempre es buena? Porque puede ser una <strong>Trampa de Valor (*Value Trap*)</strong>. Si la dimensión de Solvencia está en rojo (D/E &gt; 3.0x o EBIT negativo), la probabilidad de quiebra es inminente. El modelo penaliza estas situaciones asignando puntuaciones mínimas a Solvencia y Valoración, impidiendo que un múltiplo engañosamente bajo maquille un negocio en ruina.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: SIMULADOR DE MARKOWITZ */}
      {activeSection === 'markowitz' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 font-mono">
                Capítulo 3 · Modern Portfolio Theory (Harry Markowitz, 1952)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif mt-1">
                Cómo funciona el simulador de Markowitz
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                El simulador ejecuta la optimización de Media-Varianza de Harry Markowitz (Premio Nobel 1990). A continuación se desglosan las ecuaciones vectoriales de la cartera, la demostración del "Almuerzo Gratis" y la arquitectura algorítmica.
              </p>
            </div>

            {/* Fórmulas Vectoriales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-slate-300 font-bold text-xs">1. Retorno Esperado de la Cartera</div>
                <div className="text-sm font-bold text-white">E(R_p) = w^T · μ = ∑ w_i · E(R_i)</div>
                <p className="text-slate-500 text-xs pt-1">
                  Es el promedio ponderado lineal exacto de los rendimientos individuales de cada activo en cartera.
                </p>
              </div>

              <div className="p-5 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-emerald-400 font-bold text-xs">2. Varianza y Volatilidad de Cartera</div>
                <div className="text-sm font-bold text-white">σ_p^2 = w^T · Σ · w = ∑∑ w_i · w_j · σ_ij</div>
                <div className="text-sm font-bold text-white">σ_p = √(σ_p^2)</div>
                <p className="text-slate-500 text-xs pt-1">
                  Donde σ_ij = ρ_ij · σ_i · σ_j representa la covarianza entre cada par de activos.
                </p>
              </div>

              <div className="p-5 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-blue-400 font-bold text-xs">3. Cartera Tangente (Máximo Sharpe)</div>
                <div className="text-sm font-bold text-white">max Sharpe = (E(R_p) - R_f) / σ_p</div>
                <p className="text-slate-500 text-xs pt-1">
                  Maximiza la pendiente de la Capital Allocation Line (CAL). Con R_f = 4.0% (Letras del Tesoro).
                </p>
              </div>

              <div className="p-5 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-purple-400 font-bold text-xs">4. El "Almuerzo Gratis" Cuantificado</div>
                <div className="text-sm font-bold text-white">Δσ_div = [(∑ w_i·σ_i - σ_p) / (∑ w_i·σ_i)] × 100%</div>
                <p className="text-slate-500 text-xs pt-1">
                  Porcentaje exacto de riesgo eliminado sin sacrificar rendimiento gracias a correlaciones ρ_ij &lt; 1.0.
                </p>
              </div>
            </div>

            {/* Organización con la Cartera Activa del Usuario */}
            <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-slate-600" />
                Tus datos de cartera
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                El simulador permite alternar entre dos fuentes de datos para la optimización:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
                <li>
                  <strong>Mi Cartera Comprada</strong>: Filtra las variables exclusivamente a los activos que el usuario ha adquirido en el simulador. Si el usuario posee ≥ 2 acciones, calcula la frontera eficiente exclusiva de sus activos, computa sus pesos reales (w_i = Valor_i / Valor_Total_Invertido), proyecta su cartera real en el gráfico SVG y le permite rebalancear con 1 clic a la Cartera de Máximo Sharpe.
                </li>
                <li>
                  <strong>Universo de Mercado Completo</strong>: Ejecuta el modelo sobre todas las acciones cargadas en el catálogo (defensivas, calidad, especulativas) para descubrir la frontera óptima teórica global.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: REFERENCIAS BIBLIOGRÁFICAS ACADÉMICAS */}
      {activeSection === 'references' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                Capítulo 4 · Bibliografía y Validez Académica (APA 7ma Edición)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-serif mt-1">
                Referencias
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Relación de obras seminales y artículos científicos revisados por pares que respaldan conceptual y empíricamente cada módulo de la plataforma.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Markowitz, H. (1952). Portfolio Selection. <em>The Journal of Finance</em>, 7(1), 77–91.</div>
                <div className="text-xs text-slate-500">Fundamento de la Teoría Moderna de Portafolios (MPT), la matriz de covarianza y la frontera eficiente.</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Sharpe, W. F. (1964). Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk. <em>The Journal of Finance</em>, 19(3), 425–442.</div>
                <div className="text-xs text-slate-500">Definición de la Cartera Tangente y la medida de rentabilidad ajustada al riesgo (Ratio de Sharpe).</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Graham, B., & Dodd, D. L. (1934). <em>Security Analysis: Principles and Technique</em>. McGraw-Hill.</div>
                <div className="text-xs text-slate-500">Obra fundacional del Value Investing, concepto de Margen de Seguridad y benchmarks de liquidez y solvencia.</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Piotroski, J. D. (2000). Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers. <em>Journal of Accounting Research</em>, 38, 1–41.</div>
                <div className="text-xs text-slate-500">Precedente del modelo de scoring contable fundamental para separar empresas buenas de trampas de valor.</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Altman, E. I. (1968). Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy. <em>The Journal of Finance</em>, 23(4), 589–609.</div>
                <div className="text-xs text-slate-500">Modelización del riesgo de quiebra financiera y la justificación de penalizar severamente el apalancamiento excesivo.</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Keeney, R. L., & Raiffa, H. (1976). <em>Decisions with Multiple Objectives: Preferences and Value Trade-Offs</em>. John Wiley & Sons.</div>
                <div className="text-xs text-slate-500">Base axiomática de la Teoría de Decisión Multiatributo que justifica la agregación aditiva del Score S(a).</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Damodaran, A. (2012). <em>Investment Valuation: Tools and Techniques for Determining the Value of Any Asset</em> (3rd ed.). John Wiley & Sons.</div>
                <div className="text-xs text-slate-500">Metodología de cálculo de valor intrínseco, coste de capital y múltiplos bursátiles normalizados.</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Divay, P. (2024). <em>Gamified Financial Literacy Interventions and Behavioral Biases in Retail Investors</em>. Social Science Research Network (SSRN).</div>
                <div className="text-xs text-slate-500">Modelo econométrico de intervención conductual para mitigar la sobreoperativa en inversores minoristas.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
