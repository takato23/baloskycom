import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import OrbPlaceholder from './OrbPlaceholder';

/**
 * HERO CENTERPIECE — cabeza 3D de Santi (Head3D).
 *
 * Antes acá vivía HeroOrb3D: icosaedro subdivisado + wireframe + starfield +
 * 4 planets orbitales + torus + cassette + vinyl disk + drag physics. Muy
 * lindo, pero representaba a cualquiera — podía estar en cualquier sitio
 * de un diseñador. Lo que faltaba era el dueño del sitio en el centro.
 *
 * Ahora el centro es el modelo 3D de Santi (public/models/santi-head.glb,
 * generado con Meshy AI desde una foto). Gira lento en idle, te sigue con
 * el mouse. Los cartelitos orbitales (EN VIVO / ARGENTINA / 226K / MÚSICA /
 * CAFECITOS / COMUNIDAD), el título y el BOOM dot siguen igual.
 *
 * Live-strip de stats mockup (Apoyos · mes / Recaudado · ARS / club /
 * Campañas activas) sacado: eran números inventados y Santi pidió
 * "no TAN inventados". Si querés traerlos de vuelta con datos reales,
 * buscar el commit previo o la sección `live-strip` en delirio.css.
 *
 * Rollback: si esto no cierra, cambiar `Head3D` → `HeroOrb3D` en el render
 * de abajo y descomentar el import original. El archivo HeroOrb3D.tsx sigue
 * on disk intacto, no se borró nada.
 *
 * Si `prefers-reduced-motion` → cae al OrbPlaceholder CSS (accesibilidad).
 */
const Head3D = lazy(() => import('@/pages/previewV2/effects/Head3D'));
// HeroOrb3D queda disponible para rollback — dejado como lazy import comentado.
// const HeroOrb3D = lazy(() => import('./HeroOrb3D'));

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
 *   - Boom-dot pop animation on click
 */

const ORBIT_STICKERS: Array<{ cls: string; text: string }> = [];

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

export default function HeroSection() {
  const clock = useLiveClock();
  const reducedMotion = usePrefersReducedMotion();
  // Dos modos de centro del hero:
  //  · prefers-reduced-motion → OrbPlaceholder (CSS puro, 0 GPU, accesibilidad)
  //  · default → Head3D (cabeza 3D de Santi, gira en idle + tilt al mouse).
  //    El modelo son 15MB hoy — lazy import así no pega la carga inicial,
  //    y el Suspense fallback mantiene OrbPlaceholder visible durante la
  //    descarga para que no haya un hueco negro en el hero.

  const dotRef = useRef<HTMLSpanElement | null>(null);
  const stickersRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  /* Orbit RAF — port directo de delirio.html.
   * Los cartelitos (EN VIVO / ARGENTINA / 226K / MÚSICA / CAFECITOS / COMUNIDAD)
   * orbitan en elipse alrededor del centro del hero. Sin este effect quedan
   * apilados en 50/50 porque el CSS sólo los centra y el `transform` que
   * los distribuía lo calculaba JS.
   *
   * Perf: pausamos el loop cuando el hero está fuera de viewport (IO) y
   * cuando el tab está en background (visibilitychange). Con reduced-motion
   * fijamos posiciones estáticas distribuidas.
   */
  useEffect(() => {
    const wrap = stickersRef.current;
    if (!wrap) return;
    const stickers = Array.from(wrap.querySelectorAll<HTMLDivElement>('.orbit-sticker'));
    if (stickers.length === 0) return;
    const n = stickers.length;

    // Reduced-motion: posiciones fijas distribuidas en el óvalo, sin RAF.
    if (reducedMotion) {
      const r = Math.min(window.innerWidth, window.innerHeight) * 0.32;
      stickers.forEach((s, i) => {
        const angle = (i / n) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.55;
        s.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      });
      return;
    }

    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const start = performance.now();
    const baseRadius = () =>
      Math.min(window.innerWidth, window.innerHeight) * 0.32;

    const tick = () => {
      if (!visible || !pageVisible) {
        raf = 0;
        return;
      }
      const t = (performance.now() - start) / 1000;
      const r = baseRadius();
      for (let i = 0; i < n; i++) {
        const s = stickers[i];
        const angle = (i / n) * Math.PI * 2 + t * 0.18 * (i % 2 === 0 ? 1 : -0.7);
        const rr = r + Math.sin(t * 0.9 + i) * 18;
        const x = Math.cos(angle) * rr;
        const y = Math.sin(angle) * rr * 0.55; // elipse
        const rot = Math.sin(t * 0.8 + i * 1.3) * 14;
        s.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const resume = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) resume();
        });
      },
      { threshold: 0 },
    );
    io.observe(wrap);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) resume();
    };
    document.addEventListener('visibilitychange', onVisibility);

    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    let mx = 0.58;
    let my = 0.42;
    let tiltX = 0;
    let tiltY = 0;

    const apply = () => {
      raf = 0;
      hero.style.setProperty('--hero-mx', `${Math.round(mx * 100)}%`);
      hero.style.setProperty('--hero-my', `${Math.round(my * 100)}%`);
      hero.style.setProperty('--hero-tilt-x', `${tiltX.toFixed(1)}px`);
      hero.style.setProperty('--hero-tilt-y', `${tiltY.toFixed(1)}px`);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mx = Math.min(0.92, Math.max(0.08, (event.clientX - rect.left) / rect.width));
      my = Math.min(0.86, Math.max(0.12, (event.clientY - rect.top) / rect.height));
      tiltX = (mx - 0.5) * 22;
      tiltY = (my - 0.5) * 16;
      schedule();
    };

    const onLeave = () => {
      mx = 0.58;
      my = 0.42;
      tiltX = 0;
      tiltY = 0;
      schedule();
    };

    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

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
    <section ref={heroRef} className="hero">
      <div className="hero-aura" aria-hidden="true" />
      <div className="hero-canvas-wrap">
        {reducedMotion ? (
          <OrbPlaceholder />
        ) : (
          <Suspense fallback={<OrbPlaceholder />}>
            {/* `disableRandomGestures` corta los nods/shakes/glances random
             * cada 8-15s — Santi los llamó "saltitos" y los pidió fuera.
             * Queda activo sólo: look-at (seguir mouse), idle swing suave,
             * respiración, pestañeo, y el big-nod del click. Menos jitter,
             * más estoico. */}
            <Head3D
              disableRandomGestures
              disableBlink
              breathAmpScale={0.35}
              cameraZ={3.15}
              yOffsetRatio={0.12}
            />
          </Suspense>
        )}
      </div>
      <div className="orbit-stickers" aria-hidden="true" ref={stickersRef}>
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
              Edición IA · 226K IG · Buenos Aires
            </div>
            <div className="t-mono" style={{ color: 'var(--muted)' }}>
              {clock}
            </div>
          </div>

          <h1 className="hero-title">
            <span className="line">
              <span data-split>edición IA,</span>
            </span>
            <span className="line line--together">
              <span data-split>
                con <em className="morph">mirada</em>
              </span>
            </span>
            <span className="line">
              <span data-split>
                <span className="word-last">
                  propia
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
            <div className="cta-row">
              <a className="cta cta-primary cta-lab" href="/#trabajemos" data-cursor="BRIEF">
                <span>Presupuestame esto!</span>
                <span className="arr">↗</span>
              </a>
              <a className="cta cta-ghost" href="/cafecito" data-cursor="CAFECITO">
                <span>Cafecito</span>
                <span className="arr">→</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
