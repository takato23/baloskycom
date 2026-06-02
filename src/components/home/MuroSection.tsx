import { useEffect, useMemo, useRef, useState } from 'react';
import { CAFECITOS_FEED, CAFECITOS_TOP } from '@/content/cafecitos';

/**
 * Port of `<section id="muro">` — live wall.
 *
 * TOP + FEED antes eran mockup (Florencia M., Camila V. aportó $15k al
 * disco…). Santi pidió sacar lo inventado y poner gente que realmente le
 * mandó cafecitos. Ahora TOP y FEED se hidratan desde
 * `@/content/cafecitos` (generado con `scripts/_build-cafecitos.mjs` desde
 * data/cafecitos.csv, export real de cafecito.app).
 *
 * Pulso en vivo: rotamos el feed cada 6s para dar la sensación de "algo
 * está pasando", aunque los datos sean históricos reales. Cuando
 * `/api/messages` devuelva los mensajes nuevos vía websocket, este feed
 * deja de rotar y va a mostrar los reales en tiempo real.
 *
 * El form debajo sigue posteando a `POST /api/messages` con honeypot.
 */

type Row = { rank: string; name: string; amt: string; kind: string };
type FeedPart = { text: string; strong?: boolean };
type Entry = { id: string; mk: string; parts: FeedPart[]; time: string };

// Los 5 "mark colors" del feed (naranja/teal/violeta/gris/magenta) siguen
// rotando para que cada entry tenga su punto distinto y no parezca un spam
// de colores iguales.
const MK_COLORS = ['o', 't', 'v', 'g', 'm'] as const;

function formatARS(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

function entryFromCafecito(
  c: (typeof CAFECITOS_FEED)[number],
  index: number,
): Entry {
  return {
    id: c.id,
    mk: MK_COLORS[index % MK_COLORS.length],
    parts: [
      { text: c.name, strong: true },
      { text: ' · ' },
      { text: formatARS(c.amount), strong: true },
      { text: ` — "${c.message}"` },
    ],
    time: c.ago,
  };
}

const TOP: Row[] = CAFECITOS_TOP;

type FormStatus = { text: string; tone: '' | 'ok' | 'err' };

export default function MuroSection() {
  const [online, setOnline] = useState(312);

  useEffect(() => {
    const id = window.setInterval(() => {
      // gentle drift so the pill looks alive but stays near 300
      setOnline((n) => {
        const delta = Math.round((Math.random() - 0.5) * 8);
        return Math.max(240, Math.min(380, n + delta));
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  // Rotamos la ventana de 5 mensajes visibles dentro de los 30 del CSV real,
  // corriendo el offset 1 por tick cada 6s. Sensación de "pulso en vivo"
  // sin inventar datos: todos los mensajes son de gente que realmente
  // mandó cafecito.
  const [feedOffset, setFeedOffset] = useState(0);
  useEffect(() => {
    if (CAFECITOS_FEED.length <= 5) return;
    const id = window.setInterval(() => {
      setFeedOffset((o) => (o + 1) % CAFECITOS_FEED.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const feedVisible = useMemo<Entry[]>(() => {
    if (CAFECITOS_FEED.length === 0) return [];
    const out: Entry[] = [];
    const windowSize = Math.min(5, CAFECITOS_FEED.length);
    for (let i = 0; i < windowSize; i++) {
      const src = CAFECITOS_FEED[(feedOffset + i) % CAFECITOS_FEED.length];
      out.push(entryFromCafecito(src, i));
    }
    return out;
  }, [feedOffset]);

  // ── Post form state ────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ text: '', tone: '' });
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const charCount = message.length;
  const counterClass =
    charCount > 220 ? 'is-bad' : charCount > 180 ? 'is-warn' : '';

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const trimmed = message.trim();
    const trimmedName = name.trim();

    if (trimmed.length < 2) {
      setStatus({ text: 'Escribí algo un poco más largo.', tone: 'err' });
      messageRef.current?.focus();
      return;
    }
    if (trimmed.length > 240) {
      setStatus({ text: 'Máximo 240 caracteres.', tone: 'err' });
      return;
    }

    setSubmitting(true);
    setStatus({ text: 'enviando…', tone: '' });

    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supporterName: trimmedName || '',
          message: trimmed,
          isAnonymous: !trimmedName,
          website, // honeypot
        }),
      });

      if (r.status === 204) {
        // honeypot tripped — show ok to avoid telling bots
        setStatus({ text: 'listo', tone: 'ok' });
        setName('');
        setMessage('');
        setWebsite('');
        setSubmitting(false);
        return;
      }
      if (r.status === 429) {
        setStatus({
          text: 'muchos mensajes en poco tiempo. probá en un rato.',
          tone: 'err',
        });
        setSubmitting(false);
        return;
      }
      if (!r.ok) {
        let errMsg = 'no se pudo enviar';
        try {
          const body = (await r.json()) as { error?: string } | null;
          if (body?.error) errMsg = body.error;
        } catch {
          /* ignore */
        }
        setStatus({ text: errMsg, tone: 'err' });
        setSubmitting(false);
        return;
      }

      setStatus({ text: 'listo, aparece arriba ✦', tone: 'ok' });
      setName('');
      setMessage('');
      setWebsite('');
      // small visual cooldown before re-enabling
      window.setTimeout(() => setSubmitting(false), 1200);
    } catch (e) {
      console.warn('[muro] submit error', e);
      setStatus({ text: 'error de red, probá de nuevo', tone: 'err' });
      setSubmitting(false);
    }
  };

  return (
    <section id="muro">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--accent)' }}>
                08 · MURO EN VIVO
              </span>
            </div>
            <h2>lo que pasa<br /><em>ahora mismo</em>.</h2>
          </div>
          <p>
            Cafecitos, mensajes y reproducciones en tiempo real. El Top 10 se reacomoda solo. El feed
            de la derecha muestra cada cafecito apenas entra.
          </p>
        </div>

        <div className="leader-wrap reveal">
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                position: 'relative',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Inter Tight',sans-serif",
                  fontWeight: 900,
                  fontSize: 26,
                  letterSpacing: '-0.03em',
                }}
              >
                Top cafecitos
              </h3>
              <div className="t-eyebrow">En vivo · cafecito</div>
              <div
                className="scrawl marker"
                style={{ position: 'absolute', top: -42, left: 180, transform: 'rotate(-6deg)' }}
              >
                ¡en vivo!
              </div>
              <div
                className="scrawl-arrow"
                style={{
                  position: 'absolute',
                  top: -28,
                  left: 310,
                  transform: 'rotate(200deg)',
                  color: 'var(--accent)',
                }}
              >
                ↷
              </div>
            </div>
            <div className="leader-list">
              {TOP.map((r) => (
                <div key={r.rank} className="leader-row">
                  <span className="rank">{r.rank}</span>
                  <span className="name">{r.name}</span>
                  <span className="amt">{r.amt}</span>
                  <span className="kind">{r.kind}</span>
                </div>
              ))}
            </div>
          </div>
          <aside className="feed-card">
            <div className="feed-head">
              <span className="t-mono">Pulso en vivo</span>
              <span className="t-mono" style={{ color: 'var(--teal)' }}>
                {online} online
              </span>
            </div>
            <div className="feed-stream">
              {feedVisible.map((e) => (
                <div key={e.id} className="feed-entry" data-id={e.id}>
                  <span className={`mk ${e.mk}`} />
                  <div className="body">
                    <div className="msg">
                      {e.parts.map((part, index) =>
                        part.strong ? <b key={index}>{part.text}</b> : <span key={index}>{part.text}</span>
                      )}
                    </div>
                    <div className="time">{e.time}</div>
                  </div>
                  <button type="button" className="pin" data-cursor="FAV" aria-label="Pin">
                    ★
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* MURO · dejar mensaje (público) — port of `#muroPost` */}
        <div className="muro-post reveal" id="muroPost">
          <div className="muro-post__head">
            <div className="t-mono" style={{ color: 'var(--accent)' }}>
              dejá un mensaje
            </div>
            <div
              className={`t-mono muro-post__counter ${counterClass}`.trim()}
              aria-live="polite"
            >
              {charCount} / 240
            </div>
          </div>
          <form
            className="muro-post__form"
            autoComplete="off"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="muro-post__row">
              <input
                type="text"
                name="supporterName"
                placeholder="nombre (opcional, si no va Anónimo)"
                maxLength={60}
                autoComplete="name"
                aria-label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="muro-post__row">
              <textarea
                ref={messageRef}
                name="message"
                placeholder="lo que quieras decir. 240 caracteres."
                rows={3}
                required
                maxLength={240}
                aria-label="Mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {/* honeypot — humanos no lo ven; si se llena, server ignora */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: -9999,
                top: -9999,
                height: 0,
                width: 0,
                overflow: 'hidden',
              }}
            >
              <label>
                Website (no llenar){' '}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            <div className="muro-post__foot">
              <div
                className={`muro-post__msg ${status.tone}`.trim()}
                role="status"
                aria-live="polite"
              >
                {status.text}
              </div>
              <button
                type="submit"
                className="muro-post__submit"
                data-cursor="ENVIAR"
                disabled={submitting}
              >
                enviar <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
