/**
 * Legacy section kept off the current home. If it is re-enabled, keep it
 * aligned with the current positioning: edición IA + presupuesto, not direct
 * purchase packages.
 */

type Package = {
  id: string;
  eyebrow: string;
  length: string; // "15s", "30s", "50s+"
  priceFrom: number; // ARS mínimo del rango
  priceTo?: number; // ARS máximo (opcional si es fijo)
  description: string;
  bullets: string[];
  tint: 'orange' | 'violet' | 'teal';
  featured?: boolean;
};

const PACKAGES: Package[] = [
  {
    id: 'reel',
    eyebrow: 'Reel · IG/TikTok',
    length: '15s',
    priceFrom: 50000,
    priceTo: 70000,
    description: 'Video corto con material propio, referencias o una idea suelta.',
    bullets: [
      'Dirección visual + edición',
      '1 ronda de revisión',
      'Formatos vertical y cuadrado',
      'Entrega en 5 días',
    ],
    tint: 'orange',
  },
  {
    id: 'spot',
    eyebrow: 'Pieza visual',
    length: '30s',
    priceFrom: 120000,
    description: 'Para una escena, portada animada o video más trabajado.',
    bullets: [
      'Concepto + storyboard detallado',
      '2 rondas de revisión',
      'Música / sfx incluidos',
      'Export vertical y horizontal',
      'Entrega en 7–10 días',
    ],
    tint: 'violet',
    featured: true,
  },
  {
    id: 'historia',
    eyebrow: 'Historia · pieza larga',
    length: '50s+',
    priceFrom: 200000,
    description: 'Para una idea narrativa, archivo personal o secuencia completa.',
    bullets: [
      'Desarrollo de concepto y guion',
      '3 rondas de revisión',
      'Música original / sfx',
      'Export multi-formato',
      'Entrega en 2 semanas',
    ],
    tint: 'teal',
  },
];

function formatARS(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

function priceLabel(p: Package): string {
  if (p.priceTo && p.priceTo !== p.priceFrom) {
    return `${formatARS(p.priceFrom)}–${formatARS(p.priceTo)}`;
  }
  return `desde ${formatARS(p.priceFrom)}`;
}

const BUDGET_FORM_URL = '/#trabajemos';

export default function EncargosIASection() {
  return (
    <section id="encargos">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--accent)' }}>
                04b · ENCARGOS
              </span>
            </div>
            <h2>
              ¿querés uno<br />
              <em>con mi mirada</em>?
            </h2>
          </div>
          <p>
            Hago videos y fotos intervenidas con IA por encargo. Me mandás
            idea, presupuesto aproximado y referencias; te respondo con
            alcance, precio y tiempos.
          </p>
        </div>

        <div
          className="encargos-grid reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          {PACKAGES.map((p) => (
            <article
              key={p.id}
              className={`encargo-card ${p.featured ? 'encargo-card--featured' : ''}`}
              style={{
                position: 'relative',
                padding: '28px 26px',
                borderRadius: 20,
                border: p.featured
                  ? '1px solid var(--accent)'
                  : '1px solid rgba(243,239,230,0.14)',
                background: p.featured
                  ? 'linear-gradient(180deg, rgba(250,93,41,0.08), rgba(250,93,41,0.02))'
                  : 'rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {p.featured && (
                <div
                  className="t-mono"
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 20,
                    padding: '3px 10px',
                    background: 'var(--accent)',
                    color: 'var(--black)',
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    borderRadius: 999,
                  }}
                >
                  Más pedido
                </div>
              )}

              <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  className="t-eyebrow"
                  style={{ color: `var(--${p.tint}, var(--accent))` }}
                >
                  {p.eyebrow}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontWeight: 900,
                    fontSize: 'clamp(28px, 3.4vw, 38px)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {p.length}
                </div>
              </header>

              <div
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(22px, 2.6vw, 30px)',
                  letterSpacing: '-0.02em',
                  color: 'var(--accent)',
                }}
              >
                {priceLabel(p)}
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.75, margin: 0 }}>
                {p.description}
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        marginTop: 7,
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: 'var(--accent)',
                        opacity: 0.7,
                      }}
                    />
                    <span style={{ opacity: 0.85 }}>{b}</span>
                  </li>
                ))}
              </ul>

              <a
                href={BUDGET_FORM_URL}
                className="cta cta-primary"
                data-cursor="PEDIR"
                style={{
                  marginTop: 'auto',
                  justifyContent: 'center',
                  background: p.featured ? 'var(--accent)' : 'transparent',
                  color: p.featured ? 'var(--black)' : 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                <span>Pedir presupuesto</span>
                <span className="arr">↗</span>
              </a>
            </article>
          ))}
        </div>

        <div
          className="reveal"
          style={{
            marginTop: 32,
            padding: '22px 26px',
            borderRadius: 16,
            border: '1px dashed rgba(243,239,230,0.18)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <div className="t-eyebrow" style={{ color: 'var(--muted)' }}>
              ¿Proyecto más grande?
            </div>
            <p style={{ fontSize: 15, margin: '6px 0 0', opacity: 0.85 }}>
              Escena larga, varias piezas o algo difícil de explicar. Lo
              cotizo a medida antes de cobrar.
            </p>
          </div>
          <a
            href={BUDGET_FORM_URL}
            className="cta cta-ghost"
            data-cursor="PRESU"
          >
            <span>Mandar presupuesto</span>
            <span className="arr">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
