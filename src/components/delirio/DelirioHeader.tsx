import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';

/**
 * Links que apuntan a las secciones de la home. Se usan `<a href="/#...">`
 * (no react-router Links) para que, estando en otra ruta, un click haga un
 * full-nav a `/` y recién ahí el hash resuelva al anchor.
 *
 * **Historial de anchors**: `#apoya` y `#club` existían cuando teníamos
 * `ApoyaSection` + `ClubSection` separados. Desde la unificación en
 * `MonetizacionHub` ambos colapsaron a `#trabajemos`. Dejamos el span
 * `#club` dentro del hub para retrocompat de links viejos, pero en el nav
 * nuevo apuntamos directo a `#trabajemos`.
 *
 * `Laboratorio` es una ruta React → `<Link>`.
 */
const ANCHOR_LINKS = [
  { href: '/btv', label: 'BTV' },
  { href: '/productora', label: 'Productora' },
  { href: '/#trabajemos', label: 'Trabajemos' },
  { href: '/#vision', label: 'Trabajos' },
  { href: '/#ojo', label: 'Ojo' },
  { href: '/#sonido', label: 'Sonido' },
  { href: '/#redes', label: 'Redes' },
];

export default function DelirioHeader() {
  const location = useLocation();
  const { theme, setTheme } = useAppContext();
  const isHome = location.pathname === '/' || location.pathname === '/home-preview';
  const isProductora = location.pathname === '/productora';

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
    <nav className={isHome ? 'nav nav--home' : 'nav'} role="navigation" aria-label="Navegación principal">
      <a href="/" className="logo" aria-label="Balosky — inicio" onClick={handleLogoClick}>
        <span className="orbito" aria-hidden="true" />
        Balosky
      </a>

      <div className="nav-links">
        {ANCHOR_LINKS.map((l) => (
          <a key={l.href} href={l.href} aria-current={location.pathname === l.href ? 'page' : undefined}>
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
        {isProductora ? (
          <a
            className="pill-live pill-live--cta"
            href="/productora#consulta"
            data-cursor="HABLAR"
            aria-label="Contar proyecto"
          >
            <span className="pulse" aria-hidden="true" />
            <span>Contar proyecto</span>
          </a>
        ) : (
          <a
            className={isHome ? 'pill-live pill-live--compact' : 'pill-live'}
            href="/productora#consulta"
            data-cursor="BRIEF"
            aria-label="Contame tu proyecto"
          >
            <span className="pulse" aria-hidden="true" />
            <span>disponible para proyectos</span>
            {!isHome && (
              <>
                <span style={{ marginLeft: 6, color: 'rgba(24,210,196,0.7)' }}>·</span>
                <span style={{ color: 'rgba(24,210,196,0.8)' }}>trabajemos →</span>
              </>
            )}
          </a>
        )}
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
