import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home as HomeIcon } from 'lucide-react';

/**
 * 404 page — in the Artefakt style of the rest of the site.
 * Shows the path the user tried to reach, offers a way home.
 */
export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <div className="w-full max-w-3xl space-y-8">
        <motion.p
          className="t-eyebrow text-[var(--accent)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          error — 404
        </motion.p>

        <motion.h1
          className="t-hero text-[clamp(3rem,14vw,11rem)] leading-[0.85]"
          initial={{ opacity: 0, y: 24, clipPath: 'inset(0 0 100% 0)' }}
          animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          se<span className="text-[var(--accent)]">.</span>
          <br />
          rompió<span className="text-[var(--accent)]">.</span>
        </motion.h1>

        <motion.p
          className="t-body text-base sm:text-lg max-w-xl leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          No encontré nada en <code className="font-mono text-[var(--accent)] px-1.5 py-0.5 bg-[var(--black)]/5 border border-[var(--border)]">{location.pathname}</code>.
          Tal vez moví la página, tal vez nunca existió. Pasa.
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-3 sm:gap-4 pt-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link
            to="/"
            className="group inline-flex items-center gap-2 bg-[var(--accent)] text-black px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium tracking-tight hover:bg-black hover:text-[var(--accent)] border border-[var(--accent)] transition-colors duration-300"
            data-hover
          >
            <HomeIcon className="w-4 h-4" />
            Volver al inicio
          </Link>
          <button
            onClick={() => window.history.back()}
            className="group inline-flex items-center gap-2 border border-[var(--border)] text-[var(--black)] px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium tracking-tight hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300"
            data-hover
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Página anterior
          </button>
        </motion.div>

        <motion.div
          className="pt-8 border-t border-[var(--border)] text-sm text-[var(--black)]/60 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
        >
          <p className="t-eyebrow text-[10px]">o probá alguna de estas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link to="/ideas" className="underline underline-offset-4 hover:text-[var(--accent)]" data-hover>Ideas</Link>
            <Link to="/portfolio" className="underline underline-offset-4 hover:text-[var(--accent)]" data-hover>Portfolio</Link>
            <Link to="/gallery" className="underline underline-offset-4 hover:text-[var(--accent)]" data-hover>Galería</Link>
            <Link to="/wall" className="underline underline-offset-4 hover:text-[var(--accent)]" data-hover>Muro</Link>
            <Link to="/vip" className="underline underline-offset-4 hover:text-[var(--accent)]" data-hover>Feed VIP</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
