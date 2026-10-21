// Cliente de Gemini con cadena de modelos de respaldo (equivale a GeminiClient de finance_engine.py)
import { GoogleGenAI } from '@google/genai';
import { log } from './util';

// Va primero el más rápido: la función de Netlify tiene un tope de 60 s por petición
export const MODELOS_ASESORES = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

let cliente: GoogleGenAI | null | undefined;

function apiKeyValida(): string {
  const key = process.env.GEMINI_API_KEY || '';
  return key.startsWith('AIza') || key.startsWith('AQ.') ? key : '';
}

export function geminiDisponible(): boolean {
  return Boolean(apiKeyValida());
}

// Gemini rechaza plazos de servidor inferiores a 10 s
const PLAZO_MINIMO_MS = 10000;

function getCliente(): GoogleGenAI | null {
  const key = apiKeyValida();
  if (!key) return null;
  if (cliente === undefined) cliente = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 25000 } });
  return cliente;
}

/** Turno previo de una conversación (para que el asesor recuerde lo ya hablado) */
export interface TurnoChat {
  rol: 'usuario' | 'asesor';
  texto: string;
}

export interface OpcionesGenerar {
  systemInstruction?: string;
  historial?: TurnoChat[];
  temperature?: number;
  maxOutputTokens?: number;
  modelos?: string[];
  responseMimeType?: string;
  /** Presupuesto total para recorrer la cadena de modelos */
  presupuestoMs?: number;
  timeoutPorModeloMs?: number;
}

/** Devuelve el texto del primer modelo que responda; cadena vacía si ninguno lo hace a tiempo */
export async function generar(mensaje: string, opciones: OpcionesGenerar = {}): Promise<string> {
  const {
    systemInstruction,
    historial = [],
    temperature = 0.25,
    maxOutputTokens = 4096,
    modelos = MODELOS_ASESORES,
    responseMimeType,
    presupuestoMs = 40000,
    timeoutPorModeloMs = 20000
  } = opciones;
  const ai = getCliente();
  if (!ai) return '';

  const contents = historial.length
    ? [
        ...historial.map(h => ({ role: h.rol === 'usuario' ? 'user' : 'model', parts: [{ text: h.texto }] })),
        { role: 'user', parts: [{ text: mensaje }] }
      ]
    : mensaje;

  const limite = Date.now() + presupuestoMs;
  for (const modelo of modelos) {
    const restante = limite - Date.now();
    if (restante < PLAZO_MINIMO_MS) break;
    try {
      const response = await ai.models.generateContent({
        model: modelo,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          temperature,
          maxOutputTokens,
          ...(responseMimeType ? { responseMimeType } : {}),
          abortSignal: AbortSignal.timeout(Math.max(PLAZO_MINIMO_MS, Math.min(timeoutPorModeloMs, restante)))
        }
      });
      const texto = (response.text || '').trim();
      if (texto) return texto;
    } catch (err: any) {
      log(`[GEMINI ERROR] model=${modelo} ${String(err?.message || err).slice(0, 200)}`);
      // Clave rechazada: no tiene sentido probar el resto de modelos
      if (/API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(String(err?.message))) break;
    }
  }
  return '';
}
