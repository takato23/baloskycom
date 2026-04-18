/**
 * CSS-only stand-in for the Three.js hero orb from delirio.html.
 *
 * Renders a radial gradient sphere that rotates, pulses, and has a highlight
 * arc — lightweight, theme-aware (uses the Delirio palette CSS vars), and
 * mounted in the same `.hero-canvas-wrap` slot so we can swap in the real
 * WebGL orb later without moving any layout around.
 *
 * Scoped styles live inline so we don't have to touch `src/styles/delirio.css`
 * — the real orb will replace this component and its styles in one shot.
 */
export default function OrbPlaceholder() {
  return (
    <div className="orb-ph-root" aria-hidden="true">
      <style>{`
        .orb-ph-root {
          position: relative;
          width: min(62vmin, 560px);
          height: min(62vmin, 560px);
          display: grid;
          place-items: center;
          pointer-events: auto;
        }
        .orb-ph-core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 40%),
            radial-gradient(circle at 50% 50%, var(--accent) 0%, var(--magenta) 38%, var(--violet) 68%, var(--teal) 100%);
          background-size: 200% 200%;
          box-shadow:
            0 30px 80px -20px color-mix(in srgb, var(--magenta) 60%, transparent),
            0 0 0 1px color-mix(in srgb, var(--white) 8%, transparent) inset;
          animation: orbPhSpin 22s linear infinite, orbPhShift 9s ease-in-out infinite;
        }
        .orb-ph-ring {
          position: absolute;
          inset: -6%;
          border-radius: 50%;
          border: 1px dashed color-mix(in srgb, var(--violet) 55%, transparent);
          animation: orbPhRingSpin 28s linear infinite reverse;
          opacity: 0.7;
        }
        .orb-ph-ring.two {
          inset: -14%;
          border-style: solid;
          border-color: color-mix(in srgb, var(--teal) 30%, transparent);
          animation-duration: 48s;
        }
        .orb-ph-highlight {
          position: absolute;
          top: 8%;
          left: 18%;
          width: 32%;
          height: 22%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.7), transparent 70%);
          filter: blur(4px);
          animation: orbPhHighlight 7s ease-in-out infinite;
        }
        .orb-ph-pulse {
          position: absolute;
          inset: -24%;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent) 0%, transparent 65%);
          filter: blur(18px);
          animation: orbPhPulse 6s ease-in-out infinite;
          z-index: -1;
        }
        @keyframes orbPhSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbPhShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes orbPhRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbPhHighlight {
          0%, 100% { opacity: 0.6; transform: translate(0, 0); }
          50% { opacity: 1; transform: translate(8%, 4%); }
        }
        @keyframes orbPhPulse {
          0%, 100% { transform: scale(0.95); opacity: 0.55; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-ph-core, .orb-ph-ring, .orb-ph-highlight, .orb-ph-pulse {
            animation: none;
          }
        }
      `}</style>
      <span className="orb-ph-pulse" />
      <span className="orb-ph-ring two" />
      <span className="orb-ph-ring" />
      <span className="orb-ph-core" />
      <span className="orb-ph-highlight" />
    </div>
  );
}
