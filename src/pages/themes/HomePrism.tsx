import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

const PrismScene = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (meshRef.current) {
      // Rotate object based on pointer and time
      const targetX = (state.pointer.x * Math.PI) / 4;
      const targetY = (state.pointer.y * Math.PI) / 4;
      
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX + t * 0.2, 0.05);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetY + t * 0.1, 0.05);
    }

    if (lightRef.current) {
      // Move light based on pointer to create dynamic reflections
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, state.pointer.x * 10, 0.1);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, state.pointer.y * 10, 0.1);
    }
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.2} />
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={5} color="#c084fc" />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#38bdf8" />
      <directionalLight position={[-10, -10, -5]} intensity={2} color="#f472b6" />

      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh ref={meshRef} position={[0, 0, 0]}>
          <torusKnotGeometry args={[1.5, 0.5, 256, 64]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={2}
            chromaticAberration={1}
            anisotropy={0.5}
            distortion={0.5}
            distortionScale={0.5}
            temporalDistortion={0.1}
            iridescence={1}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            color="#ffffff"
            attenuationColor="#ffffff"
            attenuationDistance={0.5}
          />
        </mesh>
      </Float>

      <ContactShadows position={[0, -3, 0]} opacity={0.5} scale={20} blur={2} far={10} />
    </>
  );
};

export default function HomePrism() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-5 h-5 text-purple-400" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-sky-400" />;
      case 'Video': return <Video className="w-5 h-5 text-pink-400" />;
      case 'Award': return <Award className="w-5 h-5 text-indigo-400" />;
      default: return <Star className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-16 pb-16 min-h-screen font-sans text-white relative">
      {/* 3D Background */}
      <div className="fixed inset-0 z-[-1] bg-[#050505]">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }} className="pointer-events-none">
          <PrismScene />
        </Canvas>
      </div>

      {/* Hero Section */}
      <section className="text-center space-y-8 pt-16 relative z-20 px-4">
        <motion.div 
          className="relative inline-block"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden mx-auto border border-white/20 p-1 backdrop-blur-xl bg-white/5 shadow-[0_0_40px_rgba(192,132,252,0.2)]">
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
            className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-purple-300 to-pink-300"
          >
            Santi Balosky
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-white/70 max-w-md mx-auto text-lg font-medium leading-relaxed backdrop-blur-xl bg-black/40 p-4 rounded-2xl border border-white/10"
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
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold text-lg transition-all backdrop-blur-2xl border border-white/20 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(192,132,252,0.15)] hover:shadow-[0_0_30px_rgba(192,132,252,0.3)]"
          >
            <Coffee className="w-5 h-5" />
            Invitame un cafecito
          </Link>
        </motion.div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-8 px-4 pt-12 relative z-20">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-6 h-6 text-sky-400" />
          <h2 className="text-3xl font-bold tracking-tight text-white/90">Misiones</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="h-48 bg-white/5" />
                <div className="p-6 flex-1 flex flex-col -mt-8 relative z-10">
                  <div className="h-6 bg-white/10 rounded-lg w-3/4 mb-4" />
                  <div className="h-4 bg-white/5 rounded-lg w-full mb-2" />
                  <div className="h-4 bg-white/5 rounded-lg w-5/6 mb-6" />
                  <div className="mt-auto h-12 bg-white/10 rounded-xl w-full" />
                </div>
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <motion.div 
                key={campaign.id}
                whileHover={{ y: -5 }}
                className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col group shadow-2xl relative"
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
                  <Link to={`/campaigns/${campaign.id}`}>
                    <img 
                      src={campaign.image} 
                      alt={campaign.title} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </Link>
                </div>
                
                <div className="p-6 flex-1 flex flex-col -mt-8 relative z-10">
                  <Link to={`/campaigns/${campaign.id}`}>
                    <h3 className="text-xl font-bold mb-2 text-white/90 hover:text-white transition-colors">{campaign.title}</h3>
                  </Link>
                  <p className="text-white/60 text-sm mb-6 flex-1 font-medium">{campaign.description}</p>
                  
                  <div className="space-y-4 mt-auto">
                    {campaign.goal > 0 ? (
                      <>
                        <div className="flex justify-between text-xs font-bold tracking-wider text-white/70">
                          <span className="text-sky-300">${campaign.raised.toLocaleString('es-AR')}</span>
                          <span>${campaign.goal.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.5)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-bold tracking-wider text-white/70">
                        <span className="text-sky-300">${campaign.raised.toLocaleString('es-AR')} RECAUDADOS</span>
                        <span>META ABIERTA</span>
                      </div>
                    )}
                    
                    <Link 
                      to={`/checkout/${campaign.id}`}
                      className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      Aportar <ArrowRight className="w-4 h-4 opacity-70" />
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
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-6 h-6 text-pink-400" />
          <h2 className="text-3xl font-bold tracking-tight text-white/90">Recompensas</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 flex items-start gap-5 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
                <div className="w-full">
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-full mb-1" />
                  <div className="h-3 bg-white/5 rounded w-5/6 mb-3" />
                  <div className="h-6 bg-purple-500/20 rounded-md w-1/2" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-5 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-white/90">{reward.title}</h4>
                <p className="text-sm text-white/60 mt-1 font-medium">{reward.description}</p>
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  Desde ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-8 px-4 pt-12 pb-20 relative z-20">
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
              className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(192,132,252,0.3)]">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-white/90">{supporter.name}</h5>
                    <p className="text-xs text-white/50 font-medium">{supporter.date}</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  ${supporter.amount.toLocaleString('es-AR')}
                </div>
              </div>
              {supporter.message && (
                <p className="text-white/70 text-sm mt-2 pl-13 font-medium">"{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-3 ml-13 pl-3 border-l-2 border-purple-400/50 bg-purple-500/10 rounded-r-lg p-3">
                  <div className="text-xs font-bold text-purple-300 mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.8)]"></span>
                    Santi Responde
                  </div>
                  <p className="text-white/80 text-sm font-medium">"{supporter.creatorResponse}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
