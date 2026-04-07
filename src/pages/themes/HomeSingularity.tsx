import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BlackHole = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(15000 * 3);
    for (let i = 0; i < 15000; i++) {
      // Accretion disk: radius from 2 to 12
      const r = 2 + Math.pow(Math.random(), 2) * 10;
      const theta = Math.random() * 2 * Math.PI;
      // Thickness varies by radius (thicker in middle)
      const y = (Math.random() - 0.5) * (0.5 + Math.random() * 0.5) * (12 / r);
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);
    }
    return pos;
  });

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= delta * 0.15;
      pointsRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group rotation={[Math.PI / 5, 0, 0]}>
      {/* The Void */}
      <mesh>
        <sphereGeometry args={[1.9, 32, 32]} />
        <meshBasicMaterial color="black" />
      </mesh>
      {/* Event Horizon Glow */}
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      {/* Accretion Disk */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.02} 
          color="#c4b5fd" 
          transparent 
          opacity={0.6} 
          sizeAttenuation 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </points>
    </group>
  );
};

export default function HomeSingularity() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-5 h-5 text-violet-300" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-fuchsia-300" />;
      case 'Video': return <Video className="w-5 h-5 text-pink-300" />;
      case 'Award': return <Award className="w-5 h-5 text-purple-300" />;
      default: return <Star className="w-5 h-5 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-16 pb-16 min-h-screen font-display text-white relative">
      {/* 3D Background */}
      <div className="fixed inset-0 z-[-1] bg-black">
        <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
          <fog attach="fog" args={['black', 5, 15]} />
          <BlackHole />
        </Canvas>
      </div>

      {/* Hero Section */}
      <section className="text-center space-y-8 pt-16 relative z-10 px-4">
        <motion.div 
          className="relative inline-block"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden mx-auto border border-white/10 p-1 backdrop-blur-md bg-black/40 shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop" 
              alt="Santiago Balosky" 
              className="w-full h-full object-cover rounded-full opacity-90"
            />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
          >
            SANTIAGO BALOSKY
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-white/60 max-w-md mx-auto text-lg font-light leading-relaxed backdrop-blur-sm bg-black/20 p-4 rounded-2xl border border-white/5"
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
            className="w-full sm:w-auto px-8 py-4 bg-violet-600/20 hover:bg-violet-600/40 text-violet-100 rounded-full font-medium text-lg transition-all backdrop-blur-md border border-violet-500/30 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]"
          >
            <Coffee className="w-5 h-5" />
            Invitame un cafecito
          </Link>
        </motion.div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-8 px-4 pt-12 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-6 h-6 text-violet-400" />
          <h2 className="text-3xl font-bold tracking-tight text-white/90">Misiones</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="h-48 bg-white/5" />
                <div className="p-6 flex-1 flex flex-col -mt-8 relative z-10">
                  <div className="h-6 bg-white/10 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-white/5 rounded w-full mb-2" />
                  <div className="h-4 bg-white/5 rounded w-5/6 mb-6" />
                  <div className="mt-auto h-12 bg-white/10 rounded-xl w-full" />
                </div>
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <motion.div 
                key={campaign.id}
                whileHover={{ scale: 1.02 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col group shadow-2xl relative"
              >
                <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
                  <button 
                    onClick={() => shareCampaign(campaign)}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={campaign.image} 
                    alt={campaign.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
                
                <div className="p-6 flex-1 flex flex-col -mt-8 relative z-10">
                  <h3 className="text-xl font-bold mb-2 text-white/90">{campaign.title}</h3>
                  <p className="text-white/50 text-sm mb-6 flex-1 font-light">{campaign.description}</p>
                  
                  <div className="space-y-4 mt-auto">
                    {campaign.goal > 0 ? (
                      <>
                        <div className="flex justify-between text-xs font-medium tracking-wider text-white/60">
                          <span className="text-violet-300">${campaign.raised.toLocaleString('es-AR')}</span>
                          <span>${campaign.goal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-medium tracking-wider text-white/60">
                        <span className="text-violet-300">${campaign.raised.toLocaleString('es-AR')} RECAUDADOS</span>
                        <span>META ABIERTA</span>
                      </div>
                    )}
                    
                    <Link 
                      to={`/checkout/${campaign.id}`}
                      className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white/90 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10"
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
      <section className="space-y-8 px-4 pt-12 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-6 h-6 text-fuchsia-400" />
          <h2 className="text-3xl font-bold tracking-tight text-white/90">Recompensas</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-start gap-5 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
                <div className="w-full">
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-full mb-1" />
                  <div className="h-3 bg-white/5 rounded w-5/6 mb-3" />
                  <div className="h-6 bg-violet-500/20 rounded-md w-1/2" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-5 hover:bg-white/5 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-white/90">{reward.title}</h4>
                <p className="text-sm text-white/50 mt-1 font-light">{reward.description}</p>
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
                  Desde ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-8 px-4 pt-12 pb-20 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">💬</span>
          <h2 className="text-3xl font-bold tracking-tight text-white/90">El Muro</h2>
        </div>
        
        <div className="space-y-4">
          {supporters.slice(0, 5).map((supporter, idx) => (
            <motion.div 
              key={supporter.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-white/90">{supporter.name}</h5>
                    <p className="text-xs text-white/40 font-light">{supporter.date}</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-violet-300 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                  ${supporter.amount.toLocaleString('es-AR')}
                </div>
              </div>
              {supporter.message && (
                <p className="text-white/60 text-sm mt-2 pl-13 font-light">"{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-3 ml-13 pl-3 border-l border-violet-500/50 bg-white/5 rounded-r-md p-2">
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">
                    Santi Responde
                  </div>
                  <p className="text-white/70 text-sm font-light">"{supporter.creatorResponse}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
