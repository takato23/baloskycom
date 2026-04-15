import {
  PublicContentSettings,
  SiteSettings,
} from '@/types';

export const DEFAULT_PUBLIC_CONTENT: PublicContentSettings = {
  home: {
    hero: {
      eyebrow: 'pasen y vean',
      title: 'si me bancás\nalgo te llevás',
      subtitle:
        'Stickers, wallpapers y los delirios que vas a querer mandar al grupo.',
      primaryCtaLabel: 'Elegir pack',
      primaryCtaHref: '/checkout',
      secondaryCtaLabel: 'Qué hay adentro',
      secondaryCtaHref: '/vip',
    },
    supportOffer: {
      eyebrow: 'tres formas de entrar',
      title: 'Elegí cuánto bancás',
      subtitle:
        'Cada nivel desbloquea packs distintos. Sin vueltas.',
      items: [
        {
          amount: 1000,
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
      supportEyebrow: 'por dónde entrar',
      supportTitle: 'tres formas de bancar',
      supportSubtitle:
        'Sumás, te llevás o chusmeás. Elegís vos.',
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
        'Talleres, clases y formatos donde voy a compartir lo que vengo aprendiendo con herramientas y flujos de IA.',
      items: [
        {
          badge: 'Próximamente',
          status: 'lista de espera',
          title: 'IA para crear mejor',
          description: 'Una guía para bajar ideas, prompts y flujos a cosas concretas y publicables.',
          href: '#',
          ctaLabel: 'Avisame',
        },
        {
          badge: 'Próximamente',
          status: 'próximamente',
          title: 'Imágenes, video y experimentos',
          description: 'Procesos para mezclar herramientas, corregir resultados y salir con algo usable.',
          href: '#',
          ctaLabel: 'Ver más',
        },
        {
          badge: 'Próximamente',
          status: 'próximamente',
          title: 'Internet, identidad y obra',
          description: 'Cómo convertir herramientas nuevas en una voz propia en vez de hacer ruido genérico.',
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
        'Subí tus audios a una URL pública o cargalos desde admin. El player tiene visualizador en vivo y también te deja probar MP3 locales en el momento.',
      spotifyUrl: 'https://open.spotify.com/artist/balosky',
      appleMusicUrl: 'https://music.apple.com/artist/balosky',
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

export const normalizeSiteSettings = (settings: SiteSettings): SiteSettings => ({
  ...settings,
  content: normalizePublicContent(settings.content),
});
