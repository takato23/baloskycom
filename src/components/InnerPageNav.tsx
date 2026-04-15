import { useEffect, useRef } from 'react';

/**
 * Monavon-style mobile nav chrome for inner pages:
 * - breadcrumb top-left `index / {label}`
 * - vertical progress rail on left edge tracking total page scroll
 * - bottom-left section label above nav
 *
 * Mobile-only (hidden on sm+).
 */
export default function InnerPageNav({ label }: { label: string }) {
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const maxScroll = doc.scrollHeight - window.innerHeight;
        const pct = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
        const clamped = Math.min(100, Math.max(0, pct));
        doc.style.setProperty('--section-progress', `${clamped.toFixed(1)}%`);
        if (pctRef.current) pctRef.current.textContent = `${Math.round(clamped)}%`;
      });
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <div className="mobile-breadcrumb sm:hidden">
        <span className="b-index">index</span>
        <span className="b-sep">/</span>
        <span className="b-current">{label.toLowerCase()}</span>
      </div>
      <div className="mobile-rail sm:hidden" aria-hidden="true">
        <span ref={pctRef} className="mobile-rail-pct" aria-hidden="true" />
      </div>
      <div className="mobile-section-indicator sm:hidden">
        <span className="num">&bull;</span>
        <span className="ml-1">{label}</span>
      </div>
    </>
  );
}
