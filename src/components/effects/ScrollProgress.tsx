import React, { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export default function ScrollProgress() {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isMobile || reducedMotion) return;

    const update = () => {
      rafRef.current = null;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, reducedMotion]);

  if (isMobile || reducedMotion) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed', top: 0, left: 0,
          width: `${progress}%`, height: 2,
          background: 'var(--accent)',
          zIndex: 10000, pointerEvents: 'none',
        }}
      />
      <div
        className="hidden sm:block"
        style={{
          position: 'fixed', bottom: 24, right: 72,
          fontSize: 12, fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          zIndex: 9998, pointerEvents: 'none',
          mixBlendMode: 'difference',
        }}
      >
        {Math.round(progress)}%
      </div>
    </>
  );
}
