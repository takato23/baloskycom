/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * /preview-v2-tipo — comparador de tipografías para /preview-v2.
 *
 * Página lienzo aislada (no hereda Layout ni nav) que muestra 4 paneles
 * lado a lado con la misma copy renderizada en 4 familias distintas.
 * El objetivo es que Santi elija con los ojos qué fuente le queda
 * (sin tener que imaginarlo), antes de reemplazar Instrument Serif
 * como display de v2.
 *
 * No es una ruta "de producción" — solo existe durante esta iteración.
 * Cuando cerremos la elección, la borramos.
 *
 * Copy idéntico en los 4 paneles:
 *   Nombre:  "Balosky"                     ← tamaño hero (clamp 64-128px)
 *   Título:  "sobre mí"                    ← tamaño sección (clamp 44-72px)
 *   Momento: "estoy grabando mi segundo    ← frase editorial (clamp 28-56px)
 *            disco y durmiendo poco"          con "segundo disco" en miel.
 */

import React, { useEffect, type CSSProperties } from 'react';
import { TOKENS } from './previewV2/tokens';

const T = TOKENS;

// ─────────────────────────────────────────────────────────────
// Candidatas — metadata de cada opción
// ─────────────────────────────────────────────────────────────

interface FontOption {
  id: string;
  label: string;
  subtitle: string;
  pitch: string;
  stack: string;
  weight: number | string;
  style: 'normal' | 'italic';
  letterSpacing: string;
  /** font-variation-settings adicional para fuentes variables (Fraunces). */
  variationSettings?: string;
}

const OPTIONS: FontOption[] = [
  {
    id: 'instrument',
    label: 'Instrument Serif',
    subtitle: 'actual',
    pitch: 'serif italic educada. La tenés hace rato. Linda pero polite — no pega piñas.',
    stack: '"Instrument Serif", Georgia, serif',
    weight: 400,
    style: 'italic',
    letterSpacing: '-0.02em',
  },
  {
    id: 'playfair',
    label: 'Playfair Display Black',
    subtitle: 'editorial dramática',
    pitch: 'alto contraste, peso pesado, italic con swoosh. Te da aire revista vieja importante.',
    stack: '"Playfair Display", Georgia, serif',
    weight: 900,
    style: 'italic',
    letterSpacing: '-0.015em',
  },
  {
    id: 'fraunces',
    label: 'Fraunces 900 SOFT+WONK',
    subtitle: 'contemporánea con actitud',
    pitch: 'la pariente gratis de Migra. Swoosh raro, personalidad, sabe lo que quiere.',
    stack: '"Fraunces", Georgia, serif',
    weight: 900,
    style: 'italic',
    letterSpacing: '-0.03em',
    // SOFT max (más redonda) + WONK on (letras con swashes alternativos).
    variationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1',
  },
  {
    id: 'inter-tight',
    label: 'Inter Tight Black',
    subtitle: 'heavy sans al estilo viejo',
    pitch: 'la mano del sitio viejo que te enamoró. Sin serif, pesada, italic con bajada.',
    stack: '"Inter Tight", system-ui, sans-serif',
    weight: 900,
    style: 'italic',
    letterSpacing: '-0.04em',
  },
];

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export default function PreviewV2Tipo() {
  // Cargamos las 4 familias via Google Fonts en el <head>. Usamos link tags
  // dinámicos (no @import inline) para que el navegador priorice bien la
  // descarga y display=swap aplique. Al desmontar limpiamos.
  useEffect(() => {
    const hrefs = [
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap',
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap',
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400..900&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@1,900&display=swap',
    ];
    const links = hrefs.map((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-tipo-preview', '1');
      document.head.appendChild(link);
      return link;
    });
    // Preconnect — reduce latencia del primer request.
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    pre1.setAttribute('data-tipo-preview', '1');
    document.head.appendChild(pre1);
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = '';
    pre2.setAttribute('data-tipo-preview', '1');
    document.head.appendChild(pre2);

    return () => {
      [...links, pre1, pre2].forEach((l) => l.remove());
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.bg,
        color: T.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        padding: 'clamp(24px, 4vw, 56px) clamp(16px, 3vw, 40px)',
      }}
    >
      {/* Intro — instrucciones */}
      <header style={{
        maxWidth: 1400, margin: '0 auto clamp(32px, 5vw, 64px)',
        borderBottom: `1px solid ${T.hairline}`, paddingBottom: 24,
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          color: T.textMuted, marginBottom: 10,
        }}>
          · preview · tipografías candidatas ·
        </div>
        <h1 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic', fontWeight: 400,
          fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05,
          margin: 0, letterSpacing: '-0.01em', color: T.text,
        }}>
          ¿cuál te suena a vos?
        </h1>
        <p style={{
          margin: '12px 0 0', maxWidth: 680,
          fontSize: 14, lineHeight: 1.55, color: T.textMuted,
        }}>
          Cada panel es la misma copy en una fuente distinta. Fijate con cuál
          se te frunce el ojo — no el cerebro. La que mejor "suena" a lo que
          estás haciendo es la que ganó. Si ninguna te cierra, me decís y
          busco otras.
        </p>
      </header>

      {/* Grid de paneles */}
      <main style={{
        display: 'grid',
        gap: 'clamp(20px, 2.5vw, 36px)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        maxWidth: 1400, margin: '0 auto',
      }}>
        {OPTIONS.map((opt) => (
          <Panel key={opt.id} option={opt} />
        ))}
      </main>

      {/* Footer — cómo decidir */}
      <footer style={{
        maxWidth: 1400, margin: 'clamp(32px, 5vw, 64px) auto 0',
        paddingTop: 24, borderTop: `1px solid ${T.hairline}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
        color: T.textDim,
      }}>
        <span>· decidí con los ojos ·</span>
        <a href="/preview-v2" style={{
          color: T.text, textDecoration: 'none',
          padding: '8px 14px', borderRadius: 999,
          border: `1px solid ${T.hairlineStrong}`,
        }}>
          volver a v2 →
        </a>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Panel — una fuente, toda la copy
// ─────────────────────────────────────────────────────────────

function Panel({ option }: { option: FontOption }) {
  const common: CSSProperties = {
    fontFamily: option.stack,
    fontWeight: option.weight,
    fontStyle: option.style,
    letterSpacing: option.letterSpacing,
    ...(option.variationSettings
      ? ({ fontVariationSettings: option.variationSettings } as CSSProperties)
      : {}),
  };

  const highlightColor = T.orbits.cafecito.c2;

  return (
    <article style={{
      position: 'relative',
      borderRadius: 18,
      background: `
        radial-gradient(ellipse at 20% 0%, rgba(255,226,204,0.04) 0%, transparent 55%),
        ${T.panel}
      `,
      border: `1px solid ${T.hairline}`,
      boxShadow: '0 14px 40px rgba(0,0,0,0.28)',
      padding: 'clamp(24px, 3vw, 40px)',
      overflow: 'hidden',
    }}>
      {/* Metadata chiquita arriba */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        marginBottom: 'clamp(20px, 3vw, 32px)',
        paddingBottom: 14, borderBottom: `1px dashed ${T.hairline}`,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase',
          color: T.textMuted,
        }}>
          {option.label}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
          color: T.textDim,
        }}>
          · {option.subtitle}
        </span>
      </div>

      {/* Nombre grande (hero) */}
      <div
        style={{
          ...common,
          fontSize: 'clamp(56px, 9vw, 128px)',
          lineHeight: 0.9,
          color: T.text,
          marginBottom: 'clamp(18px, 3vw, 32px)',
        }}
      >
        Balosky
      </div>

      {/* Título de sección */}
      <div
        style={{
          ...common,
          fontSize: 'clamp(36px, 5.5vw, 72px)',
          lineHeight: 0.94,
          color: T.text,
          marginBottom: 'clamp(20px, 3vw, 36px)',
        }}
      >
        sobre mí
      </div>

      {/* Frase del Momento (con highlight) */}
      <p
        style={{
          ...common,
          fontSize: 'clamp(22px, 3.4vw, 48px)',
          lineHeight: 1.08,
          color: T.text,
          margin: 0,
          maxWidth: '100%',
        }}
      >
        estoy grabando mi{' '}
        <span style={{
          color: highlightColor,
          boxShadow: `inset 0 -0.14em 0 ${highlightColor}33`,
        }}>
          segundo disco
        </span>{' '}
        y durmiendo poco
      </p>

      {/* Pitch — qué feeling da esta fuente */}
      <p style={{
        marginTop: 'clamp(22px, 3vw, 36px)',
        paddingTop: 16, borderTop: `1px dashed ${T.hairline}`,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: 'normal', fontWeight: 400,
        fontSize: 13, lineHeight: 1.5, letterSpacing: 0,
        color: T.textMuted,
      }}>
        {option.pitch}
      </p>
    </article>
  );
}
