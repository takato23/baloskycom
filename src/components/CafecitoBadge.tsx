import { useEffect, useState } from 'react';

/**
 * Sticker flotante "cafecito" — 1 tap → selector rápido de cantidad.
 *
 * Lleva al flujo rápido de cafecito sin pedir email ni mensaje previo,
 * sin ocupar espacio en la sección principal.
 *
 * Estética: variante "sticker orgánico" del mockup — wobble suave, anillo
 * punteado giratorio, peel highlight.
 *
 * Slot central: por default mostramos un SVG inline de tacita (dark coffee
 * silhouette) porque los PNGs generados por IA casi siempre vienen con un
 * fondo blanco sólido que se ve como un cuadrado sobre el disco naranja.
 * Si pasás `imageSrc="/images/cafecito-badge.png"` explícitamente (y la
 * imagen tiene transparencia limpia) se renderiza en vez del SVG.
 *
 * IMPORTANTE: montar el componente FUERA de cualquier ancestro con
 * `transform`/`filter` aplicado (framer-motion.div, etc). Un transform en
 * un ancestro crea un nuevo containing block para `position: fixed` y
 * hace que el badge "scrollee" con la página en vez de quedar pegado al
 * viewport. En este repo eso significa: montarlo en `Layout.tsx` afuera
 * del `<main>`.
 */

interface CafecitoBadgeProps {
  /**
   * Si `true`, el badge se posiciona fixed abajo-derecha (FAB).
   * Si `false`, queda inline donde se renderice.
   * @default true
   */
  floating?: boolean;
  /**
   * Oculta el badge hasta que el user haya scrolleado más de N pixels.
   * Default 0 = siempre visible apenas entra el viewport.
   */
  showAfterScroll?: number;
  /**
   * Esconde el badge una vez que el user scrolleó MÁS de N pixels. Pensado
   * para que el badge acompañe el hero/apoya y se retire cuando el usuario
   * está leyendo fotos/wallpapers/etc. El usuario nos dijo:
   *
   *   "el cafesito no tiene que verse EN TOOOODA la pagina"
   *
   * Default `null` = sin tope; se queda visible hasta el final. Si pasás
   * un número (ej 1.6 viewport heights) el badge hace fade-out después
   * de pasarlo.
   */
  hideAfterScroll?: number | null;
  /**
   * Path opcional a una imagen IA. Tiene que tener fondo TRANSPARENTE
   * (alpha limpio). Si no se pasa o falla la carga, usamos el SVG
   * fallback (`.cb-img-fallback::before` en index.css).
   */
  imageSrc?: string | null;
}

export default function CafecitoBadge({
  floating = true,
  showAfterScroll = 0,
  hideAfterScroll = null,
  imageSrc = null,
}: CafecitoBadgeProps) {
  // `showAfterScroll <= 0` significa "siempre visible" desde el primer
  // render. Si el usuario pasó un umbral positivo arrancamos oculto y
  // sólo aparecemos cuando el scroll lo supera.
  const alwaysVisible = !floating || (showAfterScroll <= 0 && hideAfterScroll == null);
  const [visible, setVisible] = useState(alwaysVisible);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!floating) return;
    if (showAfterScroll <= 0 && hideAfterScroll == null) {
      setVisible(true);
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      const pastShowBand = y > showAfterScroll;
      const beforeHideBand = hideAfterScroll == null || y < hideAfterScroll;
      setVisible(pastShowBand && beforeHideBand);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [floating, showAfterScroll, hideAfterScroll]);

  // Esconde el badge cuando hay un modal/lightbox abierto — detectamos el
  // estado usando `document.body.style.overflow === 'hidden'`, que es lo
  // que setean WallpaperGate, MediaLightbox y SunoModal para bloquear el
  // scroll detrás. Así el cafecito nunca flota encima de una foto abierta.
  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    if (!floating) return;
    const check = () => setModalOpen(document.body.style.overflow === 'hidden');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => obs.disconnect();
  }, [floating]);

  return (
    <a
      href="/cafecito"
      data-cursor="CAFECITO"
      data-mascot-ignore
      aria-label="Invitame un cafecito"
      className={[
        'cafecito-badge',
        floating ? 'cafecito-badge--fab' : 'cafecito-badge--inline',
        visible && !modalOpen ? 'is-visible' : 'is-hidden',
      ].join(' ')}
    >
      {/* anillo punteado giratorio */}
      <span className="cb-ring" aria-hidden="true" />

      {/* disco naranja principal */}
      <span className="cb-disc">
        {/* peel highlight top-left */}
        <span className="cb-peel" aria-hidden="true" />

        {/* slot imagen IA (opcional) o SVG fallback */}
        <span className="cb-img">
          {imageSrc && !imgFailed && (
            <img
              src={imageSrc}
              alt=""
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          )}
          {(!imageSrc || imgFailed || !imgLoaded) && (
            <span className="cb-img-fallback" aria-hidden="true" />
          )}
        </span>

        {/* labels */}
        <span className="cb-lbl-top">Cafecito</span>
        <span className="cb-lbl-bot">elegir</span>
      </span>
    </a>
  );
}
