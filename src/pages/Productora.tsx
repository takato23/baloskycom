import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Film, Mail, Play, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';
import { trackEvent } from '@/lib/analytics';
import PageMeta from '@/components/PageMeta';
import '@/styles/productora.css';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

// Paquetes con precio ancla. El precio final se cierra por consulta (idea,
// derechos, urgencia), pero el ancla filtra curiosos y posiciona: esto es
// una productora con tarifa, no un freelancer a regateo.
const packages = [
  {
    id: 'spot',
    name: 'Spot',
    price: 'desde USD 500',
    meta: '1 pieza vertical · 20-35s',
    pitch:
      'Una idea clara, grabada o generada con IA, lista para subir o meter en pauta. Trailer de marca, presentación de producto o local con clima de cine.',
    includes: [
      'Guion + producción + edición',
      '2 rondas de revisión',
      'Entrega 9:16 lista para pauta',
      'Derechos de pauta por 6 meses',
    ],
  },
  {
    id: 'pack',
    name: 'Pack Pauta',
    price: 'desde USD 900',
    meta: '3 variantes del mismo aviso',
    pitch:
      'Tres versiones con arranques distintos para testear cuál rinde antes de poner toda la plata en una. Pensado para A/B en Meta y TikTok.',
    includes: [
      '3 enganches distintos, misma idea',
      'Optimizado para testeo A/B',
      '2 rondas de revisión',
      'Derechos de pauta por 6 meses',
    ],
  },
  {
    id: 'campania',
    name: 'Campaña + Canal',
    price: 'desde USD 2.500',
    meta: 'la pieza + mi audiencia',
    featured: true,
    pitch:
      'Hago la pieza con mi estética y la publico en mi cuenta: 223K seguidores, picos de 5.5M de views. Tu marca adentro del contenido que la gente ya quiere ver, no interrumpiéndolo.',
    includes: [
      'Pieza a medida, estética Balosky',
      'Publicación en @santiagobalosky',
      'Views orgánicas, no compradas',
      'Reporte de resultados',
    ],
  },
];

// Fallback de la cinta visual si todavía no cargaron los trabajos del feed.
const fallbackShots = [
  '/images/home-editorial/ojo-poster-h.jpg',
  '/images/home-editorial/lab-poster-h.jpg',
];

const principles = [
  'Si la idea no para el scroll, la tiramos.',
  'Tiene que funcionar en mudo, en un celular.',
  'Humor solo cuando ayuda a vender.',
  'La IA suma cuando hace falta, no para figurar.',
];

// Ticker editorial entre secciones — frases de la casa.
const tickerLines = [
  'que pare el scroll',
  'que funcione en mudo',
  'cero placas con logo gigante',
  'la IA no es el chiste',
  'sí, la estatua 3D de la home soy yo',
  'tu marca adentro del contenido, no interrumpiéndolo',
  'cero videos institucionales desde 2023',
];

export default function Productora() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [brand, setBrand] = useState('');
  const [brief, setBrief] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string>('custom');

  // MODO INSTITUCIONAL™ — el anti-demo: convierte la página en el sitio
  // corporativo aburrido del que esta productora te salva. El chiste es el
  // argumento de venta.
  const [boringMode, setBoringMode] = useState(false);

  const toggleBoring = (from: string) => {
    setBoringMode((prev) => {
      trackEvent('cta_click', { source: 'productora', target: 'modo_institucional', enabled: !prev, from }, { target: 'modo_institucional' });
      return !prev;
    });
  };

  const choosePackage = (id: string, from: string) => {
    setSelectedPackage(id);
    trackEvent('cta_click', { source: 'productora', target: 'package_select', packageId: id, from }, { target: id });
  };

  // --- Trabajos: videos IA traídos del mismo feed que /laboratorio ---
  const [works, setWorks] = useState<Media[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroMuted, setHeroMuted] = useState(true);

  // Versiones livianas generadas por scripts/build-productora-previews.mjs:
  // hero-loop de ~1-2 MB y previews mudos de ~0.5 MB por trabajo. El MP4
  // completo de Supabase (8-45 MB) sólo se carga al tocar play con sonido.
  const [previews, setPreviews] = useState<{
    hero: string | null;
    items: Record<string, string>;
    reel?: string | null;
    reelSeconds?: number;
  }>({
    hero: null,
    items: {},
  });
  const [reelOpen, setReelOpen] = useState(false);

  useEffect(() => {
    fetch('/videos/productora/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPreviews({
            hero: data.hero ?? null,
            items: data.items ?? {},
            reel: data.reel ?? null,
            reelSeconds: data.reelSeconds,
          });
        }
      })
      .catch(() => {});
  }, []);

  const heroWork = works.find((m) => m.mediaUrl && !brokenIds.has(m.id));
  const heroVideoUrl = heroMuted ? previews.hero || heroWork?.mediaUrl : heroWork?.mediaUrl;
  const heroPoster = heroWork?.coverImage || heroWork?.thumbUrl || '/og-card.jpg';

  // Cinta visual: stills reales de los trabajos (sin panoramas 360 que se
  // deforman al recortar). Cae al fallback editorial si el feed está vacío.
  const reelShots = (() => {
    const fromWorks = works
      .filter((m) => !brokenIds.has(m.id))
      .map((m) => m.coverImage || m.thumbUrl)
      .filter((src): src is string => Boolean(src));
    const unique = Array.from(new Set([...fromWorks, ...fallbackShots]));
    return unique.slice(0, 6);
  })();

  const markBroken = (id: string) =>
    setBrokenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  const trackProductora = (target: string, extra?: Record<string, string | number | boolean>) => {
    trackEvent('cta_click', { source: 'productora', target, ...extra }, { target });
  };

  useEffect(() => {
    document.body.classList.add('productora-route');
    return () => {
      document.body.classList.remove('productora-route');
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('video_ia')
      .then((rows) => {
        if (mounted) setWorks(rows.filter((r) => r.active !== false && r.mediaUrl));
      })
      .catch((e) => console.error('[Productora] getMedia failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  // Modal del reel: Escape para cerrar + bloquear scroll de fondo.
  useEffect(() => {
    if (!reelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReelOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [reelOpen]);

  // El loop local del hero viene sin pista de audio, así que "activar sonido"
  // cambia el src al MP4 completo (y volver a mute regresa al loop liviano).
  // El src lo decide el render via `heroVideoUrl`; acá sólo aplicamos
  // mute + play cuando cambia.
  useEffect(() => {
    const vid = heroVideoRef.current;
    if (!vid) return;
    vid.muted = heroMuted;
    vid.play().catch(() => {
      if (!vid.muted) {
        vid.muted = true;
        vid.play().catch(() => {});
      }
    });
  }, [heroMuted, heroVideoUrl]);

  // Reveals al entrar en viewport (stagger por CSS) + parallax sutil del hero.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      document.querySelectorAll('.prod-page [data-reveal]').forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('.prod-page [data-reveal]').forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vid = heroVideoRef.current;
        if (!vid) return;
        const y = Math.min(window.scrollY, window.innerHeight);
        const p = y / window.innerHeight; // 0 → 1
        vid.style.transform = `scale(${1 + p * 0.08}) translateY(${p * 28}px)`;
        vid.style.opacity = String(1 - p * 0.35);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [works.length]);

  const pauseOthers = (exceptId: string) => {
    videoRefs.current.forEach((vid, id) => {
      if (id === exceptId) return;
      vid.pause();
      vid.muted = true;
      vid.currentTime = 0;
    });
  };

  const handleWorkTap = (m: Media) => {
    if (brokenIds.has(m.id)) return;
    if (playingId === m.id) {
      const vid = videoRefs.current.get(m.id);
      vid?.pause();
      if (vid) vid.muted = true;
      setPlayingId(null);
      return;
    }
    pauseOthers(m.id);
    setPreviewId(null);
    setPlayingId(m.id);
    trackEvent('media_open', { source: 'productora', kind: 'work_video', title: m.title }, { target: m.mediaUrl || m.id });
  };

  useEffect(() => {
    if (!playingId) return;
    const vid = videoRefs.current.get(playingId);
    if (!vid) return;
    vid.muted = false;
    vid.currentTime = 0;
    vid.play().catch(() => {
      vid.muted = true;
      vid.play().catch(() => {});
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            vid.pause();
            vid.muted = true;
            setPlayingId(null);
          }
        }
      },
      { threshold: [0, 0.4, 0.8] },
    );
    io.observe(vid);
    return () => io.disconnect();
  }, [playingId]);

  // En mobile no hay hover: autoplay mudo del trabajo más visible (uno a la vez).
  useEffect(() => {
    if (works.length === 0) return;
    if (!window.matchMedia('(hover: none), (max-width: 760px)').matches) return;

    const visibility = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.workId;
          if (id) visibility.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let bestId: string | null = null;
        let bestRatio = 0.55; // umbral mínimo para arrancar
        visibility.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        setPreviewId((cur) => {
          if (playingId) return cur; // si hay uno con sonido, no lo pisamos
          return bestId;
        });
      },
      { threshold: [0, 0.55, 0.8, 1] },
    );
    document.querySelectorAll('.prod-work[data-work-id]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [works.length, playingId]);

  // Preview silencioso al pasar el mouse (el overlay tapa el hover del <video>,
  // así que lo disparamos desde acá en vez de depender del onMouseEnter nativo).
  useEffect(() => {
    if (!previewId || previewId === playingId) return;
    const vid = videoRefs.current.get(previewId);
    if (!vid) return;
    vid.muted = true;
    vid.play().catch(() => {});
    return () => {
      vid.pause();
    };
  }, [previewId, playingId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (honeypot.trim()) return;

    setError('');
    if (!name.trim() || contact.trim().length < 3 || brief.trim().length < 10) {
      setError('Dejame al menos tu nombre, un contacto y dos líneas de qué querés hacer.');
      return;
    }

    const packLabel = packages.find((p) => p.id === selectedPackage);
    const composedBrief = [
      'Origen: landing productora B2B',
      `Paquete: ${packLabel ? `${packLabel.name} (${packLabel.price})` : 'a definir'}`,
      brand.trim() ? `Marca / negocio: ${brand.trim()}` : 'Marca / negocio: no informado',
      '',
      brief.trim(),
    ].join('\n');

    setState('sending');
    trackEvent('encargo_start', {
      source: 'productora',
      packageId: selectedPackage,
      hasBrand: Boolean(brand.trim()),
      briefLength: brief.trim().length,
    }, { target: 'productora_form' });
    try {
      await api.createEncargo({
        name: name.trim(),
        contact: contact.trim(),
        packageId: selectedPackage,
        brief: composedBrief,
      });
      setState('sent');
      trackEvent('encargo_created', {
        source: 'productora',
        packageId: selectedPackage,
        hasBrand: Boolean(brand.trim()),
      }, { target: 'productora_form' });
      setName('');
      setContact('');
      setBrand('');
      setBrief('');
    } catch (err: any) {
      setState('error');
      setError(err?.message || 'No pude enviar la consulta. Escribime a hola@balosky.com.');
    }
  };

  return (
    <div className={`prod-page${boringMode ? ' prod-page--institucional' : ''}`}>
      {boringMode && (
        <div className="prod-boring-banner" role="status">
          <p>
            <strong>MODO INSTITUCIONAL™ ACTIVADO</strong> — Soluciones Audiovisuales Integrales 360°. Sinergia. Compromiso. Calidad e innovación al servicio de su empresa.
          </p>
          <button type="button" onClick={() => toggleBoring('banner')}>
            SACAME DE ACÁ
          </button>
        </div>
      )}
      <PageMeta
        title="Balosky Productora — video para marcas"
        description="Spots, trailers y piezas con IA para marcas. Pensados para el feed: que enganchen en los primeros segundos y se entiendan sin sonido."
        keywords={['productora', 'video', 'spot', 'trailer', 'IA', 'marca', 'publicidad', 'Buenos Aires', 'Balosky']}
        ogTitle="Balosky Productora"
        ogDescription="Video que la gente mira hasta el final. Spots, trailers y piezas con IA para marcas."
      />
      <section className="prod-hero" id="productora">
        <video
          ref={heroVideoRef}
          className="prod-hero__video"
          src={heroVideoUrl || undefined}
          autoPlay
          muted={heroMuted}
          loop
          playsInline
          poster={heroPoster}
          aria-hidden="true"
        />
        <div className="prod-hero__shade" aria-hidden="true" />

        {heroVideoUrl && (
          <button
            type="button"
            className={`prod-sound${heroMuted ? '' : ' is-on'}`}
            aria-label={heroMuted ? 'Activar sonido' : 'Silenciar'}
            data-cursor={heroMuted ? 'SONIDO' : 'MUTE'}
            onClick={() => {
              const next = !heroMuted;
              setHeroMuted(next);
              trackProductora(next ? 'hero_mute' : 'hero_unmute');
            }}
          >
            <span className="prod-sound__bars" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            {heroMuted ? 'Activar sonido' : 'Sonido'}
          </button>
        )}

        <div className="prod-hero__content" data-reveal>
          <p className="prod-kicker">
            <span />
            Balosky Productora
          </p>
          <h1>
            {boringMode ? (
              <>Soluciones audiovisuales integrales para su empresa.</>
            ) : (
              <>Video que la gente mira <em>hasta el final</em>.</>
            )}
          </h1>
          <p className="prod-lede">
            {boringMode
              ? 'Somos un equipo multidisciplinario comprometido con la excelencia, ofreciendo contenido de calidad e innovación con los más altos estándares del mercado desde una mirada 360°.'
              : 'Spots, trailers y piezas con IA para marcas. Pensados para el feed: que enganchen en los primeros segundos y se entiendan sin sonido.'}
          </p>
          <div className="prod-actions">
            <a
              className="prod-btn prod-btn--solid"
              href="#consulta"
              data-cursor="HABLAR"
              onClick={() => trackProductora('hero_contact')}
            >
              <Mail size={16} />
              Contar proyecto
            </a>
            {previews.reel ? (
              <button
                type="button"
                className="prod-btn prod-btn--ghost"
                data-cursor="REEL"
                onClick={() => {
                  setReelOpen(true);
                  trackProductora('hero_reel');
                }}
              >
                <Play size={15} />
                Ver reel{previews.reelSeconds ? ` (${previews.reelSeconds}s)` : ''}
              </button>
            ) : (
              <a
                className="prod-btn prod-btn--ghost"
                href="#formatos"
                data-cursor="VER"
                onClick={() => trackProductora('hero_formats')}
              >
                <Play size={15} />
                Ver paquetes
              </a>
            )}
          </div>
          <ul className="prod-cred" aria-label="Datos de respaldo">
            <li><strong>223K</strong><span>seguidores · cuenta verificada</span></li>
            <li><strong>5.5M</strong><span>views en una sola pieza</span></li>
            <li><strong>Buenos Aires</strong><span>idea → entrega, equipo chico</span></li>
          </ul>
        </div>

        <aside className="prod-signal" aria-label="Datos de trabajo">
          <span>vertical / IA / humor / edición / guion</span>
          <strong>De la idea al video listo.</strong>
        </aside>

        <a
          className="prod-scroll"
          href="#enfoque"
          aria-label="Bajar a la sección"
          onClick={() => trackProductora('hero_scroll')}
        >
          scroll
        </a>
      </section>

      <section className="prod-band prod-band--intro" id="enfoque">
        <div className="prod-wrap prod-intro">
          <div data-reveal>
            <p className="prod-eyebrow"><b>01</b>el enfoque</p>
            <h2>Somos chicos, y por eso vamos más rápido.</h2>
          </div>
          <p data-reveal>
            Hace años hago contenido para mi propia cuenta, así que sé qué hace que alguien frene el dedo en el feed. Esa misma cabeza la pongo a trabajar para tu marca: una idea que vende, ejecutada para que la gente la quiera mirar y compartir.
          </p>
        </div>
      </section>

      <div className="prod-ticker" aria-hidden="true">
        <div className="prod-ticker__track">
          {[...tickerLines, ...tickerLines].map((line, i) => (
            <span key={`${line}-${i}`}>
              {line}
              <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      <section className="prod-band" id="formatos">
        <div className="prod-wrap">
          <div className="prod-section-head" data-reveal>
            <p className="prod-eyebrow"><b>02</b>paquetes</p>
            <h2>Lo que podés pedir, con número.</h2>
            <p className="prod-section-lede">
              Precio final según la idea y los derechos. Seña del 50% para agendar, por Mercado Pago.
            </p>
          </div>

          <div className="prod-pack-grid" data-reveal-group>
            {packages.map((pack, index) => (
              <article
                className={`prod-pack${pack.featured ? ' prod-pack--featured' : ''}`}
                key={pack.id}
                data-reveal
                style={{ '--rev-i': index } as React.CSSProperties}
              >
                {pack.featured && <span className="prod-pack__flag">El diferencial</span>}
                <h3>{pack.name}</h3>
                <em>{pack.meta}</em>
                <strong className="prod-pack__price">{boringMode ? 'Consulte presupuesto' : pack.price}</strong>
                <p>{pack.pitch}</p>
                <ul>
                  {pack.includes.map((line) => (
                    <li key={line}>
                      <Check size={14} />
                      {line}
                    </li>
                  ))}
                </ul>
                <a
                  className={`prod-btn ${pack.featured ? 'prod-btn--solid' : 'prod-btn--ghost'}`}
                  href="#consulta"
                  data-cursor="PEDIR"
                  onClick={() => choosePackage(pack.id, 'package_card')}
                >
                  Pedir este
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {works.length > 0 && (
        <section className="prod-band" id="trabajos">
          <div className="prod-wrap">
            <div className="prod-section-head" data-reveal>
              <p className="prod-eyebrow"><b>03</b>trabajos</p>
              <h2>Algunas piezas hechas.</h2>
              <p className="prod-section-lede">
                Spots, trailers y experimentos que ya salieron. Tocá cualquiera para verlo con sonido.
              </p>
            </div>

            <div className="prod-works" data-reveal-group>
              {works.slice(0, 7).map((m, index) => {
                const broken = brokenIds.has(m.id);
                const isPlaying = playingId === m.id;
                const showVideo = !broken && (isPlaying || previewId === m.id);
                return (
                  <article
                    key={m.id}
                    data-reveal
                    data-work-id={m.id}
                    style={{ '--rev-i': index } as React.CSSProperties}
                    className={`prod-work${index === 0 ? ' prod-work--feature' : ''}${isPlaying ? ' is-playing' : ''}`}
                    onMouseEnter={() => {
                      if (!isPlaying && !broken) setPreviewId(m.id);
                    }}
                    onMouseLeave={() => {
                      if (previewId !== m.id || isPlaying) return;
                      videoRefs.current.get(m.id)?.pause();
                      setPreviewId(null);
                    }}
                  >
                    {showVideo && m.mediaUrl ? (
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current.set(m.id, el);
                          else videoRefs.current.delete(m.id);
                        }}
                        src={isPlaying ? m.mediaUrl : previews.items[m.id] || m.mediaUrl}
                        poster={m.coverImage || undefined}
                        muted={!isPlaying}
                        loop
                        playsInline
                        preload="metadata"
                        controls={isPlaying}
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        onError={() => markBroken(m.id)}
                        onMouseEnter={(e) => {
                          if (!isPlaying) e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          if (!isPlaying) e.currentTarget.pause();
                        }}
                        onClick={(e) => {
                          if (isPlaying) e.stopPropagation();
                        }}
                      />
                    ) : (
                      <img
                        src={m.coverImage || m.thumbUrl || getMediaPlaceholder(m.title, { category: m.aiTool || m.category, width: 800, height: 1000 })}
                        alt={m.title}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallback === '1') return;
                          img.dataset.fallback = '1';
                          img.src = getMediaPlaceholder(m.title, { category: m.aiTool || m.category, width: 800, height: 1000 });
                        }}
                      />
                    )}

                    {!isPlaying && (
                      <button
                        type="button"
                        className="prod-work__hit"
                        aria-label={`Reproducir ${m.title}`}
                        data-cursor="PLAY"
                        onClick={() => handleWorkTap(m)}
                      >
                        <span className="prod-work__play"><Play size={18} /></span>
                      </button>
                    )}

                    {isPlaying && (
                      <button
                        type="button"
                        className="prod-work__close"
                        aria-label="Cerrar video"
                        data-cursor="CERRAR"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkTap(m);
                        }}
                      >
                        ✕
                      </button>
                    )}

                    {!isPlaying && (
                      <div className="prod-work__meta">
                        {m.aiTool && <span className="prod-work__tool">IA · {m.aiTool}</span>}
                        <h3>{m.title}</h3>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {reelShots.length > 0 && (
        <section className="prod-reel" aria-label="Muestra visual">
          <div className="prod-reel__track">
            {[...reelShots, ...reelShots].map((src, index) => (
              <figure key={`${src}-${index}`}>
                <img src={src} alt="" loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="prod-band">
        <div className="prod-wrap prod-split">
          <div className="prod-panel prod-panel--dark" data-reveal>
            <p className="prod-eyebrow prod-eyebrow--light"><b>04</b>cómo trabajo</p>
            <Film size={22} />
            <h2>Primero pensamos qué contar.</h2>
            <p>
              Si ya tenés producto, local o historia, buscamos el ángulo que lo hace mirable. Si todavía está verde, arrancamos con una prueba chica antes de meterte en una campaña cara.
            </p>
          </div>

          <div className="prod-principles" data-reveal-group>
            {principles.map((item, index) => (
              <div className="prod-principle" key={item} data-reveal style={{ '--rev-i': index } as React.CSSProperties}>
                <Check size={17} />
                <span>{item}</span>
              </div>
            ))}

            <button
              type="button"
              className="prod-boring-toggle"
              data-cursor="NO"
              onClick={() => toggleBoring('principios')}
            >
              <span>{boringMode ? '¿Viste? Horrible. Tocá para volver.' : '¿Preferís el video institucional de siempre?'}</span>
              <em>{boringMode ? 'desactivar modo institucional™' : 'activar modo institucional™'}</em>
            </button>
          </div>
        </div>
      </section>

      <section className="prod-band prod-band--contact" id="consulta">
        <div className="prod-wrap prod-contact">
          <div className="prod-contact__copy" data-reveal>
            <p className="prod-eyebrow"><b>05</b>consulta comercial</p>
            <h2>Mandame lo que querés vender.</h2>
            <p>
              Contame qué vendés: un producto, un local, un lanzamiento o una idea rara que tengas dando vueltas. Si veo algo posible, te respondo con una propuesta concreta y un número.
            </p>
            <div className="prod-contact__channels">
              <a
                href="mailto:hola@balosky.com"
                className="prod-mail"
                onClick={() => trackProductora('mailto')}
              >
                hola@balosky.com
                <ArrowUpRight size={16} />
              </a>
              <a
                href="https://ig.me/m/santiagobalosky"
                target="_blank"
                rel="noopener noreferrer"
                className="prod-mail"
                data-cursor="DM"
                onClick={() => trackProductora('ig_dm')}
              >
                DM en Instagram
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <form className={`prod-form${state === 'sent' ? ' is-sent' : ''}`} onSubmit={submit} noValidate data-reveal>
            <input
              className="prod-hp"
              name="website"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <fieldset className="prod-form__packs prod-form__wide">
              <legend>Qué paquete te interesa</legend>
              {[...packages.map((p) => ({ id: p.id, label: p.name })), { id: 'custom', label: 'Otra cosa' }].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`prod-form__pack${selectedPackage === opt.id ? ' is-active' : ''}`}
                  onClick={() => choosePackage(opt.id, 'form_chip')}
                >
                  {opt.label}
                </button>
              ))}
            </fieldset>

            <label>
              <span>Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
            </label>
            <label>
              <span>Contacto</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                maxLength={160}
                placeholder="mail, WhatsApp o Instagram"
                required
              />
            </label>
            <label className="prod-form__wide">
              <span>Marca / negocio</span>
              <input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={120} />
            </label>
            <label className="prod-form__wide">
              <span>Qué querés hacer</span>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={5}
                minLength={10}
                maxLength={1200}
                placeholder="Ej: quiero un spot vertical para presentar un producto, una demo con IA, un trailer para un local, tres anuncios para pauta..."
                required
              />
            </label>

            {error && <p className="prod-form__error">{error}</p>}

            <button className="prod-submit" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Enviando...' : 'Enviar consulta'}
              <Sparkles size={16} />
            </button>

            {state === 'sent' && (
              <div className="prod-form__success" role="status" aria-live="polite">
                <span className="prod-form__check"><Check size={30} strokeWidth={3} /></span>
                <strong>Me llegó.</strong>
                <p>Te escribo al contacto que dejaste. Mientras tanto, mirá los trabajos.</p>
              </div>
            )}
          </form>
        </div>
      </section>

      {reelOpen && previews.reel && (
        <div
          className="prod-reel-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Showreel"
          onClick={() => setReelOpen(false)}
        >
          <video
            src={previews.reel}
            autoPlay
            controls
            playsInline
            controlsList="nodownload"
            onClick={(e) => e.stopPropagation()}
            onEnded={() => setReelOpen(false)}
          />
          <button
            type="button"
            className="prod-reel-modal__close"
            aria-label="Cerrar reel"
            onClick={() => setReelOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
