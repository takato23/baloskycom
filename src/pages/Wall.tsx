import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Heart, Coffee, Wand2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';
import { getUserTier } from '@/utils/tiers';
import { cn } from '@/lib/utils';

export default function Wall() {
  const { supporters, currency } = useAppContext();

  return (
    <div className={cn("theme-page theme-adapt space-y-8", "font-sans")}>
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "w-16 h-16 flex items-center justify-center mx-auto",
            "bg-[#00FF00] border-4 border-black brutal-shadow text-black"
          )}
        >
          <MessageSquare className="w-8 h-8" />
        </motion.div>
        <h1 className={cn("text-4xl font-bold", "font-brutal uppercase tracking-tighter text-black")}>Muro de Mensajes</h1>
        <p className={cn("max-w-lg mx-auto", "text-black font-bold border-2 border-black p-4 bg-yellow-300 brutal-shadow-sm")}>
          Gracias a todos los que hacen posible este proyecto. Cada aporte viene con un mensaje increíble.
        </p>
      </div>

      <div className="grid gap-4">
        {supporters.map((supporter, idx) => (
          <motion.div
            key={supporter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "p-6 relative overflow-hidden group",
              "bg-white border-4 border-black brutal-shadow"
            )}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Coffee className={cn("w-24 h-24", "text-black")} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center font-bold shadow-lg",
                    "bg-[#FF00FF] border-2 border-black text-white"
                  )}>
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className={cn("font-bold flex items-center gap-2", "text-black font-brutal uppercase text-xl")}>
                      {supporter.name}
                      {getUserTier(supporter.amount) && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold border-2 border-black",
                          getUserTier(supporter.amount)?.color
                        )}>
                          {getUserTier(supporter.amount)?.name}
                        </span>
                      )}
                      {supporter.message.includes('[ENCARGO MÁGICO]') && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold border-2 border-black flex items-center gap-1",
                          "bg-[#FF00FF] text-white"
                        )}>
                          <Wand2 className="w-3 h-3" />
                          ENCARGO
                        </span>
                      )}
                    </h3>
                    <p className={cn("text-xs", "text-black/60 font-bold")}>{supporter.date}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 text-sm font-bold",
                  "bg-[#00FF00] border-2 border-black text-black brutal-shadow-sm"
                )}>
                  {formatCurrency(supporter.amount, currency)}
                </div>
              </div>
              
              <p className={cn("text-lg leading-relaxed italic whitespace-pre-wrap", "text-black font-medium")}>
                "{supporter.message.replace('[ENCARGO MÁGICO]\n', '')}"
              </p>

              {supporter.creatorResponse && (
                <div className={cn(
                  "mt-4 p-4 flex gap-3",
                  "bg-yellow-300 border-4 border-black brutal-shadow-sm"
                )}>
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center shrink-0",
                    "bg-black text-[#00FF00]"
                  )}>
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={cn("text-xs font-bold mb-1", "text-black uppercase")}>Santi Balosky respondió:</p>
                    <p className={cn("text-sm", "text-black font-medium")}>{supporter.creatorResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {supporters.length === 0 && (
          <div className={cn("text-center py-20", "text-black font-bold font-brutal uppercase text-xl")}>
            Todavía no hay mensajes. ¡Sé el primero en dejar uno!
          </div>
        )}
      </div>
    </div>
  );
}
