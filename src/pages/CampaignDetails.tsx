import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, Users, Clock, Share2, Award, CheckCircle2, Star } from 'lucide-react';
import { api } from '@/services/api';
import { Campaign } from '@/types';
import { motion, animate } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { getPageStyles } from '@/themes/pageStyles';

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animatedAmount, setAnimatedAmount] = useState(0);
  const { shareCampaign } = useAppContext();
  const styles = getPageStyles();

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const campaigns = await api.getCampaigns();
        const found = campaigns.find(c => c.id === id);
        if (found) {
          setCampaign(found);
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (!campaign) return;

    const startValue = animatedAmount;
    const endValue = campaign.currentAmount;

    if (startValue === endValue) {
      setAnimatedAmount(endValue);
      return;
    }

    const controls = animate(startValue, endValue, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (value) => {
        setAnimatedAmount(Math.round(value));
      },
    });

    return () => controls.stop();
  }, [campaign]);

  if (isLoading) {
    return (
      <div className="theme-page theme-adapt min-h-screen flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="theme-page theme-adapt min-h-screen flex flex-col items-center justify-center font-sans">
        <h2 className="text-2xl font-bold mb-4 text-[var(--black)]">Misión no encontrada</h2>
        <Link to="/" className="text-[var(--accent)] hover:opacity-80 flex items-center gap-2 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    );
  }

  const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
  const animatedProgress = Math.min((animatedAmount / campaign.targetAmount) * 100, 100);

  return (
    <div className="theme-page theme-adapt min-h-screen pb-20 font-sans">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96 w-full overflow-hidden bg-[var(--black)]">
        {campaign.coverImage ? (
          <img
            src={campaign.coverImage}
            alt={campaign.title}
            decoding="async"
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--black)]"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--black)] via-[var(--black)]/50 to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-5xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--white)]/55 hover:text-[var(--white)] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl t-hero text-[var(--white)] mb-4"
          >
            {campaign.title}
          </motion.h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 t-section text-[var(--black)]">Acerca de esta misión</h2>

            {/* Video Player */}
            {campaign.videoUrl && (
              <div className="w-full aspect-video overflow-hidden mb-8 relative group border border-[var(--border)] bg-[var(--black)]">
                <iframe
                  className="w-full h-full"
                  src={campaign.videoUrl}
                  title="Video de la campaña"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

              <div className="prose max-w-none leading-relaxed t-body">
              {campaign.fullDescription || campaign.shortDescription}
            </div>
          </section>

          {/* Stretch Goals (if any) */}
          {campaign.stretchGoals && campaign.stretchGoals.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 t-section text-[var(--black)]">
                <span className="bg-[var(--accent)]/20 text-[var(--accent)] p-2"><Award className="w-5 h-5" /></span>
                Próximas metas
              </h2>
              <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:ml-[39px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[var(--border)]">
                {campaign.stretchGoals.map((goal, index) => {
                  const isReached = campaign.currentAmount >= goal.amount;
                  const isNext = !isReached && (index === 0 || campaign.currentAmount >= campaign.stretchGoals[index - 1].amount);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-500",
                        isReached ? "bg-[var(--accent)] text-white" : isNext ? "bg-[var(--black)] text-[var(--white)] animate-pulse" : "bg-[var(--grey)] text-[var(--muted)]"
                      )}>
                        {isReached ? <CheckCircle2 className="w-5 h-5" /> : <Star className="w-4 h-4" />}
                      </div>

                      {/* Card */}
                      <div className={cn(
                        "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 border transition-all duration-300 hover:-translate-y-1",
                        isReached ? "bg-[var(--accent)]/10 border-[var(--accent)]/30" :
                        isNext ? "bg-[var(--grey)] border-[var(--accent)]" :
                        "bg-[var(--grey)] border-[var(--border)]"
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={cn(
                            "font-bold text-lg",
                            isReached ? "text-[var(--accent)]" : isNext ? "text-[var(--black)]" : "text-[var(--muted)]"
                          )}>
                            Meta de ${goal.amount.toLocaleString('es-AR')}
                          </h3>
                          {isReached && <span className="text-xs font-bold bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1">¡Logrado!</span>}
                          {isNext && <span className="text-xs font-bold bg-[var(--black)] text-[var(--white)] px-2 py-1">En progreso</span>}
                        </div>
                        <p className={cn("text-sm leading-relaxed", isReached || isNext ? "text-[var(--black)]" : "text-[var(--muted)]")}>
                          {goal.description}
                        </p>

                        {/* Progress bar for the current goal */}
                        {isNext && (
                          <div className="mt-4">
                            <div className="h-1.5 bg-[var(--grey)] overflow-hidden border border-[var(--border)]">
                              <motion.div
                                className="h-full bg-[var(--accent)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (campaign.currentAmount / goal.amount) * 100)}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                            <p className="text-right text-xs text-[var(--muted)] mt-1">
                              Faltan ${(goal.amount - campaign.currentAmount).toLocaleString('es-AR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
          {/* FAQ Section */}
          <div className="mt-12 p-8 bg-[var(--grey)] border border-[var(--border)]">
            <h3 className="text-2xl font-bold mb-6 t-section text-[var(--black)]">Preguntas Frecuentes</h3>
            <div className="space-y-4">
              <div className="bg-[var(--white)] border border-[var(--border)] p-5">
                <h4 className="font-bold text-[var(--accent)] mb-2">¿Qué pasa si no se llega a la meta?</h4>
                <p className="text-[var(--muted)] text-sm">Igual lo uso para el proyecto, solo que va a tardar un poco más. Cada peso suma.</p>
              </div>
              <div className="bg-[var(--white)] border border-[var(--border)] p-5">
                <h4 className="font-bold text-[var(--accent)] mb-2">¿Puedo aportar de forma anónima?</h4>
                <p className="text-[var(--muted)] text-sm">Sí. Cuando pagás podés elegir que tu nombre no aparezca en el muro.</p>
              </div>
              <div className="bg-[var(--white)] border border-[var(--border)] p-5">
                <h4 className="font-bold text-[var(--accent)] mb-2">¿Cuáles son los métodos de pago?</h4>
                <p className="text-[var(--muted)] text-sm">Tarjetas de crédito y débito por Mercado Pago, más dinero en cuenta.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="p-6 sticky top-24 bg-[var(--grey)] border border-[var(--border)]">
            <div className="mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-[var(--black)]">${animatedAmount.toLocaleString()}</span>
                <span className="text-[var(--muted)] mb-1">recaudados de ${campaign.targetAmount.toLocaleString()}</span>
              </div>

              <div className="h-3 bg-[var(--white)] border border-[var(--border)] overflow-hidden mb-4">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-100 ease-out"
                  style={{ width: `${animatedProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-sm font-medium">
                <span className="text-[var(--accent)]">{Math.round(animatedProgress)}% completado</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[var(--white)] border border-[var(--border)] p-4 text-center">
                <Users className="w-6 h-6 text-[var(--muted)] mx-auto mb-2" />
                <div className="font-bold text-[var(--black)]">124</div>
                <div className="text-xs text-[var(--muted)]">Aportantes</div>
              </div>
              <div className="bg-[var(--white)] border border-[var(--border)] p-4 text-center">
                <Clock className="w-6 h-6 text-[var(--muted)] mx-auto mb-2" />
                <div className="font-bold text-[var(--black)]">12</div>
                <div className="text-xs text-[var(--muted)]">Días restantes</div>
              </div>
            </div>

            <Link
              to={`/checkout/${campaign.id}`}
              data-hover
              className="w-full py-4 font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] mb-4 flex items-center justify-center bg-[var(--accent)] text-white"
            >
              Aportar a esta misión
            </Link>

            <button
              onClick={() => shareCampaign(campaign as any)}
              data-hover
              className="w-full py-3 font-medium flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 group bg-[var(--grey)] text-[var(--black)] border border-[var(--border)] hover:bg-[var(--black)] hover:text-[var(--white)] mt-4"
            >
              <Share2 className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
