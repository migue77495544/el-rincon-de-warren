import React from 'react';
import { AlertTriangle, BookOpen, Check, ShieldAlert, Sparkles, X } from 'lucide-react';

interface InstantFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  errorType: string;
  solution: string;
}

export const InstantFeedbackModal: React.FC<InstantFeedbackModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  errorType,
  solution
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-slate-500">
              Feedback Heurístico Instantáneo (β = 0.151)
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-medium">Tipo de Sesgo Detectado:</span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {errorType}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold font-serif">
            <Sparkles className="w-4 h-4 text-slate-500" />
            <span>Principio de Value Investing de Warren:</span>
          </div>
          <p className="text-slate-700 italic">
            "{solution}"
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4" />
            Entendido, corregir mi enfoque
          </button>
        </div>
      </div>
    </div>
  );
};
