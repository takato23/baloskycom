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
        <h1 className="text-4xl sm:text-6xl font-bold font-brutal uppercase text-black flex items-center gap-4">
          <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-[#FF00FF]" />
          Galería IA
        </h1>
        <p className="text-xl text-black/80 font-bold max-w-2xl">
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
            className="bg-white border-4 border-black brutal-shadow flex flex-col group"
          >
            <div className="relative aspect-square overflow-hidden border-b-4 border-black">
              <img 
                src={image.imageUrl} 
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-white border-4 border-black px-3 py-1 font-bold flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#FF00FF] fill-[#FF00FF]" />
                {image.votes}
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1 space-y-4">
              <h3 className="text-2xl font-bold uppercase font-brutal">{image.title}</h3>
              
              <div className="bg-zinc-100 border-2 border-black p-4 relative group/prompt flex-1">
                <p className="font-mono text-sm text-black/80 break-words">
                  {image.prompt}
                </p>
                <button
                  onClick={() => handleCopyPrompt(image.id, image.prompt)}
                  className="absolute top-2 right-2 p-2 bg-white border-2 border-black hover:bg-[#00FF00] transition-colors"
                  title="Copiar prompt"
                >
                  {copiedId === image.id ? (
                    <Check className="w-4 h-4 text-black" />
                  ) : (
                    <Copy className="w-4 h-4 text-black" />
                  )}
                </button>
              </div>

              <button
                onClick={() => voteGalleryImage(image.id)}
                className="w-full py-3 bg-[#FF00FF] text-white font-bold uppercase border-4 border-black brutal-shadow-sm hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2"
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
