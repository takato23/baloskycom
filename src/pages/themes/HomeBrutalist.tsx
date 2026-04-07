import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Briefcase,
  Coffee,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Palette,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';
import { FAN_TIERS } from '@/utils/tiers';

const routes = [
  {
    icon: MessageSquare,
    accent: 'bg-[#00FF00]',
  },
  {
    icon: Heart,
    accent: 'bg-[#FF00FF] text-white',
  },
  {
    icon: Briefcase,
    accent: 'bg-yellow-300',
  },
  {
    icon: Palette,
    accent: 'bg-black text-white',
  },
];

const supportModes = [
  {
    color: 'bg-[#00FF00]',
    icon: Coffee,
  },
  {
    color: 'bg-[#FF00FF] text-white',
    icon: Wand2,
  },
  {
    color: 'bg-yellow-300',
    icon: Briefcase,
  },
];

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return '';

  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const watchMatch = url.match(/[?&]v=([^?&/]+)/);
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  return '';
};

export default function HomeBrutalist() {
  const { campaigns, rewards, supporters, galleryImages, blogPosts, settings, currency, shareCampaign } = useAppContext();
  const homeContent = settings?.content.home;

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const primaryCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const secondaryCampaigns = primaryCampaign
    ? activeCampaigns.filter((campaign) => campaign.id !== primaryCampaign.id).slice(0, 2)
    : activeCampaigns.slice(0, 2);
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
  const visibleRewards = [...rewards].sort((a, b) => a.minAmount - b.minAmount).slice(0, 4);
  const latestImages = galleryImages.slice(0, 2);
  const highlightedPost = blogPosts[0];
  const recentSupporters = supporters.slice(0, 3);
  const heroTitleLines = homeContent?.hero.title.split('\n') ?? [];
  const musicVideos = homeContent?.music.videos ?? [];

  return (
    <div className="bg-[#f5f0e8] text-black">
      <section className="relative overflow-hidden border-b-4 border-black bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(245,240,232,0.97)_42%,_rgba(233,225,209,1)_100%)]">
        <div className="absolute inset-x-0 top-0 h-12 overflow-hidden border-b-4 border-black bg-[#00FF00]">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
            className="flex min-w-max items-center gap-8 px-6 py-2 font-brutal text-2xl uppercase tracking-[0.22em]"
          >
            <span>apoyo directo</span>
            <span>encargos creativos</span>
            <span>portfolio vivo</span>
            <span>contenido exclusivo</span>
            <span>ia + musica + internet</span>
            <span>apoyo directo</span>
            <span>encargos creativos</span>
            <span>portfolio vivo</span>
            <span>contenido exclusivo</span>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-14 md:pb-18">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="space-y-5 border-4 border-black bg-white p-6 md:p-8 brutal-shadow"
              >
                <div className="inline-flex items-center gap-3 border-2 border-black bg-[#f5f0e8] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] brutal-shadow-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#00FF00]" />
                  {settings?.creatorName || 'Santi Balosky'}
                  <span className="text-black/45">internet, canciones, ia y delirio</span>
                </div>

                <div className="space-y-4">
                  <p className="max-w-md font-bold uppercase tracking-[0.24em] text-black/55">
                    {homeContent?.hero.eyebrow}
                  </p>
                  <h1 className="max-w-5xl font-display text-[clamp(3.6rem,9vw,7.4rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em] text-black">
                    {heroTitleLines.map((line, index) => (
                      <React.Fragment key={`${line}-${index}`}>
                        {line}
                        {index < heroTitleLines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h1>
                  <p className="max-w-2xl text-lg sm:text-xl font-medium leading-relaxed text-black/78">
                    {homeContent?.hero.subtitle}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="flex flex-col gap-4 sm:flex-row"
              >
                <Link
                  to={homeContent?.hero.primaryCtaHref || '/checkout'}
                  className="inline-flex items-center justify-center gap-2 border-4 border-black bg-black px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] text-white brutal-shadow hover:bg-[#00FF00] hover:text-black transition-colors"
                >
                  {homeContent?.hero.primaryCtaLabel} <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to={homeContent?.hero.secondaryCtaHref || '/portfolio'}
                  className="inline-flex items-center justify-center gap-2 border-4 border-black bg-white px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] brutal-shadow-sm hover:bg-yellow-300 transition-colors"
                >
                  {homeContent?.hero.secondaryCtaLabel} <Briefcase className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
                className="grid gap-4 sm:grid-cols-3"
              >
                <div className="border-4 border-black bg-white p-5 brutal-shadow-sm">
                  <p className="font-brutal text-4xl uppercase">{formatCurrency(totalRaised, currency)}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-black/65">
                    movidos por la comunidad
                  </p>
                </div>
                <div className="border-4 border-black bg-[#00FF00] p-5 brutal-shadow-sm">
                  <p className="font-brutal text-4xl uppercase">{activeCampaigns.length}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-black/65">
                    misiones activas ahora
                  </p>
                </div>
                <div className="border-4 border-black bg-black p-5 text-white brutal-shadow-sm">
                  <p className="font-brutal text-4xl uppercase">{supporters.length}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white/65">
                    mensajes y apoyos visibles
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="relative"
            >
              <div className="relative overflow-hidden border-4 border-black bg-black brutal-shadow">
                <img
                  src={settings?.creatorAvatar || '/images/santi-avatar.jpeg'}
                  alt={settings?.creatorName || 'Santi Balosky'}
                  className="h-[560px] w-full object-cover object-center grayscale contrast-125"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="border-4 border-black bg-white p-4 brutal-shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">acá podés</p>
                  <p className="mt-2 font-brutal text-2xl uppercase">bancar una idea, pedir algo o mirar en qué ando</p>
                </div>
                <div className="border-4 border-black bg-yellow-300 p-4 brutal-shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">todo junto</p>
                  <p className="mt-2 font-brutal text-2xl uppercase">contenido, proyectos, música e ia</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-[0.24em] text-black/55">{homeContent?.sections.supportEyebrow}</p>
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
              {homeContent?.sections.supportTitle}
            </h2>
          </div>
          <p className="hidden max-w-xl text-right font-medium text-black/70 md:block">
            {homeContent?.sections.supportSubtitle}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {supportModes.map((mode, index) => {
            const Icon = mode.icon;
            const content = homeContent?.supportModes[index];

            return (
              <motion.div
                key={content?.title || index}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="flex h-full flex-col justify-between border-4 border-black bg-white brutal-shadow"
              >
                <div className="space-y-6 p-6">
                  <div className={cn('inline-flex h-14 w-14 items-center justify-center border-4 border-black brutal-shadow-sm', mode.color)}>
                    <Icon className="h-7 w-7 text-current" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-black/55">{content?.eyebrow}</p>
                    <h3 className="font-display text-3xl font-bold uppercase leading-none tracking-[-0.04em]">
                      {content?.title}
                    </h3>
                    <p className="font-medium leading-relaxed text-black/76">{content?.description}</p>
                  </div>
                </div>

                <div className="border-t-4 border-black p-6">
                  <Link
                    to={content?.href || '/checkout'}
                    className="inline-flex items-center gap-2 font-brutal text-lg uppercase tracking-[0.14em] hover:text-[#FF00FF] transition-colors"
                  >
                    {content?.ctaLabel} <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {primaryCampaign && (
        <section className="border-y-4 border-black bg-[#111111] text-white">
          <div className="max-w-7xl mx-auto grid gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-6">
              <p className="font-bold uppercase tracking-[0.24em] text-white/55">misión destacada</p>
              <h2 className="max-w-3xl font-display text-5xl font-bold uppercase leading-[0.92] tracking-[-0.05em]">
                {primaryCampaign.title}
              </h2>
              <p className="max-w-2xl text-lg font-medium leading-relaxed text-white/78">
                {primaryCampaign.description}
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border-2 border-white/70 bg-white p-4 text-black">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">recaudado</p>
                  <p className="mt-2 font-brutal text-3xl uppercase">{formatCurrency(primaryCampaign.raised, currency)}</p>
                </div>
                <div className="border-2 border-white/70 bg-[#00FF00] p-4 text-black">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">meta</p>
                  <p className="mt-2 font-brutal text-3xl uppercase">
                    {primaryCampaign.goal > 0 ? formatCurrency(primaryCampaign.goal, currency) : 'abierta'}
                  </p>
                </div>
                <div className="border-2 border-white/70 bg-[#FF00FF] p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">avance</p>
                  <p className="mt-2 font-brutal text-3xl uppercase">
                    {primaryCampaign.goal > 0
                      ? `${Math.min(Math.round((primaryCampaign.raised / primaryCampaign.goal) * 100), 100)}%`
                      : 'sin tope'}
                  </p>
                </div>
              </div>

              {primaryCampaign.goal > 0 && (
                <div className="space-y-3">
                  <div className="h-6 overflow-hidden border-2 border-white bg-white/15">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{
                        width: `${Math.min((primaryCampaign.raised / primaryCampaign.goal) * 100, 100)}%`,
                      }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="h-full border-r-2 border-black bg-[#00FF00]"
                    />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/58">
                    cada aporte mueve esta misión y las próximas recompensas
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to={`/checkout/${primaryCampaign.id}`}
                  className="inline-flex items-center justify-center gap-2 border-4 border-black bg-[#00FF00] px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] text-black brutal-shadow hover:bg-white transition-colors"
                >
                  Bancar esta misión <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => shareCampaign(primaryCampaign)}
                  className="inline-flex items-center justify-center gap-2 border-4 border-white bg-transparent px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors"
                >
                  Compartir <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden border-4 border-black bg-white brutal-shadow">
                <img
                  src={primaryCampaign.image}
                  alt={primaryCampaign.title}
                  className="aspect-[4/3] w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="grid gap-4">
                {secondaryCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/checkout/${campaign.id}`}
                    className="grid gap-4 border-4 border-black bg-[#f5f0e8] p-4 text-black brutal-shadow-sm transition-transform hover:-translate-y-1 md:grid-cols-[92px_1fr]"
                  >
                    <img
                      src={campaign.image}
                      alt={campaign.title}
                      className="h-[92px] w-full border-2 border-black object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">otra misión</p>
                      <h3 className="mt-2 font-brutal text-2xl uppercase leading-none">{campaign.title}</h3>
                      <p className="mt-2 text-sm font-medium text-black/72">{campaign.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <p className="font-bold uppercase tracking-[0.24em] text-black/55">{homeContent?.sections.rewardsEyebrow}</p>
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
              {homeContent?.sections.rewardsTitle}
            </h2>
            <p className="max-w-xl font-medium leading-relaxed text-black/72">
              {homeContent?.sections.rewardsSubtitle}
            </p>
          </div>

          <div className="grid gap-4">
            {FAN_TIERS.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="grid gap-4 border-4 border-black bg-white p-5 brutal-shadow-sm md:grid-cols-[180px_1fr]"
              >
                <div className={cn('border-4 border-black p-4', tier.color)}>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">desde</p>
                  <p className="mt-2 font-brutal text-3xl uppercase">{formatCurrency(tier.minAmount, currency)}</p>
                  <p className="mt-3 font-brutal text-2xl uppercase">{tier.name}</p>
                </div>

                <div className="grid gap-3">
                  {tier.benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-3 border-2 border-black bg-[#f7f3eb] px-4 py-3 font-medium"
                    >
                      <span className="mt-1 inline-block h-3 w-3 border-2 border-black bg-[#00FF00]" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            <div className="grid gap-4 md:grid-cols-2">
              {visibleRewards.map((reward) => (
                <div key={reward.id} className="border-4 border-black bg-[#111111] p-5 text-white brutal-shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">recompensa posible</p>
                  <h3 className="mt-3 font-brutal text-2xl uppercase leading-none">{reward.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/75">{reward.description}</p>
                  <p className="mt-5 font-brutal text-xl uppercase text-[#00FF00]">
                    desde {formatCurrency(reward.minAmount, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#efe7da]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="font-bold uppercase tracking-[0.24em] text-black/55">{homeContent?.sections.discoveryEyebrow}</p>
              <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
                {homeContent?.sections.discoveryTitle}
              </h2>
            </div>
            <p className="hidden max-w-xl text-right font-medium text-black/70 md:block">
              {homeContent?.sections.discoverySubtitle}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-6 sm:grid-cols-2">
              {routes.map((item, index) => {
                const Icon = item.icon;
                const content = homeContent?.discoveryCards[index];

                return (
                  <motion.div
                    key={content?.title || index}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-70px' }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className="flex h-full flex-col justify-between border-4 border-black bg-white brutal-shadow-sm"
                  >
                    <div className="space-y-4 p-5">
                      <div className={cn('inline-flex h-12 w-12 items-center justify-center border-4 border-black brutal-shadow-sm', item.accent)}>
                        <Icon className="h-5 w-5 text-current" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-display text-2xl font-bold uppercase leading-none tracking-[-0.04em]">
                          {content?.title}
                        </h3>
                        <p className="font-medium leading-relaxed text-black/74">{content?.description}</p>
                      </div>
                    </div>
                    <div className="border-t-4 border-black p-5">
                      <Link to={content?.href || '/'} className="inline-flex items-center gap-2 font-brutal text-lg uppercase">
                        Entrar <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid gap-6">
              <div className="grid gap-4 border-4 border-black bg-black p-5 text-white brutal-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border-4 border-white bg-[#FF00FF] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">últimas piezas IA</p>
                    <h3 className="font-brutal text-2xl uppercase">muestra viva</h3>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {latestImages.map((image) => (
                    <div key={image.id} className="overflow-hidden border-4 border-white bg-white text-black">
                      <img
                        src={image.imageUrl}
                        alt={image.title}
                        className="aspect-[4/3] w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-2 p-4">
                        <p className="font-brutal text-xl uppercase leading-none">{image.title}</p>
                        <p className="line-clamp-3 text-sm font-medium text-black/70">{image.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {highlightedPost && (
                <div className="grid gap-4 border-4 border-black bg-white p-5 brutal-shadow-sm md:grid-cols-[1fr_180px]">
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">última nota</p>
                    <h3 className="font-display text-3xl font-bold uppercase leading-none tracking-[-0.04em]">
                      {highlightedPost.title}
                    </h3>
                    <p className="font-medium leading-relaxed text-black/72">{highlightedPost.content.slice(0, 180)}...</p>
                    <Link
                      to="/blog"
                      className="inline-flex items-center gap-2 font-brutal text-lg uppercase text-[#FF00FF] hover:text-black transition-colors"
                    >
                      Ir al blog <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>

                  {highlightedPost.imageUrl ? (
                    <img
                      src={highlightedPost.imageUrl}
                      alt={highlightedPost.title}
                      className="h-full w-full border-4 border-black object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full min-h-[180px] items-center justify-center border-4 border-black bg-yellow-300">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-[0.24em] text-black/55">{homeContent?.courses.eyebrow}</p>
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
              {homeContent?.courses.title}
            </h2>
          </div>
          <p className="max-w-3xl text-right font-medium text-black/70">
            {homeContent?.courses.subtitle}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {homeContent?.courses.items.map((course, index) => (
            <div key={course.title} className={cn(
              "border-4 border-black p-6 brutal-shadow-sm",
              index === 1 ? 'bg-[#00FF00]' : index === 2 ? 'bg-[#111111] text-white' : 'bg-white'
            )}>
              <div className={cn(
                "inline-flex px-3 py-1 border-2 border-black text-xs font-bold uppercase tracking-[0.2em]",
                index === 2 ? 'bg-white text-black' : 'bg-[#FF00FF] text-white'
              )}>
                {course.badge}
              </div>
              <h3 className="mt-5 font-brutal text-3xl uppercase leading-[0.94]">{course.title}</h3>
              <p className={cn("mt-4 text-sm leading-relaxed font-medium", index === 2 ? 'text-white/76' : 'text-black/74')}>
                {course.description}
              </p>
              {course.href && course.href !== '#' && (
                <Link
                  to={course.href}
                  className={cn(
                    "mt-6 inline-flex items-center gap-2 font-brutal text-lg uppercase",
                    index === 2 ? 'text-[#00FF00]' : 'text-black hover:text-[#FF00FF]'
                  )}
                >
                  Ver más <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div className="space-y-3">
              <p className="font-bold uppercase tracking-[0.24em] text-white/55">{homeContent?.music.eyebrow}</p>
              <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
                {homeContent?.music.title}
              </h2>
            </div>
            <p className="max-w-3xl text-right font-medium text-white/72">
              {homeContent?.music.subtitle}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {homeContent?.music.spotifyUrl && (
                  <a
                    href={homeContent.music.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-4 border-white bg-[#1DB954] px-5 py-4 font-brutal text-lg uppercase text-black brutal-shadow-sm"
                  >
                    Spotify
                  </a>
                )}
                {homeContent?.music.appleMusicUrl && (
                  <a
                    href={homeContent.music.appleMusicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-4 border-white bg-white px-5 py-4 font-brutal text-lg uppercase text-black brutal-shadow-sm"
                  >
                    Apple Music
                  </a>
                )}
                {homeContent?.music.youtubeChannelUrl && (
                  <a
                    href={homeContent.music.youtubeChannelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-4 border-white bg-[#FF0033] px-5 py-4 font-brutal text-lg uppercase text-white brutal-shadow-sm"
                  >
                    YouTube
                  </a>
                )}
              </div>

              {(!homeContent?.music.spotifyUrl && !homeContent?.music.appleMusicUrl && !homeContent?.music.youtubeChannelUrl) && (
                <div className="border-4 border-white bg-black p-5">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/55">
                    Acá van a aparecer tus links de música cuando los cargues desde admin.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {musicVideos.map((video, index) => {
                const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);

                return (
                  <div key={`${video.title}-${index}`} className="border-4 border-white bg-white text-black brutal-shadow-sm overflow-hidden">
                    <div className="p-4 border-b-4 border-black">
                      <p className="font-brutal text-xl uppercase leading-none">{video.title || `Video ${index + 1}`}</p>
                    </div>
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={video.title || `Video ${index + 1}`}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="aspect-video w-full flex items-center justify-center bg-[#f5f0e8] p-4 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-black/55">
                          Cargá un link de YouTube en admin para mostrarlo acá
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="mb-8 space-y-3">
          <p className="font-bold uppercase tracking-[0.24em] text-black/55">prueba social</p>
          <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-[-0.05em]">
            la comunidad ya está hablando
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            {recentSupporters.map((supporter, index) => (
              <motion.div
                key={supporter.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className={cn(
                  'border-4 border-black p-5 brutal-shadow-sm',
                  index === 1 ? 'bg-[#FF00FF] text-white' : 'bg-white text-black'
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="font-brutal text-2xl uppercase">{supporter.name}</p>
                    <p className={cn('text-xs font-bold uppercase tracking-[0.2em]', index === 1 ? 'text-white/65' : 'text-black/55')}>
                      {supporter.date}
                    </p>
                  </div>
                  <div className={cn(
                    'inline-flex border-2 border-black px-3 py-2 font-brutal text-xl uppercase',
                    index === 1 ? 'bg-white text-black' : 'bg-[#00FF00] text-black'
                  )}>
                    {formatCurrency(supporter.amount, currency)}
                  </div>
                </div>

                {supporter.message && (
                  <p className={cn('mt-5 text-lg font-medium leading-relaxed', index === 1 ? 'text-white' : 'text-black/80')}>
                    "{supporter.message.replace('[ENCARGO MÁGICO]\n', '')}"
                  </p>
                )}

                {supporter.creatorResponse && (
                  <div className="mt-5 border-4 border-black bg-yellow-300 p-4 text-black">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/55">respuesta de santi</p>
                    <p className="mt-2 font-medium">{supporter.creatorResponse}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex h-full flex-col justify-between border-4 border-black bg-[#111111] p-6 text-white brutal-shadow">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">gracias posta</p>
              <h3 className="font-display text-4xl font-bold uppercase leading-[0.94] tracking-[-0.05em]">
                si estás acá,
                <br />
                gracias por bancar
                <br />
                este delirio
              </h3>
              <p className="font-medium leading-relaxed text-white/74">
                Cada aporte empuja viajes, canciones, videos, experimentos y las ideas raras que se me cruzan por la cabeza.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center gap-2 border-4 border-black bg-[#00FF00] px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] text-black brutal-shadow-sm hover:bg-white transition-colors"
              >
                Probar el flujo de apoyo <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/wall"
                className="inline-flex items-center justify-center gap-2 border-4 border-white bg-transparent px-7 py-4 font-brutal text-lg uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors"
              >
                Ver comunidad <MessageSquare className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
