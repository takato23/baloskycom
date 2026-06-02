/**
 * ScrollProgressV2 — línea horizontal arriba del viewport marcando
 * progreso de scroll. Versión con paleta chocolate cálida (accent
 * F07A3E en lugar del FA5D29 del sitio principal).
 *
 * Siempre activa en v2 (no se gatea por mobile como en el sitio original:
 * en v2 la barrita es parte de la identidad del sitio y se ve bien en mobile
 * también). Respeta prefers-reduced-motion: si el visitante pidió calma,
 * no la mostramos.
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { TOKENS } from '../tokens';

export default function ScrollProgressV2() {
  const reducedMotion = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

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
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0,
        width: `${progress}%`, height: 2,
        background: `linear-gradient(90deg, ${TOKENS.accentDeep}, ${TOKENS.accent})`,
        zIndex: 10000, pointerEvents: 'none',
        boxShadow: `0 0 14px ${TOKENS.accent}aa`,
      }}
    />
  );
}
