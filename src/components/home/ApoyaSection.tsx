import { useMemo, useState } from 'react';

/**
 * Port of `<section id="apoya">` from delirio.html.
 *
 * Phase 2.3 rehydration — the producción/clips/pressing split-slider is
 * now interactive. Two range inputs control clips% and pressing%;
 * producción = 100 − clips − pressing. The bar flex-basis animates to the
 * new values and the `$50k` note re-derives live. We clamp the two
 * secondary splits so producción never drops below 10% (studios can't be
 * funded with zero).
 */

const APORTE_K = 50;

export default function ApoyaSection() {
  const [clips, setClips] = useState(20);
  const [pressing, setPressing] = useState(10);

  // Clamp producción ≥ 10% by constraining the opposite slider when one moves.
  const handleClips = (v: number) => {
    const next = Math.max(0, Math.min(80, v));
    if (next + pressing > 90) setPressing(90 - next);
    setClips(next);
  };
  const handlePressing = (v: number) => {
    const next = Math.max(0, Math.min(80, v));
    if (next + clips > 90) setClips(90 - next);
    setPressing(next);
  };

  const prod = Math.max(0, 100 - clips - pressing);

  const breakdown = useMemo(
    () => ({
      prod: (APORTE_K * prod) / 100,
      clips: (APORTE_K * clips) / 100,
      pressing: (APORTE_K * pressing) / 100,
    }),
    [prod, clips, pressing],
  );

  return (
    <section id="apoya">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx"><span className="badge">01 · APOYÁ</span></div>
            <h2>cafecitos a<br /><em>aportes grandes</em>.</h2>
          </div>
          <p>
            Desde un café hasta producir un tema. Cada aporte tiene destino, tiempo y recompensa.
            Si no se cumple, se devuelve.
          </p>
        </div>

        <div className="bento reveal annot-wrap">
          <div className="annot-tl">¡MIRÁ ESTO!</div>

          {/*
            Hero del bento: demo de cómo va a funcionar el split de aportes
            cuando arranquemos una campaña real de disco. No hay `progress`,
            ni milestones activos, ni total recaudado — todo eso es falso
            mientras no haya una campaña backed en `campaigns` con fondos
            reales. Cuando arranque el disco, levantamos los datos desde
            /api/campaigns y esto se vuelve real.
          */}
          <div className="card c-hero" data-cursor="APORTAR" data-tilt>
            <span className="tag-sticker">PRÓXIMA CAMPAÑA · DISCO NUEVO</span>
            <div>
              <h3>
                disco nuevo.<br />
                así va a funcionar cuando lo lance.
              </h3>
              <p>
                Arrastrá los controles y decidí vos el split del aporte entre producción,
                clips y pressing. Si no se cumple la meta, se devuelve. Por ahora el mejor
                aporte libre es un cafecito ↓
              </p>
            </div>
            <div>
              <div className="split-slider">
                <div className="sl-title">demo interactivo · así elegís el split</div>
                <div className="sl-bar">
                  <div className="sl-prod" style={{ flexBasis: `${prod}%` }}>
                    Producción <span style={{ marginLeft: 6 }}>{prod}%</span>
                  </div>
                  <div className="sl-clips" style={{ flexBasis: `${clips}%` }}>
                    Clips <span style={{ marginLeft: 6 }}>{clips}%</span>
                  </div>
                  <div className="sl-press" style={{ flexBasis: `${pressing}%` }}>
                    Pressing <span style={{ marginLeft: 6 }}>{pressing}%</span>
                  </div>
                </div>
                <div className="sl-ctrls">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flex: 1,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span style={{ minWidth: 44, color: 'var(--teal)' }}>Clips</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={clips}
                      onChange={(e) => handleClips(Number(e.target.value))}
                      aria-label="Porcentaje a clips"
                    />
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flex: 1,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span style={{ minWidth: 56, color: 'var(--gold)' }}>Pressing</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={pressing}
                      onChange={(e) => handlePressing(Number(e.target.value))}
                      aria-label="Porcentaje a pressing"
                    />
                  </label>
                </div>
                <div className="sl-note">
                  Ejemplo: si aportás <b>${(APORTE_K * 1000).toLocaleString('es-AR')}</b>:{' '}
                  <b>${Math.round(breakdown.prod * 1000).toLocaleString('es-AR')}</b> a producción ·{' '}
                  <b>${Math.round(breakdown.clips * 1000).toLocaleString('es-AR')}</b> a clips ·{' '}
                  <b>${Math.round(breakdown.pressing * 1000).toLocaleString('es-AR')}</b> a pressing.
                </div>
              </div>

              <div className="foot">
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  · el disco arranca pronto · mientras tanto ↓ ·
                </div>
                <a className="mini-btn" href="/checkout?mode=cafecito">apoyar con cafecito →</a>
              </div>
            </div>
          </div>

          <div className="card c-sm" data-cursor="CAFECITO" data-tilt>
            <span className="tag-sticker">CAFECITO · LISTA DE HONOR</span>
            <h3>invitame un cafecito</h3>
            <p>Entrás a la lista de donantes del muro. Gratitud directa, en vivo.</p>
            <div className="foot">
              <div className="price">$2.000<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/checkout?mode=cafecito&amount=2000">elegir →</a>
            </div>
          </div>

          <div className="card c-md" data-cursor="PEDIR" data-tilt>
            <span className="tag-sticker">ENCARGO · CANCIÓN IA</span>
            <h3>canción con IA</h3>
            <p>Me pedís un tema, te lo hago con IA + mi producción. 72h de entrega.</p>
            <div className="foot">
              <div className="price">$25.000<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/checkout?amount=25000&mode=encargo">pedir →</a>
            </div>
          </div>

          <div className="card c-accent" data-cursor="PACK" data-tilt>
            <span className="tag-sticker">PACK · IMÁGENES IA</span>
            <h3>pack imágenes IA</h3>
            <p>
              Pack 5x · ideal para mejorar tu feed de Instagram o armar mini-sesiones. Consultá
              por más cantidad (10x $100.000).
            </p>
            <p
              style={{
                marginTop: 10,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              · no se pueden pedir fotos de famosos por cuestiones legales ·
            </p>
            <div className="foot">
              <div className="price">$80.000<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/api/checkout/quick?mode=pack-images">pedir →</a>
            </div>
          </div>

          <div
            className="card c-zoom"
            data-cursor="ZOOM"
            data-tilt
            style={{
              gridColumn: 'span 12',
              background: 'linear-gradient(135deg,#18D2C4,#0a7a6f)',
              color: '#0a0908',
              minHeight: 220,
            }}
          >
            <span
              className="tag-sticker"
              style={{ background: 'var(--gold)', color: 'var(--black)' }}
            >
              ZOOM · 45 MIN · PREMIUM
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: 24,
                alignItems: 'end',
              }}
            >
              <div>
                <h3 style={{ color: '#0a0908' }}>videollamada 1:1 · te enseño a usar IA.</h3>
                <p style={{ color: 'rgba(10,9,8,0.78)', maxWidth: 620 }}>
                  45 min por zoom donde te muestro flows reales de IA aplicados a lo que necesites:
                  música, imágenes, contenido, tu negocio, lo que te trabe. Sin vueltas, con
                  ejemplos concretos.
                </p>
              </div>
              <div className="foot" style={{ justifyContent: 'flex-end' }}>
                <div className="price" style={{ color: '#0a0908', fontSize: 52 }}>
                  $99.000<span className="u"> ARS</span>
                </div>
                <a
                  className="mini-btn"
                  href="/api/checkout/quick?mode=zoom"
                  style={{ background: '#0a0908', color: '#18D2C4' }}
                >
                  pedir →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
