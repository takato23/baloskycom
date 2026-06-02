import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Film, Mail, Play, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';
import PageMeta from '@/components/PageMeta';
import '@/styles/productora.css';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

const formats = [
  {
    title: 'Spot vertical',
    meta: '20-35s · Reels / TikTok / pauta',
    body: 'Una idea clara, bien grabada y editada. Lista para subir o para meter en pauta el mismo día.',
  },
  {
    title: 'Trailer de marca',
    meta: '30-60s · producto / local / lanzamiento',
    body: 'Para presentar un local, un producto o un lanzamiento con clima de cine. Cero video institucional aburrido.',
  },
  {
    title: 'Pieza con IA',
    meta: 'visual hiperrealista · concepto · mundos',
    body: 'Cuando lo que imaginás no se puede grabar. Armamos lugares, escenas y personajes que no existen.',
  },
  {
    title: 'Pack de anuncios',
    meta: '3 variantes · enganches distintos',
    body: 'Tres versiones del mismo aviso con arranques distintos, para probar cuál rinde antes de poner toda la plata en uno.',
  },
];

const shots = [
  '/images/home-editorial/ojo-poster-h.jpg',
  '/images/home-editorial/lab-poster-h.jpg',
  '/uploads/thumbs/panoramas/moria-360.webp',
  '/uploads/thumbs/panoramas/concierto-queen-360.webp',
  '/uploads/thumbs/panoramas/corazon-360.webp',
];

const principles = [
  'Si la idea no para el scroll, la tiramos.',
  'Tiene que funcionar en mudo, en un celular.',
  'Humor solo cuando ayuda a vender.',
  'La IA suma cuando hace falta, no para figurar.',
];

export default function Productora() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [brand, setBrand] = useState('');
  const [brief, setBrief] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  // --- Trabajos: videos IA traídos del mismo feed que /laboratorio ---
  const [works, setWorks] = useState<Media[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const heroVideoUrl = works.find((m) => m.mediaUrl && !brokenIds.has(m.id))?.mediaUrl;

  const markBroken = (id: string) =>
    setBrokenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

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

    const composedBrief = [
      'Origen: landing productora B2B',
      brand.trim() ? `Marca / negocio: ${brand.trim()}` : 'Marca / negocio: no informado',
      '',
      brief.trim(),
    ].join('\n');

    setState('sending');
    try {
      await api.createEncargo({
        name: name.trim(),
        contact: contact.trim(),
        packageId: 'spot',
        brief: composedBrief,
      });
      setState('sent');
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
    <div className="prod-page">
      <PageMeta
        title="Balosky Productora — video para marcas"
        description="Spots, trailers y piezas con IA para marcas. Pensados para el feed: que enganchen en los primeros segundos y se entiendan sin sonido."
        keywords={['productora', 'video', 'spot', 'trailer', 'IA', 'marca', 'publicidad', 'Buenos Aires', 'Balosky']}
        ogTitle="Balosky Productora"
        ogDescription="Video que la gente mira hasta el final. Spots, trailers y piezas con IA para marcas."
      />
      <section className="prod-hero" id="productora">
        <video
          className="prod-hero__video"
          src={heroVideoUrl || undefined}
          autoPlay
          muted
          loop
          playsInline
          poster="/og-card.jpg"
          aria-hidden="true"
        />
        <div className="prod-hero__shade" aria-hidden="true" />

        <div className="prod-hero__content">
          <p className="prod-kicker">
            <span />
            Balosky Productora
          </p>
          <h1>
            Video que la gente mira hasta el final.
          </h1>
          <p className="prod-lede">
            Spots, trailers y piezas con IA para marcas. Pensados para el feed: que enganchen en los primeros segundos y se entiendan sin sonido.
          </p>
          <div className="prod-actions">
            <a className="prod-btn prod-btn--solid" href="#consulta" data-cursor="HABLAR">
              <Mail size={16} />
              Contar proyecto
            </a>
            <a className="prod-btn prod-btn--ghost" href="#formatos" data-cursor="VER">
              <Play size={15} />
              Ver formatos
            </a>
          </div>
          <ul className="prod-cred" aria-label="Datos de respaldo">
            <li><strong>200K+</strong><span>en Instagram</span></li>
            <li><strong>Buenos Aires</strong><span>base de trabajo</span></li>
            <li><strong>Idea → entrega</strong><span>todo en un equipo chico</span></li>
          </ul>
        </div>

        <aside className="prod-signal" aria-label="Datos de trabajo">
          <span>vertical / IA / humor / edición / guion</span>
          <strong>De la idea al video listo.</strong>
        </aside>

        <a className="prod-scroll" href="#enfoque" aria-label="Bajar a la sección">scroll</a>
      </section>

      <section className="prod-band prod-band--intro" id="enfoque">
        <div className="prod-wrap prod-intro">
          <div>
            <p className="prod-eyebrow"><b>01</b>el enfoque</p>
            <h2>Somos chicos, y por eso vamos más rápido.</h2>
          </div>
          <p>
            Hace años hago contenido para mi propia cuenta, así que sé qué hace que alguien frene el dedo en el feed. Esa misma cabeza la pongo a trabajar para tu marca: una idea que vende, ejecutada para que la gente la quiera mirar y compartir.
          </p>
        </div>
      </section>

      <section className="prod-band" id="formatos">
        <div className="prod-wrap">
          <div className="prod-section-head">
            <p className="prod-eyebrow"><b>02</b>formatos</p>
            <h2>Lo que podés pedir.</h2>
          </div>

          <div className="prod-format-grid">
            {formats.map((item, index) => (
              <article className="prod-format" key={item.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <em>{item.meta}</em>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {works.length > 0 && (
        <section className="prod-band" id="trabajos">
          <div className="prod-wrap">
            <div className="prod-section-head">
              <p className="prod-eyebrow"><b>03</b>trabajos</p>
              <h2>Algunas piezas hechas.</h2>
              <p className="prod-section-lede">
                Spots, trailers y experimentos que ya salieron. Tocá cualquiera para verlo con sonido.
              </p>
            </div>

            <div className="prod-works">
              {works.slice(0, 6).map((m) => {
                const broken = brokenIds.has(m.id);
                const isPlaying = playingId === m.id;
                const showVideo = !broken && (isPlaying || previewId === m.id);
                return (
                  <article
                    key={m.id}
                    className={`prod-work${isPlaying ? ' is-playing' : ''}`}
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
                        src={m.mediaUrl}
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

      <section className="prod-reel" aria-label="Muestra visual">
        <div className="prod-reel__track">
          {[...shots, ...shots].map((src, index) => (
            <figure key={`${src}-${index}`}>
              <img src={src} alt="" loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <section className="prod-band">
        <div className="prod-wrap prod-split">
          <div className="prod-panel prod-panel--dark">
            <p className="prod-eyebrow prod-eyebrow--light"><b>04</b>cómo trabajo</p>
            <Film size={22} />
            <h2>Primero pensamos qué contar.</h2>
            <p>
              Si ya tenés producto, local o historia, buscamos el ángulo que lo hace mirable. Si todavía está verde, arrancamos con una prueba chica antes de meterte en una campaña cara.
            </p>
          </div>

          <div className="prod-principles">
            {principles.map((item) => (
              <div className="prod-principle" key={item}>
                <Check size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="prod-band prod-band--contact" id="consulta">
        <div className="prod-wrap prod-contact">
          <div className="prod-contact__copy">
            <p className="prod-eyebrow"><b>05</b>consulta comercial</p>
            <h2>Mandame lo que querés vender.</h2>
            <p>
              Contame qué vendés: un producto, un local, un lanzamiento o una idea rara que tengas dando vueltas. Si veo algo posible, te respondo con una propuesta concreta y un número.
            </p>
            <a href="mailto:hola@balosky.com" className="prod-mail">
              hola@balosky.com
              <ArrowUpRight size={16} />
            </a>
          </div>

          <form className="prod-form" onSubmit={submit} noValidate>
            <input
              className="prod-hp"
              name="website"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

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
            {state === 'sent' && (
              <p className="prod-form__ok">
                Me llegó. Te escribo al contacto que dejaste.
              </p>
            )}

            <button className="prod-submit" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Enviando...' : 'Enviar consulta'}
              <Sparkles size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
