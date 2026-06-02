type ChapterCard = {
  href: string;
  label: string;
  title: string;
  body: string;
  detail: string;
  tone: 'accent' | 'violet' | 'amber';
  image?: string;
  imageAlt?: string;
};

const CHAPTERS: ChapterCard[] = [
  {
    href: '/#trabajemos',
    label: '01 · Presupuesto',
    title: 'Mandá material para editar con IA.',
    body: 'Material, presupuesto aproximado y referencias para cotizar una pieza concreta.',
    detail: 'presupuesto · edición IA · cafecito',
    tone: 'accent',
  },
  {
    href: '/#ojo',
    label: '02 · Ojo',
    title: 'Fotos como señales de otra frecuencia.',
    body: 'Retratos, ciudad y noche: cosas que aparecen cuando mirás dos segundos más.',
    detail: 'buenos aires · flash · fantasma',
    tone: 'violet',
    image: '/images/home-editorial/ojo-poster-v.jpg',
    imageAlt: 'Escena nocturna de Buenos Aires con luces naranjas y violetas.',
  },
  {
    href: '/#vision',
    label: '03 · Lab',
    title: 'El laboratorio antes del impacto.',
    body: 'Pruebas, videos e imágenes mutantes antes de convertirse en pieza final.',
    detail: 'proceso · ia · accidente feliz',
    tone: 'amber',
    image: '/images/home-editorial/lab-poster-v.jpg',
    imageAlt: 'Estudio creativo con proyecciones calidas y materiales translucidos.',
  },
] as const;

export default function SupportRail() {
  return (
    <div id="capitulos" className="rdz-support-rail">
      <div className="rdz-support-rail-head">
        <span className="rdz-support-rail-kicker">Capítulos</span>
        <p className="rdz-support-rail-copy">
          Tres puertas para entrar: pedir presupuesto, mirar el archivo o bajar al laboratorio.
        </p>
      </div>

      <div className="rdz-support-rail-grid" role="list">
        {CHAPTERS.map((chapter) => (
          <a
            key={chapter.href}
            href={chapter.href}
            className={`rdz-rail-card rdz-rail-card--${chapter.tone}${
              chapter.image ? ' rdz-rail-card--image' : ' rdz-rail-card--text'
            }`}
            data-cursor="IR"
            role="listitem"
          >
            {chapter.image && (
              <div className="rdz-rail-card__media" aria-hidden="true">
                <img src={chapter.image} alt={chapter.imageAlt} loading="lazy" decoding="async" />
              </div>
            )}

            <div className="rdz-rail-card__body">
              <span className="rdz-rail-card__label">{chapter.label}</span>
              <h3 className="rdz-rail-card__title">{chapter.title}</h3>
              <p className="rdz-rail-card__copy">{chapter.body}</p>
              <div className="rdz-rail-card__foot">
                <span className="rdz-rail-card__detail">{chapter.detail}</span>
                <span className="rdz-rail-card__arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
