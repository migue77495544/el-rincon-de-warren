import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export type FinancialConcept = 'beta' | 'margenSeguridad' | 'foso' | 'roe';

const CONCEPT_EXPLANATIONS: Record<FinancialConcept, string> = {
  beta: 'Mide qué tan sensible es el precio de la acción comparado con el mercado (S&P 500): si es mayor a 1 se mueve con más fuerza, y si es menor a 1 oscila con más calma.',
  margenSeguridad: 'Es la diferencia entre lo que la empresa vale de verdad y el precio que pagás hoy: cuanto mayor sea, más protegido estás ante imprevistos.',
  foso: 'Es la ventaja única y duradera que tiene un negocio para protegerse de la competencia y seguir ganando dinero a lo largo del tiempo.',
  roe: 'Mide cuánta ganancia neta genera la empresa por cada peso o dólar que sus dueños tienen invertido en ella.'
};

interface InfoTooltipProps {
  concept?: FinancialConcept;
  text?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ concept, text, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const message = text || (concept ? CONCEPT_EXPLANATIONS[concept] : '');

  // Cerrar al hacer clic fuera (especialmente útil en dispositivos táctiles / móviles)
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

  if (!message) return null;

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
          setIsOpen(prev => !prev);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
        aria-label="Ayuda y explicación en lenguaje simple"
        title="Clic o pasar mouse para ver explicación sencilla"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip flotante con diseño elegante */}
      {isOpen && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-700/60 z-50 pointer-events-auto text-left font-normal animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="block font-medium text-slate-100">{message}</span>
          {/* Flechita inferior */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
        </span>
      )}
    </span>
  );
};
