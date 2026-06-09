import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import MusicPlayerDock from '@/components/music/MusicPlayerDock';
import KonamiEasterEgg from '@/components/effects/KonamiEasterEgg';
import ModoHomerEasterEgg from '@/components/effects/ModoHomerEasterEgg';
// import MascotCompanion from '@/components/effects/MascotCompanion'; // Desactivado: distraía y no sumaba. Si querés volver a probar, descomentá esto y el render abajo.
import DelirioHeader from '@/components/delirio/DelirioHeader';
import DelirioFooter from '@/components/delirio/DelirioFooter';
import ProductoraFooter from '@/components/ProductoraFooter';
import DelirioCursor from '@/components/delirio/DelirioCursor';
import MobileNav from '@/components/delirio/MobileNav';
import ThemeFab from '@/components/delirio/ThemeFab';
import CafecitoBadge from '@/components/CafecitoBadge';
import LiquidChrome from '@/components/effects/LiquidChrome';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAdminNativeCursor } from '@/hooks/useAdminNativeCursor';

/**
 * Layout wraps every React-rendered route (everything that isn't the static
 * `/` Delirio home served by Express). After the Delirio-to-React migration
 * (Phase 1) this layout uses the Delirio chrome — `DelirioHeader`,
 * `DelirioFooter`, `DelirioCursor`, `ThemeFab` — so the transition between
 * `/` and e.g. `/laboratorio` feels like the same site.
 *
 * Admin routes opt out of the cursor + theme fab to keep form-heavy pages
 * legible, but they still inherit the theme tokens.
 */
export default function Layout() {
  const location = useLocation();
  const isAgendaPublica = location.pathname === '/agenda-publica';
  const isAdmin = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname.startsWith('/checkout');
  const isBtv = location.pathname === '/btv' || location.pathname === '/balosflix';
  const isProductora = location.pathname === '/productora';
  const isCameo = location.pathname === '/cameo';
  const isLaboratorio = location.pathname === '/laboratorio';
  // `/` y `/home-preview` renderizan el mismo HomePreview (Delirio home).
  // Ambos necesitan full-bleed para que el hero + secciones de media
  // lleguen a los bordes. Cuando se migró `/` de estático a React se
  // dejó pineado sólo `/home-preview`, así que en `/` la home se veía
  // "corrida" (max-w-6xl con gutter a los costados).
  const isHome = location.pathname === '/' || location.pathname === '/home-preview';
  // Full-bleed pages opt out of the inner max-width + padding so sections
  // like the Delirio hero can stretch edge-to-edge. Checkout también va
  // full-bleed: tiene su propio fondo oscuro `#0a0908` que necesita
  // llegar a los bordes en mobile (sino se ven tiras claras a los
  // costados — bug que se notaba como "se ve igual que desktop").
  const isFullBleed = isAgendaPublica || isHome || isCheckout || isBtv || isProductora || isCameo || isLaboratorio;
  const { settings } = useAppContext();

  const reducedMotion = usePrefersReducedMotion();
  const isMobileViewport = useIsMobile(761);

  const [scrolledPast, setScrolledPast] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const liquidChromeEnabled =
    !isAdmin &&
    !isCheckout &&
    !isAgendaPublica &&
    !isProductora &&
    !isCameo &&
    !isMobileViewport &&
    !reducedMotion;

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Scroll to top on route change (unless navigating to an anchor #section)
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Single consolidated scroll listener: scrolledPast flag + desktop skew
  useEffect(() => {
    const isDesktop = window.innerWidth >= 769;
    const skewEnabled = isDesktop && !reducedMotion && !isLaboratorio && !isAdmin;

    let lastY = window.scrollY;
    let rafPending = false;
    let skewRaf = 0;
    let currentSkew = 0;
    let settling = false;

    const settleSkew = () => {
      currentSkew += (0 - currentSkew) * 0.1;
      if (contentRef.current) {
        contentRef.current.style.transform =
          Math.abs(currentSkew) > 0.01 ? `skewY(${currentSkew}deg)` : '';
      }
      if (Math.abs(currentSkew) > 0.01) {
        skewRaf = requestAnimationFrame(settleSkew);
      } else {
        settling = false;
        if (contentRef.current) contentRef.current.style.transform = '';
      }
    };

    const flush = () => {
      rafPending = false;
      const y = window.scrollY;
      const velocity = y - lastY;

      setScrolledPast(y > window.innerHeight * 0.5);

      if (skewEnabled && contentRef.current) {
        const target = Math.max(-1.5, Math.min(1.5, velocity * 0.05));
        currentSkew += (target - currentSkew) * 0.15;
        contentRef.current.style.transform = `skewY(${currentSkew}deg)`;
        if (!settling) {
          settling = true;
          cancelAnimationFrame(skewRaf);
          skewRaf = requestAnimationFrame(settleSkew);
        }
      }

      lastY = y;
    };

    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(flush);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(skewRaf);
      if (contentRef.current) contentRef.current.style.transform = '';
    };
  }, [reducedMotion, isLaboratorio, isAdmin]);

  // Scroll to anchor targets — the fixed Delirio header is ~72px tall.
  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace('#', '');
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (!element) return;
      const header = document.querySelector('nav.nav');
      const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 72;
      const targetTop =
        window.scrollY + element.getBoundingClientRect().top - headerHeight - 20;
      window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
    });
  }, [location.hash, location.pathname]);

  useAdminNativeCursor(isAdmin);

  return (
    <MusicPlayerProvider content={settings?.content.home.music}>
      <div className="theme-shell min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">
        {/* Page transition wipe */}
        <div
          className={cn(
            'fixed inset-0 z-[9999] pointer-events-none',
            transitioning ? 'page-wipe-active' : 'page-wipe-idle',
          )}
        >
          <div className="page-wipe-bar" />
        </div>

        <DelirioHeader />

        <LiquidChrome enabled={liquidChromeEnabled} />

        {/* Main Content — .nav is position:fixed, so push content down by its
            height on non-full-bleed pages. Full-bleed (home-preview, agenda)
            pages handle their own top spacing (e.g. .hero has padding-top). */}
        <main
          ref={contentRef}
          style={{
            transformOrigin: 'center center',
            paddingTop: isFullBleed ? 0 : 'clamp(64px, 9vh, 96px)',
          }}
          className={cn(
            'flex-1 w-full',
            isFullBleed ? 'pb-0' : 'max-w-6xl mx-auto px-4 sm:px-6 pb-8',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.52, 0, 0, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {isProductora || isCameo ? <ProductoraFooter /> : <DelirioFooter />}

        <MusicPlayerDock hidden={isFullBleed} />

        {/* CafecitoBadge vive acá (fuera del <main>/<motion.div>) para que
            su `position: fixed` se ancle al viewport y no al containing
            block creado por el `transform` de framer-motion.
            · Sólo aparece en home (no queremos que flote en /fotos, /wallpapers,
              /checkout, /admin, etc.).
            · Se oculta después de ~1.6 viewports para que no persiga al user
              cuando está mirando las fotos o wallpapers en mobile.
            · Se esconde automáticamente si hay un modal/lightbox abierto
              (lo detecta el propio badge vía MutationObserver sobre body). */}
        {isHome && !isAdmin && !isCheckout && (
          <CafecitoBadge floating showAfterScroll={isMobileViewport ? 520 : 640} />
        )}

        <KonamiEasterEgg />
        <ModoHomerEasterEgg />
        {/* Mascotita desactivada — distraía. Para reactivar, descomentá el import arriba y la línea de abajo. */}
        {/* {!isHome && !isBtv && <MascotCompanion />} */}

        {/* Delirio chrome — hide cursor + theme fab inside admin. */}
        {!isAdmin && <DelirioCursor />}
        {!isAdmin && !isHome && !isProductora && <ThemeFab />}
        {!isAdmin && !isHome && <MobileNav />}
      </div>
    </MusicPlayerProvider>
  );
}
