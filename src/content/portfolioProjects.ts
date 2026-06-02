export type PortfolioProject = {
  id: string;
  title: string;
  category: string;
  image: string;
  link: string;
  demoUrl?: string;
  videoUrl?: string;
  longDescription?: string;
  promptTitle?: string;
  prompt?: string;
  rating: number;
  ratingCount: number;
};

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'p1',
    title: 'Plataforma de Creadores',
    category: 'Desarrollo Web',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop',
    link: '#',
    demoUrl: 'https://example.com/demo',
    longDescription:
      'Una plataforma para creadores: cobrás directo, manejás tu comunidad y das recompensas a los que bancan. La armé con React, Node y Tailwind.',
    rating: 4.8,
    ratingCount: 12,
  },
  {
    id: 'p2',
    title: 'Campaña Visual IA',
    category: 'Proyectos IA',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop',
    link: '#',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    promptTitle: 'Cyberpunk Cityscape',
    prompt: 'A futuristic cyberpunk city with neon lights, highly detailed, 8k resolution, unreal engine 5 render',
    rating: 5,
    ratingCount: 8,
  },
  {
    id: 'p3',
    title: 'Reels Virales',
    category: 'Creación de Contenido',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    link: '#',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    rating: 4.5,
    ratingCount: 24,
  },
];

export const PORTFOLIO_CATEGORIES = ['Todos', ...Array.from(new Set(PORTFOLIO_PROJECTS.map((project) => project.category)))];
