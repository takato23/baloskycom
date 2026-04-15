import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { Idea } from '@/types';

/**
 * Public "Ideas" section — a bitácora of Santi's side projects, experiments,
 * and ChatGPT investigations. Each card links out to the external project
 * (Vercel, ChatGPT share, Notion, etc.). Content is managed from /admin/ideas.
 */
export default function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getIdeas();
        if (!cancelled) setIdeas(data.filter((i) => i.active));
      } catch (err) {
        console.error('Error loading ideas:', err);
        if (!cancelled) setError('No pude cargar las ideas, probá de vuelta en un rato.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ideas.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [ideas]);

  const visibleIdeas = useMemo(() => {
    if (activeCategory === 'Todas') return ideas;
    return ideas.filter((i) => i.category === activeCategory);
  }, [ideas, activeCategory]);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero */}
      <section className="pt-4 pb-2">
        <p className="t-eyebrow text-[var(--accent)] mb-4">Bitácora</p>
        <h1 className="t-hero text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9]">
          Ideas<span className="text-[var(--accent)]">.</span>
        </h1>
        <p className="t-body max-w-2xl mt-6 text-base sm:text-lg">
          Cosas que voy haciendo por el camino: webapps, experimentos, investigaciones
          con IA, delirios varios. Cada tarjeta te lleva al proyecto original.
        </p>
      </section>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold tracking-tight uppercase transition-colors border',
                  isActive
                    ? 'bg-[var(--black)] text-[var(--white)] border-[var(--black)]'
                    : 'bg-transparent text-[var(--black)]/60 border-[var(--black)]/15 hover:text-[var(--black)] hover:border-[var(--black)]/40'
                )}
                data-hover
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="border border-[var(--border-solid)] p-8 text-sm text-[var(--black)]/60">
          {error}
        </div>
      ) : visibleIdeas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {visibleIdeas.map((idea, idx) => (
            <IdeaCard key={idea.id} idea={idea} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  const hasImage = Boolean(idea.coverImage);
  return (
    <motion.a
      href={idea.url}
      target="_blank"
      rel="noreferrer noopener"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className={cn(
        'group relative flex flex-col border border-[var(--black)]/10 bg-[var(--white)]',
        'transition-all duration-300 hover:border-[var(--black)]/40 hover:-translate-y-0.5',
        'overflow-hidden'
      )}
      data-hover
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--black)]/5">
        {hasImage ? (
          <img
            src={idea.coverImage ?? ''}
            alt={idea.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-[var(--black)]/20" />
          </div>
        )}

        {idea.featured && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-[var(--accent)] text-black text-[10px] font-bold uppercase tracking-[0.15em]">
            Destacada
          </span>
        )}

        <span
          className={cn(
            'absolute top-3 right-3 w-9 h-9 flex items-center justify-center',
            'bg-[var(--white)] text-[var(--black)] border border-[var(--black)]/10',
            'transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)]'
          )}
        >
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        {idea.category && (
          <p className="t-eyebrow text-[var(--black)]/40 text-[10px]">{idea.category}</p>
        )}

        <h3 className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-[var(--black)]">
          {idea.title}
        </h3>

        <p className="text-sm text-[var(--black)]/60 leading-relaxed line-clamp-3">
          {idea.description}
        </p>

        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
            {idea.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--black)]/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.a>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[var(--black)]/15 p-12 text-center">
      <Sparkles className="w-8 h-8 mx-auto text-[var(--black)]/30 mb-3" />
      <p className="text-sm text-[var(--black)]/60">
        Todavía no hay ideas publicadas. Se vienen cosas.
      </p>
    </div>
  );
}
