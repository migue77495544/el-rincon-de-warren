import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Target, ShieldCheck } from 'lucide-react';

const ONBOARDING_KEY = 'warren_onboarding_seen';

const steps = [
  {
    id: 'welcome',
    title: 'Bienvenido a El Rincón de Warren',
    description: 'Este asistente te guía para aprender value investing paso a paso, como lo haría Warren Buffett.',
    icon: Sparkles,
  },
  {
    id: 'simple',
    title: 'Modo Simple Activado',
    description: 'Comenzamos con lo esencial: 4 indicadores clave que te dicen si una empresa es sólida o no.',
    icon: Target,
  },
  {
    id: 'analyst',
    title: 'Modo Analista (Opcional)',
    description: 'Si quieres profundizar, activa el Modo Analista en la barra superior para ver simuladores avanzados, ratios completos y la consola Python.',
    icon: ShieldCheck,
  },
];

export const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (seen === 'true') {
        setIsDone(true);
      }
    } catch {}
  }, []);

  const close = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    setIsDone(true);
  };

  const prevStep = () => setCurrentStep(s => Math.max(0, s - 1));
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      close();
    }
  };

  if (isDone) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-modal)] max-w-md w-full p-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <step.icon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
          </div>
          <button
            onClick={close}
            className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>

          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? 'bg-accent w-6' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-accent hover:bg-accent/90 transition-colors"
          >
            {currentStep === steps.length - 1 ? '¡Entendido!' : 'Siguiente'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
