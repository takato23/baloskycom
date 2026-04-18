import { useEffect, useState } from 'react';

/**
 * Port of `<section id="mira">` — the big "showreel" card.
 *
 * Faithful port of the markup. The static home has a real video element
 * wired to a custom scrubber + chapter buttons; here we keep the visual
 * and expose chapter-switching + a fake time ticker so the strip feels
 * alive. Plugging in a real video behind the scrubber is follow-up work.
 */

const CHAPTERS = [
  { n: '01', label: 'la idea' },
  { n: '02', label: 'demo' },
  { n: '03', label: 'estudio' },
  { n: '04', label: 'mezcla' },
];

const TOTAL_SECONDS = 138; // 02:18

function fmt(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function MiraSection() {
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(47);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setElapsed((s) => (s + 1) % TOTAL_SECONDS);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const pct = Math.min(100, (elapsed / TOTAL_SECONDS) * 100);

  const togglePlay = () => setPlaying((p) => !p);

  return (
    <section id="mira">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--violet)' }}>02 · MIRÁ</span>
            </div>
            <h2>el último<br /><em>showreel</em>.</h2>
          </div>
          <p>
            Documentamos el proceso. Detrás de cada canción, una decisión. Scrub, mirá, saltá de
            capítulo.
          </p>
        </div>

        <div className="reel-wrap reveal">
          <div className="reel-bg" />
          <div className="reel-vis" />
          <div className="reel-ov">
            <div className="reel-top">
              <div className="reel-tag">
                <span className="dot" />
                EP 06 · ESTUDIO · ABR 2026
              </div>
              <div className="reel-time">{fmt(elapsed)} / 02:18</div>
            </div>
            <button
              type="button"
              className="reel-play"
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              data-cursor={playing ? 'PAUSAR' : 'REPRODUCIR'}
              onClick={togglePlay}
            >
              {playing ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="reel-bottom">
              <div className="reel-title">
                <h3>
                  cómo sacamos el coro<br />
                  de "nadie escucha"
                </h3>
                <div className="reel-meta">14:32 min · 4 capítulos</div>
              </div>
              <div className="scrubber">
                <div className="fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="reel-chapters">
                {CHAPTERS.map((c, i) => (
                  <button
                    key={c.n}
                    type="button"
                    className={`chap${i === active ? ' active' : ''}`}
                    onClick={() => setActive(i)}
                  >
                    {c.n} · {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
