import { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';

/**
 * Legacy section kept off the current home. If it is re-enabled from an older
 * route, it must still point to presupuesto + cafecito only.
 */

const APORTE_K = 50;
const DEFAULT_CAFECITO_AMOUNT = 3000;

export default function ApoyaSection() {
  const { settings } = useAppContext();
  const [clips, setClips] = useState(20);
  const [pressing, setPressing] = useState(10);
  const cafecitoAmount = Number(settings?.cafecito?.amount) > 0
    ? Number(settings.cafecito.amount)
    : DEFAULT_CAFECITO_AMOUNT;

  // Clamp dirección visual ≥ 10% by constraining the opposite slider when one moves.
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
            <div className="idx"><span className="badge">01 · PRESUPUESTO</span></div>
            <h2>edición IA,<br /><em>con presupuesto claro</em>.</h2>
          </div>
          <p>
            Me dejás qué querés editar, cuánto pensabas invertir y referencias.
            Te respondo alcance, tiempos y precio antes de cobrar nada.
          </p>
        </div>

        <div className="bento reveal">

          {/*
            Hero del bento: placeholder "próximamente". Queda como preview de
            cómo podría repartirse un encargo grande de edición IA.
          */}
          <div className="card c-hero" data-cursor="PRESUPUESTO" data-tilt>
            <span className="tag-sticker">PRESUPUESTO · EDICIÓN IA</span>
            <div>
              <h3>
                mandame la idea<br />
                y la cotizo.
              </h3>
              <p>
                Si tenés material, referencias o una escena en la cabeza, lo
                ordeno en una pieza posible. El pago directo que queda acá es
                el cafecito; los trabajos se presupuestan primero.
              </p>
            </div>
            <div>
              <div className="split-slider">
                <div className="sl-title">demo · cómo se reparte una pieza de edición IA</div>
                <div className="sl-bar">
                  <div className="sl-prod" style={{ flexBasis: `${prod}%` }}>
                    Dirección visual <span style={{ marginLeft: 6 }}>{prod}%</span>
                  </div>
                  <div className="sl-clips" style={{ flexBasis: `${clips}%` }}>
                    Edición <span style={{ marginLeft: 6 }}>{clips}%</span>
                  </div>
                  <div className="sl-press" style={{ flexBasis: `${pressing}%` }}>
                    IA <span style={{ marginLeft: 6 }}>{pressing}%</span>
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
                    <span style={{ minWidth: 44, color: 'var(--teal)' }}>Edición</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={clips}
                      onChange={(e) => handleClips(Number(e.target.value))}
                      aria-label="Porcentaje a edición"
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
                    <span style={{ minWidth: 56, color: 'var(--gold)' }}>IA</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={pressing}
                      onChange={(e) => handlePressing(Number(e.target.value))}
                      aria-label="Porcentaje a IA"
                    />
                  </label>
                </div>
                <div className="sl-note">
                  Ejemplo: para un trabajo de <b>${(APORTE_K * 1000).toLocaleString('es-AR')}</b>:{' '}
                  <b>${Math.round(breakdown.prod * 1000).toLocaleString('es-AR')}</b> a dirección ·{' '}
                  <b>${Math.round(breakdown.clips * 1000).toLocaleString('es-AR')}</b> a edición ·{' '}
                  <b>${Math.round(breakdown.pressing * 1000).toLocaleString('es-AR')}</b> a IA.
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
                  · para laburos reales, primero presupuesto ·
                </div>
                <a className="mini-btn" href="/cafecito">apoyar con cafecito →</a>
              </div>
            </div>
          </div>

          <div className="card c-sm" data-cursor="CAFECITO" data-tilt>
            <span className="tag-sticker">CAFECITO · LISTA DE HONOR</span>
            <h3>invitame un cafecito</h3>
            <p>Entrás a la lista de donantes del muro. Gratitud directa, en vivo.</p>
            <div className="foot">
              <div className="price">${cafecitoAmount.toLocaleString('es-AR')}<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/cafecito">elegir →</a>
            </div>
          </div>

          <div className="card c-md" data-cursor="PEDIR" data-tilt>
            <span className="tag-sticker">ENCARGO · REEL IA</span>
            <h3>reel con IA</h3>
            <p>Me pasás material o referencias y lo bajo a una pieza vertical.</p>
            <div className="foot">
              <div className="price">a cotizar<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/#prepedido-custom">pedir →</a>
            </div>
          </div>

          <div className="card c-accent" data-cursor="PRESU" data-tilt>
            <span className="tag-sticker">FOTOS · EDICIÓN IA</span>
            <h3>fotos intervenidas</h3>
            <p>
              Selección, intervención visual y export final según el uso que
              necesites.
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
              · trabajo solo con material propio o autorizado ·
            </p>
            <div className="foot">
              <div className="price">a cotizar<span className="u"> ARS</span></div>
              <a className="mini-btn" href="/#prepedido-custom">pedir →</a>
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
              PRESUPUESTO · CHARLEMOS
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
                <h3 style={{ color: '#0a0908' }}>armemos la pieza que tenés en la cabeza.</h3>
                <p style={{ color: 'rgba(10,9,8,0.78)', maxWidth: 620 }}>
                  Video, foto, escena, portada o archivo familiar intervenido
                  con IA y edición. Me pasás presupuesto aproximado y te digo
                  qué se puede hacer.
                </p>
              </div>
              <div className="foot" style={{ justifyContent: 'flex-end' }}>
                <div className="price" style={{ color: '#0a0908', fontSize: 52 }}>
                  a medida<span className="u"> ARS</span>
                </div>
                <a
                  className="mini-btn"
                  href="/#prepedido-consultoria"
                  style={{ background: '#0a0908', color: '#18D2C4' }}
                >
                  charlar →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
