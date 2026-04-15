import React, { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function CustomCursor() {
  const isMobile = useIsMobile();
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isMobile) return;
    // Keep native cursor visible so users know where they're clicking
    // Custom cursor is a decorative companion, not a replacement

    const cursor = cursorRef.current!;
    let mx = 0, my = 0, cx = 0, cy = 0, prevCx = 0, prevCy = 0;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMove);

    // Hover / label logic
    const onEnter = (e: Event) => {
      cursor.classList.add('hover');
      const target = e.currentTarget as HTMLElement;
      const label = target.dataset.cursorLabel;
      if (label && labelRef.current) labelRef.current.textContent = label;
    };
    const onLeave = () => {
      cursor.classList.remove('hover');
    };

    const hoverEls = document.querySelectorAll('[data-hover]');
    hoverEls.forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    let raf: number;
    const tick = () => {
      cx += (mx - cx) * 0.5;
      cy += (my - cy) * 0.5;

      const vx = cx - prevCx;
      const vy = cy - prevCy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      prevCx = cx;
      prevCy = cy;

      const stretch = Math.min(speed * 0.02, 0.25);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);

      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';

      if (!cursor.classList.contains('hover')) {
        cursor.style.transform = `translate(-50%,-50%) rotate(${angle}deg) scale(${1 + stretch},${1 - stretch * 0.3})`;
      } else {
        cursor.style.transform = 'translate(-50%,-50%)';
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      // cleanup
      document.removeEventListener('mousemove', onMove);
      hoverEls.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={cursorRef}
      id="cursor"
      style={{
        position: 'fixed',
        width: 20,
        height: 20,
        border: '2px solid var(--black)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.06)',
        transition: 'width .25s, height .25s, border-color .25s, background .25s',
      }}
    >
      <span
        ref={labelRef}
        className="cursor-label"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--white)',
          opacity: 0,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          transition: 'opacity .2s',
        }}
      />
      <style>{`
        #cursor.hover {
          width: 52px !important;
          height: 52px !important;
          background: var(--accent) !important;
          border-color: var(--accent) !important;
        }
        #cursor.hover .cursor-label { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
