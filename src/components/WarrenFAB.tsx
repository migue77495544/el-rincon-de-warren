import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, HelpCircle, X } from 'lucide-react';

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
];

/** Evento que abre la ayuda desde otro control (botón de la barra superior en móvil) */
export const OPEN_HELP_EVENT = 'warren:open-help';

export const WarrenFAB: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener(OPEN_HELP_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_HELP_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveFaq(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[var(--z-tooltip)] flex flex-col items-end gap-3"
    >
      {open && (
        <div
          id="panel-ayuda"
          role="dialog"
          aria-label="Preguntas frecuentes"
          className="w-80 max-w-[calc(100vw-32px)] bg-white rounded-lg border border-slate-200 shadow-xl animate-fadeIn"
        >
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h4 className="m-0 font-serif font-semibold text-slate-900 text-base">Preguntas frecuentes</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Cerrar ayuda"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {FAQ_ITEMS.map((item, i) => {
              const expanded = activeFaq === i;
              return (
                <div key={i} className="border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(expanded ? null : i)}
                    aria-expanded={expanded}
                    className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 rounded-md"
                  >
                    <span className="text-sm font-medium text-slate-800">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <p className="px-3 pb-3 m-0 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* En móvil el botón flotante tapaba contenido: allí la ayuda se abre desde la barra superior */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="panel-ayuda"
        aria-label={open ? 'Cerrar ayuda' : 'Abrir preguntas frecuentes'}
        className="hidden sm:flex w-11 h-11 rounded-full bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 shadow-md items-center justify-center transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  );
};
