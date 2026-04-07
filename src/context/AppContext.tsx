import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '@/services/api';
import { SiteSettings, Currency, Poll, Post, GalleryImage, BlogPost, ThemeId } from '@/types';

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

export type Theme = ThemeId;

interface AppState {
  campaigns: Campaign[];
  rewards: Reward[];
  supporters: Supporter[];
  userProfile: UserProfile;
  theme: Theme;
  settings: SiteSettings | null;
  isLoading: boolean;
  currency: Currency;
  polls: Poll[];
  posts: Post[];
  galleryImages: GalleryImage[];
  blogPosts: BlogPost[];
  newlyUnlockedRewards: string[];
  clearNewlyUnlockedRewards: () => void;
  setTheme: (theme: Theme) => void;
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
    question: '¿De qué tema hago el próximo video?',
    options: [
      { id: 'o1', text: 'Setup Tour 2026', votes: 45 },
      { id: 'o2', text: 'Review del nuevo MacBook', votes: 120 },
      { id: 'o3', text: 'Vlog de viaje a Japón', votes: 89 }
    ],
    active: true,
    createdAt: new Date().toISOString(),
    votedUsers: []
  }
];

const mockPosts: Post[] = [
  {
    id: '1',
    title: '¡Detrás de escena del último video!',
    content: 'Acá les dejo unas fotos exclusivas de cómo grabamos la escena del dron. Fue una locura total, casi lo perdemos en el lago jajaja.',
    imageUrl: 'https://images.unsplash.com/photo-1579965342575-16428a7c8881?q=80&w=800&auto=format&fit=crop',
    isLocked: true,
    minContributionRequired: 1000,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    likes: 24,
    type: 'standard',
    comments: [
      { id: 'c1', author: 'Matias', text: '¡Qué locura ese dron!', createdAt: new Date(Date.now() - 80000000).toISOString() }
    ]
  },
  {
    id: '2',
    title: 'Bienvenidos al nuevo Feed del Creador',
    content: 'Este espacio es solo para ustedes, los que bancan el proyecto mes a mes. Acá voy a estar subiendo adelantos, encuestas y contenido sin filtro.',
    isLocked: false,
    minContributionRequired: 0,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    likes: 56,
    type: 'standard',
    comments: []
  },
  {
    id: '3',
    title: 'Prompt Revelado: Cyberpunk City',
    content: 'Muchos me preguntaron cómo logré el estilo de la última imagen en Instagram. Acá les dejo el prompt exacto que usé en Midjourney v6.',
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=800&auto=format&fit=crop',
    isLocked: true,
    minContributionRequired: 5000,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    likes: 89,
    type: 'ai-prompt',
    aiPrompt: '/imagine prompt: A futuristic cyberpunk city at night, neon lights reflecting on wet streets, cinematic lighting, 8k resolution, photorealistic --ar 16:9 --v 6.0',
    comments: []
  },
  {
    id: '4',
    title: 'Template de React + Vite (Brutalist)',
    content: 'Les comparto el boilerplate exacto que uso para arrancar mis proyectos web con estilo brutalista. Ya viene configurado con Tailwind y Framer Motion.',
    isLocked: true,
    minContributionRequired: 25000,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    likes: 112,
    type: 'resource',
    downloadUrl: 'https://github.com/ejemplo/brutalist-template/archive/refs/heads/main.zip',
    comments: []
  }
];

const mockGalleryImages: GalleryImage[] = [
  {
    id: 'g1',
    title: 'Neon Samurai',
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=800&auto=format&fit=crop',
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
    title: 'Cómo crear prompts efectivos en Midjourney',
    content: 'En este artículo te cuento mis secretos para generar imágenes increíbles usando Midjourney v6. La clave está en la estructura del prompt y en usar las palabras correctas para la iluminación y el estilo.\n\nPrimero, siempre empiezo definiendo el sujeto principal...',
    category: 'Tutoriales IA',
    tags: ['Midjourney', 'Prompts', 'IA'],
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    comments: [
      { id: 'bc1', author: 'Ana', text: '¡Excelente tutorial! Me sirvió muchísimo.', createdAt: new Date(Date.now() - 40000000).toISOString() }
    ]
  },
  {
    id: 'b2',
    title: 'Mi experiencia viajando por Japón',
    content: 'Japón es un país de contrastes. Por un lado, la tecnología de punta en Akihabara, y por otro, la tranquilidad de los templos en Kyoto. En este post les comparto mis reflexiones sobre este viaje inolvidable...',
    category: 'Viajes',
    tags: ['Japón', 'Vlog', 'Reflexiones'],
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
  const [theme, setTheme] = useState<Theme>('brutalist');
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
      if (totalContributed >= 1000) badges.push('Supporter');
      if (totalContributed >= 5000) badges.push('Super Fan');
      if (totalContributed >= 10000) badges.push('Mecenas');
      if (totalContributed >= 25000) badges.push('Leyenda');

      setUserProfile({
        ...initialUserProfile,
        totalContributed,
        unlockedRewards,
        badges
      });

      setSettings({
        ...apiSettings,
        availabilityStatus: 'available'
      });
      if (apiSettings.defaultTheme) {
        setTheme(apiSettings.defaultTheme as Theme);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    if (newTotal >= 1000) newBadges.push('Supporter');
    if (newTotal >= 5000) newBadges.push('Super Fan');
    if (newTotal >= 10000) newBadges.push('Mecenas');
    if (newTotal >= 25000) newBadges.push('Leyenda');

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

  return (
    <AppContext.Provider value={{ 
      campaigns, rewards, supporters, userProfile, theme, settings, isLoading, currency, polls, posts,
      galleryImages, blogPosts,
      newlyUnlockedRewards, clearNewlyUnlockedRewards,
      setTheme, setCurrency, addContribution, updateCampaign, shareCampaign, refreshData: loadData, votePoll, likePost, addComment,
      voteGalleryImage, addBlogComment
    }}>
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
