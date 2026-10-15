// Servidor local: API de server/app.ts + frontend (Vite en desarrollo, dist/ en producción).
// En Netlify no se usa: allí la API corre como función (netlify/functions/api.mts) y el frontend es estático.
import 'dotenv/config';
import path from 'path';
import express from 'express';
import { app } from './server/app';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`[El Rincón de Warren] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
