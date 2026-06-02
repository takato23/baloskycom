import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import {
  CAFECITOS_TOTAL_AMOUNT,
  CAFECITOS_TOTAL_COUNT,
  CAFECITOS_UNIQUE_SUPPORTERS,
} from '@/content/cafecitos';

/**
 * Port of the `<footer>` block from delirio.html — same markup and class
 * names so `src/styles/delirio.css` styles it without extra work.
 *
 * Differences from the static version:
 * - The "Plataforma" column adds a `Laboratorio` entry (new React route).
 * - The newsletter form is wired to `api.subscribeNewsletter` so it
 *   actually persists (the static one is a no-op).
 */
export default function DelirioFooter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'dup' | 'err'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.subscribeNewsletter(email, 'footer_delirio');
      if (res.duplicate) {
        setStatus('dup');
        setMessage('Ya estabas. Gracias por el doble intento ✦');
      } else {
        setStatus('ok');
        setMessage('Listo. Te escribo pronto.');
      }
      setEmail('');
    } catch (err) {
      setStatus('err');
      setMessage(err instanceof Error ? err.message : 'No pude suscribirte. Probá de nuevo.');
    }
  };

  const msgColor =
    status === 'ok' || status === 'dup'
      ? 'var(--teal)'
      : status === 'err'
        ? 'var(--accent)'
        : 'rgba(243,239,230,0.6)';

  return (
    <footer>
      <div className="wrap">
        <div className="foot-big">balosky.com</div>

        <div
          style={{
            marginTop: 30,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 30,
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              maxWidth: 500,
              color: 'rgba(243,239,230,0.72)',
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Edición visual con IA, archivo creativo y cafecitos para sostener lo que hago.
            BA, 2026.
          </p>
          <a className="cta cta-primary" href="/cafecito">
            <span>Invitame un cafecito</span>
            <span className="arr">→</span>
          </a>
        </div>

        <div className="foot-grid">
          <div />
          <div className="foot-col">
            <h5>Plataforma</h5>
            <a href="/#trabajemos">Trabajemos</a>
            <a href="/#vision">Visión</a>
            <a href="/#ojo">Ojo</a>
            <a href="/#sonido">Sonido</a>
            <a href="/#muro">Muro</a>
            <Link to="/laboratorio">Laboratorio</Link>
            <a href="/#archivo">Archivo</a>
          </div>
          <div className="foot-col">
            <h5>Escuchame</h5>
            <a href="https://open.spotify.com/artist/balosky" target="_blank" rel="noopener noreferrer">
              Spotify
            </a>
            <a href="https://music.apple.com/ar/artist/balosky" target="_blank" rel="noopener noreferrer">
              Apple Music
            </a>
            <a href="https://youtube.com/@santiagobalosky" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>
            <a href="/#sonido">SUNO</a>
          </div>
          <div className="foot-col">
            <h5>Seguime</h5>
            <a href="https://instagram.com/santiagobalosky" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://instagram.com/fotobalosky" target="_blank" rel="noopener noreferrer">
              @fotobalosky
            </a>
            <a href="https://twitch.tv/balosky" target="_blank" rel="noopener noreferrer">
              Twitch
            </a>
            <a href="https://tiktok.com/@santiagobalosky" target="_blank" rel="noopener noreferrer">
              TikTok
            </a>
            <a href="mailto:hola@balosky.com">Mail</a>
          </div>
        </div>

        <div className="nl-block">
          <div className="nl-lead">
            <h4>Carta del Delirio</h4>
            <p>
              Un mail cada tanto. Adelantos, cosas que no subo a redes y lo que esté grabando.
              Cero spam, prometo.
            </p>
          </div>
          <div>
            <form className="nl-form" onSubmit={submit} noValidate autoComplete="off">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
                required
                aria-label="Email"
                disabled={status === 'loading'}
              />
              <button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? '...' : 'Sumarme'}
              </button>
            </form>
            <div
              className="nl-msg"
              role="status"
              aria-live="polite"
              style={{ color: msgColor, minHeight: 20, marginTop: 10, fontSize: 12 }}
            >
              {message}
            </div>
          </div>
        </div>

        <div className="fun-stats">
          <div className="fs-item">
            <div className="fs-label">Cafecitos registrados</div>
            <div className="fs-val">{CAFECITOS_TOTAL_COUNT}</div>
            <svg className="spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,22 12,18 24,20 36,12 48,14 60,8 72,10 84,6 96,9 108,5 120,2"
              />
            </svg>
          </div>
          <div className="fs-item">
            <div className="fs-label">Personas únicas</div>
            <div className="fs-val">{CAFECITOS_UNIQUE_SUPPORTERS}</div>
            <svg className="spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                fill="none"
                stroke="var(--teal)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,20 20,22 40,14 60,18 80,8 100,12 120,6"
              />
            </svg>
          </div>
          <div className="fs-item">
            <div className="fs-label">Total Cafecito</div>
            <div className="fs-val">
              ${(CAFECITOS_TOTAL_AMOUNT / 1_000_000).toFixed(2)}M
            </div>
            <svg className="spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                fill="none"
                stroke="var(--magenta)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,24 10,16 20,20 30,10 40,12 50,6 60,14 70,8 80,4 90,10 100,3 110,7 120,1"
              />
            </svg>
          </div>
          <div className="fs-item">
            <div className="fs-label">Mensajes destacados</div>
            <div className="fs-val">30</div>
            <svg className="spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,25 15,22 30,18 45,14 60,15 75,10 90,8 105,6 120,3"
              />
            </svg>
          </div>
        </div>

        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Santiago Balosky</span>
          <span>Mercado Pago · ARS / USD</span>
          <span>
            <Link to="/admin/login" style={{ color: 'inherit' }}>
              Admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
