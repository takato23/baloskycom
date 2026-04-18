import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import { SiteSettings, Currency, Poll, Post, GalleryImage, BlogPost } from '@/types';
import { normalizeSiteSettings } from '@/content/publicContent';

// Keep existing UI types for now to avoid breaking themes
export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  image: string;
  active: boolean;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  minAmount: number;
  type: 'digital' | 'physical' | 'badge';
  icon: string;
};

export type Supporter = {
  id: string;
  name: string;
  message: string;
  amount: number;
  date: string;
  timestamp?: number;
  campaignId?: string;
  creatorResponse?: string;
};

export type UserProfile = {
  name: string;
  totalContributed: number;
  unlockedRewards: string[]; // Reward IDs
  badges: string[];
  purchases: any[]; // We'll use any for now to avoid circular deps or complex imports, or just import Purchase
};

/**
 * Delirio supports five themes. `dark` and `light` are the core pair; `90s`,
 * `soft`, and `a11y` are expressive modes. Persisted to localStorage under
 * `balosky_theme` — the same key the static delirio.html uses, so the theme
 * carries seamlessly between the (still-static) home and the React app.
 */
export type ThemeMode = 'dark' | 'light' | '90s' | 'soft' | 'a11y';

interface AppState {
  campaigns: Campaign[];
  rewards: Reward[];
  supporters: Supporter[];
  userProfile: UserProfile;
  /** Convenience boolean for legacy code — true when `theme === 'dark'`. */
  darkMode: boolean;
  /** Full 5-way theme. Prefer this over darkMode going forward. */
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  settings: SiteSettings | null;
  isLoading: boolean;
  currency: Currency;
  polls: Poll[];
  posts: Post[];
  galleryImages: GalleryImage[];
  blogPosts: BlogPost[];
  newlyUnlockedRewards: string[];
  clearNewlyUnlockedRewards: () => void;
  /** Legacy: flips between dark and light. Prefer `setTheme`. */
  toggleDarkMode: () => void;
  setCurrency: (currency: Currency) => void;
  addContribution: (amount: number, name: string, message: string, campaignId?: string) => void;
  updateCampaign: (campaign: Campaign) => void;
  shareCampaign: (campaign: Campaign) => void;
  refreshData: () => Promise<void>;
  votePoll: (pollId: string, optionId: string) => void;
  likePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  voteGalleryImage: (imageId: string) => void;
  addBlogComment: (postId: string, text: string) => void;
}

const initialUserProfile: UserProfile = {
  name: 'Juan Pérez',
  totalContributed: 0,
  unlockedRewards: [],
  badges: [],
  purchases: [],
};

const mockPolls: Poll[] = [
  {
    id: '1',
    question: '¿Qué te gustaría ver primero en esta página?',
    options: [
      { id: 'o1', text: 'Más proyectos publicados', votes: 12 },
      { id: 'o2', text: 'Más contenido para aportantes', votes: 18 },
      { id: 'o3', text: 'Más encargos y servicios', votes: 9 }
    ],
    active: true,
    createdAt: new Date().toISOString(),
    votedUsers: []
  }
];

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Cómo voy a usar este espacio',
    content: 'Esta sección queda para publicar avances reales, ideas en proceso, materiales para aportantes y actualizaciones cortas del proyecto. La idea es que no haya promesas raras ni humo: solo cosas que efectivamente estén disponibles acá.',
    imageUrl: 'https://images.unsplash.com/photo-1579965342575-16428a7c8881?q=80&w=800&auto=format&fit=crop',
    isLocked: true,
    minContributionRequired: 1000,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    likes: 8,
    type: 'standard',
    comments: [
      { id: 'c1', author: 'Matias', text: 'Banco que quede claro qué se desbloquea y qué no.', createdAt: new Date(Date.now() - 80000000).toISOString() }
    ]
  },
  {
    id: '2',
    title: 'Espacio para aportantes',
    content: 'Acá van las publicaciones para la gente que apoya el proyecto. Si más adelante se suman beneficios manuales, menciones o contacto directo, se van a publicar explícitamente cuando estén definidos.',
    isLocked: false,
    minContributionRequired: 0,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    likes: 14,
    type: 'standard',
    comments: []
  },
  {
    id: '3',
    title: 'Espacio reservado para recursos reales',
    content: 'Cuando haya un archivo, guía o material concreto para compartir, se publica acá con su acceso correspondiente. Hasta entonces conviene mostrar este bloque como contenido reservado, no como una descarga inventada.',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    isLocked: true,
    minContributionRequired: 5000,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    likes: 5,
    type: 'standard',
    comments: []
  },
  {
    id: '4',
    title: 'Publicación premium de ejemplo',
    content: 'Este slot queda reservado para una publicación de mayor nivel cuando exista contenido concreto para ese tramo de aporte. Mientras no exista, la plataforma no debería vender humo ni anticipos inventados.',
    isLocked: true,
    minContributionRequired: 25000,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    likes: 3,
    type: 'standard',
    comments: []
  }
];

const mockGalleryImages: GalleryImage[] = [
  {
    id: 'g1',
    title: 'Neon Samurai',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    prompt: '/imagine prompt: A neon samurai standing in a futuristic Tokyo street, raining, cinematic lighting, 8k, highly detailed --ar 16:9',
    votes: 120,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'g2',
    title: 'Cosmic Landscape',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&auto=format&fit=crop',
    prompt: '/imagine prompt: A cosmic landscape with glowing purple nebulas, a lone astronaut standing on a glass-like surface reflecting the stars, surreal, masterpiece --ar 4:3',
    votes: 85,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'g3',
    title: 'Cyberpunk Car',
    imageUrl: 'https://images.unsplash.com/photo-1511407397940-d57f68e81203?q=80&w=800&auto=format&fit=crop',
    prompt: '/imagine prompt: A sleek cyberpunk sports car driving fast on a neon-lit highway, motion blur, synthwave aesthetic, 4k --ar 16:9',
    votes: 210,
    createdAt: new Date(Date.now() - 259200000).toISOString()
  }
];

const mockBlogPosts: BlogPost[] = [
  {
    id: 'b1',
    title: 'Qué entra hoy en un aporte y qué no',
    content: 'Esta página sirve para centralizar aportes, recompensas reales y publicaciones para aportantes. Lo importante es que cada beneficio exista de verdad antes de mostrarlo.\n\nSi todavía no hay acceso anticipado, chat directo o menciones garantizadas, no deberían figurar como parte de la propuesta. Cuando algo exista, se publica con alcance, condiciones y tiempos claros.',
    category: 'Notas del proyecto',
    tags: ['Aportes', 'Recompensas', 'Producto'],
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    comments: [
      { id: 'bc1', author: 'Ana', text: 'Mucho mejor dejar claros los beneficios reales.', createdAt: new Date(Date.now() - 40000000).toISOString() }
    ]
  },
  {
    id: 'b2',
    title: 'Cómo quiero ordenar encargos, aportes y publicaciones',
    content: 'Una cosa es el aporte libre, otra los encargos a medida y otra las publicaciones para aportantes. Separar bien esas tres entradas ayuda a que la página no prometa más de lo que realmente entrega.\n\nLa idea es que cada sección tenga una expectativa simple: apoyar, contratar algo puntual o seguir el proyecto.',
    category: 'Notas del proyecto',
    tags: ['Encargos', 'Aportes', 'Contenido'],
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    comments: []
  }
];

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Prefer the Delirio key `balosky_theme` (set by the static home). Fall
    // back to the legacy `darkMode` boolean so users who were on the React
    // app before this migration don't get reset.
    const saved = localStorage.getItem('balosky_theme');
    if (saved === 'dark' || saved === 'light' || saved === '90s' || saved === 'soft' || saved === 'a11y') {
      return saved;
    }
    const legacy = localStorage.getItem('darkMode');
    if (legacy === 'false') return 'light';
    return 'dark';
  });
  const darkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [polls, setPolls] = useState<Poll[]>(mockPolls);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(mockGalleryImages);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(mockBlogPosts);
  const [newlyUnlockedRewards, setNewlyUnlockedRewards] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [apiCampaigns, apiRewards, apiMessages, apiSettings] = await Promise.all([
        api.getCampaigns(),
        api.getRewards(),
        api.getApprovedMessages(),
        api.getSettings()
      ]);

      // Map API models to UI models
      setCampaigns(apiCampaigns.map(c => ({
        id: c.id,
        title: c.title,
        description: c.shortDescription,
        goal: c.targetAmount,
        raised: c.currentAmount,
        image: c.coverImage,
        active: c.status === 'active'
      })));

      setRewards(apiRewards);

      const mappedSupporters = apiMessages.map(m => ({
        id: m.id,
        name: m.isAnonymous ? 'Anónimo' : m.supporterName,
        message: m.message,
        amount: m.amount,
        date: new Date(m.createdAt).toLocaleDateString(),
        timestamp: new Date(m.createdAt).getTime(),
        campaignId: m.campaignId,
        creatorResponse: m.creatorResponse
      }));
      setSupporters(mappedSupporters);

      // Calculate user profile dynamically
      const userContributions = mappedSupporters.filter(s => s.name === initialUserProfile.name);
      const totalContributed = userContributions.reduce((sum, s) => sum + s.amount, 0);
      
      const unlockedRewards = apiRewards
        .filter(r => r.minAmount <= totalContributed)
        .map(r => r.id);
        
      const badges = [];
      if (totalContributed >= 1000) badges.push('Morerial');
      if (totalContributed >= 5000) badges.push('Cómplice');
      if (totalContributed >= 25000) badges.push('Mesaza');

      setUserProfile({
        ...initialUserProfile,
        totalContributed,
        unlockedRewards,
        badges
      });

      const normalizedSettings = normalizeSiteSettings({
        ...apiSettings,
        availabilityStatus: 'available'
      });

      setSettings(normalizedSettings);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Theme: sync to <html data-mode="…"> + localStorage. Keep the legacy
  // `darkMode` key in sync too so any old code paths that still read it get
  // a sensible boolean.
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', theme);
    localStorage.setItem('balosky_theme', theme);
    localStorage.setItem('darkMode', String(theme === 'dark'));
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const toggleDarkMode = () =>
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));

  const shareCampaign = async (campaign: Campaign) => {
    const url = `${window.location.origin}/checkout/${campaign.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: `¡Bancá esta misión: ${campaign.title}!`,
          url: url,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles');
    }
  };

  const addContribution = async (amount: number, name: string, message: string, campaignId?: string) => {
    // 1. Optimistic UI update
    const newSupporter: Supporter = {
      id: `s${Date.now()}`,
      name: name || 'Anónimo',
      message,
      amount,
      date: 'Justo ahora',
      timestamp: Date.now(),
      campaignId,
    };

    setSupporters([newSupporter, ...supporters]);

    if (campaignId) {
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, raised: c.raised + amount } : c
      ));
    } else {
      setCampaigns(campaigns.map(c => 
        c.id === 'c3' ? { ...c, raised: c.raised + amount } : c
      ));
    }

    const newTotal = userProfile.totalContributed + amount;
    const newUnlockedRewards = rewards
      .filter(r => newTotal >= r.minAmount)
      .map(r => r.id);
    
    // Find newly unlocked rewards
    const newlyUnlocked = newUnlockedRewards.filter(id => !userProfile.unlockedRewards.includes(id));
    if (newlyUnlocked.length > 0) {
      setNewlyUnlockedRewards(prev => [...prev, ...newlyUnlocked]);
    }

    const newBadges = [];
    if (newTotal >= 1000) newBadges.push('Morerial');
    if (newTotal >= 5000) newBadges.push('Cómplice');
    if (newTotal >= 25000) newBadges.push('Mesaza');

    setUserProfile({
      ...userProfile,
      name: name || userProfile.name,
      totalContributed: newTotal,
      unlockedRewards: newUnlockedRewards,
      badges: newBadges,
    });

    // 2. Real API call
    // Note: In a real environment, the webhook would handle this. 
    // Since we are simulating the webhook, we'll just call the addMessage endpoint directly
    // to ensure the data is saved in the database.
    try {
      await api.addMessage({
        supporterName: name || 'Anónimo',
        amount,
        message,
        isAnonymous: !name,
        isApproved: true, // Auto-approve for now, admin can change later
        campaignId
      });
    } catch (error) {
      console.error("Failed to save contribution", error);
    }
  };

  const updateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(campaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
  };

  const votePoll = (pollId: string, optionId: string) => {
    setPolls(polls.map(p => {
      if (p.id === pollId && !p.votedUsers.includes(userProfile.name)) {
        return {
          ...p,
          votedUsers: [...p.votedUsers, userProfile.name],
          options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
        };
      }
      return p;
    }));
  };

  const likePost = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  const addComment = (postId: string, text: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: Math.random().toString(36).substr(2, 9),
              author: userProfile.name,
              text,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return p;
    }));
  };

  const clearNewlyUnlockedRewards = () => {
    setNewlyUnlockedRewards([]);
  };

  const voteGalleryImage = (imageId: string) => {
    setGalleryImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, votes: img.votes + 1 } : img
    ));
  };

  const addBlogComment = (postId: string, text: string) => {
    setBlogPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, {
            id: `bc${Date.now()}`,
            author: userProfile.name,
            text,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return p;
    }));
  };

  const contextValue = useMemo(() => ({
    campaigns, rewards, supporters, userProfile, darkMode, theme, setTheme,
    settings, isLoading, currency, polls, posts,
    galleryImages, blogPosts,
    newlyUnlockedRewards, clearNewlyUnlockedRewards,
    toggleDarkMode, setCurrency, addContribution, updateCampaign, shareCampaign, refreshData: loadData, votePoll, likePost, addComment,
    voteGalleryImage, addBlogComment
  }), [
    campaigns, rewards, supporters, userProfile, darkMode, theme, settings, isLoading, currency, polls, posts,
    galleryImages, blogPosts, newlyUnlockedRewards,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
