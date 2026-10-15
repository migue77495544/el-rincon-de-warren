# Despliegue en Netlify

La aplicación ya no necesita Python ni un servidor propio. Netlify publica el frontend como sitio estático y ejecuta toda la API (`/api/*`) como una función serverless. Los datos de Yahoo Finance, Damodaran y FRED siguen siendo en vivo, y Gemini responde a los asesores desde la función.

## Lo único que tienes que configurar

| Variable | Dónde | Para qué |
|---|---|---|
| `GEMINI_API_KEY` | Netlify → *Project configuration* → *Environment variables* | Asesores Jairo y Guillermo, patrones técnicos y clasificación sectorial. Sin ella la app funciona, pero los asesores usan el motor local. |

No hace falta crear ninguna base de datos: el catálogo, las tesis y las cachés se guardan en **Netlify Blobs**, que se activa solo.

## Opción A: arrastrar el ZIP (la más sencilla)

1. Entra en [app.netlify.com](https://app.netlify.com) con tu cuenta (tiene que ser con la sesión iniciada: así Netlify compila el proyecto).
2. En *Projects*, baja hasta la zona «Drag and drop» y arrastra el archivo `el-rincon-de-warren-netlify.zip`, o la carpeta descomprimida.
3. Espera a que termine la compilación (1-2 minutos). Netlify instala dependencias, ejecuta `npm run build:netlify` y empaqueta la función `api`.
4. Añade `GEMINI_API_KEY` en las variables de entorno y vuelve a desplegar (*Deploys* → *Trigger deploy*).

Para publicar cambios más adelante, arrastra la carpeta actualizada a la zona de despliegue de la pestaña *Deploys* del mismo proyecto.

## Opción B: GitHub (recomendada si vas a seguir desarrollando)

1. Sube el proyecto a un repositorio de GitHub.
2. En Netlify: *Add new project* → *Import an existing project* → elige el repositorio.
3. Netlify lee `netlify.toml` y no hay que tocar nada más: comando `npm run build:netlify`, carpeta `dist`, funciones en `netlify/functions`.
4. Añade `GEMINI_API_KEY` y despliega. Cada `git push` publica una versión nueva.

## Opción C: línea de comandos

```bash
npm install
npx netlify-cli deploy --build --prod
```

## Cómo comprobar que funciona

- `https://TU-SITIO.netlify.app/api/market/status` debe responder `"status":"online"`.
- `https://TU-SITIO.netlify.app/api/market/quote/AAPL` debe devolver la cotización del día.
- En la app, la cabecera del modo Analista muestra la tasa libre de riesgo real del día (no 4,0 %).

## Límites que conviene conocer

- Cada petición a la API dura como máximo 60 s en Netlify. La app está ajustada para responder antes: los asesores tardan entre 10 y 30 s.
- El escáner de Superoportunidades analiza ~180 empresas por tandas: la primera vez tarda unos 2-3 minutos mientras la pantalla muestra el progreso. Después el resultado queda guardado 24 h.
- Yahoo Finance puede limitar peticiones desde los servidores de Netlify en momentos de mucho uso. La app reintenta y, si no hay datos, muestra el último resultado guardado; nunca inventa cifras.

## Desarrollo en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La clave de Gemini va en un archivo `.env` (ver `.env.example`). Los datos persistentes se guardan en `.data/`.
