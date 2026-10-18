import React from 'react';
import { PlusCircle, X } from 'lucide-react';

export interface CustomCompanyFormData {
  ticker: string;
  nombre: string;
  sector: string;
  precioCotizacion: number;
  activoCirculante: number;
  pasivoCirculante: number;
  inventarios: number;
  otrosActivosCirculantes: number;
  cuentasPorCobrar: number;
  efectivo: number;
  totalPasivo: number;
  patrimonioNeto: number;
  activosTotales: number;
  utilidadNeta: number;
  ebit: number;
  interesesPorPagar: number;
  ingresosTotales: number;
  numeroAcciones: number;
  capitalizacionBursatil: number;
  dividendoPorAccion: number;
}

export const INITIAL_CUSTOM_FORM: CustomCompanyFormData = {
  ticker: 'CUSTOM',
  nombre: 'Mi Empresa Analizada',
  sector: 'Industrial / Servicios',
  precioCotizacion: 50.0,
  activoCirculante: 1200,
  pasivoCirculante: 700,
  inventarios: 200,
  otrosActivosCirculantes: 50,
  cuentasPorCobrar: 180,
  efectivo: 450,
  totalPasivo: 1800,
  patrimonioNeto: 2400,
  activosTotales: 4200,
  utilidadNeta: 480,
  ebit: 620,
  interesesPorPagar: 60,
  ingresosTotales: 3800,
  numeroAcciones: 100,
  capitalizacionBursatil: 5000,
  dividendoPorAccion: 1.50
};

interface CustomCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  customForm: CustomCompanyFormData;
  setCustomForm: React.Dispatch<React.SetStateAction<CustomCompanyFormData>>;
}

export const CustomCompanyModal: React.FC<CustomCompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customForm,
  setCustomForm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Analizar mi empresa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <p className="text-xs text-slate-500">
            Introduce las magnitudes contables extraídas de los balances (10-K / 10-Q). El motor calculará de inmediato los 11 ratios y la Función de Scoring Linear S(a).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 mb-1 font-medium">Ticker Bursátil</label>
              <input
                type="text"
                required
                value={customForm.ticker}
                onChange={e => setCustomForm({ ...customForm, ticker: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-medium">Nombre de la Empresa</label>
              <input
                type="text"
                required
                value={customForm.nombre}
                onChange={e => setCustomForm({ ...customForm, nombre: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1 font-medium">Precio de Cotización ($)</label>
              <input
                type="number"
                step="0.1"
                required
                value={customForm.precioCotizacion}
                onChange={e => setCustomForm({ ...customForm, precioCotizacion: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Balance General Rápido */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block font-mono">
              1. Balance General (En Millones $)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Activo Circulante</label>
                <input
                  type="number"
                  value={customForm.activoCirculante}
                  onChange={e => setCustomForm({ ...customForm, activoCirculante: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Pasivo Circulante</label>
                <input
                  type="number"
                  value={customForm.pasivoCirculante}
                  onChange={e => setCustomForm({ ...customForm, pasivoCirculante: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Efectivo / Caja</label>
                <input
                  type="number"
                  value={customForm.efectivo}
                  onChange={e => setCustomForm({ ...customForm, efectivo: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Inventarios</label>
                <input
                  type="number"
                  value={customForm.inventarios}
                  onChange={e => setCustomForm({ ...customForm, inventarios: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Total Pasivo (Deuda)</label>
                <input
                  type="number"
                  value={customForm.totalPasivo}
                  onChange={e => setCustomForm({ ...customForm, totalPasivo: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Patrimonio Neto</label>
                <input
                  type="number"
                  value={customForm.patrimonioNeto}
                  onChange={e => setCustomForm({ ...customForm, patrimonioNeto: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Activos Totales</label>
                <input
                  type="number"
                  value={customForm.activosTotales}
                  onChange={e => setCustomForm({ ...customForm, activosTotales: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Acciones en Circulación</label>
                <input
                  type="number"
                  value={customForm.numeroAcciones}
                  onChange={e => setCustomForm({ ...customForm, numeroAcciones: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cuenta de Resultados Rápida */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block font-mono">
              2. Cuenta de Resultados (P&L en Millones $)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">EBIT (Op. Income)</label>
                <input
                  type="number"
                  value={customForm.ebit}
                  onChange={e => setCustomForm({ ...customForm, ebit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Intereses por Pagar</label>
                <input
                  type="number"
                  value={customForm.interesesPorPagar}
                  onChange={e => setCustomForm({ ...customForm, interesesPorPagar: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Utilidad Neta</label>
                <input
                  type="number"
                  value={customForm.utilidadNeta}
                  onChange={e => setCustomForm({ ...customForm, utilidadNeta: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Dividendo por Acción</label>
                <input
                  type="number"
                  step="0.05"
                  value={customForm.dividendoPorAccion}
                  onChange={e => setCustomForm({ ...customForm, dividendoPorAccion: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-sm active:scale-95"
            >
              Calcular Ratios & Semáforos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
