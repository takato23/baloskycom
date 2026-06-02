import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AudioLines,
  Disc3,
  Orbit,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeMusicContent } from '@/types';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

type VisualizationMode = 'spectrum' | 'scope' | 'orbit';

interface HomeMusicSectionProps {
  content?: HomeMusicContent;
}

const styles = {
  section: 'border-y border-[var(--black)]/10 bg-[var(--black)] text-[var(--white)]',
  container: 'max-w-7xl mx-auto px-4 py-14 sm:px-6',
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]/70',
  title: 'mt-3 text-4xl font-bold leading-none tracking-[-0.04em]',
  shell: 'grid gap-4',
  panel: 'rounded-2xl border border-[var(--white)]/10 bg-[var(--white)]/5 p-5 backdrop-blur-md',
  pill: 'rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]',
  trackButton: 'rounded-2xl border border-[var(--white)]/10 bg-[var(--white)]/5 p-4 text-left backdrop-blur transition-colors hover:bg-[var(--white)]/10',
  trackButtonActive: 'bg-[var(--accent)]/20 text-[var(--white)] border-[var(--accent)]/40',
  primaryButton: 'rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--white)] transition-colors hover:opacity-90',
  secondaryButton: 'rounded-2xl border border-[var(--white)]/10 bg-[var(--white)]/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--white)] backdrop-blur transition-colors hover:bg-[var(--white)]/10',
  input: 'h-2 w-full accent-[var(--accent)]',
  accent: '#FF6600',
  accentAlt: '#FF9933',
  neutral: '#FFFFFF',
  canvasBackground: 'rgba(255,102,0,0.06)',
  canvasGrid: 'rgba(255,102,0,0.10)',
};

const VISUALIZATION_MODES: Array<{
  id: VisualizationMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'spectrum', label: 'Pulse', icon: AudioLines },
  { id: 'scope', label: 'Scope', icon: Waves },
  { id: 'orbit', label: 'Orbit', icon: Orbit },
];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  if (expanded.length !== 6) return `rgba(255,255,255,${alpha})`;
  const value = parseInt(expanded, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function HomeMusicSection({
  content,
}: HomeMusicSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    categories,
    activeCategory,
    setActiveCategory,
    playlist,
    currentTrack,
    selectTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    statusMessage,
    playPause,
    nextTrack,
    previousTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    analyser,
    frequencyData,
    timeDomainData,
  } = useMusicPlayer();
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>('spectrum');

  const accentColor = currentTrack?.accentColor || styles.accent;
  const accentGlow = hexToRgba(accentColor, 0.22);
  const accentGlowStrong = hexToRgba(accentColor, 0.48);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width === Math.floor(width * dpr) && canvas.height === Math.floor(height * dpr)) {
      return;
    }

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  const drawVisualizer = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;

      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, hexToRgba(accentColor, 0.09));
      background.addColorStop(1, styles.canvasBackground);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = styles.canvasGrid;
      context.lineWidth = 1;
      for (let row = 1; row < 5; row += 1) {
        const y = (height / 5) * row;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const freq =
        frequencyData && analyser ? frequencyData : new Uint8Array(96);
      const wave =
        timeDomainData && analyser ? timeDomainData : new Uint8Array(256);

      if (analyser && frequencyData && timeDomainData) {
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(wave);
      } else {
        for (let index = 0; index < freq.length; index += 1) {
          freq[index] =
            32 +
            Math.sin(time / 320 + index * 0.34) * 18 +
            Math.cos(time / 700 + index * 0.19) * 12;
        }
        for (let index = 0; index < wave.length; index += 1) {
          wave[index] =
            128 +
            Math.sin(time / 180 + index * 0.16) * 74 +
            Math.cos(time / 340 + index * 0.08) * 24;
        }
      }

      if (visualizationMode === 'scope') {
        context.beginPath();
        context.lineWidth = 3;
        context.strokeStyle = hexToRgba(accentColor, 0.95);
        for (let index = 0; index < wave.length; index += 1) {
          const amplitude = wave[index] / 255;
          const x = (index / (wave.length - 1)) * width;
          const y = height * 0.5 + (amplitude - 0.5) * height * 0.75;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
        return;
      }

      if (visualizationMode === 'orbit') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.18;
        for (let ring = 0; ring < 4; ring += 1) {
          context.beginPath();
          context.lineWidth = 1;
          context.strokeStyle = hexToRgba(accentColor, 0.12 + ring * 0.08);
          context.arc(centerX, centerY, baseRadius + ring * 18, 0, Math.PI * 2);
          context.stroke();
        }
        const spikes = 72;
        for (let index = 0; index < spikes; index += 1) {
          const sourceIndex = Math.floor((index / spikes) * freq.length);
          const normalized = freq[sourceIndex] / 255;
          const angle = (index / spikes) * Math.PI * 2 + time / 1800;
          const innerRadius = baseRadius + Math.sin(time / 700 + index * 0.12) * 8;
          const outerRadius = innerRadius + 12 + normalized * Math.min(width, height) * 0.22;
          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * outerRadius;
          const y2 = centerY + Math.sin(angle) * outerRadius;
          context.beginPath();
          context.lineWidth = 2;
          context.strokeStyle =
            index % 2 === 0
              ? hexToRgba(accentColor, 0.92)
              : hexToRgba(styles.accentAlt, 0.46);
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.stroke();
        }
        return;
      }

      const barCount = width < 420 ? 24 : 40;
      const barGap = width < 420 ? 3 : 4;
      const barWidth = Math.max((width - barGap * (barCount - 1)) / barCount, 3);

      for (let index = 0; index < barCount; index += 1) {
        const start = Math.floor((index / barCount) * freq.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * freq.length));
        let sliceTotal = 0;
        for (let cursor = start; cursor < end; cursor += 1) {
          sliceTotal += freq[cursor];
        }
        const magnitude = sliceTotal / (end - start);
        const normalized = magnitude / 255;
        const pulse = 0.14 + Math.sin(time / 420 + index * 0.35) * 0.04;
        const barHeight = Math.max(16, (normalized + pulse) * height * 0.82);
        const x = index * (barWidth + barGap);
        const y = height - barHeight;
        const barGradient = context.createLinearGradient(0, y, 0, height);
        barGradient.addColorStop(0, hexToRgba(accentColor, 0.94));
        barGradient.addColorStop(1, hexToRgba(styles.accentAlt, 0.28));
        context.fillStyle = barGradient;
        context.fillRect(x, y, barWidth, barHeight);
      }
    },
    [accentColor, analyser, frequencyData, timeDomainData, visualizationMode]
  );

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    const observer =
      wrapper && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => resizeCanvas())
        : null;
    if (wrapper && observer) observer.observe(wrapper);

    let frame = 0;
    const render = (time: number) => {
      drawVisualizer(time);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      if (observer) observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [drawVisualizer, resizeCanvas]);

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(event.target.value));
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVolumeLevel(Number(event.target.value));
  };

  return (
    <section id="music" className={cn('scroll-mt-28', styles.section)}>
      <div className={styles.container}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {content?.eyebrow ? <p className={styles.eyebrow}>{content.eyebrow}</p> : null}
            <h2 className={styles.title}>{content?.title}</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.length ? (
              categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    styles.pill,
                    'shrink-0 transition-colors',
                    activeCategory === category && 'ring-2 ring-offset-0'
                  )}
                  style={
                    activeCategory === category
                      ? {
                          background: hexToRgba(accentColor, 0.18),
                          borderColor: hexToRgba(accentColor, 0.62),
                          color: accentColor,
                        }
                      : undefined
                  }
                >
                  {category}
                </button>
              ))
            ) : (
              <span className={styles.pill}>Sin categorias</span>
            )}
          </div>
        </div>

        <div className={styles.shell}>
          <div className={styles.panel}>
            <div
              className={cn(
                'grid gap-4 lg:items-start',
                playlist.length ? 'lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)]' : 'grid-cols-1'
              )}
            >
              <div className="grid gap-4">
                <div
                  className="overflow-hidden rounded-[1.35rem] border"
                  style={{
                    borderColor: hexToRgba(styles.neutral, 0.16),
                    backgroundImage: `radial-gradient(circle at top left, ${accentGlowStrong}, transparent 58%), linear-gradient(135deg, ${hexToRgba(
                      styles.accentAlt,
                      0.3
                    )}, ${hexToRgba(accentColor, 0.12)})`,
                    boxShadow: `0 22px 60px ${accentGlow}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: hexToRgba(styles.neutral, 0.14) }}>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold">
                        {currentTrack?.title || 'Pronto, nueva música'}
                      </p>
                      <p className="truncate text-sm opacity-75">
                        {currentTrack?.artist || 'Balosky'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={styles.pill}>{activeCategory}</span>
                      <Disc3 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: accentColor }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm opacity-75">
                      <AudioLines className="h-4 w-4" style={{ color: accentColor }} />
                      <span>Visualizer</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                      {VISUALIZATION_MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setVisualizationMode(mode.id)}
                            className={cn(
                              styles.pill,
                              'shrink-0 transition-colors',
                              visualizationMode === mode.id && 'ring-2 ring-offset-0'
                            )}
                            style={
                              visualizationMode === mode.id
                                ? {
                                    background: hexToRgba(accentColor, 0.18),
                                    borderColor: hexToRgba(accentColor, 0.62),
                                    color: accentColor,
                                  }
                                : undefined
                            }
                          >
                            <span className="inline-flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {mode.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-60 sm:h-72">
                    <canvas ref={canvasRef} className="h-full w-full" />
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="opacity-75">{currentTrack ? currentTrack.artist : 'Sin track'}</span>
                    <span className="opacity-55">{playlist.length} temas</span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={previousTrack}
                      disabled={playlist.length < 2}
                      className={cn(
                        styles.secondaryButton,
                        playlist.length < 2 && 'cursor-not-allowed opacity-45'
                      )}
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void playPause()}
                      className={cn('justify-center', styles.primaryButton)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={nextTrack}
                      disabled={playlist.length < 2}
                      className={cn(
                        styles.secondaryButton,
                        playlist.length < 2 && 'cursor-not-allowed opacity-45'
                      )}
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 1}
                      value={Math.min(currentTime, duration > 0 ? duration : 1)}
                      onChange={handleSeek}
                      className={styles.input}
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={styles.secondaryButton}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className={styles.input}
                    />
                  </div>

                  <p className="mt-5 text-xs opacity-55">{statusMessage}</p>
                </div>
              </div>

              {playlist.length ? (
                <div className="grid gap-3 content-start">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">Playlist</p>
                    <span className={styles.pill}>{playlist.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {playlist.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => selectTrack(track.id)}
                        className={cn(
                          styles.trackButton,
                          track.id === currentTrack?.id && styles.trackButtonActive
                        )}
                      >
                        <p className="text-base font-semibold">{track.title}</p>
                        <p className="mt-1 text-sm opacity-75">{track.artist}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {!playlist.length ? (
            <div className={cn(styles.panel, 'max-w-xl')}>
              No hay temas publicados en {activeCategory}.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
