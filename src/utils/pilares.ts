// Pilares de la ficha para principiantes: comprobaciones de sí/no explicadas en una frase.
// Solo leen datos que ya calcula la app (ratios, semáforos, consenso y foso); no cambian ninguna fórmula.
import { CompanyAnalysis, RatioEvaluation } from '../types';
import { marginLevel } from './verdict';

export interface Comprobacion {
  /** null = sin datos para comprobarlo */
  ok: boolean | null;
  texto: string;
}

export interface Pilar {
  id: 'valoracion' | 'salud' | 'rentabilidad' | 'foso';
  titulo: string;
  pregunta: string;
  comprobaciones: Comprobacion[];
  definicion: string;
}

const verde = (r?: RatioEvaluation) => (r ? r.status === 'green' : null);
const num = (r?: RatioEvaluation) => (r && Number.isFinite(r.value) ? r.value : null);
const x = (v: number) => `${v.toFixed(2)}x`;
const pct = (v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
/** ROE, ROA y dividendo vienen como fracción (0,168 = 16,8 %) desde calculateFundamentalRatios */
const comoPct = (v: number | null) => (v === null ? null : v * 100);

export function calcularPilares(c: CompanyAnalysis): Pilar[] {
  const r = c.ratios;
  const per = num(r.per);
  const pb = num(r.pb);
  const yieldDiv = comoPct(num(r.yieldDividendo));
  const upside = c.targetConsensus?.upside_potential;
  const margen = marginLevel(c);
  const liquidez = num(r.liquidezCorriente);
  const acida = num(r.ratioTesoreriaPruebaAcida);
  const deuda = num(r.endeudamiento);
  const cobertura = num(r.coberturaIntereses);
  const roe = comoPct(num(r.roe));
  const roa = comoPct(num(r.roa));
  const ke = Number((c as any)?.ke || 9.5);
  const margenNeto = c.raw.ingresosTotales > 0 ? (c.raw.utilidadNeta / c.raw.ingresosTotales) * 100 : null;

  return [
    {
      id: 'valoracion',
      titulo: 'Valoración',
      pregunta: '¿Está a buen precio?',
      definicion: 'Compara lo que cuesta la acción con lo que gana la empresa, con su patrimonio y con lo que creen los analistas que vale. Un buen negocio a un precio excesivo puede ser una mala inversión.',
      comprobaciones: [
        {
          ok: margen === 'sin-cobertura' ? null : margen !== 'sin-margen',
          texto: margen === 'sin-cobertura' ? 'No hay precio objetivo de analistas con el que comparar.'
            : margen === 'sin-margen' ? `Cotiza por encima de lo que los analistas creen que vale (${pct(upside!)}).`
            : `Cotiza por debajo de lo que los analistas creen que vale (${upside! >= 0 ? '+' : ''}${pct(upside!)} de recorrido).`
        },
        {
          ok: margen === 'sin-cobertura' ? null : margen === 'amplio',
          texto: margen === 'amplio' ? 'El descuento supera el 15 %: hay margen de seguridad.' : 'El descuento no llega al 15 % que pide un inversor de valor.'
        },
        {
          ok: per === null || per <= 0 ? false : verde(r.per),
          texto: per === null || per <= 0 ? 'No tiene beneficios, así que el PER no sirve para valorarla.'
            : `Pagas ${x(per)} sus beneficios anuales (PER); ${verde(r.per) ? 'es un precio razonable' : 'es un precio exigente'}.`
        },
        {
          ok: pb === null ? null : verde(r.pb),
          texto: pb === null ? 'Sin dato de precio frente a patrimonio.' : `Cuesta ${x(pb)} lo que vale su patrimonio contable${verde(r.pb) ? ', una cifra moderada' : ', una prima alta'}.`
        },
        {
          ok: yieldDiv === null ? null : yieldDiv > 0,
          texto: yieldDiv && yieldDiv > 0 ? `Reparte dividendo: un ${pct(yieldDiv)} al año sobre el precio.` : 'No reparte dividendo ahora mismo.'
        }
      ]
    },
    {
      id: 'salud',
      titulo: 'Salud financiera',
      pregunta: '¿Puede pagar lo que debe?',
      definicion: 'Mira si la empresa tiene dinero suficiente para pagar sus deudas de este año y si depende demasiado de los bancos. Las empresas que quiebran casi siempre lo hacen por deuda.',
      comprobaciones: [
        {
          ok: liquidez === null ? null : verde(r.liquidezCorriente),
          texto: liquidez === null ? 'Sin dato de liquidez.' : `Tiene $${liquidez.toFixed(2)} que cobrará pronto por cada $1 que debe pagar este año.`
        },
        {
          ok: acida === null ? null : verde(r.ratioTesoreriaPruebaAcida),
          texto: acida === null ? 'Sin dato de prueba ácida.' : `Sin contar inventarios, cubre ${x(acida)} sus deudas de corto plazo.`
        },
        {
          ok: deuda === null ? null : verde(r.endeudamiento),
          texto: deuda === null ? 'Sin dato de deuda.' : `Debe $${deuda.toFixed(2)} por cada $1 que es de sus dueños${verde(r.endeudamiento) ? ', una deuda prudente' : ', una deuda elevada'}.`
        },
        {
          ok: cobertura === null ? null : verde(r.coberturaIntereses),
          texto: cobertura === null ? 'Sin dato de intereses.' : cobertura >= 99 ? 'Prácticamente no paga intereses: casi no tiene deuda financiera.' : `Su beneficio operativo paga ${x(cobertura)} los intereses de la deuda.`
        }
      ]
    },
    {
      id: 'rentabilidad',
      titulo: 'Rentabilidad',
      pregunta: '¿Gana dinero de verdad?',
      definicion: 'Mide cuánto gana la empresa con el dinero de sus dueños y con todo lo que tiene. Buffett busca más de un 15 % sobre el patrimonio, año tras año.',
      comprobaciones: [
        {
          ok: roe === null ? null : verde(r.roe),
          texto: roe === null ? 'Sin dato de ROE.' : `Gana un ${pct(roe)} sobre el dinero de sus dueños (ROE)${roe >= 15 ? ', por encima del 15 % que busca Buffett' : ''}.`
        },
        {
          ok: roe === null ? null : roe >= ke,
          texto: roe === null ? 'No se puede comparar con el coste del capital.' : roe >= ke ? `Rinde más que el ${pct(ke)} que exigiría un inversor: crea valor.` : `Rinde menos que el ${pct(ke)} que exigiría un inversor: no crea valor.`
        },
        {
          ok: roa === null ? null : verde(r.roa),
          texto: roa === null ? 'Sin dato de ROA.' : `Gana un ${pct(roa)} sobre todo lo que tiene (ROA).`
        },
        {
          ok: margenNeto === null ? null : margenNeto > 0,
          texto: margenNeto === null ? 'Sin datos de ventas.' : margenNeto > 0 ? `De cada $100 que vende, le quedan $${margenNeto.toFixed(0)} de beneficio.` : 'Hoy pierde dinero con lo que vende.'
        }
      ]
    },
    {
      id: 'foso',
      titulo: 'Foso económico',
      pregunta: '¿Está protegida de la competencia?',
      definicion: 'Un foso es lo que impide que otros copien el negocio: una marca querida, clientes que no pueden irse fácilmente o costes más bajos. Con foso, los beneficios duran.',
      comprobaciones: [
        {
          ok: c.moat === 'Amplio' ? true : c.moat === 'Ninguno' ? false : null,
          texto: c.moat === 'Amplio' ? 'Tiene ventajas que a otros les costaría años igualar.' : c.moat === 'Medio' ? 'Tiene alguna ventaja, pero los competidores pueden alcanzarla.' : 'No tiene una ventaja clara: compite sobre todo por precio.'
        },
        {
          ok: roe === null ? null : roe >= 15,
          texto: roe !== null && roe >= 15 ? 'Su rentabilidad alta sugiere que la competencia no logra quitarle clientes.' : 'Su rentabilidad no muestra una ventaja clara sobre la competencia.'
        },
        {
          ok: margenNeto === null ? null : margenNeto >= 10,
          texto: margenNeto !== null && margenNeto >= 10 ? 'Sus márgenes altos indican que puede poner precio.' : 'Sus márgenes son estrechos: le cuesta subir precios.'
        }
      ]
    }
  ];
}

export const aprobadas = (p: Pilar) => p.comprobaciones.filter(c => c.ok === true).length;
