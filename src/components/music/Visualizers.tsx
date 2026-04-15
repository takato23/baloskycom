import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

export type VisualizerType = 'bars' | 'waveform' | 'radial' | 'ascii';

type CanvasVisualizerProps = { className?: string };

/* ─── BARS: frequency-driven vertical bars ─── */
function BarsVisualizer({ className }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqArray = new Uint8Array(analyser?.frequencyBinCount ?? 128);
    let raf = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.parentElement.offsetWidth * dpr;
      canvas.height = canvas.parentElement.offsetHeight * dpr;
      canvas.style.width = canvas.parentElement.offsetWidth + 'px';
      canvas.style.height = canvas.parentElement.offsetHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqArray);
      } else {
        const t = Date.now() * 0.0015;
        for (let i = 0; i < freqArray.length; i++) {
          freqArray[i] = (Math.sin(i * 0.3 + t) * 0.5 + 0.5) * 60;
        }
      }

      const bars = 48;
      const step = Math.floor(freqArray.length / bars);
      const barW = w / bars;

      for (let i = 0; i < bars; i++) {
        const v = freqArray[i * step] / 255;
        const barH = v * h * 0.85;
        const x = i * barW + 1;
        const bw = barW - 2;
        ctx.fillStyle = `rgba(250, 93, 41, ${0.4 + v * 0.6})`;
        ctx.fillRect(x, h - barH, bw, barH);
        ctx.fillStyle = `rgba(255, 140, 80, ${0.8 + v * 0.2})`;
        ctx.fillRect(x, h - barH - 2, bw, 2);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className={className ?? 'w-full h-full'} />;
}

/* ─── WAVEFORM: oscilloscope line from time-domain ─── */
function WaveformVisualizer({ className }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timeArray = new Uint8Array(analyser?.fftSize ?? 2048);
    let raf = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.parentElement.offsetWidth * dpr;
      canvas.height = canvas.parentElement.offsetHeight * dpr;
      canvas.style.width = canvas.parentElement.offsetWidth + 'px';
      canvas.style.height = canvas.parentElement.offsetHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteTimeDomainData(timeArray);
      } else {
        const t = Date.now() * 0.002;
        for (let i = 0; i < timeArray.length; i++) {
          timeArray[i] = 128 + Math.sin(i * 0.04 + t) * 20;
        }
      }

      // 3 stacked wave copies with offset for depth
      for (let layer = 0; layer < 3; layer++) {
        ctx.strokeStyle = `rgba(250, 93, 41, ${0.35 + layer * 0.25})`;
        ctx.lineWidth = 1 + layer;
        ctx.beginPath();
        const slice = w / timeArray.length;
        for (let i = 0; i < timeArray.length; i++) {
          const v = (timeArray[i] - 128) / 128;
          const x = i * slice;
          const y = h / 2 + v * (h * 0.4) + layer * 6;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Center axis
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className={className ?? 'w-full h-full'} />;
}

/* ─── RADIAL: circular bars radiating from center ─── */
function RadialVisualizer({ className }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqArray = new Uint8Array(analyser?.frequencyBinCount ?? 128);
    let raf = 0;
    let rot = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.parentElement.offsetWidth * dpr;
      canvas.height = canvas.parentElement.offsetHeight * dpr;
      canvas.style.width = canvas.parentElement.offsetWidth + 'px';
      canvas.style.height = canvas.parentElement.offsetHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqArray);
      } else {
        const t = Date.now() * 0.0015;
        for (let i = 0; i < freqArray.length; i++) {
          freqArray[i] = (Math.sin(i * 0.2 + t) * 0.5 + 0.5) * 80;
        }
      }

      const cx = w / 2;
      const cy = h / 2;
      const innerR = Math.min(w, h) * 0.16;
      const maxBarLen = Math.min(w, h) * 0.32;
      const bars = 96;
      const step = Math.floor(freqArray.length / bars);

      rot += isPlaying ? 0.003 : 0.001;

      // inner ring
      ctx.strokeStyle = 'rgba(250,93,41,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 4, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < bars; i++) {
        const v = freqArray[i * step] / 255;
        const len = v * maxBarLen;
        const angle = (i / bars) * Math.PI * 2 + rot;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + len);
        const y2 = cy + Math.sin(angle) * (innerR + len);
        ctx.strokeStyle = `rgba(250, 93, 41, ${0.35 + v * 0.65})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className={className ?? 'w-full h-full'} />;
}

/* ─── ASCII: monospace grid driven by frequency amplitude (Monavon vibe) ─── */
function AsciiVisualizer({ className }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyser, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqArray = new Uint8Array(analyser?.frequencyBinCount ?? 128);
    const chars = ' .:-=+*#%@';
    let raf = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.parentElement.offsetWidth * dpr;
      canvas.height = canvas.parentElement.offsetHeight * dpr;
      canvas.style.width = canvas.parentElement.offsetWidth + 'px';
      canvas.style.height = canvas.parentElement.offsetHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqArray);
      } else {
        const t = Date.now() * 0.0012;
        for (let i = 0; i < freqArray.length; i++) {
          freqArray[i] = (Math.sin(i * 0.35 + t) * 0.5 + 0.5) * 60;
        }
      }

      const fontSize = Math.max(10, Math.min(w, h) / 40);
      const cellW = fontSize * 0.6;
      const cellH = fontSize;
      const cols = Math.floor(w / cellW);
      const rows = Math.floor(h / cellH);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'top';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Map cell to freq bin — x for frequency, y for amplitude threshold
          const binIdx = Math.floor((x / cols) * freqArray.length);
          const v = freqArray[binIdx] / 255;
          // Higher rows respond to lower amplitudes, bottom rows to higher
          const threshold = 1 - y / rows;
          const intensity = Math.max(0, v - threshold + 0.4);
          if (intensity < 0.05) continue;
          const charIdx = Math.min(
            chars.length - 1,
            Math.floor(intensity * chars.length)
          );
          const ch = chars[charIdx];
          const alpha = Math.min(1, intensity * 1.4);
          ctx.fillStyle = `rgba(250, 93, 41, ${alpha})`;
          ctx.fillText(ch, x * cellW, y * cellH);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className={className ?? 'w-full h-full'} />;
}

const VISUALIZERS: Record<VisualizerType, { label: string; Component: (p: CanvasVisualizerProps) => ReactElement }> = {
  bars: { label: 'Barras', Component: BarsVisualizer },
  waveform: { label: 'Onda', Component: WaveformVisualizer },
  radial: { label: 'Radial', Component: RadialVisualizer },
  ascii: { label: 'ASCII', Component: AsciiVisualizer },
};

export function VisualizerPicker({ active, onChange }: { active: VisualizerType; onChange: (v: VisualizerType) => void }) {
  const types: VisualizerType[] = ['bars', 'waveform', 'radial', 'ascii'];
  return (
    <div className="flex gap-1 flex-wrap">
      {types.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={
            'px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase border transition-colors ' +
            (active === t
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-white/15 text-white/60 hover:border-white/40')
          }
        >
          {String(i + 1).padStart(2, '0')} {VISUALIZERS[t].label}
        </button>
      ))}
    </div>
  );
}

export function Visualizer({ type, className }: { type: VisualizerType; className?: string }) {
  const { Component } = VISUALIZERS[type];
  return <Component className={className} />;
}

export function useVisualizerCycle(initial: VisualizerType = 'bars') {
  const [type, setType] = useState<VisualizerType>(initial);
  return { type, setType };
}
