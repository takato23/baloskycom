import React, { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function FilmGrain() {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Mobile uses CSS grain via index.css, desktop uses canvas
    if (isMobile) return;

    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    let w: number, h: number;

    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let raf: number;
    const draw = () => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [isMobile]);

  if (isMobile) {
    // CSS-based grain for mobile (lightweight)
    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 9990, pointerEvents: 'none',
          opacity: 0.03,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: '-50%', left: '-50%',
            width: '200%', height: '200%',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
          }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 9990, pointerEvents: 'none',
        opacity: 0.035, mixBlendMode: 'multiply',
      }}
    />
  );
}
