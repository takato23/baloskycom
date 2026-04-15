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
    <div className="theme-page theme-adapt space-y-8 font-sans">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 flex items-center justify-center mx-auto bg-[var(--accent)] text-white"
        >
          <MessageSquare className="w-8 h-8" />
        </motion.div>
        <h1 className="text-4xl t-hero text-[var(--black)]">Muro de Mensajes</h1>
        <p className="max-w-lg mx-auto t-body text-base p-4 bg-[var(--grey)] border border-[var(--border)]">
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
            data-hover
            className="p-6 relative overflow-hidden group bg-[var(--grey)] border border-[var(--border)]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Coffee className="w-24 h-24 text-[var(--black)]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center font-bold bg-[var(--accent)] text-white">
                    {supporter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-[var(--black)] font-display uppercase text-xl tracking-tight">
                      {supporter.name}
                      {getUserTier(supporter.amount) && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold border border-[var(--border)]",
                          getUserTier(supporter.amount)?.color
                        )}>
                          {getUserTier(supporter.amount)?.name}
                        </span>
                      )}
                      {supporter.message.includes('[ENCARGO MÁGICO]') && (
                        <span className="px-2 py-0.5 text-[10px] font-bold border border-[var(--accent)] flex items-center gap-1 bg-[var(--accent)] text-white">
                          <Wand2 className="w-3 h-3" />
                          ENCARGO
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">{supporter.date}</p>
                  </div>
                </div>
                <div className="px-3 py-1 text-sm font-bold bg-[var(--accent)] text-white">
                  {formatCurrency(supporter.amount, currency)}
                </div>
              </div>

              <p className="text-lg leading-relaxed italic whitespace-pre-wrap text-[var(--black)] font-medium">
                "{supporter.message.replace('[ENCARGO MÁGICO]\n', '')}"
              </p>

              {supporter.creatorResponse && (
                <div className="mt-4 p-4 flex gap-3 bg-[var(--grey)] border border-[var(--border)]">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-[var(--black)] text-[var(--accent)]">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1 text-[var(--muted)] uppercase">Santi Balosky respondió:</p>
                    <p className="text-sm text-[var(--black)] font-medium">{supporter.creatorResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {supporters.length === 0 && (
          <div className="text-center py-20 text-[var(--muted)] font-display uppercase text-xl tracking-tight">
            Todavía no hay mensajes. ¡Sé el primero en dejar uno!
          </div>
        )}
      </div>
    </div>
  );
}
