import { Link, useLocation } from 'react-router-dom';

/**
 * MobileNav — barra inferior fija, sólo visible en mobile (≤720px).
 *
 * Reemplaza la navegación del top bar (que se oculta en mobile vía
 * `.nav-links { display: none }`) con accesos rápidos a las secciones
 * principales del home. Cada entry es un anchor `/#section` que al ser
 * tocado scrollea suavemente si ya estás en `/`, o navega a `/` primero
 * si estás en otra ruta (p.ej. /laboratorio).
 *
 * **Sin contador de online** (abr 2026): antes teníamos un chip con
 * "312" al final, pero en iPhones estrechos el divider + número quedaba
 * cortado visualmente. Santi lo pidió fuera — el top-pill ya muestra el
 * dot pulsante + contador compacto, así que tener dos era redundante.
 *
 * Sólo se renderiza cuando el viewport es mobile. Evita aparecer en admin
 * (el admin tiene su propia chrome) y en /agenda-publica (full-bleed).
 */

type NavEntry = {
  href: string;
  label: string;
  icon: string;
  /** Match against pathname when we're on a non-home route. */
  matchHome?: boolean;
};

/**
 * Nota histórica: antes la primera entry apuntaba a `/#apoya`. Ahora
 * `#trabajemos` contiene el presupuesto de edición IA y el cafecito queda
 * como botón de apoyo simple.
 */
const ENTRIES: NavEntry[] = [
  { href: '/btv',        label: 'BTV',     icon: '▣' },
  { href: '/productora', label: 'Prod',    icon: '►' },
  { href: '/#trabajemos', label: 'Presu',   icon: '♡' },
  { href: '/#ojo',        label: 'Ojo',     icon: '◉' },
  { href: '/#sonido',     label: 'Sonido',  icon: '♪' },
  { href: '/laboratorio', label: 'Lab',     icon: '◆' },
];

const HIDDEN_PATH_PREFIXES = ['/admin', '/agenda-publica', '/checkout'];

export default function MobileNav() {
  const location = useLocation();

  const hidden = HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (hidden) return null;

  const isLab = location.pathname === '/laboratorio';
  const isBtv = location.pathname === '/btv' || location.pathname === '/balosflix';
  const isProductora = location.pathname === '/productora';

  /* Si estás en / y hacés click en un anchor, el navegador no scrollea
   * porque la URL sólo cambia el hash. Forzamos el scroll nativo para
   * que funcione consistentemente en iOS Safari (que a veces ignora el
   * anchor jump cuando ya hay ruta actual). */
  const handleAnchorClick = (href: string) => (e: React.MouseEvent) => {
    if (!href.startsWith('/#')) return;
    if (location.pathname !== '/') return; // dejamos que el browser navegue
    e.preventDefault();
    const id = href.slice(2);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // update hash without triggering jump
      history.replaceState(null, '', href);
    }
  };

  return (
    <nav className="mobile-nav" role="navigation" aria-label="Navegación móvil">
      <ul>
        {ENTRIES.map((e) => {
          const active =
            (e.href === '/laboratorio' && isLab) ||
            (e.href === '/btv' && isBtv) ||
            (e.href === '/productora' && isProductora) ||
            false;
          const content = (
            <span className="mobile-nav__inner">
              <span className="mobile-nav__icon" aria-hidden="true">
                {e.icon}
              </span>
              <span className="mobile-nav__label">{e.label}</span>
            </span>
          );
          return (
            <li key={e.href}>
              {e.href.startsWith('/#') ? (
                <a
                  href={e.href}
                  onClick={handleAnchorClick(e.href)}
                  aria-current={active ? 'page' : undefined}
                >
                  {content}
                </a>
              ) : (
                <Link to={e.href} aria-current={active ? 'page' : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
