import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';

type Mood = 'idle' | 'talking' | 'surprised' | 'happy' | 'hungry' | 'asleep';

/* ── "Spark" mascot (à la Claude Code): tiny orange sparkle-creature ── */
/* Two feet phases per mood for walk cycle. Top line = animated emote. */
const FRAMES: Record<Mood, [string[], string[]]> = {
  idle: [
    [
      ' ·✦· ',
      '╭───╮',
      '│• •│',
      '╰─◡─╯',
      ' U U ',
    ],
    [
      ' ·∙· ',
      '╭───╮',
      '│• •│',
      '╰─◡─╯',
      ' u U ',
    ],
  ],
  talking: [
    [
      ' ·♪· ',
      '╭───╮',
      '│^ ^│',
      '╰─o─╯',
      ' U U ',
    ],
    [
      ' ♫·♪ ',
      '╭───╮',
      '│^ ^│',
      '╰─o─╯',
      ' u U ',
    ],
  ],
  surprised: [
    [
      ' !!! ',
      '╭───╮',
      '│⊙ ⊙│',
      '╰─o─╯',
      ' U U ',
    ],
    [
      ' !!! ',
      '╭───╮',
      '│⊙ ⊙│',
      '╰─o─╯',
      ' U U ',
    ],
  ],
  happy: [
    [
      '✦·♥·✦',
      '╭───╮',
      '│^ ^│',
      '╰─v─╯',
      ' U U ',
    ],
    [
      '·✦♥✦·',
      '╭───╮',
      '│^ ^│',
      '╰─v─╯',
      ' u u ',
    ],
  ],
  hungry: [
    [
      ' ~~~ ',
      '╭───╮',
      '│; ;│',
      '╰───╯',
      ' U U ',
    ],
    [
      ' ·~· ',
      '╭───╮',
      '│; ;│',
      '╰───╯',
      ' u U ',
    ],
  ],
  asleep: [
    [
      ' zzz ',
      '╭───╮',
      '│- -│',
      '╰───╯',
      ' U U ',
    ],
    [
      ' ZZZ ',
      '╭───╮',
      '│- -│',
      '╰───╯',
      ' U U ',
    ],
  ],
};

const PHRASES_IDLE = [
  'ey. te estoy mirando.',
  'bancame. literal.',
  'si toco algo se rompe.',
  '¿te gustó el tema nuevo?',
  'vi todo lo que clickeaste.',
  'acá estoy, como siempre.',
  'respira. el sitio es raro a propósito.',
  'soy un bot. pero bueno.',
];

const PHRASES_GUIDE = [
  'probá tocar el logo 10 veces. algo pasa.',
  'hay cursos nuevos arriba.',
  '¿viste las ideas? hay una de la luna.',
  'si querés bancar, clickeá "bancame".',
  'el admin panel tiene cosas escondidas.',
  'scrolleá más, hay música.',
  'portfolio → mis delirios archivados.',
  'encargos → pedime cualquier cosa rara.',
];

const PHRASES_HUNGRY = [
  'che, alimentame. click acá.',
  'me muero de hambre. literal.',
  'hacé click en mí, no te cuesta nada.',
  'si me ignorás me duermo.',
];

const PHRASES_FED = [
  'gracias. te amo.',
  'uff eso estuvo bueno.',
  'sos un capo.',
  'ahora sí. seguimos.',
];

const PHRASES_BUMP = [
  'uh.',
  'perdón.',
  '…',
];

const PHRASES_CALLED = [
  'voy.',
  '¿eh?',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* body/feet now baked into FRAMES */

export default function MascotCompanion() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname.startsWith('/checkout');
  const isMobile = useIsMobile();
  const [mood, setMood] = useState<Mood>('idle');
  const [bubble, setBubble] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [hunger, setHunger] = useState(0); // 0 full, 100 starving
  const [posX, setPosX] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth - 140 : 800
  ); // pixels from left
  const [dir, setDirState] = useState<1 | -1>(-1); // 1 = walks right, -1 = walks left
  const dirRef = useRef<1 | -1>(-1);
  const setDir = (d: 1 | -1 | ((prev: 1 | -1) => 1 | -1)) => {
    if (typeof d === 'function') {
      setDirState((prev) => {
        const next = (d as (p: 1 | -1) => 1 | -1)(prev);
        dirRef.current = next;
        return next;
      });
    } else {
      dirRef.current = d;
      setDirState(d);
    }
  };
  const [walkPhase, setWalkPhase] = useState(0); // 0 or 1 for feet animation
  const [isPaused, setIsPaused] = useState(false);

  const rafRef = useRef(0);
  const walkRafRef = useRef(0);
  const bubbleTimerRef = useRef<number | null>(null);
  const moodResetRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const obstaclesRef = useRef<DOMRect[]>([]);
  const targetXRef = useRef<number | null>(null);
  const lastBumpRef = useRef<number>(0);
  const cursorXRef = useRef<number>(0);

  // Sizes
  const MASCOT_W = isMobile ? 72 : 100;
  const MASCOT_H = isMobile ? 60 : 80;
  const BASELINE_PX = isMobile ? 88 : 20; // distance from viewport bottom

  const deriveMoodFromHunger = (h: number): Mood => {
    if (h >= 90) return 'asleep';
    if (h >= 60) return 'hungry';
    return 'idle';
  };

  const say = (text: string, ms = 4500) => {
    setBubble(text);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => setBubble(null), ms);
  };

  const flashMood = (m: Mood, ms = 1200) => {
    setMood(m);
    if (moodResetRef.current) window.clearTimeout(moodResetRef.current);
    moodResetRef.current = window.setTimeout(() => {
      setMood((prev) => {
        if (prev === 'surprised' || prev === 'happy' || prev === 'talking') {
          return deriveMoodFromHunger(hunger);
        }
        return prev;
      });
    }, ms);
  };

  // Hunger tick (~every 4s +1, ~7 min to starve)
  useEffect(() => {
    const id = window.setInterval(() => {
      setHunger((h) => Math.min(100, h + 1));
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // Mood reflects hunger when in passive states
  useEffect(() => {
    setMood((prev) => {
      if (prev === 'surprised' || prev === 'happy' || prev === 'talking') return prev;
      return deriveMoodFromHunger(hunger);
    });
  }, [hunger]);

  // Random phrases on a loop — chill tempo, doesn't always talk
  useEffect(() => {
    if (hidden) return;
    let timeoutId = 0;
    const loop = () => {
      const delay = 45000 + Math.random() * 60000; // 45–105s between attempts
      timeoutId = window.setTimeout(() => {
        if (hidden) return;
        // 55% chance of staying quiet this tick
        if (Math.random() < 0.55) { loop(); return; }
        let pool = PHRASES_IDLE;
        if (hunger >= 60) pool = PHRASES_HUNGRY;
        else if (Math.random() < 0.3) pool = PHRASES_GUIDE;
        if (mood !== 'asleep') {
          say(pick(pool));
          flashMood('talking', 2200);
        }
        loop();
      }, delay) as unknown as number;
    };
    loop();
    return () => window.clearTimeout(timeoutId);
  }, [hidden, hunger]);

  // Tilt toward cursor (desktop only)
  useEffect(() => {
    if (isMobile || hidden) return;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e: MouseEvent) => {
      if (!containerRef.current || !faceRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const mag = Math.hypot(dx, dy) || 1;
      const max = 4;
      const nx = Math.max(-max, Math.min(max, (dx / mag) * max));
      const ny = Math.max(-max, Math.min(max, (dy / mag) * max));

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        currentX += (nx - currentX) * 0.18;
        currentY += (ny - currentY) * 0.18;
        if (faceRef.current) {
          faceRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, hidden]);

  // Big scroll jump -> surprised (rare, only on really big jumps)
  useEffect(() => {
    if (hidden) return;
    let lastY = window.scrollY;
    let lock = false;
    let resetTimer = 0;

    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      // Only react on big fast scrolls, ~25% of the time
      if (delta > 200 && !lock && Math.random() < 0.25) {
        lock = true;
        flashMood('surprised', 600);
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => { lock = false; }, 2000) as unknown as number;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(resetTimer);
    };
  }, [hidden]);

  // Scan page for obstacles (buttons, links, data-hover elements)
  useEffect(() => {
    if (hidden) return;
    const updateObstacles = () => {
      const els = document.querySelectorAll<HTMLElement>(
        'button, a, [data-hover], input[type="submit"], input[type="button"]'
      );
      const rects: DOMRect[] = [];
      els.forEach((el) => {
        if (el.closest('[data-mascot-root]')) return;
        const r = el.getBoundingClientRect();
        if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight) {
          rects.push(r);
        }
      });
      obstaclesRef.current = rects;
    };
    updateObstacles();
    const onScroll = () => updateObstacles();
    const onResize = () => updateObstacles();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const interval = window.setInterval(updateObstacles, 1500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.clearInterval(interval);
    };
  }, [hidden]);

  // Track cursor X to allow mascot to "look"
  useEffect(() => {
    if (isMobile) return;
    const onMove = (e: MouseEvent) => { cursorXRef.current = e.clientX; };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isMobile]);

  // Walking loop — moves along the bottom, avoids obstacles, chases targets
  useEffect(() => {
    if (hidden) return;
    // Stationary moods: do not walk
    if (mood === 'asleep' || mood === 'happy') {
      cancelAnimationFrame(walkRafRef.current);
      return;
    }
    let lastT = performance.now();
    const step = (t: number) => {
      const dt = Math.min(t - lastT, 64);
      lastT = t;

      setPosX((x) => {
        if (isPaused && targetXRef.current === null) return x;

        // Base speed
        const baseSpeed = mood === 'hungry' ? 0.02 : 0.05; // px per ms
        const speed = targetXRef.current !== null ? baseSpeed * 1.6 : baseSpeed;

        // If chasing a target click, steer toward it
        if (targetXRef.current !== null) {
          const diff = targetXRef.current - x;
          if (Math.abs(diff) < 24) {
            targetXRef.current = null;
          } else {
            const want: 1 | -1 = diff > 0 ? 1 : -1;
            if (want !== dirRef.current) setDir(want);
          }
        }

        let nx = x + dirRef.current * speed * dt;

        // Edge bounds
        const margin = isMobile ? 12 : 32;
        const maxX = window.innerWidth - MASCOT_W - margin;
        if (nx < margin) { nx = margin; setDir(1); }
        else if (nx > maxX) { nx = maxX; setDir(-1); }

        // Look-ahead obstacle check: scan a window in front of the mascot.
        // If something is there, turn around smoothly (no bump, no phrase).
        const lookAhead = 28;
        const aheadLeft = dirRef.current === 1 ? nx + MASCOT_W : nx - lookAhead;
        const aheadRight = dirRef.current === 1 ? nx + MASCOT_W + lookAhead : nx;
        const rectTop = window.innerHeight - BASELINE_PX - MASCOT_H;
        const rectBottom = window.innerHeight - BASELINE_PX;

        let avoided = false;
        for (const obs of obstaclesRef.current) {
          if (
            aheadLeft < obs.right &&
            aheadRight > obs.left &&
            rectTop < obs.bottom &&
            rectBottom > obs.top
          ) {
            // Obstacle ahead — turn quietly, cancel chase target
            setDir(dirRef.current === 1 ? -1 : 1);
            targetXRef.current = null;
            nx = x; // hold position this frame
            avoided = true;
            break;
          }
        }

        // Real overlap (shouldn't really happen, but safe fallback)
        if (!avoided) {
          const mascotRect = {
            left: nx,
            right: nx + MASCOT_W,
            top: rectTop,
            bottom: rectBottom,
          };
          for (const obs of obstaclesRef.current) {
            if (
              mascotRect.left < obs.right &&
              mascotRect.right > obs.left &&
              mascotRect.top < obs.bottom &&
              mascotRect.bottom > obs.top
            ) {
              const now = performance.now();
              // Only react verbally very occasionally (every 12s, 25% chance)
              if (now - lastBumpRef.current > 12000 && Math.random() < 0.25) {
                lastBumpRef.current = now;
                flashMood('surprised', 500);
                say(pick(PHRASES_BUMP), 1200);
              }
              nx = x - dirRef.current * 8;
              setDir(dirRef.current === 1 ? -1 : 1);
              targetXRef.current = null;
              break;
            }
          }
        }

        return nx;
      });

      setWalkPhase(() => Math.floor(t / 240) % 2);
      walkRafRef.current = requestAnimationFrame(step);
    };
    walkRafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(walkRafRef.current);
    // dir is intentionally NOT in the dep list: we read it via dirRef.current
    // inside the rAF step. Putting it in deps would tear down and re-create the
    // animation frame on every turn, triggering update-depth warnings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, isMobile, mood, isPaused, MASCOT_W, MASCOT_H, BASELINE_PX]);

  // Occasionally pause/turn/change direction to feel alive
  useEffect(() => {
    if (hidden) return;
    const id = window.setInterval(() => {
      if (targetXRef.current !== null) return;
      const roll = Math.random();
      if (roll < 0.25) {
        setDir((d) => (d === 1 ? -1 : 1));
      } else if (roll < 0.45) {
        setIsPaused(true);
        window.setTimeout(() => setIsPaused(false), 1200 + Math.random() * 1800);
      }
    }, 3500);
    return () => window.clearInterval(id);
  }, [hidden]);

  // Keep mascot in bounds on window resize
  useEffect(() => {
    const onResize = () => {
      setPosX((x) => Math.min(x, window.innerWidth - MASCOT_W - 12));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [MASCOT_W]);

  // Any click on the page — mostly silent, sometimes curious
  useEffect(() => {
    if (hidden) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest('[data-mascot-root]')) return;
      // Subtle reaction: only flash surprised 30% of the time
      if (Math.random() < 0.3) flashMood('surprised', 450);
      // Occasionally (~10%) walk toward the click on desktop
      if (!isMobile && Math.random() < 0.1) {
        const margin = 32;
        const maxX = window.innerWidth - MASCOT_W - margin;
        const cx = Math.max(margin, Math.min(maxX, e.clientX - MASCOT_W / 2));
        targetXRef.current = cx;
        // Even when curious, only speak 20% of the time
        if (Math.random() < 0.2) say(pick(PHRASES_CALLED), 1500);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [hidden, isMobile, MASCOT_W]);

  // Feed the mascot
  const onMascotClick = () => {
    setHunger((h) => Math.max(0, h - 35));
    flashMood('happy', 1500);
    say(pick(PHRASES_FED), 2500);
  };

  const onDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHidden(true);
  };

  // Hide mascot on admin (distracting for content editing) and checkout (distracting during payment)
  if (isAdmin || isCheckout) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed z-[9997] right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] sm:bottom-20 w-8 h-8 flex items-center justify-center bg-[var(--black)] text-[var(--accent)] text-xs font-mono border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--black)] transition-colors"
        title="Invocar mascota"
        aria-label="Invocar mascota"
      >
        [+]
      </button>
    );
  }

  // Frames: two phases per mood for walk cycle; pick phase based on walkPhase and movement
  const walking = !isPaused && mood !== 'asleep' && mood !== 'surprised' && mood !== 'happy';
  const lines = FRAMES[mood][walking ? walkPhase : 0];
  // Flip horizontally when walking right (face still forward but body shifts)
  const flip = dir === 1 ? 'scaleX(-1)' : 'scaleX(1)';

  // Position: mascot walks on both desktop and mobile, with safe bottom margin on mobile.
  const containerStyle: React.CSSProperties = {
    left: `${posX}px`,
    bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' : '1.25rem',
    transition: 'left 0.12s linear',
  };

  return (
    <div
      ref={containerRef}
      data-mascot-root
      className="fixed z-[9997] select-none pointer-events-none"
      style={containerStyle}
    >
      {bubble && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-auto"
          style={{ minWidth: '180px', maxWidth: '240px' }}
        >
          <div
            className="relative bg-[var(--black)] text-[var(--white)] font-mono text-[11px] leading-[1.4] px-3 py-2 border border-[var(--accent)]"
            style={{ animation: 'mascot-bubble-in 0.25s ease-out', boxShadow: '4px 4px 0 var(--accent)' }}
          >
            <span className="text-[var(--accent)]">{'> '}</span>
            {bubble}
          </div>
        </div>
      )}

      <div
        onClick={onMascotClick}
        className="pointer-events-auto cursor-pointer relative group"
        style={{
          filter: mood === 'asleep'
            ? 'grayscale(0.35) brightness(0.85) drop-shadow(0 0 2px rgba(250,93,41,0.25)) drop-shadow(1px 2px 0 rgba(0,0,0,0.25))'
            : 'drop-shadow(0 0 4px rgba(250,93,41,0.45)) drop-shadow(0 0 10px rgba(250,93,41,0.18)) drop-shadow(1px 2px 0 rgba(0,0,0,0.25))',
          animation: mood === 'asleep' ? 'none' : 'mascot-pulse 2.4s ease-in-out infinite',
        }}
      >
        <pre
          className={`m-0 font-mono ${isMobile ? 'text-[11px] leading-[1.05]' : 'text-[14px] leading-[1.1]'} tracking-tight text-[var(--accent)] group-hover:brightness-125 transition-[filter]`}
          style={{
            animation: mood === 'asleep'
              ? 'mascot-sleep 3s ease-in-out infinite'
              : walking
                ? 'mascot-walk 0.48s ease-in-out infinite'
                : 'mascot-float 3.5s ease-in-out infinite',
            transform: flip,
          }}
        >
          <span ref={faceRef} style={{ display: 'inline-block', transition: 'transform 0.05s' }}>
            {lines.join('\n')}
          </span>
        </pre>

        <button
          onClick={onDismiss}
          className={`absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--black)] text-[var(--white)] text-[10px] font-mono transition-opacity ${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'}`}
          title="Ocultar"
          aria-label="Ocultar mascota"
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes mascot-bubble-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0) ${flip === 'scaleX(-1)' ? 'scaleX(-1)' : 'scaleX(1)'}; }
          50% { transform: translateY(-3px) ${flip === 'scaleX(-1)' ? 'scaleX(-1)' : 'scaleX(1)'}; }
        }
        @keyframes mascot-walk {
          0%, 100% { transform: translateY(0) ${flip}; }
          50% { transform: translateY(-2px) ${flip}; }
        }
        @keyframes mascot-sleep {
          0%, 100% { transform: translateY(0) rotate(-1deg) ${flip}; }
          50% { transform: translateY(2px) rotate(1deg) ${flip}; }
        }
        @keyframes mascot-pulse {
          0%, 100% {
            filter:
              drop-shadow(0 0 4px rgba(250,93,41,0.45))
              drop-shadow(0 0 10px rgba(250,93,41,0.18))
              drop-shadow(1px 2px 0 rgba(0,0,0,0.25));
          }
          50% {
            filter:
              drop-shadow(0 0 7px rgba(250,93,41,0.7))
              drop-shadow(0 0 16px rgba(250,93,41,0.3))
              drop-shadow(1px 2px 0 rgba(0,0,0,0.25));
          }
        }
      `}</style>
    </div>
  );
}
