/**
 * Port of the `<div class="marquee">` band under the hero.
 *
 * Tricolor words scroll right-to-left on a 35s loop (CSS-driven via
 * `.marquee-track` keyframes in `src/styles/delirio.css`). The list is
 * duplicated so the seam is never visible.
 */
const ITEMS = [
  'música',
  'proyectos',
  'mensajes',
  'encargos',
  'ensayos',
  'comunidad',
];

export default function MarqueeStrip() {
  const track = [...ITEMS, ...ITEMS]; // duplicate so the scroll wraps seamlessly
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {track.map((word, i) => (
          <span key={`${word}-${i}`} className="item">
            {word} <span className="sep" />
          </span>
        ))}
      </div>
    </div>
  );
}
