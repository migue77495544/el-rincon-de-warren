// Perfil de la empresa en español: Yahoo Finance publica la descripción, el sector y la
// industria en inglés. Se traducen una vez con Gemini y se guardan 30 días; sin Gemini se usa
// un texto en español construido con el sector (nunca se muestra el texto en inglés).
import { generar, geminiDisponible } from './gemini';
import { cachedPersistent } from '../store';
import { industriaEs } from '../../src/utils/industrias';

const SECTORES: Record<string, string> = {
  Technology: 'Tecnología',
  'Financial Services': 'Servicios financieros',
  Healthcare: 'Salud',
  'Consumer Cyclical': 'Consumo discrecional',
  'Consumer Defensive': 'Consumo básico',
  'Communication Services': 'Comunicaciones',
  Industrials: 'Industria',
  Energy: 'Energía',
  'Basic Materials': 'Materiales básicos',
  'Real Estate': 'Inmobiliario',
  Utilities: 'Servicios públicos'
};

export interface PerfilEs {
  success: true;
  descripcion: string;
  queHace: string;
  comoGanaDinero: string;
  sector: string;
  industria: string;
  fuente: 'gemini' | 'local';
}

export function sectorEs(sector: string): string {
  return SECTORES[sector] || sector;
}

function perfilLocal(nombre: string, sector: string, industria: string): PerfilEs {
  const s = sectorEs(sector);
  return {
    success: true,
    descripcion: `${nombre} es una empresa cotizada del sector ${s.toLowerCase()}.`,
    queHace: `${nombre} opera en el sector ${s.toLowerCase()}${industria ? ` (${industriaEs(industria).toLowerCase()})` : ''}.`,
    comoGanaDinero: 'Obtiene ingresos con la venta de sus productos y servicios a sus clientes.',
    sector: s,
    industria: industriaEs(industria),
    fuente: 'local'
  };
}

/** Descripción, sector e industria en español (caché de 30 días por empresa) */
export async function getPerfilEs(ticker: string, nombre: string, sector: string, industria: string, resumen: string): Promise<PerfilEs> {
  if (!geminiDisponible() || !resumen || resumen.length < 40) return perfilLocal(nombre, sector, industria);
  try {
    return await cachedPersistent(`perfil-es-${ticker.toUpperCase()}`, 30 * 24 * 60 * 60 * 1000, async () => {
      const texto = await generar(
        `Empresa: ${nombre} (${ticker})\nSector: ${sector}\nIndustria: ${industria}\nDescripción original en inglés:\n${resumen.slice(0, 3000)}`,
        {
          systemInstruction:
            'Eres un editor financiero. Escribe en español neutro, claro para un principiante, sin anglicismos innecesarios ' +
            '(conserva nombres propios de productos y siglas como ERP o IA). Responde SOLO con un JSON válido con estas claves: ' +
            '"descripcion" (2 frases, máximo 45 palabras, qué es la empresa), "queHace" (1 frase: qué vende o hace), ' +
            '"comoGanaDinero" (1 frase: de dónde salen sus ingresos), "sector" (traducido) e "industria" (traducida). ' +
            'No inventes datos que no estén en la descripción.',
          temperature: 0.2,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
          presupuestoMs: 15000,
          timeoutPorModeloMs: 12000
        }
      );
      const j = JSON.parse(texto.replace(/^```(json)?/, '').replace(/```$/, '').trim());
      if (!j.descripcion || !j.queHace) throw new Error('Traducción incompleta');
      return {
        success: true as const,
        descripcion: String(j.descripcion),
        queHace: String(j.queHace),
        comoGanaDinero: String(j.comoGanaDinero || ''),
        sector: String(j.sector || sectorEs(sector)),
        industria: String(j.industria || industriaEs(industria)),
        fuente: 'gemini' as const
      };
    });
  } catch {
    return perfilLocal(nombre, sector, industria);
  }
}
