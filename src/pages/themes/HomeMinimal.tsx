import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Coffee, MessageSquare, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';

export default function HomeMinimal() {
  const { campaigns, supporters, blogPosts, galleryImages, currency, settings } = useAppContext();
  const homeContent = settings?.content.home;

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const featuredCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const secondaryCampaigns = featuredCampaign
    ? activeCampaigns.filter((campaign) => campaign.id !== featuredCampaign.id).slice(0, 2)
    : activeCampaigns.slice(0, 2);
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
  const latestPost = blogPosts[0];
  const latestImage = galleryImages[0];
  const heroTitleLines = homeContent?.hero.title.split('\n') ?? [];

  return (
    <div className="bg-[#f7f4ee] text-[#161616]">
      <section className="border-b border-black/10">
        <div className="mx-auto grid max-w-[88rem] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="grid gap-8 border border-black/10 bg-white p-8 sm:p-10">
            <div className="space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-black/45">
                {homeContent?.hero.eyebrow}
              </p>
              <h1 className="max-w-4xl text-[clamp(3.6rem,8vw,7.8rem)] font-serif leading-[0.88] tracking-[-0.06em]">
                {heroTitleLines.map((line, index) => (
                  <React.Fragment key={`${line}-${index}`}>
                    {line}
                    {index < heroTitleLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-black/68">
                {homeContent?.hero.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to={homeContent?.hero.primaryCtaHref || '/checkout'}
                className="inline-flex items-center justify-center gap-2 border border-[#161616] bg-[#161616] px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#d8c3a5] hover:text-[#161616]"
              >
                <Coffee className="h-4 w-4" />
                {homeContent?.hero.primaryCtaLabel}
              </Link>
              <Link
                to={homeContent?.hero.secondaryCtaHref || '/portfolio'}
                className="inline-flex items-center justify-center gap-2 border border-black/15 bg-[#f3ece2] px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors hover:bg-white"
              >
                <Briefcase className="h-4 w-4" />
                {homeContent?.hero.secondaryCtaLabel}
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-black/10 bg-[#f7f4ee] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">recaudado</p>
                  <p className="mt-3 text-3xl font-serif">{formatCurrency(totalRaised, currency)}</p>
                </div>
                <div className="border border-black/10 bg-[#f7f4ee] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">misiones</p>
                  <p className="mt-3 text-3xl font-serif">{activeCampaigns.length}</p>
                </div>
                <div className="border border-black/10 bg-[#f7f4ee] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">mensajes</p>
                  <p className="mt-3 text-3xl font-serif">{supporters.length}</p>
                </div>
              </div>

              <div className="border border-black/10 bg-[#161616] p-5 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">nota rápida</p>
                <p className="mt-3 text-base leading-relaxed text-white/78">
                  Todo lo que voy haciendo, subiendo o probando termina cayendo por acá.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden border border-black/10 bg-white">
              <img
                src={settings?.creatorAvatar || '/images/santi-avatar.jpeg'}
                alt={settings?.creatorName || 'Santi Balosky'}
                className="aspect-[4/5] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {homeContent?.discoveryCards.slice(0, 2).map((card) => (
              <Link
                key={card.title}
                to={card.href}
                className="grid gap-2 border border-black/10 bg-[#ece4d7] p-5 transition-colors hover:bg-white"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">seguir mirando</p>
                <h2 className="text-3xl font-serif leading-none">{card.title}</h2>
                <p className="leading-relaxed text-black/68">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[88rem] px-4 py-16 sm:px-6">
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-black/45">
              {homeContent?.sections.supportEyebrow}
            </p>
            <h2 className="mt-3 text-5xl font-serif leading-none tracking-[-0.05em]">
              {homeContent?.sections.supportTitle}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-black/68">
            {homeContent?.sections.supportSubtitle}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          {homeContent?.supportModes.map((mode, index) => (
            <div
              key={mode.title}
              className={[
                'border border-black/10 p-6',
                index === 0 ? 'bg-white lg:min-h-[28rem]' : '',
                index === 1 ? 'bg-[#ece4d7]' : '',
                index === 2 ? 'bg-[#161616] text-white' : '',
              ].join(' ')}
            >
              <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${index === 2 ? 'text-white/45' : 'text-black/45'}`}>
                {mode.eyebrow}
              </p>
              <h3 className="mt-4 text-4xl font-serif leading-[0.94]">{mode.title}</h3>
              <p className={`mt-5 leading-relaxed ${index === 2 ? 'text-white/72' : 'text-black/68'}`}>
                {mode.description}
              </p>
              <Link
                to={mode.href}
                className={`mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${
                  index === 2 ? 'text-[#d8c3a5]' : 'text-[#161616]'
                }`}
              >
                {mode.ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {featuredCampaign && (
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto grid max-w-[88rem] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-black/45">misión destacada</p>
              <h2 className="text-5xl font-serif leading-[0.92] tracking-[-0.05em]">{featuredCampaign.title}</h2>
              <p className="max-w-2xl leading-relaxed text-black/68">{featuredCampaign.description}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-black/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">recaudado</p>
                  <p className="mt-2 text-2xl font-serif">{formatCurrency(featuredCampaign.raised, currency)}</p>
                </div>
                <div className="border border-black/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">meta</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0 ? formatCurrency(featuredCampaign.goal, currency) : 'Abierta'}
                  </p>
                </div>
                <div className="border border-black/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">estado</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0
                      ? `${Math.min(Math.round((featuredCampaign.raised / featuredCampaign.goal) * 100), 100)}%`
                      : 'Libre'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <img
                src={featuredCampaign.image}
                alt={featuredCampaign.title}
                className="aspect-[4/3] w-full border border-black/10 object-cover"
                referrerPolicy="no-referrer"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {secondaryCampaigns.map((campaign) => (
                  <Link key={campaign.id} to={`/checkout/${campaign.id}`} className="border border-black/10 bg-[#f7f4ee] p-4 transition-colors hover:bg-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">otra misión</p>
                    <h3 className="mt-3 text-2xl font-serif leading-none">{campaign.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-black/68">{campaign.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[88rem] px-4 py-16 sm:px-6">
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-black/45">
              {homeContent?.sections.discoveryEyebrow}
            </p>
            <h2 className="mt-3 text-5xl font-serif leading-none tracking-[-0.05em]">
              {homeContent?.sections.discoveryTitle}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-black/68">
            {homeContent?.sections.discoverySubtitle}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.95fr]">
          <div className="border border-black/10 bg-white p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">última pieza IA</p>
            </div>
            {latestImage && (
              <>
                <img
                  src={latestImage.imageUrl}
                  alt={latestImage.title}
                  className="mt-5 aspect-[4/3] w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <h3 className="mt-5 text-3xl font-serif">{latestImage.title}</h3>
                <p className="mt-3 leading-relaxed text-black/68">{latestImage.prompt}</p>
              </>
            )}
          </div>

          <div className="border border-black/10 bg-[#161616] p-6 text-white">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">último post</p>
            </div>
            {latestPost && (
              <>
                <h3 className="mt-5 text-3xl font-serif">{latestPost.title}</h3>
                <p className="mt-3 leading-relaxed text-white/72">{latestPost.content.slice(0, 220)}...</p>
                <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#d8c3a5]">
                  Ir al blog <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          <div className="grid gap-4">
            {homeContent?.discoveryCards.slice(2).map((card) => (
              <Link key={card.title} to={card.href} className="border border-black/10 bg-[#ece4d7] p-5 transition-colors hover:bg-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">seguir mirando</p>
                <h3 className="mt-3 text-2xl font-serif leading-none">{card.title}</h3>
                <p className="mt-3 leading-relaxed text-black/68">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
