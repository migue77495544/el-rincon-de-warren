import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { EDUCATIONAL_VIDEOS } from '../../data/gamificationData';

interface VideoLessonsSectionProps {
  onAddXP?: (amount: number) => void;
}

export const VideoLessonsSection: React.FC<VideoLessonsSectionProps> = ({ onAddXP }) => {
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string>('vid-1');

  const currentVideo = EDUCATIONAL_VIDEOS.find(v => v.id === activeVideoId) || EDUCATIONAL_VIDEOS[0];

  const handleMarkVideoWatched = (vidId: string, xpReward: number) => {
    if (!completedVideos.includes(vidId)) {
      setCompletedVideos([...completedVideos, vidId]);
      if (onAddXP) onAddXP(xpReward);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reproductor de Video Activo */}
        <div className="lg:col-span-8 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                Video Lección Activa · {currentVideo.duration}
              </span>
              <h3 className="text-lg font-bold text-white font-serif mt-0.5">
                {currentVideo.title}
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
              {currentVideo.instructor}
            </span>
          </div>

          {/* Contenedor del Reproductor de Video */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 relative shadow-2xl">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?rel=0&modestbranding=1`}
              title={currentVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Conceptos Clave y Resumen */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Conceptos evaluados:</span>
              {currentVideo.concepts.map((c, i) => (
                <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {c}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
              {currentVideo.summary}
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Recompensa por asimilar el concepto: <strong className="text-emerald-400">+{currentVideo.xpReward} XP</strong>
              </span>
              <button
                onClick={() => handleMarkVideoWatched(currentVideo.id, currentVideo.xpReward)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  completedVideos.includes(currentVideo.id)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{completedVideos.includes(currentVideo.id) ? 'Lección Asimilada (+50 XP Ganados)' : 'Marcar Lección como Completada'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Reproducción Lateral */}
        <div className="lg:col-span-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 font-mono">
            Catálogo de Lecciones en Video ({EDUCATIONAL_VIDEOS.length})
          </h4>
          <div className="space-y-2">
            {EDUCATIONAL_VIDEOS.map(v => {
              const isPlaying = v.id === activeVideoId;
              const isDone = completedVideos.includes(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => setActiveVideoId(v.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isPlaying
                      ? 'bg-slate-900 border-white/20 shadow-md'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500">{v.duration}</span>
                    {isDone && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Visto
                      </span>
                    )}
                  </div>
                  <h5 className={`text-xs font-bold mt-1 ${isPlaying ? 'text-white' : 'text-slate-200'}`}>
                    {v.title}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {v.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
