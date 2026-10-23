# Cómo escribir un guion de podcast de estudio

El oyente no puede volver la vista atrás ni ver una fórmula. Todo lo que no se entienda al primer oído se pierde.

## Papeles

- **PROFESOR**: domina el tema, explica con calma, usa ejemplos y analogías. Nunca suelta un monólogo de más de 5 o 6 frases seguidas.
- **ESTUDIANTE**: hace las preguntas que haría un alumno real, comete los errores típicos (y el profesor los corrige), pide ejemplos y resume con sus palabras. Es el sustituto del oyente: si algo es difícil, el estudiante lo pregunta.

## Estructura de un episodio

1. **Gancho (30 s)**: por qué importa este tema o una pregunta intrigante.
2. **Mapa (30 s)**: "Hoy vamos a ver tres cosas: …". Si es parte de una serie, recuerda en dos frases lo anterior.
3. **Bloques** (uno por concepto del mapa de contenido), cada uno con:
   - idea en una frase,
   - explicación,
   - ejemplo concreto (numérico si el tema lo permite, con números redondos),
   - error típico o confusión frecuente,
   - mini resumen del estudiante.
4. **Repaso activo**: 3 a 5 preguntas tipo examen. Tras cada pregunta, el profesor dice "piénsalo un momento" antes de responder (el oyente puede pausar).
5. **Cierre (1 min)**: las 3 ideas que hay que recordar sí o sí y qué viene en el siguiente episodio.

## Reglas para el oído

- Frases cortas. Una idea por frase.
- **Fórmulas en palabras**: no "WACC = E/V·Re + D/V·Rd·(1−t)", sino "el WACC es la media ponderada del coste del capital propio y del coste de la deuda después de impuestos; el peso de cada uno es lo que representa en la financiación total". Después, un ejemplo con números.
- **Siglas**: la primera vez, nombre completo y sigla ("el coste medio ponderado del capital, el WACC").
- **Números**: redondeados y legibles. "Un ocho por ciento", "unos tres millones". Evita decimales largos y tablas de cifras.
- Nada de referencias visuales ("como se ve en la gráfica"). Describe la idea de la gráfica en palabras.
- Repetición estratégica: lo importante se dice al menos dos veces con palabras distintas.
- Texto plano. Sin Markdown, viñetas, paréntesis largos ni emojis. Las acotaciones de tono no se escriben en el turno (el motor las leería).
- Español neutro y cercano; tutea al oyente.

## Fidelidad

- La fuente manda. Definiciones, cifras, fórmulas y clasificaciones salen de los apuntes, con la terminología del profesor de la asignatura.
- Lo añadido de fuera se dice como tal en el diálogo.
- Si la fuente es confusa o contradictoria, el profesor lo menciona ("en tus apuntes aparece de dos maneras; la habitual es…") y se anota como punto a revisar.
- No inventes preguntas de examen "que caerán": son preguntas de práctica.

## Longitud

≈ 150 palabras por minuto. Comprueba el total con `wc -w guion.txt` antes de generar el audio y ajusta si te desvías más de un 15 % de la duración pedida.

## Ejemplo de tono

```
# Tema 4 · El coste del capital
PROFESOR: Imagina que vas a abrir una panadería y necesitas cien mil euros. Parte la pones tú y parte te la presta el banco. La pregunta de hoy es sencilla: ¿cuánto te cuesta, de verdad, ese dinero?
ESTUDIANTE: Pues lo que me cobre el banco, ¿no?
PROFESOR: Esa es la trampa en la que cae casi todo el mundo. El banco te cobra intereses, sí, pero tu propio dinero también tiene un coste, aunque no te llegue ninguna factura.
```
