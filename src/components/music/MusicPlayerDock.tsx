import React from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

export default function MusicPlayerDock({ hidden }: { hidden?: boolean }) {
  const {
    currentTrack,
    activeCategory,
    isPlaying,
    playPause,
    nextTrack,
    previousTrack,
    playlist,
  } = useMusicPlayer();

  if (hidden || !currentTrack) return null;

  return (
    <div className="music-dock fixed right-4 z-50 w-[min(92vw,340px)] bottom-[calc(env(safe-area-inset-bottom,0px)+78px)] sm:bottom-4 rounded-2xl border border-white/12 bg-[#111111]/92 p-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{currentTrack.title}</p>
          <p className="truncate text-xs text-white/60">
            {currentTrack.artist} · {activeCategory}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={previousTrack}
            disabled={playlist.length < 2}
            className="rounded-xl border border-white/14 px-2 py-2 disabled:opacity-40"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void playPause()}
            className="rounded-xl border border-[#00FF00] bg-[#00FF00] px-3 py-2 text-black"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={nextTrack}
            disabled={playlist.length < 2}
            className="rounded-xl border border-white/14 px-2 py-2 disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
