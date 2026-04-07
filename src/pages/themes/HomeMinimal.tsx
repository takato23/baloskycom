import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Coffee, MessageSquare, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';

export default function HomeMinimal() {
  const { campaigns, supporters, blogPosts, galleryImages, currency, settings } = useAppContext();

  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  const featuredCampaign =
    activeCampaigns.find((campaign) => campaign.goal > 0) || activeCampaigns[0] || null;
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
  const latestPost = blogPosts[0];
  const latestImage = galleryImages[0];

  return (
    <div className="bg-[#f7f4ee] text-[#161616]">
      <section className="border-b border-black/10">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-black/45">
                sitio propio para apoyo directo
              </p>
              <h1 className="max-w-4xl text-[clamp(3.4rem,9vw,7.4rem)] font-serif leading-[0.9] tracking-[-0.05em]">
                apoyo, encargos
                <br />
                y portfolio
                <br />
                en un mismo lugar
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-black/68">
                Una versión más calma de la página. Ideal si querés que se sienta más editorial, más profesional y menos gritada, sin perder la lógica de comunidad.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center gap-2 border border-black bg-black px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#d8c3a5] hover:text-black"
              >
                <Coffee className="h-4 w-4" />
                Aportar
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center justify-center gap-2 border border-black px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] transition-colors hover:bg-white"
              >
                <Briefcase className="h-4 w-4" />
                Portfolio
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-black/15 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">recaudado</p>
                <p className="mt-3 text-3xl font-serif">{formatCurrency(totalRaised, currency)}</p>
              </div>
              <div className="border border-black/15 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">misiones</p>
                <p className="mt-3 text-3xl font-serif">{activeCampaigns.length}</p>
              </div>
              <div className="border border-black/15 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">mensajes</p>
                <p className="mt-3 text-3xl font-serif">{supporters.length}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden border border-black/15 bg-white">
              <img
                src={settings?.creatorAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=800&auto=format&fit=crop'}
                alt={settings?.creatorName || 'Santi Balosky'}
                className="aspect-[4/5] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-sm font-medium leading-relaxed text-black/62">
              Para seguidores que quieren apoyar, para marcas que quieren entender qué hacés, y para cualquiera que quiera encargarte algo puntual.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <div className="border border-black/15 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">apoyo libre</p>
          <h2 className="mt-3 text-3xl font-serif leading-none">Un cafecito</h2>
          <p className="mt-4 leading-relaxed text-black/68">
            Para bancar el contenido y que las ideas salgan sin depender de una plataforma ajena.
          </p>
          <Link to="/checkout" className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
            Ir al checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border border-black/15 bg-[#ece4d7] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">encargo</p>
          <h2 className="mt-3 text-3xl font-serif leading-none">IA personalizada</h2>
          <p className="mt-4 leading-relaxed text-black/68">
            Fotos, memes, avatares o rarezas visuales hechas a medida para quien apoya.
          </p>
          <Link to="/checkout" className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
            Pedir algo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border border-black/15 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">trabajo</p>
          <h2 className="mt-3 text-3xl font-serif leading-none">Portfolio</h2>
          <p className="mt-4 leading-relaxed text-black/68">
            La misma web funciona como carta de presentación si alguien quiere contratarte.
          </p>
          <Link to="/portfolio" className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
            Ver trabajo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {featuredCampaign && (
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">misión destacada</p>
              <h2 className="text-5xl font-serif leading-none">{featuredCampaign.title}</h2>
              <p className="max-w-2xl leading-relaxed text-black/68">{featuredCampaign.description}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">recaudado</p>
                  <p className="mt-2 text-2xl font-serif">{formatCurrency(featuredCampaign.raised, currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">meta</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0 ? formatCurrency(featuredCampaign.goal, currency) : 'Abierta'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">estado</p>
                  <p className="mt-2 text-2xl font-serif">
                    {featuredCampaign.goal > 0
                      ? `${Math.min(Math.round((featuredCampaign.raised / featuredCampaign.goal) * 100), 100)}%`
                      : 'Libre'}
                  </p>
                </div>
              </div>
            </div>

            <img
              src={featuredCampaign.image}
              alt={featuredCampaign.title}
              className="aspect-[4/3] w-full border border-black/10 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="border border-black/15 bg-white p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/45">última pieza IA</p>
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

        <div className="border border-black/15 bg-[#161616] p-6 text-white">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">último post</p>
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
      </section>
    </div>
  );
}
