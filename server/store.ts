// Almacén clave-valor persistente.
// En Netlify usa Netlify Blobs (sobrevive entre invocaciones e instancias de la función);
// en local guarda JSON en .data/ para que el servidor de desarrollo se comporte igual.
import fs from 'fs';
import path from 'path';

type BlobStore = {
  get: (key: string, opts: { type: 'json' }) => Promise<any>;
  setJSON: (key: string, value: unknown) => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
};

const STORE_NAME = 'rincon-warren';
const LOCAL_DIR = path.resolve(process.cwd(), '.data');

let blobStorePromise: Promise<BlobStore | null> | null = null;

function onNetlify(): boolean {
  // WARREN_ON_NETLIFY lo fija la función de Netlify tras connectLambda()
  return Boolean(process.env.WARREN_ON_NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
}

async function getBlobStore(): Promise<BlobStore | null> {
  if (!onNetlify()) return null;
  if (!blobStorePromise) {
    blobStorePromise = import('@netlify/blobs')
      .then(mod => mod.getStore({ name: STORE_NAME, consistency: 'strong' }) as unknown as BlobStore)
      .catch(err => {
        console.warn('[Store] Netlify Blobs no disponible, se usa memoria:', err?.message || err);
        return null;
      });
  }
  return blobStorePromise;
}

/** Permite reintentar la conexión con Blobs en la siguiente invocación (tras connectLambda) */
export function resetStoreConnection(): void {
  blobStorePromise = null;
}

const fileKey = (key: string) => path.join(LOCAL_DIR, `${key.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`);

export async function readJSON<T = any>(key: string): Promise<T | null> {
  const store = await getBlobStore();
  if (store) {
    try {
      return (await store.get(key, { type: 'json' })) ?? null;
    } catch (err: any) {
      console.warn(`[Store] Lectura fallida de ${key}:`, err?.message || err);
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(fileKey(key), 'utf-8'));
  } catch {
    return null;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  const store = await getBlobStore();
  if (store) {
    try {
      await store.setJSON(key, value);
    } catch (err: any) {
      console.warn(`[Store] Escritura fallida de ${key}:`, err?.message || err);
    }
    return;
  }
  try {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(fileKey(key), JSON.stringify(value));
  } catch (err: any) {
    console.warn(`[Store] No se pudo guardar ${key} en disco:`, err?.message || err);
  }
}

// ---------------------------------------------------------------
// Caché de dos niveles: memoria de la instancia + almacén persistente.
// Nunca se guardan respuestas fallidas; las peticiones simultáneas comparten carga.
// ---------------------------------------------------------------
const memory = new Map<string, { expires: number; data: any }>();
const inflight = new Map<string, Promise<any>>();

type Entry<T> = { savedAt: number; data: T };

export function isOk(data: any): boolean {
  return Boolean(data) && data.success !== false && !data.error && data.status !== 'error';
}

export async function cachedPersistent<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  { persist = true, accept = isOk }: { persist?: boolean; accept?: (d: T) => boolean } = {}
): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    if (persist) {
      const stored = await readJSON<Entry<T>>(`cache/${key}`);
      if (stored && Date.now() - stored.savedAt < ttlMs) {
        memory.set(key, { expires: stored.savedAt + ttlMs, data: stored.data });
        return stored.data;
      }
    }
    const data = await loader();
    if (accept(data)) {
      memory.set(key, { expires: Date.now() + ttlMs, data });
      if (persist) await writeJSON(`cache/${key}`, { savedAt: Date.now(), data });
    }
    return data;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/** Último valor guardado aunque haya caducado (degradación cuando la fuente falla) */
export async function readStale<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (hit) return hit.data;
  const stored = await readJSON<Entry<T>>(`cache/${key}`);
  return stored?.data ?? null;
}

export function memoryCached<T>(key: string, ttlMs: number, loader: () => Promise<T>, accept = isOk): Promise<T> {
  return cachedPersistent(key, ttlMs, loader, { persist: false, accept: accept as any });
}
