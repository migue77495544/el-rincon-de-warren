import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, BookOpen, Search, Terminal, Sparkles } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: '¿Qué es el Score S(a)?',
    a: 'Un score de 0-100 que evalúa si una empresa cumple los criterios de Warren Buffett: ROE alto, baja deuda, márgenes estables y crecimiento sostenible.',
  },
  {
    q: '¿Cómo funciona el Foso Económico?',
    a: 'Tu empresa tiene un "foso" alrededor: ventajas competitivas duraderas que la protegen de la competencia. Cuanto más ancho el foso, mejor.',
  },
  {
    q: '¿Qué es el Margen de Seguridad?',
    a: 'Regla de Benjamin Graham: compra empresas "en oferta" con al menos 15-30% de descuento respecto a tu valor intrínseco calculado.',
  },
  {
    q: '¿Para qué sirve la Consola Python?',
    a: 'Ejecuta scripts de análisis financiero en vivo (como calcular CAPM, betas de Damodaran o backtests de cartera) sin salir de la app.',
  },
];

export const WarrenFAB: React.FC<{ onOpenPythonConsole?: () => void }> = ({ onOpenPythonConsole }) => {
  const [open, setOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveFaq(null);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-[var(--z-tooltip)] flex flex-col items-end gap-4"
    >
      {/* FAQ Panel */}
      {open && (
        <div className="w-80 max-w-[calc(100vw-48px)] bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-modal)] animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-sm">Centro de Ayuda</h4>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-800">{item.q}</span>
                  <span className={`text-slate-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {activeFaq === i && (
                  <div className="px-3 pb-2.5">
                    <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {onOpenPythonConsole && (
            <div className="p-3 border-t border-[var(--color-border)]">
              <button
                onClick={() => {
                  onOpenPythonConsole();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                Abrir Consola Python
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-accent hover:bg-accent/90 text-white shadow-[var(--shadow-card)] flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
