import { useEffect, useState, type FormEvent } from 'react';
import { Check, Clapperboard, Smartphone, Sun, User, Video } from 'lucide-react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import { trackEvent } from '@/lib/analytics';
import PageMeta from '@/components/PageMeta';
import '@/styles/productora.css';

/**
 * /cameo — producto B2C: tu cara en una escena Balosky.
 *
 * 15 segundos dentro de una de las piezas ya publicadas, ARS $70.000.
 * El comprador elige la escena, paga por Mercado Pago (checkout/preference
 * existente) y después manda su video filmado según los requisitos.
 * La entrega y la recepción del video se coordinan por WhatsApp/mail —
 * acá solo se cobra y se registra el pedido (el alert de pago ya avisa).
 */

const CAMEO_PRICE = 70_000;

const requirements = [
  { icon: Video, text: 'Un video tuyo en 720p o más (con el celu alcanza)' },
  { icon: User, text: 'De 3/4 de cuerpo, hablando y moviéndote natural' },
  { icon: Sun, text: 'Con buena luz — de día cerca de una ventana ya está' },
  { icon: Smartphone, text: '20 a 40 segundos, vertical u horizontal' },
];

export default function Cameo() {
  const [works, setWorks] = useState<Media[]>([]);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('productora-route');
    return () => document.body.classList.remove('productora-route');
  }, []);

  useEffect(() => {
    api
      .getMedia('video_ia')
      .then((rows) => setWorks(rows.filter((r) => r.active !== false && (r.coverImage || r.thumbUrl))))
      .catch((e) => console.error('[Cameo] getMedia failed', e));
  }, []);

  const scenes = works.slice(0, 8);
  const selectedScene = scenes.find((s) => s.id === sceneId) || null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!selectedScene) {
      setError('Elegí en qué escena querés aparecer.');
      return;
    }
    if (!name.trim() || contact.trim().length < 3) {
      setError('Dejame tu nombre y un contacto (WhatsApp o mail) para coordinar tu video.');
      return;
    }

    setPaying(true);
    trackEvent('checkout_start', { source: 'cameo', scene: selectedScene.title }, { target: 'cameo' });
    try {
      const pref = await api.createPreference(
        CAMEO_PRICE,
        `Cameo BTV — ${selectedScene.title}`,
        'cameo',
        name.trim(),
        `Pedido cameo · Escena: ${selectedScene.title} · Contacto: ${contact.trim()}`,
      );
      const url = pref.init_point || pref.sandbox_init_point;
      if (!url) throw new Error('No pude crear el link de pago.');
      window.location.href = url;
    } catch (err: any) {
      setPaying(false);
      setError(err?.message || 'No pude generar el pago. Escribime a hola@balosky.com.');
    }
  };

  return (
    <div className="prod-page">
      <PageMeta
        title="Cameo Balosky — aparecé en una escena"
        description="Tu cara (o la de tu vieja) en una pieza Balosky de 15 segundos. Elegís la escena, mandás tu video y te llevás el resultado en HD. ARS $70.000."
        keywords={['cameo', 'video IA', 'regalo', 'Balosky', 'escena', 'personalizado']}
        ogTitle="Cameo Balosky"
        ogDescription="Aparecé en una escena Balosky. 15 segundos, hecho a mano, ARS $70.000."
      />

      <section className="prod-band cameo-hero" id="cameo">
        <div className="prod-wrap">
          <p className="prod-kicker">
            <span />
            Cameo · edición limitada de vos
          </p>
          <h1 className="cameo-title">
            Aparecé en una <em>escena Balosky</em>.
          </h1>
          <p className="prod-lede">
            15 segundos dentro de una de mis piezas, con vos (o tu vieja, o tu mejor amigo) en el medio
            de la acción. Hecho a mano, entregado en HD, listo para regalar o subir.
          </p>
          <div className="cameo-price" aria-label="Precio">
            <strong>$70.000</strong>
            <span>ARS · pago único por Mercado Pago</span>
          </div>
        </div>
      </section>

      <section className="prod-band" id="escenas">
        <div className="prod-wrap">
          <div className="prod-section-head">
            <p className="prod-eyebrow"><b>01</b>elegí la escena</p>
            <h2>¿Dónde querés estar?</h2>
          </div>
          <div className="cameo-scenes">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={`cameo-scene${sceneId === scene.id ? ' is-selected' : ''}`}
                data-cursor="ESTA"
                onClick={() => {
                  setSceneId(scene.id);
                  trackEvent('cta_click', { source: 'cameo', target: 'scene_select', scene: scene.title }, { target: scene.id });
                }}
              >
                <img src={scene.coverImage || scene.thumbUrl || ''} alt={scene.title} loading="lazy" />
                <span className="cameo-scene__check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                <span className="cameo-scene__name">{scene.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="prod-band prod-band--intro" id="requisitos">
        <div className="prod-wrap prod-intro">
          <div>
            <p className="prod-eyebrow"><b>02</b>filmate</p>
            <h2>Tu video tiene que cumplir esto.</h2>
          </div>
          <div className="cameo-reqs">
            {requirements.map(({ icon: Icon, text }) => (
              <div className="cameo-req" key={text}>
                <Icon size={20} />
                <span>{text}</span>
              </div>
            ))}
            <p className="cameo-reqs__note">
              Si el video no cumple, te lo pido de nuevo sin drama — pero mejor hacerlo bien de una.
            </p>
          </div>
        </div>
      </section>

      <section className="prod-band" id="pagar">
        <div className="prod-wrap prod-contact">
          <div className="prod-contact__copy">
            <p className="prod-eyebrow prod-eyebrow--light"><b>03</b>pagá y mandá tu video</p>
            <h2>Cerramos el trato.</h2>
            <p>
              Apenas se acredite el pago te escribo al contacto que dejes para recibir tu video.
              La pieza tarda unos días — te aviso la fecha exacta cuando vea la escena y tu material.
            </p>
            {selectedScene && (
              <p className="cameo-selected">
                <Clapperboard size={15} />
                Escena elegida: <strong>{selectedScene.title}</strong>
              </p>
            )}
          </div>

          <form className="prod-form cameo-form" onSubmit={submit} noValidate>
            <label>
              <span>Nombre</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </label>
            <label>
              <span>WhatsApp o mail</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={160}
                placeholder="para coordinar tu video"
                required
              />
            </label>

            {error && <p className="prod-form__error">{error}</p>}

            <button className="prod-submit" type="submit" disabled={paying}>
              {paying ? 'Generando pago...' : 'Pagar $70.000 y reservar'}
            </button>
            <p className="cameo-form__fine">
              Mercado Pago · ARS · si algo sale mal te devuelvo la plata, obvio.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
