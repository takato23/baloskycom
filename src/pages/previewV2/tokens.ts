/**
 * Design tokens Balosky v2 — paleta chocolate cálida + 8 planetas.
 * Porteado desde balosky-design/design-tokens.js (Proyecto Claude Design).
 *
 * Principio: cada sección es un "planeta" con su propia hue pero
 * chroma + lightness parecidos, así el set se lee como una familia.
 */

export type OrbitKey =
  | 'sobreMi'
  | 'ideas'
  | 'trabajo'
  | 'multimedia'
  | 'fotos'
  | 'musica'
  | 'club'
  | 'cafecito';

export interface Orbit {
  c1: string;
  c2: string;
  label: string;
  idx: string;
}

export interface BaloskyTokens {
  bg: string;
  bgDeep: string;
  panel: string;
  panelSoft: string;
  hairline: string;
  hairlineStrong: string;
  text: string;
  textMuted: string;
  textDim: string;
  orbits: Record<OrbitKey, Orbit>;
  accent: string;
  accentDeep: string;
}

export const TOKENS: BaloskyTokens = {
  bg: '#120B08',
  bgDeep: '#0A0605',
  panel: '#1A110D',
  panelSoft: '#231611',
  hairline: 'rgba(255,240,230,0.08)',
  hairlineStrong: 'rgba(255,240,230,0.14)',

  text: '#F5EDE4',
  textMuted: 'rgba(245,237,228,0.62)',
  textDim: 'rgba(245,237,228,0.38)',

  orbits: {
    sobreMi:    { c1: '#F8D3A0', c2: '#E2935B', label: 'sobre mí',    idx: '01' },
    ideas:      { c1: '#BEE4FF', c2: '#6FA6D2', label: 'ideas',       idx: '02' },
    trabajo:    { c1: '#FFB48A', c2: '#F07A3E', label: 'trabajo',     idx: '03' },
    multimedia: { c1: '#F7B7D8', c2: '#D56AA0', label: 'multimedia',  idx: '04' },
    fotos:      { c1: '#C8B5F5', c2: '#8470C4', label: 'fotos',       idx: '05' },
    musica:     { c1: '#B8E6C9', c2: '#62A87D', label: 'música',      idx: '06' },
    club:       { c1: '#E8D0FF', c2: '#9B77D9', label: 'club',        idx: '07' },
    cafecito:   { c1: '#FFD35E', c2: '#E39A1F', label: 'cafecito',    idx: '08' },
  },

  accent: '#F07A3E',
  accentDeep: '#C85A22',
};

export const SECTIONS: OrbitKey[] = [
  'sobreMi', 'ideas', 'trabajo', 'multimedia', 'fotos', 'musica', 'club', 'cafecito',
];

/**
 * Mapeo: cada sección → video de "comer".
 * Los 4 videos reales se reciclan entre las 8 secciones por afinidad de color.
 * Path absoluto desde /public.
 */
export const EAT_VIDEO_BY_SECTION: Record<OrbitKey, string> = {
  sobreMi:    '/uploads/videos/v2/eat-naranja.mp4',   // durazno → naranja
  ideas:      '/uploads/videos/v2/eat-rosa.mp4',      // celeste → rosa (cool)
  trabajo:    '/uploads/videos/v2/eat-naranja.mp4',   // naranja
  multimedia: '/uploads/videos/v2/eat-rosa.mp4',      // rosa
  fotos:      '/uploads/videos/v2/eat-rosa.mp4',      // lavanda → rosa
  musica:     '/uploads/videos/v2/eat-verde.mp4',     // menta → verde
  club:       '/uploads/videos/v2/eat-rosa.mp4',      // violeta → rosa
  cafecito:   '/uploads/videos/v2/eat-amarilla.mp4',  // miel → amarilla
};

export const IDLE_VIDEO = '/uploads/videos/v2/idle-clean.mp4';
