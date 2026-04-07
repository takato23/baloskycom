import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

const CyberScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Smoothly interpolate camera/group rotation based on pointer
      // state.pointer is normalized (-1 to 1), works for mouse and touch drag
      const targetX = (state.pointer.x * Math.PI) / 10;
      const targetY = (state.pointer.y * Math.PI) / 15;
      
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05);
      
      // Move the grid forward to simulate endless driving
      groupRef.current.position.z = (state.clock.elapsedTime * 2) % 1;
    }
  });

  return (
    <group ref={groupRef}>
      <Grid 
        position={[0, -1.5, 0]} 
        args={[50, 50]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#ec4899" // Pink
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#06b6d4" // Cyan
        fadeDistance={30} 
        fadeStrength={1} 
      />
    </group>
  );
};

export default function HomeCyberGrid() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-5 h-5 text-pink-400" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-cyan-400" />;
      case 'Video': return <Video className="w-5 h-5 text-purple-400" />;
      case 'Award': return <Award className="w-5 h-5 text-yellow-400" />;
      default: return <Star className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-16 pb-16 min-h-screen font-sans text-white relative">
      {/* 3D Background */}
      <div className="fixed inset-0 z-[-1] bg-[#0f172a]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0f172a] z-10 pointer-events-none" />
        <Canvas camera={{ position: [0, 1, 5], fov: 60 }} className="pointer-events-none">
          <fog attach="fog" args={['#0f172a', 10, 30]} />
          <CyberScene />
        </Canvas>
      </div>

      {/* Activity Ticker */}
      {supporters.length > 0 && (
        <div className="w-full bg-pink-600/20 border-b border-pink-500/30 overflow-hidden py-2 relative z-20 backdrop-blur-sm">
          <motion.div 
            className="flex whitespace-nowrap gap-8 text-sm font-brutal uppercase tracking-wider text-cyan-300"
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          >
            {[...supporters, ...supporters].map((s, i) => (
              <span key={`${s.id}-${i}`}>
                <span className="text-pink-400">{s.name}</span> aportó <span className="text-white">${s.amount}</span> • 
              </span>
            ))}
          </motion.div>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center space-y-8 pt-16 relative z-20 px-4">
        <motion.div 
          className="relative inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden mx-auto border-4 border-pink-500 p-1 bg-[#0f172a] shadow-[0_0_30px_rgba(236,72,153,0.5)]">
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
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-brutal uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
          >
            SANTI BALOSKY
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-cyan-100 max-w-md mx-auto text-lg font-medium leading-relaxed backdrop-blur-md bg-[#0f172a]/60 p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8"
        >
          <Link 
            to="/checkout" 
            className="w-full sm:w-auto px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-lg transition-all border border-pink-400 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] uppercase tracking-wider"
          >
            <Coffee className="w-5 h-5" />
            Invitame un cafecito
          </Link>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-8 relative z-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Aportes Totales', value: supporters.length, prefix: '' },
            { label: 'Recaudado', value: campaigns.reduce((acc, c) => acc + c.raised, 0), prefix: '$' },
            { label: 'Misiones', value: campaigns.length, prefix: '' },
            { label: 'Recompensas', value: rewards.length, prefix: '' },
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[#0f172a]/60 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
              <div className="text-3xl font-brutal text-pink-400 mb-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                {stat.prefix}{stat.value.toLocaleString('es-AR')}
              </div>
              <div className="text-xs text-cyan-100 uppercase tracking-widest font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-8 px-4 pt-12 relative z-20">
        <div className="flex items-center gap-3 mb-8 border-b border-cyan-500/30 pb-4">
          <Zap className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <h2 className="text-3xl font-brutal uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Misiones</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-[#0f172a]/80 backdrop-blur-xl border border-pink-500/30 rounded-2xl overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="h-48 bg-pink-900/20 border-b border-pink-500/30" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="h-6 bg-pink-500/20 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-cyan-500/20 rounded w-full mb-2" />
                  <div className="h-4 bg-cyan-500/20 rounded w-5/6 mb-6" />
                  <div className="mt-auto h-12 bg-cyan-900/40 rounded-xl w-full border border-cyan-500/50" />
                </div>
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <motion.div 
                key={campaign.id}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-[#0f172a]/80 backdrop-blur-xl border border-pink-500/30 rounded-2xl overflow-hidden flex flex-col group shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all relative"
              >
                <div className="absolute top-3 right-3 z-20 flex gap-2 items-center">
                  <button 
                    onClick={() => shareCampaign(campaign)}
                    className="w-10 h-10 rounded-full bg-[#0f172a]/80 backdrop-blur-md border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:text-pink-400 hover:border-pink-500/50 hover:bg-[#0f172a] transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-48 overflow-hidden relative border-b border-pink-500/30">
                  <Link to={`/campaigns/${campaign.id}`}>
                    <img 
                      src={campaign.image} 
                      alt={campaign.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent" />
                  </Link>
                </div>
                
                <div className="p-6 flex-1 flex flex-col relative z-10">
                  <Link to={`/campaigns/${campaign.id}`}>
                    <h3 className="text-xl font-bold mb-2 text-pink-400 uppercase tracking-wide hover:text-pink-300 transition-colors">{campaign.title}</h3>
                  </Link>
                  <p className="text-cyan-100/70 text-sm mb-6 flex-1 font-medium">{campaign.description}</p>
                  
                  <div className="space-y-4 mt-auto">
                    {campaign.goal > 0 ? (
                      <>
                        <div className="flex justify-between text-xs font-bold tracking-wider text-cyan-300">
                          <span>${campaign.raised.toLocaleString('es-AR')}</span>
                          <span>${campaign.goal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden border border-cyan-500/30">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-bold tracking-wider text-cyan-300">
                        <span>${campaign.raised.toLocaleString('es-AR')} RECAUDADOS</span>
                        <span>META ABIERTA</span>
                      </div>
                    )}
                    
                    <Link 
                      to={`/checkout/${campaign.id}`}
                      className="mt-4 w-full py-3 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-cyan-500/50 uppercase tracking-wider text-sm"
                    >
                      Aportar <ArrowRight className="w-4 h-4" />
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
        <div className="flex items-center gap-3 mb-8 border-b border-pink-500/30 pb-4">
          <Heart className="w-8 h-8 text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
          <h2 className="text-3xl font-brutal uppercase tracking-widest text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">Recompensas</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-[#0f172a]/80 backdrop-blur-md border border-purple-500/30 rounded-xl p-5 flex items-start gap-5 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-purple-900/20 border border-purple-500/50 shrink-0" />
                <div className="w-full">
                  <div className="h-5 bg-purple-500/20 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-purple-500/10 rounded w-full mb-1" />
                  <div className="h-3 bg-purple-500/10 rounded w-5/6 mb-3" />
                  <div className="h-5 bg-pink-500/20 rounded w-1/2 border border-pink-500/40" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="bg-[#0f172a]/80 backdrop-blur-md border border-purple-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start gap-5 hover:bg-[#0f172a] transition-colors shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <div className="w-12 h-12 rounded-lg bg-purple-900/40 border border-purple-500/50 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(168,85,247,0.3)]">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-purple-300 uppercase tracking-wide">{reward.title}</h4>
                <p className="text-sm text-purple-200/60 mt-1 font-medium">{reward.description}</p>
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold uppercase tracking-wider">
                  Desde ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Supporters */}
      <section className="space-y-8 px-4 pt-12 relative z-20">
        <div className="flex items-center gap-3 mb-8 border-b border-cyan-500/30 pb-4">
          <Award className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <h2 className="text-3xl font-brutal uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Top Bancadores</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(
            supporters.reduce((acc, curr) => {
              if (curr.name !== 'Anónimo') {
                acc[curr.name] = (acc[curr.name] || 0) + curr.amount;
              }
              return acc;
            }, {} as Record<string, number>)
          )
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, total], idx) => (
              <motion.div 
                key={name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#0f172a]/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-500/20 to-transparent" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-[#0f172a]">
                  {idx === 0 ? '👑' : idx + 1}
                </div>
                <h3 className="text-xl font-bold text-cyan-100 mb-1">{name}</h3>
                <p className="text-pink-400 font-brutal tracking-wider">${total.toLocaleString('es-AR')}</p>
              </motion.div>
            ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-8 px-4 pt-12 pb-20 relative z-20">
        <div className="flex items-center gap-3 mb-8 border-b border-purple-500/30 pb-4">
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">💬</span>
          <h2 className="text-3xl font-brutal uppercase tracking-widest text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">El Muro</h2>
        </div>
        
        <div className="space-y-4">
          {supporters.slice(0, 5).map((supporter, idx) => (
            <motion.div 
              key={supporter.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[#0f172a]/80 backdrop-blur-xl border-l-4 border-l-cyan-400 border-y border-r border-cyan-500/20 rounded-r-xl p-5 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-brutal text-lg shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-cyan-100 uppercase tracking-wide">{supporter.name}</h5>
                    <p className="text-xs text-cyan-500 font-medium">{supporter.date}</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-pink-400 bg-pink-900/30 px-3 py-1 rounded border border-pink-500/30">
                  ${supporter.amount.toLocaleString('es-AR')}
                </div>
              </div>
              {supporter.message && (
                <p className="text-cyan-100/80 text-sm mt-2 pl-13 font-medium italic">"{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-3 ml-13 pl-3 border-l-2 border-pink-500/60 bg-pink-900/10 rounded-r p-2">
                  <div className="text-[10px] font-brutal text-pink-400 uppercase tracking-widest mb-1">
                    Santi Responde
                  </div>
                  <p className="text-pink-100/90 text-sm font-medium">"{supporter.creatorResponse}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
