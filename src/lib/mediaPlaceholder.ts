/**
 * Inline SVG placeholder factory for media tiles (photos, wallpapers,
 * covers) cuando la URL original está caída / no existe.
 *
 * Decisión de UX: cuando un archivo 404s, NO escondemos la tile — mostramos
 * un placeholder visible con el título del ítem + un gradiente Delirio
 * determinístico en base al texto. Así la grilla siempre se ve poblada y el
 * usuario sabe que hay contenido ahí, aunque la imagen todavía no esté
 * subida.
 *
 * Implementación: SVG generado y codificado como data URI. Sin fetch, sin
 * latencia, pesa <1kb, y se puede asignar directo a `img.src` desde un
 * handler `onError` sin riesgo de loop (el data URI siempre carga).
 */

const DELIRIO_GRADIENTS: Array<[string, string]> = [
  ['#FA5D29', '#F02E65'],  // naranja → magenta (accent)
  ['#18D2C4', '#7C3FFF'],  // teal → violeta
  ['#7C3FFF', '#F02E65'],  // violeta → magenta
  ['#FFB83D', '#FA5D29'],  // dorado → naranja
  ['#F02E65', '#7C3FFF'],  // magenta → violeta
  ['#18D2C4', '#FA5D29'],  // teal → naranja
  ['#FFB83D', '#F02E65'],  // dorado → magenta
  ['#7C3FFF', '#18D2C4'],  // violeta → teal
];

/** Hash estable del título para elegir gradiente — mismo título = mismo color. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Genera un SVG placeholder con gradiente + título. Devuelve una data URI
 * lista para `<img src>`.
 */
export function getMediaPlaceholder(
  title: string,
  opts: { category?: string | null; width?: number; height?: number } = {},
): string {
  const { category = null, width = 800, height = 800 } = opts;
  const safeTitle = (title || 'Próximamente').slice(0, 40);
  const cat = category ? category.slice(0, 20).toUpperCase() : '';
  const [c1, c2] = DELIRIO_GRADIENTS[hashString(title || '') % DELIRIO_GRADIENTS.length];
  const id = `g${hashString(title || '') % 10000}`;

  // Escape para XML — solo los chars problemáticos
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="${id}g" cx="30%" cy="25%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#${id})"/>
  <rect width="100%" height="100%" fill="url(#${id}g)"/>
  ${cat ? `<text x="50%" y="44%" font-family="monospace,Inter,sans-serif" font-size="${Math.round(width * 0.03)}" font-weight="600" fill="rgba(255,255,255,0.75)" text-anchor="middle" letter-spacing="4">${esc(cat)}</text>` : ''}
  <text x="50%" y="${cat ? 54 : 50}%" font-family="Inter Tight,Inter,sans-serif" font-size="${Math.round(width * 0.07)}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">${esc(safeTitle)}</text>
  <text x="50%" y="94%" font-family="monospace,Inter,sans-serif" font-size="${Math.round(width * 0.02)}" font-weight="500" fill="rgba(255,255,255,0.55)" text-anchor="middle" letter-spacing="3">· PRÓXIMAMENTE ·</text>
</svg>`;

  // encodeURIComponent + data URI — evita que # o & rompan el src
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
