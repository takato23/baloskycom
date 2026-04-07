import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Coffee, Lock, MessageSquare, Share2, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { formatCurrency } from '@/utils/currency';

const CyberScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const targetX = (state.pointer.x * Math.PI) / 12;
      const targetY = (state.pointer.y * Math.PI) / 18;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05);
      groupRef.current.position.z = (state.clock.elapsedTime * 2) % 1;
    }
  });

  return (
    <group ref={groupRef}>
      <Grid
        position={[0, -1.5, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={1}
        cellColor="#ec4899"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#06b6d4"
        fadeDistance={30}
        fadeStrength={1}
      />
    </group>
  );
};

export default function HomeCyberGrid() {
  const { campaigns, supporters, galleryImages, blogPosts, settings, currency, shareCampaign } = useAppContext();
  const homeContent = settings?.content.home;

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const featuredCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const totalRaised = campaigns.reduce((acc, campaign) => acc + campaign.raised, 0);
  const latestImage = galleryImages[0];
  const latestPost = blogPosts[0];

  return (
    <div className="space-y-14 pb-18 min-h-screen font-sans text-white relative">
      <div className="fixed inset-0 z-[-1] bg-[#0f172a]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0f172a] z-10 pointer-events-none" />
        <Canvas camera={{ position: [0, 1, 5], fov: 60 }} className="pointer-events-none">
          <fog attach="fog" args={['#0f172a', 10, 30]} />
          <CyberScene />
        </Canvas>
      </div>

      {supporters.length > 0 && (
        <div className="w-full bg-pink-600/14 border-b border-pink-500/30 overflow-hidden py-2 relative z-20 backdrop-blur-sm">
          <motion.div
            className="flex whitespace-nowrap gap-8 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300"
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
          >
            {[...supporters, ...supporters].map((supporter, index) => (
              <span key={`${supporter.id}-${index}`}>
                <span className="text-pink-400">{supporter.name}</span> bancó con{' '}
                <span className="text-white">{formatCurrency(supporter.amount, currency)}</span> •
              </span>
            ))}
          </motion.div>
        </div>
      )}

      <section className="px-4 pt-14 relative z-20">
        <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6 rounded-[2rem] border border-cyan-400/20 bg-[#0a1524]/82 p-7 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-cyan-400/20 pb-3 text-[11px] uppercase tracking-[0.22em] text-cyan-300/70">
              <span>{homeContent?.hero.eyebrow}</span>
              <span>balosky.grid.online</span>
            </div>

            <div className="space-y-5">
              <h1 className="text-[clamp(3rem,7vw,6rem)] font-brutal uppercase leading-[0.9] tracking-[0.04em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-pink-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]">
                {homeContent?.hero.title.split('\n').map((line, index) => (
                  <React.Fragment key={`${line}-${index}`}>
                    {line}
                    {index < homeContent.hero.title.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h1>
              <p className="max-w-2xl text-cyan-100/76 text-lg leading-relaxed">
                {homeContent?.hero.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to={homeContent?.hero.primaryCtaHref || '/checkout'}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-300/40 bg-pink-500 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(236,72,153,0.4)] transition-colors hover:bg-cyan-400 hover:text-[#0f172a]"
              >
                <Coffee className="w-4 h-4" />
                {homeContent?.hero.primaryCtaLabel}
              </Link>
              <Link
                to={homeContent?.hero.secondaryCtaHref || '/portfolio'}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/8 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-400/14"
              >
                {homeContent?.hero.secondaryCtaLabel}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-400/20 bg-[#08101c] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">recaudado</p>
                <p className="mt-2 text-3xl font-brutal text-pink-400">{formatCurrency(totalRaised, currency)}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-[#08101c] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">misiones</p>
                <p className="mt-2 text-3xl font-brutal text-cyan-300">{activeCampaigns.length}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-[#08101c] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">comunidad</p>
                <p className="mt-2 text-3xl font-brutal text-white">{supporters.length}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {homeContent?.discoveryCards.slice(0, 2).map((card, index) => (
              <Link
                key={card.title}
                to={card.href}
                className={`rounded-[1.6rem] border p-5 backdrop-blur-xl transition-all hover:-translate-y-1 ${
                  index === 0
                    ? 'border-cyan-400/20 bg-[#0a1524]/82 text-cyan-100'
                    : 'border-pink-400/20 bg-[#1a1020]/78 text-white'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-55">module</p>
                <h2 className="mt-3 text-3xl font-brutal uppercase tracking-[0.04em]">{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed opacity-75">{card.description}</p>
              </Link>
            ))}

            {featuredCampaign && (
              <div className="rounded-[1.6rem] border border-cyan-400/20 bg-[#0a1524]/82 p-5 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">featured mission</p>
                <h2 className="mt-3 text-3xl font-brutal uppercase tracking-[0.04em] text-pink-400">{featuredCampaign.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-cyan-100/72">{featuredCampaign.description}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full border border-cyan-400/25 bg-[#08101c]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${featuredCampaign.goal > 0 ? Math.min((featuredCampaign.raised / featuredCampaign.goal) * 100, 100) : 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                  />
                </div>
                <div className="mt-5 flex gap-3">
                  <Link
                    to={`/checkout/${featuredCampaign.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-pink-300/40 bg-pink-500 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white"
                  >
                    <Lock className="w-4 h-4" />
                    Bancar
                  </Link>
                  <button
                    onClick={() => shareCampaign(featuredCampaign)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/8 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 relative z-20">
        <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-3">
          {homeContent?.supportModes.map((mode, index) => (
            <div
              key={mode.title}
              className={`rounded-[1.6rem] border p-6 backdrop-blur-xl ${
                index === 1
                  ? 'border-pink-400/30 bg-[#1a1020]/80'
                  : 'border-cyan-400/20 bg-[#0a1524]/82'
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-55">{mode.eyebrow}</p>
              <h3 className="mt-4 text-3xl font-brutal uppercase leading-[0.92] tracking-[0.04em]">
                {mode.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed opacity-76">{mode.description}</p>
              <Link
                to={mode.href}
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 hover:text-white transition-colors"
              >
                {mode.ctaLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-12 relative z-20">
        <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
          <div className="rounded-[1.6rem] border border-cyan-400/20 bg-[#0a1524]/82 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">última pieza IA</p>
            </div>
            {latestImage && (
              <>
                <img
                  src={latestImage.imageUrl}
                  alt={latestImage.title}
                  className="mt-4 aspect-[4/3] w-full rounded-xl border border-cyan-400/20 object-cover"
                  referrerPolicy="no-referrer"
                />
                <h3 className="mt-4 text-2xl font-brutal uppercase tracking-[0.04em]">{latestImage.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cyan-100/72">{latestImage.prompt}</p>
              </>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-pink-400/20 bg-[#1a1020]/80 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-cyan-300" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">último post</p>
            </div>
            {latestPost && (
              <>
                <h3 className="mt-4 text-2xl font-brutal uppercase tracking-[0.04em]">{latestPost.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/72">{latestPost.content.slice(0, 220)}...</p>
                <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                  Ir al blog <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          <div className="grid gap-4">
            {homeContent?.discoveryCards.slice(2).map((card) => (
              <Link
                key={card.title}
                to={card.href}
                className="rounded-[1.4rem] border border-cyan-400/20 bg-[#0a1524]/82 p-5 backdrop-blur-xl transition-colors hover:bg-[#0d1a2b]"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/55">seguir mirando</p>
                <h3 className="mt-3 text-2xl font-brutal uppercase tracking-[0.04em]">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cyan-100/72">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
