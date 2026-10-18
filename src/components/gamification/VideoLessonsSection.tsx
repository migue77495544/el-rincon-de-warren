import React, { useState } from 'react';
import { Check, CheckCircle2, PlayCircle } from 'lucide-react';
import { RUTA, Leccion } from '../../data/rutaAprendizaje';
import { VideoEmbed } from '../learn/VideoEmbed';
import { guardarProgreso, leerProgreso, marcarVideo, Progreso } from '../../utils/progresoAprendizaje';

const XP_VIDEO = 15;

interface VideoLessonsSectionProps {
  onAddXP?: (amount: number) => void;
}

/** Academia: un video recomendado por lección, ordenados como un curso de cero a avanzado */
export const VideoLessonsSection: React.FC<VideoLessonsSectionProps> = ({ onAddXP }) => {
  const [progreso, setProgreso] = useState<Progreso>(() => leerProgreso());
  const todas = RUTA.flatMap(u => u.lecciones);
  const primeraSinVer = todas.find(l => !progreso.videosVistos.includes(l.video.youtubeId)) ?? todas[0];
  const [actual, setActual] = useState<Leccion>(primeraSinVer);
  const [reproductorKey, setReproductorKey] = useState(0);

  const visto = (l: Leccion) => progreso.videosVistos.includes(l.video.youtubeId);
  const numero = (l: Leccion) => todas.indexOf(l) + 1;

  const marcarVisto = () => {
    if (visto(actual)) return;
    const p = marcarVideo(progreso, actual.video.youtubeId, XP_VIDEO);
    setProgreso(p);
    guardarProgreso(p);
    onAddXP?.(XP_VIDEO);
  };

  const elegir = (l: Leccion) => {
    setActual(l);
    setReproductorKey(k => k + 1);
    document.getElementById('reproductor-academia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const vistos = todas.filter(visto).length;

  return (
    <div className="space-y-8">
      {/* Reproductor */}
      <section id="reproductor-academia" aria-labelledby="video-actual" className="rounded-2xl bg-white border border-slate-200 overflow-hidden scroll-mt-28">
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <VideoEmbed key={reproductorKey} video={actual.video} autoplay={reproductorKey > 0} />
          <div className="p-5 sm:p-6 flex flex-col gap-3">
            <p className="m-0 text-sm font-medium text-amber-800">Video {numero(actual)} de {todas.length} · {actual.video.duracion}</p>
            <h2 id="video-actual" className="m-0 font-serif text-xl sm:text-2xl leading-snug font-semibold text-slate-900">{actual.video.titulo}</h2>
            <p className="m-0 text-sm text-slate-600">De {actual.video.canal}. Acompaña a la lección «{actual.titulo}».</p>
            <p className="m-0 text-[15px] text-slate-700 leading-relaxed">{actual.idea[0]}</p>
            <div className="mt-auto pt-2">
              <button
                type="button"
                onClick={marcarVisto}
                disabled={visto(actual)}
                className={`h-11 px-5 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  visto(actual) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-700 text-white hover:bg-amber-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {visto(actual) ? 'Visto' : `Ya lo vi (+${XP_VIDEO} XP)`}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-serif text-xl font-semibold text-slate-900">Todos los videos, en orden</h2>
        <span className="text-sm text-slate-600 tabular">{vistos} de {todas.length} vistos</span>
      </div>

      {RUTA.map(u => (
        <section key={u.id} aria-labelledby={`academia-${u.id}`} className="space-y-3">
          <h3 id={`academia-${u.id}`} className="m-0 text-[15px] font-semibold text-slate-900">
            <span className="text-amber-800">Unidad {u.numero}.</span> {u.titulo}
          </h3>
          <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {u.lecciones.map(l => {
              const esActual = l.id === actual.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => elegir(l)}
                    aria-current={esActual ? 'true' : undefined}
                    className={`w-full h-full text-left flex gap-3 p-3 rounded-xl border bg-white transition-colors ${
                      esActual ? 'border-amber-700 ring-2 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="relative w-28 shrink-0 aspect-video rounded-lg overflow-hidden bg-slate-200">
                      <img src={`https://i.ytimg.com/vi/${l.video.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-xs font-medium text-white tabular">{l.video.duracion}</span>
                      {visto(l) && (
                        <span className="absolute inset-0 bg-emerald-900/50 flex items-center justify-center" aria-hidden="true">
                          <Check className="w-6 h-6 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{numero(l)}. {l.video.titulo}</span>
                      <span className="block mt-1 text-xs text-slate-600">{l.video.canal}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                        {visto(l) ? <><Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> Visto</> : <><PlayCircle className="w-3.5 h-3.5" aria-hidden="true" /> Sin ver</>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="m-0 text-xs text-slate-500">
        Los videos son de sus autores y se reproducen desde YouTube. Los elegimos por su claridad para quien empieza; no son recomendaciones de inversión.
      </p>
    </div>
  );
};
