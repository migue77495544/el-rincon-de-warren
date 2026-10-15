# El Rincón de Warren

Plataforma educativa de inversión en valor para pequeños inversores: análisis fundamental con datos en vivo, asesores con IA (fundamental y técnico), simulador de carteras de Markowitz, escáner de oportunidades del S&P 500, gamificación y evaluación de impacto.

## Ejecutar en local

Requisitos: Node.js 22 o superior.

1. `npm install`
2. Copia `.env.example` como `.env` y pon tu `GEMINI_API_KEY`.
3. `npm run dev` y abre http://localhost:3000

## Publicar

La app se despliega en Netlify (frontend estático + API como función serverless, sin Python). Instrucciones paso a paso en [DESPLIEGUE_NETLIFY.md](DESPLIEGUE_NETLIFY.md).

## Documentación

- [DOCUMENTACION_TECNICA_Y_METODOLOGICA.md](DOCUMENTACION_TECNICA_Y_METODOLOGICA.md): fórmulas, scoring y metodología financiera.
- [CLAUDE.md](CLAUDE.md): arquitectura y reglas de código.
