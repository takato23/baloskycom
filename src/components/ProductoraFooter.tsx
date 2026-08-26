import { ArrowUpRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * Footer dedicado a la landing comercial `/productora`. A diferencia del
 * `DelirioFooter` (cafecitos, Carta del Delirio, stats de la plataforma
 * creator), este habla el idioma de una productora: contacto directo y
 * un solo CTA.
 *
 * También lo monta `/cameo`, que es producto del creador: ahí la marca sigue
 * siendo BALOSKY. El wordmark y la firma BLSK. son sólo de `/productora`.
 *
 * Vive en `src/styles/productora.css` (clases `prod-foot__*`).
 */
export default function ProductoraFooter() {
  const year = new Date().getFullYear();
  const isBlsk = useLocation().pathname === '/productora';

  return (
    <footer className={`prod-foot${isBlsk ? ' blsk prod-foot--blsk' : ''}`}>
      <div className="prod-foot__top">
        <div className="prod-foot__lead">
          <p className="prod-eyebrow prod-eyebrow--light">
            {isBlsk ? 'BLSK. productora' : 'Balosky Productora'}
          </p>
          <h2>¿Tenés algo para filmar?</h2>
          <p className="prod-foot__sub">
            Spots, trailers y piezas con IA para marcas. Contame qué querés vender y te
            respondo con una propuesta concreta.
          </p>
        </div>
        <a
          href="mailto:hola@balosky.com"
          className="prod-foot__cta"
          data-cursor="HABLAR"
        >
          <span>hola@balosky.com</span>
          <ArrowUpRight size={18} />
        </a>
      </div>

      <div className="prod-foot__wordmark" aria-hidden="true">
        {isBlsk ? (
          /* El manual prohíbe reconstruir el logo con texto: va el SVG maestro. */
          <img src="/brand/blsk/svg/BLSK_primary_white_mono.svg" alt="" />
        ) : (
          'Balosky'
        )}
      </div>

      <ul className="prod-foot__absurd" aria-label="Estadísticas de la casa">
        <li><strong>0</strong><span>videos institucionales desde 2023</span></li>
        <li><strong>100%</strong><span>entendibles en mudo</span></li>
        <li><strong>1</strong><span>estatua 3D propia (la de la home)</span></li>
        <li><strong>∞</strong><span>personajes que no existen</span></li>
      </ul>

      <div className="prod-foot__bottom">
        <span>
          {isBlsk
            ? `© ${year} BLSK. · Dirección: Balosky · Buenos Aires`
            : `© ${year} Balosky · Buenos Aires`}
        </span>
        <nav className="prod-foot__links" aria-label="Enlaces">
          <a href="/cameo">Cameo</a>
          <a href="/productora">Productora</a>
          <a href="https://instagram.com/santiagobalosky" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="https://tiktok.com/@santiagobalosky" target="_blank" rel="noopener noreferrer">
            TikTok
          </a>
          <a href="https://youtube.com/@santiagobalosky" target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
          <a href="/">balosky.com</a>
        </nav>
      </div>
    </footer>
  );
}
