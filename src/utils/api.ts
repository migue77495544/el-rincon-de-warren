// Cliente HTTP del frontend: timeout, y errores del backend ({ error: true, message }) como excepciones legibles.

export const TIMEOUT_MESSAGE = 'Tiempo de espera agotado al consultar la fuente financiera. Reintenta la búsqueda.';
const NETWORK_MESSAGE = 'No hay conexión con el servidor. Revisa tu conexión y reintenta.';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Mensaje para mostrar al usuario a partir de cualquier error capturado. */
export function errorMessage(err: unknown, fallback = 'Ocurrió un error al consultar los datos. Reintenta.'): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * fetch + JSON con límite de tiempo. Lanza ApiError si el servidor responde con error
 * (HTTP no 2xx o `success: false`), si se agota el tiempo o si no hay red.
 * El timeout del cliente es algo mayor que el del servidor (25 s datos / 45 s asesores).
 */
export async function fetchJson<T = any>(url: string, init: RequestInit = {}, timeoutMs = 35000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new ApiError(TIMEOUT_MESSAGE, 504);
    throw new ApiError(NETWORK_MESSAGE);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Respuesta sin JSON (p. ej. página de error del proxy)
  }

  if (!res.ok || body?.success === false || body?.error === true) {
    const message =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.error === 'string' && body.error) ||
      (res.status === 504 ? TIMEOUT_MESSAGE : `El servidor respondió con un error (HTTP ${res.status}). Reintenta.`);
    throw new ApiError(message, res.status);
  }
  // 200 sin JSON: el servidor no conoce la ruta y responde con la página de la SPA
  // (típico de un `npm run dev` arrancado antes de añadir el endpoint)
  if (body === null) {
    throw new ApiError('El servidor no reconoce esta función. Reinicia el servidor (npm run dev) y vuelve a intentarlo.', res.status);
  }
  return body as T;
}

/** POST JSON con fetchJson. */
export function postJson<T = any>(url: string, payload: unknown, timeoutMs?: number): Promise<T> {
  return fetchJson<T>(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    timeoutMs
  );
}
