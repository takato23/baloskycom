import { useEffect, useState } from 'react';

/**
 * Port of the `<div id="curtain">` intro animation from delirio.html.
 *
 * Renders a full-screen black panel with the BALOSKY letters materialising,
 * then lifts via clip-path at 1.7s and self-removes at 2.9s. Uses a
 * sessionStorage flag so subsequent navigations in the same tab skip the
 * animation — the original static home replayed it on every hard refresh.
 *
 * CSS lives in `src/styles/delirio.css` (`.curtain`, `.curtain-letters`,
 * `.curtain-sub`).
 */
const STORAGE_KEY = 'balosky_curtain_shown';

export default function IntroCurtain() {
  const [mounted, setMounted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const lift = window.setTimeout(() => setGone(true), 1700);
    const clean = window.setTimeout(() => {
      setMounted(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore quota / privacy mode */
      }
    }, 2900);
    return () => {
      window.clearTimeout(lift);
      window.clearTimeout(clean);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className={`curtain${gone ? ' gone' : ''}`} aria-hidden="true">
      <div className="curtain-letters">
        {['B', 'A', 'L', 'O', 'S', 'K', 'Y'].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="curtain-sub">2026 · Donde termina el feed</div>
    </div>
  );
}
