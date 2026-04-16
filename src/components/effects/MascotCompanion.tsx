import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';

type Mood = 'idle' | 'talking' | 'surprised' | 'happy' | 'hungry' | 'asleep';

const FACES: Record<Mood, string> = {
  idle:      '[•_•]',
  talking:   '[◉‿◉]',
  surprised: '[◎o◎]',
  happy:     '[^‿^]',
  hungry:    '[·︵·]',
  asleep:    '[-_-]',
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MASCOT_BODY = '/│_│\\';
const MASCOT_FEET = ' ╯╰ ';

export default function MascotCompanion() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname.startsWith('/checkout');
  const isMobile = useIsMobile();
  const [mood, setMood] = useState<Mood>('idle');
  const [bubble, setBubble] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [hunger, setHunger] = useState(0); // 0 full, 100 starving

  const rafRef = useRef(0);
  const bubbleTimerRef = useRef<number | null>(null);
  const moodResetRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);

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

  // Random phrases on a loop
  useEffect(() => {
    if (hidden) return;
    let timeoutId = 0;
    const loop = () => {
      const delay = 18000 + Math.random() * 20000;
      timeoutId = window.setTimeout(() => {
        if (hidden) return;
        let pool = PHRASES_IDLE;
        if (hunger >= 60) pool = PHRASES_HUNGRY;
        else if (Math.random() < 0.4) pool = PHRASES_GUIDE;
        if (mood !== 'asleep') {
          say(pick(pool));
          flashMood('talking', 2500);
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

  // Big scroll jump -> surprised
  useEffect(() => {
    if (hidden) return;
    let lastY = window.scrollY;
    let lock = false;
    let resetTimer = 0;

    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (delta > 80 && !lock) {
        lock = true;
        flashMood('surprised', 900);
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => { lock = false; }, 600) as unknown as number;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(resetTimer);
    };
  }, [hidden]);

  // Any click on the page surprises the mascot (except clicks on itself)
  useEffect(() => {
    if (hidden) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest('[data-mascot-root]')) return;
      flashMood('surprised', 700);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [hidden]);

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

  const thought = mood === 'asleep' ? 'zzz' : mood === 'hungry' ? '???' : '';

  return (
    <div
      ref={containerRef}
      data-mascot-root
      className="fixed z-[9997] select-none pointer-events-none"
      style={{
        right: '0.75rem',
        bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 7rem)' : '5rem',
      }}
    >
      {bubble && (
        <div
          className="absolute right-0 bottom-full mb-2 pointer-events-auto"
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
        className="pointer-events-auto cursor-pointer relative"
        style={{
          filter: mood === 'asleep' ? 'grayscale(0.6) brightness(0.7)' : 'none',
        }}
      >
        <pre
          className="m-0 font-mono text-[13px] leading-[1.1] text-[var(--black)] bg-[var(--white)] border border-[var(--black)] px-2 py-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          style={{
            animation: mood === 'asleep'
              ? 'mascot-sleep 3s ease-in-out infinite'
              : 'mascot-float 3.5s ease-in-out infinite',
            boxShadow: '3px 3px 0 var(--black)',
          }}
        >
{'  '}<span className="text-[var(--accent)]">{thought.padEnd(3, ' ')}</span>{'\n '}
<span ref={faceRef} style={{ display: 'inline-block', transition: 'transform 0.05s' }}>{FACES[mood]}</span>{'\n '}
{MASCOT_BODY}{'\n '}
{MASCOT_FEET}
        </pre>

        <button
          onClick={onDismiss}
          className="absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center bg-[var(--black)] text-[var(--white)] text-[10px] font-mono border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--black)] transition-colors"
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
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes mascot-sleep {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(2px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
