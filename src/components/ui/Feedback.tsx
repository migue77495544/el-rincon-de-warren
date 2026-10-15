import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// Entrada suave de tarjetas y gráficos (respeta prefers-reduced-motion vía CSS global)
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// Estado de carga elegante: barras con barrido de luz y un rótulo discreto
export const LoadingSkeleton: React.FC<{ label?: string; rows?: number; className?: string }> = ({
  label,
  rows = 3,
  className = ''
}) => (
  <div className={`py-5 space-y-4 ${className}`} role="status" aria-live="polite">
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-xl border border-slate-100 p-3 space-y-2">
          <div className="skeleton h-2.5 w-1/2" />
          <div className="skeleton h-5 w-3/4" />
        </div>
      ))}
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-2.5" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
    {label && (
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span>{label}</span>
      </div>
    )}
  </div>
);

export type StatusTone = 'green' | 'yellow' | 'red';

const TONE_STYLES: Record<StatusTone, { cls: string; Icon: typeof CheckCircle2 }> = {
  green: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-emerald-500/10', Icon: CheckCircle2 },
  yellow: { cls: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10', Icon: AlertTriangle },
  red: { cls: 'bg-rose-50 text-rose-800 border-rose-200 ring-rose-500/10', Icon: XCircle }
};

// Badge de estado con color semántico (verde = sano, ámbar = atención, rojo = riesgo)
export const StatusBadge: React.FC<{ tone: StatusTone; children: React.ReactNode; title?: string }> = ({
  tone,
  children,
  title
}) => {
  const { cls, Icon } = TONE_STYLES[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ring-4 ${cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
};
