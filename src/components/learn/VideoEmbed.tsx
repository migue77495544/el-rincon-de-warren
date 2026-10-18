import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { VideoRef } from '../../data/rutaAprendizaje';

/**
 * Video de YouTube que solo carga el reproductor al pulsarlo: la página no descarga
 * ~1 MB de YouTube por cada video de la lista, y no se envían cookies hasta reproducir.
 */
export const VideoEmbed: React.FC<{ video: VideoRef; autoplay?: boolean }> = ({ video, autoplay = false }) => {
  const [activo, setActivo] = useState(autoplay);
  if (activo) {
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&autoplay=1&hl=es&cc_lang_pref=es`}
          title={`${video.titulo} (${video.canal})`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setActivo(true)}
      className="group relative block w-full aspect-video bg-slate-900 overflow-hidden"
      aria-label={`Reproducir «${video.titulo}», de ${video.canal}, ${video.duracion}`}
    >
      <img
        src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <Play className="w-7 h-7 text-slate-900 ml-1" fill="currentColor" aria-hidden="true" />
        </span>
      </span>
      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-xs font-medium text-white tabular">{video.duracion}</span>
    </button>
  );
};
