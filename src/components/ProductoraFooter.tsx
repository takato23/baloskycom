import { ArrowUpRight } from 'lucide-react';

/**
 * Footer dedicado a la landing comercial `/productora`. A diferencia del
 * `DelirioFooter` (cafecitos, Carta del Delirio, stats de la plataforma
 * creator), este habla el idioma de una productora: contacto directo,
 * un solo CTA y la misma paleta tinta/hueso/naranja de la página.
 *
 * Vive en `src/styles/productora.css` (clases `prod-foot__*`).
 */
export default function ProductoraFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="prod-foot">
      <div className="prod-foot__top">
        <div className="prod-foot__lead">
          <p className="prod-eyebrow prod-eyebrow--light">Balosky Productora</p>
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
        Balosky
      </div>

      <ul className="prod-foot__absurd" aria-label="Estadísticas de la casa">
        <li><strong>0</strong><span>videos institucionales desde 2023</span></li>
        <li><strong>100%</strong><span>entendibles en mudo</span></li>
        <li><strong>1</strong><span>estatua 3D propia (la de la home)</span></li>
        <li><strong>∞</strong><span>personajes que no existen</span></li>
      </ul>

      <div className="prod-foot__bottom">
        <span>© {year} Balosky · Buenos Aires</span>
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
