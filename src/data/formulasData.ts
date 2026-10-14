export interface FinancialFormulaItem {
  id: string;
  name: string;
  acronym: string;
  category: 'valoracion' | 'rentabilidad' | 'solvencia' | 'liquidez';
  formulaLaTeX: string;
  formulaSimple: string;
  numeratorLabel: string;
  denominatorLabel: string;
  purpose: string;
  whyBuffettCares: string;
  quote: string;
  quoteAuthor: string;
  thresholds: {
    green: { range: string; label: string; explanation: string };
    yellow: { range: string; label: string; explanation: string };
    red: { range: string; label: string; explanation: string };
  };
  sampleInputs: {
    numLabel: string;
    denLabel: string;
    defaultNum: number;
    defaultDen: number;
    numStep?: number;
    denStep?: number;
    isPercentage?: boolean;
    unit?: string;
    customCalc?: (num: number, den: number) => number;
    evaluator: (val: number) => 'green' | 'yellow' | 'red';
  };
}

export const FORMULAS_DATA: FinancialFormulaItem[] = [
  // 1. P/E (Price-to-Earnings / PER)
  {
    id: 'per',
    name: 'Ratio Precio-Beneficio (P/E o PER)',
    acronym: 'P/E Ratio',
    category: 'valoracion',
    formulaLaTeX: 'PER = \\frac{\\text{Precio por Acción}}{\\text{Beneficio por Acción (BPA / EPS)}}',
    formulaSimple: 'Precio de Cotización / BPA (Beneficio Neto por Acción)',
    numeratorLabel: 'Precio de Cotización de Mercado ($)',
    denominatorLabel: 'Beneficio por Acción anual (EPS / BPA) ($)',
    purpose: 'Indica cuántos años de beneficios actuales estás pagando al comprar la acción, o cuántos dólares pagan los inversores por cada dólar de beneficio.',
    whyBuffettCares: 'Un P/E bajo no garantiza una ganga si el negocio es malo, pero pagar un P/E desorbitado (>30x) exige un crecimiento futuro casi milagroso que rara vez se cumple.',
    quote: 'El precio es lo que pagas, el valor es lo que recibes.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≤ 15x - 18x',
        label: 'Zona de Valor / Descuento',
        explanation: 'Múltiplo conservador según Benjamin Graham. Ofrece un colchón razonable si la empresa mantiene beneficios estables.'
      },
      yellow: {
        range: '18x - 26x',
        label: 'Precio Justo / Sin Ganga',
        explanation: 'Valoración acorde para empresas de calidad premium con ventajas competitivas sostenibles, pero sin margen de seguridad amplio.'
      },
      red: {
        range: '> 26x o Negativo',
        label: 'Exigente / Especulativo',
        explanation: 'Cualquier tropiezo en ingresos provocará fuertes caídas. Si es negativo, la compañía está quemando dinero en pérdidas.'
      }
    },
    sampleInputs: {
      numLabel: 'Precio de la Acción ($)',
      denLabel: 'BPA (EPS en $)',
      defaultNum: 60,
      defaultDen: 4.2,
      unit: 'x',
      evaluator: (val: number) => (val > 0 && val <= 18 ? 'green' : val <= 26 ? 'yellow' : 'red')
    }
  },

  // 2. ROE (Return on Equity)
  {
    id: 'roe',
    name: 'Rentabilidad sobre Recursos Propios (ROE)',
    acronym: 'ROE',
    category: 'rentabilidad',
    formulaLaTeX: 'ROE = \\frac{\\text{Utilidad Neta}}{\\text{Patrimonio Neto Contable}} \\times 100',
    formulaSimple: '(Utilidad Neta / Patrimonio Neto) × 100',
    numeratorLabel: 'Utilidad Neta Anual ($M)',
    denominatorLabel: 'Patrimonio Neto / Fondos Propios ($M)',
    purpose: 'Mide la rentabilidad generada por cada euro o dólar retenido y reinvertido que pertenece a los accionistas.',
    whyBuffettCares: 'Es el test definitivo de un Foso Defensivo (Economic Moat). Un negocio capaz de generar un ROE > 15% año tras año sin endeudarse es una máquina de interés compuesto.',
    quote: 'El mejor negocio para poseer es uno que puede emplear grandes cantidades de capital incremental a tasas de retorno muy altas.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 15.0%',
        label: 'Excelente (Criterio Buffett)',
        explanation: 'Fuerte ventaja competitiva. El equipo gestor asigna capital con enorme eficiencia.'
      },
      yellow: {
        range: '8.0% - 14.9%',
        label: 'Aceptable / Promedio',
        explanation: 'Rendimiento modesto en línea con el coste de capital general de la economía.'
      },
      red: {
        range: '< 8.0%',
        label: 'Destrucción de Valor',
        explanation: 'Rinde menos que la inflación o la renta fija sin riesgo; síntoma de comoditización y guerra de precios.'
      }
    },
    sampleInputs: {
      numLabel: 'Beneficio Neto ($M)',
      denLabel: 'Patrimonio Neto ($M)',
      defaultNum: 1200,
      defaultDen: 6000,
      isPercentage: true,
      customCalc: (num, den) => (den > 0 ? (num / den) * 100 : 0),
      evaluator: (val: number) => (val >= 15 ? 'green' : val >= 8 ? 'yellow' : 'red')
    }
  },

  // 3. Deuda / EBITDA (Apalancamiento Operativo)
  {
    id: 'deuda-ebitda',
    name: 'Ratio Deuda Neta / EBITDA',
    acronym: 'Deuda / EBITDA',
    category: 'solvencia',
    formulaLaTeX: '\\text{Apalancamiento} = \\frac{\\text{Total Pasivo Financiero} - \\text{Efectivo}}{\\text{EBITDA (Beneficio Bruto Operativo)}}',
    formulaSimple: '(Deuda Total - Efectivo) / EBITDA',
    numeratorLabel: 'Deuda Neta ($M)',
    denominatorLabel: 'EBITDA Operativo ($M)',
    purpose: 'Mide cuántos años tardaría la empresa en repagar toda su deuda bancaria si destinara el 100% de su EBITDA a amortizarla.',
    whyBuffettCares: 'La deuda es como una daga atada al volante: en una carretera con baches (crisis económica o subida de tipos), te clavará al primer choque.',
    quote: 'Cuando una gestión brillante se enfrenta a una empresa con mala reputación económica, es la reputación de la empresa la que se mantiene intacta.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '< 2.0x (o Deuda Neta Negativa)',
        label: 'Balance Blindado',
        explanation: 'La empresa puede cancelar todas sus obligaciones financieras en menos de 24 meses de flujo operativo.'
      },
      yellow: {
        range: '2.0x - 3.5x',
        label: 'Apalancamiento Moderado',
        explanation: 'Aceptable solo en negocios con ingresos hiper-recurrentes y regulados (como utilities o infraestructuras).'
      },
      red: {
        range: '> 3.5x',
        label: 'Peligro de Asfixia',
        explanation: 'Vulnerabilidad crítica si el crédito se encarece o las ventas bajan. Riesgo de default o ampliación dilutiva.'
      }
    },
    sampleInputs: {
      numLabel: 'Deuda Neta ($M)',
      denLabel: 'EBITDA ($M)',
      defaultNum: 350,
      defaultDen: 250,
      unit: 'x',
      evaluator: (val: number) => (val <= 2.0 ? 'green' : val <= 3.5 ? 'yellow' : 'red')
    }
  },

  // 4. Cobertura de Intereses (Interest Coverage)
  {
    id: 'cobertura-intereses',
    name: 'Cobertura de Intereses de la Deuda',
    acronym: 'EBIT / Intereses',
    category: 'solvencia',
    formulaLaTeX: '\\text{Cobertura} = \\frac{\\text{EBIT (Beneficio Operativo)}}{\\text{Gastos Financieros por Intereses}}',
    formulaSimple: 'EBIT / Intereses por Pagar',
    numeratorLabel: 'EBIT Operativo ($M)',
    denominatorLabel: 'Gastos por Intereses de Deuda ($M)',
    purpose: 'Comprueba el número de veces que el beneficio generado por las operaciones comerciales cubre el recibo de intereses a pagar al banco.',
    whyBuffettCares: 'Si una compañía apenas cubre intereses en tiempos de bonanza, una pequeña recesión la enviará a suspensión de pagos.',
    quote: 'Solo cuando baja la marea se sabe quién nadaba desnudo.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 5.0x',
        label: 'Holgura Cómoda',
        explanation: 'Los intereses representan una fracción menor del beneficio. El balance soporta subidas agresivas del banco central.'
      },
      yellow: {
        range: '2.5x - 4.9x',
        label: 'Zona de Precaución',
        explanation: 'Margen ajustado. La empresa requiere que el entorno económico permanezca estable.'
      },
      red: {
        range: '< 2.5x',
        label: 'Riesgo de Insolvencia',
        explanation: 'El pago de intereses devora la mayor parte de las ganancias. Alarma roja de quiebra si bajan márgenes.'
      }
    },
    sampleInputs: {
      numLabel: 'EBIT ($M)',
      denLabel: 'Intereses Anuales ($M)',
      defaultNum: 850,
      defaultDen: 110,
      unit: 'x',
      evaluator: (val: number) => (val >= 5.0 ? 'green' : val >= 2.5 ? 'yellow' : 'red')
    }
  },

  // 5. Ratio de Liquidez Corriente (Current Ratio)
  {
    id: 'liquidez-corriente',
    name: 'Liquidez Corriente (Current Ratio)',
    acronym: 'Current Ratio',
    category: 'liquidez',
    formulaLaTeX: '\\text{Liquidez Corriente} = \\frac{\\text{Activo Circulante}}{\\text{Pasivo Circulante}}',
    formulaSimple: 'Activo Circulante / Pasivo Circulante',
    numeratorLabel: 'Activo Circulante (< 12 meses) ($M)',
    denominatorLabel: 'Pasivo Circulante (Vence < 12 meses) ($M)',
    purpose: 'Determina si la empresa posee suficientes bienes y derechos liquidables a corto plazo para saldar sus deudas que vencen en menos de un año.',
    whyBuffettCares: 'Ninguna empresa quiebra por falta de beneficios futuros; quiebra hoy porque no puede pagar sus facturas presentes.',
    quote: 'La liquidez es como el oxígeno: no piensas en ella cuando está presente, pero es lo único en lo que piensas cuando falta.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 1.5x',
        label: 'Solvencia Óptima (Graham)',
        explanation: 'Benjamin Graham exigía al menos 1.5x a 2.0x para garantizar que la empresa no sufra tensiones de caja.'
      },
      yellow: {
        range: '1.1x - 1.49x',
        label: 'Aceptable pero Justa',
        explanation: 'Depende de que los clientes paguen a tiempo y las existencias se vendan sin rebajas imprevistas.'
      },
      red: {
        range: '< 1.1x',
        label: 'Tensión de Tesorería',
        explanation: 'Peligro inminente de impago si los acreedores o proveedores reclaman anticipos.'
      }
    },
    sampleInputs: {
      numLabel: 'Activo Circulante ($M)',
      denLabel: 'Pasivo Circulante ($M)',
      defaultNum: 3200,
      defaultDen: 1800,
      unit: 'x',
      evaluator: (val: number) => (val >= 1.5 ? 'green' : val >= 1.1 ? 'yellow' : 'red')
    }
  },

  // 6. Prueba Ácida / Ratio de Tesorería (Acid Test)
  {
    id: 'prueba-acida',
    name: 'Ratio de Tesorería o Prueba Ácida (Acid-Test)',
    acronym: 'Quick Ratio',
    category: 'liquidez',
    formulaLaTeX: '\\text{Prueba Ácida} = \\frac{\\text{Activo Circulante} - \\text{Inventarios} - \\text{CxC no líquidas}}{\\text{Pasivo Circulante}}',
    formulaSimple: '(Activo Circulante - Inventarios) / Pasivo Circulante',
    numeratorLabel: 'Activo Rápido (Sin Inventario) ($M)',
    denominatorLabel: 'Pasivo Circulante ($M)',
    purpose: 'Excluye el stock de almacén, evaluando solo el dinero contante y sonante más cobros seguros.',
    whyBuffettCares: 'Los inventarios pueden volverse obsoletos de la noche a la mañana. La caja en el banco no miente.',
    quote: 'El efectivo es para un negocio lo que el oxígeno para un individuo.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 0.8x - 1.0x',
        label: 'Liquidez Blindada',
        explanation: 'Cubre los compromisos inmediatos sin necesidad de vender una sola unidad de producto almacenado.'
      },
      yellow: {
        range: '0.4x - 0.79x',
        label: 'Moderada Dependencia',
        explanation: 'Requiere vender stock con ritmo regular para no sufrir estrangulamiento de pagos.'
      },
      red: {
        range: '< 0.4x',
        label: 'Riesgo Severo',
        explanation: 'Falta de activos líquidos directos frente a pagos inmediatos.'
      }
    },
    sampleInputs: {
      numLabel: 'Activos Líquidos ($M)',
      denLabel: 'Pasivo Circulante ($M)',
      defaultNum: 1400,
      defaultDen: 1600,
      unit: 'x',
      evaluator: (val: number) => (val >= 0.8 ? 'green' : val >= 0.4 ? 'yellow' : 'red')
    }
  },

  // 7. P/B (Price-to-Book)
  {
    id: 'pb',
    name: 'Precio sobre Valor en Libros (P/B)',
    acronym: 'P/B Ratio',
    category: 'valoracion',
    formulaLaTeX: '\\text{P/B} = \\frac{\\text{Capitalización Bursátil}}{\\text{Patrimonio Neto (Valor Contable Tangible)}}',
    formulaSimple: 'Precio por Acción / Valor Contable por Acción (BVPS)',
    numeratorLabel: 'Capitalización Bursátil / Precio ($)',
    denominatorLabel: 'Patrimonio Neto Contable ($)',
    purpose: 'Compara cuánto cuesta la empresa en bolsa frente a lo que quedaría si se liquidaran todos sus activos y se pagaran todas sus deudas.',
    whyBuffettCares: 'Popularizado por Graham para comprar "cigar butts" (colillas con una última calada gratis). Buffett aprendió con Charlie Munger que un P/B alto es aceptable si la empresa no necesita activos físicos para crecer (como Apple o Google).',
    quote: 'Es mucho mejor comprar una empresa maravillosa a un precio justo, que una empresa justa a un precio maravilloso.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≤ 2.5x (o < 1.0x Graham Net-Net)',
        label: 'Descuento Patrimonial',
        explanation: 'Cotiza con escasa prima sobre su valor en libros tangible. Típico de gangas clásicas de valor.'
      },
      yellow: {
        range: '2.5x - 5.0x',
        label: 'Prima de Calidad',
        explanation: 'Normal en empresas con activos intangibles valiosos (marcas, patentes o software).'
      },
      red: {
        range: '> 5.0x',
        label: 'Desconexión Contable',
        explanation: 'Pagas casi todo por expectativas futuras. Cero protección en caso de liquidación.'
      }
    },
    sampleInputs: {
      numLabel: 'Capitalización en Bolsa ($M)',
      denLabel: 'Patrimonio Neto ($M)',
      defaultNum: 8000,
      defaultDen: 4200,
      unit: 'x',
      evaluator: (val: number) => (val <= 2.5 ? 'green' : val <= 5.0 ? 'yellow' : 'red')
    }
  },

  // 8. Margen de Seguridad (Margin of Safety)
  {
    id: 'margen-seguridad',
    name: 'Margen de Seguridad (Margin of Safety)',
    acronym: 'Margin of Safety',
    category: 'valoracion',
    formulaLaTeX: '\\text{Margen de Seguridad (\\%)} = \\frac{\\text{Valor Intrínseco Estimado} - \\text{Precio de Cotización}}{\\text{Valor Intrínseco Estimado}} \\times 100',
    formulaSimple: '((Valor Intrínseco - Precio) / Valor Intrínseco) × 100',
    numeratorLabel: 'Diferencia (Valor Intrínseco - Precio) ($)',
    denominatorLabel: 'Valor Intrínseco Estimado ($)',
    purpose: 'La piedra angular de toda la filosofía de Value Investing. Es el colchón que te protege de errores humanos de análisis o crisis imprevistas.',
    whyBuffettCares: 'Si construyes un puente para camiones de 10 toneladas, lo diseñas para soportar 30 toneladas. En bolsa, nunca pagues el 100% de lo que crees que vale una empresa.',
    quote: 'Las tres palabras más importantes en toda la inversión son: Margen de Seguridad.',
    quoteAuthor: 'Benjamin Graham / Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 20% - 30%',
        label: 'Compra Fuerte con Colchón',
        explanation: 'Excelente margen para absorber desviaciones de beneficios, recesiones o errores de cálculo.'
      },
      yellow: {
        range: '0% - 19.9%',
        label: 'Precio Justo / Sin Margen',
        explanation: 'Cotiza cerca de su valor intrínseco. No hay ganga, pero tampoco sobreprecio destructivo.'
      },
      red: {
        range: '< 0% (Negativo)',
        label: 'Sobrevaloración / Riesgo',
        explanation: 'El mercado exige una prima desmedida. Riesgo elevado de pérdida permanente de capital.'
      }
    },
    sampleInputs: {
      numLabel: 'Valor Intrínseco Estimado ($)',
      denLabel: 'Precio Actual de Mercado ($)',
      defaultNum: 100,
      defaultDen: 72,
      isPercentage: true,
      customCalc: (intr, price) => (intr > 0 ? ((intr - price) / intr) * 100 : 0),
      evaluator: (val: number) => (val >= 20 ? 'green' : val >= 0 ? 'yellow' : 'red')
    }
  },

  // 9. Descomposición DuPont de ROE
  {
    id: 'dupont',
    name: 'Descomposición DuPont del ROE (3 Factores)',
    acronym: 'DuPont Model',
    category: 'rentabilidad',
    formulaLaTeX: '\\text{ROE} = \\underbrace{\\frac{\\text{Utilidad Neta}}{\\text{Ventas}}}_{\\text{Margen Neto}} \\times \\underbrace{\\frac{\\text{Ventas}}{\\text{Activos}}}_{\\text{Rotación Activos}} \\times \\underbrace{\\frac{\\text{Activos}}{\\text{Patrimonio}}}_{\\text{Multiplicador Apalancamiento}}',
    formulaSimple: 'Margen Neto (%) × Rotación de Activos (x) × Apalancamiento Financiero (x)',
    numeratorLabel: 'Factores de Rentabilidad Operativa',
    denominatorLabel: 'Estructura de Capital',
    purpose: 'Revela la VERDAD detrás de un ROE alto: ¿Es la empresa rentable porque vende caro (margen), porque vende mucho (rotación), o porque está inflada de deuda peligrosa (apalancamiento)?',
    whyBuffettCares: 'Buffett huye de empresas cuyo ROE proviene de apalancarse; busca las que logran ROE colosal gracias a altos márgenes netos (poder de fijación de precios).',
    quote: 'Nunca nos endeudamos para obtener mayores retornos; queremos dormir tranquilos sabiendo que el balance resistirá cualquier tormenta.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: 'ROE > 15% con Apalancamiento < 2.5x',
        label: 'Calidad Orgánica Moat',
        explanation: 'Rentabilidad impulsada por margen neto o rotación eficiente, no por préstamos bancarios.'
      },
      yellow: {
        range: 'ROE 10-15% o Apalancamiento 2.5x-4x',
        label: 'Estructura Normal',
        explanation: 'Equilibrio moderado entre margen comercial y financiación bancaria.'
      },
      red: {
        range: 'ROE inflado con Apalancamiento > 4.5x',
        label: 'Castillo de Naipes',
        explanation: 'Un espejismo contable: el negocio parece rentable solo porque está endeudado hasta el cuello.'
      }
    },
    sampleInputs: {
      numLabel: 'Margen Neto (%)',
      denLabel: 'Rotación de Activos (x)',
      defaultNum: 18,
      defaultDen: 0.95,
      isPercentage: true,
      customCalc: (margen, rotacion) => (margen * rotacion * 1.2),
      evaluator: (val: number) => (val >= 15 ? 'green' : val >= 8 ? 'yellow' : 'red')
    }
  },

  // 10. ROA (Return on Assets)
  {
    id: 'roa',
    name: 'Rentabilidad sobre Activos Totales (ROA)',
    acronym: 'ROA',
    category: 'rentabilidad',
    formulaLaTeX: '\\text{ROA} = \\frac{\\text{Utilidad Neta}}{\\text{Activos Totales}} \\times 100',
    formulaSimple: '(Utilidad Neta / Activos Totales) × 100',
    numeratorLabel: 'Utilidad Neta ($M)',
    denominatorLabel: 'Activos Totales ($M)',
    purpose: 'Indica la eficiencia con la que la dirección de la compañía convierte cada dólar de activo físico y financiero en beneficio neto.',
    whyBuffettCares: 'Diferencia a los negocios "ligeros en activos" (asset-light, como Coca-Cola o software) de negocios devoradores de capital (industria pesada o aerolíneas).',
    quote: 'Los peores negocios son aquellos que crecen rápidamente, requieren un capital colosal para financiar el crecimiento y luego ganan poco dinero.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 8.0%',
        label: 'Alta Productividad de Activos',
        explanation: 'Genera retornos notables sin requerir enormes fábricas o infraestructuras gravosas.'
      },
      yellow: {
        range: '4.0% - 7.9%',
        label: 'Moderado',
        explanation: 'Rendimiento aceptable dentro del promedio de los sectores industriales estándar.'
      },
      red: {
        range: '< 4.0%',
        label: 'Intensivo / Ineficiente',
        explanation: 'El negocio exige continuas inversiones de capital (CapEx) solo para mantenerse a flote.'
      }
    },
    sampleInputs: {
      numLabel: 'Utilidad Neta ($M)',
      denLabel: 'Activos Totales ($M)',
      defaultNum: 480,
      defaultDen: 4000,
      isPercentage: true,
      customCalc: (num, den) => (den > 0 ? (num / den) * 100 : 0),
      evaluator: (val: number) => (val >= 8 ? 'green' : val >= 4 ? 'yellow' : 'red')
    }
  },

  // 11. Rendimiento por Dividendo (Dividend Yield)
  {
    id: 'dividend-yield',
    name: 'Rendimiento por Dividendo (Dividend Yield)',
    acronym: 'Div Yield',
    category: 'valoracion',
    formulaLaTeX: '\\text{Dividend Yield} = \\frac{\\text{Dividendo Anual por Acción}}{\\text{Precio de Cotización}} \\times 100',
    formulaSimple: '(Dividendo por Acción / Precio por Acción) × 100',
    numeratorLabel: 'Dividendo Anual en Efectivo ($)',
    denominatorLabel: 'Precio de Cotización ($)',
    purpose: 'Flujo de caja inmediato que la empresa devuelve al bolsillo del accionista en forma de rentas periódicas.',
    whyBuffettCares: 'A Buffett le encanta recibir dividendos de sus participadas (como Coca-Cola o American Express), pero prefiere que Berkshire retenga el 100% si puede reinvertirlo a tasas más altas.',
    quote: 'Si no encuentras una forma de ganar dinero mientras duermes, trabajarás hasta que mueras.',
    quoteAuthor: 'Warren Buffett',
    thresholds: {
      green: {
        range: '≥ 2.5% - 5.0% (Sostenible)',
        label: 'Flujo Saludable',
        explanation: 'Buen flujo pasivo de caja respaldado por beneficios operativos sólidos (Payout < 65%).'
      },
      yellow: {
        range: '1.0% - 2.4%',
        label: 'Reinversión de Crecimiento',
        explanation: 'Compañías que priorizan reinvertir en proyectos rentables antes que en pagar dividendo.'
      },
      red: {
        range: '> 7.5% o 0% sin beneficios',
        label: 'Trampa de Dividendo / Alarma',
        explanation: 'Un yield anormalmente alto (>8%) suele ser una trampa: el dividendo pronto será recortado porque la acción se ha desplomado.'
      }
    },
    sampleInputs: {
      numLabel: 'Dividendo por Acción ($)',
      denLabel: 'Precio de la Acción ($)',
      defaultNum: 2.1,
      defaultDen: 58,
      isPercentage: true,
      customCalc: (num, den) => (den > 0 ? (num / den) * 100 : 0),
      evaluator: (val: number) => (val >= 2.5 && val <= 7.0 ? 'green' : val >= 1.0 ? 'yellow' : 'red')
    }
  }
];
