import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';

/**
 * Links that point to home-page anchor sections. These live in the static
 * `delirio.html` served by Express for `/`, so we use plain `<a href="/#...">`
 * tags (not react-router Links) to force a full page navigation. That lets
 * the anchor resolve once the static HTML's own JS wires scroll-to-section.
 *
 * `Laboratorio` is a React route, so it uses react-router.
 */
const ANCHOR_LINKS = [
  { href: '/#apoya', label: 'Apoyá' },
  { href: '/#club', label: 'Club' },
  { href: '/#vision', label: 'Visión' },
  { href: '/#ojo', label: 'Ojo' },
  { href: '/#sonido', label: 'Sonido' },
  { href: '/#muro', label: 'Muro' },
  { href: '/#redes', label: 'Redes' },
];

/** Next Saturday at 22:00 local time — matches the logic in delirio.html. */
function nextSaturday(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay(); // 0 sun .. 6 sat
  let add = (6 - day + 7) % 7;
  if (add === 0 && now.getHours() >= 22) add = 7;
  d.setDate(d.getDate() + add);
  d.setHours(22, 0, 0, 0);
  return d;
}

function formatCountdown(target: Date): string {
  const t = target.getTime() - Date.now();
  if (t <= 0) return 'live LIVE';
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `prox. live ${d}d ${h % 24}h`;
  }
  return `prox. live ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DelirioHeader() {
  const location = useLocation();
  const { theme, setTheme } = useAppContext();

  const [countdown, setCountdown] = useState(() => formatCountdown(nextSaturday()));
  const [online, setOnline] = useState(312);

  // Live countdown — recomputes every second.
  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextSaturday()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Rolling "online" counter — matches the 4.8s cadence of the static home.
  useEffect(() => {
    const id = window.setInterval(() => {
      setOnline(300 + Math.floor(Math.random() * 40));
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  // Dark ↔ Light quick toggle (the full 5-theme picker lives in <ThemeFab />).
  const toggleQuick = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const isLaboratorio = location.pathname === '/laboratorio';

  /**
   * Logo click — dispatches `balosky:logo-click` for the MODO HOMER easter egg
   * (ModoHomerEasterEgg listens for 10 rapid clicks). On the React preview
   * route we preventDefault + scroll to top so the click-counter can actually
   * accumulate; everywhere else we let the anchor navigate home naturally.
   */
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    window.dispatchEvent(new Event('balosky:logo-click'));
    if (location.pathname === '/home-preview' || location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="nav" role="navigation" aria-label="Navegación principal">
      <a href="/" className="logo" aria-label="Balosky — inicio" onClick={handleLogoClick}>
        <span className="orbito" aria-hidden="true" />
        Balosky
      </a>

      <div className="nav-links">
        {ANCHOR_LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            <span className="nav-inner">
              <span className="txt">{l.label}</span>
              <span className="txt-alt">{l.label}</span>
            </span>
          </a>
        ))}
        <Link
          to="/laboratorio"
          aria-current={isLaboratorio ? 'page' : undefined}
          style={isLaboratorio ? { color: 'var(--black)' } : undefined}
        >
          <span className="nav-inner">
            <span className="txt">Laboratorio</span>
            <span className="txt-alt">Laboratorio</span>
          </span>
        </Link>
      </div>

      <div className="nav-right">
        <div className="pill-live" data-cursor="LIVE">
          <span className="pulse" aria-hidden="true" />
          <span>{online} online</span>
          <span style={{ marginLeft: 6, color: 'rgba(24,210,196,0.7)' }}>·</span>
          <span style={{ color: 'rgba(24,210,196,0.8)' }}>{countdown}</span>
        </div>
        <button
          className="mode-btn"
          onClick={toggleQuick}
          aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          type="button"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="3.5" />
            <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11l-1.06-1.06" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
