import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollRailProps {
  children: React.ReactNode;
  /** Etiqueta accesible del grupo (p. ej. «Secciones») */
  label: string;
  /** Elemento contenedor: nav para navegación, div para filtros */
  as?: 'nav' | 'div';
  className?: string;
  innerClassName?: string;
  /** Color del fondo sobre el que se funde el borde (clase from-*) */
  fadeFrom?: string;
  /** Cambia cuando cambia la selección: la opción activa se trae a la vista */
  activeKey?: string;
}

/**
 * Carril horizontal desplazable que avisa de que hay más opciones:
 * difumina el borde y muestra una flecha en el lado que tiene contenido oculto.
 */
export const ScrollRail: React.FC<ScrollRailProps> = ({
  children,
  label,
  as = 'nav',
  className = '',
  innerClassName = '',
  fadeFrom = 'from-papel',
  activeKey
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  useEffect(() => {
    const active = ref.current?.querySelector<HTMLElement>('[aria-current]:not([aria-current="false"]), [aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const Tag = as;
  return (
    <Tag aria-label={label} className={`relative ${className}`}>
      <div ref={ref} onScroll={update} className={`flex overflow-x-auto no-scrollbar ${innerClassName}`}>
        {children}
      </div>
      {edges.left && (
        <div className={`absolute inset-y-0 left-0 flex items-center pr-6 bg-gradient-to-r ${fadeFrom} to-transparent`}>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            tabIndex={-1}
            aria-hidden="true"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
      {edges.right && (
        <div className={`absolute inset-y-0 right-0 flex items-center pl-6 bg-gradient-to-l ${fadeFrom} to-transparent`}>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            tabIndex={-1}
            aria-hidden="true"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Tag>
  );
};
