import { Router, Request, Response } from 'express';
import { runPythonEngineWithEnv } from '../services/pythonEngine.js';
import { getCompaniesDB } from './market.js';
import {
  generateDualAdvisorConsultation,
  generateJairoOnlyResponse,
  generateGuillermoOnlyResponse,
  identifyCompany
} from '../utils/dualAdvisorEngine.js';

const router = Router();

router.post('/python/consulta-dual', async (req: Request, res: Response) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, getCompaniesDB() as any);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  try {
    const args = ['consulta-dual', pregunta, ...(ticker ? [ticker] : [])];
    const data = await runPythonEngineWithEnv(args, { GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' });

    if (data && data.success && data.respuesta_jairo && data.respuesta_guillermo) {
      const modeloNegocio = data.modeloNegocio || (data.modelo_negocio ? {
        queHace: data.modelo_negocio.que_hace || data.modelo_negocio.queHace,
        comoGanaDinero: data.modelo_negocio.como_gana_dinero || data.modelo_negocio.comoGanaDinero,
        sector: data.modelo_negocio.sector
      } : undefined);

      const isGeminiLive = !!process.env.GEMINI_API_KEY &&
        !data.respuesta_jairo.includes('Recordemos que esta visión es pedagógica') &&
        !data.respuesta_guillermo.includes('¡Vámonos a la parte que a mí me apasiona');

      return res.json({
        ...data,
        modeloNegocio,
        source: isGeminiLive ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaDual] Subproceso Python no respondió a tiempo o falló, activando motor analítico nativo:', err.message);
  }

  try {
    const localResult = generateDualAdvisorConsultation(pregunta, ticker, getCompaniesDB() as any);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaDual] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

router.post('/python/consulta-jairo', async (req: Request, res: Response) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, getCompaniesDB() as any);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  try {
    const args = ['consulta-jairo', pregunta, ...(ticker ? [ticker] : [])];
    const data = await runPythonEngineWithEnv(args, { GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' });

    if (data && data.success && data.respuesta) {
      const isGeminiLive = !!process.env.GEMINI_API_KEY &&
        !data.respuesta.includes('Recordemos que esta visión es pedagógica');
      return res.json({
        ...data,
        source: isGeminiLive ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaJairo] Subproceso Python no respondió, usando motor analítico local:', err.message);
  }

  try {
    const localResult = generateJairoOnlyResponse(pregunta, ticker, getCompaniesDB() as any);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaJairo] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

router.post('/python/consulta-guillermo', async (req: Request, res: Response) => {
  const pregunta: string = (req.body?.pregunta || '').trim();
  let ticker: string = (req.body?.ticker || '').trim();

  if (!pregunta) {
    return res.status(400).json({ success: false, error: 'Pregunta no proporcionada' });
  }

  if (!ticker) {
    const matched = identifyCompany(pregunta, undefined, getCompaniesDB() as any);
    if (matched?.ticker) {
      ticker = matched.ticker;
    }
  }

  try {
    const args = ['consulta-guillermo', pregunta, ...(ticker ? [ticker] : [])];
    const data = await runPythonEngineWithEnv(args, { GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' });

    if (data && data.success && data.respuesta) {
      const isGeminiLive = !!process.env.GEMINI_API_KEY &&
        !data.respuesta.includes('¡Vámonos a la parte que a mí me apasiona');
      return res.json({
        ...data,
        source: isGeminiLive ? 'gemini-live' : 'motor-analitico'
      });
    }
  } catch (err: any) {
    console.warn('[ConsultaGuillermo] Subproceso Python no respondió, usando motor analítico local:', err.message);
  }

  try {
    const localResult = generateGuillermoOnlyResponse(pregunta, ticker, getCompaniesDB() as any);
    return res.json({
      ...localResult,
      source: 'motor-analitico'
    });
  } catch (fallbackErr: any) {
    console.error('[ConsultaGuillermo] Error en motor analítico local:', fallbackErr);
    return res.status(500).json({ success: false, error: fallbackErr.message || 'Error al procesar la consulta' });
  }
});

export default router;