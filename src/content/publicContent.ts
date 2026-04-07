import {
  PublicContentSettings,
  SiteSettings,
} from '@/types';

export const DEFAULT_PUBLIC_CONTENT: PublicContentSettings = {
  home: {
    hero: {
      eyebrow: 'un rincón para bancar, mirar y llevarse cosas',
      title: 'bancá lo que hago\ny llevate algo\nen el proceso',
      subtitle:
        'Si alguna vez te dieron ganas de invitarme un cafecito, pedirme algo con IA o simplemente ver en qué ando, todo eso vive acá.',
      primaryCtaLabel: 'Aportar un cafecito',
      primaryCtaHref: '/checkout',
      secondaryCtaLabel: 'Ver lo que hago',
      secondaryCtaHref: '/portfolio',
    },
    supportModes: [
      {
        eyebrow: 'Aporte libre',
        title: 'Un cafecito para bancar el ritmo',
        description:
          'Si te gusta lo que hago y querés que siga saliendo contenido, esto me da una mano enorme.',
        ctaLabel: 'Aportar ahora',
        href: '/checkout',
      },
      {
        eyebrow: 'Encargo IA',
        title: 'Te llevás algo hecho para vos',
        description:
          'Me pasás una idea y te hago algo a medida: una foto, un avatar, un meme o alguna rareza linda.',
        ctaLabel: 'Pedir un encargo',
        href: '/checkout',
      },
      {
        eyebrow: 'Proyecto serio',
        title: 'Si querés ver más de lo que hago',
        description:
          'Acá está todo junto: proyectos, trabajos, canciones, pruebas y experimentos.',
        ctaLabel: 'Ver portfolio',
        href: '/portfolio',
      },
    ],
    discoveryCards: [
      {
        title: 'Muro',
        description: 'Mensajes, aguantes y respuestas que van quedando cuando alguien banca una misión.',
        href: '/wall',
      },
      {
        title: 'Feed exclusivo',
        description: 'Publicaciones para aportantes, encuestas y materiales que estén cargados de verdad.',
        href: '/vip',
      },
      {
        title: 'Portfolio',
        description: 'Proyectos, ideas, canciones y cosas que fui armando en internet.',
        href: '/portfolio',
      },
      {
        title: 'Galería IA',
        description: 'Imágenes, pruebas y delirios visuales hechos con IA.',
        href: '/gallery',
      },
    ],
    sections: {
      supportEyebrow: 'elegí por dónde entrar',
      supportTitle: 'tres formas de bancar',
      supportSubtitle:
        'A veces querés sumar sin más, a veces querés llevarte algo, y a veces solo querés ver qué estuve haciendo.',
      rewardsEyebrow: 'qué te llevás',
      rewardsTitle: 'recompensas y niveles',
      rewardsSubtitle:
        'Acá se muestran beneficios concretos que hoy sí existen en la plataforma. Nada de promesas sin implementar.',
      discoveryEyebrow: 'además del pago',
      discoveryTitle: 'para seguir chusmeando',
      discoverySubtitle:
        'No todo pasa por aportar. También podés mirar, leer, votar y ver en qué ando.',
    },
  },
  checkout: {
    copy: {
      title: 'Invitame un cafecito',
      subtitle: 'Elegí cuánto querés aportar y a qué misión.',
      encargoTitle: 'Quiero un Encargo Mágico (Mínimo $5.000)',
      encargoDescription:
        '¿Querés que te edite una foto con alguien, armar un avatar o hacer alguna rareza visual? Contame qué querés y vemos qué sale.',
    },
  },
  portfolio: {
    copy: {
      heroTitle: 'Mi Portfolio',
      heroSubtitle:
        'No solo creo contenido: también hago proyectos, piezas visuales y experimentos digitales.',
      ctaTitle: '¿Trabajamos juntos?',
      ctaBody:
        'Si tenés una idea para una web, algo con IA o querés sumar una colaboración, hablemos.',
      ctaButton: 'Contactame',
    },
  },
  vip: {
    copy: {
      title: 'Publicaciones para aportantes',
      subtitle:
        'Este espacio muestra publicaciones, recursos y actualizaciones que realmente estén disponibles para quienes apoyan el proyecto.',
    },
  },
};

const normalizeArray = <T>(value: T[] | undefined, fallback: T[]) =>
  Array.isArray(value) && value.length === fallback.length ? value : fallback;

export const normalizePublicContent = (
  content?: Partial<PublicContentSettings> | null
): PublicContentSettings => ({
  home: {
    hero: {
      ...DEFAULT_PUBLIC_CONTENT.home.hero,
      ...(content?.home?.hero ?? {}),
    },
    supportModes: normalizeArray(content?.home?.supportModes, DEFAULT_PUBLIC_CONTENT.home.supportModes).map(
      (item, index) => ({
        ...DEFAULT_PUBLIC_CONTENT.home.supportModes[index],
        ...item,
      })
    ),
    discoveryCards: normalizeArray(
      content?.home?.discoveryCards,
      DEFAULT_PUBLIC_CONTENT.home.discoveryCards
    ).map((item, index) => ({
      ...DEFAULT_PUBLIC_CONTENT.home.discoveryCards[index],
      ...item,
    })),
    sections: {
      ...DEFAULT_PUBLIC_CONTENT.home.sections,
      ...(content?.home?.sections ?? {}),
    },
  },
  checkout: {
    copy: {
      ...DEFAULT_PUBLIC_CONTENT.checkout.copy,
      ...(content?.checkout?.copy ?? {}),
    },
  },
  portfolio: {
    copy: {
      ...DEFAULT_PUBLIC_CONTENT.portfolio.copy,
      ...(content?.portfolio?.copy ?? {}),
    },
  },
  vip: {
    copy: {
      ...DEFAULT_PUBLIC_CONTENT.vip.copy,
      ...(content?.vip?.copy ?? {}),
    },
  },
});

export const normalizeSiteSettings = (settings: SiteSettings): SiteSettings => ({
  ...settings,
  content: normalizePublicContent(settings.content),
});
