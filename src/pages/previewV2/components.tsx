/**
 * Componentes compartidos de /preview-v2.
 * Portados desde balosky-design/components-shared.jsx + variant-a.jsx.
 *
 * Mantiene todo self-contained (sin dependencias de Tailwind) porque
 * lo visual está pensado como un "lienzo" de diseño separado del resto
 * del sitio — no queremos que estilos globales se filtren acá.
 */

import React, { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { TOKENS, type OrbitKey } from './tokens';

const T = TOKENS;

// ─────────────────────────────────────────────────────────────
// VideoSlot — loop idle o cola de "eating"
// ─────────────────────────────────────────────────────────────

interface VideoSlotProps {
  kind: 'look' | 'idle' | 'eating';
  src: string;
  rounded?: number;
  startAt?: number;   // para 'eating': segundos antes del final donde arranca
  fade?: boolean;     // fade-in al arrancar
  style?: CSSProperties;
  videoStyle?: CSSProperties;
}

export function VideoSlot({
  kind, src, style, videoStyle, rounded = 0, startAt = 0, fade = false,
}: VideoSlotProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(!fade);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setVisible(!fade);
    v.load();

    const seekToTail = () => {
      if (startAt > 0 && v.duration && isFinite(v.duration)) {
        const target = Math.max(0, v.duration - startAt);
        try { v.currentTime = target; } catch { /* ignore */ }
      }
      if (fade) requestAnimationFrame(() => setVisible(true));
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    if (v.readyState >= 1 && v.duration && isFinite(v.duration)) {
      seekToTail();
      return;
    }
    const onLoaded = () => { seekToTail(); };
    v.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [src, startAt, fade]);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#0A0605', overflow: 'hidden', borderRadius: rounded, ...style,
    }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay muted loop={kind !== 'eating'} playsInline
        preload="auto"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          objectPosition: 'center center',
          opacity: visible ? 1 : 0,
          transition: fade ? 'opacity .35s ease-out' : 'none',
          ...videoStyle,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Glass — liquid-glass reutilizable (blur + tint + fresnel + rim)
// ─────────────────────────────────────────────────────────────

interface GlassProps {
  children?: ReactNode;
  radius?: number;
  tint?: string;
  strong?: boolean;
  style?: CSSProperties;
  inner?: CSSProperties;
}

export function Glass({
  children, radius = 18, tint = 'rgba(255, 240, 230, 0.04)',
  strong = false, style, inner,
}: GlassProps) {
  return (
    <div style={{
      position: 'relative', borderRadius: radius, overflow: 'hidden',
      isolation: 'isolate',
      ...style,
    }}>
      {/* capa 1: blur + tint base */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        backdropFilter: `blur(${strong ? 24 : 16}px) saturate(160%)`,
        WebkitBackdropFilter: `blur(${strong ? 24 : 16}px) saturate(160%)`,
        background: tint,
      }} />
      {/* capa 2: fresnel diagonal */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,240,230,0.09) 0%, rgba(255,240,230,0) 35%, rgba(255,240,230,0) 65%, rgba(255,240,230,0.04) 100%)',
        pointerEvents: 'none',
      }} />
      {/* capa 3: especular superior */}
      <div style={{
        position: 'absolute', top: 0, left: '6%', right: '6%', height: '38%',
        borderRadius: `${radius}px ${radius}px 0 0`,
        background: 'linear-gradient(180deg, rgba(255,240,230,0.08) 0%, rgba(255,240,230,0) 100%)',
        pointerEvents: 'none', filter: 'blur(0.5px)',
      }} />
      {/* capa 4: rim (inset shadows + hairline) */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        boxShadow: `
          inset 0 1px 0 rgba(255,240,230,0.14),
          inset 0 -1px 0 rgba(0,0,0,0.35),
          inset 1px 0 0 rgba(255,240,230,0.06),
          inset -1px 0 0 rgba(0,0,0,0.25)
        `,
        border: '0.5px solid rgba(255,240,230,0.12)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, ...inner }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SphereVisual — capas compartidas entre Orb y FabCTA.
// Modelo mental: pompa de jabón / burbuja de cristal soplado.
//   · NO es una pelota sólida. Es vidrio semi-transparente con luz
//     atravesando (highlight frontal + transmisión trasera).
//   · Iridiscencia en el rim (conic fresnel), no boxShadow pesado.
//   · Halo gaseoso más grande y suave ⇒ se siente aérea, no maciza.
// ─────────────────────────────────────────────────────────────

function SphereVisual({ c1, c2, size }: { c1: string; c2: string; size: number }) {
  const haloSize = size * 2.3;
  return (
    <>
      {/* (0) Halo gaseoso — difuso, grande, se derrama */}
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: '50%',
        width: haloSize, height: haloSize,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle,
          ${c2}55 0%,
          ${c2}2e 16%,
          ${c1}1e 32%,
          ${c2}10 52%,
          transparent 72%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />

      {/* (1) Cuerpo translúcido — menos opaco que una pelota,
         bordes más saturados (fresnel) y centro casi claro */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle at 36% 30%,
          rgba(255,255,255,0.55) 0%,
          ${c1}99 18%,
          ${c1}66 36%,
          ${c2}55 62%,
          ${c2}88 88%,
          ${c2}aa 100%)`,
        boxShadow: `
          inset 0 0 0 0.5px rgba(255,255,255,0.22),
          inset 2px 4px 12px rgba(255,255,255,0.26),
          inset -2px -5px 14px ${c2}55
        `,
      }} />

      {/* (2) Transmisión — la luz "atraviesa" la pompa y rebota
         del lado opuesto al highlight, como en pompas reales */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle at 72% 72%,
          ${c1}66 0%,
          ${c1}22 22%,
          transparent 46%)`,
        mixBlendMode: 'screen',
      }} />

      {/* (3) Iridiscencia del rim — fresnel tipo pompa de jabón.
         Masked a los últimos ~20% del radio para que NO contamine
         el centro y se quede como un aro iridiscente. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `conic-gradient(from 180deg,
          rgba(180,220,255,0) 0deg,
          rgba(180,220,255,0.26) 45deg,
          rgba(255,210,240,0.22) 110deg,
          rgba(210,255,220,0.18) 180deg,
          rgba(255,230,180,0.22) 250deg,
          rgba(180,220,255,0.26) 315deg,
          rgba(180,220,255,0) 360deg)`,
        mixBlendMode: 'screen', opacity: 0.85,
        WebkitMaskImage: 'radial-gradient(circle, transparent 56%, black 78%, black 94%, transparent 100%)',
        maskImage: 'radial-gradient(circle, transparent 56%, black 78%, black 94%, transparent 100%)',
      }} />

      {/* (4) Highlight grande y suave (la fuente de luz) */}
      <div aria-hidden style={{
        position: 'absolute', top: '8%', left: '18%',
        width: '46%', height: '34%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.38) 42%, rgba(255,255,255,0) 78%)',
        filter: 'blur(1.5px)',
      }} />

      {/* (5) Highlight agudo (punto especular chiquito y brillante) */}
      <div aria-hidden style={{
        position: 'absolute', top: '15%', left: '28%',
        width: '10%', height: '8%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 72%)',
      }} />
    </>
  );
}

interface OrbProps {
  c1: string;
  c2: string;
  size?: number;
  label?: string;
  onClick?: () => void;
  style?: CSSProperties;
  eaten?: boolean;
  pulse?: boolean;
}

export function Orb({
  c1, c2, size = 60, label, onClick, style, eaten = false, pulse = false,
}: OrbProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%', border: 'none',
        padding: 0, cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        background: 'transparent',
        transition: 'transform .3s cubic-bezier(.2,.9,.3,1.2), opacity .35s',
        transform: eaten ? 'scale(0) rotate(360deg)' : 'scale(1)',
        opacity: eaten ? 0 : 1,
        animation: pulse ? 'orbPulse 2.4s ease-in-out infinite' : undefined,
        // drop-shadow hace que la sombra respete el recorte circular,
        // a diferencia de box-shadow que mostraría un halo cuadrado
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))',
        ...style,
      }}
    >
      <SphereVisual c1={c1} c2={c2} size={size} />
      {label && (
        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: Math.max(7, size * 0.12), fontWeight: 500,
          color: 'rgba(255, 250, 245, 0.96)',
          letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap',
          textShadow: `0 1px 3px rgba(0,0,0,0.7), 0 0 10px ${c2}88`,
          zIndex: 2,
        }}>{label}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// OrbDock — bolitas chicas alineadas (sticky cuando colapsa el hero)
// ─────────────────────────────────────────────────────────────

interface OrbDockProps {
  sections: OrbitKey[];
  active: OrbitKey | null;
  onPick: (k: OrbitKey) => void;
  eatenSet: Set<OrbitKey>;
}

export function OrbDock({ sections, active, onPick, eatenSet }: OrbDockProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', height: 56, boxSizing: 'border-box',
      justifyContent: 'space-between',
      width: '100%',
      overflow: 'visible',
      touchAction: 'pan-y',
      pointerEvents: 'none',
    }}>
      {sections.map(k => {
        const o = T.orbits[k];
        const isActive = active === k;
        const isEaten = eatenSet.has(k);
        return (
          <div key={k} style={{
            position: 'relative', flexShrink: 0,
            transform: isActive ? 'translateY(-2px) scale(1.15)' : 'scale(1)',
            transition: 'transform .35s cubic-bezier(.2,.9,.3,1.2)',
            pointerEvents: 'auto',
          }}>
            <Orb c1={o.c1} c2={o.c2} size={28} onClick={() => onPick(k)} eaten={isEaten} pulse={isActive} />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FloatingOrbs — las bolitas que orbitan la cabeza del video
// ─────────────────────────────────────────────────────────────

interface OrbPosition {
  key: OrbitKey;
  x: string;
  y: string;
  size: number;
  delay: number;
}

// Columnas a los costados — NADA tapa la cara.
// Izquierda: x ~2–14% (con el tamaño del orbe, derrama hasta ~25%).
// Derecha:  x ~76–86% (con el tamaño, derrama hasta ~97%).
// Franja central (30–70%) queda totalmente libre para el video.
const ORB_POSITIONS: OrbPosition[] = [
  // Columna IZQUIERDA (4 orbes, distribución vertical)
  { key: 'ideas',      x: '4%',  y: '18%', size: 50, delay: 0.6 },
  { key: 'trabajo',    x: '8%',  y: '40%', size: 48, delay: 1.2 },
  { key: 'cafecito',   x: '3%',  y: '60%', size: 42, delay: 1.8 },
  { key: 'club',       x: '10%', y: '80%', size: 44, delay: 2.1 },
  // Columna DERECHA (4 orbes, distribución vertical)
  { key: 'sobreMi',    x: '76%', y: '16%', size: 56, delay: 0   },
  { key: 'musica',     x: '82%', y: '36%', size: 50, delay: 1.5 },
  { key: 'multimedia', x: '74%', y: '58%', size: 58, delay: 0.3 },
  { key: 'fotos',      x: '84%', y: '80%', size: 42, delay: 0.9 },
];

interface FloatingOrbsProps {
  onPick: (k: OrbitKey) => void;
  eatenSet: Set<OrbitKey>;
}

export function FloatingOrbs({ onPick, eatenSet }: FloatingOrbsProps) {
  // "boca aprox" = centro abajo del video
  const mouthX = '50%';
  const mouthY = '78%';
  return (
    <>
      {ORB_POSITIONS.map(p => {
        const o = T.orbits[p.key];
        const isEaten = eatenSet.has(p.key);
        const dx = `calc(${mouthX} - ${p.x})`;
        const dy = `calc(${mouthY} - ${p.y})`;
        return (
          <div key={p.key} style={{
            position: 'absolute', left: p.x, top: p.y,
            pointerEvents: 'auto',
            animation: isEaten ? 'none' : `orbFloat ${4 + p.delay}s ease-in-out infinite`,
            animationDelay: `-${p.delay}s`,
            transition: 'transform .55s cubic-bezier(.5,.05,.7,.5), opacity .2s .45s',
            transform: isEaten ? `translate(${dx}, ${dy}) scale(0.25)` : 'translate(0,0)',
            opacity: isEaten ? 0 : 1,
            zIndex: isEaten ? 5 : 2,
          }}>
            <Orb c1={o.c1} c2={o.c2} size={p.size} eaten={false}
              onClick={() => onPick(p.key)} label={o.label} />
          </div>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// LogoM — la "m" manuscrita en un dot de glass
// ─────────────────────────────────────────────────────────────

export function LogoM({
  size = 36,
  onClick,
}: {
  size?: number;
  /**
   * Si se pasa, el logo es clickeable. En /preview-v2 cableamos este onClick
   * a dos cosas: (a) dispatchear `balosky:logo-click` para que el easter egg
   * ModoHomer escuche la secuencia de 10 taps; (b) resetear el nivel de
   * despertar ("volver al silencio"). Ver PreviewV2.tsx.
   */
  onClick?: () => void;
}) {
  const content = (
    <span style={{
      fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic',
      fontSize: size * 0.58, color: T.text, fontWeight: 400, lineHeight: 1,
    }}>m</span>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        aria-label="reset"
        style={{
          padding: 0, border: 'none', background: 'transparent',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Glass
          radius={size / 2}
          style={{ width: size, height: size }}
          inner={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          {content}
        </Glass>
      </button>
    );
  }
  return (
    <Glass
      radius={size / 2}
      style={{ width: size, height: size }}
      inner={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
    >
      {content}
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// Eyebrow — "01 · sobre mí"
// ─────────────────────────────────────────────────────────────

export function Eyebrow({
  idx, children, color = T.textMuted,
}: { idx: string; children: ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
      color, marginBottom: 10,
    }}>
      <span style={{ opacity: 0.6 }}>{idx}</span>
      <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FabCTA — cafecito flotante
// ─────────────────────────────────────────────────────────────

export function FabCTA({ onClick }: { onClick?: () => void }) {
  // Cafecito: mismos hues que el orbe cafecito (amarillo miel) para que
  // se sienta parte de la familia — no un botón suelto. Usa SphereVisual
  // por debajo → se siente vidrioso, no de plástico.
  const size = 54;
  const { c1, c2 } = T.orbits.cafecito;
  return (
    <button
      onClick={onClick}
      aria-label="cafecito"
      style={{
        position: 'fixed', right: 18, bottom: 28, zIndex: 95,
        width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
        padding: 0, background: 'transparent',
        filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.45)) drop-shadow(0 4px 12px ' + c2 + '55)',
      }}
    >
      <SphereVisual c1={c1} c2={c2} size={size} />
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
        pointerEvents: 'none',
        zIndex: 2,
        color: 'rgba(22, 12, 6, 0.92)',
      }}>
        <svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42} aria-hidden="true">
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
      </span>
    </button>
  );
}
