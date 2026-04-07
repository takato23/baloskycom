import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { User, Award, Star, Image as ImageIcon, Video, History, Gift, Filter, Bell, CheckCircle2, Share2, Download, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useSound } from '@/hooks/useSound';
import { getUserTier } from '@/utils/tiers';
import { getThemedPageStyles } from '@/themes/pageStyles';

export default function Profile() {
  const { userProfile, rewards, supporters, campaigns, currency, theme, newlyUnlockedRewards, clearNewlyUnlockedRewards, settings } = useAppContext();
  const { playSound } = useSound();
  const styles = getThemedPageStyles(theme);


  const userContributions = supporters.filter(s => s.name === userProfile.name);

  // State for new features
  const [showToast, setShowToast] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const generateShareCard = async () => {
    if (!cardRef.current) return;
    setIsGeneratingCard(true);
    playSound('pop');
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#09090b', // zinc-950
        scale: 2,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `santi-balosky-supporter-${userProfile.name}.png`;
      link.click();
      playSound('success');
    } catch (err) {
      console.error('Error generating card', err);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Toast Logic
  useEffect(() => {
    if (newlyUnlockedRewards.length > 0) {
      setShowToast(true);
      playSound('success');
      const timer = setTimeout(() => {
        setShowToast(false);
        clearNewlyUnlockedRewards();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlockedRewards.length, clearNewlyUnlockedRewards, playSound]);

  // Animated Total Logic
  const prevTotalRef = useRef(0);

  useEffect(() => {
    const startValue = prevTotalRef.current;
    const endValue = userProfile.totalContributed;
    
    if (startValue === endValue) {
      setAnimatedTotal(endValue);
      return;
    }

    const controls = animate(startValue, endValue, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (value) => {
        setAnimatedTotal(Math.round(value));
      },
      onComplete: () => {
        prevTotalRef.current = endValue;
      }
    });
    
    return () => controls.stop();
  }, [userProfile.totalContributed]);

  // Heatmap Logic
  const heatmapData = useMemo(() => {
    const data = new Map<number, number>();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    userContributions.forEach(c => {
      if (c.timestamp) {
        const date = new Date(c.timestamp);
        date.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 365) {
          const dayIndex = 364 - diffDays;
          data.set(dayIndex, (data.get(dayIndex) || 0) + c.amount);
        }
      }
    });
    return data;
  }, [userContributions]);

  // Filtering Logic
  const filteredContributions = useMemo(() => {
    return userContributions.filter(c => {
      if (campaignFilter !== 'all' && c.campaignId !== campaignFilter) return false;
      
      if (dateFilter !== 'all') {
        const date = c.timestamp ? new Date(c.timestamp) : new Date(c.date);
        if (isNaN(date.getTime())) return true; // Fallback for invalid dates like "Justo ahora"

        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'last7' && diffDays > 7) return false;
        if (dateFilter === 'last30' && diffDays > 30) return false;
        if (dateFilter === 'thisYear' && date.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [userContributions, campaignFilter, dateFilter]);

  const uniqueCampaignIds = useMemo(() => {
    const ids = new Set(userContributions.map(c => c.campaignId).filter(Boolean));
    return Array.from(ids) as string[];
  }, [userContributions]);

  const getCampaignName = (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    return campaign ? campaign.title : 'Campaña Desconocida';
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-6 h-6" />;
      case 'Image': return <ImageIcon className="w-6 h-6" />;
      case 'Video': return <Video className="w-6 h-6" />;
      case 'Award': return <Award className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  const badgeColors = [
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ];

  const nextReward = rewards.find(r => r.minAmount > userProfile.totalContributed);
  const progressMax = nextReward ? nextReward.minAmount : Math.max(userProfile.totalContributed, 1);
  const targetProgressPercent = Math.min(100, (userProfile.totalContributed / progressMax) * 100);
  const animatedProgressPercent = Math.min(100, (animatedTotal / progressMax) * 100);

  return (
    <div className={cn("theme-page theme-adapt space-y-12 pb-16 relative", "font-sans text-black", styles.shell)}>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 px-6 py-4 flex items-center gap-3",
              styles.accentPanel
            )}
          >
            <div className={cn("p-2 border-2 border-black", styles.panel)}>
              <Gift className={cn("w-5 h-5", "text-black")} />
            </div>
            <div>
              <p className={cn("font-bold", "uppercase font-brutal")}>¡Nueva recompensa desbloqueada!</p>
              <p className={cn("text-sm", "font-bold")}>Revisa tu sección de recompensas.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creator Profile Section */}
      {settings && (
        <section className={cn(
          "flex flex-col md:flex-row items-center gap-6 p-6 sm:p-8 relative overflow-hidden",
          styles.panel
        )}>
          <div className={cn(
            "w-24 h-24 sm:w-32 sm:h-32 shrink-0 overflow-hidden",
            "border-4 border-black brutal-shadow-sm"
          )}>
            <img 
              src={settings.creatorAvatar || "https://picsum.photos/seed/creator/200/200"} 
              alt={settings.creatorName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="text-center md:text-left space-y-3 flex-1">
            <h2 className={cn("text-2xl sm:text-3xl font-bold", "font-brutal uppercase text-black")}>
              {settings.creatorName}
            </h2>
            <p className={cn("text-sm max-w-2xl", "text-black font-medium")}>
              {settings.creatorBio}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {Object.entries(settings.socialLinks || {}).map(([platform, url]) => (
                <a 
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-transform hover:-translate-y-1",
                    styles.secondaryButton
                  )}
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Header */}
      <section ref={cardRef} className={cn(
        "flex flex-col md:flex-row items-center md:items-start gap-6 p-6 sm:p-8 relative overflow-hidden",
        styles.panel
      )}>
        {/* Background glow */}
                        
        <div className={cn(
          "w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center font-bold text-4xl shrink-0 relative z-10",
          "bg-[#FF00FF] border-4 border-black text-white brutal-shadow-sm"
        )}>
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="text-center md:text-left space-y-3 flex-1 relative z-10">
          <h1 className={cn("text-3xl sm:text-4xl font-bold", "font-brutal uppercase text-black")}>{userProfile.name}</h1>
          
          <div className={cn(
            "inline-flex items-center gap-3 px-6 py-2 font-bold text-lg",
            "border-4 border-black text-black brutal-shadow-sm",
            getUserTier(userProfile.totalContributed)?.color || "bg-zinc-200"
          )}>
            <div className="bg-white p-1 border-2 border-black rounded-full">
              <Star className={cn("w-6 h-6", "text-black fill-black")} />
            </div>
            <span className="uppercase tracking-wider">
              {getUserTier(userProfile.totalContributed)?.name || "Fan"}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
            {userProfile.badges.map((badge, idx) => (
              <span key={idx} className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border",
                "bg-yellow-300 border-2 border-black text-black"
              )}>
                <Award className="w-3.5 h-3.5" /> {badge}
              </span>
            ))}
            {userProfile.badges.length === 0 && (
              <span className={cn("text-xs italic", "text-black/60 font-bold")}>Aportá para ganar insignias</span>
            )}
          </div>
          
          {userProfile.totalContributed > 0 && (
            <div className={cn(
              "mt-4 p-4 relative",
              styles.softPanel
            )}>
              <div className={cn(
                "absolute -top-3 left-4 px-2 text-xs font-bold uppercase tracking-wider",
                "bg-black text-[#00FF00]"
              )}>
                Mensaje del creador
              </div>
              <p className={cn("text-sm italic", "text-black font-medium")}>
                "¡Hola {userProfile.name}! Quería agradecerte personalmente por todo tu apoyo. Gracias a personas como vos puedo seguir creando el contenido que tanto nos gusta. ¡Sos increíble!"
              </p>
            </div>
          )}
        </div>
        
        <div className={cn(
          "p-5 w-full md:w-72 mt-4 md:mt-0 relative z-10 flex flex-col",
          styles.panel
        )}>
          <p className={cn("text-xs uppercase font-bold tracking-wider mb-1", "text-black")}>Total Aportado</p>
          <p className={cn(
            "text-3xl font-bold",
            "text-black font-brutal"
          )}>
            ${animatedTotal.toLocaleString('es-AR')}
          </p>
          
          <div className="mt-4 mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className={"text-black font-bold"}>Progreso de recompensas</span>
              <span className={cn("font-bold", "text-black")}>{Math.round(animatedProgressPercent)}%</span>
            </div>
            <div className={cn("h-2 overflow-hidden", "bg-white border-2 border-black")}>
              <div 
                className={cn("h-full transition-none", "bg-[#00FF00] border-r-2 border-black")}
                style={{ width: `${animatedProgressPercent}%` }}
              />
            </div>
            {nextReward && (
              <p className={cn("text-xs mt-2 text-right", "text-black font-bold")}>
                Faltan <span className={cn("font-medium", "text-black")}>${(nextReward.minAmount - animatedTotal).toLocaleString('es-AR')}</span> para: {nextReward.title}
              </p>
            )}
          </div>

          <button 
            onClick={generateShareCard}
            disabled={isGeneratingCard}
            className={cn(
              "mt-auto w-full py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors",
              styles.primaryButton
            )}
          >
            {isGeneratingCard ? (
              <span className="animate-pulse">Generando...</span>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Compartir mi perfil
              </>
            )}
          </button>
        </div>
      </section>

      {/* Fan Tier Benefits */}
      {getUserTier(userProfile.totalContributed) && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Star className={cn("w-6 h-6", "text-black")} />
            <h2 className={cn("text-2xl font-bold", "font-brutal uppercase")}>Beneficios de tu Nivel</h2>
          </div>
          <div className={cn(
            "p-6 relative",
            styles.panel
          )}>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className={cn(
                "w-24 h-24 flex items-center justify-center font-bold text-4xl shrink-0",
                "border-4 border-black text-black brutal-shadow-sm",
                getUserTier(userProfile.totalContributed)?.color
              )}>
                <Star className="w-10 h-10 fill-black" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold uppercase font-brutal">
                  Nivel: {getUserTier(userProfile.totalContributed)?.name}
                </h3>
                <ul className="space-y-2">
                  {getUserTier(userProfile.totalContributed)?.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 font-medium">
                      <div className="w-2 h-2 bg-black rounded-full" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Heatmap Activity */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <History className={cn("w-6 h-6", "text-black")} />
          <h2 className={cn("text-2xl font-bold", "font-brutal uppercase")}>Actividad</h2>
        </div>
        <div className={cn(
          "p-6 overflow-x-auto",
          styles.panel
        )}>
          <div className="min-w-[700px]">
            <div className={cn("flex gap-1 mb-2 text-xs", "text-black font-bold")}>
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map(m => (
                <div key={m} className="flex-1">{m}</div>
              ))}
            </div>
            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {Array.from({ length: 365 }).map((_, i) => {
                const amount = heatmapData.get(i) || 0;
                const hasActivity = amount > 0;
                const isHighActivity = amount >= 5000;
                
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3 h-3 rounded-sm",
                      isHighActivity ? ("bg-[#00FF00] border border-black") :
                      hasActivity ? ("bg-yellow-300 border border-black") :
                      ("bg-zinc-200 border border-black/10")
                    )}
                    title={hasActivity ? `Aportaste $${amount.toLocaleString('es-AR')}` : "Sin actividad"}
                  />
                );
              })}
            </div>
            <div className={cn("flex items-center justify-end gap-2 mt-4 text-xs", "text-black font-bold")}>
              <span>Menos</span>
              <div className={cn("w-3 h-3 rounded-sm", "bg-zinc-200 border border-black/10")} />
              <div className={cn("w-3 h-3 rounded-sm", "bg-yellow-300 border border-black")} />
              <div className={cn("w-3 h-3 rounded-sm", "bg-[#00FF00] border border-black")} />
              <span>Más</span>
            </div>
          </div>
        </div>
      </section>

      {/* Milestones Timeline */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Award className={cn("w-6 h-6", "text-black")} />
          <h2 className={cn("text-2xl font-bold", "font-brutal uppercase")}>Tu Camino</h2>
        </div>
        <div className={cn(
          "p-6 relative",
          styles.panel
        )}>
          <div className={cn("absolute left-10 top-10 bottom-10 w-0.5", styles.timelineLine)} />
          <div className="space-y-8 relative">
            {[
              { level: 'Supporter', amount: 1000 },
              { level: 'Super Fan', amount: 5000 },
              { level: 'Mecenas', amount: 10000 },
              { level: 'Leyenda', amount: 25000 },
            ].map((milestone, idx) => {
              const isReached = userProfile.totalContributed >= milestone.amount;
              return (
                <div key={idx} className="flex items-center gap-6">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors",
                    isReached ? "bg-[#00FF00] border-4 border-black" : "bg-white border-4 border-black"
                  )}>
                    {isReached && <CheckCircle2 className={cn("w-4 h-4", "text-black")} />}
                  </div>
                  <div className={cn(
                    "flex-1 p-4 transition-all",
                    isReached ? "bg-yellow-300 border-4 border-black brutal-shadow-sm" : "bg-zinc-100 border-4 border-black/20"
                  )}>
                    <h4 className={cn("font-bold", "text-black uppercase")}>Nivel {milestone.level}</h4>
                    <p className={cn("text-sm", "text-black/70 font-bold")}>Alcanzado con ${milestone.amount.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Unlocked Rewards Carousel */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className={cn("w-6 h-6", "text-black")} />
            <h2 className={cn("text-2xl font-bold", "font-brutal uppercase")}>Tus Recompensas</h2>
          </div>
          <div className="flex gap-2 hidden sm:flex">
            <button 
              onClick={() => scrollCarousel('left')}
              className={cn("p-2 transition-colors", styles.secondaryButton)}
            >
              <ChevronLeft className="w-6 h-6 text-black" />
            </button>
            <button 
              onClick={() => scrollCarousel('right')}
              className={cn("p-2 transition-colors", styles.secondaryButton)}
            >
              <ChevronRight className="w-6 h-6 text-black" />
            </button>
          </div>
        </div>
        
        <div 
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
        >
          {rewards.map((reward) => {
            const isUnlocked = userProfile.unlockedRewards.includes(reward.id);
            const isNewlyUnlocked = newlyUnlockedRewards.includes(reward.id);
            
            return (
              <motion.div 
                key={reward.id}
                initial={isNewlyUnlocked ? { scale: 0.8, opacity: 0 } : false}
                animate={isNewlyUnlocked ? { scale: 1, opacity: 1 } : false}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                whileHover={isUnlocked ? { y: -6, scale: 1.02, rotate: 1 } : {}}
                className={cn(
                  "snap-start shrink-0 w-[280px] sm:w-[320px] flex flex-col transition-all duration-300 relative",
                  isUnlocked ? `${styles.panel} p-6` : `${styles.softPanel} p-6 opacity-60 grayscale`
                )}
              >
                {isNewlyUnlocked && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 10 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className={cn(
                      "absolute -top-3 -right-3 z-20 px-3 py-1 font-bold text-sm transform rotate-12",
                      "bg-[#FF00FF] text-white border-2 border-black brutal-shadow-sm font-brutal uppercase"
                    )}
                  >
                    ¡NUEVO!
                  </motion.div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-14 h-14 flex items-center justify-center",
                    isUnlocked ? "bg-[#FF00FF] border-4 border-black text-white brutal-shadow-sm" : "bg-zinc-300 border-4 border-zinc-400 text-zinc-500"
                  )}>
                    {getIcon(reward.icon)}
                  </div>
                  {isUnlocked && (
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      "bg-[#00FF00] border-2 border-black text-black brutal-shadow-sm"
                    )}>
                      Desbloqueado
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <h4 className={cn("text-lg font-bold mb-2", "text-black uppercase font-brutal")}>
                    {reward.title}
                  </h4>
                  <p className={cn("text-sm mb-6 flex-1 leading-relaxed", "text-black/80 font-medium")}>{reward.description}</p>
                  
                  {isUnlocked ? (
                    <button className={cn(
                      "w-full py-2.5 text-sm font-bold transition-colors",
                      styles.primaryButton,
                      "uppercase"
                    )}>
                      Descargar / Ver
                    </button>
                  ) : (
                    <div className={cn(
                      "w-full py-2.5 text-sm font-medium text-center",
                      "bg-zinc-300 text-black border-4 border-zinc-400 uppercase font-bold"
                    )}>
                      Se desbloquea con ${reward.minAmount.toLocaleString('es-AR')}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* History with Filters */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className={cn("w-6 h-6", "text-black")} />
            <h2 className={cn("text-2xl font-bold", "font-brutal uppercase")}>Historial de Aportes</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", "text-black")} />
              <select 
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className={cn(
                  "pl-9 pr-8 py-2 text-sm appearance-none focus:outline-none transition-colors",
                  styles.input,
                  "uppercase"
                )}
              >
                <option value="all">Todas las campañas</option>
                {uniqueCampaignIds.map(id => (
                  <option key={id} value={id}>{getCampaignName(id)}</option>
                ))}
              </select>
            </div>
            
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={cn(
                "px-4 py-2 text-sm appearance-none focus:outline-none transition-colors",
                styles.input,
                "uppercase"
              )}
            >
              <option value="all">Siempre</option>
              <option value="last7">Últimos 7 días</option>
              <option value="last30">Últimos 30 días</option>
              <option value="thisYear">Este año</option>
            </select>
          </div>
        </div>
        
        {filteredContributions.length > 0 ? (
          <div className="space-y-3">
            {filteredContributions.map((contribution) => (
              <div key={contribution.id} className={cn(
                "p-5 flex items-center justify-between transition-colors",
                styles.panel,
                "hover:translate-y-1"
              )}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn("font-bold text-lg", "text-black uppercase")}>
                      Aporte a {contribution.campaignId ? getCampaignName(contribution.campaignId) : 'Cafecito General'}
                    </p>
                    {contribution.message?.includes('[ENCARGO MÁGICO]') && (
                      <span className="px-2 py-0.5 bg-[#FF00FF] text-white border-2 border-black text-[10px] font-bold flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        ENCARGO
                      </span>
                    )}
                  </div>
                  <p className={cn("text-sm mt-1", "text-black/70 font-bold")}>{new Date(contribution.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-xl font-bold", "text-black font-brutal")}>+${contribution.amount.toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "text-center py-20 relative overflow-hidden",
                  styles.emptyState
                )}
          >
            <div className={cn("absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]", "opacity-20")} />
            <History className={cn("w-16 h-16 mx-auto mb-6 relative z-10", "text-black")} />
            <p className={cn("text-xl font-bold mb-2 relative z-10", "text-black uppercase font-brutal")}>No hay aportes para mostrar</p>
            <p className={cn("text-sm max-w-sm mx-auto relative z-10", "text-black/80 font-bold")}>
              {userContributions.length === 0 
                ? "¡Rompé el hielo invitando un cafecito y empezá a desbloquear recompensas exclusivas!"
                : "Probá ajustando los filtros para ver otros aportes de tu historial."}
            </p>
          </motion.div>
        )}
      </section>
    </div>
  );
}
