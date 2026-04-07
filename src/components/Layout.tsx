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
  const isMinimal = theme === 'minimal';
  const isTerminal = theme === 'terminal';
  const isAtmospheric = theme === 'atmospheric';
  const isCyber = theme === 'cybergrid';

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
        "theme-header sticky top-0 z-50 backdrop-blur-xl border-b-2",
        isMinimal && "border-b border-black/10 bg-[#f7f4ee]/92",
        isTerminal && "border-b border-[#00ff00] bg-black/95",
        isAtmospheric && "border-b border-white/10 bg-[#05050a]/70",
        isCyber && "border-b border-cyan-400/30 bg-[#08111d]/90"
      )}>
        <div className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 h-[4.5rem] min-h-[4.5rem] flex items-center justify-between gap-6",
          isMinimal && "max-w-[88rem]",
          isTerminal && "font-mono"
        )}>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className={cn(
                "theme-accent-block w-10 h-10 flex items-center justify-center transition-colors border-2",
                isMinimal && "rounded-xl border-black/15 bg-[#161616] text-white",
                isTerminal && "rounded-none border-[#00ff00] bg-black text-[#00ff00]",
                isAtmospheric && "rounded-2xl border-white/15 bg-white/10 text-white",
                isCyber && "rounded-xl border-cyan-300/30 bg-pink-500 text-white"
              )}>
                <Coffee className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <span className={cn(
                  "block font-bold tracking-tight",
                  "font-brutal uppercase text-2xl",
                  isMinimal && "font-serif normal-case tracking-[-0.03em] text-[1.75rem]",
                  isTerminal && "font-mono tracking-[0.18em] text-lg",
                  isAtmospheric && "font-display text-[1.7rem] tracking-[-0.04em]",
                  isCyber && "tracking-[0.08em]"
                )}>
                  {settings?.creatorName || 'Santi Balosky'}
                </span>
                <span className={cn(
                  "theme-muted hidden md:block text-[11px] font-bold uppercase tracking-[0.22em]",
                  isMinimal && "normal-case tracking-[0.04em] text-[12px] font-medium",
                  isTerminal && "font-mono tracking-[0.18em] text-[10px]",
                  isAtmospheric && "normal-case tracking-[0.04em] font-medium text-[12px]"
                )}>
                  videos, canciones, ia y delirio
                </span>
              </div>
            </Link>

            <div className={cn(
              "theme-panel hidden lg:flex items-center gap-2 px-3 py-1.5 border-2 brutal-shadow-sm",
              isMinimal && "rounded-full border-black/10 shadow-none bg-white",
              isTerminal && "rounded-none border-[#00ff00] shadow-none bg-black",
              isAtmospheric && "rounded-full border-white/10 shadow-none bg-white/5",
              isCyber && "rounded-full border-cyan-400/30 shadow-none bg-cyan-400/8"
            )}>
              <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-[0.18em]",
                isMinimal && "normal-case tracking-[0.04em] font-medium",
                isTerminal && "font-mono",
                isAtmospheric && "normal-case tracking-[0.04em] font-medium",
                isCyber && "tracking-[0.12em]"
              )}>
                Disponible para encargos y proyectos
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className={cn(
              "hidden md:flex items-center gap-2",
              isMinimal && "gap-1 rounded-full border border-black/10 bg-white/90 px-2 py-1 shadow-sm",
              isTerminal && "gap-0 border border-[#00ff00] bg-black",
              isAtmospheric && "gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1",
              isCyber && "gap-1 rounded-full border border-cyan-400/20 bg-[#091726] px-2 py-1"
            )}>
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
                      !isActive && "theme-nav-idle border-transparent",
                      isMinimal && "font-sans normal-case tracking-normal text-[14px] border rounded-full px-4 py-2 shadow-none",
                      isMinimal && isActive && "bg-[#161616] text-white border-[#161616]",
                      isMinimal && !isActive && "hover:bg-[#f3ece2] border-transparent",
                      isTerminal && "font-mono text-[11px] tracking-[0.18em] rounded-none border-y-0 border-l-0 last:border-r-0 shadow-none px-3",
                      isTerminal && isActive && "bg-[#00ff00] text-black border-[#00ff00]",
                      isTerminal && !isActive && "text-[#00ff00] hover:bg-[#071907] border-[#00ff00]",
                      isAtmospheric && "font-sans normal-case tracking-normal text-[14px] rounded-full border px-4 py-2 shadow-none",
                      isAtmospheric && isActive && "bg-white text-black border-white",
                      isAtmospheric && !isActive && "hover:bg-white/10 border-transparent",
                      isCyber && "font-sans uppercase tracking-[0.12em] text-[12px] rounded-full border px-4 py-2 shadow-none",
                      isCyber && isActive && "bg-pink-500 text-white border-pink-300",
                      isCyber && !isActive && "hover:bg-cyan-400/10 border-transparent"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className={cn(
              "hidden sm:flex rounded-full p-1",
              "theme-panel border-2 brutal-shadow-sm",
              isMinimal && "border-black/10 shadow-none bg-white",
              isTerminal && "rounded-none border-[#00ff00] shadow-none bg-black",
              isAtmospheric && "border-white/10 shadow-none bg-white/5",
              isCyber && "border-cyan-400/20 shadow-none bg-[#091726]"
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
              className={cn(
                "theme-cta-primary hidden sm:inline-flex items-center gap-2 px-4 py-2 font-brutal uppercase border-2 brutal-shadow-sm transition-colors",
                isMinimal && "font-sans normal-case rounded-full border-black/15 shadow-sm px-5",
                isTerminal && "font-mono rounded-none border-[#00ff00] shadow-none tracking-[0.18em] text-[11px]",
                isAtmospheric && "font-sans normal-case rounded-full border-white/10 shadow-none",
                isCyber && "rounded-full border-pink-300/40 shadow-none tracking-[0.12em] text-[12px]"
              )}
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
        "theme-header sm:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t pb-safe z-50 border-t-4",
        isMinimal && "border-t border-black/10 bg-[#f7f4ee]/94",
        isTerminal && "border-t border-[#00ff00] bg-black/96",
        isAtmospheric && "border-t border-white/10 bg-[#05050a]/88",
        isCyber && "border-t border-cyan-400/20 bg-[#08111d]/95"
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
                  "font-brutal uppercase text-black",
                  isMinimal && "font-sans normal-case",
                  isTerminal && "font-mono tracking-[0.14em] text-[#00ff00]",
                  isAtmospheric && "font-sans normal-case text-white",
                  isCyber && "text-[#e0f2fe] tracking-[0.12em]"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobile-nav-indicator"
                    className={cn(
                      "absolute inset-1 rounded-2xl -z-10",
                      "theme-accent-block border-2",
                      isMinimal && "rounded-2xl border-black/10 bg-[#161616] text-white",
                      isTerminal && "rounded-none border-[#00ff00] bg-[#00ff00] text-black",
                      isAtmospheric && "border-white/20 bg-white text-black",
                      isCyber && "border-pink-300 bg-pink-500 text-white"
                    )}
                  />
                )}
                <Icon className={cn(
                  "w-6 h-6",
                  isTerminal && !isActive && "text-[#00ff00]",
                  isAtmospheric && !isActive && "text-white",
                  isCyber && !isActive && "text-[#e0f2fe]"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isMinimal && "text-[11px]",
                  isTerminal && "font-mono",
                  isCyber && "tracking-[0.08em]"
                )}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className={cn(
        "theme-footer border-t mt-auto pb-24 sm:pb-10 pt-10 text-sm px-4 sm:px-6",
        isMinimal && "border-t border-black/10 bg-[#f1ebe1]",
        isTerminal && "border-t border-[#00ff00] bg-black",
        isAtmospheric && "border-t border-white/10 bg-[#090912]",
        isCyber && "border-t border-cyan-400/20 bg-[#09101a]"
      )}>
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-3">
            <p className={cn(
              "font-brutal uppercase text-2xl",
              isMinimal && "font-serif normal-case tracking-[-0.03em]",
              isTerminal && "font-mono tracking-[0.16em] text-base",
              isAtmospheric && "font-display normal-case",
              isCyber && "tracking-[0.08em]"
            )}>
              Bancando el delirio
            </p>
            <p className="theme-muted max-w-xl text-sm sm:text-base font-medium">
              Un lugar para bancar lo que hago, mirar mis proyectos y caer en alguna que otra rareza.
            </p>
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "theme-panel theme-panel-hover px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors",
                    isMinimal && "rounded-full border-black/10 normal-case tracking-normal text-[13px] shadow-none",
                    isTerminal && "rounded-none border-[#00ff00] font-mono tracking-[0.14em] shadow-none",
                    isAtmospheric && "rounded-full border-white/10 normal-case tracking-normal shadow-none",
                    isCyber && "rounded-full border-cyan-400/20 shadow-none tracking-[0.1em]"
                  )}
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
                  className={cn(
                    "theme-cta-secondary px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors",
                    isMinimal && "rounded-full border-black/10 normal-case tracking-normal text-[13px]",
                    isTerminal && "rounded-none border-[#00ff00] font-mono tracking-[0.14em]",
                    isAtmospheric && "rounded-full border-white/10 normal-case tracking-normal",
                    isCyber && "rounded-full border-cyan-400/20 tracking-[0.1em]"
                  )}
                >
                  {key}
                </a>
              ))}
              <Link
                to="/admin/login"
                className={cn(
                  "theme-panel theme-panel-hover px-3 py-2 border-2 font-bold uppercase text-xs tracking-[0.16em] transition-colors",
                  isMinimal && "rounded-full border-black/10 normal-case tracking-normal text-[13px] shadow-none",
                  isTerminal && "rounded-none border-[#00ff00] font-mono tracking-[0.14em] shadow-none",
                  isAtmospheric && "rounded-full border-white/10 normal-case tracking-normal shadow-none",
                  isCyber && "rounded-full border-cyan-400/20 shadow-none tracking-[0.1em]"
                )}
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
