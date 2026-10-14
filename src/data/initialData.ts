import { FinancialRawData, TargetConsensus, Badge, LearningStep, InvestmentThesis, LeagueCompetitor, SectorBenchmarks } from '../types';

export interface CompanySeed {
  id: string;
  ticker: string;
  nombre: string;
  sector: string;
  descripcion: string;
  moat: 'Amplio' | 'Medio' | 'Ninguno';
  raw: FinancialRawData;
  targetConsensus?: TargetConsensus;
  sectorBenchmarks?: SectorBenchmarks;
  warrenVerdict: string;
}

export const INITIAL_COMPANIES: CompanySeed[] = [
  {
    id: 'brk-b',
    ticker: 'BRK.B',
    nombre: 'Berkshire Hathaway Inc.',
    sector: 'Conglomerado Financiero / Industrial',
    descripcion: 'El buque insignia de Warren Buffett y Charlie Munger. Enorme tesorería, filiales defensivas y disciplina de asignación de capital.',
    moat: 'Amplio',
    raw: {
      activoCirculante: 245000,
      pasivoCirculante: 89000,
      inventarios: 22000,
      otrosActivosCirculantes: 15000,
      cuentasPorCobrar: 31000,
      efectivo: 167000, // Cerca de $167B en efectivo y T-bills
      totalPasivo: 480000,
      patrimonioNeto: 570000,
      activosTotales: 1050000,
      utilidadNeta: 96000,
      ebit: 118000,
      interesesPorPagar: 4500,
      ingresosTotales: 364000,
      precioCotizacion: 445.0,
      numeroAcciones: 2160,
      capitalizacionBursatil: 961200,
      dividendoPorAccion: 0.0 // Buffett reinvierte el 100%
    },
    targetConsensus: { target_mean: 490.0, target_high: 539.0, target_low: 441.0, recommendation: 'Compra', number_of_analysts: 28, upside_potential: 10.1 },
    warrenVerdict: 'Fortaleza inexpugnable. El margen de seguridad es amplio con tesorería récord en Letras del Tesoro.'
  },
  {
    id: 'ko',
    ticker: 'KO',
    nombre: 'The Coca-Cola Company',
    sector: 'Consumo Básico',
    descripcion: 'Marca global con poder de fijación de precios inigualable (Pricing Power) y distribución capilar en más de 200 países.',
    moat: 'Amplio',
    raw: {
      activoCirculante: 26800,
      pasivoCirculante: 21500,
      inventarios: 4400,
      otrosActivosCirculantes: 2100,
      cuentasPorCobrar: 3500,
      efectivo: 13800,
      totalPasivo: 69000,
      patrimonioNeto: 28500,
      activosTotales: 97500,
      utilidadNeta: 10700,
      ebit: 13200,
      interesesPorPagar: 1600,
      ingresosTotales: 45700,
      precioCotizacion: 62.5,
      numeroAcciones: 4300,
      capitalizacionBursatil: 268750,
      dividendoPorAccion: 1.94 // Yield ~ 3.1%
    },
    targetConsensus: { target_mean: 68.0, target_high: 74.8, target_low: 61.2, recommendation: 'Compra', number_of_analysts: 22, upside_potential: 8.8 },
    warrenVerdict: 'Arquetipo de negocio con foso (Moat). Si tienes una marca imbatible, la inflación es sólo un contratiempo menor.'
  },
  {
    id: 'aapl',
    ticker: 'AAPL',
    nombre: 'Apple Inc.',
    sector: 'Tecnología de Consumo',
    descripcion: 'Ecosistema cerrado con costes de cambio extremos para el usuario y retorno sobre capital colosal.',
    moat: 'Amplio',
    raw: {
      activoCirculante: 143000,
      pasivoCirculante: 145000,
      inventarios: 6300,
      otrosActivosCirculantes: 18000,
      cuentasPorCobrar: 29000,
      efectivo: 65000,
      totalPasivo: 290000,
      patrimonioNeto: 62000,
      activosTotales: 352000,
      utilidadNeta: 100500,
      ebit: 114000,
      interesesPorPagar: 3800,
      ingresosTotales: 383000,
      precioCotizacion: 220.0,
      numeroAcciones: 15300,
      capitalizacionBursatil: 3366000,
      dividendoPorAccion: 1.00
    },
    targetConsensus: { target_mean: 205.0, target_high: 225.5, target_low: 184.5, recommendation: 'Venta', number_of_analysts: 32, upside_potential: -6.8 },
    warrenVerdict: 'Negocio excepcional, pero la valoración actual exige disciplina. Vigilar que el PER no sobrevuele múltiplos históricos.'
  },
  {
    id: 'jnj',
    ticker: 'JNJ',
    nombre: 'Johnson & Johnson',
    sector: 'Salud / Farmacéutica',
    descripcion: 'Calificación crediticia AAA (más alta que el gobierno federal de EE.UU.), diversificación en fármacos y tecnología médica.',
    moat: 'Amplio',
    raw: {
      activoCirculante: 53000,
      pasivoCirculante: 44000,
      inventarios: 9500,
      otrosActivosCirculantes: 4200,
      cuentasPorCobrar: 12000,
      efectivo: 21000,
      totalPasivo: 98000,
      patrimonioNeto: 72000,
      activosTotales: 170000,
      utilidadNeta: 17900,
      ebit: 22500,
      interesesPorPagar: 1800,
      ingresosTotales: 85100,
      precioCotizacion: 160.0,
      numeroAcciones: 2400,
      capitalizacionBursatil: 384000,
      dividendoPorAccion: 4.96
    },
    targetConsensus: { target_mean: 178.0, target_high: 195.8, target_low: 160.2, recommendation: 'Compra', number_of_analysts: 18, upside_potential: 11.3 },
    warrenVerdict: 'Compañía aburrida que hace ricos a los pacientes. Deuda mínima y dividendos crecientes por más de 60 años consecutivos.'
  },
  {
    id: 'wmt',
    ticker: 'WMT',
    nombre: 'Walmart Inc.',
    sector: 'Comercio Minorista Defensivo',
    descripcion: 'Economías de escala inmensas, logística optimizada y liderazgo indiscutible en precios bajos todos los días.',
    moat: 'Medio',
    raw: {
      activoCirculante: 76000,
      pasivoCirculante: 92000,
      inventarios: 56000,
      otrosActivosCirculantes: 4000,
      cuentasPorCobrar: 8000,
      efectivo: 9800,
      totalPasivo: 170000,
      patrimonioNeto: 83000,
      activosTotales: 253000,
      utilidadNeta: 15500,
      ebit: 27000,
      interesesPorPagar: 2400,
      ingresosTotales: 648000,
      precioCotizacion: 75.0,
      numeroAcciones: 8050,
      capitalizacionBursatil: 603750,
      dividendoPorAccion: 0.83
    },
    targetConsensus: { target_mean: 72.0, target_high: 79.2, target_low: 64.8, recommendation: 'Mantener', number_of_analysts: 25, upside_potential: -4.0 },
    warrenVerdict: 'Flujos defensivos en cualquier recesión, aunque los márgenes netos son delgados (~2.5%). Valoración actual ajustada.'
  },
  {
    id: 'spec-hype',
    ticker: 'HYPE',
    nombre: 'HyperQuantum AI Spac Corp',
    sector: 'Especulación Tecnológica / Meme',
    descripcion: 'EMPRESA PEDAGÓGICA DE ALERTA: Compañía sin ingresos consolidados, deuda asfixiante, dilución masiva y pérdidas crónicas.',
    moat: 'Ninguno',
    raw: {
      activoCirculante: 85,
      pasivoCirculante: 220,
      inventarios: 15,
      otrosActivosCirculantes: 10,
      cuentasPorCobrar: 40,
      efectivo: 18,
      totalPasivo: 850,
      patrimonioNeto: 45,
      activosTotales: 895,
      utilidadNeta: -140, // En pérdidas
      ebit: -110,
      interesesPorPagar: 42,
      ingresosTotales: 60,
      precioCotizacion: 34.0,
      numeroAcciones: 120,
      capitalizacionBursatil: 4080,
      dividendoPorAccion: 0.0
    },
    targetConsensus: { target_mean: 4.5, target_high: 4.95, target_low: 4.05, recommendation: 'Venta Fuerte', number_of_analysts: 8, upside_potential: -86.8 },
    warrenVerdict: 'PELIGRO DE QUIEBRA: Trampa de valor y ruleta especulativa. Comprar esto no es invertir, es apostar en el casino de Wall Street.'
  }
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'badge-10k',
    title: 'Lector de 10-K',
    category: 'Análisis',
    description: 'Has analizado a fondo los estados contables y ratios de tu primera empresa cotizada.',
    unlocked: true,
    unlockedAt: '2026-09-10',
    iconName: 'FileSearch',
    points: 150
  },
  {
    id: 'badge-mos',
    title: 'Cazador de Potencial Alcista',
    category: 'Filosofía',
    description: 'Has identificado una acción con más del 15% de upside frente al consenso de analistas de Wall Street.',
    unlocked: true,
    unlockedAt: '2026-09-12',
    iconName: 'ShieldCheck',
    points: 250
  },
  {
    id: 'badge-compounding',
    title: 'Paciencia Compuesta',
    category: 'Disciplina',
    description: 'Mantuviste una posición sin sobreoperar durante más de 30 días simulados.',
    unlocked: false,
    iconName: 'Hourglass',
    points: 300
  },
  {
    id: 'badge-graham',
    title: 'Discípulo de Graham',
    category: 'Filosofía',
    description: 'Completaste el módulo de prueba ácida y solvencia sin caer en trampas de deuda.',
    unlocked: false,
    iconName: 'BookOpen',
    points: 400
  },
  {
    id: 'badge-community',
    title: 'Voz en la Junta',
    category: 'Comunidad',
    description: 'Publicaste una tesis de inversión fundamental en el foro colaborativo.',
    unlocked: false,
    iconName: 'MessageSquareShare',
    points: 200
  },
  {
    id: 'badge-sharpe',
    title: 'Guardián del Sharpe',
    category: 'Disciplina',
    description: 'Alcanzaste un Ratio de Sharpe de cartera superior a 1.2 sin apalancamiento tóxico.',
    unlocked: false,
    iconName: 'TrendingUp',
    points: 500
  }
];

export const INITIAL_LEARNING_STEPS: LearningStep[] = [
  {
    id: 1,
    level: 'Nivel 1',
    title: 'El Arte del Ahorro y el Interés Compuesto',
    subtitle: 'La octava maravilla del mundo financiero',
    xpReward: 100,
    completed: true,
    content: 'El dinero ahorrado no debe quedarse estéril. Cada dólar es un pequeño soldado trabajando 24/7 a través de la capitalización compuesta: VF = VP * (1 + r)^n.',
    keyPrinciple: 'Regla Nº 1: Nunca pierdas dinero. Regla Nº 2: Nunca olvides la regla Nº 1.',
    quote: 'La capitalización compuesta es la octava maravilla del mundo. Quien la entiende, la gana; quien no, la paga.'
  },
  {
    id: 2,
    level: 'Nivel 2',
    title: 'Filosofía Value Investing y Consenso de Analistas',
    subtitle: 'Comprar un billete de 1 dólar por 60 centavos',
    xpReward: 200,
    completed: true,
    content: 'Precio es lo que pagas; valor es lo que recibes. El Consenso de Analistas de Wall Street ayuda a calibrar una valoración de referencia, permitiendo identificar oportunidades con potencial alcista.',
    keyPrinciple: 'No busques agujas en un pajar. Compra todo el pajar cuando esté en liquidación, o la mejor granja del condado con descuento.',
    quote: 'El secreto de invertir radica en evaluar el consenso de analistas y el potencial alcista de un activo antes de invertir.'
  },
  {
    id: 3,
    level: 'Nivel 3',
    title: 'Desmontando Estados Financieros: Liquidez y Solvencia',
    subtitle: 'Aprender a leer el electrocardiograma del negocio',
    xpReward: 350,
    completed: false,
    content: 'Un negocio no quiebra por falta de beneficios en un trimestre, sino por falta de caja para pagar la nómina el viernes. La prueba ácida y la cobertura de intereses salvan carteras.',
    keyPrinciple: 'Si el pasivo corriente dobla al activo corriente y la deuda devora el EBIT, aléjate.',
    quote: 'Solo cuando baja la marea se sabe quién nadaba desnudo.'
  },
  {
    id: 4,
    level: 'Nivel 4',
    title: 'Foso Defensivo (Economic Moat) y Retorno sobre Capital',
    subtitle: 'Castillos medievales con cocodrilos en el foso',
    xpReward: 500,
    completed: false,
    content: 'El ROE y el ROA sostenidos durante décadas demuestran que los competidores no pueden arrebatarte tus márgenes. El foso surge de marcas, costes de cambio, patentes y economías de red.',
    keyPrinciple: 'Prefiero comprar un negocio maravilloso a un precio justo que un negocio mediocre a un precio maravilloso.',
    quote: 'Buscamos empresas con fosos amplios y duraderos protegidos por capitanes honestos y capaces.'
  },
  {
    id: 5,
    level: 'Nivel 5',
    title: 'Construcción de Cartera Resiliente y Ratio de Sharpe',
    subtitle: 'El antídoto contra el trading compulsivo',
    xpReward: 750,
    completed: false,
    content: 'El trading diario enriquece a los brokers y destruye al novato mediante fricciones fiscales y psicológicas. Una cartera Value busca maximizar el retorno por unidad de volatilidad asumida (Sharpe).',
    keyPrinciple: 'La inactividad raya casi en la holgazanería inteligente: nuestra estrategia favorita de tenencia es para siempre.',
    quote: 'El mercado de valores es un dispositivo para transferir dinero de los impacientes a los pacientes.'
  }
];

export const INITIAL_LEAGUE: LeagueCompetitor[] = [
  {
    rank: 1,
    name: 'Omaha_Disciple',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    sharpeRatio: 1.84,
    annualizedReturn: 16.8,
    volatility: 6.9,
    portfolioScore: 92,
    turnoverRatio: 0.12, // Muy baja sobreoperativa
    badgeCount: 8
  },
  {
    rank: 2,
    name: 'Benjamin_Graham_Fan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    sharpeRatio: 1.62,
    annualizedReturn: 14.5,
    volatility: 6.5,
    portfolioScore: 89,
    turnoverRatio: 0.18,
    badgeCount: 7
  },
  {
    rank: 3,
    name: 'Tú (Inversor Prudente)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    sharpeRatio: 1.35,
    annualizedReturn: 13.2,
    volatility: 6.8,
    portfolioScore: 84,
    turnoverRatio: 0.25,
    badgeCount: 2
  },
  {
    rank: 4,
    name: 'Moat_Master_99',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    sharpeRatio: 1.18,
    annualizedReturn: 15.1,
    volatility: 9.4,
    portfolioScore: 78,
    turnoverRatio: 0.45,
    badgeCount: 5
  },
  {
    rank: 5,
    name: 'Crypto_DayTrader_Recovered',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    sharpeRatio: 0.42,
    annualizedReturn: 18.0,
    volatility: 33.3, // Alta volatilidad castiga el Sharpe
    portfolioScore: 48,
    turnoverRatio: 4.80, // Sobreoperativa extrema
    badgeCount: 3
  }
];

export const INITIAL_THESES: InvestmentThesis[] = [
  {
    id: 'thesis-1',
    author: 'Charlie_Munger_Heritage',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
    ticker: 'BRK.B',
    title: 'Por qué Berkshire es el mejor fondo mutuo sin comisiones del mundo',
    content: 'Con más de $160B invertidos en T-Bills al 4.5%, el float asegurador financia la compra de activos de primer nivel. No reparte dividendo porque Warren y Greg Abel generan un ROE superior reinvirtiendo.',
    moatAnalysis: 'Diversificación operativa masiva + float de seguros con coste de fondos negativo.',
    upsideTarget: 18.5,
    recommendedHorizonYears: 10,
    upvotes: 42,
    commentsCount: 9,
    createdAt: 'Hace 2 días',
    badges: ['Discípulo de Graham', 'Cazador de Potencial Alcista']
  },
  {
    id: 'thesis-2',
    author: 'Value_Compounding_Girl',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    ticker: 'KO',
    title: 'Coca-Cola: La mejor cobertura inflacionaria frente a la pérdida de poder adquisitivo',
    content: 'Incluso si el jarabe y las latas suben un 15%, el consumidor no deja de pagar 20 céntimos más por su lata favorita. El ROE supera el 35% y la cobertura de intereses es superior a 8x.',
    moatAnalysis: 'Poder de marca global indiscutible (Pricing Power)',
    upsideTarget: 12.0,
    recommendedHorizonYears: 5,
    upvotes: 28,
    commentsCount: 6,
    createdAt: 'Hace 5 días',
    badges: ['Lector de 10-K']
  }
];
