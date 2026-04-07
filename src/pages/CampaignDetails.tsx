import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, Users, Clock, Share2, Award, CheckCircle2, Star } from 'lucide-react';
import { api } from '@/services/api';
import { Campaign } from '@/types';
import { motion, animate } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { getThemedPageStyles } from '@/themes/pageStyles';

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animatedAmount, setAnimatedAmount] = useState(0);
  const { shareCampaign, theme } = useAppContext();
  const styles = getThemedPageStyles(theme);

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
      <div className={cn("theme-page theme-adapt min-h-screen flex items-center justify-center", styles.shell)}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={cn("theme-page theme-adapt min-h-screen flex flex-col items-center justify-center", styles.shell)}>
        <h2 className="text-2xl font-bold mb-4">Misión no encontrada</h2>
        <Link to="/" className="text-violet-400 hover:text-violet-300 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    );
  }

  const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
  const animatedProgress = Math.min((animatedAmount / campaign.targetAmount) * 100, 100);

  return (
    <div className={cn("theme-page theme-adapt min-h-screen pb-20", styles.shell)}>
      {/* Hero Section */}
      <div className={cn("relative h-64 md:h-96 w-full overflow-hidden", styles.contrastPanel)}>
        {campaign.coverImage ? (
          <img 
            src={campaign.coverImage} 
            alt={campaign.title}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-black"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-5xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-white mb-4"
          >
            {campaign.title}
          </motion.h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className={cn("text-2xl font-bold mb-4", styles.sectionTitle)}>Acerca de esta misión</h2>
            
            {/* Video Player */}
            {campaign.videoUrl && (
              <div className={cn("w-full aspect-video rounded-2xl overflow-hidden mb-8 shadow-2xl relative group", styles.contrastPanel)}>
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

              <div className={cn("prose prose-invert max-w-none leading-relaxed", styles.pageSubtitle)}>
              {campaign.fullDescription || campaign.shortDescription}
            </div>
          </section>

          {/* Stretch Goals (if any) */}
          {campaign.stretchGoals && campaign.stretchGoals.length > 0 && (
            <section>
              <h2 className={cn("text-2xl font-bold mb-6 flex items-center gap-2", styles.sectionTitle)}>
                <span className="bg-violet-500/20 text-violet-400 p-2 rounded-xl"><Award className="w-5 h-5" /></span>
                Roadmap de Metas
              </h2>
              <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:ml-[39px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
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
                        "flex items-center justify-center w-10 h-10 rounded-full border-4 border-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl transition-colors duration-500",
                        isReached ? "bg-emerald-500 text-black" : isNext ? "bg-violet-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {isReached ? <CheckCircle2 className="w-5 h-5" /> : <Star className="w-4 h-4" />}
                      </div>
                      
                      {/* Card */}
                      <div className={cn(
                        "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1",
                        isReached ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : 
                        isNext ? "bg-violet-500/10 border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : 
                        "bg-zinc-900/50 border-zinc-800/50"
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={cn(
                            "font-bold text-lg", 
                            isReached ? "text-emerald-400" : isNext ? "text-violet-400" : "text-zinc-400"
                          )}>
                            Meta de ${goal.amount.toLocaleString('es-AR')}
                          </h3>
                          {isReached && <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">¡Logrado!</span>}
                          {isNext && <span className="text-xs font-bold bg-violet-500/20 text-violet-400 px-2 py-1 rounded-full">En progreso</span>}
                        </div>
                        <p className={cn("text-sm leading-relaxed", isReached || isNext ? "text-zinc-300" : "text-zinc-500")}>
                          {goal.description}
                        </p>
                        
                        {/* Progress bar for the current goal */}
                        {isNext && (
                          <div className="mt-4">
                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-violet-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (campaign.currentAmount / goal.amount) * 100)}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                            <p className="text-right text-xs text-zinc-500 mt-1">
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
          <div className={cn("mt-12 rounded-3xl p-8", styles.panel)}>
            <h3 className={cn("text-2xl font-display font-bold mb-6", styles.sectionTitle)}>Preguntas Frecuentes</h3>
            <div className="space-y-4">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5">
                <h4 className="font-bold text-violet-400 mb-2">¿Qué pasa si no se llega a la meta?</h4>
                <p className="text-zinc-400 text-sm">Todo lo recaudado se utilizará de todas formas para el proyecto, aunque tomará más tiempo completarlo. Tu aporte siempre ayuda.</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5">
                <h4 className="font-bold text-violet-400 mb-2">¿Puedo aportar de forma anónima?</h4>
                <p className="text-zinc-400 text-sm">Sí, al momento de hacer el pago podés elegir la opción de que tu nombre no aparezca públicamente en el muro.</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5">
                <h4 className="font-bold text-violet-400 mb-2">¿Cuáles son los métodos de pago?</h4>
                <p className="text-zinc-400 text-sm">Aceptamos todas las tarjetas de crédito y débito a través de Mercado Pago, además de dinero en cuenta.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className={cn("rounded-3xl p-6 sticky top-24", styles.panel)}>
            <div className="mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-white">${animatedAmount.toLocaleString()}</span>
                <span className="text-zinc-400 mb-1">recaudados de ${campaign.targetAmount.toLocaleString()}</span>
              </div>
              
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${animatedProgress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm font-medium">
                <span className="text-violet-400">{Math.round(animatedProgress)}% completado</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/50 rounded-2xl p-4 text-center">
                <Users className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                <div className="font-bold text-white">124</div>
                <div className="text-xs text-zinc-500">Aportantes</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 text-center">
                <Clock className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                <div className="font-bold text-white">12</div>
                <div className="text-xs text-zinc-500">Días restantes</div>
              </div>
            </div>

            <Link 
              to={`/checkout/${campaign.id}`}
              className={cn("w-full py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] mb-4 flex items-center justify-center", styles.primaryButton)}
            >
              Aportar a esta misión
            </Link>
            
            <button 
              onClick={() => shareCampaign(campaign as any)}
              className={cn("w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 group", styles.secondaryButton)}
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
