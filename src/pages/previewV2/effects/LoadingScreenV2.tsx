/**
 * LoadingScreenV2 — entrada teatral para /preview-v2.
 *
 * Adaptado de src/components/effects/LoadingScreen.tsx al paleta chocolate
 * cálida de v2: fondo bgDeep (#0A0605), "BALOSKY" en text (#F5EDE4),
 * cortina que se divide en dos hacia los costados (cubic-bezier dramático).
 *
 * Timing heredado del original para que se sienta "familiar":
 *   0 → 1700ms : ASCII dissolve del logotipo
 *   1700 → 2500ms : curtain split
 *   2500ms : unmount
 *
 * Se monta una sola vez por sesión (sessionStorage flag). Si el visitante
 * refresca recupera el punto del despertar donde lo dejó y puede saltearse
 * la intro — es parte del "recuerda que ya estuvimos acá" del sitio.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TOKENS } from '../tokens';

const FLAG = 'balosky:v2:loaded';

export default function LoadingScreenV2({
  onDone,
  force = false,
}: {
  onDone?: () => void;
  /** Si true, ignora el flag de sesión y vuelve a mostrar la intro. */
  force?: boolean;
}) {
  // Durante desarrollo/iteración queremos ver la intro cada vez que refrescamos
  // para poder juzgar el efecto. El gating por sesión lo volvemos a activar
  // más adelante, cuando cerremos el look. Para saltearla en dev, agregar
  // ?skipIntro=1 a la URL.
  const [visible, setVisible] = useState(() => {
    if (force) return true;
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('skipIntro') === '1') return false;
    } catch { /* noop */ }
    return true;
  });
  const [splitting, setSplitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.min(window.innerWidth, 1200);
    const h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const text = 'BALOSKY';
    const fontSize = Math.min(96, window.innerWidth * 0.16);
    // Instrument Serif italic para match con el hero de v2.
    ctx.font = `400 italic ${fontSize}px "Instrument Serif", Georgia, serif`;
    ctx.fillStyle = TOKENS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const step = 3 * dpr;
    const ramp = ' .:-=+*#%@';
    const pts: Array<{
      x: number; y: number; char: string;
      delay: number; vx: number; vy: number;
      alpha: number; dissolved: boolean; dissolveStart: number;
    }> = [];

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const i = (y * canvas.width + x) * 4;
        if (imgData.data[i + 3] > 128) {
          pts.push({
            x: x / dpr, y: y / dpr,
            char: ramp[Math.floor(Math.random() * ramp.length)],
            delay: 400 + Math.random() * 1000,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            alpha: 1, dissolved: false, dissolveStart: 0,
          });
        }
      }
    }

    const start = performance.now();
    let raf = 0;
    const animate = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${(step / dpr) * 1.2}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const p of pts) {
        if (elapsed > p.delay && !p.dissolved) {
          p.dissolved = true;
          p.dissolveStart = elapsed;
        }
        if (p.dissolved) {
          const dt = (elapsed - p.dissolveStart) / 600;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, 1 - dt);
          p.char = ramp[Math.floor(Math.random() * ramp.length)];
          if (p.alpha <= 0) continue;
        }
        ctx.fillStyle = `rgba(245,237,228,${p.alpha})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      if (elapsed < 1700) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);

    const splitTimer = window.setTimeout(() => setSplitting(true), 1700);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(FLAG, '1'); } catch { /* noop */ }
      onDone?.();
    }, 2500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(splitTimer);
      clearTimeout(hideTimer);
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: TOKENS.bgDeep,
      pointerEvents: splitting ? 'none' : 'all',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
        background: TOKENS.bgDeep, zIndex: 2,
        transform: splitting ? 'translateX(-105%)' : 'translateX(0)',
        transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
        background: TOKENS.bgDeep, zIndex: 2,
        transform: splitting ? 'translateX(105%)' : 'translateX(0)',
        transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
      {/* hairline rim para que la cortina no sea pura negrura plana */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, rgba(255,226,204,0.08) 0%, transparent 55%)`,
        zIndex: 1, pointerEvents: 'none',
      }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 1 }} />
    </div>
  );
}
