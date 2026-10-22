// Servidor local: API de server/app.ts + frontend (Vite en desarrollo, dist/ en producción).
// En Netlify no se usa: allí la API corre como función (netlify/functions/api.mts) y el frontend es estático.
import 'dotenv/config';
import os from 'os';
import path from 'path';
import express from 'express';
import { app } from './server/app';

const PORT = Number(process.env.PORT) || 3000;
// `--prod` (npm start / npm run movil) sirve dist/ compilado y comprimido: en el celular carga
// unos pocos archivos en lugar de los miles de módulos sueltos que sirve Vite en desarrollo
const PRODUCTION = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

/** Direcciones de la red local (Wi-Fi/Ethernet) para abrir la app desde el celular. */
function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i!.address);
}

async function startServer() {
  if (!PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: { ignored: ['**/python/**', '**/.data/**', '**/cache/**', '**/*.csv', '**/*.xls*', '**/*.log', '**/scratch/**'] }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Los recursos con hash se cachean un año; index.html siempre se revalida
    app.use(express.static(distPath, {
      setHeaders: (res, file) => {
        res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
    }));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[El Rincón de Warren] Servidor ejecutándose en http://localhost:${PORT} (${PRODUCTION ? 'producción' : 'desarrollo'})`);
    for (const ip of lanAddresses()) console.log(`  Desde el celular (misma Wi-Fi): http://${ip}:${PORT}`);
    if (!PRODUCTION) console.log('  En el celular el modo desarrollo va lento: usa "npm run movil" para la versión rápida.');
  });
}

startServer();
