import React, { useEffect, useRef, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [splitting, setSplitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.min(window.innerWidth, 1200);
    const h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const text = 'BALOSKY';
    const fontSize = Math.min(90, window.innerWidth * 0.18);
    ctx.font = `900 ${fontSize}px "Inter Tight", sans-serif`;
    ctx.fillStyle = '#fff';
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
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${step / dpr * 1.2}px monospace`;
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
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      if (elapsed < 1700) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);

    const splitTimer = setTimeout(() => setSplitting(true), 1700);
    const hideTimer = setTimeout(() => setVisible(false), 2500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(splitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000', pointerEvents: splitting ? 'none' : 'all',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
        background: '#000', zIndex: 2,
        transform: splitting ? 'translateX(-105%)' : 'translateX(0)',
        transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
        background: '#000', zIndex: 2,
        transform: splitting ? 'translateX(105%)' : 'translateX(0)',
        transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
      }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 1 }} />
    </div>
  );
}
