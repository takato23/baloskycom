import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Coffee, Heart, Palette, MessageSquare, Lock, Briefcase, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { theme, currency, setCurrency, settings } = useAppContext();

  const navItems = [
    { path: '/', icon: Heart, label: 'Apoyar' },
    { path: '/wall', icon: MessageSquare, label: 'Muro' },
    { path: '/vip', icon: Lock, label: 'Exclusivo' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/gallery', icon: Palette, label: 'IA' },
    { path: '/blog', icon: MessageSquare, label: 'Blog' },
  ];

  return (
    <div className={cn(
      "theme-shell min-h-screen flex flex-col transition-colors duration-500"
    )} data-theme={theme}>
      {/* Header */}
      <header className={cn(
        "theme-header sticky top-0 z-50 backdrop-blur-xl border-b-2"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.5rem] min-h-[4.5rem] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className={cn(
                "theme-accent-block w-10 h-10 flex items-center justify-center transition-colors border-2"
              )}>
                <Coffee className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <span className={cn(
                  "block font-bold tracking-tight",
                  "font-brutal uppercase text-2xl"
                )}>
                  {settings?.creatorName || 'Santi Balosky'}
                </span>
                <span className="theme-muted hidden md:block text-[11px] font-bold uppercase tracking-[0.22em]">
                  apoyo directo, encargos y portfolio
                </span>
              </div>
            </Link>

            <div className="theme-panel hidden lg:flex items-center gap-2 px-3 py-1.5 border-2 brutal-shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                Disponible para encargos y proyectos
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "text-sm font-medium transition-all",
                      "font-brutal uppercase text-base px-3 py-2 border-2",
                      isActive && "theme-nav-active brutal-shadow-sm",
                      !isActive && "theme-nav-idle border-transparent"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className={cn(
              "hidden sm:flex rounded-full p-1",
              "theme-panel border-2 brutal-shadow-sm"
            )}>
              {(['ARS', 'USD', 'CRYPTO'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full transition-all",
                    currency === c ? "bg-black text-[#00FF00]" : "text-black hover:bg-zinc-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <Link
              to="/checkout"
              className="theme-cta-primary hidden sm:inline-flex items-center gap-2 px-4 py-2 font-brutal uppercase border-2 brutal-shadow-sm transition-colors"
            >
              Aportar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 w-full",
        isHome ? "py-0" : "max-w-6xl mx-auto px-4 sm:px-6 py-8"
      )}>
        <motion.div
          key={location.pathname + theme}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={cn(
        "theme-header sm:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t pb-safe z-50 border-t-4"
      )}>
        <div className="flex items-center justify-around h-20 px-2 pb-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-all relative",
                  isActive ? "opacity-100" : "opacity-50 hover:opacity-80",
                  "font-brutal uppercase text-black"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobile-nav-indicator"
                    className={cn(
                      "absolute inset-1 rounded-2xl -z-10",
                      "theme-accent-block border-2"
                    )}
                  />
                )}
                <Icon className={cn("w-6 h-6", isActive ? "text-black" : "text-black")} />
                <span className={cn("text-[10px] font-medium", isActive ? "text-black" : "text-black")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className={cn(
        "theme-footer border-t mt-auto pb-24 sm:pb-10 pt-10 text-sm px-4 sm:px-6"
      )}>
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-3">
            <p className="font-brutal uppercase text-2xl">Bancando el delirio</p>
            <p className="theme-muted max-w-xl text-sm sm:text-base font-medium">
              Este sitio junta apoyo directo, encargos creativos y todo lo que voy publicando para la comunidad.
            </p>
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="theme-panel theme-panel-hover px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 md:text-right">
            <p className="font-brutal uppercase text-xl">Links</p>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {Object.entries(settings?.socialLinks || {}).map(([key, value]) => (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="theme-cta-secondary px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors"
                >
                  {key}
                </a>
              ))}
              <Link
                to="/admin/login"
                className="theme-panel theme-panel-hover px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors"
              >
                Admin
              </Link>
            </div>
            <p className="theme-muted text-xs font-bold uppercase tracking-[0.18em]">
              {settings?.legalText || 'Pago seguro simulado (MVP)'} © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
