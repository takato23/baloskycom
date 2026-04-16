import { useEffect, useRef, useState } from 'react';

/**
 * Easter egg: click the BALOSKY* logo 10 times within a short window.
 * Layout dispatches `balosky:logo-click` on each click.
 * After 10 rapid clicks, we open the MODO HOMER overlay.
 *
 * Homage to Homer's Web Page (franciscominen) — theater curtains
 * opening to reveal a chaotic 2000s GeoCities shrine. No external
 * GIFs: everything is CSS + emoji + generated chiptune beep.
 */

const THRESHOLD = 10;
const WINDOW_MS = 4000; // all clicks must land within 4s

const EMOJIS = ['🌙', '⭐', '🔥', '💫', '👁', '🎬', '🎭', '🎸', '🪩', '🛸', '🧿', '🍄', '🩵', '♾️', '🌀', '🗿'];

const HEADLINES = [
  'BIENVENIDO AL PORTAL OFICIAL DE BALOSKY™',
  'ESTABLECIDO EN EL AÑO 2026 D.C.',
  'SITIO OPTIMIZADO PARA NETSCAPE NAVIGATOR',
  'ZONA LIBRE DE ALGORITMOS',
  'NO OLVIDES FIRMAR EL LIBRO DE VISITAS',
  'UNICODE ON FIRE ★★★★★',
];

export default function ModoHomerEasterEgg() {
  const [active, setActive] = useState(false);
  const clicksRef = useRef<number[]>([]);

  useEffect(() => {
    const onLogoClick = () => {
      const now = Date.now();
      clicksRef.current = [...clicksRef.current, now].filter((t) => now - t <= WINDOW_MS);
      if (clicksRef.current.length >= THRESHOLD) {
        clicksRef.current = [];
        setActive(true);
      }
    };
    window.addEventListener('balosky:logo-click', onLogoClick as EventListener);
    return () => window.removeEventListener('balosky:logo-click', onLogoClick as EventListener);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);

  if (!active) return null;
  return <HomerOverlay onClose={() => setActive(false)} />;
}

function HomerOverlay({ onClose }: { onClose: () => void }) {
  const [muted, setMuted] = useState(true);

  // Generate a short chiptune beep loop via WebAudio (only if unmuted)
  useEffect(() => {
    if (muted) return;
    let ctx: AudioContext | null = null;
    let stopped = false;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return;
    }
    const NOTES = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63]; // Cmaj arpeggio
    let i = 0;
    const playNote = () => {
      if (stopped || !ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = NOTES[i % NOTES.length];
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      i++;
    };
    const id = window.setInterval(playNote, 240);
    playNote();
    return () => {
      stopped = true;
      window.clearInterval(id);
      ctx?.close().catch(() => {});
    };
  }, [muted]);

  // Randomized positions for the emoji grid (stable within this overlay lifetime)
  const items = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      emoji: EMOJIS[i % EMOJIS.length],
      top: `${Math.random() * 80 + 5}%`,
      left: `${Math.random() * 85 + 2}%`,
      size: `${Math.random() * 2.5 + 2}rem`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 3}s`,
      rotate: `${Math.random() * 720 - 360}deg`,
    }))
  ).current;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden"
      style={{
        background:
          'repeating-linear-gradient(45deg, #FA5D29 0 20px, #000 20px 40px, #fff 40px 60px)',
        animation: 'homer-bg 0.6s steps(4) infinite',
      }}
      onClick={onClose}
      role="dialog"
      aria-label="MODO HOMER"
    >
      {/* Curtains opening */}
      <div
        className="absolute inset-y-0 left-0 bg-[#7b0000]"
        style={{
          width: '50%',
          animation: 'homer-curtain-left 1.6s cubic-bezier(.2,.8,.2,1) forwards',
          backgroundImage:
            'repeating-linear-gradient(90deg, #7b0000 0 8px, #4a0000 8px 16px, #7b0000 16px 24px)',
          boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-[#7b0000]"
        style={{
          width: '50%',
          animation: 'homer-curtain-right 1.6s cubic-bezier(.2,.8,.2,1) forwards',
          backgroundImage:
            'repeating-linear-gradient(90deg, #7b0000 0 8px, #4a0000 8px 16px, #7b0000 16px 24px)',
          boxShadow: 'inset 20px 0 40px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      />

      {/* Stage background revealed behind curtains */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #220033 0%, #000 80%)',
          zIndex: 1,
        }}
      />

      {/* Marquee */}
      <div
        className="absolute top-0 left-0 right-0 overflow-hidden bg-black text-[#FA5D29] py-2 border-b-4 border-[#FA5D29]"
        style={{ zIndex: 3, animation: 'homer-fade-in 1.8s forwards' }}
      >
        <div
          className="whitespace-nowrap font-mono font-black uppercase tracking-[0.2em] text-sm sm:text-base"
          style={{ animation: 'homer-marquee 16s linear infinite' }}
        >
          {HEADLINES.map((h, i) => (
            <span key={i} className="mx-10">
              ★ {h} ★
            </span>
          ))}
          {HEADLINES.map((h, i) => (
            <span key={`b${i}`} className="mx-10">
              ★ {h} ★
            </span>
          ))}
        </div>
      </div>

      {/* Chaotic emoji grid */}
      <div className="absolute inset-0" style={{ zIndex: 2, animation: 'homer-fade-in 1.6s forwards' }}>
        {items.map((it, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              top: it.top,
              left: it.left,
              fontSize: it.size,
              animation: `homer-spin ${it.duration} linear infinite`,
              animationDelay: it.delay,
              filter: 'drop-shadow(0 0 12px #FA5D29)',
              transform: `rotate(${it.rotate})`,
            }}
          >
            {it.emoji}
          </span>
        ))}
      </div>

      {/* Title in the middle */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 3 }}
      >
        <div className="text-center" style={{ animation: 'homer-title 1.6s ease-out forwards' }}>
          <h1
            className="font-black uppercase"
            style={{
              fontSize: 'clamp(2.5rem, 10vw, 7rem)',
              letterSpacing: '-0.03em',
              lineHeight: 0.9,
              color: '#FA5D29',
              textShadow:
                '4px 4px 0 #000, 8px 8px 0 #fff, 12px 12px 0 #FA5D29, 0 0 40px rgba(250,93,41,0.8)',
              animation: 'homer-wobble 1.2s ease-in-out infinite',
            }}
          >
            MODO<br />HOMER
          </h1>
          <p
            className="mt-4 font-mono text-xs sm:text-sm text-white uppercase tracking-[0.3em]"
            style={{ animation: 'homer-blink 0.9s steps(2) infinite' }}
          >
            ─── click para salir ───
          </p>
        </div>
      </div>

      {/* Controls */}
      <div
        className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none"
        style={{ zIndex: 4, animation: 'homer-fade-in 2s forwards' }}
      >
        <span
          className="font-mono text-[10px] sm:text-xs text-white bg-black/70 px-2 py-1 border border-[#FA5D29]"
        >
          ♥ VISITANTE #{Math.floor(Math.random() * 9999) + 1000} ♥
        </span>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="font-mono text-xs bg-black text-[#FA5D29] border-2 border-[#FA5D29] px-3 py-1.5 hover:bg-[#FA5D29] hover:text-black transition-colors"
          >
            {muted ? '🔇 ACTIVAR MÚSICA' : '🔈 SILENCIAR'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="font-mono text-xs bg-[#FA5D29] text-black border-2 border-black px-3 py-1.5 hover:bg-black hover:text-[#FA5D29] transition-colors"
          >
            SALIR [ESC]
          </button>
        </div>
      </div>

      <style>{`
        @keyframes homer-bg {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes homer-curtain-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-105%); }
        }
        @keyframes homer-curtain-right {
          from { transform: translateX(0); }
          to   { transform: translateX(105%); }
        }
        @keyframes homer-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes homer-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes homer-spin {
          from { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.2); }
          to   { transform: rotate(360deg) scale(1); }
        }
        @keyframes homer-title {
          0%   { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          60%  { opacity: 1; transform: scale(1.15) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes homer-wobble {
          0%, 100% { transform: rotate(-1deg); }
          50%      { transform: rotate(1deg); }
        }
        @keyframes homer-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
