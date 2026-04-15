import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Music, Wand2, Lightbulb, Briefcase, ArrowRight, Sun, Moon } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import MusicPlayerDock from '@/components/music/MusicPlayerDock';
import KonamiEasterEgg from '@/components/effects/KonamiEasterEgg';
import { useMagnetic } from '@/hooks/useMagnetic';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAgendaPublica = location.pathname === '/agenda-publica';
  const { settings, darkMode, toggleDarkMode } = useAppContext();

  const footerTitleRef = useMagnetic<HTMLParagraphElement>(200, 0.3);
  const reducedMotion = usePrefersReducedMotion();

  const [navHidden, setNavHidden] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Single consolidated scroll listener: nav hide + scrolledPast flag + desktop skew
  useEffect(() => {
    const isDesktop = window.innerWidth >= 769;
    const skewEnabled = isDesktop && !reducedMotion;

    let lastY = window.scrollY;
    let rafPending = false;
    let skewRaf = 0;
    let currentSkew = 0;
    let settling = false;

    const settleSkew = () => {
      currentSkew += (0 - currentSkew) * 0.1;
      if (contentRef.current) {
        contentRef.current.style.transform = Math.abs(currentSkew) > 0.01
          ? `skewY(${currentSkew}deg)` : '';
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

      setNavHidden(y > lastY && y > 200);
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
  }, [reducedMotion]);

  const navItems = [
    { to: '/#courses', icon: GraduationCap, label: 'Cursos' },
    { to: '/#music', icon: Music, label: 'Música' },
    { to: '/checkout', icon: Wand2, label: 'Encargos' },
    { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  ];

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace('#', '');
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (element) {
        const header = document.querySelector('header');
        const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 72;
        const targetTop =
          window.scrollY + element.getBoundingClientRect().top - headerHeight - 20;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth',
        });
      }
    });
  }, [location.hash, location.pathname]);

  return (
    <MusicPlayerProvider content={settings?.content.home.music}>
      <div className="theme-shell min-h-screen flex flex-col transition-colors duration-500 bg-[var(--white)] text-[var(--black)] overflow-x-hidden">
      {/* Page transition wipe */}
      <div
        className={cn(
          "fixed inset-0 z-[9999] pointer-events-none",
          transitioning ? "page-wipe-active" : "page-wipe-idle"
        )}
      >
        <div className="page-wipe-bar" />
      </div>

      <header className={cn("theme-header sticky top-0 z-50 backdrop-blur-xl border-b border-[var(--black)]/10 bg-[var(--white)]/90 transition-transform duration-300", navHidden ? '-translate-y-full' : 'translate-y-0')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.5rem] min-h-[4.5rem] flex items-center justify-between gap-6">
          <Link to="/" className="flex items-baseline gap-0.5 group shrink-0">
            <span
              className="font-black tracking-[-0.04em] text-[1.75rem] sm:text-[2rem] leading-none text-[var(--black)] transition-colors group-hover:text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-display, Inter Tight), Inter, sans-serif' }}
            >
              balosky
            </span>
            <span className="font-black text-[1.75rem] sm:text-[2rem] leading-none text-[var(--accent)]">
              *
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = item.to.startsWith('/#')
                  ? location.pathname === '/' && location.hash === item.to.slice(1)
                  : location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "text-[13px] font-medium tracking-tight px-3 py-2 transition-colors relative",
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--black)]/60 hover:text-[var(--black)]"
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute left-3 right-3 bottom-1 h-[2px] bg-[var(--accent)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center text-[var(--black)]/60 hover:text-[var(--black)] transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/checkout"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-black border border-[var(--accent)] text-sm font-semibold tracking-tight hover:bg-[var(--black)] hover:text-[var(--accent)] transition-colors"
            >
              Bancame <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        ref={contentRef}
        style={{ transformOrigin: 'center center' }}
        className={cn(
          "flex-1 w-full",
          isHome || isAgendaPublica ? "py-0" : "max-w-6xl mx-auto px-4 sm:px-6 py-8"
        )}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Gradient fade above nav */}
        <div className="h-6 bg-gradient-to-t from-[var(--white)] to-transparent pointer-events-none" />
        <div className="bg-[var(--white)]/95 backdrop-blur-2xl border-t border-[var(--border-solid)] pb-safe">
          <div className="flex items-center justify-around px-3 py-2">
            {navItems.map((item) => {
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : item.to.startsWith('/#')
                  ? location.pathname === '/' && location.hash === item.to.slice(1)
                  : location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-200 relative active:scale-90",
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--black)]/40 active:text-[var(--black)]/70"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-pill"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-[var(--accent)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.08em] transition-all duration-200",
                    isActive ? "opacity-100" : "opacity-60"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <footer className="bg-[var(--black)] text-[var(--white)] mt-auto" style={{ padding: 'clamp(40px, 8vh, 100px) clamp(20px, 4vw, 80px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 100px)' }}>
      <div className="max-w-[1400px] mx-auto grid gap-[60px] md:grid-cols-[1.2fr_1fr] items-start">
        <div>
          <p
            ref={footerTitleRef}
            className="t-hero text-[clamp(2rem,5vw,4rem)] leading-none mb-6"
            data-magnetic
          >
            Gracias por<br />bancar este<br /><em className="text-[var(--accent)] not-italic">delirio.</em>
          </p>
          <p className="t-body max-w-xl" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Cada aporte empuja algo.
          </p>
        </div>

        <div className="flex flex-col gap-8 md:items-end">
          <div className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="link-underline relative text-[11px] font-medium tracking-[0.2em] uppercase transition-colors text-[rgba(255,255,255,0.45)] hover:text-[var(--accent)]"
                data-hover
              >
                {item.label}
              </Link>
            ))}
          </div>
          {Object.keys(settings?.socialLinks || {}).length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end pt-8 border-t border-[rgba(255,255,255,0.06)] w-full">
              {Object.entries(settings?.socialLinks || {}).map(([key, value]) => (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline relative text-[11px] font-medium tracking-[0.2em] uppercase transition-colors text-[rgba(255,255,255,0.45)] hover:text-[var(--accent)]"
                  data-hover
                >
                  {key}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto mt-[60px] pt-6 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[rgba(255,255,255,0.2)]">
          &copy; {new Date().getFullYear()} balosky &mdash; {settings?.legalText || 'Pago seguro con Mercado Pago'}
        </p>
        <Link
          to="/admin/login"
          className="text-[11px] font-medium uppercase tracking-[0.15em] text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.5)] transition-colors"
        >
          Admin
        </Link>
      </div>
      </footer>
      <MusicPlayerDock hidden={isHome || isAgendaPublica} />
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "fixed right-4 sm:right-6 z-[9998] w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--black)] text-[var(--white)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white",
          "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:bottom-6",
          scrolledPast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
        data-hover
        aria-label="Back to top"
      >
        ↑
      </button>
      <KonamiEasterEgg />
      </div>
    </MusicPlayerProvider>
  );
}
