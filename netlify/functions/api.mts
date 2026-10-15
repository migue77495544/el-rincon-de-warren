// Función de Netlify que sirve toda la API /api/* con la misma app Express del servidor local.
import serverless from 'serverless-http';
import { connectLambda } from '@netlify/blobs';
import { app } from '../../server/app';
import { resetStoreConnection } from '../../server/store';

const handlerExpress = serverless(app, { binary: ['image/*'] });

export const handler = async (event: any, context: any) => {
  // Credenciales de Netlify Blobs para esta invocación (persistencia del catálogo, tesis y cachés)
  try {
    connectLambda(event);
    process.env.WARREN_ON_NETLIFY = '1';
    resetStoreConnection();
  } catch (err: any) {
    console.warn('[Blobs] Sin contexto de Netlify Blobs:', err?.message || err);
  }
  return handlerExpress(event, context);
};
