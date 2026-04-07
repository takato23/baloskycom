import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Terminal, Heart, Coffee, Star, Zap, Image as ImageIcon, Video, Award, ArrowRight, Share2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function HomeTerminal() {
  const { campaigns, rewards, supporters, isLoading, shareCampaign } = useAppContext();
  const [text, setText] = useState('');
  const fullText = "INITIATING CONNECTION...\nESTABLISHING SECURE LINK TO SANTI_BALOSKY_SERVER...\nACCESS GRANTED.\nWELCOME TO THE SUPPORT TERMINAL.";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sticker': return <Star className="w-4 h-4 text-[#00ff00]" />;
      case 'Image': return <ImageIcon className="w-4 h-4 text-[#00ff00]" />;
      case 'Video': return <Video className="w-4 h-4 text-[#00ff00]" />;
      case 'Award': return <Award className="w-4 h-4 text-[#00ff00]" />;
      default: return <Star className="w-4 h-4 text-[#00ff00]" />;
    }
  };

  return (
    <div className="space-y-12 pb-16 min-h-screen bg-black text-[#00ff00] font-mono relative overflow-hidden">
      {/* Scanlines Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 scanlines opacity-50 mix-blend-overlay" />
      
      {/* Terminal Header */}
      <div className="border-b border-[#00ff00]/30 pb-4 mb-8 px-4 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> root@balosky:~#</span>
          <span>v1.0.4 [ONLINE]</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="space-y-6 px-4">
        <div className="whitespace-pre-wrap text-sm opacity-80 h-24">
          {text}
          <span className="animate-pulse">_</span>
        </div>

        <div className="border border-[#00ff00] p-4 bg-[#00ff00]/5 relative">
          <div className="absolute -top-3 left-4 bg-black px-2 text-xs">USER_PROFILE</div>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <pre className="text-[8px] leading-[8px] hidden sm:block text-[#00ff00]/80">
{`
  ███████╗ █████╗ ███╗   ██╗████████╗██╗
  ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝██║
  ███████╗███████║██╔██╗ ██║   ██║   ██║
  ╚════██║██╔══██║██║╚██╗██║   ██║   ██║
  ███████║██║  ██║██║ ╚████║   ██║   ██║
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝
`}
            </pre>
            <div className="space-y-4 flex-1">
              <h1 className="text-2xl font-bold tracking-widest uppercase">
                {'>'} Santiago Balosky
              </h1>
              <p className="text-sm opacity-80">
                [STATUS: ACTIVE] Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.
              </p>
              <div className="pt-4">
                <Link 
                  to="/checkout" 
                  className="inline-flex px-6 py-2 bg-[#00ff00] text-black font-bold text-sm uppercase hover:bg-[#00ff00]/80 transition-colors items-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  EXECUTE: support_creator.sh
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="space-y-6 px-4">
        <div className="flex items-center gap-2 border-b border-[#00ff00]/30 pb-2">
          <span className="text-xs opacity-50">01</span>
          <h2 className="text-xl uppercase tracking-widest">{'>'} ACTIVE_MISSIONS</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="border border-[#00ff00]/50 bg-black p-4 flex flex-col h-[300px] animate-pulse">
                <div className="h-6 bg-[#00ff00]/20 w-3/4 mb-4" />
                <div className="h-4 bg-[#00ff00]/10 w-full mb-2" />
                <div className="h-4 bg-[#00ff00]/10 w-5/6 mb-6" />
                <div className="mt-auto h-8 bg-[#00ff00]/20 w-full" />
              </div>
            ))
          ) : campaigns.filter(c => c.active).map((campaign) => {
            const progress = campaign.goal > 0 ? Math.min((campaign.raised / campaign.goal) * 100, 100) : 100;
            
            return (
              <div 
                key={campaign.id}
                className="border border-[#00ff00]/50 bg-black p-4 flex flex-col group hover:border-[#00ff00] transition-colors relative"
              >
                <div className="absolute top-2 right-2 flex gap-2 items-center">
                  <button 
                    onClick={() => shareCampaign(campaign)}
                    className="text-[#00ff00]/50 hover:text-[#00ff00] transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <div className="w-2 h-2 bg-[#00ff00] animate-pulse" />
                </div>
                
                <h3 className="text-lg uppercase mb-2 pr-8">{'>'} {campaign.title}</h3>
                <p className="text-xs opacity-70 mb-6 flex-1">{campaign.description}</p>
                
                <div className="space-y-4 mt-auto">
                  {campaign.goal > 0 ? (
                    <>
                      <div className="flex justify-between text-xs">
                        <span>DATA_COLLECTED: ${campaign.raised.toLocaleString('es-AR')}</span>
                        <span>TARGET: ${campaign.goal.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="h-2 border border-[#00ff00]/50 p-[1px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: "linear" }}
                          className="h-full bg-[#00ff00]"
                        />
                      </div>
                      <div className="text-[10px] text-right opacity-50">
                        {progress.toFixed(1)}% COMPLETE
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xs">
                      <span>DATA_COLLECTED: ${campaign.raised.toLocaleString('es-AR')}</span>
                      <span>TARGET: INFINITE</span>
                    </div>
                  )}
                  
                  <Link 
                    to={`/checkout/${campaign.id}`}
                    className="mt-4 w-full py-2 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black text-xs uppercase transition-colors flex items-center justify-center gap-2"
                  >
                    [ INITIATE_TRANSFER ]
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rewards Section */}
      <section className="space-y-6 px-4">
        <div className="flex items-center gap-2 border-b border-[#00ff00]/30 pb-2">
          <span className="text-xs opacity-50">02</span>
          <h2 className="text-xl uppercase tracking-widest">{'>'} REWARD_SYSTEM</h2>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="border border-[#00ff00]/30 p-4 flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 border border-[#00ff00]/50 bg-[#00ff00]/10 shrink-0" />
                <div className="w-full">
                  <div className="h-4 bg-[#00ff00]/20 w-3/4 mb-2" />
                  <div className="h-3 bg-[#00ff00]/10 w-full mb-1" />
                  <div className="h-3 bg-[#00ff00]/10 w-5/6 mb-4" />
                  <div className="h-4 bg-[#00ff00]/20 w-1/2" />
                </div>
              </div>
            ))
          ) : rewards.map((reward) => (
            <div key={reward.id} className="border border-[#00ff00]/30 p-4 flex items-start gap-4 hover:bg-[#00ff00]/5 transition-colors">
              <div className="w-10 h-10 border border-[#00ff00]/50 flex items-center justify-center shrink-0">
                {getIcon(reward.icon)}
              </div>
              <div className="flex-1">
                <h4 className="uppercase text-sm">{'>'} {reward.title}</h4>
                <p className="text-xs opacity-70 mt-1">{reward.description}</p>
                <div className="mt-2 text-xs opacity-50">
                  REQ_FUNDS: ${reward.minAmount.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Wall */}
      <section className="space-y-6 px-4 pb-12">
        <div className="flex items-center gap-2 border-b border-[#00ff00]/30 pb-2">
          <span className="text-xs opacity-50">03</span>
          <h2 className="text-xl uppercase tracking-widest">{'>'} CONNECTION_LOGS</h2>
        </div>
        
        <div className="space-y-2 font-terminal text-lg max-w-3xl mx-auto">
          {supporters.slice(0, 5).map((supporter, idx) => (
            <motion.div 
              key={supporter.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              whileInView={{ opacity: 1, x: 0, height: 'auto' }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="border-l-2 border-[#00ff00] pl-4 py-2 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="opacity-50">[{supporter.date}]</span> 
                  <span className="font-bold ml-2">{supporter.name}</span>
                  <span className="opacity-50 ml-2">transferred</span>
                  <span className="text-[#00ff00] ml-2 font-bold">${supporter.amount.toLocaleString('es-AR')}</span>
                </div>
              </div>
              {supporter.message && (
                <p className="text-sm opacity-80 mt-1">{'>'} "{supporter.message}"</p>
              )}
              {supporter.creatorResponse && (
                <div className="mt-2 pl-4 border-l border-[#00ff00]/50 text-xs">
                  <span className="text-[#00ff00] font-bold">[SYS_ADMIN_REPLY]:</span> 
                  <span className="opacity-90 ml-2">"{supporter.creatorResponse}"</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
