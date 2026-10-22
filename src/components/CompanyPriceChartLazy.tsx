import React, { lazy, Suspense } from 'react';
import type { CompanyPriceChartProps } from './CompanyPriceChart';

// lightweight-charts pesa ~56 kB comprimido: se descarga después del primer pintado
// para que en el celular el texto de la ficha aparezca antes que la gráfica
const CompanyPriceChartImpl = lazy(() => import('./CompanyPriceChart').then(m => ({ default: m.CompanyPriceChart })));

export const CompanyPriceChart: React.FC<CompanyPriceChartProps> = props => (
  <Suspense
    fallback={
      <div className="bg-white rounded-2xl border border-slate-200 p-5" role="status" aria-live="polite">
        <div className="skeleton h-3 w-1/3 mb-4"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    }
  >
    <CompanyPriceChartImpl {...props} />
  </Suspense>
);
