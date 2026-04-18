import { useEffect, useState } from 'react';

/**
 * Sticker flotante "cafecito" — 1 tap → Mercado Pago.
 *
 * Usa el endpoint backend `/api/checkout/quick?mode=cafecito` que hace 302
 * directo a MP, sin página intermedia ni JS. El monto está hardcodeado en
 * server/routes/api.ts (QUICK_CHECKOUT_MODES.cafecito = $2000).
 *
 * Estética: variante "sticker orgánico" del mockup — wobble suave, anillo
 * punteado giratorio, peel highlight.
 *
 * Slot para imagen IA: si existe `/images/cafecito-badge.png` se renderiza;
 * sino cae a un emoji ☕. Generá el PNG con Nano Banana siguiendo el prompt
 * en design-mockups/checkout/badge-cafecito.html y pegalo en /public/images.
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
   * Útil para que no pise el hero. Default 300px.
   */
  showAfterScroll?: number;
  /**
   * Path a la imagen IA. Si falla carga, muestra emoji fallback.
   * @default '/images/cafecito-badge.png'
   */
  imageSrc?: string;
}

export default function CafecitoBadge({
  floating = true,
  showAfterScroll = 300,
  imageSrc = '/images/cafecito-badge.png',
}: CafecitoBadgeProps) {
  const [visible, setVisible] = useState(!floating);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!floating) return;
    const onScroll = () => setVisible(window.scrollY > showAfterScroll);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [floating, showAfterScroll]);

  return (
    <a
      href="/api/checkout/quick?mode=cafecito"
      data-cursor="CAFECITO"
      aria-label="Invitame un cafecito — pagar $2.000 con Mercado Pago"
      className={[
        'cafecito-badge',
        floating ? 'cafecito-badge--fab' : 'cafecito-badge--inline',
        visible ? 'is-visible' : 'is-hidden',
      ].join(' ')}
    >
      {/* anillo punteado giratorio */}
      <span className="cb-ring" aria-hidden="true" />

      {/* disco naranja principal */}
      <span className="cb-disc">
        {/* peel highlight top-left */}
        <span className="cb-peel" aria-hidden="true" />

        {/* slot imagen IA o emoji fallback */}
        <span className="cb-img">
          {!imgFailed && (
            <img
              src={imageSrc}
              alt=""
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          )}
          {(imgFailed || !imgLoaded) && <span className="cb-img-fallback">☕</span>}
        </span>

        {/* labels */}
        <span className="cb-lbl-top">Cafecito</span>
        <span className="cb-lbl-bot">$2.000</span>
      </span>
    </a>
  );
}
