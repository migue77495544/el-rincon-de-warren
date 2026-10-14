export interface MoatCase {
  id: number;
  companyName: string;
  ticker: string;
  sector: string;
  roe: number;
  currentRatio: number;
  debtToEquity: number;
  per: number;
  description: string;
  correctAnswer: 'moat' | 'trap' | 'average';
  explanation: string;
  buffettWisdom: string;
}

export const MOAT_GAME_CASES: MoatCase[] = [
  {
    id: 1,
    companyName: 'The Coca-Cola Company',
    ticker: 'KO',
    sector: 'Consumo Masivo',
    roe: 39.5,
    currentRatio: 1.15,
    debtToEquity: 1.45,
    per: 23.2,
    description: 'Marca global centenaria con fidelidad inquebrantable de clientes y poder casi infinito de fijación de precios sin perder cuota.',
    correctAnswer: 'moat',
    explanation: '¡Excelente! Coca-Cola posee uno de los fosos económicos (*Moat*) de marca más amplios del mundo. Su ROE casi del 40% refleja su capacidad de cobrar más por su producto sin que la demanda caiga.',
    buffettWisdom: 'Un foso defensivo es lo que protege a un gran castillo de los competidores.'
  },
  {
    id: 2,
    companyName: 'HypeTech Quantum AI',
    ticker: 'HYPE',
    sector: 'Tecnología Especulativa',
    roe: -52.0,
    currentRatio: 0.72,
    debtToEquity: 3.80,
    per: 0,
    description: 'Compañía de moda en redes sociales. Pérdidas operativas de -$110M al año, emite deuda sin cesar y carece de patentes comerciales reales.',
    correctAnswer: 'trap',
    explanation: '¡Acertaste! Es una Trampa de Valor clásica (*Value Trap*). No tiene foso, quema caja aceleradamente y su ROE negativo destruye el patrimonio de los accionistas.',
    buffettWisdom: 'La regla número 1 es nunca perder dinero. La regla número 2 es nunca olvidar la regla número 1.'
  },
  {
    id: 3,
    companyName: 'Costco Wholesale Corp.',
    ticker: 'COST',
    sector: 'Comercio Minorista',
    roe: 28.4,
    currentRatio: 1.05,
    debtToEquity: 0.85,
    per: 42.0,
    description: 'Modelo de membresía con tasa de renovación del 93%, escala global masiva que traslada cada céntimo de ahorro a sus clientes socios.',
    correctAnswer: 'moat',
    explanation: '¡Correcto! Foso formidable por escala compartida y lealtad incondicional. Charlie Munger lo consideraba uno de los mejores negocios jamás creados.',
    buffettWisdom: 'Es mucho mejor comprar una empresa maravillosa a un precio justo que una empresa justa a un precio maravilloso.'
  },
  {
    id: 4,
    companyName: 'Textiles Genéricos del Norte',
    ticker: 'TEXT',
    sector: 'Manufactura Comoditizada',
    roe: 4.8,
    currentRatio: 1.20,
    debtToEquity: 2.40,
    per: 7.5,
    description: 'Cotiza a un PER muy bajo de 7.5x. Sin embargo, compite puramente por precio contra fábricas asiáticas y sus márgenes caen año tras año.',
    correctAnswer: 'trap',
    explanation: '¡Excelente ojo clínico! Parece barata por su PER bajo, pero es una trampa de valor sin diferenciación. Un negocio comoditizado no puede retener beneficios.',
    buffettWisdom: 'Si estás en un barco con goteras crónicas, la energía invertida en cambiar de barco es más productiva que la invertida en tapar fugas.'
  }
];

export interface BiasDilemma {
  id: number;
  title: string;
  scenario: string;
  options: {
    label: string;
    bias: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  buffettCure: string;
}

export const BIAS_GAME_CASES: BiasDilemma[] = [
  {
    id: 1,
    title: 'Dilema de la Acción en Caída Libre',
    scenario: 'Compraste una acción a $50. Su negocio perdió a su principal cliente y sus beneficios cayeron un 80%. Ahora cotiza a $25. Te niegas a venderla para "no hacer real la pérdida en tu mente", esperando a que regrese a $50 aunque sabes que el negocio está roto.',
    options: [
      { label: 'Aversión a la Pérdida y Coste Hundido', bias: 'Sunk Cost / Loss Aversion', isCorrect: true },
      { label: 'Exceso de Confianza (Dunning-Kruger)', bias: 'Overconfidence', isCorrect: false },
      { label: 'Efecto Manada (FOMO)', bias: 'Herd Behavior', isCorrect: false }
    ],
    explanation: 'La aversión a la pérdida provoca que los inversores retengan empresas moribundas para no aceptar el error emocional. El dinero no sabe a qué precio compraste.',
    buffettCure: 'Cuando te des cuenta de que estás en un hoyo, deja de cavar.'
  },
  {
    id: 2,
    title: 'La Fiebre de la Acción Viral',
    scenario: 'Ves en TikTok y Twitter que todo el mundo está ganando un 300% en una semana con una empresa de coches voladores sin ingresos. Sientes una ansiedad insoportable por comprar acciones inmediatamente antes de quedarte fuera del tren.',
    options: [
      { label: 'Sesgo de Confirmación', bias: 'Confirmation', isCorrect: false },
      { label: 'FOMO y Comportamiento de Rebaño', bias: 'FOMO / Herd', isCorrect: true },
      { label: 'Sesgo de Supervivencia', bias: 'Survivorship', isCorrect: false }
    ],
    explanation: 'El FOMO (miedo a perderse algo) anula el pensamiento crítico y empuja a comprar activos en máximos históricos sin analizar ni un solo número del balance.',
    buffettCure: 'Sé temeroso cuando los demás sean codiciosos, y codicioso cuando los demás sean temerosos.'
  },
  {
    id: 3,
    title: 'El Espejismo de la Buena Suerte',
    scenario: 'Hiciste dos compras al azar basándote en rumores y ambas subieron un 20%. Empiezas a creer que tienes un don natural para el trading y decides triplicar tu capital pidiendo un préstamo personal sin leer las cuentas anuales.',
    options: [
      { label: 'Sesgo de Anclaje', bias: 'Anchoring', isCorrect: false },
      { label: 'Exceso de Confianza (Dunning-Kruger)', bias: 'Overconfidence', isCorrect: true },
      { label: 'Falacia del Jugador', bias: 'Gambler Fallacy', isCorrect: false }
    ],
    explanation: 'Confundir la suerte en un mercado alcista con habilidad analítica es una de las causas principales de ruina financiera entre inversores primerizos.',
    buffettCure: 'Solo cuando baja la marea se sabe quién nadaba desnudo.'
  },
  {
    id: 4,
    title: 'El Ancla del Precio Pasado',
    scenario: 'Una empresa cotizaba a $200 y ha caído a $50. Automáticamente asumes que "está baratísima con un 75% de descuento" únicamente porque antes valía $200, sin investigar si su modelo de negocio quedó obsoleto.',
    options: [
      { label: 'Sesgo de Anclaje', bias: 'Anchoring', isCorrect: true },
      { label: 'Aversión a la Pérdida', bias: 'Loss Aversion', isCorrect: false },
      { label: 'Efecto Halo', bias: 'Halo Effect', isCorrect: false }
    ],
    explanation: 'El sesgo de anclaje ata tu juicio al precio histórico. Una acción que cayó de $200 a $50 aún puede caer otro 100% y valer cero.',
    buffettCure: 'El precio es lo que pagas; el valor es lo que recibes.'
  }
];

export interface VideoLesson {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  instructor: string;
  youtubeId: string;
  concepts: string[];
  summary: string;
  xpReward: number;
}

export const EDUCATIONAL_VIDEOS: VideoLesson[] = [
  {
    id: 'vid-1',
    title: '1. Filosofía del Value Investing: Pensar como un Dueño',
    subtitle: 'Warren Buffett y Charlie Munger explican la actitud mental correcta ante las acciones.',
    duration: '8:45 min',
    instructor: 'Warren Buffett (Omaha, Nebraska)',
    youtubeId: 'W3_XbQk-nO0',
    concepts: ['Mr. Market', 'Círculo de Competencia', 'Comprar Negocios, no Tickers'],
    summary: 'Una acción no es un billete de lotería que sube o baja en una pantalla, sino una porción proporcional de un negocio real con fábricas, empleados y clientes.',
    xpReward: 50
  },
  {
    id: 'vid-2',
    title: '2. Ratios Fundamentales en 5 Minutos: ROE, Deuda y Liquidez',
    subtitle: 'Aprende a interpretar el Balance General y el Estado de Resultados sin tecnicismos.',
    duration: '7:20 min',
    instructor: 'Academia El Rincón de Warren',
    youtubeId: 'b9N40qjYc8w',
    concepts: ['ROE > 15%', 'Current Ratio', 'Debt-to-Equity', 'EBIT'],
    summary: 'Guía práctica para detectar empresas con balances blindados y alta rentabilidad sobre el capital propio, descartando empresas con alto riesgo de quiebra.',
    xpReward: 50
  },
  {
    id: 'vid-3',
    title: '3. Qué es el Margen de Seguridad de Benjamin Graham',
    subtitle: 'El concepto central que separa la inversión inteligente de la ruina especulativa.',
    duration: '9:15 min',
    instructor: 'Benjamin Graham Institute',
    youtubeId: 'dwtV6x139gA',
    concepts: ['Descuento vs Consenso', 'Colchón de Error', 'Tolerancia a Cisnes Negros'],
    summary: 'Si construyes un puente que soporta camiones de 10 toneladas, sólo dejas pasar camiones de 6 toneladas. El colchón de descuento absorbe los errores humanos.',
    xpReward: 50
  },
  {
    id: 'vid-4',
    title: '4. Harry Markowitz y el Almuerzo Gratis de la Diversificación',
    subtitle: 'Cómo combinar activos descorrelacionados para reducir el riesgo a cero coste.',
    duration: '10:10 min',
    instructor: 'Teoría Moderna de Portafolios',
    youtubeId: 'b6vWbSj99k4',
    concepts: ['Frontera Eficiente', 'Matriz de Covarianza', 'Ratio de Sharpe', 'Free Lunch'],
    summary: 'Demostración visual de cómo la combinación de activos descorrelacionados disminuye la volatilidad de la cartera sin sacrificar la rentabilidad esperada.',
    xpReward: 50
  }
];
