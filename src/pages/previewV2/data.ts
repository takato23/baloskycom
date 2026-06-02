/**
 * Contenido real del sitio Balosky — portado desde balosky-design/data.js.
 * Tipado estricto para trabajar cómodo dentro del repo React/TS.
 */

import type { OrbitKey } from './tokens';

export interface HeroData {
  name: string;
  tagline: string;
}

export interface SobreMiData {
  title: string;
  body: string;
  cta: string;
}

export interface IdeasData {
  title: string;
  body: string;
  status: string;
}

export interface Product {
  featured?: boolean;
  badge?: string;
  name: string;
  meta?: string;
  tag?: string;
  desc: string;
  price: string;
  unit?: string;
  cta: string;
  note?: string;
  href?: string;
}

export interface TrabajoData {
  title: string;
  body: string;
  products: Product[];
}

export interface FeaturedProject {
  slug: string;
  title: string;
  subtitle: string;
  desc: string;
  thumbTone: string;
  imageUrl?: string;
  assetsCount: number;
  duration: string;
}

export interface Project {
  slug: string;
  title: string;
  meta: string;
  thumbTone: string;
  imageUrl?: string;
  assetsCount: number;
}

export interface MultimediaData {
  title: string;
  body: string;
  featured: FeaturedProject;
  projects: Project[];
}

export interface ClubPlan {
  name: string;
  price: string;
  desc: string;
  recommended?: boolean;
}

export interface ClubData {
  title: string;
  subtitle: string;
  body: string;
  plans: ClubPlan[];
}

export interface PhotoItem {
  label: string;
  tone: string;
  imageUrl?: string;
}

export interface FotosData {
  title: string;
  body: string;
  images: PhotoItem[];
}

export interface Track {
  name: string;
  album: string;
  time: string;
  coverImage?: string;
}

export interface MusicaData {
  title: string;
  body: string;
  tracks: Track[];
}

export interface CafecitoTier {
  idx: string;
  tag: string;
  name: string;
  price: string;
  icon: string;
  iconImage?: string;
}

export interface CafecitoData {
  title: string;
  body: string;
  tiers: CafecitoTier[];
}

/**
 * MomentData — "el momento".
 *
 * Es la banda editorial que aparece entre el hero y las secciones. Idea:
 * Santi edita esto semanalmente con una frase corta de qué está haciendo,
 * y cuando alguien entra (ej. gente que lo descubrió por un meme), lo
 * primero que lee después del video es algo humano y presente — no un
 * "about me" genérico.
 *
 * Cableado a futuro: este objeto va a vivir en la tabla `settings` (como
 * JSON blob), editable desde /admin/settings. Por ahora se hardcodea acá
 * como placeholder para validar el look.
 */
export interface MomentData {
  /** Etiqueta chica en mono arriba, tipo "ahora" / "esta semana" / "hoy". */
  label: string;
  /** La frase principal. Corta — máx 1 oración. La estrella editorial. */
  phrase: string;
  /**
   * Substring de `phrase` que se pinta con el accent chocolate. Dejar vacío
   * para que la frase vaya toda en text normal. Si se setea, ese tramo
   * aparece en c2 de la paleta cafecito.
   */
  highlight?: string;
  /**
   * Fecha ISO (ej. "2026-04-21") mostrada debajo como "actualizado el...".
   * Deja constancia de frescura — si la frase está hace 3 semanas se nota.
   */
  updatedAt?: string;
  /**
   * Link opcional al fondo de la sección. Si la frase menciona un proyecto
   * concreto, acá se pone el link. Un CTA discreto, no un botón gritón.
   */
  href?: string;
  /** Texto del link CTA. Default "ver más →" si se omite. */
  hrefLabel?: string;
}

export interface BaloskyData {
  hero: HeroData;
  moment: MomentData;
  sobreMi: SobreMiData;
  ideas: IdeasData;
  trabajo: TrabajoData;
  multimedia: MultimediaData;
  club: ClubData;
  fotos: FotosData;
  musica: MusicaData;
  cafecito: CafecitoData;
}

export const DATA: BaloskyData = {
  hero: {
    name: 'Balosky',
    tagline: 'bajá para descubrir',
  },
  // "El momento" — placeholder para validar look. Editar acá semanalmente
  // hasta que cableemos la UI de admin. Mantener `phrase` corto: 1 oración,
  // máx 10-12 palabras, que lea en una sola fijada.
  moment: {
    label: 'ahora',
    phrase: 'estoy grabando mi segundo disco y durmiendo poco',
    highlight: 'segundo disco',
    updatedAt: '2026-04-21',
    href: '#sec-musica',
    hrefLabel: 'oí lo nuevo →',
  },
  sobreMi: {
    title: 'sobre mí',
    body: 'musicx, fotógrafo ocasional, obsesionado con flows de IA. rompo cosas, después las cuento.',
    cta: 'leer más',
  },
  ideas: {
    title: 'ideas',
    body: 'videos IA con storyboard · notebookLLM · ensayos · reflexiones. la parte bloguera — lo que pienso, lo que armo, lo que improviso.',
    status: 'en construcción · pronto',
  },
  trabajo: {
    title: 'trabajo',
    body: 'servicios reales, alcance claro. primero pre-pedido; si cierra, recién ahí te paso el pago.',
    products: [
      {
        featured: true, badge: 'más pedido · featured',
        name: '1:1 IA', meta: '60min · zoom',
        desc: 'cara a cara. me contás tu proyecto, te devuelvo flows de IA reales.',
        price: '100.000', unit: 'referencia · se cotiza antes de pagar',
        cta: 'consultar 1:1',
        note: 'mandás pre-pedido, te respondo alcance, precio y horario',
        href: '/#prepedido-consultoria',
      },
      {
        name: 'Pack imágenes', tag: '5 visuales IA',
        desc: 'cinco imágenes a medida para tu marca o proyecto.',
        price: '80.000', cta: 'elegir',
        href: '/#prepedido-custom',
      },
      {
        name: 'Canción IA', tag: 'tema original',
        desc: 'tema original generado con IA, editado por mí.',
        price: '25.000', cta: 'elegir',
        href: '/#prepedido-custom',
      },
    ],
  },
  multimedia: {
    title: 'multimedia',
    body: 'videos hechos con IA. el proceso visible, el prompt al lado.',
    featured: {
      slug: 'robaron-a-balosky',
      title: 'robaron a balosky',
      subtitle: 'video IA · 42s · marzo 2026',
      desc: 'un ensayo sobre un robo que nunca pasó. storyboard con midjourney, animación con runway, sonido propio.',
      thumbTone: '#F07A3E',
      assetsCount: 10,
      duration: '00:42',
    },
    projects: [
      { slug: 'tin-cup-anthem',   title: 'tin cup anthem',       meta: '36s · feb 2026',   thumbTone: '#6FA6D2', assetsCount: 8  },
      { slug: 'el-instagram',     title: 'el instagram',         meta: '24s · ene 2026',   thumbTone: '#D56AA0', assetsCount: 6  },
      { slug: 'nocturno-nyc',     title: 'nocturno nyc',         meta: '1m10s · dic 2025', thumbTone: '#8470C4', assetsCount: 14 },
      { slug: 'el-reflejo',       title: 'el reflejo',           meta: '28s · nov 2025',   thumbTone: '#62A87D', assetsCount: 7  },
      { slug: 'pizza-dominguera', title: 'pizza dominguera',     meta: '18s · oct 2025',   thumbTone: '#E39A1F', assetsCount: 5  },
    ],
  },
  club: {
    title: 'membresías',
    subtitle: 'sumate al club',
    body: 'bancar mes a mes · cancelar cuando quieras',
    plans: [
      { name: 'Base',           price: '3.000',  desc: 'demos + muro privado · 10% off' },
      { name: 'Órbita',         price: '9.000',  desc: 'vivo mensual · 25% off · early drops', recommended: true },
      { name: 'Órbita cerrada', price: '25.000', desc: 'zoom 1:1 trimestral · merch físico' },
    ],
  },
  fotos: {
    title: 'fotos',
    body: 'lo que vi',
    images: [
      { label: 'NYC · nocturno', tone: '#E39A1F' },
      { label: 'times sq',       tone: '#D56AA0' },
      { label: 'cathedral',      tone: '#6FA6D2' },
      { label: 'liberty',        tone: '#E39A1F' },
      { label: 'bokeh',          tone: '#8470C4' },
    ],
  },
  musica: {
    title: 'música',
    body: 'lo que estoy haciendo este año',
    tracks: [
      { name: 'Robaron a Balosky',  album: 'Temas Propios', time: '3:43' },
      { name: 'Tin Cup Anthem',     album: 'Temas Propios', time: '3:36' },
      { name: 'El Instagram',       album: 'Temas Propios', time: '4:07' },
      { name: 'Tin Cup Anthem (v2)', album: 'Temas Propios', time: '3:18' },
    ],
  },
  cafecito: {
    title: 'cafecito',
    body: 'si lo que hago te cambia algo del día, podés invitarme algo — o bancar todo el año. gracias es poco.',
    tiers: [
      { idx: '05', tag: 'cafecito',  name: 'gracias, sueño',  price: '3.000',  icon: 'cafe' },
      { idx: '06', tag: 'mate largo', name: 'una charla',     price: '6.000',  icon: 'mate' },
      { idx: '07', tag: 'pizza',     name: 'cena dominguera', price: '10.000', icon: 'pizza' },
    ],
  },
};

/**
 * Helper para obtener el data de una sección por key.
 * Tipado débil a propósito — cada Section lee la propiedad que le corresponde.
 */
export function getSectionData(key: OrbitKey): unknown {
  return (DATA as unknown as Record<OrbitKey, unknown>)[key];
}
