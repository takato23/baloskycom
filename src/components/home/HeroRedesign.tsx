import { lazy, Suspense } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useMagnetic } from '@/hooks/useMagnetic';
import SupportRail from './SupportRail';

/**
 * Home hero editorial-first.
 *
 * Mantiene a Santi como ancla, pero ahora la escena protagonista vive en
 * AvatarHeroStage: Canvas lazy en desktop y fallback liviano en mobile /
 * reduced-motion / no-WebGL. El texto crítico queda siempre en HTML.
 */

const AvatarHeroStage = lazy(() => import('./AvatarHeroStage'));

function MagneticHeroLink() {
  const magneticRef = useMagnetic<HTMLAnchorElement>(90, 0.08);

  return (
    <a ref={magneticRef} href="/#capitulos" className="rdz-btn-pill rdz-magnetic">
      Explorar capítulos
    </a>
  );
}

export default function HeroRedesign() {
  const { darkMode } = useAppContext();

  return (
    <section id="hero" className="rdz-scope rdz-home-hero">
      <div className="rdz-hero">
        <div className="rdz-home-hero__grid">
          <div className="rdz-home-hero__copy">
            <div className="rdz-home-hero__brandline">
              <span className="rdz-home-hero__branddot" aria-hidden="true" />
              <span className="rdz-home-hero__brand">Balosky</span>
              <span className="rdz-home-hero__sep" aria-hidden="true">
                ·
              </span>
              <span className="rdz-home-hero__context">creator digital desde Buenos Aires</span>
            </div>

            <h1 className="rdz-home-hero__headline">Lo que hago vive ac&aacute;.</h1>

            <p className="rdz-home-hero__deck">
              Ideas, procesos, imagen, sonido y formas de apoyar lo que sigue, reunidos en un mismo lugar.
            </p>

            <div className="rdz-home-hero__actions">
              <MagneticHeroLink />
            </div>
          </div>

          <div className="rdz-stage-shell">
            <div className="rdz-stage rdz-avatar-stage-shell perspective-section in-view">
              <div className="rdz-stage-arch" aria-hidden="true" />
              <div className="rdz-head-wrap rdz-head-wrap--avatar-system">
                <Suspense
                  fallback={
                    <div className="rdz-avatar-fallback" aria-live="polite">
                      <pre className="rdz-avatar-fallback__ascii">
                        {`  B A L O S K Y
    /\\
   /__\\   cargando avatar
  avatares en orbita`}
                      </pre>
                    </div>
                  }
                >
                  <AvatarHeroStage darkMode={darkMode} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        <SupportRail />
      </div>
    </section>
  );
}
