import { useEffect, useRef, useState } from 'react';

/**
 * Port of `<section id="muro">` — live wall.
 *
 * Faithful markup port. The leaderboard + feed are still static; the public
 * post form mirrors the static home (`#muroForm` in delirio.html / wired in
 * `public/delirio-wire.js`). Submits to `POST /api/messages` with a hidden
 * honeypot (`website`) — server returns 204 if a bot fills it in, so the UI
 * shows "ok" either way to avoid leaking the heuristic. A full realtime
 * websocket + pin-message hookup plus admin wiring are follow-up work.
 */

type Row = { rank: string; name: string; amt: string; kind: string };
type FeedPart = { text: string; strong?: boolean };
type Entry = { id: string; mk: string; parts: FeedPart[]; time: string };

const TOP: Row[] = [
  { rank: '01', name: 'Florencia M.', amt: '$180k', kind: 'ÓRBITA' },
  { rank: '02', name: 'JuanK (Rosario)', amt: '$145k', kind: 'ENCARGO' },
  { rank: '03', name: 'Luz R.', amt: '$96k', kind: 'DISCO' },
  { rank: '04', name: 'Matías B.', amt: '$82k', kind: 'ÓRBITA' },
  { rank: '05', name: 'Camila V.', amt: '$75k', kind: 'ENCARGO' },
  { rank: '06', name: 'Lucho P.', amt: '$64k', kind: 'CAFECITO' },
  { rank: '07', name: 'Nico (Cba)', amt: '$58k', kind: 'DISCO' },
  { rank: '08', name: 'Romi G.', amt: '$42k', kind: 'BASE' },
  { rank: '09', name: 'Axel T.', amt: '$38k', kind: 'CAFECITO' },
  { rank: '10', name: 'Sofi L.', amt: '$34k', kind: 'DISCO' },
];

const FEED: Entry[] = [
  {
    id: 'm1',
    mk: 'o',
    parts: [
      { text: 'Camila V.', strong: true },
      { text: ' aportó ' },
      { text: '$15k', strong: true },
      { text: ' al disco' },
    ],
    time: 'Hace 2 seg',
  },
  {
    id: 'm2',
    mk: 't',
    parts: [
      { text: 'Nico (Cba)', strong: true },
      { text: ' se sumó a Órbita' },
    ],
    time: 'Hace 18 seg',
  },
  {
    id: 'm3',
    mk: 'v',
    parts: [
      { text: 'Flor M.', strong: true },
      { text: ' dejó un mensaje: "Vamos con todo"' },
    ],
    time: 'Hace 45 seg',
  },
  {
    id: 'm4',
    mk: 'g',
    parts: [
      { text: 'Matías', strong: true },
      { text: ' escuchó "Nadie escucha" 3 veces seguidas' },
    ],
    time: 'Hace 1 min',
  },
  {
    id: 'm5',
    mk: 'm',
    parts: [
      { text: 'Romi G.', strong: true },
      { text: ' pidió encargo: dedicatoria' },
    ],
    time: 'Hace 2 min',
  },
];

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
            Apoyos, mensajes y reproducciones en tiempo real. El Top 10 se reacomoda solo. El feed
            de la derecha muestra cada aporte apenas entra.
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
                Top del mes
              </h3>
              <div className="t-eyebrow">Actualiza cada 5s</div>
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
              {FEED.map((e) => (
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
