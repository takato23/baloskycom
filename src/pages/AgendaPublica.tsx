import React from 'react';
import {
  Clapperboard,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  FileStack,
  Headphones,
  MessagesSquare,
  PlayCircle,
  Waves,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import {
  AGENDA_PUBLICA_CONTENT,
  AGENDA_TOP_THEMES,
  AGENDA_YEAR_SPOTLIGHTS,
} from '@/content/agendaPublica';
import styles from './AgendaPublica.module.css';

type ActionLink = {
  label: string;
  href?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  featured?: boolean;
  download?: boolean;
};

function getEnvValue(key: string) {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function ActionCard({ label, href, icon: Icon, featured, download }: ActionLink) {
  if (!href) {
    return null;
  }

  return (
    <a
      className={`${styles.actionCard} ${featured ? styles.actionCardFeatured : ''}`}
      href={href}
      target={href.startsWith('#') ? undefined : '_blank'}
      rel={href.startsWith('#') ? undefined : 'noreferrer'}
      download={download}
    >
      <div className={styles.actionIconWrap}>
        <Icon className={styles.actionIcon} />
      </div>
      <div className={styles.actionBody}>
        <span className={styles.actionLabel}>{label}</span>
      </div>
      <ArrowUpRight className={styles.actionArrow} />
    </a>
  );
}

const localMedia = {
  poster: '/agenda-publica/media/attention-machine-infographic.png',
  videoEs: '/agenda-publica/media/attention-machine-es.mp4',
  videoEn: '/agenda-publica/media/attention-machine-en.mp4',
  audioEs: '/agenda-publica/media/attention-machine-es.m4a',
  slides: '/agenda-publica/media/attention-machine-slides.pptx',
};

const NOTEBOOK_FALLBACK_URL =
  'https://notebooklm.google.com/notebook/820214bd-88f6-4bcc-a43b-5767131ed226';

export default function AgendaPublica() {
  const pageTitle =
    getEnvValue('NEXT_PUBLIC_AGENDA_ROUTE_TITLE') ??
    AGENDA_PUBLICA_CONTENT.hero.title;
  const pageDescription =
    getEnvValue('NEXT_PUBLIC_AGENDA_ROUTE_DESCRIPTION') ??
    AGENDA_PUBLICA_CONTENT.hero.description;

  const notebookHref =
    getEnvValue('NEXT_PUBLIC_NOTEBOOK_PUBLIC_URL') ?? NOTEBOOK_FALLBACK_URL;

  const actionLinks: ActionLink[] = [
    {
      label: 'Ver video',
      href: '#ver-mas',
      icon: PlayCircle,
      featured: true,
    },
    {
      label: 'Escuchar audio',
      href: '#ver-mas',
      icon: Headphones,
    },
    {
      label: 'Abrir notebook',
      href: notebookHref,
      icon: BookOpen,
    },
  ];

  return (
    <>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords={AGENDA_PUBLICA_CONTENT.seo.keywords}
        ogTitle={AGENDA_PUBLICA_CONTENT.seo.ogTitle}
        ogDescription={AGENDA_PUBLICA_CONTENT.seo.ogDescription}
      />

      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.shell}>
            <div className={styles.topbar}>
              <span className={styles.topbarBrand}>{AGENDA_PUBLICA_CONTENT.project.name}</span>
              <nav className={styles.topbarNav} aria-label="Secciones de agenda pública">
                <a href="#resumen">Resumen</a>
                <a href="#datos">Datos</a>
                <a href="#ver-mas">Ver más</a>
                <a href="#fuentes">Fuentes</a>
              </nav>
            </div>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>{AGENDA_PUBLICA_CONTENT.hero.eyebrow}</span>
                <h1>{pageTitle}</h1>
                <p className={styles.lead}>{pageDescription}</p>
                {AGENDA_PUBLICA_CONTENT.hero.support ? (
                  <p className={styles.support}>{AGENDA_PUBLICA_CONTENT.hero.support}</p>
                ) : null}

                <div className={styles.actionsGrid}>
                  {actionLinks.map((link) => (
                    <ActionCard key={link.label} {...link} />
                  ))}
                </div>
              </div>

              <aside className={styles.heroAside}>
                <div className={styles.posterCard}>
                  <img
                    src={localMedia.poster}
                    alt="La máquina de saturación"
                    className={styles.posterImage}
                    loading="eager"
                  />
                  <div className={styles.posterCaption}>
                    <span className={styles.kicker}>Idea fuerza</span>
                    <p>{AGENDA_PUBLICA_CONTENT.thesis}</p>
                  </div>
                </div>

                {AGENDA_YEAR_SPOTLIGHTS.map((spotlight) => (
                  <article key={spotlight.year} className={styles.heroStat}>
                    <span className={styles.spotlightYear}>{spotlight.year}</span>
                    <strong>{spotlight.value}</strong>
                    <span>{spotlight.label}</span>
                  </article>
                ))}
              </aside>
            </div>
          </div>
        </section>

        <section id="resumen" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.summaryIntroGrid}>
              <article className={styles.introCard}>
                <span className={styles.sectionEyebrow}>{AGENDA_PUBLICA_CONTENT.studyIntro.title}</span>
                <p>{AGENDA_PUBLICA_CONTENT.studyIntro.body}</p>
              </article>
              <article className={styles.introCard}>
                <span className={styles.sectionEyebrow}>{AGENDA_PUBLICA_CONTENT.studyFinding.title}</span>
                <p>{AGENDA_PUBLICA_CONTENT.studyFinding.body}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="datos" className={styles.metricsSection}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>Datos claros</span>
              <h2>Qué se habló, cuánto duró y cómo se acumuló.</h2>
            </div>

            <div className={styles.metricsGrid}>
              {AGENDA_PUBLICA_CONTENT.metrics.map((metric) => (
                <article key={metric.label} className={styles.metricCard}>
                  <span className={styles.metricValue}>{metric.num}</span>
                  <span className={styles.metricLabel}>{metric.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="hallazgos" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>Hallazgos</span>
              <h2>{AGENDA_PUBLICA_CONTENT.hallazgos.title}</h2>
            </div>

            <div className={styles.analysisGrid}>
              <div className={styles.cardsGrid}>
                {AGENDA_PUBLICA_CONTENT.hallazgos.cards.map((card) => (
                  <article key={card.title} className={styles.storyCard}>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </article>
                ))}
              </div>

              <aside className={`${styles.summaryCard} ${styles.highlightCard}`}>
                <div className={styles.summaryHeader}>
                  <BarChart3 className={styles.summaryIcon} />
                  <div>
                    <h3>En una frase</h3>
                  </div>
                </div>
                <p className={styles.highlightText}>
                  El cansancio aparece cuando un tema todavía sigue y ya arrancó otro.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section id="graficos" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>Gráficos</span>
              <h2>Cuatro vistas rápidas.</h2>
            </div>

            <div className={styles.chartGrid}>
              {AGENDA_PUBLICA_CONTENT.charts.map((chart) => {
                const chartText =
                  'text' in chart && typeof chart.text === 'string' ? chart.text : undefined;

                return (
                  <figure key={chart.src} className={styles.chartCard}>
                    <figcaption>
                      <h3>{chart.title}</h3>
                      {chartText ? <p>{chartText}</p> : null}
                    </figcaption>
                    <img
                      src={chart.src}
                      alt={chart.title}
                      className={styles.chartImage}
                      loading="lazy"
                    />
                  </figure>
                );
              })}
            </div>
          </div>
        </section>

        <section id="ver-mas" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>Ver más</span>
              <h2>Si querés meterte más, está todo.</h2>
            </div>

            <div className={styles.mediaGrid}>
              <article className={`${styles.mediaCard} ${styles.mediaCardFeature}`}>
                <div className={styles.mediaHeader}>
                  <div className={styles.mediaTitleWrap}>
                    <Clapperboard className={styles.mediaIcon} />
                    <div>
                      <h3>Video</h3>
                    </div>
                  </div>
                  <a
                    className={styles.mediaLink}
                    href={localMedia.videoEs}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </div>

                <video
                  className={styles.mediaVideo}
                  controls
                  preload="metadata"
                  poster={localMedia.poster}
                >
                  <source src={localMedia.videoEs} type="video/mp4" />
                  Tu navegador no puede reproducir este video.
                </video>
              </article>

              <article className={styles.mediaCard}>
                <div className={styles.mediaHeader}>
                  <div className={styles.mediaTitleWrap}>
                    <Waves className={styles.mediaIcon} />
                    <div>
                      <h3>Audio</h3>
                    </div>
                  </div>
                  <a
                    className={styles.mediaLink}
                    href={localMedia.audioEs}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </div>

                <div className={styles.audioBlock}>
                  <img
                    src={localMedia.poster}
                    alt="Vista previa de la investigación"
                    className={styles.audioArtwork}
                    loading="lazy"
                  />
                  <audio className={styles.audioPlayer} controls preload="metadata">
                    <source src={localMedia.audioEs} type="audio/mp4" />
                    Tu navegador no puede reproducir este audio.
                  </audio>
                </div>
              </article>

              <article className={styles.mediaCard}>
                <div className={styles.mediaHeader}>
                  <div className={styles.mediaTitleWrap}>
                    <FileStack className={styles.mediaIcon} />
                    <div>
                      <h3>Slides</h3>
                    </div>
                  </div>
                  <a className={styles.mediaLink} href={localMedia.slides} download>
                    Descargar
                  </a>
                </div>

                <img
                  src={localMedia.poster}
                  alt="Preview del deck de The Information Fatigue Machine"
                  className={styles.mediaPreview}
                  loading="lazy"
                />
              </article>

              <article className={styles.mediaCard}>
                <div className={styles.mediaHeader}>
                  <div className={styles.mediaTitleWrap}>
                    <PlayCircle className={styles.mediaIcon} />
                    <div>
                      <h3>Versión en inglés</h3>
                    </div>
                  </div>
                  <a
                    className={styles.mediaLink}
                    href={localMedia.videoEn}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </div>

                <video
                  className={styles.mediaVideo}
                  controls
                  preload="metadata"
                  poster={localMedia.poster}
                >
                  <source src={localMedia.videoEn} type="video/mp4" />
                  Tu navegador no puede reproducir este video.
                </video>
              </article>
            </div>

            <div className={styles.questionGrid}>
              <article className={styles.listCard}>
                <div className={styles.listHeader}>
                  <MessagesSquare className={styles.listIcon} />
                  <div>
                    <h3>Preguntas para el notebook</h3>
                  </div>
                </div>
                <ul>
                  {AGENDA_PUBLICA_CONTENT.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.listCard}>
                <div className={styles.listHeader}>
                  <BarChart3 className={styles.listIcon} />
                  <div>
                    <h3>Temas que más duraron</h3>
                  </div>
                </div>
                <ul className={styles.rankList}>
                  {AGENDA_TOP_THEMES.map((topic) => (
                    <li key={topic.topic}>
                      <div>
                        <strong>{topic.topic}</strong>
                        <span>{topic.scope}</span>
                      </div>
                      <div>
                        <strong>{topic.duration} días</strong>
                        <span>{topic.reactivations} vueltas</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="fuentes" className={`${styles.section} ${styles.finalSection}`}>
          <div className={styles.shell}>
            <div className={styles.finalPanel}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>Fuentes y bibliografía</span>
                <h2>Todo el material base, por si querés ir al fondo.</h2>
              </div>

              <div className={styles.sourcesGrid}>
                <article className={styles.listCard}>
                  <div className={styles.listHeader}>
                    <FileStack className={styles.listIcon} />
                    <div>
                      <h3>Material base</h3>
                    </div>
                  </div>
                  <ul>
                    {AGENDA_PUBLICA_CONTENT.sources.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>

              <a href="#hallazgos" className={styles.backLink}>
                Volver arriba <ArrowRight className={styles.backArrow} />
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
