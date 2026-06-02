import {
  PublicContentSettings,
  SiteSettings,
} from '../types/index.js';

const DEFAULT_CAFECITO_AMOUNT = 3000;

export const DEFAULT_PUBLIC_CONTENT: PublicContentSettings = {
  home: {
    hero: {
      eyebrow: 'estudio creativo · IA · música',
      title: 'fábrica de\ndelirios con IA',
      subtitle:
        'Música, imágenes, video y webs hechas con IA. Más los delirios que vas a querer mandar al grupo.',
      primaryCtaLabel: 'Ver el laburo',
      primaryCtaHref: '/portfolio',
      secondaryCtaLabel: 'Bancá el proyecto',
      secondaryCtaHref: '/checkout',
    },
    supportOffer: {
      eyebrow: 'tres formas de entrar',
      title: 'Elegí cuánto bancás',
      subtitle:
        'Cada nivel desbloquea packs distintos. Sin vueltas.',
      items: [
        {
          amount: 3000,
          label: 'Morerial',
          benefit: 'entrás al ecosistema y te llevás los packs de entrada',
        },
        {
          amount: 5000,
          label: 'Cómplice',
          benefit: 'te llevás todos los packs y los recursos marcados',
        },
        {
          amount: 25000,
          label: 'Mesaza',
          benefit: 'todo lo subido, mención personal y acceso directo',
        },
      ],
    },
    featuredMission: {
      eyebrow: '#trending',
      title: 'Lo que está en cancha',
      subtitle:
        'El frente caliente del momento.',
    },
    supportModes: [
      {
        eyebrow: 'Aporte libre',
        title: 'Un cafecito para bancar el ritmo',
        description:
          'Si te gusta lo que hago y querés que siga saliendo contenido, esto me da una mano enorme.',
        ctaLabel: 'Aportar ahora',
        href: '/cafecito',
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
        description: 'Posteos solo para los que bancan: encuestas, adelantos y cosas que no subo a redes.',
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
      supportEyebrow: 'si te copó, bancá',
      supportTitle: 'tres formas de bancar',
      supportSubtitle:
        '¿Te gustó lo que viste? Esto le pone combustible. Sumás, te llevás algo o chusmeás. Elegís vos.',
      rewardsEyebrow: 'qué te llevás',
      rewardsTitle: 'niveles de cómplice',
      rewardsSubtitle:
        'Morerial, Cómplice o Mesaza. Elegís cuánto entrás y te llevás los packs que correspondan.',
      discoveryEyebrow: 'sin pagar nada',
      discoveryTitle: 'para seguir chusmeando',
      discoverySubtitle:
        'Mirá, leé, votá, caé en alguna rareza.',
    },
    courses: {
      eyebrow: 'se viene',
      title: 'Cursos de IA',
      subtitle:
        'Talleres y clases para mostrarte cómo laburo con IA: lo que fui aprendiendo a los golpes.',
      items: [
        {
          badge: 'Próximamente',
          status: 'lista de espera',
          title: 'IA para crear mejor',
          description: 'Una guía para pasar de la idea y el prompt a algo que de verdad puedas publicar.',
          href: '#',
          ctaLabel: 'Avisame',
        },
        {
          badge: 'Próximamente',
          status: 'próximamente',
          title: 'Imágenes, video y experimentos',
          description: 'Cómo combinar herramientas, arreglar lo que sale mal y terminar con algo que sirva.',
          href: '#',
          ctaLabel: 'Ver más',
        },
        {
          badge: 'Próximamente',
          status: 'próximamente',
          title: 'Internet, identidad y obra',
          description: 'Cómo usar todo esto para sonar a vos y no a un molde más.',
          href: '#',
          ctaLabel: 'Ver más',
        },
      ],
    },
    music: {
      eyebrow: 'escuchá',
      title: 'Música',
      subtitle:
        'Canciones, pruebas, videos y cosas que fui sacando o armando con ayuda de herramientas como SUNO.',
      featuredText:
        'Dale play y escuchá lo último. El player tiene visualizador en vivo mientras suena.',
      spotifyUrl: '',
      appleMusicUrl: '',
      youtubeChannelUrl: 'https://youtube.com/@santiagobalosky',
      tracks: [
        {
          category: 'Electronica',
          title: 'Tema principal',
          artist: 'Santi Balosky',
          audioUrl: '',
          coverImage: '',
          accentColor: '#00FFB2',
        },
        {
          category: 'Musica de peliculas',
          title: 'Lado B',
          artist: 'Santi Balosky',
          audioUrl: '',
          coverImage: '',
          accentColor: '#FF5DA2',
        },
        {
          category: 'Ambient',
          title: 'Outro',
          artist: 'Santi Balosky',
          audioUrl: '',
          coverImage: '',
          accentColor: '#7C5CFF',
        },
      ],
      videos: [
        { title: 'Tema 01', youtubeUrl: '' },
        { title: 'Tema 02', youtubeUrl: '' },
        { title: 'Tema 03', youtubeUrl: '' },
      ],
    },
    community: {
      eyebrow: 'la comunidad',
      title: 'La gente ya está bancando',
      subtitle:
        'Mensajes, aportes y respuestas. Todo suma.',
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
        'No hago solo contenido: también armo proyectos, piezas visuales y cosas raras que se me ocurren.',
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
        'Acá te dejo posteos, recursos y novedades para los que bancan el proyecto.',
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
    supportOffer: {
      ...DEFAULT_PUBLIC_CONTENT.home.supportOffer,
      ...(content?.home?.supportOffer ?? {}),
      items: normalizeArray(content?.home?.supportOffer?.items, DEFAULT_PUBLIC_CONTENT.home.supportOffer.items).map(
        (item, index) => ({
          ...DEFAULT_PUBLIC_CONTENT.home.supportOffer.items[index],
          ...item,
        })
      ),
    },
    featuredMission: {
      ...DEFAULT_PUBLIC_CONTENT.home.featuredMission,
      ...(content?.home?.featuredMission ?? {}),
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
    courses: {
      ...DEFAULT_PUBLIC_CONTENT.home.courses,
      ...(content?.home?.courses ?? {}),
      items: normalizeArray(content?.home?.courses?.items, DEFAULT_PUBLIC_CONTENT.home.courses.items).map(
        (item, index) => ({
          ...DEFAULT_PUBLIC_CONTENT.home.courses.items[index],
          ...item,
        })
      ),
    },
    music: {
      ...DEFAULT_PUBLIC_CONTENT.home.music,
      ...(content?.home?.music ?? {}),
      tracks: normalizeArray(content?.home?.music?.tracks, DEFAULT_PUBLIC_CONTENT.home.music.tracks).map(
        (item, index) => ({
          ...DEFAULT_PUBLIC_CONTENT.home.music.tracks[index],
          ...item,
        })
      ),
      videos: normalizeArray(content?.home?.music?.videos, DEFAULT_PUBLIC_CONTENT.home.music.videos).map(
        (item, index) => ({
          ...DEFAULT_PUBLIC_CONTENT.home.music.videos[index],
          ...item,
        })
      ),
    },
    community: {
      ...DEFAULT_PUBLIC_CONTENT.home.community,
      ...(content?.home?.community ?? {}),
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

function normalizeCafecitoAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 1
    ? Math.round(amount)
    : DEFAULT_CAFECITO_AMOUNT;
}

function normalizePaypalCurrency(value: unknown): string {
  const currency = String(value || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function normalizePaypalUnitAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100) / 100
    : 3;
}

export const normalizeSiteSettings = (settings: SiteSettings): SiteSettings => {
  const cafecitoAmount = normalizeCafecitoAmount(settings.cafecito?.amount);
  const supportAmountsSuggested = Array.from(
    new Set([
      cafecitoAmount,
      ...((settings.supportAmountsSuggested || [])
        .map((amount) => Math.round(Number(amount)))
        .filter((amount) => Number.isFinite(amount) && amount >= cafecitoAmount)),
    ]),
  );

  return {
    ...settings,
    supportAmountsSuggested,
    cafecito: {
      amount: cafecitoAmount,
      mercadoPagoLink: typeof settings.cafecito?.mercadoPagoLink === 'string'
        ? settings.cafecito.mercadoPagoLink.trim()
        : '',
      paypalLink: typeof settings.cafecito?.paypalLink === 'string'
        ? settings.cafecito.paypalLink.trim()
        : '',
      paypalCurrency: normalizePaypalCurrency(settings.cafecito?.paypalCurrency),
      paypalUnitAmount: normalizePaypalUnitAmount(settings.cafecito?.paypalUnitAmount),
    },
    content: normalizePublicContent(settings.content),
  };
};
