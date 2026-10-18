// Ruta de aprendizaje de Aprender: unidades → lecciones cortas → ejercicios interactivos.
// Los ejemplos con cifras usan empresas imaginarias y números redondos para que se puedan
// calcular de cabeza; nunca se presentan como datos reales de mercado.

export interface VideoRef {
  youtubeId: string;
  titulo: string;
  canal: string;
  duracion: string;
}

export type Ejercicio =
  | { tipo: 'eleccion'; pregunta: string; contexto?: string; opciones: string[]; correcta: number; explicacion: string }
  | { tipo: 'verdadero-falso'; afirmacion: string; correcta: boolean; explicacion: string }
  | { tipo: 'emparejar'; pregunta: string; pares: Array<[string, string]>; explicacion: string }
  | { tipo: 'ordenar'; pregunta: string; elementos: string[]; explicacion: string }
  | { tipo: 'clasificar'; pregunta: string; grupos: [string, string]; elementos: Array<{ texto: string; grupo: 0 | 1 }>; explicacion: string }
  | {
      tipo: 'deslizador';
      pregunta: string;
      contexto: string;
      min: number;
      max: number;
      paso: number;
      inicial: number;
      prefijo?: string;
      sufijo?: string;
      objetivo: { desde: number; hasta: number };
      explicacion: string;
    }
  | { tipo: 'calcular'; pregunta: string; datos: string[]; respuesta: number; tolerancia: number; sufijo?: string; pista: string; explicacion: string };

export interface Leccion {
  id: string;
  titulo: string;
  /** Qué sabrás hacer al terminar, en una frase */
  objetivo: string;
  minutos: number;
  /** Tarjeta inicial: la idea en pocas frases, antes de practicar */
  idea: string[];
  ejemplo?: string;
  ejercicios: Ejercicio[];
  video: VideoRef;
}

export type JuegoReto = 'moat' | 'mos' | 'markowitz' | 'biases';

export interface Unidad {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  lecciones: Leccion[];
  reto?: { juego: JuegoReto; titulo: string; descripcion: string; aciertosNecesarios: number };
}

export const RUTA: Unidad[] = [
  /* ─────────────────────────── Unidad 1 ─────────────────────────── */
  {
    id: 'u1',
    numero: 1,
    titulo: 'Qué es invertir en una empresa',
    descripcion: 'Una acción es un trozo de un negocio real, no un número que sube y baja.',
    lecciones: [
      {
        id: 'l1',
        titulo: 'Una acción es un trozo de negocio',
        objetivo: 'Explicar qué compras cuando compras una acción.',
        minutos: 3,
        idea: [
          'Una empresa se divide en partes iguales llamadas acciones. Si compras una, eres dueño de un pedacito del negocio.',
          'Como dueño, te corresponde una parte de lo que la empresa gana. Por eso, a largo plazo, el precio de una acción sigue a los beneficios del negocio.'
        ],
        ejemplo: 'Si una panadería se divide en 1.000 acciones y tienes 10, eres dueño del 1 % de la panadería y de sus ganancias.',
        ejercicios: [
          {
            tipo: 'eleccion',
            pregunta: '¿Qué compras exactamente cuando compras una acción?',
            opciones: ['Un préstamo que la empresa te devolverá', 'Una parte de la propiedad de la empresa', 'Un producto de la empresa con descuento', 'El derecho a trabajar en la empresa'],
            correcta: 1,
            explicacion: 'Una acción es una participación en la propiedad. Quien presta dinero a la empresa compra bonos, no acciones.'
          },
          {
            tipo: 'calcular',
            pregunta: '¿Qué porcentaje de la empresa tienes?',
            datos: ['La empresa tiene 2.000 acciones en total.', 'Tú tienes 50 acciones.'],
            respuesta: 2.5,
            tolerancia: 0.05,
            sufijo: '%',
            pista: 'Divide tus acciones entre el total y multiplica por 100.',
            explicacion: '50 ÷ 2.000 = 0,025, es decir, un 2,5 % del negocio.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'A largo plazo, el precio de una acción tiende a seguir a los beneficios de la empresa.',
            correcta: true,
            explicacion: 'En el corto plazo el precio se mueve por emociones; en el largo plazo, por lo que el negocio gana.'
          },
          {
            tipo: 'emparejar',
            pregunta: 'Une cada palabra con su significado',
            pares: [
              ['Acción', 'Parte de la propiedad de una empresa'],
              ['Accionista', 'Persona dueña de acciones'],
              ['Dividendo', 'Parte del beneficio que se reparte a los dueños'],
              ['Bolsa', 'Mercado donde se compran y venden acciones']
            ],
            explicacion: 'Con estas cuatro palabras ya puedes leer casi cualquier noticia sobre acciones.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Un amigo dice: «Compro acciones de Coca-Cola porque el gráfico va para arriba». ¿Qué le falta a su razonamiento?',
            opciones: ['Nada, el gráfico es lo que importa', 'Preguntarse si el negocio es bueno y cuánto vale', 'Esperar a que el precio suba más', 'Comprar más cantidad para ganar más'],
            correcta: 1,
            explicacion: 'El gráfico muestra dónde estuvo el precio. Un inversor de valor mira el negocio que hay detrás y cuánto vale.'
          }
        ],
        video: { youtubeId: 'qSMM03Joazs', titulo: '¿Qué son las acciones y cómo funcionan?', canal: 'Economipedia', duracion: '3:51' }
      },
      {
        id: 'l2',
        titulo: 'Precio y valor no son lo mismo',
        objetivo: 'Distinguir lo que pagas de lo que recibes.',
        minutos: 4,
        idea: [
          'El precio es lo que pagas hoy en la bolsa. El valor es lo que el negocio vale de verdad por lo que va a ganar en el futuro.',
          'Benjamin Graham imaginaba al mercado como «el señor Mercado», un socio de humor cambiante que cada día te ofrece un precio. Unos días está eufórico y pide demasiado; otros está deprimido y vende barato.'
        ],
        ejemplo: 'Warren Buffett lo resume así: «El precio es lo que pagas; el valor es lo que recibes».',
        ejercicios: [
          {
            tipo: 'clasificar',
            pregunta: 'Clasifica cada frase: ¿habla del precio o del valor?',
            grupos: ['Precio', 'Valor'],
            elementos: [
              { texto: 'Hoy la acción cotiza a $50', grupo: 0 },
              { texto: 'El negocio ganará unos $5 por acción cada año', grupo: 1 },
              { texto: 'Ayer subió un 8 % por una noticia', grupo: 0 },
              { texto: 'Tiene clientes fieles que repiten cada mes', grupo: 1 }
            ],
            explicacion: 'El precio cambia cada segundo; el valor depende de lo que el negocio produce y producirá.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'El señor Mercado está asustado y te ofrece una buena empresa a mitad de lo que vale. ¿Qué haría un inversor de valor?',
            opciones: ['Vender también, por si baja más', 'Aprovechar y comprar con calma', 'Esperar a que el miedo pase y el precio suba', 'Ignorarlo: el precio no importa nunca'],
            correcta: 1,
            explicacion: 'El miedo de los demás es la oportunidad del inversor paciente, siempre que el negocio siga siendo bueno.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Si una acción baja un 30 %, la empresa vale necesariamente un 30 % menos.',
            correcta: false,
            explicacion: 'El precio puede caer por miedo aunque el negocio siga igual. Por eso a veces aparecen gangas.'
          },
          {
            tipo: 'deslizador',
            pregunta: 'Estimas que una acción vale $100. Mueve el precio hasta una zona donde comprar tendría sentido.',
            contexto: 'Busca un precio claramente por debajo de lo que vale.',
            min: 40,
            max: 160,
            paso: 5,
            inicial: 120,
            prefijo: '$',
            objetivo: { desde: 40, hasta: 85 },
            explicacion: 'Cualquier precio claramente inferior a $100 te deja ganancia y protección. Pagar más de lo que vale es especular.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Quién es «el señor Mercado»?',
            opciones: ['El presidente de la bolsa de Nueva York', 'Una metáfora del mercado como socio emocional', 'Un índice que mide el miedo', 'El mayor accionista de cada empresa'],
            correcta: 1,
            explicacion: 'Es la metáfora de Benjamin Graham: el mercado te ofrece precios, pero no estás obligado a aceptarlos.'
          }
        ],
        video: { youtubeId: 'lDCFKrtxO6k', titulo: 'El inversor inteligente en 8 minutos', canal: 'Memorias de Tiburón', duracion: '8:50' }
      },
      {
        id: 'l3',
        titulo: 'El tiempo trabaja para ti',
        objetivo: 'Entender por qué el interés compuesto premia la paciencia.',
        minutos: 4,
        idea: [
          'Con el interés compuesto, las ganancias de cada año también generan ganancias al año siguiente. Es una bola de nieve que crece más rápido cuanto más rueda.',
          'Por eso el factor más poderoso no es acertar cada mes, sino mantener buenas inversiones durante muchos años.'
        ],
        ejemplo: '$1.000 al 10 % anual se convierten en unos $2.600 en 10 años y en unos $17.400 en 30 años.',
        ejercicios: [
          {
            tipo: 'calcular',
            pregunta: '¿Cuánto tendrás al cabo de 2 años?',
            datos: ['Inviertes $1.000.', 'Ganas un 10 % cada año y reinviertes la ganancia.'],
            respuesta: 1210,
            tolerancia: 1,
            sufijo: '$',
            pista: 'Año 1: 1.000 × 1,10. Año 2: el resultado × 1,10.',
            explicacion: '1.000 × 1,10 = 1.100; 1.100 × 1,10 = 1.210. El segundo año ganas $110, no $100: eso es el interés compuesto.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Ana empieza a invertir a los 25 años y Luis a los 45, con el mismo dinero al mes y la misma rentabilidad. A los 65, ¿quién tendrá más?',
            opciones: ['Luis, porque invierte con más experiencia', 'Ana, con mucha diferencia', 'Los dos, lo mismo', 'Depende solo de la suerte'],
            correcta: 1,
            explicacion: 'Ana deja crecer su bola de nieve 20 años más. El tiempo pesa más que la cantidad.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Retirar las ganancias cada año en lugar de reinvertirlas frena el interés compuesto.',
            correcta: true,
            explicacion: 'El efecto bola de nieve necesita que las ganancias se queden trabajando.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena de menor a mayor lo que valdrían $1.000 al 8 % anual',
            elementos: ['Tras 5 años', 'Tras 10 años', 'Tras 20 años', 'Tras 40 años'],
            explicacion: 'Unos $1.470, $2.160, $4.660 y $21.700: los últimos años crecen mucho más que los primeros.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'La «regla del 72» dice que tu dinero se duplica en 72 ÷ rentabilidad años. Al 9 % anual, ¿en cuánto se duplica?',
            opciones: ['En unos 4 años', 'En unos 8 años', 'En unos 12 años', 'En unos 20 años'],
            correcta: 1,
            explicacion: '72 ÷ 9 = 8 años. Es un atajo mental muy útil.'
          }
        ],
        video: { youtubeId: '7h0USmJk2-A', titulo: '¿Qué es el interés compuesto?', canal: 'Memorias de Tiburón', duracion: '7:38' }
      }
    ]
  },

  /* ─────────────────────────── Unidad 2 ─────────────────────────── */
  {
    id: 'u2',
    numero: 2,
    titulo: 'Leer los números de una empresa',
    descripcion: 'Sin ser contador: qué tiene, qué debe y cuánto gana.',
    lecciones: [
      {
        id: 'l4',
        titulo: 'Las tres fotos de una empresa',
        objetivo: 'Saber qué cuenta cada estado financiero.',
        minutos: 4,
        idea: [
          'El balance es una foto de un día: lo que la empresa tiene (activos), lo que debe (pasivos) y lo que queda para los dueños (patrimonio).',
          'La cuenta de resultados es la película del año: ventas, gastos y beneficio. El flujo de caja muestra el dinero que de verdad entró y salió.'
        ],
        ejemplo: 'Activos = Pasivos + Patrimonio. Si tienes una casa de $200.000 con una hipoteca de $150.000, tu patrimonio en ella es de $50.000.',
        ejercicios: [
          {
            tipo: 'emparejar',
            pregunta: 'Une cada estado financiero con lo que muestra',
            pares: [
              ['Balance', 'Lo que tiene y lo que debe en una fecha'],
              ['Cuenta de resultados', 'Ventas, gastos y beneficio del año'],
              ['Flujo de caja', 'El dinero que entró y salió de verdad']
            ],
            explicacion: 'Juntos cuentan la historia completa: cómo está la empresa, cuánto gana y si ese beneficio se convierte en dinero.'
          },
          {
            tipo: 'calcular',
            pregunta: '¿Cuál es el patrimonio de los dueños?',
            datos: ['Activos totales: $500 millones.', 'Pasivos (deudas): $300 millones.'],
            respuesta: 200,
            tolerancia: 0.5,
            sufijo: 'millones',
            pista: 'Patrimonio = Activos − Pasivos.',
            explicacion: '500 − 300 = 200 millones. Es lo que quedaría para los accionistas si se pagara todo lo que se debe.'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Es algo que la empresa tiene o algo que debe?',
            grupos: ['Activo (tiene)', 'Pasivo (debe)'],
            elementos: [
              { texto: 'Dinero en el banco', grupo: 0 },
              { texto: 'Préstamo bancario', grupo: 1 },
              { texto: 'Fábricas y máquinas', grupo: 0 },
              { texto: 'Facturas pendientes con proveedores', grupo: 1 }
            ],
            explicacion: 'Lo que genera o guarda valor es activo; lo que hay que pagar a otros es pasivo.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Una empresa puede tener beneficio en la cuenta de resultados y aun así quedarse sin dinero en caja.',
            correcta: true,
            explicacion: 'Si vende a crédito y sus clientes tardan en pagar, gana «en papel» pero no cobra. Por eso se mira también el flujo de caja.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Quieres saber si una empresa cobró de verdad lo que vendió. ¿Qué miras?',
            opciones: ['El balance', 'El flujo de caja', 'El precio de la acción', 'El número de empleados'],
            correcta: 1,
            explicacion: 'El flujo de caja operativo muestra el dinero que realmente generó el negocio.'
          }
        ],
        video: { youtubeId: 'Xq3zzSFZs4E', titulo: 'Balance general explicado para no contadores', canal: 'Kotaro en Español', duracion: '7:01' }
      },
      {
        id: 'l5',
        titulo: '¿Gana dinero de verdad? El ROE',
        objetivo: 'Medir cuánto gana una empresa con el dinero de sus dueños.',
        minutos: 4,
        idea: [
          'El ROE (rentabilidad sobre el patrimonio) responde a: «por cada $100 que pusieron los dueños, ¿cuánto ganó la empresa este año?».',
          'Buffett busca empresas con ROE alto y estable, por encima del 15 %, conseguido sin endeudarse en exceso.'
        ],
        ejemplo: 'ROE = Beneficio neto ÷ Patrimonio. Si gana $30 con $200 de patrimonio, su ROE es 15 %.',
        ejercicios: [
          {
            tipo: 'calcular',
            pregunta: '¿Cuál es el ROE?',
            datos: ['Beneficio neto: $40 millones.', 'Patrimonio: $200 millones.'],
            respuesta: 20,
            tolerancia: 0.2,
            sufijo: '%',
            pista: 'Beneficio ÷ Patrimonio × 100.',
            explicacion: '40 ÷ 200 = 0,20, un ROE del 20 %: por cada $100 de los dueños gana $20 al año. Es un muy buen negocio.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena estas empresas de mejor a peor rentabilidad (ROE)',
            elementos: ['Empresa A: ROE 28 %', 'Empresa B: ROE 16 %', 'Empresa C: ROE 9 %', 'Empresa D: ROE −4 %'],
            explicacion: 'Más ROE es mejor, siempre que no venga de una deuda excesiva. Un ROE negativo significa pérdidas.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Dos empresas tienen ROE del 25 %. La primera casi no tiene deuda; la segunda debe 6 veces su patrimonio. ¿Cuál prefieres?',
            opciones: ['La que tiene mucha deuda, gana más rápido', 'La que casi no tiene deuda', 'Da igual, el ROE es el mismo', 'Ninguna: el ROE no sirve'],
            correcta: 1,
            explicacion: 'La deuda infla el ROE pero añade riesgo. El mismo ROE sin deuda es de mejor calidad.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Un ROE del 5 % cada año es suficiente para considerar una empresa excelente.',
            correcta: false,
            explicacion: 'Con un 5 % apenas supera a un depósito sin riesgo. Las empresas excelentes suelen superar el 15 %.'
          },
          {
            tipo: 'deslizador',
            pregunta: 'Mueve el ROE hasta la zona que buscaría Warren Buffett.',
            contexto: 'Piensa en el umbral de una empresa de calidad.',
            min: 0,
            max: 40,
            paso: 1,
            inicial: 6,
            sufijo: '%',
            objetivo: { desde: 15, hasta: 40 },
            explicacion: 'Por encima del 15 % sostenido en el tiempo suele indicar un negocio con ventajas sobre la competencia.'
          }
        ],
        video: { youtubeId: 'UPvQVJVwVBg', titulo: 'Ratios de rentabilidad: ROE y ROA', canal: 'Angela Castañeda', duracion: '6:27' }
      },
      {
        id: 'l6',
        titulo: '¿Puede pagar lo que debe?',
        objetivo: 'Leer la liquidez y la deuda de una empresa.',
        minutos: 4,
        idea: [
          'La liquidez corriente compara lo que la empresa cobrará pronto con lo que debe pagar pronto. Por encima de 1,5 es cómoda; por debajo de 1 hay que vigilar.',
          'La deuda sobre patrimonio dice cuánto se debe por cada $1 de los dueños. Por debajo de 1 es prudente; muy por encima, la empresa depende de los bancos.'
        ],
        ejemplo: 'Liquidez = Activo corriente ÷ Pasivo corriente. Si tiene $150 que cobrará este año y debe $100 este año, su liquidez es 1,5.',
        ejercicios: [
          {
            tipo: 'calcular',
            pregunta: '¿Cuál es su liquidez corriente?',
            datos: ['Activo corriente: $90 millones.', 'Pasivo corriente: $60 millones.'],
            respuesta: 1.5,
            tolerancia: 0.02,
            sufijo: 'veces',
            pista: 'Activo corriente ÷ Pasivo corriente.',
            explicacion: '90 ÷ 60 = 1,5: por cada $1 que debe pagar pronto tiene $1,50 para hacerlo. Cómodo.'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Balance sano o en riesgo?',
            grupos: ['Sano', 'En riesgo'],
            elementos: [
              { texto: 'Liquidez 2,0 y deuda 0,4 veces el patrimonio', grupo: 0 },
              { texto: 'Liquidez 0,7 y deuda 4 veces el patrimonio', grupo: 1 },
              { texto: 'Mucho efectivo y casi sin préstamos', grupo: 0 },
              { texto: 'Pide préstamos para pagar los intereses de otros', grupo: 1 }
            ],
            explicacion: 'Las empresas que quiebran casi siempre lo hacen por deuda, no por falta de clientes.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Llega una crisis y las ventas caen un 30 %. ¿Qué empresa sufre más?',
            opciones: ['La que no tiene deuda', 'La que debe 5 veces su patrimonio', 'Las dos igual', 'La que tiene más empleados'],
            correcta: 1,
            explicacion: 'Con mucha deuda, los intereses hay que pagarlos aunque las ventas caigan. Puede no aguantar.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Una liquidez corriente de 0,8 significa que lo que cobrará pronto no alcanza para lo que debe pagar pronto.',
            correcta: true,
            explicacion: 'Por debajo de 1 depende de vender existencias, cobrar rápido o pedir prestado.'
          },
          {
            tipo: 'emparejar',
            pregunta: 'Une cada ratio con la pregunta que responde',
            pares: [
              ['Liquidez corriente', '¿Puede pagar sus deudas de este año?'],
              ['Deuda / patrimonio', '¿Cuánto depende de los bancos?'],
              ['Cobertura de intereses', '¿Le alcanza el beneficio para pagar los intereses?']
            ],
            explicacion: 'Tres preguntas rápidas para saber si una empresa duerme tranquila.'
          }
        ],
        video: { youtubeId: '3hld2OkhKvE', titulo: 'Análisis con ratios financieros paso a paso', canal: 'Sustraendo', duracion: '16:38' }
      }
    ]
  },

  /* ─────────────────────────── Unidad 3 ─────────────────────────── */
  {
    id: 'u3',
    numero: 3,
    titulo: 'Ventajas que duran',
    descripcion: 'El foso que protege a un negocio y las trampas que parecen gangas.',
    lecciones: [
      {
        id: 'l7',
        titulo: 'El foso económico',
        objetivo: 'Reconocer las ventajas competitivas que protegen un negocio.',
        minutos: 4,
        idea: [
          'Buffett compara una buena empresa con un castillo: el beneficio es el castillo y la ventaja competitiva es el foso que impide que la competencia lo asalte.',
          'Los fosos más comunes son: una marca que la gente prefiere, el coste de cambiar de proveedor, el efecto red (vale más cuanta más gente lo usa) y producir más barato que nadie.'
        ],
        ejercicios: [
          {
            tipo: 'emparejar',
            pregunta: 'Une cada empresa con su foso principal',
            pares: [
              ['Coca-Cola', 'Marca querida en todo el mundo'],
              ['WhatsApp', 'Efecto red: está ahí porque todos están'],
              ['Microsoft Office', 'Coste de cambiar: todo el mundo trabaja con él'],
              ['Costco', 'Costes más bajos que la competencia']
            ],
            explicacion: 'Cada tipo de foso protege de forma distinta, pero todos hacen difícil quitarle clientes.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Una cafetería sube sus precios un 20 % y sus clientes se van a la de enfrente. ¿Qué te dice eso?',
            opciones: ['Que tiene un foso amplio', 'Que no tiene foso: no puede fijar precios', 'Que debería abrir más locales', 'Que su marca es muy fuerte'],
            correcta: 1,
            explicacion: 'Poder subir precios sin perder clientes es la mejor prueba de un foso. Si se van, no lo hay.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Un producto de moda que se vende mucho este año ya tiene un foso económico.',
            correcta: false,
            explicacion: 'Un foso tiene que durar años. La moda pasa y los competidores copian.'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Tiene foso o no?',
            grupos: ['Con foso', 'Sin foso claro'],
            elementos: [
              { texto: 'Bolsa de valores de un país (casi un monopolio)', grupo: 0 },
              { texto: 'Aerolínea que compite solo por precio', grupo: 1 },
              { texto: 'Red de pagos que aceptan todos los comercios', grupo: 0 },
              { texto: 'Tienda de ropa sin marca propia', grupo: 1 }
            ],
            explicacion: 'Donde el cliente solo decide por precio, cuesta mucho mantener beneficios altos.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Qué número suele delatar que una empresa tiene foso?',
            opciones: ['Un ROE alto y estable durante muchos años', 'Mucha publicidad en televisión', 'Un precio de la acción muy alto', 'Muchos empleados'],
            correcta: 0,
            explicacion: 'Si la competencia no logra bajarle la rentabilidad durante años, algo la protege.'
          }
        ],
        video: { youtubeId: '9bYw7IRXghE', titulo: '¿Qué son y cómo distinguir las ventajas competitivas?', canal: 'Value School', duracion: '12:56' }
      },
      {
        id: 'l8',
        titulo: 'Trampas de valor: barato no siempre es bueno',
        objetivo: 'Detectar empresas que parecen gangas pero no lo son.',
        minutos: 4,
        idea: [
          'Una trampa de valor es una acción que parece barata (por ejemplo, con un PER muy bajo) pero sigue bajando porque el negocio se está deteriorando.',
          'Señales de alarma: ventas que caen año tras año, mucha deuda, pérdidas, un sector que desaparece. Lo barato puede salir caro.'
        ],
        ejercicios: [
          {
            tipo: 'clasificar',
            pregunta: '¿Oportunidad o trampa?',
            grupos: ['Posible oportunidad', 'Posible trampa'],
            elementos: [
              { texto: 'Cae por miedo general, pero sus ventas siguen creciendo', grupo: 0 },
              { texto: 'PER de 4, ventas cayendo 5 años seguidos y deuda alta', grupo: 1 },
              { texto: 'Alquiler de películas en DVD en la era del streaming', grupo: 1 },
              { texto: 'Buena empresa con un problema puntual que ya se está resolviendo', grupo: 0 }
            ],
            explicacion: 'La pregunta clave no es si está barata, sino si el negocio seguirá ganando dinero.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Cuál es la mejor defensa contra las trampas de valor?',
            opciones: ['Comprar solo lo que más ha bajado', 'Exigir calidad: negocio rentable, poca deuda y futuro', 'Comprar solo empresas con PER bajo', 'Seguir los consejos de las redes sociales'],
            correcta: 1,
            explicacion: 'Primero calidad, después precio. Un negocio bueno a precio razonable vale más que uno malo muy barato.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Si una acción ha caído un 80 %, ya no puede caer mucho más.',
            correcta: false,
            explicacion: 'Desde $10 aún puede bajar a $0. Lo que importa es el negocio, no cuánto ha caído.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena los pasos que sigue un buen inversor antes de comprar algo «barato»',
            elementos: ['Entender cómo gana dinero el negocio', 'Comprobar que es rentable y tiene poca deuda', 'Estimar cuánto vale', 'Comprar solo si el precio deja un margen de seguridad'],
            explicacion: 'El precio es el último paso, no el primero.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'En la app, una empresa tiene nota F y está «barata». ¿Qué dice el veredicto?',
            opciones: ['Que es una gran oportunidad', 'Que puede ser una trampa: la empresa es débil', 'Que hay que comprar ya', 'Que la nota no importa'],
            correcta: 1,
            explicacion: 'Una nota débil con precio bajo es el perfil típico de una trampa de valor.'
          }
        ],
        video: { youtubeId: 'Oa0vxjeRbB0', titulo: '¿Qué son las trampas de valor?', canal: 'Cobas Asset Management', duracion: '7:08' }
      }
    ],
    reto: { juego: 'moat', titulo: 'Reto: ¿foso o trampa?', descripcion: 'Analiza casos reales y decide si la empresa tiene un foso o es una trampa.', aciertosNecesarios: 2 }
  },

  /* ─────────────────────────── Unidad 4 ─────────────────────────── */
  {
    id: 'u4',
    numero: 4,
    titulo: '¿Está barata o cara?',
    descripcion: 'PER, valor intrínseco y el margen de seguridad de Graham.',
    lecciones: [
      {
        id: 'l9',
        titulo: 'El PER: cuántos años de beneficios pagas',
        objetivo: 'Usar el PER para saber si un precio es exigente.',
        minutos: 4,
        idea: [
          'El PER divide el precio de la acción entre el beneficio por acción. Te dice cuántos años de beneficios actuales estás pagando.',
          'Un PER de 10 es barato si el negocio es estable; uno de 40 exige que la empresa crezca mucho. Siempre se compara con empresas parecidas.'
        ],
        ejemplo: 'Si la acción cuesta $60 y gana $4 por acción, su PER es 15: pagas 15 años de beneficios.',
        ejercicios: [
          {
            tipo: 'calcular',
            pregunta: '¿Cuál es el PER?',
            datos: ['Precio de la acción: $80.', 'Beneficio por acción: $5.'],
            respuesta: 16,
            tolerancia: 0.1,
            sufijo: 'veces',
            pista: 'Precio ÷ Beneficio por acción.',
            explicacion: '80 ÷ 5 = 16. Pagas 16 años de beneficios de hoy.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena de más barata a más cara (mismo sector, mismo crecimiento)',
            elementos: ['PER 9', 'PER 14', 'PER 22', 'PER 45'],
            explicacion: 'Con negocios parecidos, menos PER significa pagar menos por cada dólar de beneficio.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Una empresa tiene PER 6, pero pierde clientes cada año. ¿Qué significa?',
            opciones: ['Es una ganga segura', 'El mercado duda de sus beneficios futuros', 'El PER está mal calculado', 'Va a subir pronto'],
            correcta: 1,
            explicacion: 'Un PER muy bajo suele reflejar dudas. Si los beneficios caen, el PER real será mucho mayor.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Una empresa con pérdidas no tiene un PER útil.',
            correcta: true,
            explicacion: 'Sin beneficio no hay nada que dividir: hay que valorarla de otra forma y con más cuidado.'
          },
          {
            tipo: 'emparejar',
            pregunta: 'Une cada múltiplo con lo que compara',
            pares: [
              ['PER', 'Precio frente a beneficio'],
              ['Precio / valor contable', 'Precio frente a patrimonio'],
              ['Rentabilidad por dividendo', 'Dividendo anual frente a precio']
            ],
            explicacion: 'Los múltiplos son atajos para saber si pagas mucho o poco por lo que recibes.'
          }
        ],
        video: { youtubeId: 'JBezbIL0KAg', titulo: 'Cómo saber si una acción está cara o barata (PER)', canal: 'Juan David V', duracion: '9:23' }
      },
      {
        id: 'l10',
        titulo: 'El valor intrínseco',
        objetivo: 'Entender cómo se estima lo que vale un negocio.',
        minutos: 5,
        idea: [
          'El valor intrínseco es lo que vale un negocio por todo el dinero que generará en el futuro, traído a hoy.',
          'Un dólar dentro de 10 años vale menos que uno hoy, porque hoy podrías invertirlo. Por eso el dinero futuro se «descuenta». Ese cálculo se llama DCF (flujos de caja descontados).'
        ],
        ejemplo: 'La app calcula un DCF de referencia con supuestos prudentes y lo compara con el precio, pero nunca lo presenta como un precio objetivo exacto.',
        ejercicios: [
          {
            tipo: 'eleccion',
            pregunta: '¿Qué prefieres: $100 hoy o $100 dentro de 5 años?',
            opciones: ['Hoy: puedo invertirlos y tener más en 5 años', 'Dentro de 5 años', 'Me da igual', 'Depende del precio de la acción'],
            correcta: 0,
            explicacion: 'El dinero de hoy puede crecer. Por eso el dinero futuro vale menos y hay que descontarlo.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'El valor intrínseco es una cifra exacta que todos los analistas calculan igual.',
            correcta: false,
            explicacion: 'Es una estimación que depende de supuestos. Por eso se exige un margen de seguridad.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena los pasos de una valoración por DCF',
            elementos: ['Estimar el dinero que generará cada año', 'Elegir una tasa de descuento según el riesgo', 'Traer esos flujos a valor de hoy', 'Dividir el valor entre el número de acciones'],
            explicacion: 'Así se pasa de «lo que ganará» a «cuánto vale cada acción hoy».'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Si subes la tasa de descuento (exiges más rentabilidad por el riesgo), ¿qué pasa con el valor estimado?',
            opciones: ['Sube', 'Baja', 'No cambia', 'Se duplica'],
            correcta: 1,
            explicacion: 'Cuanto más riesgo, más se descuenta el futuro y menos vale hoy.'
          },
          {
            tipo: 'deslizador',
            pregunta: 'Estimas un valor de $120. Un analista optimista dice $160 y uno pesimista $90. ¿Qué precio de compra sería prudente?',
            contexto: 'Ponte en el escenario pesimista.',
            min: 60,
            max: 180,
            paso: 5,
            inicial: 140,
            prefijo: '$',
            objetivo: { desde: 60, hasta: 90 },
            explicacion: 'Comprar por debajo incluso del escenario pesimista te protege si te equivocas.'
          }
        ],
        video: { youtubeId: 'xTuPY3628Xw', titulo: 'El valor intrínseco de las acciones', canal: 'Invertir desde Cero', duracion: '9:42' }
      },
      {
        id: 'l11',
        titulo: 'El margen de seguridad',
        objetivo: 'Calcular a qué precio comprar con colchón.',
        minutos: 4,
        idea: [
          'Benjamin Graham decía que la idea central de la inversión es el margen de seguridad: comprar bastante por debajo de lo que vale el negocio.',
          'Ese descuento es un colchón frente a tus errores de cálculo y a la mala suerte. La app usa un 15 % como mínimo; muchos inversores exigen un 25-30 %.'
        ],
        ejemplo: 'Si vale $100 y exiges un 30 % de margen, compras a $70 o menos.',
        ejercicios: [
          {
            tipo: 'calcular',
            pregunta: '¿Hasta qué precio comprarías?',
            datos: ['Valor estimado: $200.', 'Quieres un margen de seguridad del 25 %.'],
            respuesta: 150,
            tolerancia: 0.5,
            sufijo: '$',
            pista: 'Valor × (1 − 0,25).',
            explicacion: '200 × 0,75 = $150. Por debajo de ese precio tienes tu colchón del 25 %.'
          },
          {
            tipo: 'deslizador',
            pregunta: 'Vale $80. Mueve el precio hasta una zona con al menos un 20 % de margen de seguridad.',
            contexto: '80 × 0,80 = ?',
            min: 40,
            max: 100,
            paso: 1,
            inicial: 90,
            prefijo: '$',
            objetivo: { desde: 40, hasta: 64 },
            explicacion: 'A $64 o menos el descuento es del 20 % o más.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Por qué se exige margen de seguridad si ya calculaste el valor?',
            opciones: ['Porque el valor es una estimación y puedes equivocarte', 'Para pagar menos comisiones', 'Porque lo exige la ley', 'Para vender más rápido'],
            correcta: 0,
            explicacion: 'Como un ingeniero que diseña un puente para 30 toneladas y solo deja pasar camiones de 10.'
          },
          {
            tipo: 'calcular',
            pregunta: '¿Qué margen de seguridad tienes?',
            datos: ['Valor estimado: $50.', 'Precio de hoy: $40.'],
            respuesta: 20,
            tolerancia: 0.2,
            sufijo: '%',
            pista: '(Valor − Precio) ÷ Valor × 100.',
            explicacion: '(50 − 40) ÷ 50 = 0,20: un margen del 20 %.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Una empresa excelente comprada muy por encima de su valor puede ser una mala inversión.',
            correcta: true,
            explicacion: 'Pagar de más reduce tu rentabilidad durante años, aunque el negocio sea bueno.'
          }
        ],
        video: { youtubeId: 'h1SkgLUbn4M', titulo: '¿Qué es el margen de seguridad?', canal: 'Cobas Asset Management', duracion: '3:35' }
      }
    ],
    reto: { juego: 'mos', titulo: 'Reto: margen de seguridad', descripcion: 'Decide a qué precio comprarías frente a los cambios de humor del señor Mercado.', aciertosNecesarios: 2 }
  },

  /* ─────────────────────────── Unidad 5 ─────────────────────────── */
  {
    id: 'u5',
    numero: 5,
    titulo: 'Tu mente, tu mayor riesgo',
    descripcion: 'Las emociones y los atajos mentales que hacen perder dinero.',
    lecciones: [
      {
        id: 'l12',
        titulo: 'Miedo y codicia',
        objetivo: 'Reconocer cuándo decides por emoción y no por análisis.',
        minutos: 4,
        idea: [
          'Cuando todos ganan, la codicia empuja a comprar caro. Cuando todos pierden, el miedo empuja a vender barato. Es justo al revés de lo que conviene.',
          'Buffett: «Sé temeroso cuando otros son codiciosos y codicioso cuando otros tienen miedo». Un plan escrito antes de invertir te protege de ti mismo.'
        ],
        ejercicios: [
          {
            tipo: 'eleccion',
            pregunta: 'Todo el mundo habla de una acción que ha subido un 300 % este año. ¿Qué emoción suele empujar a comprarla?',
            opciones: ['Miedo', 'Codicia y miedo a quedarse fuera (FOMO)', 'Prudencia', 'Paciencia'],
            correcta: 1,
            explicacion: 'El FOMO lleva a comprar cuando el precio ya recoge todo el optimismo.'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Decisión emocional o disciplinada?',
            grupos: ['Emocional', 'Disciplinada'],
            elementos: [
              { texto: 'Vender todo porque el noticiero dice «crisis»', grupo: 0 },
              { texto: 'Comprar por una lista de criterios escrita antes', grupo: 1 },
              { texto: 'Mirar el precio 20 veces al día', grupo: 0 },
              { texto: 'Revisar los resultados de la empresa cada trimestre', grupo: 1 }
            ],
            explicacion: 'La disciplina es decidir antes, con calma, qué harás cuando el mercado se ponga nervioso.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Operar mucho (comprar y vender a menudo) suele mejorar la rentabilidad del inversor particular.',
            correcta: false,
            explicacion: 'Los estudios muestran lo contrario: más operaciones, más comisiones y más errores emocionales.'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena qué hacer cuando tu acción cae un 25 % en un mes',
            elementos: ['Respirar y no decidir en caliente', 'Revisar si cambió algo del negocio', 'Comparar el precio con tu valor estimado', 'Mantener, comprar más o vender según ese análisis'],
            explicacion: 'Las caídas son información sobre el precio, no necesariamente sobre el negocio.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Qué herramienta ayuda más a no dejarse llevar por las emociones?',
            opciones: ['Una lista de criterios por escrito', 'Seguir a influencers', 'Mirar el precio cada hora', 'Invertir con dinero prestado'],
            correcta: 0,
            explicacion: 'Escribir por qué compras y cuándo venderías te ancla a la razón.'
          }
        ],
        video: { youtubeId: '-Wz5LugFiM0', titulo: 'Las 5 claves de psicología para invertir en bolsa', canal: 'Invertir desde Cero', duracion: '12:58' }
      },
      {
        id: 'l13',
        titulo: 'Los atajos que engañan',
        objetivo: 'Identificar los sesgos más comunes al invertir.',
        minutos: 4,
        idea: [
          'Los sesgos cognitivos son atajos del cerebro que suelen funcionar en la vida diaria pero fallan al invertir.',
          'Los más peligrosos: anclaje (fijarte en un precio pasado), aversión a la pérdida (no vender algo malo para no «perder»), exceso de confianza y confirmación (buscar solo lo que te da la razón).'
        ],
        ejercicios: [
          {
            tipo: 'emparejar',
            pregunta: 'Une cada sesgo con su ejemplo',
            pares: [
              ['Anclaje', '«Estaba a $200, a $120 seguro que es barata»'],
              ['Aversión a la pérdida', '«No vendo hasta recuperar lo que pagué»'],
              ['Confirmación', 'Leer solo noticias que dicen que acertaste'],
              ['Exceso de confianza', '«Yo sí sé cuándo va a subir»']
            ],
            explicacion: 'Ponerles nombre es el primer paso para que no decidan por ti.'
          },
          {
            tipo: 'eleccion',
            pregunta: 'Compraste a $50 y ahora vale $30. El negocio empeoró. ¿Qué sesgo te impide vender?',
            opciones: ['Anclaje en tu precio de compra y aversión a la pérdida', 'Efecto red', 'Margen de seguridad', 'Interés compuesto'],
            correcta: 0,
            explicacion: 'Al mercado no le importa a cuánto compraste. La pregunta es: ¿hoy comprarías esta empresa?'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Buscar a propósito opiniones contrarias a tu inversión es una buena práctica.',
            correcta: true,
            explicacion: 'Es el antídoto contra el sesgo de confirmación. Munger lo llamaba «invertir el problema».'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Sesgo o buen hábito?',
            grupos: ['Sesgo', 'Buen hábito'],
            elementos: [
              { texto: 'Comprar porque «todos mis amigos compraron»', grupo: 0 },
              { texto: 'Preguntarte qué te haría cambiar de opinión', grupo: 1 },
              { texto: 'Creer que una racha de aciertos te hace infalible', grupo: 0 },
              { texto: 'Llevar un diario de tus decisiones y sus motivos', grupo: 1 }
            ],
            explicacion: 'Los buenos hábitos convierten los errores en aprendizaje.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Qué pregunta ayuda a vencer el anclaje?',
            opciones: ['«¿A cuánto la compré?»', '«¿Hoy compraría esta empresa a este precio?»', '«¿Cuánto llegó a valer?»', '«¿Qué dicen en redes?»'],
            correcta: 1,
            explicacion: 'Decide con la información de hoy, no con los precios del pasado.'
          }
        ],
        video: { youtubeId: '3hG4gwIPwDs', titulo: '¿Cómo nos engañan? Los sesgos cognitivos', canal: 'CuriosaMente', duracion: '5:13' }
      }
    ],
    reto: { juego: 'biases', titulo: 'Reto: detector de sesgos', descripcion: 'Identifica el sesgo que hay detrás de cada decisión.', aciertosNecesarios: 2 }
  },

  /* ─────────────────────────── Unidad 6 ─────────────────────────── */
  {
    id: 'u6',
    numero: 6,
    titulo: 'Construir tu cartera',
    descripcion: 'Diversificar con cabeza y entender el riesgo.',
    lecciones: [
      {
        id: 'l14',
        titulo: 'No pongas todos los huevos en una cesta',
        objetivo: 'Entender por qué diversificar reduce el riesgo.',
        minutos: 4,
        idea: [
          'Si todo tu dinero está en una sola empresa, un problema en ella te golpea de lleno. Repartirlo entre varias empresas distintas suaviza los golpes.',
          'Harry Markowitz demostró que combinar inversiones que no se mueven igual reduce el riesgo sin bajar la rentabilidad esperada: es el «almuerzo gratis» de las finanzas.'
        ],
        ejemplo: 'Un paraguas y unas gafas de sol: cuando uno vende poco, el otro vende mucho. Juntos, las ventas son más estables.',
        ejercicios: [
          {
            tipo: 'eleccion',
            pregunta: '¿Qué cartera está mejor diversificada?',
            opciones: ['5 bancos del mismo país', '5 empresas de sectores y países distintos', '1 empresa tecnológica muy buena', '5 empresas de petróleo'],
            correcta: 1,
            explicacion: 'Diversificar es tener cosas que no dependen del mismo factor de riesgo.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Diversificar entre empresas que se mueven exactamente igual apenas reduce el riesgo.',
            correcta: true,
            explicacion: 'El beneficio viene de combinar cosas que no suben y bajan a la vez.'
          },
          {
            tipo: 'clasificar',
            pregunta: '¿Suelen moverse juntas o de forma distinta?',
            grupos: ['Se mueven juntas', 'Se mueven distinto'],
            elementos: [
              { texto: 'Dos aerolíneas', grupo: 0 },
              { texto: 'Una petrolera y una aerolínea', grupo: 1 },
              { texto: 'Dos bancos del mismo país', grupo: 0 },
              { texto: 'Una empresa de comida básica y una de lujo', grupo: 1 }
            ],
            explicacion: 'Si el petróleo sube, la petrolera gana y la aerolínea paga más combustible: se compensan.'
          },
          {
            tipo: 'deslizador',
            pregunta: 'Para un inversor particular, ¿cuántas empresas distintas suelen bastar para diversificar bien?',
            contexto: 'Ni tan pocas que dependas de una, ni tantas que no puedas seguirlas.',
            min: 1,
            max: 60,
            paso: 1,
            inicial: 1,
            sufijo: ' empresas',
            objetivo: { desde: 10, hasta: 30 },
            explicacion: 'Entre 10 y 30 empresas de sectores distintos se elimina la mayor parte del riesgo de una sola empresa.'
          },
          {
            tipo: 'eleccion',
            pregunta: '¿Qué es el «almuerzo gratis» de Markowitz?',
            opciones: ['Menos riesgo sin renunciar a rentabilidad, gracias a combinar bien', 'Acciones que regalan dividendos', 'Comprar sin comisiones', 'Ganar sin invertir'],
            correcta: 0,
            explicacion: 'Es de las pocas cosas en finanzas que mejoran el resultado sin coste.'
          }
        ],
        video: { youtubeId: 'yolpsyijPeY', titulo: '¿Qué es el modelo de Markowitz?', canal: 'Rankia', duracion: '7:50' }
      },
      {
        id: 'l15',
        titulo: 'Riesgo y rentabilidad',
        objetivo: 'Comparar inversiones por lo que ganan y lo que arriesgan.',
        minutos: 4,
        idea: [
          'La rentabilidad es lo que ganas; la volatilidad mide cuánto sube y baja el precio por el camino. Más rentabilidad esperada suele venir con más altibajos.',
          'El ratio de Sharpe compara la ganancia extra sobre un activo sin riesgo con la volatilidad. Más Sharpe es mejor: ganas más por cada unidad de susto.'
        ],
        ejemplo: 'Para un inversor de valor, el verdadero riesgo no es que el precio baje un tiempo, sino perder dinero de forma permanente.',
        ejercicios: [
          {
            tipo: 'eleccion',
            pregunta: 'A y B ganan un 8 % al año. A sube y baja un 5 %; B, un 25 %. ¿Cuál es mejor?',
            opciones: ['A: misma ganancia con menos sustos', 'B: más emoción', 'Son iguales', 'Ninguna'],
            correcta: 0,
            explicacion: 'Con la misma rentabilidad, menos volatilidad es mejor (más Sharpe).'
          },
          {
            tipo: 'ordenar',
            pregunta: 'Ordena de menor a mayor riesgo habitual',
            elementos: ['Depósito bancario', 'Bonos del Estado', 'Cartera diversificada de acciones', 'Una sola acción pequeña'],
            explicacion: 'A más riesgo, más rentabilidad posible, pero también más posibilidad de perder.'
          },
          {
            tipo: 'calcular',
            pregunta: '¿Cuál es el ratio de Sharpe?',
            datos: ['Rentabilidad de la cartera: 10 %.', 'Rentabilidad sin riesgo: 4 %.', 'Volatilidad: 12 %.'],
            respuesta: 0.5,
            tolerancia: 0.02,
            pista: '(Rentabilidad − sin riesgo) ÷ volatilidad.',
            explicacion: '(10 − 4) ÷ 12 = 0,5. Ganas medio punto extra por cada punto de volatilidad.'
          },
          {
            tipo: 'verdadero-falso',
            afirmacion: 'Para un inversor de valor, una caída temporal del precio de un buen negocio es lo mismo que perder el dinero.',
            correcta: false,
            explicacion: 'Si el negocio sigue siendo bueno y no vendes, la caída es temporal. La pérdida permanente viene de malos negocios o de vender en pánico.'
          },
          {
            tipo: 'emparejar',
            pregunta: 'Une cada concepto con su definición',
            pares: [
              ['Rentabilidad', 'Lo que ganas con la inversión'],
              ['Volatilidad', 'Cuánto sube y baja el precio'],
              ['Ratio de Sharpe', 'Ganancia extra por unidad de riesgo'],
              ['Diversificación', 'Repartir para que un fallo no lo arruine todo']
            ],
            explicacion: 'Con estas cuatro ideas ya puedes leer el simulador de cartera de la app.'
          }
        ],
        video: { youtubeId: 'qQXmZGv5CKE', titulo: 'Rentabilidad y riesgo', canal: 'Libertelia', duracion: '6:35' }
      }
    ],
    reto: { juego: 'markowitz', titulo: 'Reto: el almuerzo gratis', descripcion: 'Combina activos para bajar el riesgo de la cartera sin perder rentabilidad.', aciertosNecesarios: 1 }
  }
];

export const TODAS_LAS_LECCIONES: Leccion[] = RUTA.flatMap(u => u.lecciones);

/** Orden lineal de nodos del camino: lecciones y retos al final de su unidad */
export type NodoRuta =
  | { tipo: 'leccion'; id: string; unidad: Unidad; leccion: Leccion }
  | { tipo: 'reto'; id: string; unidad: Unidad };

export const NODOS: NodoRuta[] = RUTA.flatMap(u => [
  ...u.lecciones.map(l => ({ tipo: 'leccion' as const, id: l.id, unidad: u, leccion: l })),
  ...(u.reto ? [{ tipo: 'reto' as const, id: `reto-${u.id}`, unidad: u }] : [])
]);
