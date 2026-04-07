import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Coffee, MessageSquare, Share2, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';

export default function HomeAtmospheric() {
  const { campaigns, supporters, galleryImages, blogPosts, settings, currency, shareCampaign } = useAppContext();
  const homeContent = settings?.content.home;

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const featuredCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
  const latestImage = galleryImages[0];
  const latestPost = blogPosts[0];

  return (
    <div className="space-y-16 pb-20 min-h-screen font-sans text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#05050a]">
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.55, 0.3], x: [0, 80, 0], y: [0, -70, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-15%] left-[-10%] h-[48vw] w-[48vw] rounded-full bg-fuchsia-900/35 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.45, 0.2], x: [0, -90, 0], y: [0, 90, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] h-[58vw] w-[58vw] rounded-full bg-sky-900/30 blur-[150px]"
        />
      </div>

      <section className="px-4 pt-16">
        <div className="mx-auto max-w-7xl grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] backdrop-blur-xl">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.9)]" />
              {homeContent?.hero.eyebrow}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-[clamp(3.8rem,9vw,7.8rem)] font-serif italic leading-[0.88] tracking-[-0.06em] text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-sky-100">
                {homeContent?.hero.title.split('\n').map((line, index) => (
                  <React.Fragment key={`${line}-${index}`}>
                    {line}
                    {index < homeContent.hero.title.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h1>
              <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-white/74">
                {homeContent?.hero.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to={homeContent?.hero.primaryCtaHref || '/checkout'}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] backdrop-blur-xl transition-colors hover:bg-white/18"
              >
                <Coffee className="w-4 h-4" />
                {homeContent?.hero.primaryCtaLabel}
              </Link>
              <Link
                to={homeContent?.hero.secondaryCtaHref || '/portfolio'}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] backdrop-blur-xl transition-colors hover:bg-white/8"
              >
                {homeContent?.hero.secondaryCtaLabel}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">recaudado</p>
                <p className="mt-3 text-3xl font-serif">{formatCurrency(totalRaised, currency)}</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">misiones</p>
                <p className="mt-3 text-3xl font-serif">{activeCampaigns.length}</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">comunidad</p>
                <p className="mt-3 text-3xl font-serif">{supporters.length}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-black/20 backdrop-blur-xl">
              <img
                src={settings?.creatorAvatar || '/images/santi-avatar.jpeg'}
                alt={settings?.creatorName || 'Santi Balosky'}
                className="aspect-[4/5] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {homeContent?.discoveryCards.slice(0, 2).map((card) => (
                <Link
                  key={card.title}
                  to={card.href}
                  className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl transition-colors hover:bg-white/10"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">seguir mirando</p>
                  <h2 className="mt-3 text-2xl font-serif italic leading-none">{card.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featuredCampaign && (
        <section className="px-4">
          <div className="mx-auto max-w-7xl grid gap-6 rounded-[2.2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">misión destacada</p>
              <h2 className="text-5xl font-serif italic leading-[0.92] tracking-[-0.05em]">{featuredCampaign.title}</h2>
              <p className="max-w-2xl text-white/72 leading-relaxed">{featuredCampaign.description}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">recaudado</p>
                  <p className="mt-2 text-2xl font-serif">{formatCurrency(featuredCampaign.raised, currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">meta</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0 ? formatCurrency(featuredCampaign.goal, currency) : 'Abierta'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">avance</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0
                      ? `${Math.min(Math.round((featuredCampaign.raised / featuredCampaign.goal) * 100), 100)}%`
                      : 'Libre'}
                  </p>
                </div>
              </div>

              {featuredCampaign.goal > 0 && (
                <div className="space-y-2">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.min((featuredCampaign.raised / featuredCampaign.goal) * 100, 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-sky-300 shadow-[0_0_14px_rgba(232,121,249,0.6)]"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to={`/checkout/${featuredCampaign.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/12 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-white/20 transition-colors"
                >
                  Bancar esta misión <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => shareCampaign(featuredCampaign)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-white/8 transition-colors"
                >
                  Compartir <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <img
                src={featuredCampaign.image}
                alt={featuredCampaign.title}
                className="aspect-[4/3] w-full rounded-[1.6rem] object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {homeContent?.supportModes.slice(0, 2).map((mode) => (
                  <Link
                    key={mode.title}
                    to={mode.href}
                    className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5 transition-colors hover:bg-white/8"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{mode.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-serif italic leading-none">{mode.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{mode.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-fuchsia-300" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">última pieza IA</p>
            </div>
            {latestImage && (
              <>
                <img
                  src={latestImage.imageUrl}
                  alt={latestImage.title}
                  className="mt-5 aspect-[4/3] w-full rounded-[1.5rem] object-cover border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <h3 className="mt-5 text-3xl font-serif italic">{latestImage.title}</h3>
                <p className="mt-3 leading-relaxed text-white/70">{latestImage.prompt}</p>
              </>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/18 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-sky-300" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">último post</p>
            </div>
            {latestPost && (
              <>
                <h3 className="mt-5 text-3xl font-serif italic">{latestPost.title}</h3>
                <p className="mt-3 leading-relaxed text-white/72">{latestPost.content.slice(0, 220)}...</p>
                <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-fuchsia-200">
                  Ir al blog <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          <div className="space-y-4">
            {homeContent?.discoveryCards.slice(2).map((card) => (
              <Link
                key={card.title}
                to={card.href}
                className="block rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl transition-colors hover:bg-white/10"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">seguir mirando</p>
                <h3 className="mt-3 text-2xl font-serif italic leading-none">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
