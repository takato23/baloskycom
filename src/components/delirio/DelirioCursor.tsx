import { useEffect, useRef } from 'react';

/**
 * Port of the custom cursor from delirio.html (curDot / curRing / curLbl).
 *
 * Renders three fixed elements that follow the pointer:
 *   - `cur-ring`  — a magenta outline circle that lags slightly behind
 *   - `cur-dot`   — a tiny solid dot pinned to the pointer
 *   - `cur-lbl`   — a pill label that shows `data-cursor` content on hover
 *
 * The component self-disables on coarse pointers (touch devices) so mobile
 * users get their native tap UI. CSS in `src/styles/delirio.css` owns the
 * visuals (`.cur-dot`, `.cur-ring`, `.cur-lbl`, `body.cur-over`,
 * `body.cur-has-label`) — this file just drives the positions and the
 * hover-target tracking.
 *
 * Matches the "mousemove + cached target" logic from the static home,
 * which avoids the mouseover/mouseout flicker that was making hover state
 * strobe inside nested elements.
 */
export default function DelirioCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const lblRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Skip on touch / coarse-pointer devices entirely.
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const lbl = lblRef.current;
    if (!dot || !ring || !lbl) return;

    const HOVER_SEL = '[data-cursor], a, button, .chap, .tier, .card, .rail-card';

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let curTarget: Element | null = null;
    let raf = 0;

    const updateHoverFrom = (el: EventTarget | null) => {
      const node = el instanceof Element ? el : null;
      const withLabel = node?.closest('[data-cursor]') ?? null;
      const interactive = node?.closest(HOVER_SEL) ?? null;
      const t = withLabel ?? interactive;
      if (t === curTarget) return;
      curTarget = t;
      if (t) {
        document.body.classList.add('cur-over');
        const L = t.getAttribute('data-cursor');
        if (L) {
          lbl.textContent = L;
          document.body.classList.add('cur-has-label');
        } else {
          document.body.classList.remove('cur-has-label');
        }
      } else {
        document.body.classList.remove('cur-over');
        document.body.classList.remove('cur-has-label');
      }
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
      lbl.style.left = `${mx}px`;
      lbl.style.top = `${my}px`;
      updateHoverFrom(e.target);
    };

    const loop = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      raf = requestAnimationFrame(loop);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove('cur-over');
      document.body.classList.remove('cur-has-label');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cur-ring" aria-hidden="true" />
      <div ref={dotRef} className="cur-dot" aria-hidden="true" />
      <div ref={lblRef} className="cur-lbl" aria-hidden="true">
        VER
      </div>
    </>
  );
}
