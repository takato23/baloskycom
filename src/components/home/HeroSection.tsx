import { useEffect, useRef, useState } from 'react';
import HeroOrb3D from './HeroOrb3D';

/**
 * Port of the `<section class="hero">` block from delirio.html.
 *
 * Mirrors the static markup so the Delirio CSS (`.hero`, `.hero-title`,
 * `.morph`, `.boom-dot`, `.live-strip`, `.stat`, `.orbit-sticker`) styles
 * it without any extra work. The WebGL orb now renders via `HeroOrb3D`
 * (a faithful port of the static home's Three.js scene).
 *
 * Active pieces of JS ported:
 *   - Live clock (HH:MM, updates every minute)
 *   - Count-up animation for the 4 stat numbers, triggered when the strip
 *     enters the viewport
 *   - Boom-dot pop animation on click
 */

type Stat = {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  tint: 'orange' | 'mag' | 'violet' | 'teal';
};

const STATS: Stat[] = [
  { label: 'Apoyos · mes', target: 1247, tint: 'orange' },
  { label: 'Recaudado · ARS', target: 2180, prefix: '$', suffix: 'k', tint: 'mag' },
  { label: 'Baloskiers', target: 486, tint: 'violet' },
  { label: 'Campañas activas', target: 7, tint: 'teal' },
];

const ORBIT_STICKERS = [
  { cls: 's1', text: 'EN VIVO' },
  { cls: 's2', text: 'ARGENTINA' },
  { cls: 's3', text: '176K ✦' },
  { cls: 's4', text: 'MÚSICA' },
  { cls: 's5', text: 'CAFECITOS' },
  { cls: 's6', text: 'COMUNIDAD' },
];

function useLiveClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h} : ${m}`;
}

function useCountUp(target: number, start: boolean, durationMs = 1600): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, start, durationMs]);
  return value;
}

function StatNum({ stat, run }: { stat: Stat; run: boolean }) {
  const v = useCountUp(stat.target, run);
  const tintClass = `tint-${stat.tint}`;
  return (
    <div className="num">
      {stat.prefix && <span className={tintClass}>{stat.prefix}</span>}
      <span className={`count ${tintClass}`}>{v.toLocaleString('es-AR')}</span>
      {stat.suffix && <span className={tintClass}>{stat.suffix}</span>}
    </div>
  );
}

export default function HeroSection() {
  const clock = useLiveClock();

  const dotRef = useRef<HTMLSpanElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [runCount, setRunCount] = useState(false);

  // Trigger the count-up when the live-strip scrolls into view.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setRunCount(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Boom-dot pop on click — matches the static home's easter-egg dot.
  const popBoomDot = () => {
    const el = dotRef.current;
    if (!el) return;
    el.classList.remove('popped');
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add('popped');
  };

  return (
    <section className="hero">
      <div className="hero-aura" aria-hidden="true" />
      <div className="hero-canvas-wrap">
        <HeroOrb3D />
      </div>
      <div className="orbit-stickers" aria-hidden="true">
        {ORBIT_STICKERS.map((s) => (
          <div key={s.cls} className={`orbit-sticker ${s.cls}`}>
            {s.text}
          </div>
        ))}
      </div>

      <div className="wrap">
        <div className="hero-inner">
          <div className="hero-top">
            <div className="t-mono" style={{ color: 'var(--muted)' }}>
              Creator · 176K IG · Buenos Aires
            </div>
            <div className="t-mono" style={{ color: 'var(--muted)' }}>
              {clock}
            </div>
          </div>

          <h1 className="hero-title">
            <span className="line">
              <span data-split>lo que hago,</span>
            </span>
            <span className="line">
              <span data-split>
                lo <em className="morph">hacemos</em>{' '}
                <span className="word-last">
                  juntos
                  <span
                    ref={dotRef}
                    className="boom-dot"
                    data-cursor="¡BOOM!"
                    style={{ pointerEvents: 'auto', cursor: 'none' }}
                    onClick={popBoomDot}
                  >
                    .
                  </span>
                </span>
              </span>
            </span>
          </h1>

          <div className="hero-bottom">
            <p className="hero-sub">
              Una plataforma abierta para sostener lo que creo. Cafecitos, encargos, proyectos,
              membresías. <b>Donde termina el feed, empezamos nosotros.</b>
            </p>
            <div className="cta-row">
              <a className="cta cta-primary" href="/#apoya" data-cursor="APORTAR">
                <span>Apoyar ahora</span>
                <span className="arr">→</span>
              </a>
              <a className="cta cta-ghost" href="/#mira" data-cursor="MIRAR">
                <span>Mirá el último</span>
                <span className="arr">↗</span>
              </a>
            </div>
          </div>

          <div className="live-strip" ref={stripRef}>
            {STATS.map((s) => (
              <div key={s.label} className="stat">
                <StatNum stat={s} run={runCount} />
                <div className="lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
