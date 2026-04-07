import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coffee, ArrowRight, Terminal, Share2, Lock, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';

export default function HomeTerminal() {
  const { campaigns, rewards, supporters, settings, currency, shareCampaign } = useAppContext();
  const homeContent = settings?.content.home;
  const [text, setText] = useState('');
  const heroTitle = homeContent?.hero.title.replace(/\n/g, ' / ') ?? '';
  const fullText = `BOOTING BALOSKY.OS...\nLOADING SUPPORT MODULES...\nREADY.\n${heroTitle.toUpperCase()}`;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [fullText]);

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const featuredCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);

  return (
    <div className="space-y-12 pb-16 min-h-screen bg-black text-[#00ff00] font-mono relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-50 scanlines opacity-35 mix-blend-overlay" />

      <section className="px-4 pt-8">
        <div className="mx-auto max-w-6xl border border-[#00ff00] bg-black">
          <div className="flex items-center justify-between border-b border-[#00ff00] px-4 py-2 text-[11px] tracking-[0.18em] uppercase">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4" /> balosky.os
            </span>
            <span>session stable</span>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-6">
              <div className="border border-[#00ff00]/40 bg-[#031103] px-4 py-3 text-sm whitespace-pre-wrap min-h-[7rem]">
                {text}
                <span className="animate-pulse">_</span>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">{homeContent?.hero.eyebrow}</p>
                <h1 className="text-[clamp(2rem,5vw,4.4rem)] uppercase leading-[0.95] tracking-[0.08em]">
                  {homeContent?.hero.title.split('\n').map((line, index) => (
                    <React.Fragment key={`${line}-${index}`}>
                      {line}
                      {index < homeContent.hero.title.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed opacity-80">
                  {homeContent?.hero.subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={homeContent?.hero.primaryCtaHref || '/checkout'}
                  className="inline-flex items-center justify-center gap-2 border border-[#00ff00] bg-[#00ff00] px-5 py-3 text-black text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#b8ffb8] transition-colors"
                >
                  <Coffee className="w-4 h-4" />
                  {homeContent?.hero.primaryCtaLabel}
                </Link>
                <Link
                  to={homeContent?.hero.secondaryCtaHref || '/portfolio'}
                  className="inline-flex items-center justify-center gap-2 border border-[#00ff00] px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#071907] transition-colors"
                >
                  {homeContent?.hero.secondaryCtaLabel}
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="border border-[#00ff00]/40 bg-[#031103] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-60">system stats</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <p className="text-[11px] uppercase opacity-50">funds</p>
                    <p className="mt-1 text-2xl font-bold">{formatCurrency(totalRaised, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase opacity-50">missions</p>
                    <p className="mt-1 text-2xl font-bold">{activeCampaigns.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase opacity-50">supporters</p>
                    <p className="mt-1 text-2xl font-bold">{supporters.length}</p>
                  </div>
                </div>
              </div>

              {homeContent?.discoveryCards.slice(0, 2).map((card) => (
                <Link
                  key={card.title}
                  to={card.href}
                  className="border border-[#00ff00]/40 p-4 hover:bg-[#071907] transition-colors"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] opacity-50">module</p>
                  <h2 className="mt-2 text-xl uppercase tracking-[0.08em]">{card.title}</h2>
                  <p className="mt-2 text-sm opacity-75 leading-relaxed">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="mx-auto max-w-6xl border border-[#00ff00] p-5">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] opacity-50">support modes</span>
            <div className="h-px flex-1 bg-[#00ff00]/30" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {homeContent?.supportModes.map((mode, index) => (
              <div key={mode.title} className={`border p-5 ${index === 1 ? 'bg-[#071907] border-[#00ff00]' : 'border-[#00ff00]/40'}`}>
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-50">{mode.eyebrow}</p>
                <h3 className="mt-3 text-2xl uppercase leading-[1.02] tracking-[0.06em]">{mode.title}</h3>
                <p className="mt-4 text-sm opacity-78 leading-relaxed">{mode.description}</p>
                <Link
                  to={mode.href}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] hover:text-white transition-colors"
                >
                  {mode.ctaLabel} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredCampaign && (
        <section className="px-4">
          <div className="mx-auto max-w-6xl border border-[#00ff00] bg-[#031103] p-5">
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] opacity-50">active mission</span>
              <div className="h-px flex-1 bg-[#00ff00]/30" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <h2 className="text-3xl uppercase tracking-[0.08em]">{featuredCampaign.title}</h2>
                <p className="max-w-3xl text-sm leading-relaxed opacity-80">{featuredCampaign.description}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase opacity-50">raised</p>
                    <p className="mt-2 text-xl font-bold">{formatCurrency(featuredCampaign.raised, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase opacity-50">goal</p>
                    <p className="mt-2 text-xl font-bold">
                      {featuredCampaign.goal > 0 ? formatCurrency(featuredCampaign.goal, currency) : 'OPEN'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase opacity-50">status</p>
                    <p className="mt-2 text-xl font-bold">
                      {featuredCampaign.goal > 0
                        ? `${Math.min(Math.round((featuredCampaign.raised / featuredCampaign.goal) * 100), 100)}%`
                        : 'OPEN'}
                    </p>
                  </div>
                </div>

                {featuredCampaign.goal > 0 && (
                  <div className="space-y-2">
                    <div className="h-3 border border-[#00ff00] p-[1px]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{
                          width: `${Math.min((featuredCampaign.raised / featuredCampaign.goal) * 100, 100)}%`,
                        }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'linear' }}
                        className="h-full bg-[#00ff00]"
                      />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.18em] opacity-55">each transfer moves the mission forward</p>
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <Link
                  to={`/checkout/${featuredCampaign.id}`}
                  className="flex items-center justify-center gap-2 border border-[#00ff00] bg-[#00ff00] px-5 py-4 text-black text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#b8ffb8] transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  support mission
                </Link>
                <button
                  onClick={() => shareCampaign(featuredCampaign)}
                  className="flex items-center justify-center gap-2 border border-[#00ff00] px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#071907] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  share
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-10">
        <div className="mx-auto max-w-6xl grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          {homeContent?.discoveryCards.slice(2).map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className="border border-[#00ff00]/40 p-5 hover:bg-[#071907] transition-colors"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-50">module</p>
              <h3 className="mt-3 text-xl uppercase tracking-[0.08em]">{card.title}</h3>
              <p className="mt-3 text-sm opacity-75 leading-relaxed">{card.description}</p>
            </Link>
          ))}

          <div className="border border-[#00ff00]/40 p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-50">community logs</p>
            </div>
            <div className="mt-4 space-y-3">
              {supporters.slice(0, 3).map((supporter) => (
                <div key={supporter.id} className="border-l border-[#00ff00]/40 pl-3">
                  <p className="text-sm">
                    <span className="opacity-55">{supporter.date}</span> <span className="font-bold">{supporter.name}</span>
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    transferred {formatCurrency(supporter.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
