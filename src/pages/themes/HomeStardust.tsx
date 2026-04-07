import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';

const StardustScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle parallax effect based on pointer
      const targetX = (state.pointer.x * Math.PI) / 20;
      const targetY = (state.pointer.y * Math.PI) / 20;
      
      // Combine pointer movement with slow continuous rotation
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX + Math.sin(t / 10) * 0.2, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY + Math.cos(t / 10) * 0.1, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={200} scale={12} size={4} speed={0.4} opacity={0.5} color="#fbbf24" />
      <Sparkles count={100} scale={8} size={6} speed={0.6} opacity={0.8} color="#e2e8f0" />
      <Sparkles count={50} scale={5} size={10} speed={0.8} opacity={1} color="#38bdf8" />
    </group>
  );
};

export default function HomeStardust() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-5 h-5 text-amber-300" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-sky-300" />;
      case 'Video': return <Video className="w-5 h-5 text-indigo-300" />;
      case 'Award': return <Award className="w-5 h-5 text-yellow-300" />;
      default: return <Star className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-16 pb-16 min-h-screen font-serif text-slate-100 relative">
      {/* 3D Background */}
      <div className="fixed inset-0 z-[-1] bg-[#020617]">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} className="pointer-events-none">
          <StardustScene />
        </Canvas>
      </div>

      {/* Hero Section */}
      <section className="text-center space-y-8 pt-16 relative z-20 px-4">
        <motion.div 
          className="relative inline-block"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden mx-auto border border-amber-500/30 p-1 bg-[#020617]/40 backdrop-blur-md shadow-[0_0_40px_rgba(251,191,36,0.15)]">
            <img 
              src="/images/santi-avatar.jpeg" 
              alt="Santiago Balosky" 
              className="w-full h-full object-cover rounded-full opacity-90"
            />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 0.2 }}
            className="text-5xl md:text-7xl font-serif italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500/70"
          >
            Santiago Balosky
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.4 }}
            className="text-slate-300 max-w-md mx-auto text-lg font-light leading-relaxed backdrop-blur-sm bg-[#020617]/30 p-4 rounded-2xl border border-slate-800/50"
          >
            Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8"
        >
          <Link 
            to="/checkout" 
            className="w-full sm:w-auto px-8 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 rounded-full font-medium text-lg transition-all backdrop-blur-md border border-amber-500/30 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]"
          >
            <Coffee className="w-5 h-5" />
            Invitame un cafecito
          </Link>
        </motion.div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-8 px-4 pt-12 relative z-20">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-4xl font-serif italic text-amber-100">Misiones Estelares</h2>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto" />
        </div>
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-[#020617]/60 backdrop-blur-xl border border-slate-800/80 rounded-[2rem] overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="h-56 bg-slate-800/50" />
                <div className="p-8 flex-1 flex flex-col -mt-16 relative z-10">
                  <div className="h-8 bg-slate-700/50 rounded-lg w-3/4 mb-4" />
                  <div className="h-4 bg-slate-800/50 rounded-lg w-full mb-2" />
                  <div className="h-4 bg-slate-800/50 rounded-lg w-5/6 mb-6" />
                  <div className="mt-auto h-12 bg-slate-800/30 rounded-2xl w-full" />
                </div>
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <motion.div 
                key={campaign.id}
                whileHover={{ y: -5 }}
                className="bg-[#020617]/60 backdrop-blur-xl border border-slate-800/80 rounded-[2rem] overflow-hidden flex flex-col group shadow-2xl relative"
              >
                <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
                  <button 
                    onClick={() => shareCampaign(campaign)}
                    className="w-10 h-10 rounded-full bg-[#020617]/60 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-amber-300 hover:border-amber-500/50 hover:bg-[#020617]/80 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-56 overflow-hidden relative">
                  <Link to={`/campaigns/${campaign.id}`}>
                    <img 
                      src={campaign.image} 
                      alt={campaign.title} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-all duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
                  </Link>
                </div>
                
                <div className="p-8 flex-1 flex flex-col -mt-16 relative z-10">
                  <Link to={`/campaigns/${campaign.id}`}>
                    <h3 className="text-2xl font-serif italic mb-3 text-amber-50 hover:text-amber-200 transition-colors">{campaign.title}</h3>
                  </Link>
                  <p className="text-slate-400 text-sm mb-8 flex-1 font-light leading-relaxed">{campaign.description}</p>
                  
                  <div className="space-y-5 mt-auto">
                    {campaign.goal > 0 ? (
                      <>
                        <div className="flex justify-between text-xs font-light tracking-widest uppercase text-slate-300">
                          <span className="text-amber-300">${campaign.raised.toLocaleString('es-AR')}</span>
                          <span>${campaign.goal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-light tracking-widest uppercase text-slate-300">
                        <span className="text-amber-300">${campaign.raised.toLocaleString('es-AR')} RECAUDADOS</span>
                        <span>META ABIERTA</span>
                      </div>
                    )}
                    
                    <Link 
                      to={`/checkout/${campaign.id}`}
                      className="mt-6 w-full py-4 bg-slate-800/30 hover:bg-slate-800/60 text-amber-50 rounded-2xl font-light transition-all flex items-center justify-center gap-2 border border-slate-700/50"
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
      <section className="space-y-8 px-4 pt-12 relative z-20">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-4xl font-serif italic text-amber-100">Recompensas</h2>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto" />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-[#020617]/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 flex items-start gap-6 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-slate-800/50 shrink-0" />
                <div className="w-full">
                  <div className="h-6 bg-slate-700/50 rounded-lg w-3/4 mb-2" />
                  <div className="h-4 bg-slate-800/50 rounded-lg w-full mb-1" />
                  <div className="h-4 bg-slate-800/50 rounded-lg w-5/6 mb-4" />
                  <div className="h-6 bg-amber-500/10 rounded-full w-1/2" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="bg-[#020617]/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-6 hover:bg-[#020617]/80 transition-colors">
              <div className="w-14 h-14 rounded-full bg-slate-800/30 border border-slate-700/50 flex items-center justify-center shrink-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="font-serif italic text-xl text-amber-50">{reward.title}</h4>
                <p className="text-sm text-slate-400 mt-2 font-light">{reward.description}</p>
                <div className="mt-4 inline-flex items-center px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-200/80 text-xs font-light tracking-wider">
                  Desde ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-8 px-4 pt-12 pb-20 relative z-20">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-4xl font-serif italic text-amber-100">El Muro</h2>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto" />
        </div>
        
        <div className="space-y-6 max-w-2xl mx-auto">
          {supporters.slice(0, 5).map((supporter, idx) => (
            <motion.div 
              key={supporter.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#020617]/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500/50 to-transparent" />
              <div className="flex justify-between items-start mb-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-amber-100 font-serif italic text-xl border border-slate-700/50 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-serif italic text-lg text-amber-50">{supporter.name}</h5>
                    <p className="text-xs text-slate-500 font-light">{supporter.date}</p>
                  </div>
                </div>
                <div className="text-sm font-light tracking-wider text-amber-300/80">
                  ${supporter.amount.toLocaleString('es-AR')}
                </div>
              </div>
              {supporter.message && (
                <p className="text-slate-300 text-sm mt-4 pl-4 font-light italic leading-relaxed">"{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-4 ml-4 pl-4 border-l-2 border-amber-500/30 bg-slate-800/20 rounded-r-2xl p-4 relative">
                  <div className="text-xs font-serif italic text-amber-300/80 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]"></span>
                    Santi Responde
                  </div>
                  <p className="text-slate-200 text-sm font-light leading-relaxed">"{supporter.creatorResponse}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
