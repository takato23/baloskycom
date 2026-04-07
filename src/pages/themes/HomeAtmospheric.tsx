import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function HomeAtmospheric() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-5 h-5 text-purple-300" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-blue-300" />;
      case 'Video': return <Video className="w-5 h-5 text-pink-300" />;
      case 'Award': return <Award className="w-5 h-5 text-amber-300" />;
      default: return <Star className="w-5 h-5 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-16 pb-16 min-h-screen font-sans text-white relative overflow-hidden">
      {/* Atmospheric Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#05050a]">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/40 blur-[100px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -50, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-900/30 blur-[120px]"
        />
      </div>

      {/* Hero Section */}
      <section className="text-center space-y-8 pt-16 relative z-10 px-4">
        <motion.div 
          className="relative inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden mx-auto shadow-[0_0_40px_rgba(139,92,246,0.5)] border border-white/20 p-1 backdrop-blur-sm">
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop" 
              alt="Santiago Balosky" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-6xl md:text-7xl font-serif italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white"
          >
            Santiago Balosky
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-white/60 max-w-md mx-auto text-lg font-light leading-relaxed"
          >
            Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8"
        >
          <Link 
            to="/checkout" 
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-light text-lg transition-all backdrop-blur-md border border-white/20 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Coffee className="w-5 h-5" />
            Invitame un cafecito
          </Link>
        </motion.div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-12 px-4 pt-12 relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-serif italic text-white/90">Misiones Activas</h2>
          <div className="w-12 h-px bg-white/20 mx-auto" />
        </div>
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="h-56 bg-white/10" />
                <div className="p-8 flex-1 flex flex-col -mt-12 relative z-10">
                  <div className="h-8 bg-white/20 rounded-full w-3/4 mb-4" />
                  <div className="h-4 bg-white/10 rounded-full w-full mb-2" />
                  <div className="h-4 bg-white/10 rounded-full w-5/6 mb-6" />
                  <div className="mt-auto h-12 bg-white/20 rounded-2xl w-full" />
                </div>
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <motion.div 
                key={campaign.id}
                whileHover={{ y: -5 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col group shadow-2xl relative"
              >
                <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
                  <button 
                    onClick={() => shareCampaign(campaign)}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-56 overflow-hidden relative">
                  <img 
                    src={campaign.image} 
                    alt={campaign.title} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0502] via-[#0a0502]/50 to-transparent" />
                </div>
                
                <div className="p-8 flex-1 flex flex-col -mt-12 relative z-10">
                  <h3 className="text-2xl font-serif italic mb-3 text-white/90">{campaign.title}</h3>
                  <p className="text-white/50 text-sm mb-8 flex-1 font-light leading-relaxed">{campaign.description}</p>
                  
                  <div className="space-y-5 mt-auto">
                    {campaign.goal > 0 ? (
                      <>
                        <div className="flex justify-between text-xs font-light tracking-widest uppercase text-white/60">
                          <span>${campaign.raised.toLocaleString('es-AR')}</span>
                          <span>${campaign.goal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-light tracking-widest uppercase text-white/60">
                        <span>${campaign.raised.toLocaleString('es-AR')} RECAUDADOS</span>
                        <span>META ABIERTA</span>
                      </div>
                    )}
                    
                    <Link 
                      to={`/checkout/${campaign.id}`}
                      className="mt-6 w-full py-4 bg-white/5 hover:bg-white/10 text-white/90 rounded-2xl font-light transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      Aportar <ArrowRight className="w-4 h-4 opacity-50" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Rewards Section */}
      <section className="space-y-12 px-4 pt-12 relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-serif italic text-white/90">Recompensas</h2>
          <div className="w-12 h-px bg-white/20 mx-auto" />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-start gap-6 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-white/10 shrink-0" />
                <div className="w-full">
                  <div className="h-6 bg-white/20 rounded-full w-3/4 mb-2" />
                  <div className="h-4 bg-white/10 rounded-full w-full mb-1" />
                  <div className="h-4 bg-white/10 rounded-full w-5/6 mb-4" />
                  <div className="h-6 bg-white/20 rounded-full w-1/2" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-6 hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="font-serif italic text-xl text-white/90">{reward.title}</h4>
                <p className="text-sm text-white/50 mt-2 font-light">{reward.description}</p>
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-light tracking-wider">
                  Desde ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-12 px-4 pt-12 pb-20 relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-serif italic text-white/90">El Muro</h2>
          <div className="w-12 h-px bg-white/20 mx-auto" />
        </div>
        
        <div className="space-y-6 max-w-2xl mx-auto">
          {supporters.slice(0, 5).map((supporter, idx) => (
            <motion.div 
              key={supporter.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500/50 to-transparent" />
              <div className="flex justify-between items-start mb-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-serif italic text-lg border border-white/20">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-serif italic text-lg text-white/90">{supporter.name}</h5>
                    <p className="text-xs text-white/40 font-light">{supporter.date}</p>
                  </div>
                </div>
                <div className="text-sm font-light tracking-wider text-purple-300">
                  ${supporter.amount.toLocaleString('es-AR')}
                </div>
              </div>
              {supporter.message && (
                <p className="text-white/60 text-sm mt-4 pl-4 font-light italic leading-relaxed">"{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-4 ml-4 pl-4 border-l-2 border-purple-500/30 bg-white/5 rounded-r-xl p-3 relative">
                  <div className="text-xs font-serif italic text-purple-300/80 mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Respuesta del creador
                  </div>
                  <p className="text-white/80 text-sm font-light leading-relaxed">"{supporter.creatorResponse}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
