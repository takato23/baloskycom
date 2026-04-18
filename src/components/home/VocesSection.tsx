/**
 * Port of `<section id="voces">` — testimonial strip.
 */

type Testi = { name: string; quote: string; dur: string; delay: number };

const TESTIS: Testi[] = [
  {
    name: 'Florencia M.',
    quote: '"Siento que estoy parte del proceso, no solo escuchando."',
    dur: '0:14',
    delay: 0,
  },
  {
    name: 'Juan K · Rosario',
    quote: '"Los voice-notes me dan ganas de seguir."',
    dur: '0:22',
    delay: -2,
  },
  { name: 'Luz R.', quote: '"Aporté para el disco y lo siento mío también."', dur: '0:09', delay: -4 },
  {
    name: 'Camila V.',
    quote: '"El encargo que hice lo escucho todos los días."',
    dur: '0:18',
    delay: -6,
  },
  { name: 'Matías · La Plata', quote: '"Ser Baloskier es estar adentro del laboratorio."', dur: '0:26', delay: -8 },
  { name: 'Romi G.', quote: '"Nunca me sentí tan cerca de un artista."', dur: '0:12', delay: -10 },
];

export default function VocesSection() {
  return (
    <section id="voces" style={{ paddingTop: 60 }}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--gold)', color: '#0a0908' }}>
                03b · VOCES
              </span>
            </div>
            <h2>los que<br /><em>ya están</em>.</h2>
          </div>
          <p>
            Voice-notes que dejan los Baloskiers. Pronto vas a poder escucharlos
            acá; por ahora son los textos.
          </p>
        </div>

        <div className="testi-strip">
          {TESTIS.map((t, i) => (
            <div key={i} className="testi">
              <div className="viz" style={{ animationDelay: `${t.delay}s` }} />
              <div className="tm-dur">{t.dur}</div>
              <div className="meta">
                <div className="n">{t.name}</div>
                <div className="q">{t.quote}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
