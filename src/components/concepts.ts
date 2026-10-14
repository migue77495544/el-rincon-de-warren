export interface FinancialConcept {
  id: string;
  term: string;
  simpleAlias: string;
  shortExplanation: string;
  /** Explicación de 1-2 frases para usuarios repetidos */
  shortTip: string;
  /** Explicación completa para usuarios primerizos */
  longExplanation: string;
  /** Analogía con la vida cotidiana */
  analogy: string;
  /** Cita de Warren Buffett o Benjamin Graham */
  buffettQuote: string;
  /** ¿Por qué debería importarme esto? (relleno de jerga) */
  whyItMatters: string;
  /** Categoría para filtrado en modo educativo */
  category: 'rentabilidad' | 'valoracion' | 'solvencia' | 'liquidez' | 'riesgo' | 'filosofia';
}

export const FINANCIAL_CONCEPTS: Record<string, FinancialConcept> = {
  beta: {
    id: 'beta',
    term: 'Beta (β)',
    simpleAlias: 'Volatilidad vs Mercado',
    shortExplanation: 'Mide qué tan sensible es tu acción comparada con el mercado.',
    shortTip: 'β > 1 = volátil. β < 1 = estable. β = 1 = sigue al mercado.',
    longExplanation:
      'El Beta es un número que dice: "si el mercado sube un 10%, ¿esta acción sube un 5%, un 15% o un 20%?" ' +
      'Un Beta de 1.5 significa que la acción se mueve un 50% más que el mercado. Un Beta de 0.6 significa ' +
      'que se mueve un 40% menos (más estable). El Beta NO predice si la acción subirá o bajará, solo la amplitud de sus movimientos.',
    analogy:
      'Imagina que el mercado es un mar. Un Beta alto (1.5+) es como un velero: se eleva y cae con fuerza las olas. ' +
      'Un Beta bajo (0.5) es como un submarino: apenas nota las olas. Un Beta de 1.0 es como un bote normal.',
    buffettQuote:
      '"No considero el volatilidad (Beta) como riesgo real. El riesgo es perder dinero, no perderlo rápido." — Warren Buffett',
    whyItMatters:
      'Una acción con Beta alto puede hacerte ganar más... pero también perder más. Si no puedes dormir cuando tu inversión baja ' +
      'un 30% en una semana, el Beta alto no es para ti.',
    category: 'riesgo',
  },

  costoCapital: {
    id: 'costoCapital',
    term: 'Costo de Capital Propio',
    simpleAlias: 'Tasa mínima que debe ganar la empresa',
    shortExplanation: 'El porcentaje que los accionistas exigen como mínimo por invertir en la empresa.',
    shortTip: 'Si el ROE es menor al Costo de Capital, la empresa está destruyendo valor.',
    longExplanation:
      'Es la rentabilidad mínima que una empresa necesita generar para compensar el riesgo de sus inversores. ' +
      'Se calcula con CAPM (Capital Asset Pricing Model): Costo = Tasa Libre de Riesgo + Beta × Prima de Riesgo del Mercado. ' +
      'Si la empresa gana menos que este porcentaje, en realidad está perdiendo dinero para sus dueños.',
    analogy:
      'Es como la tasa de interés de un préstamo. Si te piden 10% de interés y ganas 7%, estás perdiendo 3%. ' +
      'El Costo de Capital es el "interés" que exige el mercado por prestarte su dinero.',
    buffettQuote:
      '"El ROI de un negocio es sagrado. Si no puedes ganar más que el costo de oportunidad, no deberías invertir." — Warren Buffett',
    whyItMatters:
      'Muchas empresas "lucen" rentables pero generan menos que su costo de capital. Ese es un Value Trap: ' +
      'un negocio que parece barato pero en realidad destruye valor.',
    category: 'rentabilidad',
  },

  consensoWallStreet: {
    id: 'consensoWallStreet',
    term: 'Consenso de Analistas y Potencial Alcista',
    simpleAlias: 'Precio objetivo promedio de analistas',
    shortExplanation: 'La diferencia entre el precio objetivo promedio de analistas y la cotización actual, según Wall Street.',
    shortTip: 'Consenso a $115 vs cotización a $100 → Potencial alcista = 15%.',
    longExplanation:
      'El consenso de analistas agrega las proyecciones de precios objetivo de todas las firmas de bolsa. ' +
      'Si el precio objetivo promedio es $115 y la cotización actual es $100, el potencial alcista es del 15%. ' +
      'Este enfoque reemplaza el cálculo de valor intrínseco contable con la sabiduría colectiva de los analistas.',
    analogy:
      'Imagina que 30 expertos en inmobiliaria te dicen cuánto vale una casa, y tú cotizas según la media de sus opiniones. ' +
      'El "potencial alcista" es tu colchón de descuento versus esa valoración colectiva.',
    buffettQuote:
      '"El mejor inversionista usa el juicio de mercado y el de profesionales que lo rodean." — Warren Buffett',
    whyItMatters:
      'El consenso de analistas te da una referencia objetiva de valoración para comparar PER, PB y ROE frente a proyecciones profesionales.',
    category: 'valoracion',
  },

  roe: {
    id: 'roe',
    term: 'Rentabilidad sobre Recursos Propios (ROE)',
    simpleAlias: 'Cuánto gana por cada $1 invertido en la empresa',
    shortExplanation: 'Mide cuánta ganancia genera la empresa por cada dólar de capital de sus dueños.',
    shortTip: 'ROE > 15% = excelente. ROE < 8% = preocupante. Buffett busca empresas con altísimo ROE.',
    longExplanation:
      'El ROE se calcula: Utilidad Neta / Patrimonio Neto. Si una empresa genera $15 de beneficio por cada $100 de capital, su ROE es 15%. ' +
      'Buffett lo considera el "test de fuego" para detectar empresas con un Foso Económico (ventaja competitiva).',
    analogy:
      'Es como la rentabilidad de una caja fuerte. Si depositas $100 y al año recibes $15 de interes, tu "ROE" es 15%. ' +
      'Si depositas $100 y recibes $5, es una caja mala.',
    buffettQuote:
      '"El mejor negocio para poseer es uno que pueda emplear grandes cantidades de capital incremental ' +
      'a tasas de retorno muy altas." — Warren Buffett',
    whyItMatters:
      'Un ROE sostenido en el tiempo (>15% anual) es la firma de un negocio con ventaja competitiva duradera. ' +
      'Sin ROE, no hay prueba de que el negocio genere valor real.',
    category: 'rentabilidad',
  },

  foso: {
    id: 'foso',
    term: 'Ventaja Competitiva (Foso Económico)',
    simpleAlias: 'Superpoder del negocio',
    shortExplanation:
      'La ventaja única que protege a una empresa de la competencia y le permite ganar sin pelear por precio.',
    shortTip:
      'Sin Foso, el negocio es como una canoa: cualquiera puede copiarlo. Con Foso, es como un castillo: difícil de atacar.',
    longExplanation:
      'El Foso Económico es el "escudo" que mantiene a la competencia a raya. Tipos: ' +
      'Cinta de poder (marca fuerte como Coca-Cola), Bajo costo (Walmart), Alta escala, Barreras regulatorias. ' +
      'Warren Buffett considera los fosos como el factor #1 en inversión.',
    analogy:
      'Imagina un restaurante con una receta secreta (Foso de Marca) vs. uno con comida normal. ' +
      'El primero puede subir precios y retener clientes. El segundo pierde si un competidor abre al lado.',
    buffettQuote:
      '"Una empresa con un foso defensivo es el mejor negocio para poseer. En un castillo, ' +
      'el foso es lo que protege de los enemigos." — Warren Buffett',
    whyItMatters:
      'Sin Foso, una empresa puede tener ROE alto hoy pero desaparece mañana cuando la competencia copia su fórmula. ' +
      'El Foso garantiza que las ganancias sean sostenidas.',
    category: 'filosofia',
  },

  per: {
    id: 'per',
    term: 'Precio/Beneficio (PER)',
    simpleAlias: 'Veces de beneficios que pagas',
    shortExplanation: 'Número de años que tardarías en pagar tu inversión solo con los beneficios actuales.',
    shortTip:
      'PER 15x = pagas 15 años de beneficios. PER 5x = ganga potencial. PER 50x = muy caro, apuesta futura.',
    longExplanation:
      'PER = Precio de la acción / Beneficio por Acción. Un PER de 15 significa que, si el beneficio se mantiene, ' +
      'te recuperas la inversión en 15 años. Es inverso del "Earnings Yield" (rendimiento de beneficios).',
    analogy:
      'Es como calcular cuántos meses de alquiler pagarías por una casa antes de que te pague por sí sola. ' +
      'Un PER bajo = la casa te paga rápido. Un PER alto = tardas mucho en recuperar.',
    buffettQuote:
      '"En una escalera de inflación, el PER es tu mejor amigo... o tu peor enemigo." — Warren Buffett',
    whyItMatters:
      'El PER pone en perspectiva: estás pagando por beneficios futuros, no por inventario. ' +
      'Un PER muy alto sin crecimiento futuro es una receta para pérdidas.',
    category: 'valoracion',
  },

  deudaPatrimonio: {
    id: 'deudaPatrimonio',
    term: 'Deuda/Patrimonio (D/E)',
    simpleAlias: 'Cuánta deuda tiene vs. su propio dinero',
    shortExplanation:
      'Mide qué tanto se debe (deuda) comparado con lo que posee los dueños (patrimonio).',
    shortTip:
      'D/E < 0.5 = conservador. D/E > 2 = agresivo. Empresas sin deuda son más seguras en crisis.',
    longExplanation:
      'D/E = Deuda Total / Patrimonio Neto. Un D/E de 2.0 significa que la empresa debe el doble de lo que sus dueños tienen. ' +
      'No toda deuda es mala: si se usa para crecer a altas tasas de retorno, puede generar valor.',
    analogy:
      'Es como tu ratio deuda/ingreso personal. Si debes $50.000 y ganas $100.000, tu D/E es 0.5. ' +
      'Si debes $200.000 y ganas $80.000, tu D/E es 2.5 — muy riesgoso.',
    buffettQuote:
      '"La deuda es como una daga atada al volante. En una carretera con baches, te clavará al primer choque." — Warren Buffett',
    whyItMatters:
      'En tiempos de crisis, las empresas con alto apalancamiento son las primeras en caer. ' +
      'Warren Buffett prefiere empresas con bajo o ningún apalancamiento.',
    category: 'solvencia',
  },

  liquidezCorriente: {
    id: 'liquidezCorriente',
    term: 'Liquidez Corriente',
    simpleAlias: '¿Puede pagar deudas a corto plazo?',
    shortExplanation:
      'Mide si la empresa tiene suficientes activos líquidos para pagar lo que debe en menos de 1 año.',
    shortTip:
      'Liquidez ≥ 1.5 = saludable. < 1.1 = riesgo inminente de impago.',
    longExplanation:
      'Liquidez Corriente = Activo Circulante / Pasivo Circulante. ' +
      'Un ratio de 2.0 significa que por cada $1 de deuda a corto plazo, la empresa tiene $2 en activos que puede convertir en efectivo.',
    analogy:
      'Como tu bolsillo: si debes $100 a corto plazo pero tienes $150 en efectivo y cuentas por cobrar, ' +
      'tu liquidez es 1.5 — estás cubierto.',
    buffettQuote:
      '"Ninguna empresa quiebra por falta de beneficios futuros; quiebra hoy porque no puede pagar sus facturas presentes." — Warren Buffett',
    whyItMatters:
      'Sin liquidez, una empresa puede caer a la quiebra incluso si es rentable. ' +
      'Es el oxígeno: no lo echas de menos hasta que no tienes.',
    category: 'liquidez',
  },

  sharpe: {
    id: 'sharpe',
    term: 'Ratio de Sharpe',
    simpleAlias: 'Rentabilidad ajustada al riesgo',
    shortExplanation:
      'Mide cuánta ganancia extra ganaste por cada nivel de volatilidad que asumiste.',
    shortTip:
      'Sharpe > 1.0 = buen riesgo-ajustado. Sharpe > 2.0 = excelente. Sharpe < 0.5 = mala relación.',
    longExplanation:
      'Sharpe = (Retorno de tu inversión - Tasa Libre de Riesgo) / Volatilidad. ' +
      'Un Sharpe de 1.0 significa que ganaste "1 punto de riesgo" por encima de la tasa segura. ' +
      'Es el estándar universal para juzgar si una cartera compite bien contra riesgo sin compensar.',
    analogy:
      'Imagina dos corredores. Uno llega más rápido pero se cae 5 veces. El otro es más lento pero constante. ' +
      'El Sharpe pregunta: ¿quién ganó más por unidad de "riesgo de caída"?',
    buffettQuote:
      '"No busques riesgo; busca oportunidades con margen de seguridad." — Warren Buffett',
    whyItMatters:
      'Tener una cartera con alto retorno significa poco si la volatilidad te dejó agotado emocionalmente. ' +
      'El Sharpe te dice si estás siendo premiado por asumir riesgo, o castigado.',
    category: 'riesgo',
  },

  trackingError: {
    id: 'trackingError',
    term: 'Risk Tracking (Tracking Error)',
    simpleAlias: 'Desviación respecto al benchmark',
    shortExplanation:
      'Mide qué tan volátil es el exceso de retorno de tu inversión comparado con el índice de referencia.',
    shortTip:
      'TE < 2% = cercanía al índice. TE 2-6% = gestión activa moderada. TE > 6% = alta convicción activa.',
    longExplanation:
      'El Tracking Error (TE) se calcula como: TE = σ(R_p − R_b) × √252, donde R_p es el retorno de tu ' +
      'inversión y R_b es el retorno del benchmark. Mide la volatilidad del exceso de retorno. ' +
      'Un TE bajo indica que tu inversión sigue casi idénticamente al índice. Un TE alto indica ' +
      'una gestión activa agresiva que busca generar alpha (retorno excesivo).',
    analogy:
      'Imagina que corres una carrera siguiendo a un líder (el benchmark). Si corres pegado a sus pasos, ' +
      'tu "tracking error" es casi cero: sigues idéntico a él. Si corres tu propio ritmo, saltando ' +
      'puntos y tomando atajos, tu desviación será alta. Un TE bajo = seguimiento fiel. Un TE alto = ' +
      'estrategia de convicción propia.',
    buffettQuote:
      '"Sea activo o paseivo, pero nunca te quedes en el medio. Si no puedes batir al índice con margen de seguridad, ' +
      'compra un ETF que lo replique." — Warren Buffett',
    whyItMatters:
      'El TE te dice si realmente estás agregando valor como inversor activo, o si estás pagando ' +
      'comisiones altas por desviarte sin beneficio. Un TE alto con un IR negativo significa que ' +
      'asumes riesgo activo sin ser compensado. Buffett prefiere un TE cercano a 0 (Closet Indexing) ' +
      'si no puede asegurar alpha sostenible.',
    category: 'riesgo',
  },

  liquidezVsSector: {
    id: 'liquidezVsSector',
    term: 'Liquidez vs Sector',
    simpleAlias: 'Capacidad de pago frente a la industria',
    shortExplanation: 'Compara la liquidez de la empresa con el promedio de su sector industrial.',
    shortTip: 'Liquidez > Sector = colchón financiero. Liquidez < Sector = posible fricción de caja.',
    longExplanation:
      'La liquidez corriente (Activo Circulante / Pasivo Circulante) mide la capacidad de pago a corto plazo. ' +
      'Cuando supera el promedio del sector, la empresa tiene una ventaja competitiva en gestión de tesorería. ' +
      'Si está por debajo, puede enfrentar tensiones que sus pares no tienen, especialmente en ciclos económicos duros.',
    analogy:
      'Imagina que el sector es una carrera de relevos. Si tu equipo cambia de running más rápido que los demás, ' +
      'tienes ventaja. Si es más lento, corres el riesgo de que te alcance la contracorriente del mercado.',
    buffettQuote:
      '"Ninguna empresa quiebra por falta de beneficios futuros; quiebra hoy porque no puede pagar sus facturas presentes." — Warren Buffett',
    whyItMatters:
      'La liquidez relativa al sector es un indicador temprano de salud operativa. Empresas con liquidez superior ' +
      'al sector sobreviven mejor a crisis, adquiriendo competidores en situación de bancarrota a precios de descuento.',
    category: 'liquidez',
  },

  deudaVsSector: {
    id: 'deudaVsSector',
    term: 'Apalancamiento vs Sector',
    simpleAlias: 'Nivel de deuda respecto a la industria',
    shortExplanation: 'Compara el ratio de apalancamiento D/E de la empresa con el promedio de su sector.',
    shortTip: 'D/E < Sector = conservador. D/E > Sector = mayor riesgo financiero.',
    longExplanation:
      'El ratio Deuda/Patrimonio (D/E) mide cuánto debe la empresa respecto a lo que poseen sus accionistas. ' +
      'Un D/E por debajo del sector indica estructura financiera conservadora y menor exposición a tipos de interés. ' +
      'Un D/E por encima del sector sugiere mayor apalancamiento, lo cual puede ser sostenible si se usa para ' +
      'generar retornos superiores al costo de la deuda, pero incrementa el riesgo en entornos de alza de tasas.',
    analogy:
      'Como tu ratio deuda/ingreso personal: si todos tus pares deben el 50% de su ingreso y tú debes el 120%, ' +
      'eres más vulnerable a cualquier imprevisto financiero.',
    buffettQuote:
      '"La deuda es como una daga atada al volante. En una carretera con baches, te clavará al primer choque." — Warren Buffett',
    whyItMatters:
      'El apalancamiento relativo al sector define el perfil de riesgo. Empresas con bajo apalancamiento ' +
      'aprovechan mejor las oportunidades de adquisición y resisten crisis mejor que sus pares.',
    category: 'solvencia',
  },

  roeVsSector: {
    id: 'roeVsSector',
    term: 'ROE vs Sector',
    simpleAlias: 'Rentabilidad relativa al sector',
    shortExplanation: 'Compara el ROE de la empresa con el promedio de su industria.',
    shortTip: 'ROE > Sector = ventaja competitiva. ROE < Sector = foso potencialmente debilitado.',
    longExplanation:
      'Un ROE superior al promedio del sector indica una ventaja competitiva o mayor eficiencia en la generación ' +
      'de utilidades sobre el capital propio. Esta diferencia relativa es más significativa que el ROE absoluto, ' +
      'ya que una empresa puede tener un ROE alto en una industria sin foso, pero bajo el promedio de su sector, ' +
      'lo que sugiere que sus pares generan mayores retornos con negocios similares.',
    analogy:
      'En una pista de atletismo, tu tiempo de 100m es bueno, pero si todos tus competidores del mismo sector ' +
      'corren 2 segundos más rápido, necesitas revisar tu técnica.',
    buffettQuote:
      '"El ROE es el test de fuego para detectar empresas con un Foso Económico. Sin embargo, el ROE relativo ' +
      'al sector es el comparador verdadero de excelencia." — Warren Buffett',
    whyItMatters:
      'El ROE relativo al sector identifica verdaderas ventajas competitivas. Un ROE del 20% suena bien, ' +
      'pero si el sector promedian 25%, la empresa está perdiendo cuota de Valor Respecto a sus competidores.',
    category: 'rentabilidad',
  },

  perVsSector: {
    id: 'perVsSector',
    term: 'PER vs Sector',
    simpleAlias: 'Valoración relativa al sector',
    shortExplanation: 'Compara el múltiplo PER de la empresa con el promedio de su industria.',
    shortTip: 'PER < Sector = potencialmente subvalorada. PER > Sector = posible sobrevaloración.',
    longExplanation:
      'El PER (Precio/Beneficio) muestra cuántos años de beneficios estás pagando. Un PER por debajo del sector ' +
      'puede indicar una ganga relativa, pero también podría reflejar problemas de crecimiento o riesgos únicos. ' +
      'Un PER por encima del sector sugiere que los inversores esperan mayor crecimiento futuro que los pares.',
    analogy:
      'Es como comparar casas en un barrio: si todas cuestan $300K y una está en $200K, olla atención; ' +
      'tal vez es una ganga o tal vez hay algo que los demás saben y tú no.',
    buffettQuote:
      '"El PER es una herramienta útil, pero nunca compres una acción por su PER bajo sin entender por qué es bajo." — Warren Buffett',
    whyItMatters:
      'El PER relativo al sector filtra el ruido del mercado. Una empresa con PER bajo pero crecimiento ' +
      'superior al sector puede ser una oportunidad de Value más que un value trap.',
    category: 'valoracion',
  },

  pbVsSector: {
    id: 'pbVsSector',
    term: 'P/B vs Sector',
    simpleAlias: 'Valor contable relativo al sector',
    shortExplanation: 'Compara el múltiplo Precio/Valor Contable de la empresa con su promedio sectorial.',
    shortTip: 'P/B < Sector = potencial subvaluación. P/B > Sector = intangibles valorados por mercado.',
    longExplanation:
      'El P/B (Precio/Valor Contable) revela el descuento o prima de la bolsa sobre el valor neto contable. ' +
      'Un P/B bajo frente al sector puede señalar que el mercado valora poco al negocio o sus activos. ' +
      'Un P/B alto frente al sector sugiere valoración de intangibles, marca o flujos futuros no reflejados en libros.',
    analogy:
      'Es como comparar el precio de casas versus su costo de construcción. Una casa de $500K con costo de $200K ' +
      'tiene un P/B de 2.5x. Si todas las casas del vecindario cuestan 1.8x su costo, esta tiene prima.',
    buffettQuote:
      '"El valor contable es una realidad, pero el valor de mercado puede desviarse significativamente." — Warren Buffett',
    whyItMatters:
      'El P/B relativo al sector ayuda a identificar si la empresa está sobrevalorada o subvalorada ' +
      'respeto a sus pares, especialmente útil para empresas con activos significativos como bancos o aseguradoras.',
    category: 'valoracion',
  },

  keVsSector: {
    id: 'keVsSector',
    term: 'Costo de Capital Propio vs Sector',
    simpleAlias: 'K_e relativo al sector',
    shortExplanation: 'Compara el costo de capital propio (K_e) de la empresa con el promedio de su industria.',
    shortTip: 'K_e < Sector = ventaja competitiva en costos. K_e > Sector = mayor costo de financiamiento.',
    longExplanation:
      'El Costo de Capital Propio (K_e) se calcula con CAPM: K_e = Rf + β × ERP. Un K_e bajo frente al sector ' +
      'indica que la empresa puede financiar su crecimiento a menor costo, una ventaja competitiva clave. ' +
      'Un K_e alto sugiere mayor riesgo percibido por el mercado, aumentando la presión sobre los retornos requeridos.',
    analogy:
      'Tu K_e es como la tasa de interés que te cobra el banco. Si todos tus competidores pagan 5% y tú pagas 10%, ' +
      'ella está en peor posición para crecer rentablemente.',
    buffettQuote:
      '"El ROE es el test de fuego, pero K_e es la barra que debes superar." — Warren Buffett',
    whyItMatters:
      'El K_e relativo al sector determina la dificultad de crear valor. Si tu K_e es 12% pero el sector ' +
      'promedia 8%, necesitas generar retornos más altos solo para compensar el costo de oportunidad.',
    category: 'rentabilidad',
  },
};
