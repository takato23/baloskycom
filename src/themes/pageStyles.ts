import type { ThemeId } from '@/types';

export interface ThemedPageStyles {
  shell: string;
  pageTitle: string;
  pageSubtitle: string;
  sectionTitle: string;
  panel: string;
  softPanel: string;
  accentPanel: string;
  contrastPanel: string;
  badge: string;
  chip: string;
  timelineLine: string;
  timelineNode: string;
  primaryButton: string;
  secondaryButton: string;
  modal: string;
  input: string;
  emptyState: string;
}

const shared = {
  input:
    'w-full p-3 border-4 outline-none font-medium transition-colors',
};

export const PAGE_THEME_STYLES: Record<ThemeId, ThemedPageStyles> = {
  brutalist: {
    shell: 'font-sans',
    pageTitle: 'font-brutal uppercase tracking-tight text-black',
    pageSubtitle: 'text-black/80 font-medium',
    sectionTitle: 'font-brutal uppercase text-black',
    panel: 'bg-white border-4 border-black brutal-shadow',
    softPanel: 'bg-yellow-300 border-4 border-black brutal-shadow-sm text-black',
    accentPanel: 'bg-[#00FF00] border-4 border-black brutal-shadow text-black',
    contrastPanel: 'bg-black border-4 border-black brutal-shadow text-white',
    badge: 'bg-[#FF00FF] text-white border-2 border-black',
    chip: 'bg-yellow-300 text-black border-2 border-black',
    timelineLine: 'bg-black',
    timelineNode: 'bg-[#FF00FF] border-4 border-black',
    primaryButton: 'bg-black text-white border-4 border-black hover:bg-[#00FF00] hover:text-black brutal-shadow-sm hover:translate-y-1 hover:shadow-none',
    secondaryButton: 'bg-white text-black border-4 border-black hover:bg-yellow-300 brutal-shadow-sm hover:translate-y-1 hover:shadow-none',
    modal: 'bg-white border-4 border-black brutal-shadow text-black',
    input: `${shared.input} border-black bg-zinc-50 text-black focus:bg-yellow-100`,
    emptyState: 'bg-yellow-300 border-4 border-black brutal-shadow text-black',
  },
  minimal: {
    shell: 'font-sans',
    pageTitle: 'font-serif tracking-[-0.04em] text-[#161616]',
    pageSubtitle: 'text-[#161616]/70 font-medium',
    sectionTitle: 'font-serif tracking-[-0.03em] text-[#161616]',
    panel: 'bg-white border border-black/15 shadow-sm text-[#161616]',
    softPanel: 'bg-[#ece4d7] border border-black/15 shadow-sm text-[#161616]',
    accentPanel: 'bg-[#d8c3a5] border border-black/20 shadow-sm text-[#161616]',
    contrastPanel: 'bg-[#161616] border border-[#161616] shadow-sm text-white',
    badge: 'bg-[#d8c3a5] text-[#161616] border border-black/20',
    chip: 'bg-[#f3ece2] text-[#161616] border border-black/15',
    timelineLine: 'bg-black/20',
    timelineNode: 'bg-[#d8c3a5] border border-black/25',
    primaryButton: 'bg-[#161616] text-white border border-[#161616] hover:bg-[#d8c3a5] hover:text-[#161616]',
    secondaryButton: 'bg-white text-[#161616] border border-black/15 hover:bg-[#ece4d7]',
    modal: 'bg-[#f7f4ee] border border-black/15 shadow-xl text-[#161616]',
    input: `${shared.input} border-black/15 bg-white text-[#161616] focus:bg-[#f3ece2]`,
    emptyState: 'bg-[#ece4d7] border border-black/15 text-[#161616]',
  },
  atmospheric: {
    shell: 'font-sans text-white',
    pageTitle: 'font-display uppercase tracking-[-0.05em] text-white',
    pageSubtitle: 'text-white/72 font-medium',
    sectionTitle: 'font-display uppercase tracking-[-0.04em] text-white',
    panel: 'bg-white/8 border border-white/15 backdrop-blur-xl shadow-2xl text-white',
    softPanel: 'bg-white/10 border border-white/10 backdrop-blur-xl text-white',
    accentPanel: 'bg-violet-500/20 border border-violet-400/35 backdrop-blur-xl text-white shadow-[0_0_30px_rgba(139,92,246,0.18)]',
    contrastPanel: 'bg-black/45 border border-white/10 backdrop-blur-xl text-white',
    badge: 'bg-pink-500/70 text-white border border-white/20',
    chip: 'bg-white/10 text-white border border-white/10',
    timelineLine: 'bg-white/20',
    timelineNode: 'bg-violet-500 border border-white/30',
    primaryButton: 'bg-white/12 text-white border border-white/20 hover:bg-violet-500/35',
    secondaryButton: 'bg-black/30 text-white border border-white/12 hover:bg-white/10',
    modal: 'bg-[#0d0d17]/92 border border-white/12 backdrop-blur-xl text-white',
    input: `${shared.input} border-white/15 bg-white/8 text-white focus:bg-white/14`,
    emptyState: 'bg-white/10 border border-white/10 backdrop-blur-xl text-white',
  },
  cybergrid: {
    shell: 'font-sans text-[#e0f2fe]',
    pageTitle: 'font-brutal uppercase tracking-[0.02em] text-cyan-300',
    pageSubtitle: 'text-cyan-100/72 font-medium',
    sectionTitle: 'font-brutal uppercase tracking-[0.04em] text-cyan-300',
    panel: 'bg-[#0f172a]/88 border border-cyan-400/35 backdrop-blur-xl shadow-[0_0_25px_rgba(34,211,238,0.12)] text-[#e0f2fe]',
    softPanel: 'bg-cyan-400/10 border border-cyan-400/25 backdrop-blur-xl text-[#e0f2fe]',
    accentPanel: 'bg-pink-500/22 border border-pink-400/40 backdrop-blur-xl text-white shadow-[0_0_30px_rgba(236,72,153,0.16)]',
    contrastPanel: 'bg-[#08101f] border border-cyan-400/30 text-[#e0f2fe]',
    badge: 'bg-pink-500 text-white border border-cyan-300/30',
    chip: 'bg-cyan-400/10 text-cyan-100 border border-cyan-400/25',
    timelineLine: 'bg-cyan-400/35',
    timelineNode: 'bg-pink-500 border border-cyan-300/35',
    primaryButton: 'bg-pink-500 text-white border border-pink-300 hover:bg-cyan-400 hover:text-[#0f172a]',
    secondaryButton: 'bg-[#0f172a] text-[#e0f2fe] border border-cyan-400/30 hover:bg-cyan-400 hover:text-[#0f172a]',
    modal: 'bg-[#07111f] border border-cyan-400/25 text-[#e0f2fe]',
    input: `${shared.input} border-cyan-400/30 bg-[#0f172a] text-[#e0f2fe] focus:bg-[#162235]`,
    emptyState: 'bg-cyan-400/10 border border-cyan-400/25 text-[#e0f2fe]',
  },
  terminal: {
    shell: 'font-mono text-[#00ff00]',
    pageTitle: 'font-mono uppercase tracking-[0.18em] text-[#00ff00]',
    pageSubtitle: 'text-[#00ff00]/70 font-bold',
    sectionTitle: 'font-mono uppercase tracking-[0.18em] text-[#00ff00]',
    panel: 'bg-black border border-[#00ff00] text-[#00ff00]',
    softPanel: 'bg-[#071907] border border-[#00ff00] text-[#00ff00]',
    accentPanel: 'bg-[#00ff00] border border-[#00ff00] text-black',
    contrastPanel: 'bg-black border border-[#00ff00] text-[#00ff00]',
    badge: 'bg-[#00ff00] text-black border border-[#00ff00]',
    chip: 'bg-black text-[#00ff00] border border-[#00ff00]',
    timelineLine: 'bg-[#00ff00]',
    timelineNode: 'bg-[#00ff00] border border-[#00ff00]',
    primaryButton: 'bg-[#00ff00] text-black border border-[#00ff00] hover:bg-[#b8ffb8]',
    secondaryButton: 'bg-black text-[#00ff00] border border-[#00ff00] hover:bg-[#00ff00] hover:text-black',
    modal: 'bg-black border border-[#00ff00] text-[#00ff00]',
    input: `${shared.input} border-[#00ff00] bg-black text-[#00ff00] focus:bg-[#071907]`,
    emptyState: 'bg-[#071907] border border-[#00ff00] text-[#00ff00]',
  },
};

export const getThemedPageStyles = (theme: ThemeId): ThemedPageStyles =>
  PAGE_THEME_STYLES[theme] ?? PAGE_THEME_STYLES.brutalist;
