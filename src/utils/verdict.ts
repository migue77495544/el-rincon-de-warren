import { CompanyAnalysis, TrafficLight } from '../types';

/** Margen de seguridad según el objetivo medio del consenso (mismos umbrales que la ficha) */
export type MarginLevel = 'amplio' | 'estrecho' | 'sin-margen' | 'sin-cobertura';

/** Colchón que exige un inversor value frente al objetivo de los analistas */
export const MARGEN_EXIGIDO = 0.15;

export function marginLevel(company: CompanyAnalysis): MarginLevel {
  const upside = company.targetConsensus?.upside_potential;
  if (upside === undefined || upside === null || !Number.isFinite(upside)) return 'sin-cobertura';
  if (upside >= 15) return 'amplio';
  if (upside >= 0) return 'estrecho';
  return 'sin-margen';
}

const MARGIN_TEXT: Record<MarginLevel, string> = {
  amplio: 'el precio deja un margen de seguridad amplio frente al objetivo de los analistas',
  estrecho: 'el margen de seguridad frente al objetivo de los analistas es estrecho',
  'sin-margen': 'cotiza por encima del objetivo medio de los analistas, sin margen de seguridad',
  'sin-cobertura': 'no hay objetivo de analistas con el que medir el margen de seguridad'
};

const DIMENSION_NAMES: Record<keyof CompanyAnalysis['dimensiones'], string> = {
  liquidez: 'liquidez',
  solvencia: 'solvencia',
  rentabilidad: 'rentabilidad',
  valoracion: 'valoración'
};

export type QualityLevel = 'alta' | 'solida' | 'irregular' | 'debil';

export function qualityLevel(score: number): QualityLevel {
  return score >= 80 ? 'alta' : score >= 65 ? 'solida' : score >= 50 ? 'irregular' : 'debil';
}

/**
 * Veredicto en una frase calculado con los datos que muestra la ficha.
 * Sustituye al texto fijo de los datos semilla, que podía contradecir
 * la cotización o el consenso del día.
 */
export function deriveVerdict(company: CompanyAnalysis): { text: string; tone: TrafficLight } {
  const score = company.linearScore;
  const quality =
    score >= 80 ? 'Negocio de calidad alta' :
    score >= 65 ? 'Negocio sólido con puntos a vigilar' :
    score >= 50 ? 'Calidad irregular' :
    'Fundamentales débiles';

  const dims = Object.entries(company.dimensiones ?? {}) as [keyof CompanyAnalysis['dimensiones'], { score: number }][];
  const weakest = dims.length ? dims.reduce((min, cur) => (cur[1].score < min[1].score ? cur : min)) : null;
  const weakNote = weakest && weakest[1].score < 50 ? `; su punto débil es la ${DIMENSION_NAMES[weakest[0]]}` : '';

  const margin = marginLevel(company);
  const text = `${quality} (S(a) ${score}/100)${weakNote}. Hoy ${MARGIN_TEXT[margin]}.`;

  const tone: TrafficLight =
    score >= 65 && margin === 'amplio' ? 'green' :
    score < 50 || margin === 'sin-margen' ? 'red' :
    'yellow';
  return { text, tone };
}

export interface PlainVerdict {
  /** Respuesta corta a «¿es buena inversión hoy?» */
  headline: string;
  /** Por qué, en una o dos frases sin jerga */
  reason: string;
  /** Qué haría un inversor value con esta información (educativo, no consejo) */
  nextStep: string;
  tone: TrafficLight;
  quality: QualityLevel;
  margin: MarginLevel;
  /** Precio por debajo del cual habría un colchón del 15 % frente al objetivo */
  buyBelow: number | null;
}

/** Veredicto para principiantes: separa «la empresa» de «el precio», que es lo que más confunde. */
export function plainVerdict(company: CompanyAnalysis): PlainVerdict {
  const quality = qualityLevel(company.linearScore);
  const margin = marginLevel(company);
  const target = company.targetConsensus?.target_mean;
  const price = company.raw.precioCotizacion;
  const buyBelow = target && target > 0 ? target * (1 - MARGEN_EXIGIDO) : null;
  const good = quality === 'alta' || quality === 'solida';
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  let headline: string;
  let tone: TrafficLight;
  if (!good && quality === 'debil') {
    headline = 'Empresa débil: mejor no arriesgarse';
    tone = 'red';
  } else if (margin === 'sin-cobertura') {
    headline = good ? 'Buena empresa, pero sin referencia de precio' : 'Empresa irregular y sin referencia de precio';
    tone = 'yellow';
  } else if (good && margin === 'amplio') {
    headline = 'Buena empresa a buen precio';
    tone = 'green';
  } else if (good && margin === 'estrecho') {
    headline = 'Buena empresa, pero hoy no está barata';
    tone = 'yellow';
  } else if (good) {
    headline = 'Buena empresa, pero hoy está cara';
    tone = 'red';
  } else if (margin === 'amplio') {
    headline = 'Parece barata, pero la empresa flojea';
    tone = 'yellow';
  } else {
    headline = 'Empresa irregular y sin descuento';
    tone = 'red';
  }

  const qualityText: Record<QualityLevel, string> = {
    alta: 'El negocio es de los buenos: gana dinero, debe poco y paga sus cuentas sin apuros.',
    solida: 'El negocio es sólido, aunque tiene algún punto que conviene vigilar.',
    irregular: 'El negocio tiene puntos fuertes y débiles a partes iguales.',
    debil: 'El negocio flojea: gana poco, debe demasiado o le cuesta pagar sus cuentas.'
  };
  const priceText: Record<MarginLevel, string> = {
    amplio: `Además cotiza bastante por debajo de lo que los analistas creen que vale${target ? ` (${fmt(target)})` : ''}.`,
    estrecho: `Su precio está cerca de lo que los analistas creen que vale${target ? ` (${fmt(target)})` : ''}, así que no hay colchón si las cosas salen peor.`,
    'sin-margen': `Su precio ya supera lo que los analistas creen que vale${target ? ` (${fmt(target)})` : ''}.`,
    'sin-cobertura': 'Ningún analista publica un precio objetivo, así que no hay con qué comparar el precio.'
  };

  let nextStep: string;
  if (quality === 'debil') {
    nextStep = margin === 'amplio'
      ? 'Un inversor value la dejaría pasar, aunque parezca barata: lo barato puede salir caro.'
      : 'Un inversor value la dejaría pasar: el negocio no da garantías y el precio tampoco ayuda.';
  } else if (buyBelow && margin !== 'amplio') {
    nextStep = `Un inversor value la vigilaría y esperaría a que bajase de ${fmt(buyBelow)} para tener un colchón del 15 %. Hoy cotiza a ${fmt(price)}.`;
  } else if (margin === 'amplio') {
    nextStep = 'Un inversor value la estudiaría a fondo: es el tipo de situación que busca.';
  } else {
    nextStep = 'Un inversor value estimaría su valor por su cuenta antes de decidir.';
  }

  return { headline, reason: `${qualityText[quality]} ${priceText[margin]}`, nextStep, tone, quality, margin, buyBelow };
}
