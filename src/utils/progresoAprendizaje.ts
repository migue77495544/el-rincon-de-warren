// Progreso de la ruta de aprendizaje, guardado en el navegador del usuario.
import { NODOS, RUTA, TODAS_LAS_LECCIONES } from '../data/rutaAprendizaje';

const CLAVE = 'warren_ruta_v1';

export interface Progreso {
  completados: string[];
  /** Lecciones terminadas sin ningún fallo */
  perfectas: string[];
  videosVistos: string[];
  xp: number;
  racha: number;
  /** Último día con actividad (AAAA-MM-DD, hora local) */
  ultimoDia: string | null;
}

const VACIO: Progreso = { completados: [], perfectas: [], videosVistos: [], xp: 0, racha: 0, ultimoDia: null };

const hoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function leerProgreso(): Progreso {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return { ...VACIO };
    const p = { ...VACIO, ...JSON.parse(raw) } as Progreso;
    // La racha se rompe si pasó más de un día sin actividad
    if (p.ultimoDia) {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      if (p.ultimoDia !== hoy() && p.ultimoDia !== hoy(ayer)) p.racha = 0;
    }
    return p;
  } catch {
    return { ...VACIO };
  }
}

export function guardarProgreso(p: Progreso): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado): el progreso vive solo en esta sesión
  }
}

/** Suma actividad del día: la racha crece una vez por día */
function marcarActividad(p: Progreso): Progreso {
  const d = hoy();
  if (p.ultimoDia === d) return p;
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const racha = p.ultimoDia === hoy(ayer) ? p.racha + 1 : 1;
  return { ...p, racha, ultimoDia: d };
}

export function completarNodo(p: Progreso, id: string, xp: number, perfecta = false): Progreso {
  const base = marcarActividad(p);
  return {
    ...base,
    completados: base.completados.includes(id) ? base.completados : [...base.completados, id],
    perfectas: perfecta && !base.perfectas.includes(id) ? [...base.perfectas, id] : base.perfectas,
    xp: base.xp + xp
  };
}

export function marcarVideo(p: Progreso, youtubeId: string, xp: number): Progreso {
  if (p.videosVistos.includes(youtubeId)) return p;
  const base = marcarActividad(p);
  return { ...base, videosVistos: [...base.videosVistos, youtubeId], xp: base.xp + xp };
}

/** Un nodo se puede abrir si es el primero o si el anterior está completado */
export function desbloqueado(p: Progreso, id: string): boolean {
  const i = NODOS.findIndex(n => n.id === id);
  return i <= 0 || p.completados.includes(NODOS[i - 1].id);
}

export function siguienteNodo(p: Progreso) {
  return NODOS.find(n => !p.completados.includes(n.id)) ?? null;
}

export interface Logro {
  id: string;
  titulo: string;
  descripcion: string;
  actual: number;
  meta: number;
}

export function calcularLogros(p: Progreso): Logro[] {
  const lecciones = TODAS_LAS_LECCIONES.filter(l => p.completados.includes(l.id)).length;
  const retos = NODOS.filter(n => n.tipo === 'reto' && p.completados.includes(n.id)).length;
  const totalRetos = NODOS.filter(n => n.tipo === 'reto').length;
  const unidad1 = RUTA[0].lecciones.filter(l => p.completados.includes(l.id)).length;
  return [
    { id: 'primer-paso', titulo: 'Primer paso', descripcion: 'Termina tu primera lección', actual: Math.min(lecciones, 1), meta: 1 },
    { id: 'base', titulo: 'Sabes qué es invertir', descripcion: 'Completa la unidad 1', actual: unidad1, meta: RUTA[0].lecciones.length },
    { id: 'sin-fallos', titulo: 'Sin un fallo', descripcion: 'Termina una lección sin errores', actual: Math.min(p.perfectas.length, 1), meta: 1 },
    { id: 'constancia', titulo: 'Constancia', descripcion: 'Aprende 3 días seguidos', actual: Math.min(p.racha, 3), meta: 3 },
    { id: 'curioso', titulo: 'Curioso', descripcion: 'Mira 5 videos de la academia', actual: Math.min(p.videosVistos.length, 5), meta: 5 },
    { id: 'retador', titulo: 'Retador', descripcion: 'Supera todos los retos', actual: retos, meta: totalRetos },
    { id: 'inversor-value', titulo: 'Inversor value', descripcion: 'Completa toda la ruta', actual: lecciones, meta: TODAS_LAS_LECCIONES.length }
  ];
}

/** Racha que tendrá el usuario si hoy completa algo (para mostrarla al terminar una lección) */
export function rachaConActividadHoy(p: Progreso): number {
  return marcarActividad(p).racha;
}
