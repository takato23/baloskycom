import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Copy, Check } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function Gallery() {
  const { galleryImages, voteGalleryImage } = useAppContext();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="theme-page theme-adapt max-w-6xl mx-auto space-y-12 pb-32 sm:pb-16 px-4 sm:px-0 font-sans">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl t-hero text-[var(--black)] flex items-center gap-4">
          <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-[var(--accent)]" />
          Galería IA
        </h1>
        <p className="text-xl t-body max-w-2xl">
          Explorá mis creaciones generadas con Inteligencia Artificial. Podés ver los prompts exactos que usé y votar por tus favoritas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {galleryImages.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            data-hover
            className="bg-[var(--grey)] border border-[var(--border)] flex flex-col group"
          >
            <div className="relative aspect-square overflow-hidden border-b border-[var(--border)]">
              <img
                src={image.imageUrl}
                alt={image.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-[var(--white)] border border-[var(--border)] px-3 py-1 font-bold flex items-center gap-2 text-[var(--black)]">
                <Heart className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]" />
                {image.votes}
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1 space-y-4">
              <h3 className="text-2xl font-bold uppercase font-display tracking-tight text-[var(--black)]">{image.title}</h3>

              <div className="bg-[var(--white)] border border-[var(--border)] p-4 relative group/prompt flex-1">
                <p className="font-mono text-sm text-[var(--muted)] break-words">
                  {image.prompt}
                </p>
                <button
                  onClick={() => handleCopyPrompt(image.id, image.prompt)}
                  data-hover
                  className="absolute top-2 right-2 p-2 bg-[var(--grey)] border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors"
                  title="Copiar prompt"
                >
                  {copiedId === image.id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                onClick={() => voteGalleryImage(image.id)}
                data-hover
                className="w-full py-3 bg-[var(--accent)] text-white font-bold uppercase border border-[var(--accent)] hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                Votar
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
