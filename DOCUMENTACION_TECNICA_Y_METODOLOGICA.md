# DOCUMENTACIÓN TÉCNICA Y METODOLÓGICA
## Plataforma de Educación Financiera e Inversión en Valor: *El Rincón de Warren*
**Marco Conceptual, Formulación Matemática, Modelo de Scoring Multicriterio y Teoría Moderna de Portafolios**

---

### Resumen Ejecutivo y Validez Académica

El presente documento constituye la especificación técnica y metodológica oficial del repositorio y la plataforma interactiva *El Rincón de Warren*. El objetivo central del proyecto es proporcionar un entorno de simulación computacional pedagógico y riguroso para la formación en **Inversión en Valor (*Value Investing*)**, mitigación de sesgos conductuales y asignación cuantitativa de activos.

Para garantizar la validez científica y metodológica requerida en proyectos de investigación académica, esta documentación detalla:
1. Las fórmulas exactas y justificación empírica de los **Ratios Fundamentales** en cuatro dimensiones contables (Liquidez, Solvencia, Rentabilidad y Valoración).
2. El **Modelo de Score Lineal $S(a)$**, su base en la Teoría de Decisión Multicriterio (MCDA), la función de agregación ponderada y el criterio determinístico para clasificar cuándo una empresa es **Buena** o **Mala** (evitando trampas de valor).
3. La formulación matemática y el algoritmo computacional del **Simulador de Markowitz (Teoría Moderna de Portafolios - MPT)**, la demostración cuantitativa del *"Almuerzo Gratis"* (reducción de riesgo por covarianza) y la integración con la cartera activa del usuario.
4. Las referencias bibliográficas académicas en formato APA de los autores fundacionales (Markowitz, Sharpe, Graham & Dodd, Piotroski, Altman, Damodaran, Tobin, Kahneman & Tversky).

---

## 1. Ratios Fundamentales: Fórmulas, Datos Contables e Interpretación

El módulo de análisis fundamental extrae variables de los tres estados financieros reglamentarios (Balance General, Estado de Resultados y Estado de Flujos de Efectivo) bajo normas contables internacionales (US GAAP / IFRS) y computa diez ratios nucleares estructurados en cuatro dimensiones.

### 1.1 Dimensión 1: Liquidez a Corto Plazo ($w_{\text{Liquidez}} = 0.20$)

Mide la capacidad de la entidad para atender sus obligaciones de pago con vencimiento inferior a doce meses sin necesidad de liquidar activos fijos o recurrir a financiación externa de urgencia.

#### A. Liquidez Corriente (*Current Ratio*)
$$\text{Current Ratio} = \frac{\text{Activo Circulante}}{\text{Pasivo Circulante}} = \frac{AC}{PC}$$
* **Variables Contables**:
  - $AC$: Total de activos que se convertirán en efectivo en menos de un año (efectivo, equivalentes, cuentas por cobrar comerciales e inventarios).
  - $PC$: Total de deudas y obligaciones exigibles en menos de un año (proveedores, deuda financiera a corto plazo, nóminas y pasivos acumulados).
* **Interpretación Financiera**: Cuántos dólares de activo líquido respaldan cada dólar de deuda inmediata.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 1.50\times$)**: Colchón holgado de tesorería y solvencia corriente (criterio clásico de Benjamin Graham $\ge 2.0\times$).
  - 🟡 **Amarillo ($1.10\times - 1.49\times$)**: Liquidez ajustada; requiere vigilancia de la rotación de cobros.
  - 🔴 **Rojo ($< 1.10\times$)**: Déficit de fondo de maniobra; riesgo de tensión de tesorería ante imprevistos.

#### B. Ratio de Tesorería / Prueba Ácida (*Acid-Test / Quick Ratio*)
$$\text{Quick Ratio} = \frac{\text{Activo Circulante} - \text{Inventarios}}{PC} = \frac{\text{Efectivo} + \text{Inversiones a CP} + \text{Cuentas por Cobrar}}{PC}$$
* **Variables Contables**: Deduce los inventarios ($Inv$) del activo circulante debido a que su conversión en liquidez depende de la demanda comercial y de posibles rebajas de precio.
* **Interpretación Financiera**: Capacidad de pago inmediata sin depender de la venta de existencias.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 1.00\times$)**: Cobertura plena de deudas a corto plazo mediante activos de disponibilidad inmediata.
  - 🟡 **Amarillo ($0.50\times - 0.99\times$)**: Cobertura parcial; dependencia moderada de la liquidación de inventarios.
  - 🔴 **Rojo ($< 0.50\times$)**: Severa vulnerabilidad de liquidez inmediata.

#### C. Disponibilidad Inmediata (*Cash Ratio*)
$$\text{Cash Ratio} = \frac{\text{Efectivo y Equivalentes de Efectivo}}{PC}$$
* **Variables Contables**: Considera exclusivamente tesorería, cuentas a la vista y activos del mercado monetario de alta liquidez.
* **Interpretación Financiera**: Capacidad para satisfacer pasivos corrientes hoy mismo sin requerir ningún cobro a clientes.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 0.30\times$)**: Posición defensiva blindada (estilo caja de Berkshire Hathaway).
  - 🟡 **Amarillo ($0.15\times - 0.29\times$)**: Nivel estándar de gestión de caja operativa.
  - 🔴 **Rojo ($< 0.15\times$)**: Nula holgura de caja; dependencia total de la línea de crédito bancaria.

---

### 1.2 Dimensión 2: Solvencia y Estructura de Capital ($w_{\text{Solvencia}} = 0.25$)

Evalúa la viabilidad financiera a largo plazo, el nivel de apalancamiento financiero y el riesgo de quiebra corporativa (*financial distress*).

#### A. Ratio de Endeudamiento sobre Patrimonio Neto (*Debt-to-Equity / D/E*)
$$D/E = \frac{\text{Pasivo Total}}{\text{Patrimonio Neto Contable}}$$
* **Variables Contables**:
  - $\text{Pasivo Total} = PC + \text{Pasivo No Circulante (deuda a largo plazo, provisiones)}$.
  - $\text{Patrimonio Neto} = \text{Fondos Propios (Capital social, reservas y beneficios acumulados no distribuidos)}$.
* **Interpretación Financiera**: Mide cuántos euros de financiación ajena sostienen cada euro aportado por los propietarios del negocio.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\le 1.00\times$)**: Estructura de capital conservadora; los activos son financiados mayoritariamente con capital propio.
  - 🟡 **Amarillo ($1.01\times - 2.00\times$)**: Apalancamiento moderado típico de industrias intensivas en capital.
  - 🔴 **Rojo ($> 2.00\times$ o Patrimonio Neto $\le 0$)**: Sobreendeudamiento peligroso; alta sensibilidad a la subida de tasas de interés.

#### B. Cobertura de Intereses (*Interest Coverage Ratio / TIE*)
$$\text{ICR} = \frac{\text{EBIT}}{\text{Gastos por Intereses Financieros}}$$
* **Variables Contables**:
  - $\text{EBIT}$: Beneficio antes de intereses e impuestos (*Earnings Before Interest and Taxes*), equivalente al beneficio operativo neto.
  - $\text{Gastos Financieros}$: Intereses devengados por deudas bancarias y emisión de bonos.
* **Interpretación Financiera**: Cuántas veces el resultado operativo de la empresa cubre la cuota periódica de intereses financieros exigible.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 5.00\times$ o Libre de Deuda)**: Holgura operativa excepcional; la deuda se amortiza sin fricciones.
  - 🟡 **Amarillo ($2.50\times - 4.99\times$)**: Cobertura moderada; vulnerable a recesiones cíclicas en ingresos operativos.
  - 🔴 **Rojo ($< 2.50\times$ o EBIT $\le 0$)**: Alerta de impago; el servicio de la deuda absorbe la mayor parte del flujo operativo.

---

### 1.3 Dimensión 3: Rentabilidad y Foso Económico (*Economic Moat*) ($w_{\text{Rentabilidad}} = 0.25$)

Mide la eficiencia en la asignación de capital y la presencia de ventajas competitivas duraderas (*Moat*, según Warren Buffett).

#### A. Rentabilidad sobre Recursos Propios (*Return on Equity / ROE*)
$$\text{ROE} = \frac{\text{Utilidad Neta}}{\text{Patrimonio Neto Contable}} \times 100\%$$
* **Descomposición Clásica DuPont (3 Factores)**:
  $$\text{ROE} = \left( \frac{\text{Utilidad Neta}}{\text{Ventas}} \right) \times \left( \frac{\text{Ventas}}{\text{Activos Totales}} \right) \times \left( \frac{\text{Activos Totales}}{\text{Patrimonio Neto}} \right)$$
  $$\text{ROE} = \text{Margen Neto} \times \text{Rotación de Activos} \times \text{Apalancamiento Financiero}$$
* **Interpretación Financiera**: Test definitivo de calidad empresarial. Permite discernir si el rendimiento proviene de pricing power (margen neto), excelencia operativa (rotación) o apalancamiento riesgoso.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 15.0\%$)**: Criterio de excelencia Warren Buffett. Refleja poder de fijación de precios y ventajas competitivas sostenidas.
  - 🟡 **Amarillo ($8.0\% - 14.9\%$)**: Rentabilidad media del mercado de acciones; negocio solvente pero sin diferenciación extrema.
  - 🔴 **Rojo ($< 8.0\%$ o negativo)**: Destrucción de valor para el accionista o pérdidas contables.

#### B. Rentabilidad sobre Activos Totales (*Return on Assets / ROA*)
$$\text{ROA} = \frac{\text{Utilidad Neta}}{\text{Activos Totales}} \times 100\%$$
* **Interpretación Financiera**: Mide la productividad neta de cada activo instalado en el balance, con independencia de cómo esté financiado.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 8.0\%$)**: Alta eficiencia en el uso de la infraestructura instalada.
  - 🟡 **Amarillo ($4.0\% - 7.9\%$)**: Rendimiento estándar en compañías de activos tangibles.
  - 🔴 **Rojo ($< 4.0\%$)**: Rendimiento deficiente o modelo intensivo en activos de baja rentabilidad.

---

### 1.4 Dimensión 4: Valoración Bursátil y Margen de Seguridad ($w_{\text{Valoración}} = 0.30$)

Determina si el precio de cotización en el mercado financiero ofrece un descuento razonable respecto a la capacidad generadora de beneficios y el patrimonio tangible de la compañía.

#### A. Beneficio por Acción (*Earnings Per Share / BPA o EPS*)
$$\text{BPA} = \frac{\text{Utilidad Neta}}{\text{Número Medio Ponderado de Acciones en Circulación}}$$
* **Interpretación Financiera**: Unidad fundamental de retorno por título para el inversor minorista.

#### B. Ratio Precio sobre Beneficio (*Price-to-Earnings Ratio / PER o P/E*)
$$\text{PER} = \frac{\text{Precio de Cotización por Acción}}{\text{BPA}} = \frac{\text{Capitalización Bursátil}}{\text{Utilidad Neta}}$$
* **Interpretación Financiera**: Número de años de beneficios constantes que el mercado está pagando por adelantado.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\le 18.0\times$ y BPA $> 0$)**: Zona de valor y descuento histórico según Benjamin Graham.
  - 🟡 **Amarillo ($18.1\times - 26.0\times$)**: Precio justo para compañías de calidad excepcional, con menor margen de error.
  - 🔴 **Rojo ($> 26.0\times$ o BPA $\le 0$)**: Valoración altamente exigente o empresa en pérdidas operativas.

#### C. Precio sobre Valor Contable (*Price-to-Book / P/B*)
$$P/B = \frac{\text{Capitalización Bursátil}}{\text{Patrimonio Neto}} = \frac{\text{Precio por Acción}}{\text{Valor Contable por Acción}}$$
* **Interpretación Financiera**: Compara el precio de mercado con el valor liquidativo contable de los recursos propios.
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\le 2.50\times$)**: Cobertura patrimonial tangible con bajo sobreprecio.
  - 🟡 **Amarillo ($2.51\times - 5.00\times$)**: Prima de valoración razonable si el ROE es superior al 15%.
  - 🔴 **Rojo ($> 5.00\times$)**: Prima especulativa basada casi exclusivamente en intangibles o expectativas de crecimiento distante.

#### D. Rendimiento por Dividendo (*Dividend Yield*)
$$\text{Dividend Yield} = \frac{\text{Dividendo Anual Efectivo por Acción}}{\text{Precio de Cotización por Acción}} \times 100\%$$
* **Umbrales de Calificación**:
  - 🟢 **Verde ($\ge 2.5\%$)**: Flujo de caja recurrente devuelto al inversor.
  - 🟡 **Amarillo ($1.0\% - 2.4\%$)**: Retorno moderado en efectivo; retención para reinversión.
  - 🔴 **Rojo ($< 1.0\%$ o $0\%$)**: Sin reparto o política puramente orientada a retención.

#### E. Margen de Seguridad (*Margin of Safety - MoS*)
$$\text{MoS} = \frac{V_{\text{intrínseco}} - P_{\text{mercado}}}{V_{\text{intrínseco}}} \times 100\%$$
* **Concepto Teórico Fundamental (Graham & Dodd, 1934)**: La distancia cuantitativa entre la estimación conservadora del valor intrínseco de un negocio y su precio de mercado actual. Es la protección indispensable frente a errores de cálculo, vicisitudes de la economía o cisnes negros.

---

## 2. El Modelo de Score Lineal Multidimensional $S(a)$: Ponderación y Regla de Decisión

### 2.1 Formulación Matemática del Modelo Aditivo

El sistema implementa un modelo de Teoría de Decisión Multicriterio basado en Utilidad Multiatributo (MAVT, Keeney & Raiffa, 1976), sintetizado en la función de valor aditiva ponderada:

$$S(a) = \sum_{k=1}^{K} w_k \cdot f_k(a)$$

Donde:
* $a$ representa la empresa evaluada.
* $K = 4$ corresponde a las cuatro dimensiones fundamentales: Liquidez, Solvencia, Rentabilidad y Valoración.
* $w_k$ son los pesos relativos normalizados, cumpliendo:
  $$\sum_{k=1}^{4} w_k = 1.00 \quad \text{donde} \quad w_1 = 0.20, \; w_2 = 0.25, \; w_3 = 0.25, \; w_4 = 0.30$$
* $f_k(a) \in [0, 100]$ es la función de puntuación subdimensional normalizada.

### 2.2 Funciones de Valor Subdimensionales $f_k(a)$

Cada dimensión $f_k(a)$ agrega sus respectivos ratios normalizados mediante heurísticas no lineales calibradas empíricamente:

#### 1. Dimensión de Liquidez ($f_1(a)$):
$$f_1(a) = 0.40 \cdot s_{\text{CR}} + 0.35 \cdot s_{\text{QR}} + 0.25 \cdot s_{\text{Cash}}$$
* $s_{\text{CR}} = \min\left(100, \max\left(0, \frac{\text{Current Ratio}}{2.00} \times 100\right)\right)$
* $s_{\text{QR}} = \min\left(100, \max\left(0, \frac{\text{Quick Ratio}}{1.00} \times 100\right)\right)$
* $s_{\text{Cash}} = \min\left(100, \max\left(0, \frac{\text{Cash Ratio}}{0.40} \times 100\right)\right)$

#### 2. Dimensión de Solvencia ($f_2(a)$):
$$f_2(a) = 0.55 \cdot s_{D/E} + 0.45 \cdot s_{\text{ICR}}$$
* $s_{D/E}$: Función escalonada de penalización por riesgo de quiebra:
  $$s_{D/E} = \begin{cases} 100 & \text{si } D/E \le 0.50 \\ 85 & \text{si } 0.50 < D/E \le 1.00 \\ 55 & \text{si } 1.00 < D/E \le 1.80 \\ 30 & \text{si } 1.80 < D/E \le 3.00 \\ 10 & \text{si } D/E > 3.00 \text{ o PN } \le 0 \end{cases}$$
* $s_{\text{ICR}} = \min\left(100, \max\left(0, \frac{\text{ICR}}{10.0} \times 100\right)\right)$ (con 100 para empresas desendeudadas).

#### 3. Dimensión de Rentabilidad y Moat ($f_3(a)$):
$$f_3(a) = 0.65 \cdot s_{\text{ROE}} + 0.35 \cdot s_{\text{ROA}}$$
* $s_{\text{ROE}} = \min\left(100, \max\left(0, \frac{\text{ROE}}{0.20} \times 100\right)\right)$
* $s_{\text{ROA}} = \min\left(100, \max\left(0, \frac{\text{ROA}}{0.12} \times 100\right)\right)$

#### 4. Dimensión de Valoración y Margen de Seguridad ($f_4(a)$):
$$f_4(a) = 0.50 \cdot s_{\text{PER}} + 0.30 \cdot s_{P/B} + 0.20 \cdot s_{\text{Yield}}$$
* $s_{\text{PER}}$ penaliza severamente el optimismo desmedido y las pérdidas operativas:
  $$s_{\text{PER}} = \begin{cases} 100 & \text{si } 0 < \text{PER} \le 12.0 \\ 85 & \text{si } 12.0 < \text{PER} \le 18.0 \\ 60 & \text{si } 18.0 < \text{PER} \le 25.0 \\ 35 & \text{si } 25.0 < \text{PER} \le 35.0 \\ 15 & \text{si } \text{PER} > 35.0 \text{ o Pérdidas} \end{cases}$$

---

### 2.3 ¿Cómo sabes si una empresa es BUENA o MALA? Criterio Determinístico y Detección de Trampas de Valor

El usuario que investiga o invierte necesita responder con certeza matemática y conceptual: ***¿Cómo sé si esta empresa es una buena o mala inversión?***

El modelo proporciona una regla de decisión estructurada en dos niveles: **Calificación Cardinal Global** y **Filtro de Veto No Compensatorio**.

```
                           EVALUACIÓN MULTIDIMENSIONAL S(a)
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
        ¿Tiene Pérdidas Operativas?                       ¿EBIT > 0 y Deuda
        o D/E > 3.0x sin cobertura?                       Manejable?
                 │                                                 │
                 ▼                                                 ▼
           VETO ESTRICTO                                  SCORE LINEAL S(a)
       "TRAMPA DE VALOR / MALA"                                    │
           (Grado D / F)                         ┌─────────┬───────┴─────────┬─────────┐
                                                 ▼         ▼                 ▼         ▼
                                                A+         A                 B         C
                                             [90-100]   [80-89]           [70-79]   [55-69]
                                            Excelente    Buena            Aceptable Vigilancia
```

#### A. Escala de Calificación Cardinal y Diagnóstico Financiero:

| Puntuación $S(a)$ | Grado | Veredicto Cualitativo | Diagnóstico Financiero Fundamental |
| :--- | :---: | :---: | :--- |
| **90 – 100 pts** | **A+** | **Excelente / Círculo de Honor Buffett** | Empresa extraordinaria. Balance desendeudado, foso defensivo invulnerable ($\text{ROE} \ge 18\%$), alta conversión de caja y cotización con margen de seguridad. Muy baja probabilidad de quiebra ($Z\text{-score} > 3.0$). |
| **80 – 89 pts** | **A** | **Muy Buena / Alta Calidad** | Empresa de primer nivel. Foso económico sólido, rentabilidad consistente ($\text{ROE} \ge 15\%$), solvencia impecable y múltiplos razonables. Idónea para inversión a largo plazo (ej. Berkshire Hathaway, Costco). |
| **70 – 79 pts** | **B** | **Aceptable / Calidad Media** | Empresa financieramente sana pero con ventajas competitivas moderadas o múltiplos de mercado justos sin descuento apreciable. Rinde a la par del mercado general (ej. Coca-Cola, Johnson & Johnson). |
| **55 – 69 pts** | **C** | **Mediocre / Vigilancia Requerida** | Empresa estándar con debilidades en al menos una dimensión (crecimiento plano, endeudamiento elevado o erosión de márgenes por competencia intensa). No ofrece margen de seguridad suficiente. |
| **40 – 54 pts** | **D** | **Deficiente / Riesgo Alto** | Deterioro evidente de fundamentales. Flujos de caja erráticos, cobertura de intereses precaria ($\text{ICR} < 2.5\times$) o rentabilidad sobre capital inferior al coste de la deuda ($\text{ROE} < \text{Coste de Fondos}$). |
| **0 – 39 pts** | **F** | **Mala / Trampa de Valor Especulativa** | Destrucción sistemática de capital. Pérdidas netas, EBIT negativo, quema acelerada de tesorería y probabilidad elevada de insolvencia técnica (ej. HypeTech). Cualquier precio pagado es pura especulación. |

#### B. La Regla de Veto No Compensatorio (*Non-Compensatory Heuristic*):
Uno de los errores más graves en la investigación financiera es asumir que un modelo puramente lineal permite que una "buena" valoración compense una solvencia en estado terminal.
* **El Fenómeno de la "Trampa de Valor" (*Value Trap*)**: Una empresa que cotiza a un PER bajo ($6\times$) parece estadísticamente "barata". Sin embargo, si su dimensión de Solvencia es roja ($D/E > 3.0$ y $\text{ICR} < 1.0$), los beneficios se esfumarán para atender a los acreedores o la empresa entrará en concurso de acreedores (Altman, 1968).
* **Solución Implementada**: La función `calculateLinearScore` penaliza las dimensiones críticas de forma exponencial: si la solvencia o el beneficio neto colapsan, los subscores de solvencia y valoración caen a cero o mínimos, imposibilitando que la empresa alcance una calificación superior a **C** o **D**, protegiendo al investigador y al inversor del sesgo de anclaje en múltiplos engañosos.

---

## 3. Teoría Moderna de Portafolios (MPT) y Lógica del Simulador de Markowitz

### 3.1 Formulación Matemática del Modelo de Media-Varianza (Harry Markowitz, 1952)

El modelo asume que un inversor racional toma decisiones exclusivamente sobre dos momentos estadísticos: el **Retorno Esperado** de la cartera (deseable) y su **Varianza o Volatilidad** (indeseable, medida de riesgo).

Sea un universo de $N$ activos financieros con:
* Vector de retornos esperados: $\mathbf{\mu} = \begin{bmatrix} E(R_1) \\ E(R_2) \\ \vdots \\ E(R_N) \end{bmatrix}$
* Vector de ponderaciones de la cartera: $\mathbf{w} = \begin{bmatrix} w_1 \\ w_2 \\ \vdots \\ w_N \end{bmatrix}$
* Matriz simétrica de varianza-covarianza: $\mathbf{\Sigma} \in \mathbb{R}^{N \times N}$ donde el elemento $\sigma_{ij}$ es:
  $$\sigma_{ij} = \text{Cov}(R_i, R_j) = \rho_{ij} \cdot \sigma_i \cdot \sigma_j$$

#### Métricas de la Cartera Global:
1. **Retorno Esperado de la Cartera ($E(R_p)$)**:
   $$E(R_p) = \mathbf{w}^T \mathbf{\mu} = \sum_{i=1}^{N} w_i \cdot E(R_i)$$
2. **Varianza de la Cartera ($\sigma_p^2$)**:
   $$\sigma_p^2 = \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} = \sum_{i=1}^{N} \sum_{j=1}^{N} w_i \cdot w_j \cdot \sigma_{ij}$$
3. **Volatilidad Anualizada de la Cartera ($\sigma_p$)**:
   $$\sigma_p = \sqrt{\sigma_p^2} = \sqrt{\sum_{i=1}^{N} w_i^2 \sigma_i^2 + \sum_{i=1}^{N} \sum_{j \neq i} w_i w_j \rho_{ij} \sigma_i \sigma_j}$$

---

### 3.2 La Demostración Matemática del "Almuerzo Gratis" (*Free Lunch*)

En economía clásica rige el aforismo: *"No existe tal cosa como un almuerzo gratis"*. Harry Markowitz demostró que **la diversificación con activos no perfectamente correlacionados es la única excepción**.

#### Teorema:
Si para al menos un par de activos con ponderación positiva ($w_i, w_j > 0$) el coeficiente de correlación de Pearson satisface $\rho_{ij} < 1$, entonces la volatilidad del portafolio es **estrictamente menor** que el promedio ponderado de las volatilidades individuales:

$$\sigma_p < \sum_{i=1}^{N} w_i \cdot \sigma_i$$

#### Cuantificación Cuantitativa del Beneficio en la Plataforma:
$$\text{Almuerzo Gratis (\% Riesgo Eliminado)} = \left( \frac{\sum_{i=1}^{N} w_i \cdot \sigma_i - \sigma_p}{\sum_{i=1}^{N} w_i \cdot \sigma_i} \right) \times 100\%$$

* **Consecuencia Teórica**: Se suprime el **riesgo no sistemático o idiosincrásico** de las empresas individuales sin sacrificar un solo punto porcentual de retorno esperado ponderado.

---

### 3.3 Problemas de Optimización Cuadrática

#### A. Cartera de Mínima Varianza Global (*Global Minimum Variance - GMV*):
$$\min_{\mathbf{w}} \frac{1}{2} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} \quad \text{sujeto a} \quad \mathbf{w}^T \mathbf{1} = 1, \quad w_i \ge 0 \quad (\text{sin posiciones cortas})$$

#### B. Frontera Eficiente de Markowitz:
El conjunto de carteras no dominadas que minimizan el riesgo para cada nivel objetivo de rentabilidad $\mu_0$:
$$\min_{\mathbf{w}} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} \quad \text{sujeto a} \quad \mathbf{w}^T \mathbf{\mu} = \mu_0, \quad \mathbf{w}^T \mathbf{1} = 1, \quad w_i \ge 0$$

#### C. Cartera Tangente y Ratio de Sharpe Máximo (Sharpe, 1964; Tobin, 1958):
Bajo la presencia de un activo libre de riesgo con rentabilidad $R_f$ (en la plataforma calibrado en Letras del Tesoro a $4.0\%$), la cartera óptima es aquella que maximiza la pendiente de la **Línea de Asignación de Capital (*Capital Allocation Line - CAL*)**:

$$\max_{\mathbf{w}} \text{SR}(\mathbf{w}) = \frac{\mathbf{w}^T \mathbf{\mu} - R_f}{\sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}} \quad \text{sujeto a} \quad \mathbf{w}^T \mathbf{1} = 1, \quad w_i \ge 0$$

---

### 3.4 Lógica Algorítmica del Simulador y Organización de Datos

El motor computacional de la plataforma (`src/utils/markowitz.ts` y `src/components/MarkowitzOptimizer.tsx`) opera mediante un flujo secuencial:

```
    CARTERA DEL USUARIO                          CATÁLOGO DE MERCADO
  (portfolio.holdings)                           (companies)
           │                                          │
           └──────────────────┬───────────────────────┘
                              ▼
                 SELECTOR DE UNIVERSO ACTIVO
            ["Mi Cartera Activa" | "Todo el Mercado" | "Filtro"]
                              │
                              ▼
               EXTRACCIÓN DE PERFILES VECTORIALES
                   [E(R_i), \sigma_i, Moat, Score]
                              │
                              ▼
           CONSTRUCCIÓN DE MATRIZ DE COVARIANZA \Sigma
                     (\sigma_ij = \rho_ij \sigma_i \sigma_j)
                              │
                              ▼
          MUESTREO MONTE CARLO EN SIMPLEX (DIRICHLET)
                     [300 carteras aleatorias uniformes]
                              │
                              ▼
           OPTIMIZACIÓN NUMÉRICA POR ASCENSO GRADIENTE
             [Cartera Tangente Máx Sharpe & GMV Mínima Varianza]
                              │
                              ▼
              DISCRETIZACIÓN ENVOLVENTE SUPERIOR
                 [Curva Frontera Eficiente en SVG]
                              │
                              ▼
            PROYECCIÓN DE LA CARTERA REAL DEL USUARIO
                 [Comparación directa de Eficiencia]
```

1. **Gestión Dinámica de Universos**:
   - **Modo "Mi Cartera Activa"**: Filtra las variables estrictamente a los activos que el usuario ha comprado en el simulador de trading.
     * Si el usuario posee $N \ge 2$ títulos comprados, el optimizador calcula la matriz $\mathbf{\Sigma}_{N \times N}$ de sus títulos y computa sus pesos reales de mercado:
       $$w_{i,\text{actual}} = \frac{\text{acciones}_i \times P_i}{\text{Valor Total Invertido}}$$
     * Proyecta el punto morado de la **Cartera Actual** en el gráfico SVG, permitiendo ver qué tan alejada está su combinación real respecto a su propia Frontera Eficiente de activos.
     * Ofrece un botón de **Rebalanceo Automático**: Con un solo clic, recalcula las órdenes necesarias para mover los pesos de su cartera real hacia la combinación matemática del **Máximo Sharpe**.
   - **Modo "Universo de Mercado"**: Permite analizar todas las empresas preconfiguradas y personalizadas para explorar la frontera global teórica.
   - **Modo "Personalizado"**: Permite activar o desactivar casillas de verificación para simular exclusión de activos problemáticos (ej. desmarcar HYPE).
2. **Generación de Pesos en el Simplex (Muestreo de Monte Carlo)**:
   Para garantizar una cobertura no sesgada del espacio de soluciones $\Delta^{N-1} = \{ \mathbf{w} \in \mathbb{R}^N : \sum w_i = 1, w_i \ge 0\}$, se generan variables aleatorias independientes $X_i \sim \text{Exp}(1)$ mediante inversión de probabilidad:
   $$X_i = -\ln(U_i), \quad U_i \sim \mathcal{U}(0, 1)$$
   Normalizadas a:
   $$w_i = \frac{X_i}{\sum_{j=1}^{N} X_j}$$
   lo que genera muestras distribuidas idénticamente según una distribución de Dirichlet uniforme sobre el simplex.
3. **Refinamiento por Gradiente Local No Lineal**:
   Partiendo de la mejor muestra del Monte Carlo, se ejecutan hasta 100 iteraciones de redistribución incremental de peso ($\Delta w = 0.03$) entre pares de activos para afinar la tangencia exacta con la CAL y el vértice de mínima varianza.

---

## 4. Referencias Teóricas y Bibliográficas Clave (Formato APA 7ma Edición)

1. **Altman, E. I. (1968)**. Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. *The Journal of Finance*, 23(4), 589–609. https://doi.org/10.1111/j.1540-6261.1968.tb00843.x
   *(Base teórica de la predicción de quiebra y la importancia de no sobreponderar múltiplos sobre solvencia)*.
2. **Damodaran, A. (2012)**. *Investment Valuation: Tools and Techniques for Determining the Value of Any Asset* (3rd ed.). John Wiley & Sons.
   *(Estructura de estimación de flujos de caja, coste de capital y múltiplos de valoración bursátil)*.
3. **Divay, P. (2024)**. *Gamified Financial Literacy Interventions and Behavioral Biases in Retail Investors*. Social Science Research Network (SSRN).
   *(Modelo econométrico conductual que fundamenta los pesos de gamificación del Módulo 3 y la reducción de sobreoperativa)*.
4. **Graham, B., & Dodd, D. L. (1934)**. *Security Analysis: Principles and Technique*. McGraw-Hill.
   *(Texto fundacional de la Inversión en Valor, formulación del Margen de Seguridad y benchmarks de liquidez corriente)*.
5. **Kahneman, D., & Tversky, A. (1979)**. Prospect theory: An analysis of decision under risk. *Econometrica*, 47(2), 263–291. https://doi.org/10.2307/1914185
   *(Teoría de las perspectivas y sesgos cognitivos evaluados en el sistema: aversión a la pérdida y sobreoperativa)*.
6. **Keeney, R. L., & Raiffa, H. (1976)**. *Decisions with Multiple Objectives: Preferences and Value Trade-Offs*. John Wiley & Sons.
   *(Axiomas matemáticos de la Teoría de Decisión Multiatributo que justifican la agregación lineal ponderada del Score $S(a)$)*.
7. **Markowitz, H. (1952)**. Portfolio selection. *The Journal of Finance*, 7(1), 77–91. https://doi.org/10.1111/j.1540-6261.1952.tb01525.x
   *(Publicación seminal de la Teoría Moderna de Portafolios, matriz de covarianza y demostración del beneficio de diversificación)*.
8. **Piotroski, J. D. (2000)**. Value investing: The use of historical financial statement information to separate winners from losers. *Journal of Accounting Research*, 38, 1–41. https://doi.org/10.2307/2491487
   *(Precedente directo del modelo de scoring contable fundamental para descartar trampas de valor en el mercado bursátil)*.
9. **Sharpe, W. F. (1964)**. Capital asset prices: A theory of market equilibrium under conditions of risk. *The Journal of Finance*, 19(3), 425–442. https://doi.org/10.1111/j.1540-6261.1964.tb02865.x
   *(Desarrollo de la Cartera Tangente, la medida de desempeño ajustada al riesgo o Ratio de Sharpe y el modelo CAPM)*.
10. **Tobin, J. (1958)**. Liquidity preference as behavior towards risk. *The Review of Economic Studies*, 25(2), 65–86. https://doi.org/10.2307/2296205
    *(Teorema de separación de fondos mutuos y la Línea de Asignación de Capital con activo libre de riesgo)*.
