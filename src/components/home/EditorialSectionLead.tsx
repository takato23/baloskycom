type EditorialSectionLeadProps = {
  label: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  tone?: 'accent' | 'violet' | 'amber';
  reverse?: boolean;
  meta?: string[];
  href?: string;
  cta?: string;
};

export default function EditorialSectionLead({
  label,
  title,
  body,
  imageSrc,
  imageAlt,
  tone = 'accent',
  reverse = false,
  meta = [],
  href,
  cta,
}: EditorialSectionLeadProps) {
  return (
    <article
      className={`rdz-section-lead rdz-section-lead--${tone}${reverse ? ' rdz-section-lead--reverse' : ''} reveal`}
    >
      <div className="rdz-section-lead__media">
        <img src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" />
      </div>

      <div className="rdz-section-lead__body">
        <span className="rdz-section-lead__label">{label}</span>
        <h3 className="rdz-section-lead__title">{title}</h3>
        <p className="rdz-section-lead__copy">{body}</p>

        {meta.length > 0 && (
          <div className="rdz-section-lead__meta" aria-label="Detalle">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}

        {href && cta && (
          <a href={href} className="rdz-section-lead__cta">
            {cta}
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
