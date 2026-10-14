import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { FINANCIAL_CONCEPTS, FinancialConcept } from './concepts';

interface SmartTooltipProps {
  /** ID del concepto financiero del glosario */
  conceptId?: string;
  /** Compatibilidad legacy: concept prop */
  concept?: string;
  /** Texto alternativo si conceptId no existe en el glosario */
  text?: string;
  /** Tamaño del icono: 'sm' | 'md' */
  size?: 'sm' | 'md';
  /** Clase extra para el contenedor */
  className?: string;
  /** Mostrar la cita de Buffett en el tooltip */
  showQuote?: boolean;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  conceptId,
  concept,
  text = '',
  size = 'sm',
  className = '',
  showQuote = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState<boolean>(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Soporte para ambos APIs: conceptId (nuevo) y concept (legacy)
  const resolvedConceptId = conceptId || concept || '';
  const conceptData: FinancialConcept | undefined = FINANCIAL_CONCEPTS[resolvedConceptId];
  const message = conceptData?.shortExplanation || text;

  // Detectar si el usuario ya ha interactuado con este concepto
  useEffect(() => {
    if (!conceptData?.id) return;
    try {
      const key = `warren_concept_${conceptData.id}`;
      const seen = localStorage.getItem(key);
      if (seen === 'true') {
        setHasBeenSeen(true);
      } else {
        setHasBeenSeen(false);
      }
    } catch {}
  }, [conceptData?.id]);

  // Marcar como visto al abrir
  const handleOpen = () => {
    if (!conceptData?.id) return;
    setIsOpen(true);
    try {
      localStorage.setItem(`warren_concept_${conceptData.id}`, 'true');
    } catch {}
    setHasBeenSeen(true);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  if (!message && !text) return null;

  const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const iconBtnSizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle mx-1 cursor-pointer select-none group ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isOpen) handleOpen();
          else setIsOpen(false);
        }}
        className={`inline-flex items-center justify-center rounded-full text-slate-400 hover:text-accent hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 transition-colors ${iconBtnSizeClass}`}
        aria-label={conceptData?.term ? `Explicación de ${conceptData.term}` : 'Ayuda y explicación en lenguaje simple'}
        title={conceptData?.term ? `¿Qué es ${conceptData.term}?` : 'Explicación sencilla'}
      >
        <HelpCircle className={iconSizeClass} />
      </button>

      {isOpen && conceptData ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 sm:w-72 p-4 bg-white border border-slate-200 rounded-xl shadow-[var(--shadow-modal)] text-xs text-slate-700 z-[var(--z-tooltip)] animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          {/* Header: término + categoría */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="font-semibold text-slate-900">{conceptData.term}</span>
              <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">
                {conceptData.simpleAlias}
              </span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
              conceptData.category === 'rentabilidad' ? 'bg-green-50 text-success border border-green-200' :
              conceptData.category === 'valoracion' ? 'bg-orange-50 text-warning border border-orange-200' :
              conceptData.category === 'solvencia' ? 'bg-rose-50 text-danger border border-rose-200' :
              conceptData.category === 'liquidez' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              {conceptData.category}
            </span>
          </div>

          {/* Explicación en lenguaje simple */}
          <p className="leading-relaxed text-slate-700 mb-2">
            {hasBeenSeen ? conceptData.shortTip : conceptData.longExplanation}
          </p>

          {/* Analogía si está disponible y es primera vez */}
          {!hasBeenSeen && conceptData.analogy && (
            <div className="mb-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 block mb-1">💡 Analogía</span>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {conceptData.analogy}
              </p>
            </div>
          )}

          {/* Cita de Buffett */}
          {showQuote && conceptData.buffettQuote && (
            <div className="pt-2 border-t border-slate-100">
              <blockquote className="text-xs text-slate-600 italic leading-relaxed">
                "…{conceptData.buffettQuote}"
              </blockquote>
            </div>
          )}

          {/* Flechita inferior */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
        </span>
      ) : text ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 sm:w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-[var(--shadow-modal)] text-xs text-slate-700 z-[var(--z-tooltip)] animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <p className="font-medium text-slate-900">{text}</p>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
        </span>
      ) : null}
    </span>
  );
};

// Re-exportar como InfoTooltip para compatibilidad con imports existentes
export { SmartTooltip as InfoTooltip };
