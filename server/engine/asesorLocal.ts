// Respuestas de los asesores cuando Gemini no está disponible (sin clave, saturado o sin tiempo).
// A diferencia de las plantillas anteriores, primero se detecta el tema de la pregunta y se responde
// solo eso, con las cifras reales del contexto, en texto plano y en español. Si falta el dato, se dice.

export interface Fundamental {
  datosOk: boolean; t: string; nombre: string; sector: string; precio: number; per: string; roe: number; liquidez: number;
  deuda: string; cobertura: string; moat: string; potencial: number; precioObjetivo: number; recomendacion: string;
  analistas: number; ke: number; queHace: string; comoGana: string; valoracion: any; tieneConsenso: boolean;
}

export interface Tecnico {
  datosOk: boolean; precio: number; ema20: number; ema50: number; ema200: number; rsi: number;
  macdLine: number; macdSignal: number; macdHist: number; soporte: number; resistencia: number;
  stopLoss: number; ratioRb: number; extra: string;
}

const CIERRE = 'Análisis educativo; no es una recomendación de inversión.';
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Ratios y porcentajes con coma decimal (como el resto de la app); precios en dólares con punto, como en la ficha
const dec = (v: number, k: number) => v.toFixed(k).replace('.', ',');
const d1 = (v: number) => dec(v, 1);
const d2 = (v: number) => dec(v, 2);
const x = (s: string) => s.replace('.', ',');
const usd = (v: number) => `$${v.toFixed(2)}`;
const pct = (v: number) => `${d1(v)} %`;
const mm = (v: number) => `${v < 0 ? '-' : ''}${String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} millones de dólares`;
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const TEMAS_JAIRO: Array<[string, RegExp]> = [
  ['dividendo', /dividend|reparte|paga .*accionistas|payout/],
  ['dcf', /\bdcf\b|valor intrinseco|cuanto vale|valor real|flujos? de caja/],
  ['deuda', /deuda|endeud|apalanc|\bdebe\b|pasivo|solvencia|quiebra|intereses/],
  ['liquidez', /liquidez|\bcaja\b|efectivo|corto plazo|pagar sus|razon corriente|prueba acida/],
  ['roe', /\broe\b|\broa\b|rentab|gana dinero|beneficio|margen (neto|operativo|bruto)|ganancias/],
  ['creacion', /\broic\b|\bwacc\b|\bk_?e\b|costo de capital|coste de capital|crea valor|destruye valor/],
  ['valoracion', /\bper\b|\bcar[oa]s?\b|barat|sobrevalor|infravalor|valoracion|multiplo|precio objetivo|potencial|margen de seguridad|consenso|analistas|ev\/?ebitda/],
  ['foso', /foso|moat|ventaja|competen|marca/],
  ['crecimiento', /crec|ventas|ingresos|futuro/],
  ['tecnico', /\brsi\b|\bema\b|media movil|\bmacd\b|soporte|resistencia|stop|grafico|tendencia|chartista/]
];

const TEMAS_GUILLERMO: Array<[string, RegExp]> = [
  ['stop', /stop|perdida limite|cuanto arriesgo|donde salgo|salida/],
  ['rb', /riesgo ?\/? ?beneficio|ratio r|2 a 1|relacion riesgo/],
  ['rsi', /\brsi\b|sobrecompra|sobreventa|oscilador/],
  ['macd', /\bmacd\b|impulso|momentum/],
  ['niveles', /soporte|resistencia|niveles|techo|piso|suelo/],
  ['tendencia', /\bema\b|media|tendencia|alcista|bajista/],
  ['volatilidad', /volatil|\batr\b|riesgo/],
  ['entrada', /entrar|entrada|comprar ahora|momento|cuando compr|es buen momento|timing/],
  ['fundamental', /\broe\b|deuda|dividend|\bper\b|valor intrinseco|foso|balance|beneficio|ventas/]
];

export function temaDe(pregunta: string, temas: Array<[string, RegExp]>): string | null {
  const q = sinTildes(pregunta);
  return temas.find(([, re]) => re.test(q))?.[0] ?? null;
}

const esGeneral = (pregunta: string) =>
  /diagnostico|evaluacion completa|analisis completo|panorama|resumen|general|que opinas|como ves|vale la pena|deberia comprar|conviene/.test(sinTildes(pregunta));

/* ───────────────────────── Jairo (fundamental) ───────────────────────── */

function veredictoJairo(f: Fundamental): string {
  const v = f.valoracion || {};
  const creaValor = n(v.roicPct) !== null && n(v.waccPct) !== null ? v.roicPct > v.waccPct : f.roe > f.ke;
  const deudaNum = parseFloat(f.deuda);
  const deudaAlta = n(v.deudaNetaEbitda) !== null ? v.deudaNetaEbitda > 3 : deudaNum > 2;
  if (!creaValor) return 'Descartar por ahora: el negocio no rinde más que su coste de capital.';
  if (deudaAlta) return 'Esperar: el negocio crea valor, pero la deuda es alta y reduce el margen de error.';
  if (f.tieneConsenso && f.potencial >= 15) return 'Estudiar la compra: negocio de calidad y precio con margen de seguridad frente al consenso.';
  if (f.tieneConsenso && f.potencial < 0) return `Esperar a mejor precio: la calidad es buena, pero cotiza un ${pct(-f.potencial)} por encima del objetivo de los analistas.`;
  return `Esperar a mejor precio: la calidad es buena, pero hoy el descuento es escaso${f.tieneConsenso ? ` (${f.potencial >= 0 ? '+' : ''}${pct(f.potencial)} frente al consenso)` : ''}.`;
}

function bloqueJairo(tema: string, f: Fundamental): string {
  const v = f.valoracion || {};
  switch (tema) {
    case 'dividendo': {
      const dpa = n(v.dividendoPorAccion);
      if (!dpa) return `DIVIDENDO:\n${f.nombre} no reparte dividendo en este momento según los datos disponibles. Toda su rentabilidad para el accionista depende de que el precio suba con los beneficios.`;
      const payout = n(v.payoutPct);
      return `DIVIDENDO:\nSí: paga ${usd(dpa)} por acción al año, una rentabilidad del ${pct(n(v.rentabilidadDividendoPct) ?? 0)} sobre el precio de ${usd(f.precio)}.` +
        (payout !== null ? `\n- Reparte el ${pct(payout)} de su beneficio${payout > 80 ? ': deja poco margen y el dividendo podría estar en riesgo si el beneficio cae' : ': es sostenible con el beneficio actual'}.` : '') +
        (n(v.fcfMM) !== null ? `\n- Su flujo de caja libre del último ejercicio fue de ${mm(v.fcfMM)}${v.fcfMM < 0 ? ', negativo: el dividendo no lo financia la caja del negocio' : ''}.` : '');
    }
    case 'deuda': {
      // La deuda financiera (deuda neta / EBITDA) manda; el pasivo total incluye proveedores y se infla con recompras
      const dne = n(v.deudaNetaEbitda);
      const pp = parseFloat(f.deuda);
      const nivel = dne !== null ? (dne <= 1 ? 'prudente' : dne <= 3 ? 'moderado' : 'alto') : (pp <= 1 ? 'prudente' : pp <= 2 ? 'moderado' : 'alto');
      return 'DEUDA:\n' +
        (n(v.deudaNetaMM) !== null
          ? (v.deudaNetaMM <= 0
            ? `- Tiene más caja que deuda financiera: caja neta de ${mm(-v.deudaNetaMM)}.\n`
            : `- Deuda neta de ${mm(v.deudaNetaMM)}${dne !== null ? `: ${d2(dne)} veces su EBITDA anual (hasta 3 se considera manejable)` : ''}.\n`)
          : '') +
        `- Su beneficio operativo cubre ${x(f.cobertura)} veces los intereses${parseFloat(f.cobertura) < 3 ? ', poco margen' : ''}.\n` +
        `- Pasivo total frente a patrimonio: ${x(f.deuda)} veces${pp > 2 && nivel !== 'alto' ? ' (alto, pero buena parte no es deuda bancaria o se debe a recompras de acciones)' : ''}.\n` +
        `LECTURA: ${nivel === 'prudente' ? 'endeudamiento prudente.' : nivel === 'moderado' ? 'endeudamiento moderado: lo paga con lo que genera, pero conviene vigilarlo.' : 'endeudamiento alto: en una recesión la deuda puede asfixiar al negocio.'}`;
    }
    case 'liquidez':
      return `LIQUIDEZ:\nTiene ${usd(f.liquidez)} en activos que cobrará pronto por cada $1 que debe pagar este año. ${f.liquidez >= 1.5 ? 'Es una posición cómoda.' : f.liquidez >= 1 ? 'Cubre lo justo; sin margen para imprevistos.' : 'No alcanza: depende de vender inventario, cobrar rápido o pedir prestado.'}`;
    case 'roe':
      return `RENTABILIDAD:\n- ROE del ${pct(f.roe)}: gana $${f.roe.toFixed(0)} al año por cada $100 de sus dueños${f.roe >= 15 ? ', por encima del 15 % que busca Buffett' : ''}.` +
        (n(v.margenNetoPct) !== null ? `\n- Margen neto del ${pct(v.margenNetoPct)}${n(v.margenOperativoPct) !== null ? ` y operativo del ${pct(v.margenOperativoPct)}` : ''}.` : '') +
        ((n(v.deudaNetaEbitda) ?? parseFloat(f.deuda)) > 2 ? '\n- Ojo: con tanta deuda, parte de ese ROE se debe al apalancamiento, no solo a la calidad del negocio.' : '');
    case 'creacion':
      return `CREACIÓN DE VALOR:\n` +
        (n(v.roicPct) !== null && n(v.waccPct) !== null
          ? `ROIC del ${pct(v.roicPct)} frente a un WACC del ${pct(v.waccPct)}: diferencial de ${d1(v.roicPct - v.waccPct)} puntos (${v.roicPct > v.waccPct ? 'crea valor' : 'destruye valor'}).`
          : `ROE del ${pct(f.roe)} frente a un coste del capital propio (K_e) del ${pct(f.ke)}: ${f.roe >= f.ke ? 'crea valor' : 'no cubre lo que exige el accionista'}.`);
    case 'dcf': {
      const dcf = v.dcf;
      if (!dcf) return `VALOR INTRÍNSECO:\nNo hay DCF de referencia: ${v.esFinanciera ? 'en entidades financieras no aplica.' : 'su flujo de caja libre es negativo o insuficiente para proyectarlo con sentido.'}`;
      return `VALOR INTRÍNSECO:\nEl DCF de referencia da ${usd(dcf.valorPorAccion)} por acción, un ${dcf.valorVsPrecioPct >= 0 ? '+' : ''}${d1(dcf.valorVsPrecioPct)} % frente al precio de ${usd(f.precio)}.\n- Supuestos: crecimiento del ${d1(dcf.crecimiento5aPct)} % anual 5 años, ${d1(dcf.crecimientoTerminalPct)} % perpetuo, descontado al WACC.\n- Es un escenario mecánico, no un precio objetivo: si el crecimiento real es menor, el valor baja.`;
    }
    case 'valoracion':
      return `VALORACIÓN:\n- PER de ${x(f.per)} veces${n(v.perForward) !== null ? ` (${d2(v.perForward)} con beneficios estimados)` : ''}.` +
        (n(v.evEbitda) !== null ? `\n- EV/EBITDA de ${d2(v.evEbitda)} veces.` : '') +
        (f.tieneConsenso ? `\n- El consenso de ${f.analistas} analistas sitúa el objetivo en ${usd(f.precioObjetivo)}, un ${f.potencial >= 0 ? '+' : ''}${pct(f.potencial)} frente a ${usd(f.precio)}.` : '\n- No hay precio objetivo de analistas.') +
        `\nLECTURA: ${f.tieneConsenso ? (f.potencial >= 15 ? 'hay margen de seguridad frente al consenso.' : f.potencial >= 0 ? 'el descuento no llega al 15 % que exige un inversor de valor.' : 'cotiza por encima de lo que estiman los analistas.') : 'sin consenso, apóyate en el PER y el flujo libre.'}`;
    case 'foso':
      return `FOSO ECONÓMICO:\nLa heurística lo califica como «${f.moat}». ${f.roe >= 15 ? `Un ROE del ${pct(f.roe)} sostenido sugiere que la competencia no le quita clientes.` : `Un ROE del ${pct(f.roe)} no muestra una ventaja clara.`}` +
        (n(v.margenBrutoPct) !== null ? ` Su margen bruto del ${pct(v.margenBrutoPct)} ${v.margenBrutoPct >= 40 ? 'indica capacidad para poner precio.' : 'es modesto.'}` : '');
    case 'crecimiento':
      return `CRECIMIENTO:\n` +
        (n(v.crecimientoIngresosPct) !== null ? `- Ingresos: ${v.crecimientoIngresosPct >= 0 ? '+' : ''}${pct(v.crecimientoIngresosPct)} interanual.\n` : '- No hay dato de crecimiento de ingresos.\n') +
        (n(v.crecimientoBeneficiosPct) !== null ? `- Beneficios: ${v.crecimientoBeneficiosPct >= 0 ? '+' : ''}${pct(v.crecimientoBeneficiosPct)} interanual.` : '- No hay dato de crecimiento de beneficios.');
    case 'tecnico':
      return `ALCANCE:\nEsa es una pregunta técnica: te la responde mejor Juan Guillermo. Desde la valoración, ${f.tieneConsenso ? `el precio de ${usd(f.precio)} está ${f.potencial >= 0 ? `un ${pct(f.potencial)} por debajo` : `un ${pct(-f.potencial)} por encima`} del objetivo de los analistas.` : `lo relevante es si ${usd(f.precio)} deja margen frente a lo que vale el negocio.`}`;
    default:
      return '';
  }
}

export function respuestaLocalJairo(pregunta: string, f: Fundamental): string {
  const tema = esGeneral(pregunta) ? null : temaDe(pregunta, TEMAS_JAIRO);
  if (!tema) {
    // Diagnóstico completo, breve y en orden
    return [
      `NEGOCIO:\n${f.queHace}${f.comoGana ? ` ${f.comoGana}` : ''}`,
      bloqueJairo('creacion', f),
      bloqueJairo('deuda', f),
      bloqueJairo('valoracion', f),
      `VEREDICTO:\n${veredictoJairo(f)}`,
      CIERRE
    ].join('\n\n');
  }
  return [bloqueJairo(tema, f), `CONCLUSIÓN:\n${veredictoJairo(f)}`, CIERRE].join('\n\n');
}

/* ───────────────────────── Juan Guillermo (técnico) ───────────────────────── */

function veredictoGuillermo(m: Tecnico): string {
  if (m.precio < m.ema200) return `No operar: el precio (${usd(m.precio)}) está bajo la EMA 200 (${usd(m.ema200)}). Esperar a que la recupere con un cierre diario.`;
  if (m.ratioRb < 2) return `Esperar: la relación riesgo/beneficio es de ${d1(m.ratioRb)} a 1 y no llega al mínimo de 2 a 1. Una entrada cerca del soporte (${usd(m.soporte)}) la mejoraría.`;
  if (m.rsi >= 70) return `Esperar un retroceso: tendencia alcista, pero el RSI (${d1(m.rsi)}) está en sobrecompra.`;
  return `Operación válida con disciplina: tendencia alcista, relación ${d1(m.ratioRb)} a 1 y pérdida límite en ${usd(m.stopLoss)}.`;
}

function bloqueGuillermo(tema: string, m: Tecnico): string {
  const riesgo = m.precio - m.stopLoss;
  switch (tema) {
    case 'stop':
      return `PÉRDIDA LÍMITE (STOP LOSS):\nLa pondría en ${usd(m.stopLoss)}, un 2 % bajo el soporte de ${usd(m.soporte)}.\n- Riesgo por acción entrando hoy: ${usd(m.precio)} − ${usd(m.stopLoss)} = ${usd(riesgo)} (${pct((riesgo / m.precio) * 100)} del precio).\n- Un cierre diario por debajo de ${usd(m.stopLoss)} invalida la operación.`;
    case 'rb':
      return `RIESGO/BENEFICIO:\nEntrando a ${usd(m.precio)} con pérdida límite en ${usd(m.stopLoss)} y objetivo en la resistencia de ${usd(m.resistencia)}:\n- (${usd(m.resistencia)} − ${usd(m.precio)}) / (${usd(m.precio)} − ${usd(m.stopLoss)}) = ${d1(m.ratioRb)} a 1.\n- ${m.ratioRb >= 2 ? 'Cumple la regla mínima de 2 a 1.' : `No cumple el mínimo de 2 a 1: no se opera a este precio. Llegaría a 2 a 1 entrando a ${usd((m.resistencia + 2 * m.stopLoss) / 3)} o menos.`}`;
    case 'rsi':
      return `RSI (14):\nEstá en ${d1(m.rsi)}. ${m.rsi >= 70 ? 'Zona de sobrecompra: el impulso comprador puede agotarse; no es momento de perseguir el precio.' : m.rsi <= 30 ? 'Zona de sobreventa: puede haber rebote si el precio defiende el soporte.' : 'Zona neutral: no da una señal extrema por sí solo.'}`;
    case 'macd':
      return `MACD (12/26/9):\nLínea en ${m.macdLine >= 0 ? '+' : ''}${d2(m.macdLine)}, señal en ${m.macdSignal >= 0 ? '+' : ''}${d2(m.macdSignal)} e histograma en ${m.macdHist >= 0 ? '+' : ''}${d2(m.macdHist)}. ${m.macdHist >= 0 ? 'El impulso es comprador.' : 'El impulso es vendedor.'}`;
    case 'niveles':
      return `NIVELES:\n- Soporte (mínimo de 20 sesiones): ${usd(m.soporte)}.\n- Resistencia (máximo de 120 sesiones): ${usd(m.resistencia)}.\n- Precio actual: ${usd(m.precio)}, a ${pct(((m.precio - m.soporte) / m.precio) * 100)} del soporte.`;
    case 'tendencia':
      return `TENDENCIA:\n- Precio ${usd(m.precio)} frente a EMA 20 ${usd(m.ema20)}, EMA 50 ${usd(m.ema50)} y EMA 200 ${usd(m.ema200)}.\n- ${m.precio >= m.ema200 ? 'Por encima de la EMA 200: tendencia de fondo alcista.' : 'Por debajo de la EMA 200: tendencia de fondo bajista.'} ${m.ema20 > m.ema50 ? 'La EMA 20 sobre la 50 confirma impulso de corto plazo.' : 'La EMA 20 bajo la 50 muestra debilidad de corto plazo.'}`;
    case 'volatilidad':
      return `VOLATILIDAD:\n${m.extra ? m.extra.split('\n').find(l => l.includes('Volatilidad'))?.replace('  • ', '') || 'Sin dato de volatilidad.' : 'Sin dato de volatilidad.'}`;
    case 'entrada':
      return `MOMENTO DE ENTRADA:\n${bloqueGuillermo('tendencia', m).split('\n').slice(1).join('\n')}\n- Relación riesgo/beneficio a este precio: ${d1(m.ratioRb)} a 1.`;
    case 'fundamental':
      return `ALCANCE:\nEsa pregunta es de fundamentales: te la responde mejor Jairo. Desde el gráfico, el precio está ${m.precio >= m.ema200 ? 'en tendencia alcista' : 'en tendencia bajista'} y la relación riesgo/beneficio es de ${d1(m.ratioRb)} a 1.`;
    default:
      return '';
  }
}

export function respuestaLocalGuillermo(pregunta: string, m: Tecnico): string {
  const tema = esGeneral(pregunta) ? null : temaDe(pregunta, TEMAS_GUILLERMO);
  if (!tema) {
    return [bloqueGuillermo('tendencia', m), bloqueGuillermo('rsi', m) + '\n' + bloqueGuillermo('macd', m).replace(':\n', ': '), bloqueGuillermo('niveles', m), bloqueGuillermo('rb', m), `VEREDICTO:\n${veredictoGuillermo(m)}`, CIERRE].join('\n\n');
  }
  return [bloqueGuillermo(tema, m), `CONCLUSIÓN:\n${veredictoGuillermo(m)}`, CIERRE].join('\n\n');
}

export function sintesisLocal(f: Fundamental, m: Tecnico): { texto: string; coinciden: boolean } {
  const fundOk = veredictoJairo(f).startsWith('Estudiar');
  const tecOk = veredictoGuillermo(m).startsWith('Operación válida');
  const coinciden = fundOk === tecOk;
  const texto = fundOk && tecOk
    ? 'COINCIDEN. El negocio y el gráfico acompañan: calidad y margen de seguridad por un lado, tendencia y relación riesgo/beneficio por otro. Un inversor disciplinado podría comprar por tramos con la pérdida límite definida.'
    : !fundOk && !tecOk
      ? 'COINCIDEN. Ni el negocio a este precio ni el gráfico dan una entrada clara. Lo prudente es esperar y revisar cuando cambie el precio o los resultados.'
      : fundOk
        ? `DIVERGEN. Jairo ve un negocio atractivo, pero Juan Guillermo no ve el momento: ${veredictoGuillermo(m)} El fundamental decide qué comprar y el técnico cuándo: lista de seguimiento hasta que el gráfico confirme.`
        : `DIVERGEN. El gráfico acompaña, pero Jairo no ve margen suficiente en el negocio: ${veredictoJairo(f)} Sin fundamentos que la respalden, una subida técnica es especulación.`;
  return { texto, coinciden };
}
