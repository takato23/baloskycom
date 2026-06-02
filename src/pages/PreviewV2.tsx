/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * /preview-v2 — Variante A "Las bolitas nunca se van".
 * Hero fullscreen con 8 bolitas flotando alrededor del video.
 * Al scrollear colapsa a un dock sticky con el video circular + bolitas mini.
 * Tocar una bolita la "come" (vuela a la boca) y scrollea a la sección.
 *
 * Porteado 1:1 del laboratorio balosky-design/ (variant-a.jsx + components).
 * Standalone: no hereda Layout/nav/footer del sitio — es un lienzo aislado.
 */

import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  VideoSlot, Glass, Orb, OrbDock, FloatingOrbs, LogoM, Eyebrow, FabCTA,
} from './previewV2/components';
import {
  TOKENS, SECTIONS, EAT_VIDEO_BY_SECTION, IDLE_VIDEO, type OrbitKey,
} from './previewV2/tokens';
import {
  DATA,
  type Product, type FeaturedProject, type Project, type ClubPlan,
  type PhotoItem, type Track, type CafecitoTier, type MomentData,
} from './previewV2/data';
import type { Orbit } from './previewV2/tokens';
import LoadingScreenV2 from './previewV2/effects/LoadingScreenV2';
import ScrollProgressV2 from './previewV2/effects/ScrollProgressV2';
import ModoHomerEasterEgg from '@/components/effects/ModoHomerEasterEgg';
import { useWakefulness } from '@/hooks/useWakefulness';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const T = TOKENS;

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export default function PreviewV2() {
  const [scroll, setScroll] = useState(0);
  const [eatenSet, setEatenSet] = useState<Set<OrbitKey>>(() => new Set());
  const [eatingSrc, setEatingSrc] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<OrbitKey | null>(null);
  const eatTimers = useRef<number[]>([]);

  // Sistema de "despertar": mide engagement del visitante y desbloquea capas
  // de efectos gradualmente. Respeta prefers-reduced-motion (si está activo,
  // el hook queda en level=0 permanente → página permanece calma).
  // Ver src/hooks/useWakefulness.ts para el scoring y los thresholds.
  const reducedMotion = usePrefersReducedMotion();
  const wake = useWakefulness({ disabled: reducedMotion });

  // Aplicamos el nivel como data attribute en <body> para que el CSS global
  // pueda condicionar los efectos por nivel sin que cada componente tenga
  // que saber del sistema. Vuelve a "none" al desmontar así otras páginas
  // no heredan estos selectores.
  useEffect(() => {
    document.body.setAttribute('data-wake-level', String(wake.level));
    return () => {
      document.body.removeAttribute('data-wake-level');
    };
  }, [wake.level]);

  // Tap al logo `m` → "volver al silencio" (reset) + dispatch del custom
  // event que escucha ModoHomerEasterEgg (10 taps rápidos = MODO HOMER).
  // Dispatcheamos ambas cosas desde acá para que el usuario, al querer
  // bajar el volumen, no pierda el easter egg por accidente.
  const onLogoClick = useCallback(() => {
    wake.reset();
    try {
      window.dispatchEvent(new CustomEvent('balosky:logo-click'));
    } catch { /* noop */ }
  }, [wake]);

  // scroll progress → hero collapse.
  // Usamos rAF para coalescer eventos de scroll: una actualización por frame,
  // no por evento. Sin esto, en trackpads con momentum el setScroll se dispara
  // a ~120Hz y React a veces se queda atrás → hero "baja desfasado" del body.
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScroll(window.scrollY || document.documentElement.scrollTop || 0);
      });
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // track sección actual via IntersectionObserver
  useEffect(() => {
    const candidates: HTMLElement[] = [];
    SECTIONS.forEach(k => {
      const node = document.querySelector<HTMLElement>(`[data-section="${k}"]`);
      if (node) candidates.push(node);
    });
    if (!candidates.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // tomamos la que más intersecta
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const k = visible.target.getAttribute('data-section') as OrbitKey | null;
          if (k) setCurrentSection(k);
        }
      },
      { root: null, threshold: [0.25, 0.5, 0.75] },
    );
    candidates.forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);

  // cleanup timers
  useEffect(() => () => {
    eatTimers.current.forEach(t => window.clearTimeout(t));
  }, []);

  const scrollToSection = useCallback((key: OrbitKey) => {
    const target = document.querySelector<HTMLElement>(`[data-section="${key}"]`);
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, []);

  // click en orb → "comer" → mostrar video eat → scrollear → restaurar
  const onEat = useCallback((key: OrbitKey) => {
    // 0. avisar al sistema de despertar que el usuario está enganchado
    wake.bumpOrb();

    // 1. marcar como comida para que vuele a la boca
    setEatenSet(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // 2. tras 550ms (duración de vuelo) cambiar el video a eating
    const src = EAT_VIDEO_BY_SECTION[key];
    const t1 = window.setTimeout(() => {
      // cache-bust para que VideoSlot reinicie el clip
      setEatingSrc(`${src}?t=${Date.now()}`);
    }, 0);
    eatTimers.current.push(t1);

    // 3. tras 550ms hacer scroll a la sección
    const t2 = window.setTimeout(() => {
      scrollToSection(key);
    }, 600);
    eatTimers.current.push(t2);

    // 4. tras 3.2s volver a idle y restaurar la bolita (para poder volver a clickearla)
    const t3 = window.setTimeout(() => {
      setEatingSrc(null);
    }, 3200);
    eatTimers.current.push(t3);

    const t4 = window.setTimeout(() => {
      setEatenSet(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 4700);
    eatTimers.current.push(t4);
  }, [scrollToSection, wake]);

  const collapseAt = 420;
  const collapseProgress = Math.min(1, scroll / collapseAt);
  const heroHeight = 600 - collapseProgress * (600 - 12);

  return (
    <div
      style={{
        minHeight: '100dvh',
        overflowX: 'hidden',
        touchAction: 'pan-y pinch-zoom',
        background: T.bg, color: T.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        // Expuesto como CSS var para que los keyframes de stroke-fill tengan
        // el color de texto correcto sin importar el tema del navegador.
        ['--v2-text' as string]: T.text,
      } as CSSProperties}
    >
      {/* keyframes inyectadas */}
      <style>{keyframesCss}</style>

      {/*
        LoadingScreenV2 — intro ASCII "BALOSKY" con cortina chocolate.
        Sólo se muestra 1 vez por sesión (sessionStorage flag). Es la
        primera pieza del despertar: sienta el tono antes de que aparezca
        el hero con Santi.
      */}
      <LoadingScreenV2 />

      {/*
        ScrollProgressV2 — línea naranja arriba del viewport marcando
        cuánto llevamos leído. Siempre activa (salvo reduced-motion).
        Parte del baseline de v2: no depende del nivel de despertar.
      */}
      <ScrollProgressV2 />

      {/* HERO STICKY.
         Sin transition en `height`: que siga al scroll 1:1.
         La transition lerpeaba sobre 150ms mientras el contenido
         de abajo scrolleaba al toque → se veía un "desfase" entre
         la base del hero y el borde superior de la sección. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: heroHeight,
        background: T.bgDeep, overflow: 'hidden',
      }}>
        {/* video de fondo */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 1 - collapseProgress * 0.1,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(circle at 50% 28%, rgba(255,226,204,0.16) 0%, rgba(255,226,204,0.08) 22%, transparent 56%),
              linear-gradient(180deg, rgba(10,6,5,0.14) 0%, rgba(10,6,5,0.1) 38%, rgba(10,6,5,0.42) 100%)
            `,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 clamp(12px, 2.5vw, 28px)',
          }}>
            <VideoSlot
              key={eatingSrc ? `eat-${eatingSrc}` : 'idle'}
              kind={eatingSrc ? 'eating' : 'idle'}
              src={eatingSrc ? eatingSrc.split('?')[0] : IDLE_VIDEO}
              startAt={eatingSrc ? 3 : 0}
              fade={!!eatingSrc}
              style={{
                width: 'min(100%, 1040px)',
                height: '100%',
                margin: '0 auto',
                boxShadow: '0 30px 80px rgba(0,0,0,0.28)',
              }}
              videoStyle={{
                objectPosition: 'center 18%',
              }}
            />
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              linear-gradient(90deg, rgba(10,6,5,0.76) 0%, rgba(10,6,5,0.22) 17%, rgba(10,6,5,0.08) 34%, rgba(10,6,5,0.08) 66%, rgba(10,6,5,0.22) 83%, rgba(10,6,5,0.76) 100%),
              linear-gradient(180deg, rgba(10,6,5,0.12) 0%, transparent 22%, transparent 72%, rgba(10,6,5,0.3) 100%)
            `,
          }} />
        </div>

        {/*
          Liquid-glass fade: disuelve al Santi en el fondo chocolate.
          3 capas apiladas para que se sienta "de cristal":
            (a) gradiente negro → transparente (abajo hacia arriba) que come
                los hombros y los funde con el bg,
            (b) backdrop-filter blur+saturate sutil en el mismo cuarto inferior
                para el efecto de cristal líquido,
            (c) una línea fina iluminada arriba del fade que hace de "rim"
                del cristal.
          z-index: 2 → por encima del video, por debajo de top-bar y orbes.
          opacity atenuado por collapseProgress para que desaparezca al colapsar.
        */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: '28%', zIndex: 2, pointerEvents: 'none',
          opacity: 1 - collapseProgress * 0.75,
        }}>
          {/* capa (b) — blur progresivo SOLO en el último tramo (no toca la cara) */}
          <div style={{
            position: 'absolute', inset: 0,
            backdropFilter: 'blur(10px) saturate(140%)',
            WebkitBackdropFilter: 'blur(10px) saturate(140%)',
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 95%)',
          }} />
          {/* capa (a) — gradiente chocolate, pesado al piso, apenas insinuado arriba */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top,
              ${T.bg} 0%,
              ${T.bg}f0 20%,
              ${T.bgDeep}bb 45%,
              rgba(18,11,8,0.45) 70%,
              rgba(18,11,8,0.12) 90%,
              transparent 100%)`,
          }} />
          {/* capa (c) — rim luminoso (línea de cristal) en el arranque del fade */}
          <div style={{
            position: 'absolute', left: '6%', right: '6%', top: '72%', height: 1,
            background: `linear-gradient(to right,
              transparent 0%,
              rgba(255,240,230,0.14) 20%,
              rgba(255,240,230,0.22) 50%,
              rgba(255,240,230,0.14) 80%,
              transparent 100%)`,
            filter: 'blur(0.5px)',
          }} />
        </div>

        {/* top bar visible sólo cuando hay hero */}
        {collapseProgress < 0.6 && (
          <div style={{
            position: 'absolute', top: 32, left: 16, right: 16, zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            opacity: 1 - (collapseProgress / 0.6),
          }}>
            <LogoM size={32} onClick={onLogoClick} />
            <Glass radius={16} style={{ width: 32, height: 32 }}
              inner={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                fontSize: 14, color: T.text }}>✕</Glass>
          </div>
        )}

        {/* Título + FloatingOrbs — expandido */}
        {collapseProgress < 0.95 && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
            opacity: 1 - collapseProgress,
          }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <FloatingOrbs onPick={onEat} eatenSet={eatenSet} />
            </div>
            <div style={{
              position: 'absolute', top: 90, left: 22, pointerEvents: 'none',
            }}>
              <h1 style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                // Instrument Serif solo tiene weight 400: confío en el tamaño +
                // italic para la jerarquía. Italic con este tipo tiene la `l`
                // y la `k` con ese swoosh editorial característico.
                fontSize: 76, fontWeight: 400, fontStyle: 'italic',
                letterSpacing: -2, margin: 0, lineHeight: 0.9,
                color: T.text, mixBlendMode: 'screen',
                textShadow: '0 0 40px rgba(0,0,0,0.6)',
              }}>{DATA.hero.name}</h1>
              <div style={{
                marginTop: 12,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                color: 'rgba(245,237,228,0.75)',
              }}>{DATA.hero.tagline}</div>
            </div>
          </div>
        )}

        {/* hairline inferior */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: T.hairline, zIndex: 7,
        }} />
      </div>

      {/*
        EL MOMENTO — banda editorial full-bleed entre hero y secciones.
        La UNA cosa signature de balosky.com: una frase corta, editable
        por Santi semanalmente, con lo que está haciendo ahora. Lo primero
        que lee el visitante después del hero → mete presencia y frescura
        sin competir con el resto del sitio.
      */}
      <Momento data={DATA.moment} />

      {/* CONTENIDO */}
      <div style={{
        padding: '24px 18px 140px',
        maxWidth: 560, margin: '0 auto',
      }}>
        {SECTIONS.map((key, i) => (
          <Section key={key} sectionKey={key} first={i === 0} />
        ))}
      </div>

      {/* Dock colapsado — ahora flotante abajo para no tapar el contenido */}
      {collapseProgress > 0.6 && (
        <div style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 'max(14px, env(safe-area-inset-bottom))',
          zIndex: 60,
          display: 'flex',
          justifyContent: 'center',
          opacity: (collapseProgress - 0.6) / 0.4,
          transform: `translateY(${(1 - ((collapseProgress - 0.6) / 0.4)) * 14}px)`,
          transition: 'opacity .24s ease, transform .24s ease',
          pointerEvents: 'none',
        }}>
          <Glass radius={28} strong
            style={{
              width: 'min(560px, calc(100vw - 24px))',
              height: 56,
              boxShadow: '0 18px 40px rgba(0,0,0,0.32)',
            }}
            inner={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingLeft: 6,
              paddingRight: 6,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(255,240,230,0.18), 0 2px 8px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}>
              <VideoSlot
                key={eatingSrc ? `dock-eat-${eatingSrc}` : 'dock-idle'}
                kind={eatingSrc ? 'eating' : 'idle'}
                src={eatingSrc ? eatingSrc.split('?')[0] : IDLE_VIDEO}
                startAt={eatingSrc ? 3 : 0}
                fade={!!eatingSrc}
              />
            </div>
            <div style={{ flex: 1, overflow: 'hidden', marginLeft: 6 }}>
              <OrbDock
                sections={SECTIONS}
                active={currentSection}
                onPick={(k) => { onEat(k); }}
                eatenSet={eatenSet}
              />
            </div>
          </Glass>
        </div>
      )}

      {/* Cafecito FAB persistente */}
      <FabCTA onClick={() => scrollToSection('cafecito')} />

      {/*
        Easter egg MODO HOMER: escucha el custom event `balosky:logo-click`
        (dispatcheado desde onLogoClick arriba) y si caen 10 taps en <4s
        abre la cortina teatral con overlay GeoCities. Componente 100%
        standalone — no necesita props y se auto-cleanupa.
      */}
      <ModoHomerEasterEgg />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section — header común + body según tipo
// ─────────────────────────────────────────────────────────────

function Section({ sectionKey, first }: { sectionKey: OrbitKey; first: boolean }) {
  const o: Orbit = T.orbits[sectionKey];
  // el data puede ser cualquiera de los tipos; casteamos ad hoc por sección
  const d = DATA[sectionKey] as unknown as { title?: string; body?: string };

  // IntersectionObserver para revelar la sección cuando entra en viewport.
  // La animación real vive en CSS — acá sólo togglemos la clase. Usamos ref
  // en el <section> así el header Y el body se animan juntos (quedan hijos
  // del mismo elemento observado).
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            node.classList.add('v2-reveal--visible');
            // Apuntamos a los hijos con v2-title-stroke también, porque el
            // keyframe stroke-fill necesita la clase en el mismo elemento
            // que tiene el color transparente.
            node.querySelectorAll('.v2-title-stroke').forEach((el) => {
              el.classList.add('v2-reveal--visible');
            });
            io.unobserve(node);
          }
        });
      },
      { threshold: 0.12, rootMargin: '-60px 0px -60px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const header = (
    <div style={{ marginBottom: 16, position: 'relative' }} data-section={sectionKey} id={`sec-${sectionKey}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Orb c1={o.c1} c2={o.c2} size={16} />
        <Eyebrow idx={o.idx} color={o.c1}>{o.label}</Eyebrow>
      </div>
      <h2
        className="v2-title-stroke"
        style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 58, fontWeight: 400, fontStyle: 'italic',
          letterSpacing: -1.5, margin: 0, lineHeight: 0.92, color: T.text,
        }}
      >{d.title ?? o.label}</h2>
      {d.body && (
        <p style={{
          marginTop: 12, marginBottom: 0,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14, lineHeight: 1.5, color: T.textMuted, maxWidth: 320,
        }}>{d.body}</p>
      )}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className="v2-reveal"
      style={{
        paddingTop: first ? 8 : 44,
        paddingBottom: 16,
        borderTop: first ? 'none' : `1px dashed ${T.hairline}`,
      }}
    >
      {header}
      <div style={{ marginTop: 16 }}>
        <SectionBody sectionKey={sectionKey} orbit={o} />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Momento — banda editorial "qué estoy haciendo ahora"
// ─────────────────────────────────────────────────────────────

/**
 * Formatea `updatedAt` (ISO YYYY-MM-DD) a "21 abr 2026".
 * Si el parse falla, devuelve el string original (defensive).
 */
function formatMomentDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/**
 * Parte la phrase en 3 tramos: antes del highlight, highlight, después.
 * Si `highlight` no aparece en `phrase`, devuelve toda la frase como "before".
 * Case-sensitive por diseño: el usuario escribe highlight con la capitalización
 * exacta que quiere que se pinte.
 */
function splitHighlight(phrase: string, highlight?: string) {
  if (!highlight) return { before: phrase, hit: '', after: '' };
  const i = phrase.indexOf(highlight);
  if (i < 0) return { before: phrase, hit: '', after: '' };
  return {
    before: phrase.slice(0, i),
    hit: highlight,
    after: phrase.slice(i + highlight.length),
  };
}

function Momento({ data }: { data: MomentData }) {
  // Reveal al entrar en viewport: misma mecánica que Section (IntersectionObserver
  // toggleando .v2-reveal--visible). El CSS ya está definido globalmente.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            node.classList.add('v2-reveal--visible');
            io.unobserve(node);
          }
        });
      },
      { threshold: 0.18, rootMargin: '-40px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const { before, hit, after } = splitHighlight(data.phrase, data.highlight);
  const dateLabel = formatMomentDate(data.updatedAt);
  // Acento cálido: usamos el c2 del orbe cafecito (amarillo miel profundo)
  // para el highlight, porque es el orbe que más representa "esto va al
  // cafecito/vida cotidiana de Santi". No el accent rojo-naranja que se
  // usa para CTAs; queremos que el highlight sea cálido, no urgente.
  const highlightColor = T.orbits.cafecito.c2;

  return (
    <section
      ref={ref}
      className="v2-reveal"
      aria-label="estado actual"
      style={{
        position: 'relative',
        width: '100%',
        padding: 'clamp(72px, 14vw, 140px) 22px',
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(255,226,204,0.05) 0%, transparent 60%),
          ${T.bg}
        `,
        borderTop: `1px solid ${T.hairline}`,
        borderBottom: `1px solid ${T.hairline}`,
        overflow: 'hidden',
      }}
    >
      {/* Textura sutil diagonal — le saca el aire "div con color de fondo"
         y lo lleva a un terreno más "página de revista impresa". */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: `repeating-linear-gradient(-10deg, ${T.text} 0 1px, transparent 1px 7px)`,
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 920,
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
        {/* Eyebrow: "· ahora ·" en mono chica */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          marginBottom: 'clamp(18px, 3vw, 28px)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase',
          color: T.textMuted,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: '50%',
            background: highlightColor,
            boxShadow: `0 0 12px ${highlightColor}88`,
            animation: 'momentPulse 2.4s ease-in-out infinite',
          }} />
          {data.label}
        </div>

        {/* Frase principal — tipografía editorial grande */}
        <p
          style={{
            margin: 0,
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(38px, 8.5vw, 92px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.02,
            color: T.text,
          }}
        >
          {before}
          {hit && (
            <span style={{
              color: highlightColor,
              // Subrayado sutil tipográfico — no el underline HTML feo, sino
              // un box-shadow que simula un lápiz pasado por encima.
              boxShadow: `inset 0 -0.14em 0 ${highlightColor}33`,
            }}>
              {hit}
            </span>
          )}
          {after}
        </p>

        {/* Footer editorial: fecha + link opcional */}
        {(dateLabel || data.href) && (
          <div style={{
            marginTop: 'clamp(24px, 4vw, 40px)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: T.textDim,
          }}>
            {dateLabel && (
              <span>actualizado · {dateLabel}</span>
            )}
            {data.href && (
              <a
                href={data.href}
                style={{
                  color: T.text,
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${T.hairlineStrong}`,
                  background: 'rgba(26,17,13,0.4)',
                  transition: 'background 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${highlightColor}18`;
                  e.currentTarget.style.borderColor = `${highlightColor}66`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(26,17,13,0.4)';
                  e.currentTarget.style.borderColor = T.hairlineStrong;
                }}
              >
                {data.hrefLabel ?? 'ver más →'}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionBody({ sectionKey, orbit }: { sectionKey: OrbitKey; orbit: Orbit }) {
  if (sectionKey === 'trabajo') {
    const d = DATA.trabajo;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.products.map((p, i) => <ProductCard key={i} product={p} accent={orbit} />)}
      </div>
    );
  }
  if (sectionKey === 'multimedia') {
    const d = DATA.multimedia;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FeaturedProjectCard project={d.featured} />
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: T.textDim, marginTop: 8, marginBottom: 2,
        }}>
          · otros proyectos · {d.projects.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {d.projects.map((p, i) => <ProjectThumb key={i} project={p} />)}
        </div>
      </div>
    );
  }
  if (sectionKey === 'club') {
    const d = DATA.club;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          letterSpacing: 1.5, textTransform: 'uppercase', color: T.textMuted, marginBottom: 6,
        }}>{d.body}</div>
        {d.plans.map((p, i) => <PlanCard key={i} plan={p} accent={orbit} />)}
      </div>
    );
  }
  if (sectionKey === 'fotos') {
    return <PhotoStrip images={DATA.fotos.images} />;
  }
  if (sectionKey === 'musica') {
    const d = DATA.musica;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {d.tracks.map((t, i) => <TrackRow key={i} track={t} accent={orbit} />)}
      </div>
    );
  }
  if (sectionKey === 'cafecito') {
    const d = DATA.cafecito;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {d.tiers.map((t, i) => <TipCard key={i} tier={t} />)}
      </div>
    );
  }
  if (sectionKey === 'ideas') {
    const d = DATA.ideas;
    return (
      <div style={{
        padding: '10px 14px', borderRadius: 999,
        border: `1px solid ${T.hairline}`, background: 'rgba(26,17,13,0.5)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        letterSpacing: 1.5, textTransform: 'uppercase', color: T.text,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: orbit.c2 }} />
        {d.status}
      </div>
    );
  }
  if (sectionKey === 'sobreMi') {
    const d = DATA.sobreMi;
    return (
      <button style={{
        padding: '10px 16px', borderRadius: 999, border: `1px solid ${orbit.c1}`,
        background: 'transparent', color: orbit.c1, cursor: 'pointer',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
        letterSpacing: 1.5, textTransform: 'uppercase',
      }}>{d.cta} →</button>
    );
  }
  return null;
}

function AbstractThumb({
  tone,
  compact = false,
}: {
  tone: string;
  compact?: boolean;
}) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 70% 30%, ${tone}${compact ? '55' : '66'} 0%, transparent 55%),
          linear-gradient(145deg, ${tone}22, ${T.bgDeep} 80%)
        `,
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: compact ? 0.15 : 0.18,
        backgroundImage: `repeating-linear-gradient(45deg, ${tone} 0 1px, transparent 1px ${compact ? 6 : 8}px)`,
      }} />
    </>
  );
}

function CoverImage({
  src,
  alt,
  overlay,
}: {
  src?: string;
  alt: string;
  overlay?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          filter: 'saturate(0.92) contrast(1.04) brightness(0.92)',
        }}
      />
      {overlay && <div style={{ position: 'absolute', inset: 0, ...overlay }} />}
    </>
  );
}

function CupGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M7 9.5h8.5a1.5 1.5 0 0 1 1.5 1.5v1a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-1A1.5 1.5 0 0 1 6.5 9.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M17 10h1.25A2.75 2.75 0 0 1 21 12.75 2.75 2.75 0 0 1 18.25 15H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 19h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 5.5c0 1-.7 1.3-.7 2.2M12 4.8c0 1-.7 1.3-.7 2.2M15 5.5c0 1-.7 1.3-.7 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function MateGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M8.5 8h7l-1 8.2a3 3 0 0 1-3 2.8h-0.2a3 3 0 0 1-3-2.8L8.5 8Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M14.5 4.5 17 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 8c.8-1 1.9-1.5 3.1-1.5 1 0 1.8.2 2.4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M8 20h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PizzaGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M4.5 7.5c4.4-2 10.6-2 15 0L12 20.5 4.5 7.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      <circle cx="9" cy="11" r="1.1" fill={T.bgDeep} />
      <circle cx="14.2" cy="10.8" r="1.1" fill={T.bgDeep} />
      <circle cx="12.2" cy="14.2" r="1.1" fill={T.bgDeep} />
    </svg>
  );
}

function TierGlyph({ tier }: { tier: CafecitoTier }) {
  const [failed, setFailed] = useState(false);
  if (tier.iconImage && !failed) {
    return (
      <img
        src={tier.iconImage}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: 22, height: 22, objectFit: 'contain' }}
      />
    );
  }

  if (tier.tag.includes('mate')) return <MateGlyph />;
  if (tier.tag.includes('pizza')) return <PizzaGlyph />;
  return <CupGlyph />;
}

// ─────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────

function ProductCard({ product, accent }: { product: Product; accent: Orbit }) {
  return (
    <Glass
      radius={22}
      strong
      style={{
        background: product.featured
          ? `radial-gradient(ellipse at 20% 0%, ${accent.c2}22 0%, transparent 60%), rgba(26,17,13,0.55)`
          : 'rgba(26,17,13,0.45)',
        boxShadow: product.featured
          ? `0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accent.c2}33`
          : '0 6px 20px rgba(0,0,0,0.3)',
      }}
      inner={{ padding: '18px 18px 20px', position: 'relative' }}
    >
      {product.badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          border: `1px solid ${accent.c2}66`,
          background: `${accent.c2}14`,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          letterSpacing: 1.5, textTransform: 'uppercase', color: accent.c1,
          marginBottom: 14,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent.c1 }} />
          {product.badge}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{
          margin: 0, fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: product.featured ? 36 : 22, fontWeight: 400, letterSpacing: -0.5,
          lineHeight: 1, color: T.text,
        }}>{product.name}</h3>
        {!product.featured && (
          <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 24, fontWeight: 400, color: T.text }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>$</span>{product.price}
          </div>
        )}
      </div>
      {product.meta && (
        <div style={{
          marginTop: 6, fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          letterSpacing: 1.5, textTransform: 'uppercase', color: T.textMuted,
        }}>{product.meta}</div>
      )}
      {product.tag && !product.featured && (
        <div style={{
          marginTop: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          letterSpacing: 1.5, textTransform: 'uppercase', color: T.textDim,
        }}>{product.tag}</div>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, color: T.textMuted }}>
        {product.desc}
      </p>
      {product.featured && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 48, fontWeight: 400, color: T.text, lineHeight: 1 }}>
            <span style={{ fontSize: 22, opacity: 0.6 }}>$</span>{product.price}
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
            letterSpacing: 1.5, textTransform: 'uppercase', color: T.textDim, marginTop: 4,
          }}>
            {product.unit}
          </div>
        </div>
      )}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <a
          href={product.href ?? '#'}
          style={{
            textDecoration: 'none',
            padding: '10px 16px', borderRadius: 999,
            background: product.featured
              ? `linear-gradient(180deg, ${accent.c1}, ${accent.c2})`
              : 'transparent',
            color: product.featured ? '#1a0d05' : T.text,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: 600,
            boxShadow: product.featured ? `0 6px 16px ${accent.c2}55` : 'none',
            border: product.featured ? 'none' : `1px solid ${T.hairlineStrong}`,
            display: 'inline-flex', alignItems: 'center',
          }}
        >{product.cta} →</a>
        {product.note && (
          <span style={{
            fontSize: 10, lineHeight: 1.35, color: T.textDim, flex: 1,
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            {product.note}
          </span>
        )}
      </div>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// FeaturedProjectCard
// ─────────────────────────────────────────────────────────────

function FeaturedProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <a href={`#${project.slug}`} style={{ textDecoration: 'none' }}>
      <Glass
        radius={22} strong
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${project.thumbTone}22 0%, transparent 60%), rgba(26,17,13,0.5)`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${project.thumbTone}33`,
        }}
        inner={{ padding: 0, overflow: 'hidden', borderRadius: 22 }}
      >
        <div style={{
          width: '100%', aspectRatio: '16/10', position: 'relative',
        }}>
          <AbstractThumb tone={project.thumbTone} />
          <CoverImage
            src={project.imageUrl}
            alt={project.title}
            overlay={{
              background: 'linear-gradient(180deg, rgba(10,6,5,0.08) 0%, rgba(10,6,5,0.22) 100%)',
            }}
          />
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            border: `0.5px solid ${project.thumbTone}66`,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase',
            color: project.thumbTone, fontWeight: 600,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: project.thumbTone }} />
            destacado
          </div>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 54, height: 54, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
            border: '0.5px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}>▶</div>
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: 1.5, color: '#fff', opacity: 0.85,
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}>
            {project.duration}
          </div>
        </div>
        <div style={{ padding: '16px 16px 18px' }}>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: 1.5, color: T.textDim,
            textTransform: 'uppercase', marginBottom: 6,
          }}>{project.subtitle}</div>
          <h3 style={{
            margin: 0, fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 28, fontWeight: 400, letterSpacing: -1,
            lineHeight: 1, color: T.text,
          }}>{project.title}</h3>
          <p style={{
            margin: '10px 0 0', fontSize: 12, lineHeight: 1.45, color: T.textMuted,
          }}>{project.desc}</p>
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 9, letterSpacing: 1.5, color: T.textDim,
              textTransform: 'uppercase',
            }}>{project.assetsCount} assets</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 10, letterSpacing: 1.5, color: project.thumbTone,
              textTransform: 'uppercase', fontWeight: 600,
            }}>ver proyecto →</div>
          </div>
        </div>
      </Glass>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// ProjectThumb
// ─────────────────────────────────────────────────────────────

function ProjectThumb({ project }: { project: Project }) {
  return (
    <a href={`#${project.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        width: '100%', aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden',
        position: 'relative',
        boxShadow: `0 4px 14px rgba(0,0,0,0.3), 0 0 0 0.5px ${T.hairline}`,
      }}>
        <AbstractThumb tone={project.thumbTone} compact />
        <CoverImage
          src={project.imageUrl}
          alt={project.title}
          overlay={{
            background: 'linear-gradient(180deg, rgba(10,6,5,0.02) 0%, rgba(10,6,5,0.32) 100%)',
          }}
        />
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 8,
        }}>▶</div>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '16px 10px 10px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)',
        }}>
          <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.2,
            marginBottom: 2,
          }}>{project.title}</div>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 8, letterSpacing: 1.2, color: T.textMuted,
            textTransform: 'uppercase',
          }}>{project.meta}</div>
        </div>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// PlanCard
// ─────────────────────────────────────────────────────────────

function PlanCard({ plan, accent }: { plan: ClubPlan; accent: Orbit }) {
  return (
    <Glass
      radius={18}
      style={{
        background: plan.recommended
          ? `linear-gradient(145deg, ${accent.c2}1a, rgba(26,17,13,0.5))`
          : 'rgba(26,17,13,0.4)',
        boxShadow: plan.recommended
          ? `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent.c2}44`
          : '0 4px 14px rgba(0,0,0,0.25)',
      }}
      inner={{ padding: '14px 16px', position: 'relative' }}
    >
      {plan.recommended && (
        <div style={{
          position: 'absolute', top: -1, right: 16,
          padding: '3px 8px',
          background: accent.c2, color: '#1a0d05',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 400,
          borderRadius: '0 0 6px 6px',
        }}>recomendada</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, fontWeight: 400, color: T.text }}>
          {plan.name}
        </h3>
        <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', color: T.text }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>$</span>
          <span style={{ fontSize: 28, fontWeight: 400 }}>{plan.price}</span>
          <span style={{ fontSize: 10, opacity: 0.5, fontFamily: '"JetBrains Mono", monospace' }}> /mes</span>
        </div>
      </div>
      <p style={{ margin: '4px 0 10px', fontSize: 12, color: T.textMuted, lineHeight: 1.4 }}>{plan.desc}</p>
      <button style={{
        padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
        color: T.textMuted, fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        letterSpacing: 1.5, textTransform: 'uppercase',
      }}>elegir →</button>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// PhotoStrip — carrusel horizontal
// ─────────────────────────────────────────────────────────────

function PhotoStrip({ images }: { images: PhotoItem[] }) {
  return (
    <div>
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10,
        scrollSnapType: 'x mandatory',
      }}>
        {images.map((img, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 110, height: 140, borderRadius: 10,
            overflow: 'hidden', position: 'relative',
            border: `1px solid ${T.hairline}`,
            scrollSnapAlign: 'start',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(145deg, ${img.tone}66, ${T.bgDeep})`,
            }} />
            <CoverImage
              src={img.imageUrl}
              alt={img.label}
              overlay={{
                background: 'linear-gradient(180deg, rgba(10,6,5,0.04) 0%, rgba(10,6,5,0.38) 100%)',
              }}
            />
            <div style={{
              position: 'absolute', inset: 0, opacity: img.imageUrl ? 0.08 : 0.25,
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 6px)',
            }} />
            <div style={{
              position: 'absolute', left: 8, bottom: 8,
              fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
              color: '#fff', letterSpacing: 1, textTransform: 'uppercase',
            }}>{img.label}</div>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '12px', borderRadius: 999,
        background: 'transparent', border: `1px solid ${T.hairline}`,
        color: T.text, fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
        marginTop: 8,
      }}>deslizá para ver más →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TrackRow
// ─────────────────────────────────────────────────────────────

function TrackRow({ track, accent }: { track: Track; accent: Orbit }) {
  const [failed, setFailed] = useState(false);
  const hasCover = !!track.coverImage && !failed;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 14,
      background: T.panel, border: `1px solid ${T.hairline}`,
    }}>
      {hasCover ? (
        <img
          src={track.coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            width: 40, height: 40, borderRadius: 10, objectFit: 'cover',
            boxShadow: `0 0 0 1px ${T.hairline}, 0 8px 16px rgba(0,0,0,0.28)`,
          }}
        />
      ) : (
        <button style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${accent.c1}, ${accent.c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1a0d05', fontSize: 12, paddingLeft: 2,
        }}>▶</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: 600, color: T.text }}>{track.name}</div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          letterSpacing: 1.5, textTransform: 'uppercase', color: T.textDim, marginTop: 2,
        }}>
          {track.album} · {track.time}
        </div>
      </div>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
        letterSpacing: 1.5, textTransform: 'uppercase', color: T.textMuted,
      }}>play ›</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TipCard (cafecito)
// ─────────────────────────────────────────────────────────────

function TipCard({ tier }: { tier: CafecitoTier }) {
  return (
    <a
      href={`/checkout?mode=tip&amount=${tier.price.replace('.', '')}`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: T.panel, border: `1px solid ${T.hairline}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,240,230,0.05)', border: `1px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.text,
        }}><TierGlyph tier={tier} /></div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
            letterSpacing: 1.5, textTransform: 'uppercase', color: T.textDim,
          }}>
            {tier.idx} · {tier.tag}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, fontWeight: 400, color: T.text }}>
              <span style={{ fontSize: 12, opacity: 0.6 }}>$</span>{tier.price}
            </span>
            <span style={{ fontSize: 11, color: T.textMuted }}>{tier.name}</span>
          </div>
        </div>
        <span style={{ fontSize: 16, color: T.textMuted }}>→</span>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Keyframes inyectadas como <style>
// ─────────────────────────────────────────────────────────────

const keyframesCss = `
@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33%      { transform: translate(6px, -10px) rotate(2deg); }
  66%      { transform: translate(-6px, 6px) rotate(-2deg); }
}
@keyframes orbPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240,122,62,0.0); }
  50%      { box-shadow: 0 0 0 6px rgba(240,122,62,0.15); }
}

/* Puntito del eyebrow de "El Momento" — respira sutil para señalar que
   la página está "viva ahora", no un snapshot muerto. */
@keyframes momentPulse {
  0%, 100% { transform: scale(1);    opacity: 0.9; }
  50%      { transform: scale(1.25); opacity: 1;   }
}

/*
  Scroll reveals — baseline de v2 (no depende de wakefulness).
  Las secciones arrancan "acostadas" (opacity 0, trasladadas hacia abajo)
  y se despiertan cuando la clase .v2-reveal--visible entra en el DOM
  vía IntersectionObserver. Corre desde el arranque para que el visitante
  sienta el ritmo editorial de entrada.
*/
.v2-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}
.v2-reveal.v2-reveal--visible {
  opacity: 1;
  transform: translateY(0);
}

/*
  Stroke-fill en los títulos de sección — animación signature de balosky.com,
  reacomodada a la paleta chocolate. Aparece primero como outline calado y se
  rellena al entrar en viewport.
*/
@keyframes v2StrokeFill {
  0% {
    -webkit-text-stroke: 1px rgba(245,237,228,0.55);
    color: transparent;
  }
  100% {
    -webkit-text-stroke: 1px transparent;
    color: var(--v2-text, #F5EDE4);
  }
}
.v2-title-stroke {
  color: transparent;
  -webkit-text-stroke: 1px rgba(245,237,228,0.55);
}
.v2-title-stroke.v2-reveal--visible {
  animation: v2StrokeFill 1.6s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

/* Respeta prefers-reduced-motion: bypass total. */
@media (prefers-reduced-motion: reduce) {
  .v2-reveal, .v2-title-stroke {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
    color: var(--v2-text, #F5EDE4) !important;
    -webkit-text-stroke: 0 !important;
  }
}
`;
