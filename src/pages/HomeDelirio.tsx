/**
 * HomeDelirio — port React del prototipo prototype-delirio.html
 *
 * Ruta: /delirio
 * Convive con la Home actual en `/` — permite A/B sin romper nada.
 *
 * Incluye:
 *   - Sistema de variantes (calle/delirio/luto/secreto) vía useDelirioVariant
 *   - Rotación automática de drop (humor→musica→duelo→fiesta) cada 14s
 *   - URL params ?variant=xxx&drop=xxx para shareable links
 *   - 5 secciones numeradas: §01 PASA AHORA, §02 APOYÁ, §03 CLUB, §04 MURAL, §05 DROP
 *   - Scroll reveals vía IntersectionObserver
 *   - Easter egg reset: 7 clicks en foot-mark
 *   - Respeta prefers-reduced-motion (via CSS en index.css)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDelirioVariant, type DelirioVariant, type DelirioDrop } from '@/hooks/useDelirioVariant';
import { useAppContext } from '@/context/AppContext';
import PageMeta from '@/components/PageMeta';

const DROP_LABELS: Record<DelirioDrop, string> = {
  humor: 'HUMOR',
  musica: 'MÚSICA',
  duelo: 'DUELO',
  fiesta: 'FIESTA',
};

const VARIANT_LABELS: Record<DelirioVariant, string> = {
  calle: 'CALLE',
  delirio: 'DELIRIO',
  luto: 'LUTO',
  secreto: 'SECRETO',
};

/* ──────────────────────── Reveal hook ──────────────────────── */
function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/* ──────────────────────── Mode Switch panel ──────────────────────── */
function ModeSwitchPanel({
  variant,
  setVariant,
}: {
  variant: DelirioVariant;
  setVariant: (v: DelirioVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-4 top-4 z-[60] min-h-[44px] min-w-[44px] border-[1.5px] border-[var(--dlr-ink)] bg-[var(--dlr-paper-lift)] px-3 text-[10px] tracking-[0.16em]"
        style={{ fontFamily: 'var(--dlr-f-mono)', boxShadow: 'var(--dlr-stamp-shadow)' }}
        aria-expanded={open}
        aria-controls="dlr-mode-switch"
      >
        MODO · {VARIANT_LABELS[variant]}
      </button>
      {open && (
        <div id="dlr-mode-switch" className="dlr-mode-switch" role="dialog" aria-label="Cambiar modo">
          {(Object.keys(VARIANT_LABELS) as DelirioVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              className={v === variant ? 'is-active' : ''}
              onClick={() => {
                setVariant(v);
                setOpen(false);
              }}
            >
              {VARIANT_LABELS[v]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ──────────────────────── Chrome (top bar) ──────────────────────── */
function Chrome({ drop }: { drop: DelirioDrop }) {
  const [clockText, setClockText] = useState('');
  useEffect(() => {
    function tick() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setClockText(`${hh}:${mm} BA`);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header
      className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] px-4 py-3 sm:px-8"
      style={{ borderColor: 'var(--dlr-rule-strong)' }}
    >
      <div className="flex items-center gap-2" style={{ fontFamily: 'var(--dlr-f-display)' }}>
        <span
          className="inline-block h-[10px] w-[10px] rounded-full"
          style={{ background: 'var(--dlr-accent)', animation: 'dlr-breathe 2.4s ease-in-out infinite' }}
          aria-hidden
        />
        <span className="text-[20px] tracking-tight">BALOSKY</span>
        <span className="dlr-scrawl ml-1 text-[18px]" style={{ color: 'var(--dlr-accent-strong)' }}>
          ·laboratorio
        </span>
      </div>

      <div
        className="flex items-center gap-3 text-[11px] tracking-[0.18em]"
        style={{ fontFamily: 'var(--dlr-f-mono)' }}
      >
        <span className="hidden sm:inline" style={{ color: 'var(--dlr-ink-soft)' }}>
          {clockText}
        </span>
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 min-h-[36px]"
          style={{ borderColor: 'var(--dlr-rule-strong)', fontFamily: 'var(--dlr-f-mono)', fontSize: '10px', letterSpacing: '0.2em' }}
        >
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ background: 'var(--dlr-accent)', animation: 'dlr-breathe 1.2s infinite' }}
            aria-hidden
          />
          DROP EN VIVO: {DROP_LABELS[drop]}
        </span>
      </div>

      <style>{`
        @keyframes dlr-breathe { 0%,100% { opacity: 1; transform: scale(1);} 50% { opacity: 0.55; transform: scale(0.82);} }
      `}</style>
    </header>
  );
}

/* ──────────────────────── Hero ──────────────────────── */
function Hero() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:px-8 sm:pb-32 sm:pt-16">
      <div
        ref={ref}
        className="dlr-reveal relative mx-auto max-w-[1400px]"
      >
        <div className="dlr-eyebrow mb-4">
          [§00 · UN LUGAR ROTO PARA LA BANDA MÁS CROTA DEL INTERNET]
        </div>
        <h1
          className="dlr-hero-type"
          style={{ fontSize: 'clamp(56px, 14vw, 220px)' }}
        >
          SANTI,
          <br />
          <em className="dlr-scrawl" style={{ color: 'var(--dlr-accent-strong)', fontSize: '0.82em' }}>
            ¿estás bien?
          </em>
        </h1>

        <p
          className="mt-8 max-w-[640px] text-[17px] leading-[1.55] sm:text-[19px]"
          style={{ color: 'var(--dlr-ink-soft)' }}
        >
          Esto no es una landing. Es un laboratorio. Hay música que cae, memes que se descontrolan, gente que deja
          huella en la pared y club para los que quieren entrar al backstage. Elegí por dónde empezar.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="#apoya" className="dlr-btn">
            TIRÁ UNOS MANGOS
            <span aria-hidden>→</span>
          </a>
          <a href="#mural" className="dlr-btn ghost">
            DEJÁ HUELLA EN LA PARED
          </a>
        </div>

        <div className="pointer-events-none absolute -right-10 top-4 hidden sm:block">
          <div
            className="dlr-scrawl"
            style={{
              fontSize: '54px',
              transform: 'rotate(6deg)',
              color: 'var(--dlr-accent-strong)',
              opacity: 0.9,
            }}
          >
            ¿vos acá?
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── §01 PASA AHORA (stats) ──────────────────────── */
function SectionPasaAhora() {
  const ref = useReveal<HTMLDivElement>();
  const [online, setOnline] = useState(427);
  const [aportes, setAportes] = useState(12);
  const [countdown, setCountdown] = useState(14 * 60 * 60 + 12 * 60 + 45); // 14:12:45

  useEffect(() => {
    const t1 = window.setInterval(
      () => setOnline((n) => Math.max(200, n + Math.floor(Math.random() * 9) - 4)),
      5000
    );
    const t2 = window.setInterval(() => setAportes((n) => n + (Math.random() > 0.6 ? 1 : 0)), 3500);
    const t3 = window.setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => {
      window.clearInterval(t1);
      window.clearInterval(t2);
      window.clearInterval(t3);
    };
  }, []);

  const formatTime = (total: number) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <section
      id="pasa-ahora"
      className="px-4 py-16 sm:px-8 sm:py-24"
      style={{ background: 'var(--dlr-paper-deep)' }}
    >
      <div ref={ref} className="dlr-reveal mx-auto max-w-[1400px]">
        <div className="dlr-section-head">
          <h2>
            PASA <em>ahora</em>
          </h2>
          <span className="pin">§01</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dlr-stat">
            <div className="lbl">ONLINE HOY</div>
            <div className="val">{online}</div>
            <div className="note">gente dando vueltas por acá</div>
          </div>
          <div className="dlr-stat is-accent">
            <div className="lbl">APORTES · {new Date().toLocaleDateString('es-AR')}</div>
            <div className="val">{aportes}</div>
            <div className="note">las últimas horas</div>
          </div>
          <div className="dlr-stat">
            <div className="lbl">MURAL</div>
            <div className="val">3.4K</div>
            <div className="note">mensajes pegados en la pared</div>
          </div>
          <div className="dlr-stat">
            <div className="lbl">PRÓXIMO DROP EN</div>
            <div className="val" style={{ fontFamily: 'var(--dlr-f-mono)' }}>
              {formatTime(countdown)}
            </div>
            <div className="note">después cierro, no avisa nadie</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── §02 APOYÁ (flyers) ──────────────────────── */
const FLYERS = [
  {
    id: 'c3',
    tag: 'LIBRE',
    title: 'Un Cafecito (o lo que quieras)',
    copy: 'Sin meta, sin recompensa. Si te hizo reír un reel, tirame cualquier cosa.',
    raised: 14200,
    goal: 20000,
    featured: false,
  },
  {
    id: 'c1',
    tag: 'ACTIVA',
    title: 'Grabar el disco en vivo',
    copy: 'Vamos a grabar en sala con músicos en ronda. Vos bancás un cable, yo te pongo en los créditos.',
    raised: 340000,
    goal: 800000,
    featured: true,
  },
  {
    id: 'c2',
    tag: 'CORTA EN 3 DÍAS',
    title: 'Vinilo edición Delirio',
    copy: 'Tirada de 100. Numerada. Si cerrás los ojos y le hablás, contesta.',
    raised: 80000,
    goal: 120000,
    featured: false,
  },
];

function SectionApoya() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="apoya" className="px-4 py-16 sm:px-8 sm:py-24">
      <div ref={ref} className="dlr-reveal mx-auto max-w-[1400px]">
        <div className="dlr-section-head">
          <h2>
            APOYÁ <em>algo</em>
          </h2>
          <span className="pin">§02</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FLYERS.map((f) => (
            <article key={f.id} className={`dlr-flyer ${f.featured ? 'featured' : ''}`}>
              <span className="tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p className="text-[14px] leading-[1.55]" style={{ color: f.featured ? 'var(--dlr-ink)' : 'var(--dlr-ink-soft)' }}>
                {f.copy}
              </p>
              <div className="progress" aria-hidden>
                <span className="fill" style={{ width: `${Math.min(100, (f.raised / f.goal) * 100)}%` }} />
              </div>
              <div
                className="flex items-center justify-between text-[12px]"
                style={{ fontFamily: 'var(--dlr-f-mono)', letterSpacing: '0.08em' }}
              >
                <span>
                  <b style={{ fontFamily: 'var(--dlr-f-chunk)', fontSize: '18px' }}>
                    ${f.raised.toLocaleString('es-AR')}
                  </b>
                  <span style={{ opacity: 0.7 }}> / ${f.goal.toLocaleString('es-AR')}</span>
                </span>
                <Link
                  to={`/checkout/${f.id}`}
                  className="underline-offset-4 hover:underline"
                  style={{ color: f.featured ? 'var(--dlr-ink)' : 'var(--dlr-accent-strong)' }}
                >
                  TIRÁ MANGOS →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── §03 CLUB (ranks) ──────────────────────── */
const RANKS = [
  { name: 'Crota basica', price: 1000, perks: ['Newsletter con cosas que nunca voy a subir', 'Acceso al canal oculto'] },
  { name: 'Crota de oro', price: 4500, perks: ['Todo lo anterior', 'Nombre en los créditos del próximo tema', 'Demos antes que nadie'] },
  { name: 'Crota suprema', price: 12000, perks: ['Todo lo anterior', 'Una llamada al año (de verdad)', 'Tema dedicado en stories'] },
];

function SectionClub() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="club" className="px-4 py-16 sm:px-8 sm:py-24" style={{ background: 'var(--dlr-paper-deep)' }}>
      <div ref={ref} className="dlr-reveal mx-auto max-w-[1400px]">
        <div className="dlr-section-head">
          <h2>
            EL <em>club</em>
          </h2>
          <span className="pin">§03</span>
        </div>
        <p className="mb-8 max-w-[560px]" style={{ color: 'var(--dlr-ink-soft)' }}>
          Tres tiers. Ninguno te hace persona VIP. Te hace cómplice, que es distinto.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          {RANKS.map((r, i) => (
            <article
              key={r.name}
              className={`dlr-flyer ${i === 1 ? 'featured' : ''}`}
              style={{ minHeight: 340 }}
            >
              <span className="tag">TIER {i + 1}</span>
              <h3>{r.name}</h3>
              <div
                className="dlr-chunk"
                style={{ fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1 }}
              >
                ${r.price.toLocaleString('es-AR')}
                <span className="dlr-eyebrow ml-1" style={{ color: i === 1 ? 'var(--dlr-ink)' : 'var(--dlr-ink-soft)' }}>
                  /mes
                </span>
              </div>
              <ul className="space-y-2 text-[14px]" style={{ color: i === 1 ? 'var(--dlr-ink)' : 'var(--dlr-ink-soft)' }}>
                {r.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden>→</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link to="/checkout" className="dlr-btn mt-auto self-start">
                ENTRÁ
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── §04 MURAL ──────────────────────── */
function SectionMural() {
  const ref = useReveal<HTMLDivElement>();
  const { supporters } = useAppContext();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const latest = (supporters || [])
    .slice(-6)
    .reverse()
    .filter((s) => s.message && s.message.trim().length > 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;
    setSubmitted(true);
    setName('');
    setMsg('');
    window.setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section id="mural" className="px-4 py-16 sm:px-8 sm:py-24">
      <div ref={ref} className="dlr-reveal mx-auto max-w-[1400px]">
        <div className="dlr-section-head">
          <h2>
            EL <em>mural</em>
          </h2>
          <span className="pin">§04</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.length > 0
              ? latest.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="border-[1.5px] p-4"
                    style={{
                      borderColor: 'var(--dlr-ink)',
                      background: 'var(--dlr-paper-lift)',
                      transform: `rotate(${(Number(s.id) % 5) - 2}deg)`,
                    }}
                  >
                    <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--dlr-ink)' }}>
                      "{s.message}"
                    </p>
                    <p
                      className="mt-3 dlr-scrawl"
                      style={{ fontSize: '18px', color: 'var(--dlr-accent-strong)' }}
                    >
                      — {s.name}
                    </p>
                  </div>
                ))
              : [1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="border-[1.5px] p-4"
                    style={{
                      borderColor: 'var(--dlr-ink)',
                      background: 'var(--dlr-paper-lift)',
                      transform: `rotate(${(i % 5) - 2}deg)`,
                    }}
                  >
                    <p className="text-[14px] leading-[1.5]" style={{ color: 'var(--dlr-ink-soft)' }}>
                      (pegá tu primer mensaje acá al lado)
                    </p>
                  </div>
                ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-3 border-[1.5px] p-5"
            style={{
              borderColor: 'var(--dlr-ink)',
              background: 'var(--dlr-paper-lift)',
              boxShadow: 'var(--dlr-stamp-shadow)',
            }}
          >
            <label className="dlr-eyebrow" htmlFor="dlr-mural-name">
              Tu nombre
            </label>
            <input
              id="dlr-mural-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="min-h-[44px] border-[1.5px] px-3 py-2 text-[15px]"
              style={{
                borderColor: 'var(--dlr-rule-strong)',
                background: 'var(--dlr-paper)',
                color: 'var(--dlr-ink)',
                fontFamily: 'var(--dlr-f-body)',
              }}
              placeholder="como te digan"
            />
            <label className="dlr-eyebrow" htmlFor="dlr-mural-msg">
              Mensaje
            </label>
            <textarea
              id="dlr-mural-msg"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              maxLength={280}
              rows={4}
              className="border-[1.5px] px-3 py-2 text-[15px] leading-[1.5]"
              style={{
                borderColor: 'var(--dlr-rule-strong)',
                background: 'var(--dlr-paper)',
                color: 'var(--dlr-ink)',
                fontFamily: 'var(--dlr-f-body)',
              }}
              placeholder="dejá huella en la pared"
            />
            <button type="submit" className="dlr-btn">
              PEGAR
            </button>
            {submitted && (
              <p
                className="dlr-scrawl text-[18px]"
                style={{ color: 'var(--dlr-accent-strong)' }}
                role="status"
              >
                ✱ quedó pegado
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── §05 DROP (música/productos) ──────────────────────── */
function SectionDrop() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="drop" className="px-4 py-16 sm:px-8 sm:py-24" style={{ background: 'var(--dlr-paper-deep)' }}>
      <div ref={ref} className="dlr-reveal mx-auto max-w-[1400px]">
        <div className="dlr-section-head">
          <h2>
            EL <em>drop</em>
          </h2>
          <span className="pin">§05</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article className="dlr-flyer">
            <span className="tag">ÚLTIMO TEMA</span>
            <h3>Cliptoris (versión velorio)</h3>
            <p className="text-[14px]" style={{ color: 'var(--dlr-ink-soft)' }}>
              Armónica y Casio. Cuatro minutos y medio de lo que salga.
            </p>
            <a href="https://open.spotify.com/artist" className="underline" target="_blank" rel="noreferrer" style={{ color: 'var(--dlr-accent-strong)' }}>
              SPOTIFY →
            </a>
          </article>
          <article className="dlr-flyer featured">
            <span className="tag">VINILO</span>
            <h3>Edición Delirio · 100 numerados</h3>
            <p className="text-[14px]">
              Si cerrás los ojos y le hablás, contesta. Sale la semana que viene.
            </p>
            <Link to="/portfolio" className="dlr-btn" style={{ background: 'var(--dlr-ink)', color: 'var(--dlr-paper)' }}>
              VER EDICIÓN
            </Link>
          </article>
          <article className="dlr-flyer">
            <span className="tag">MERCH</span>
            <h3>Remera "maaadre faaalsa"</h3>
            <p className="text-[14px]" style={{ color: 'var(--dlr-ink-soft)' }}>
              Bordada a mano. Algodón pesado. Talle único como el alma.
            </p>
            <Link to="/gallery" className="underline" style={{ color: 'var(--dlr-accent-strong)' }}>
              VER MERCH →
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Footer ──────────────────────── */
function Footer({ onReset }: { onReset: () => void }) {
  const clicks = useRef(0);
  const timer = useRef<number | null>(null);

  const handleMark = () => {
    clicks.current += 1;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      clicks.current = 0;
    }, 1200);
    if (clicks.current >= 7) {
      clicks.current = 0;
      onReset();
    }
  };

  return (
    <footer
      className="border-t-[1.5px] px-4 py-10 sm:px-8"
      style={{ borderColor: 'var(--dlr-rule-strong)' }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-6">
        <div>
          <div className="dlr-hero-type" style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}>
            BALOSKY
          </div>
          <p className="dlr-scrawl mt-1" style={{ fontSize: '20px', color: 'var(--dlr-accent-strong)' }}>
            nos vemos en los reels
          </p>
        </div>
        <ul
          className="flex flex-wrap gap-5 text-[12px]"
          style={{ fontFamily: 'var(--dlr-f-mono)', letterSpacing: '0.15em' }}
        >
          <li>
            <a href="https://instagram.com/santiagobalosky" target="_blank" rel="noreferrer">
              IG
            </a>
          </li>
          <li>
            <a href="https://open.spotify.com/" target="_blank" rel="noreferrer">
              SPOTIFY
            </a>
          </li>
          <li>
            <a href="https://youtube.com/@santiagobalosky" target="_blank" rel="noreferrer">
              YT
            </a>
          </li>
          <li>
            <Link to="/">HOME CLÁSICA</Link>
          </li>
        </ul>
        <button
          type="button"
          onClick={handleMark}
          aria-label="marca"
          className="inline-flex h-[36px] w-[36px] items-center justify-center text-[20px]"
          style={{ color: 'var(--dlr-ink-soft)' }}
        >
          ✱
        </button>
      </div>
    </footer>
  );
}

/* ──────────────────────── Ticker nav ──────────────────────── */
const PINS: { id: string; label: string }[] = [
  { id: 'pasa-ahora', label: '§01 PASA' },
  { id: 'apoya', label: '§02 APOYÁ' },
  { id: 'club', label: '§03 CLUB' },
  { id: 'mural', label: '§04 MURAL' },
  { id: 'drop', label: '§05 DROP' },
];

function TickerNav() {
  const [active, setActive] = useState('pasa-ahora');
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    PINS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > 0.25) setActive(id);
          });
        },
        { threshold: [0.25, 0.5] }
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="dlr-ticker-nav" aria-label="Ir a sección">
      {PINS.map((p) => (
        <a key={p.id} href={`#${p.id}`} className={p.id === active ? 'is-active' : ''}>
          {p.label}
        </a>
      ))}
    </nav>
  );
}

/* ──────────────────────── Toast ──────────────────────── */
function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 border-[1.5px] px-5 py-3 text-[13px]"
      style={{
        background: 'var(--dlr-accent)',
        borderColor: 'var(--dlr-ink)',
        color: 'var(--dlr-ink)',
        fontFamily: 'var(--dlr-f-mono)',
        letterSpacing: '0.12em',
        boxShadow: 'var(--dlr-stamp-shadow-lg)',
      }}
    >
      {message}
    </div>
  );
}

/* ──────────────────────── Page ──────────────────────── */
export default function HomeDelirio() {
  const { variant, drop, setVariant, toastMessage, dismissToast, reset } = useDelirioVariant();

  return (
    <div className="dlr-page">
      <PageMeta
        title="Balosky · Laboratorio"
        description="Un lugar roto para la banda más crota del internet."
      />
      <div className="dlr-grain" aria-hidden />

      <Chrome drop={drop} />
      <ModeSwitchPanel variant={variant} setVariant={setVariant} />
      <TickerNav />

      <main>
        <Hero />
        <SectionPasaAhora />
        <SectionApoya />
        <SectionClub />
        <SectionMural />
        <SectionDrop />
      </main>

      <Footer onReset={reset} />
      <Toast message={toastMessage} onDismiss={dismissToast} />
    </div>
  );
}
