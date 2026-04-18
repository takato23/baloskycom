import { useEffect, useRef } from 'react';

/**
 * Port of `<section id="archivo">` — drag-to-scroll archive rail.
 *
 * Faithful port. The rail uses native horizontal scrolling plus a mousedown
 * grab handler so desktop users can fling it. Touch scrolling works out of
 * the box. Entries are static placeholders — a CMS-backed feed and the
 * archive detail modal are a future pass, not blockers for this port.
 */

type RailItem = {
  n: string;
  cls: 'g1' | 'g2' | 'g3' | 'g4' | 'g5';
  cat: string;
  title: string;
  desc: string;
};

const ITEMS: RailItem[] = [
  {
    n: '01',
    cls: 'g1',
    cat: 'DISCO · 2026',
    title: '"Nadie escucha"',
    desc: 'Single nuevo. Mix final.',
  },
  {
    n: '02',
    cls: 'g2',
    cat: 'VIVO · 2026',
    title: 'Niceto, marzo',
    desc: 'Grabación completa · 78 min.',
  },
  {
    n: '03',
    cls: 'g3',
    cat: 'PROCESO · 2025',
    title: 'Cuaderno abierto',
    desc: 'Letras y bocetos.',
  },
  {
    n: '04',
    cls: 'g4',
    cat: 'ENCUENTROS · 2025',
    title: 'Club en Mar del Plata',
    desc: '52 miembros IRL.',
  },
  {
    n: '05',
    cls: 'g5',
    cat: 'DROP · 2024',
    title: 'Remera edición 01',
    desc: 'Limitada · 120 unidades.',
  },
  {
    n: '06',
    cls: 'g1',
    cat: 'ENSAYO · 2024',
    title: 'Sobre el algoritmo',
    desc: 'Texto · 12 min lectura.',
  },
  { n: '07', cls: 'g2', cat: 'DISCO · 2023', title: '"Órbita"', desc: 'EP de 4 tracks.' },
];

export default function ArchivoSection() {
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: MouseEvent) => {
      down = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('dragging');
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    };
    const onUp = () => {
      down = false;
      el.classList.remove('dragging');
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <section id="archivo">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--gold)', color: '#0a0908' }}>
                09 · ARCHIVO
              </span>
            </div>
            <h2>cinco años<br /><em>al alcance</em>.</h2>
          </div>
          <p>
            Todo lo publicado, en una franja que se arrastra. Videos, temas, giras, encuentros,
            drops. Click para abrir, arrastrá para pasar.
          </p>
        </div>
      </div>
      <div className="wrap">
        <div
          ref={railRef}
          className="rail reveal annot-wrap"
          data-cursor="ARRASTRAME"
        >
          <div
            className="scrawl-arrow"
            style={{
              position: 'absolute',
              top: -18,
              left: 30,
              transform: 'rotate(60deg)',
              color: 'var(--teal)',
              zIndex: 5,
            }}
          >
            ↘
          </div>
          <div
            className="scrawl"
            style={{
              position: 'absolute',
              top: -50,
              left: 70,
              color: 'var(--teal)',
              zIndex: 5,
            }}
          >
            agarrá y arrastrá
          </div>
          {ITEMS.map((it, i) => (
            <div key={i} data-cursor="ARRASTRAR" className={`rail-card ${it.cls}`}>
              <div className="art">{it.n}</div>
              <div className="info">
                <div className="cat">{it.cat}</div>
                <h4>{it.title}</h4>
                <p>{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
