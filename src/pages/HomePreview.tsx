import { useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import IntroCurtain from '@/components/home/IntroCurtain';
import MeshBg from '@/components/home/MeshBg';
// HeroSection mantiene la composicion original de delirio.html: titular gigante
// superpuesto, busto 3D de Santi al centro y orbitas alrededor. Es la version
// que mas se parece al primer build que estaba funcionando como norte visual.
import HeroSection from '@/components/home/HeroSection';
// MonetizacionHub es el único bloque de trabajo: brief + campo de presupuesto
// + cafecito. Evitamos repetir el pitch en bloques consecutivos.
import MonetizacionHub from '@/components/home/MonetizacionHub';
// MiraSection (showreel mockup) queda on-disk por si queremos revivirlo, pero
// se sacó del render: los capítulos y el audio "nadie escucha" eran inventados
// y VisionSection ya cubre videos IA con datos reales del admin. Santi lo
// llamó "mockup" explícitamente — vaciar duplicaciones de scroll vertical.
import VocesSection from '@/components/home/VocesSection';
import VisionSection from '@/components/home/VisionSection';
import OjoSection from '@/components/home/OjoSection';
import PixelSection from '@/components/home/PixelSection';
import SonidoSection from '@/components/home/SonidoSection';
import MuroSection from '@/components/home/MuroSection';
import ArchivoSection from '@/components/home/ArchivoSection';
import RedesSection from '@/components/home/RedesSection';
import AntiTheftGuard from '@/components/home/AntiTheftGuard';
// CafecitoBadge vive en Layout.tsx (fuera del <motion.div> que envuelve el
// Outlet) para evitar que el `transform: translateY(0)` de framer-motion le
// rompa el position:fixed al badge.

/**
 * Delirio home — full React port. Now served at `/` (and `/home-preview` for
 * back-compat with existing QA links).
 *
 * Every section below the hero is a faithful port of its counterpart
 * in `public/delirio.html`. Interactive layers are rehydrated: presupuesto
 * de edición IA, Visión/Ojo tiles open `MediaLightbox`, Pixel wallpapers
 * gate through `WallpaperGate`, Sonido cards open `SunoModal` with the right
 * platform embed, Archivo rail drag-scrolls, the Muro post form submits to
 * `/api/messages`, `AntiTheftGuard` covers #ojo/#pixel, and the logo click
 * counter feeds `ModoHomerEasterEgg`.
 *
 * The legacy static HTML is still available at `/delirio` as a rollback —
 * flipping `server.ts` back (re-add `app.get('/', serveDelirio)`) and the
 * `/` route in `App.tsx` (swap `HomePreview` for `RedirectToStatic`) reverts
 * the landing to the static mockup.
 *
 * Layout.tsx wraps this page with DelirioHeader + DelirioFooter, so this
 * file only owns everything between the nav and the footer.
 */
/**
 * Lista canónica de IDs de sección que el admin puede prender/apagar desde
 * AdminSettings. El orden acá es el orden de render en la home. Cada ID
 * mapea 1:1 con el componente que se monta más abajo.
 *
 * Si `settings.visibleSections` está vacío o undefined, tratamos la home
 * como "mostrar todo" (backwards-compat con instalaciones viejas). Si tiene
 * valores, solo renderizamos los IDs presentes.
 */
export const HOME_SECTION_IDS = [
  'hero',
  'monetizacion',
  'ojo',
  'pixel',
  'vision',
  'sonido',
  'voces',
  'muro',
  'archivo',
  'redes',
] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: 'Hero (cabeza 3D + capítulos)',
  monetizacion: 'Trabajemos / edición IA',
  ojo: 'Ojo (fotos)',
  pixel: 'Wallpapers',
  vision: 'Lab / videos IA',
  sonido: 'Canciones SUNO',
  voces: 'Voces (mensajes del muro destacados)',
  muro: 'Muro (mensajes de seguidores)',
  archivo: 'Archivo',
  redes: 'Redes sociales',
};

function PostHeroReceipt() {
  return (
    <section className="post-hero-bridge post-hero-receipt" aria-label="Comunidad y apoyo">
      <div className="post-hero-bridge__inner post-hero-receipt__inner">
        <dl className="post-hero-bridge__proof post-hero-receipt__stats" data-stats-state="ready">
          <div className="post-hero-receipt__stat">
            <dt>Cafecitos reales</dt>
            <dd>418</dd>
          </div>
          <div className="post-hero-receipt__stat">
            <dt>Personas</dt>
            <dd>204</dd>
          </div>
          <div className="post-hero-receipt__stat">
            <dt>Total ARS</dt>
            <dd>$1.38M</dd>
          </div>
        </dl>
        <p className="post-hero-bridge__world post-hero-receipt__ticker">
          edición IA · videos · fotos · archivo · cafecitos
        </p>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="proof-strip reveal" id="muestra" aria-label="Muestra de edición IA">
      <div className="proof-strip__head">
        <div>
          <div className="idx"><span className="badge">MIRÁ EL TONO</span></div>
          <h2>edito lo raro<br /><em>hasta publicarlo</em>.</h2>
        </div>
        <p>Tres entradas rápidas: video, foto intervenida y escena. Después, si te cierra, me mandás lo tuyo.</p>
      </div>
      <div className="proof-strip__grid">
        <a className="proof-card proof-card--wide" href="/laboratorio" data-cursor="VIDEO">
          <img src="/images/home-editorial/lab-poster-h.jpg" alt="Escena del laboratorio visual Balosky" loading="lazy" />
          <div className="proof-card__meta">
            <span>video IA</span>
            <b>escenas raras, listas para publicar</b>
          </div>
        </a>
        <a className="proof-card" href="#ojo" data-cursor="FOTO">
          <img src="/images/home-editorial/ojo-poster-h.jpg" alt="Retrato intervenido del archivo Balosky" loading="lazy" />
          <div className="proof-card__meta">
            <span>foto / archivo</span>
            <b>material con dirección</b>
          </div>
        </a>
        <a className="proof-card" href="/laboratorio" data-cursor="ESCENA">
          <img src="/uploads/thumbs/panoramas/moria-360.webp" alt="Escena panorámica creada para el laboratorio Balosky" loading="lazy" />
          <div className="proof-card__meta">
            <span>escena</span>
            <b>clima antes que plantilla</b>
          </div>
        </a>
      </div>
    </section>
  );
}

export default function HomePreview() {
  const { settings } = useAppContext();

  // Si no hay `visibleSections` o viene vacío, mostramos todas. Si la lista
  // existe pero NINGUNO de sus IDs es del set nuevo (p.ej. valores legacy
  // ['hero','campaigns','rewards','wall']), también tratamos como "mostrar
  // todo" — evitamos esconder la home entera en instalaciones previas al
  // admin de toggles. Solo una lista con al menos un ID válido gatilla
  // filtrado.
  const isVisible = useMemo(() => {
    const list = settings?.visibleSections;
    if (!list || list.length === 0) return () => true;
    const validIds = new Set<string>(HOME_SECTION_IDS);
    const matched = list.filter((id) => validIds.has(id));
    if (matched.length === 0) return () => true;
    const set = new Set(matched);
    return (id: HomeSectionId) => set.has(id);
  }, [settings?.visibleSections]);

  // Reveal-on-scroll — port of the static home's top-level IntersectionObserver
  // (public/delirio.html around line 4528). Adds both `.in` (used by
  // src/styles/delirio.css) and `.visible` (used by src/index.css) so every
  // `.reveal` node fades up regardless of which stylesheet owns it.
  // Reveal-on-scroll con IO + MutationObserver que también cachea
  // los `.reveal` que aparecen DESPUÉS del mount inicial (p.ej. cuando
  // el user cambia de tab en MonetizacionHub y se monta un panel nuevo).
  //
  // Bug previo: el IO solo observaba los `.reveal` del querySelectorAll
  // inicial. Si un panel se agregaba por tab switch, nunca se observaba,
  // se quedaba en `opacity: 0` (defaults en `.reveal`) y el tab se veía
  // vacío — Santi reportó exactamente esto al tocar "A medida". Ahora
  // un MutationObserver captura los nuevos nodos y los suscribe al IO.
  useEffect(() => {
    let forceVisible = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in', 'visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    const observeNode = (el: Element) => {
      // Si el nodo ya fue revelado (tiene `.in`/`.visible`), no lo observamos
      // de nuevo — ya está visible permanente.
      if (el.classList.contains('in') || el.classList.contains('visible')) return;
      if (forceVisible) {
        el.classList.add('in', 'visible');
        return;
      }
      io.observe(el);
    };

    // 1) Observar todos los `.reveal` que existen ahora.
    document.querySelectorAll('.reveal').forEach(observeNode);

    // 2) Vigilar el árbol por `.reveal` que aparezcan después.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList?.contains('reveal')) observeNode(node);
          node.querySelectorAll?.('.reveal').forEach(observeNode);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Fallback anti-pantalla-vacía: si el IO no dispara (capturas full-page,
    // navegadores raros, tabs en background), el contenido aparece igual.
    const revealFallback = window.setTimeout(() => {
      forceVisible = true;
      document.querySelectorAll('.reveal').forEach((el) => {
        el.classList.add('in', 'visible');
        io.unobserve(el);
      });
    }, 1600);

    return () => {
      window.clearTimeout(revealFallback);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <>
      <IntroCurtain />
      <MeshBg />

      {isVisible('hero') && (
        <>
          <HeroSection />
          <PostHeroReceipt />
        </>
      )}

      {isVisible('monetizacion') && (
        <>
          <ProofStrip />
          <MonetizacionHub />
        </>
      )}
      {isVisible('ojo') && <OjoSection />}
      {isVisible('pixel') && <PixelSection />}
      {isVisible('vision') && <VisionSection />}
      {isVisible('sonido') && <SonidoSection />}
      {isVisible('voces') && <VocesSection />}
      {isVisible('muro') && <MuroSection />}
      {isVisible('archivo') && <ArchivoSection />}
      {isVisible('redes') && <RedesSection />}

      <AntiTheftGuard />
    </>
  );
}
