import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { FAN_TIERS } from '@/utils/tiers';
import { motion, useInView } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Coffee,
  Wand2,
  Star,
  Heart,
  Image as ImageIcon,
  BookOpen,
  Users,
  Music,
  Sparkles,
  Share2,
  ExternalLink,
  GraduationCap,
  Play,
  Pause,
} from 'lucide-react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { Visualizer, VisualizerPicker, useVisualizerCycle } from '@/components/music/Visualizers';
import PublicSongsCatalog from '@/components/music/PublicSongsCatalog';
import LoadingScreen from '@/components/effects/LoadingScreen';
import Marquee from '@/components/Marquee';
import Particles from '@/components/effects/Particles';
import CustomCursor from '@/components/effects/CustomCursor';
import FilmGrain from '@/components/effects/FilmGrain';
import AsciiTrail from '@/components/effects/AsciiTrail';
import TouchRipple from '@/components/effects/TouchRipple';
import ScrollProgress from '@/components/effects/ScrollProgress';
import SvgDivider from '@/components/effects/SvgDivider';
import { useIsMobile } from '@/hooks/useIsMobile';

/* ─── Helpers ─── */
const SECTION_PAD = 'px-[clamp(20px,4vw,80px)]';
const INNER = 'max-w-[1400px] mx-auto w-full';

function fmtK(n: number, prefix = ''): string {
  if (n >= 1000) return `${prefix}${Math.round(n / 1000)}K`;
  return `${prefix}${n}`;
}

/* ─── Stat counter hook ─── */
function AnimatedStat({ value, prefix = '', label }: { value: number; prefix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = React.useState('0');

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * p);
      setDisplay(fmtK(Math.round(value * eased), prefix));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value, prefix]);

  return (
    <div ref={ref} className="stat-item">
      <div className="text-2xl sm:text-[clamp(1.8rem,3.5vw,3rem)] font-extrabold tracking-tight font-display">
        {display}
      </div>
      <div className="t-eyebrow mt-1">{label}</div>
    </div>
  );
}

/* ─── Portfolio Grid ─── */
function PortfolioCard({
  img,
  index,
  isMobile,
}: {
  img: { url: string; label: string; tag?: string };
  index: number;
  isMobile: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    const el = cardRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      el.style.transform = `perspective(600px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 12}deg)`;
    };
    const onLeave = () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)';
      el.style.transform = 'perspective(600px) rotateX(0) rotateY(0)';
    };
    const onEnter = () => {
      el.style.transition = 'none';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mouseenter', onEnter);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mouseenter', onEnter);
    };
  }, [isMobile]);

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden group"
      data-hover
      data-cursor-label="VIEW"
      style={{ willChange: 'transform' }}
    >
      <span className="absolute top-4 left-4 z-10 text-[11px] font-semibold tracking-[0.15em] text-white/40 font-mono">
        {String(index + 1).padStart(2, '0')}
      </span>
      <img
        src={img.url}
        alt={img.label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover grayscale transition-all duration-600 group-hover:grayscale-0 group-hover:scale-105 sm:group-hover:animate-[glitch-flash_0.4s_steps(2)_1]"
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 sm:p-5 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-500"
        style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }}
      >
        <div className="font-display font-extrabold tracking-tight text-white text-sm sm:text-lg">
          {img.label}
        </div>
        {img.tag && (
          <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.15em] uppercase text-white/50 mt-0.5 sm:mt-1">
            {img.tag}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Horizontal Gallery ─── */
function GalleryCard({ img }: { img: { url: string; label: string } }) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden group"
      style={{ width: 'clamp(200px, 25vw, 320px)', aspectRatio: '3/4' }}
    >
      <img
        src={img.url}
        alt={img.label}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover grayscale-[80%] group-hover:grayscale-0 transition-[filter] duration-400"
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(250,93,41,0.85)] via-[rgba(250,93,41,0.4)] to-transparent p-4 pt-16 sm:translate-y-full sm:group-hover:translate-y-0 translate-y-0 transition-transform duration-500"
        style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }}
      >
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white">
          {img.label}
        </span>
      </div>
    </div>
  );
}

function HorizontalGallery({ images }: { images: { url: string; label: string }[] }) {
  const isMobile = useIsMobile();

  // Desktop: double items for seamless loop. Mobile: single set, swipeable
  const allItems = isMobile ? images : [...images, ...images];

  return (
    <div
      className={cn(
        'border-y border-[var(--border-solid)]',
        isMobile
          ? 'overflow-x-auto snap-x snap-mandatory scrollbar-hide'
          : 'overflow-hidden'
      )}
      style={isMobile ? { WebkitOverflowScrolling: 'touch' } : undefined}
    >
      <div
        className="flex gap-1"
        style={
          isMobile
            ? { width: 'max-content' }
            : { width: 'max-content', animation: `hscroll 70s linear infinite` }
        }
      >
        {allItems.map((img, i) => (
          <div key={`${img.label}-${i}`} className={isMobile ? 'snap-start' : ''}>
            <GalleryCard img={img} />
          </div>
        ))}
      </div>
      {!isMobile && (
        <style>{`
          @keyframes hscroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN HOME COMPONENT
   ═══════════════════════════════════════ */
export default function Home() {
  const {
    campaigns,
    rewards,
    supporters,
    galleryImages,
    blogPosts,
    settings,
    currency,
    shareCampaign,
    darkMode,
  } = useAppContext();

  const isMobile = useIsMobile();
  const { allTracks, selectTrack, currentTrack, isPlaying, playPause } = useMusicPlayer();
  const { type: vizType, setType: setVizType } = useVisualizerCycle('bars');

  /* ─── Time-of-day greeting ─── */
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Buenos dias';
    if (h >= 12 && h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  /* ─── Scroll-activated section counter (via ref, throttled) ─── */
  const [currentSection, setCurrentSection] = useState({ num: 1, label: 'INICIO' });
  const sectionCounterRef = useRef<HTMLDivElement>(null);

  /* ─── Visitor count illusion ─── */
  const [liveCount, setLiveCount] = useState(Math.floor(Math.random() * 8) + 3);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(2, Math.min(15, prev + delta));
      });
    }, 5000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Stroke-fill reveal on scroll ─── */
  useEffect(() => {
    const titles = document.querySelectorAll('.stroke-fill');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('filled'), 150);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    titles.forEach(t => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  /* ─── Perspective 3D section reveal on scroll ─── */
  useEffect(() => {
    const sections = document.querySelectorAll('#support-modes, #featured-campaign, #music, #community');
    sections.forEach(s => s.classList.add('perspective-section'));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -80px 0px' });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const home = settings?.content?.home;
  const hero = home?.hero;
  const supportModes = home?.supportModes ?? [];
  const sections = home?.sections;
  const courses = home?.courses;
  const music = home?.music;
  const community = home?.community;
  const featuredMission = home?.featuredMission;
  const supportOffer = home?.supportOffer;
  const discoveryCards = home?.discoveryCards ?? [];

  const totalRaised = campaigns.reduce((s, c) => s + c.raised, 0);
  const activeCampaigns = campaigns.filter((c) => c.active);
  const featuredCampaign = activeCampaigns[0];
  const secondaryCampaigns = activeCampaigns.slice(1, 3);
  const latestSupporters = [...supporters].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 6);

  const marqueeItems = [
    'Creador de contenido',
    'IA generativa',
    'Musica',
    'Videos',
    'Buenos Aires',
    'Fotografia',
    'Viajes',
    'Internet y delirio',
  ];

  const galleryStrip = galleryImages.map((g) => ({ url: g.imageUrl, label: g.title }));
  const portfolioItems = galleryImages.map((g) => ({
    url: g.imageUrl,
    label: g.title,
    tag: 'IA \u00b7 Generativo',
  }));

  const supportCardIcons = [Coffee, Wand2, Star];

  /* ─── Animations ─── */
  const ease = [0.52, 0, 0, 1] as [number, number, number, number];
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
  };
  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
  };

  /* ─── Single scroll handler for all scroll-linked effects (no re-renders) ─── */
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroEyebrowRef = useRef<HTMLParagraphElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const sectionMap = [
      { id: 'hero-section', num: 1, label: 'INICIO' },
      { id: 'support-modes', num: 2, label: 'APOYO' },
      { id: 'featured-campaign', num: 3, label: 'MISION' },
      { id: 'rewards', num: 4, label: 'REWARDS' },
      { id: 'discovery', num: 5, label: 'EXPLORAR' },
      { id: 'portfolio', num: 6, label: 'PORTFOLIO' },
      { id: 'courses', num: 7, label: 'CURSOS' },
      { id: 'music', num: 8, label: 'MUSICA' },
      { id: 'community', num: 9, label: 'COMUNIDAD' },
    ];
    let lastSection = '';
    let ticking = false;

    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const vh = window.innerHeight;

        // Hero scroll effects (DOM-direct, no state)
        const heroEl = document.querySelector('.hero-section');
        if (heroEl) {
          const rect = heroEl.getBoundingClientRect();
          const progress = Math.max(0, Math.min(1, -rect.top / (heroEl.clientHeight * 0.5)));
          if (heroTitleRef.current) heroTitleRef.current.style.letterSpacing = `${-0.02 - progress * 0.06}em`;
          if (heroEyebrowRef.current) heroEyebrowRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.5));
          if (heroSubRef.current) heroSubRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.5));
        }

        // Section counter + per-section progress (Monavon-style)
        const doc = document.documentElement;
        let activeSectionEl: HTMLElement | null = null;
        for (let i = sectionMap.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionMap[i].id);
          if (el && el.getBoundingClientRect().top <= vh * 0.5) {
            if (sectionMap[i].id !== lastSection) {
              lastSection = sectionMap[i].id;
              setCurrentSection(sectionMap[i]);
            }
            activeSectionEl = el;
            break;
          }
        }

        // Per-section progress: how far through the active section we are (0-100%)
        if (activeSectionEl) {
          const rect = activeSectionEl.getBoundingClientRect();
          const sectionH = activeSectionEl.offsetHeight;
          const scrolled = Math.max(0, -rect.top);
          const pct = sectionH > 0 ? Math.min(100, Math.max(0, (scrolled / sectionH) * 100)) : 0;
          doc.style.setProperty('--section-progress', `${pct.toFixed(1)}%`);
          const pctEl = document.querySelector('.mobile-rail-pct') as HTMLElement | null;
          if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
        }
      });
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ─── Support card glow handler ─── */
  const handleCardMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.background = `radial-gradient(circle 300px at ${x}px ${y}px, rgba(250,93,41,0.08), transparent)`;
  }, []);
  const handleCardLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = '';
  }, []);

  return (
    <>
      <LoadingScreen />
      <CustomCursor />
      <Particles />
      <FilmGrain />
      <AsciiTrail />
      <TouchRipple />
      <ScrollProgress />

      {/* ─── Section counter indicator — desktop ─── */}
      <div className="fixed bottom-6 left-6 z-50 font-mono text-[10px] tracking-[0.15em] text-[var(--muted)] pointer-events-none hidden sm:block">
        <span className="text-[var(--accent)]">{String(currentSection.num).padStart(2, '0')}</span>
        <span className="mx-1">/</span>
        <span>09</span>
        <span className="ml-2">{currentSection.label}</span>
      </div>

      {/* ─── Mobile: persistent breadcrumb top-left ─── */}
      <div className="mobile-breadcrumb sm:hidden">
        <span className="b-index">index</span>
        <span className="b-sep">/</span>
        <span className="b-current">{currentSection.label.toLowerCase()}</span>
      </div>

      {/* ─── Mobile: vertical progress rail on left edge ─── */}
      <div className="mobile-rail sm:hidden" aria-hidden="true">
        <span className="mobile-rail-pct" aria-hidden="true" />
      </div>

      {/* ─── Mobile: compact section indicator above bottom nav ─── */}
      <div className="mobile-section-indicator sm:hidden">
        <span className="num">{String(currentSection.num).padStart(2, '0')}</span>
        <span>/</span>
        <span>09</span>
        <span className="ml-1">{currentSection.label}</span>
      </div>

      <div className="relative z-[2] w-full overflow-x-hidden">
        {/* ─── MARQUEE ─── */}
        <Marquee items={marqueeItems} />

        {/* ═══════════════════════════════════════
           HERO — full viewport, massive title
           ═══════════════════════════════════════ */}
        <section id="hero-section" className="hero-section relative min-h-[80vh] sm:min-h-screen flex flex-col justify-center sm:justify-end overflow-hidden" style={{ paddingTop: 0 }}>
          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(214,34,34,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(214,34,34,0.04) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Registration marks — desktop only */}
          <div className="hidden sm:block absolute inset-0 pointer-events-none z-[1]">
            <span className="absolute top-6 left-6 w-4 h-4 border-l border-t border-[var(--border-solid)]" />
            <span className="absolute top-6 right-6 w-4 h-4 border-r border-t border-[var(--border-solid)]" />
            <span className="absolute bottom-24 left-6 w-4 h-4 border-l border-b border-[var(--border-solid)]" />
          </div>

          {/* Avatar cutout — right side (desktop) / top-right circle (mobile) */}
          {/* Desktop: large cutout at bottom-right */}
          <div
            className="hidden sm:block absolute bottom-0 z-[1] pointer-events-none right-0 md:right-[5%] w-[35vw] max-w-[600px]"
            style={{ maskImage: 'linear-gradient(to top, black 60%, transparent 100%)' }}
          >
            <img
              src={settings?.creatorAvatar || '/images/santi-avatar.jpeg'}
              alt={settings?.creatorName || 'Santi Balosky'}
              decoding="async"
              className="w-full h-auto object-cover grayscale-[30%] contrast-110"
            />
          </div>

          {/* Hero content */}
          <div className={cn(SECTION_PAD, 'relative z-[3] pb-0')}>
            <div className={cn(INNER, 'space-y-6 md:space-y-8')}>
              <motion.p
                className="t-eyebrow"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                ref={heroEyebrowRef}
              >
                {greeting} — {home?.hero.eyebrow || 'Creador — IA — Musica'}
              </motion.p>

              <h1 ref={heroTitleRef} className="t-hero text-[clamp(3.5rem,13vw,14rem)] relative z-[2]" style={{ letterSpacing: '-0.02em', transition: 'letter-spacing 0.1s linear' }}>
                {(hero?.title || 'si me bancás\nalgo te llevás').split('\n').map((line, i) => {
                  const accentWords = ['llevás', 'delirio', 'Mesaza', 'Cómplice', 'Morerial'];
                  const match = accentWords.find((w) => line.includes(w));
                  return (
                    <motion.span
                      key={i}
                      className="block"
                      initial={{ opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' }}
                      animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease }}
                    >
                      {match ? (
                        <>
                          {line.substring(0, line.indexOf(match))}
                          <em className="text-[var(--accent)] not-italic">{match}</em>
                          {line.substring(line.indexOf(match) + match.length)}
                        </>
                      ) : (
                        line
                      )}
                    </motion.span>
                  );
                })}
              </h1>

              <motion.p
                className="t-body max-w-xl text-base sm:text-lg leading-relaxed relative z-[2]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.7 }}
                ref={heroSubRef}
              >
                {hero?.subtitle || 'Stickers, wallpapers y los delirios que vas a querer mandar al grupo.'}
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-3 sm:gap-4 relative z-[2] pt-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.05, duration: 0.7 }}
              >
                <Link
                  to={hero?.primaryCtaHref || '/checkout'}
                  className="group inline-flex items-center gap-2 bg-[var(--accent)] text-black px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium tracking-tight hover:bg-black hover:text-[var(--accent)] border border-[var(--accent)] transition-colors duration-300"
                >
                  {hero?.primaryCtaLabel || 'Elegir pack'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to={hero?.secondaryCtaHref || '/vip'}
                  className="group inline-flex items-center gap-2 border border-[var(--border)] text-[var(--white)] px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium tracking-tight hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300"
                >
                  {hero?.secondaryCtaLabel || 'Qué hay adentro'}
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Mobile: full-width dramatic photo below hero text (mockup style) */}
          <div
            className="sm:hidden relative w-full z-[1] pointer-events-none -mt-4"
            style={{
              height: '50vh',
              maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            }}
          >
            <img
              src={settings?.creatorAvatar || '/images/santi-avatar.jpeg'}
              alt={settings?.creatorName || 'Santi Balosky'}
              decoding="async"
              className="w-full h-full object-cover object-top grayscale-[20%] contrast-105"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[rgba(250,93,41,0.08)]" />
          </div>

          {/* Stats bar at bottom */}
          <motion.div
            className={cn(SECTION_PAD, 'border-t border-[var(--border)] mt-8 md:mt-12 relative z-[3]')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.7 }}
          >
            <div className={cn(INNER, 'flex flex-wrap gap-x-6 gap-y-3 sm:gap-8 md:gap-16 py-4 sm:py-6 md:py-8')}>
              <AnimatedStat value={totalRaised} prefix="$" label="Aportado" />
              <AnimatedStat value={activeCampaigns.length} label="Misiones activas" />
              <AnimatedStat value={supporters.length} label="Apoyos" />
              <div className="flex items-baseline gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-2xl sm:text-[clamp(1.8rem,3.5vw,3rem)] font-extrabold tracking-tight">
                    {liveCount}
                  </span>
                </div>
                <span className="t-eyebrow">online ahora</span>
              </div>
            </div>
          </motion.div>
        </section>

        <SvgDivider offset={0} />

        {/* ═══════════════════════════════════════
           SUPPORT MODES — 3 cards
           ═══════════════════════════════════════ */}
        <section className={cn(SECTION_PAD, 'py-[clamp(80px,12vh,160px)] bg-[var(--black)] text-[var(--white)]')} id="support-modes">
          <div className={INNER}>
            <motion.div
              className="mb-12 md:mb-16"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <p className="t-eyebrow" style={{ color: 'var(--muted)' }}>
                {sections?.supportEyebrow || 'Apoyar'}
              </p>
              <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3">
                {sections?.supportTitle || 'Banca el delirio'}
              </h2>
              {sections?.supportSubtitle && (
                <p className="t-body mt-4 max-w-2xl" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {sections.supportSubtitle}
                </p>
              )}
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {supportModes.map((mode, i) => {
                const Icon = supportCardIcons[i] || Coffee;
                return (
                  <motion.div
                    key={i}
                    className="relative p-8 md:p-10 border border-[rgba(255,255,255,0.08)] overflow-hidden group hover:border-[var(--accent)] hover:-translate-y-1 transition-all duration-500"
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease }}
                    viewport={{ once: true, margin: '-40px' }}
                    data-hover
                    data-cursor-label="OPEN"
                    onMouseMove={!isMobile ? handleCardMouse : undefined}
                    onMouseLeave={!isMobile ? handleCardLeave : undefined}
                  >
                    {/* Orange top line — slides in on hover (desktop) / visible on entry (mobile) */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent)] origin-left transition-transform duration-700 scale-x-100 sm:scale-x-0 sm:group-hover:scale-x-100" style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }} />
                    {/* Left accent bar — mobile only */}
                    <div className="sm:hidden absolute top-0 left-0 bottom-0 w-[3px] bg-[var(--accent)]/30" />

                    <div className="w-10 h-10 flex items-center justify-center border border-[rgba(255,255,255,0.12)] mb-6">
                      <Icon size={18} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {mode.eyebrow}
                    </p>
                    <h3 className="text-xl md:text-2xl font-extrabold tracking-tight font-display mb-3">
                      {mode.title}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {mode.description}
                    </p>
                    <Link
                      to={mode.href}
                      className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold text-[11px] tracking-[0.1em] uppercase group-hover:gap-4 transition-all"
                      data-hover
                    >
                      {mode.ctaLabel} <span>&rarr;</span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           FEATURED CAMPAIGN — progress bar, share
           ═══════════════════════════════════════ */}
        {featuredCampaign && (
          <section id="featured-campaign" data-dark-section className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)] overflow-hidden bg-[var(--black)] text-[var(--white)]')}>
            <div className={INNER}>
              <motion.div
                className="mb-12"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <p className="t-eyebrow">{featuredMission?.eyebrow || '#trending'}</p>
                <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">
                  {featuredMission?.title || 'Lo que estoy empujando'}
                </h2>
              </motion.div>

              <motion.div
                className="grid md:grid-cols-2 gap-4 sm:gap-8 min-w-0"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                {/* Featured campaign card — Mobile: compact stacked card / Desktop: image overlay */}
                <div className="min-w-0 overflow-hidden" data-hover data-cursor-label="VIEW">

                  {/* ── MOBILE CARD ── */}
                  <div className="sm:hidden border border-[var(--border)] overflow-hidden">
                    {featuredCampaign.image && (
                      <img
                        src={featuredCampaign.image}
                        alt={featuredCampaign.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-video object-cover"
                      />
                    )}
                    <div className="p-4 bg-black">
                      <h3 className="text-white text-lg font-extrabold tracking-tight font-display mb-1">
                        {featuredCampaign.title}
                      </h3>
                      <p className="text-white/50 text-xs mb-3 line-clamp-2">{featuredCampaign.description}</p>
                      <div className="w-full h-1 bg-white/10 mb-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((featuredCampaign.raised / featuredCampaign.goal) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 font-bold text-xs">
                          {formatCurrency(featuredCampaign.raised, currency)} / {formatCurrency(featuredCampaign.goal, currency)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => shareCampaign(featuredCampaign)}
                            className="text-white/40 active:scale-90 transition-transform p-1.5"
                            data-hover
                          >
                            <Share2 size={14} />
                          </button>
                          <Link
                            to={`/checkout/${featuredCampaign.id}`}
                            className="px-3 py-1.5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-wide active:scale-95 transition-transform"
                            data-hover
                          >
                            Aportar
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── DESKTOP CARD ── */}
                  <div className="hidden sm:block relative overflow-hidden group">
                    {featuredCampaign.image && (
                      <img
                        src={featuredCampaign.image}
                        alt={featuredCampaign.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-[4/3] object-cover grayscale hover:grayscale-0 hover:scale-105 transition-all duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 md:p-8 overflow-hidden">
                      <h3 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight font-display mb-2">
                        {featuredCampaign.title}
                      </h3>
                      <p className="text-white/60 text-sm mb-4 line-clamp-2">{featuredCampaign.description}</p>
                      <div className="w-full h-1 bg-white/10 mb-3">
                        <div
                          className="h-full bg-[var(--accent)] transition-all duration-1000"
                          style={{ width: `${Math.min((featuredCampaign.raised / featuredCampaign.goal) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-sm">
                          {formatCurrency(featuredCampaign.raised, currency)} / {formatCurrency(featuredCampaign.goal, currency)}
                        </span>
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => shareCampaign(featuredCampaign)}
                            className="text-white/60 hover:text-white active:scale-90 transition-all p-2"
                            data-hover
                          >
                            <Share2 size={16} />
                          </button>
                          <Link
                            to={`/checkout/${featuredCampaign.id}`}
                            className="px-5 py-2 bg-[var(--accent)] text-white text-xs font-semibold tracking-wide active:scale-95 transition-transform"
                            data-hover
                          >
                            Aportar
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary campaigns */}
                <div className="flex flex-col gap-4 min-w-0">
                  {secondaryCampaigns.map((c) => (
                    <Link
                      key={c.id}
                      to={`/checkout/${c.id}`}
                      className="flex items-center gap-4 p-4 border border-[var(--border)] hover:border-[var(--accent)] transition-colors group/item"
                      data-hover
                      data-cursor-label="VIEW"
                    >
                      {c.image && (
                        <img src={c.image} alt={c.title} loading="lazy" decoding="async" width={80} height={80} className="w-20 h-20 object-cover grayscale group-hover/item:grayscale-0 transition-[filter] duration-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold tracking-tight truncate">{c.title}</h4>
                        <p className="t-body text-xs mt-1 truncate">{c.description}</p>
                        <div className="w-full h-0.5 bg-[var(--border)] mt-2">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${Math.min((c.raised / c.goal) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[var(--muted)] group-hover/item:text-[var(--accent)] transition-colors flex-shrink-0" />
                    </Link>
                  ))}

                  {/* Support offer quick items */}
                  {supportOffer?.items?.map((item, i) => (
                    <Link
                      key={i}
                      to="/checkout"
                      className="flex items-center justify-between p-4 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                      data-hover
                    >
                      <div>
                        <span className="font-bold">{formatCurrency(item.amount, currency)}</span>
                        <span className="t-eyebrow ml-2">{item.label}</span>
                      </div>
                      <ArrowRight size={14} className="text-[var(--muted)]" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
           REWARDS / FAN TIERS
           ═══════════════════════════════════════ */}
        <section id="rewards" className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)] bg-[var(--grey)]')}>
          <div className={INNER}>
            <motion.div
              className="mb-12 md:mb-16"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <p className="t-eyebrow">{sections?.rewardsEyebrow || 'Recompensas'}</p>
              <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">
                {sections?.rewardsTitle || 'Niveles'}
              </h2>
              {sections?.rewardsSubtitle && (
                <p className="t-body mt-4 max-w-2xl">{sections.rewardsSubtitle}</p>
              )}
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {FAN_TIERS.map((tier) => (
                <motion.div
                  key={tier.id}
                  className="p-8 border border-[var(--border)] bg-[var(--white)] relative overflow-hidden"
                  variants={fadeUp}
                  data-hover
                >
                  <div className={cn('w-3 h-3 rounded-full mb-6', tier.color)} />
                  <h3 className="text-xl font-extrabold tracking-tight font-display mb-1">{tier.name}</h3>
                  <p className="t-eyebrow mb-4">
                    Desde {formatCurrency(tier.minAmount, currency)}
                  </p>
                  <ul className="space-y-2">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="t-body text-sm flex items-start gap-2">
                        <Sparkles size={12} className="mt-1 flex-shrink-0 text-[var(--accent)]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/checkout"
                    className="inline-flex items-center gap-2 mt-6 text-[var(--accent)] font-semibold text-sm"
                    data-hover
                  >
                    Aportar <ArrowRight size={14} />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           DISCOVERY BENTO GRID
           ═══════════════════════════════════════ */}
        <section id="discovery" className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)]')}>
          <div className={INNER}>
            <motion.div
              className="mb-12 md:mb-16"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <p className="t-eyebrow">{sections?.discoveryEyebrow || 'Explorar'}</p>
              <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">
                {sections?.discoveryTitle || 'Para seguir chusmeando'}
              </h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {discoveryCards.map((card, i) => {
                const icons = [Users, Heart, ImageIcon, BookOpen];
                const Icon = icons[i % icons.length];
                return (
                  <motion.div key={i} variants={fadeUp} custom={i} transition={{ delay: i * 0.08 }}>
                    <Link
                      to={card.href}
                      className="relative block p-6 md:p-8 border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-full group overflow-hidden"
                      data-hover
                      data-cursor-label="VIEW"
                    >
                      <Icon size={20} className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors mb-4" />
                      <h3 className="font-bold tracking-tight text-lg mb-2">{card.title}</h3>
                      <p className="t-body text-sm sm:text-base">{card.description}</p>
                      <ArrowRight
                        size={14}
                        className="mt-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }} />
                    </Link>
                  </motion.div>
                );
              })}

              {/* Gallery highlight */}
              {galleryImages[0] && (
                <motion.div variants={fadeUp} className="col-span-2 md:col-span-2">
                  <Link
                    to="/gallery"
                    className="relative block overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-full group"
                    data-hover
                    data-cursor-label="VIEW"
                  >
                    <img
                      src={galleryImages[0].imageUrl}
                      alt={galleryImages[0].title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-48 md:h-64 object-cover grayscale group-hover:grayscale-0 group-hover:animate-[glitch-flash_0.4s_steps(2)_1] transition-[filter] duration-500"
                    />
                    <div className="p-6">
                      <p className="t-eyebrow mb-2">Galeria IA</p>
                      <h3 className="font-bold tracking-tight text-lg">
                        {galleryImages[0].title}
                      </h3>
                      <p className="t-body text-sm mt-1">{galleryImages[0].votes} votos</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }} />
                  </Link>
                </motion.div>
              )}

              {/* Blog highlight */}
              {blogPosts[0] && (
                <motion.div variants={fadeUp} className="col-span-2 md:col-span-2">
                  <Link
                    to="/blog"
                    className="relative block p-6 md:p-8 border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-full group overflow-hidden"
                    data-hover
                    data-cursor-label="VIEW"
                  >
                    <p className="t-eyebrow mb-2">{blogPosts[0].category}</p>
                    <h3 className="font-bold tracking-tight text-lg mb-2">{blogPosts[0].title}</h3>
                    <p className="t-body text-sm sm:text-base line-clamp-3">{blogPosts[0].content}</p>
                    <ArrowRight
                      size={14}
                      className="mt-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ transitionTimingFunction: 'cubic-bezier(.52,0,0,1)' }} />
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           PORTFOLIO GRID — asymmetric project cards
           ═══════════════════════════════════════ */}
        {portfolioItems.length > 0 && (
          <section id="portfolio" className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)]')}>
            <div className={INNER}>
              <motion.div
                className="mb-12 md:mb-16"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <p className="t-eyebrow">Proyectos</p>
                <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">
                  Lo que hago
                </h2>
              </motion.div>

              <div className="portfolio-grid">
                {portfolioItems.map((img, i) => (
                  <PortfolioCard key={i} img={img} index={i} isMobile={isMobile} />
                ))}
              </div>

              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 mt-8 text-[var(--accent)] font-semibold text-sm"
                data-hover
              >
                Ver todo el portfolio <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        <SvgDivider offset={2} />

        {/* ═══════════════════════════════════════
           HORIZONTAL GALLERY STRIP
           ═══════════════════════════════════════ */}
        {galleryStrip.length > 0 && <HorizontalGallery images={galleryStrip} />}

        {/* ═══════════════════════════════════════
           COURSES
           ═══════════════════════════════════════ */}
        {courses && courses.items.length > 0 && (
          <section id="courses" className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)]')}>
            <div className={INNER}>
              <motion.div
                className="mb-12 md:mb-16"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <p className="t-eyebrow">{courses.eyebrow}</p>
                <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">{courses.title}</h2>
                {courses.subtitle && <p className="t-body mt-4 max-w-2xl">{courses.subtitle}</p>}
              </motion.div>

              <motion.div
                className="grid md:grid-cols-3 gap-4"
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                {courses.items.map((course, i) => (
                  <motion.div
                    key={i}
                    className="p-8 border border-[var(--border)] relative overflow-hidden group"
                    variants={fadeUp}
                    data-hover
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-0.5 bg-[var(--accent)] text-white text-[10px] font-bold tracking-wider uppercase">
                        {course.badge}
                      </span>
                      <span className="t-eyebrow">{course.status}</span>
                    </div>
                    <GraduationCap size={20} className="text-[var(--muted)] mb-3" />
                    <h3 className="text-xl font-extrabold tracking-tight font-display mb-2">{course.title}</h3>
                    <p className="t-body text-sm mb-6">{course.description}</p>
                    <a
                      href={course.href}
                      className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold text-sm"
                      data-hover
                    >
                      {course.ctaLabel} <ArrowRight size={14} />
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
           MUSIC — visualizer + links
           ═══════════════════════════════════════ */}
        {music && (
          <section id="music" data-dark-section className={cn(SECTION_PAD, 'py-[clamp(60px,10vh,120px)] bg-[var(--black)] text-[var(--white)]')}>
            <div className={INNER}>
              <motion.div
                className="mb-12 md:mb-16"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <p className="t-eyebrow">{music.eyebrow}</p>
                <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">{music.title}</h2>
                {music.subtitle && <p className="t-body mt-4 max-w-2xl">{music.subtitle}</p>}
              </motion.div>

              <motion.div
                className="grid md:grid-cols-2 gap-8 items-start"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                {/* Visualizer — live audio driven */}
                <div className="flex flex-col gap-3">
                  <div className="aspect-square md:aspect-[4/3] bg-black overflow-hidden relative">
                    <Visualizer type={vizType} />
                  </div>
                  <VisualizerPicker active={vizType} onChange={setVizType} />
                </div>

                {/* Platform links */}
                <div className="flex flex-col gap-3">
                  {music.spotifyUrl && (
                    <a
                      href={music.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[#1DB954] hover:bg-[#1DB954]/5 transition-all"
                      data-hover
                    >
                      <span className="font-bold tracking-tight">Spotify</span>
                      <ExternalLink size={16} className="text-[var(--muted)]" />
                    </a>
                  )}
                  {music.appleMusicUrl && (
                    <a
                      href={music.appleMusicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[var(--black)] transition-all"
                      data-hover
                    >
                      <span className="font-bold tracking-tight">Apple Music</span>
                      <ExternalLink size={16} className="text-[var(--muted)]" />
                    </a>
                  )}
                  {music.youtubeChannelUrl && (
                    <a
                      href={music.youtubeChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[#FF0000] hover:bg-[#FF0000]/5 transition-all"
                      data-hover
                    >
                      <span className="font-bold tracking-tight">YouTube</span>
                      <ExternalLink size={16} className="text-[var(--muted)]" />
                    </a>
                  )}

                  {/* Tracks list — wired to MusicPlayerContext */}
                  {allTracks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="t-eyebrow mb-3">Inéditos</p>
                      {allTracks.map((track) => {
                        const isActive = currentTrack?.id === track.id;
                        const showPause = isActive && isPlaying;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => {
                              if (isActive) void playPause();
                              else selectTrack(track.id);
                            }}
                            className={cn(
                              'w-full flex items-center gap-4 p-3 border transition-colors text-left',
                              isActive
                                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                : 'border-[var(--border)] hover:border-[var(--accent)]'
                            )}
                            data-hover
                          >
                            <div
                              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                              style={{ background: track.accentColor || 'var(--accent)' }}
                            >
                              {showPause ? (
                                <Pause size={14} className="text-white" />
                              ) : (
                                <Play size={14} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{track.title}</p>
                              <p className="text-xs text-[var(--muted)] truncate">
                                {track.category} &middot; {track.artist}
                              </p>
                            </div>
                            {isActive && (
                              <span className="text-[10px] font-mono tracking-[0.18em] text-[var(--accent)] uppercase">
                                {isPlaying ? 'Sonando' : 'Pausa'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Fallback if no URLs configured */}
                  {!music.spotifyUrl && !music.appleMusicUrl && !music.youtubeChannelUrl && (
                    <>
                      <a
                        href="#"
                        className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[#1DB954] hover:bg-[#1DB954]/5 transition-all"
                        data-hover
                      >
                        <span className="font-bold tracking-tight">Spotify</span>
                        <ExternalLink size={16} className="text-[var(--muted)]" />
                      </a>
                      <a
                        href="#"
                        className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[var(--black)] transition-all"
                        data-hover
                      >
                        <span className="font-bold tracking-tight">Apple Music</span>
                        <ExternalLink size={16} className="text-[var(--muted)]" />
                      </a>
                      <a
                        href="#"
                        className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[#FF0000] hover:bg-[#FF0000]/5 transition-all"
                        data-hover
                      >
                        <span className="font-bold tracking-tight">YouTube</span>
                        <ExternalLink size={16} className="text-[var(--muted)]" />
                      </a>
                      <a
                        href="#"
                        className="flex items-center justify-between p-5 border border-[var(--border)] hover:border-[var(--accent)] transition-all"
                        data-hover
                      >
                        <span className="font-bold tracking-tight">SoundCloud</span>
                        <ExternalLink size={16} className="text-[var(--muted)]" />
                      </a>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Full catalogue from the media table — one card per cancion
                  with per-track embed / MP3 fallback and category filter. */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <PublicSongsCatalog />
              </motion.div>
            </div>
          </section>
        )}

        <SvgDivider offset={4} />

        {/* ═══════════════════════════════════════
           COMMUNITY — recent supporters
           ═══════════════════════════════════════ */}
        <section className={cn(SECTION_PAD, 'py-[clamp(80px,12vh,160px)]')} id="community">
          <div className={INNER}>
            <motion.div
              className="mb-12 md:mb-16"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <p className="t-eyebrow">{community?.eyebrow || 'Comunidad'}</p>
              <h2 className="t-section text-[clamp(2rem,5vw,4.5rem)] mt-3 stroke-fill">
                {community?.title || 'Ultimos apoyos'}
              </h2>
              {community?.subtitle && (
                <p className="t-body mt-4 max-w-2xl">{community.subtitle}</p>
              )}
            </motion.div>

            <motion.div
              className="space-y-0"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {latestSupporters.map((s, i) => (
                <motion.div
                  key={s.id}
                  className="flex items-center justify-between py-5 border-b border-[var(--border)]"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: { delay: i * 0.1, duration: 0.6, ease },
                    },
                  }}
                >
                  <div>
                    <p className="font-bold tracking-tight text-lg">{s.name}</p>
                    {s.message && (
                      <p className="t-body text-sm leading-relaxed mt-0.5">
                        &ldquo;{s.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight font-display">
                      <span className="text-[var(--accent)]">$</span>
                      {s.amount.toLocaleString('es-AR')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {supporters.length > 6 && (
              <Link
                to="/wall"
                className="inline-flex items-center gap-2 mt-8 text-[var(--accent)] font-semibold text-sm"
                data-hover
              >
                Ver todos los apoyos <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
