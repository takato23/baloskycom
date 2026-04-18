import React from 'react';
import { cn } from '@/lib/utils';

interface SocialGlassButtonProps {
  platform: string;
  url: string;
  className?: string;
}

export default function SocialGlassButton({ platform, url, className }: SocialGlassButtonProps) {
  const p = platform.toLowerCase();
  const bgImage = p.includes('instagram') ? '/images/social/instagram.png' :
                  p.includes('spotify')   ? '/images/social/spotify.png' :
                  p.includes('youtube')   ? '/images/social/youtube.png' :
                  null;

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "relative group overflow-hidden flex items-center justify-center min-w-[130px] h-12 transition-all duration-400 hover:scale-[1.03] active:scale-95 brutal-shadow-sm border-2 border-black rounded-xl",
        className
      )}
    >
      {bgImage ? (
        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt={`${platform} background`} 
            className="w-full h-full object-cover saturate-50 group-hover:saturate-150 group-hover:scale-110 transition-all duration-700 ease-out" 
          />
          <div className="absolute inset-0 backdrop-blur-[4px] bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-900 z-0 group-hover:bg-black transition-colors" />
      )}
      
      {/* Glassmorphism inner reflection */}
      <div className="absolute inset-0 rounded-xl border border-white/20 z-10 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent z-10 pointer-events-none mix-blend-overlay" />
      
      <span className="relative z-20 px-4 text-[11px] font-black uppercase tracking-[0.25em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {platform}
      </span>
    </a>
  );
}
