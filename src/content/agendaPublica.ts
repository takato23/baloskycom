export type AgendaMetric = {
  num: string;
  label: string;
};

export type AgendaChart = {
  src: string;
  title: string;
  text?: string;
};

export type AgendaCard = {
  title: string;
  body: string;
};

export type AgendaStep = {
  title: string;
  body: string;
};

export type AgendaYearSpotlight = {
  year: string;
  value: string;
  label: string;
  detail?: string;
};

export type AgendaTopTheme = {
  topic: string;
  scope: string;
  duration: number;
  reactivations: number;
};

export type AgendaCategorySummary = {
  category: string;
  topics: number;
  averageDuration: string;
  maxDuration: number;
};

export const AGENDA_PUBLICA_CONTENT = {
  project: {
    name: 'Agenda pública 2019–2026',
    route: '/agenda-publica',
  },
  seo: {
    defaultTitle: 'Agenda pública 2019–2026',
    defaultDescription:
      'Un estudio sobre cuánto tiempo nos ocuparon los grandes temas entre 2019 y hoy.',
    ogTitle: 'La agenda que no nos deja respirar',
    ogDescription:
      'Más de la mitad del tiempo entre 2019 y hoy hubo al menos un tema que se llevó toda la atención.',
    keywords: [
      'agenda pública',
      'fatiga informativa',
      'Argentina',
      'medios',
      'timeline',
      'NotebookLM',
    ],
  },
  hero: {
    eyebrow: 'Investigación + timeline + notebook interactivo',
    title: 'La agenda que no nos deja respirar',
    description:
      'Un estudio sobre cuánto nos ocuparon los grandes temas entre 2019 y hoy.',
    support: '',
  },
  thesis:
    'No es solo que pasan muchas cosas. Es que un tema todavía no termina y ya aparece otro.',
  studyIntro: {
    title: 'De qué va',
    body:
      'Mira qué temas se llevaron la atención pública en Argentina y en el mundo entre 2019 y 2026.',
  },
  studyFinding: {
    title: 'Qué encontró',
    body:
      'El cansancio viene de tres cosas: temas que duran mucho, temas que vuelven y temas que se pisan entre sí.',
  },
  metrics: [
    { num: '37', label: 'temas principales analizados' },
    { num: '51,1%', label: 'del tiempo hubo al menos un tema que se llevó la atención' },
    { num: '472', label: 'días hubo dos o más temas fuertes al mismo tiempo' },
    { num: '30', label: 'veces un tema fuerte tapó rápido a otro' },
  ] satisfies AgendaMetric[],
  charts: [
    {
      src: '/agenda-publica/12_chart_dias_con_tema_por_anio.png',
      title: 'Días con un tema que se llevó la atención',
    },
    {
      src: '/agenda-publica/13_chart_superposicion_por_anio.png',
      title: 'Temas que se pisaron entre sí',
    },
    {
      src: '/agenda-publica/14_chart_top10_duracion.png',
      title: 'Top 10 por duración',
    },
    {
      src: '/agenda-publica/17_dashboard_cinco_numeros.png',
      title: 'Resumen rápido',
    },
  ] satisfies AgendaChart[],
  hallazgos: {
    id: 'hallazgos',
    title: 'Qué muestra',
    lead: '',
    cards: [
      {
        title: '1. No es solo cantidad',
        body:
          'No cansa solo que pasen muchas cosas. Cansa que se mezclen temas largos con sacudones breves.',
      },
      {
        title: '2. 2024 fue el año más cargado',
        body:
          'Fue el año con más cambios de tema en poco tiempo.',
      },
      {
        title: '3. Algunas agendas vuelven',
        body:
          'No siempre aparece algo nuevo. Muchas veces vuelve lo mismo con otra forma.',
      },
    ] satisfies AgendaCard[],
  },
  digest: [
    'Más de la mitad del tiempo hubo un tema que se llevó la atención.',
    'La carga sube todavía más cuando varios temas se pisan.',
    '2024 fue el año con más cambios de tema seguidos.',
    'Guerras, elecciones y COVID duraron más que muchos escándalos.',
  ],
  usar: {
    id: 'usar',
    title: 'Cómo usarla',
    lead: '',
    steps: [
      {
        title: 'Entrada',
        body:
          'Un reel o carrusel trae gente acá.',
      },
      {
        title: 'Exploración',
        body:
          'De acá salen preguntas.',
      },
      {
        title: 'Conversación',
        body:
          'Las mejores vuelven como posteos.',
      },
      {
        title: 'Archivo',
        body:
          'Con el tiempo, esto arma un archivo.',
      },
    ] satisfies AgendaStep[],
  },
  questions: [
    '¿Qué tema ocupó más tiempo real en la agenda?',
    '¿En qué año cambiaron más rápido los temas?',
    '¿Qué dura más: una tragedia, una ley o una guerra?',
    '¿Qué temas volvieron más veces después de terminar?',
    '¿Qué diferencia hay entre agenda argentina y agenda global?',
  ],
  publishItems: [
    'Dossier resumido.',
    'Tabla limpia.',
    'Los gráficos PNG.',
    'Audio overview.',
    'Video overview.',
    'Preguntas para el notebook.',
  ],
  privateItems: [
    'Borradores crudos.',
    'Notas internas.',
    'Material sensible.',
    'Fuentes privadas.',
    'Versiones en revisión.',
  ],
  ctaExamples: [
    'Hacé tu pregunta',
    'Escuchá el resumen',
    'Mirá el video',
    'Traeme otra hipótesis',
    'Sumate al próximo informe',
  ],
  sources: [
    'Dossier maestro agenda pública 2019–2026',
    'Tabla maestra de temas y métricas',
    'Métricas por año',
    'Reemplazos y rachas',
    'Top 10 por duración',
    'Resumen por categorías',
    'Gráficos exportados y material NotebookLM',
  ],
};

export const AGENDA_YEAR_SPOTLIGHTS: AgendaYearSpotlight[] = [
  {
    year: 'Dato clave',
    value: '2024',
    label: 'fue el año con más cambios de tema seguidos',
  },
];

export const AGENDA_TOP_THEMES: AgendaTopTheme[] = [
  {
    topic: 'COVID-19, cuarentena y campaña de vacunación',
    scope: 'Argentina',
    duration: 269,
    reactivations: 3,
  },
  {
    topic: 'Guerra Israel-Hamás / Gaza',
    scope: 'Global',
    duration: 156,
    reactivations: 4,
  },
  {
    topic: 'Elección de EE.UU. 2024 / retorno de Trump',
    scope: 'Global',
    duration: 118,
    reactivations: 1,
  },
  {
    topic: 'Elecciones 2023 / ascenso de Milei',
    scope: 'Argentina',
    duration: 115,
    reactivations: 1,
  },
  {
    topic: 'ChatGPT y la ola de IA generativa',
    scope: 'Global',
    duration: 110,
    reactivations: 3,
  },
];

export const AGENDA_CATEGORY_SUMMARY: AgendaCategorySummary[] = [
  {
    category: 'salud',
    topics: 1,
    averageDuration: '269 días',
    maxDuration: 269,
  },
  {
    category: 'tecnología',
    topics: 1,
    averageDuration: '110 días',
    maxDuration: 110,
  },
  {
    category: 'economía, elecciones y reformas',
    topics: 8,
    averageDuration: '69,5 días',
    maxDuration: 118,
  },
  {
    category: 'guerras y conflictos',
    topics: 8,
    averageDuration: '61,9 días',
    maxDuration: 156,
  },
];
