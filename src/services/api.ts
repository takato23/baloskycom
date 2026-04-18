import {
  AdminAuthStatus,
  Campaign,
  CheckoutPaymentStatus,
  CheckoutPreferenceResponse,
  Reward,
  SupporterMessage,
  SiteSettings,
  Product,
  Membership,
  Idea,
  Media,
  MediaKind,
  Social,
  NewsletterSubscriber,
  UploadResult
} from '@/types';

// ==========================================
// API SERVICE (Connected to Local Express Backend)
// ==========================================

const API_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  getAdminAuthStatus: async (): Promise<AdminAuthStatus> => {
    const res = await fetch(`${API_URL}/auth/status`);
    if (!res.ok) throw new Error('Failed to fetch auth status');
    return res.json();
  },
  bootstrapAdmin: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Failed to create admin');
    return res.json();
  },
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },
  updateAdminCredentials: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/credentials`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Failed to update admin credentials');
    return res.json();
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_URL}/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },
  createCampaign: async (campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(campaign)
    });
    if (!res.ok) throw new Error('Failed to create campaign');
    return res.json();
  },
  updateCampaign: async (id: string, updates: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update campaign');
    return res.json();
  },
  deleteCampaign: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete campaign');
  },
  
  // Rewards
  getRewards: async (): Promise<Reward[]> => {
    const res = await fetch(`${API_URL}/rewards`);
    if (!res.ok) throw new Error('Failed to fetch rewards');
    return res.json();
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },
  createProduct: async (product: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },
  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },
  deleteProduct: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  // Ideas
  getIdeas: async (): Promise<Idea[]> => {
    const res = await fetch(`${API_URL}/ideas`);
    if (!res.ok) throw new Error('Failed to fetch ideas');
    return res.json();
  },
  createIdea: async (idea: Partial<Idea>): Promise<Idea> => {
    const res = await fetch(`${API_URL}/ideas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(idea)
    });
    if (!res.ok) throw new Error('Failed to create idea');
    return res.json();
  },
  updateIdea: async (id: string, updates: Partial<Idea>): Promise<Idea> => {
    const res = await fetch(`${API_URL}/ideas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update idea');
    return res.json();
  },
  deleteIdea: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/ideas/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete idea');
  },

  // Memberships
  getMemberships: async (): Promise<Membership[]> => {
    const res = await fetch(`${API_URL}/memberships`);
    if (!res.ok) throw new Error('Failed to fetch memberships');
    return res.json();
  },
  createMembership: async (membership: Partial<Membership>): Promise<Membership> => {
    const res = await fetch(`${API_URL}/memberships`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(membership)
    });
    if (!res.ok) throw new Error('Failed to create membership');
    return res.json();
  },
  updateMembership: async (id: string, updates: Partial<Membership>): Promise<Membership> => {
    const res = await fetch(`${API_URL}/memberships/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update membership');
    return res.json();
  },
  deleteMembership: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/memberships/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete membership');
  },

  // Messages (Wall)
  getMessages: async (): Promise<SupporterMessage[]> => {
    const res = await fetch(`${API_URL}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },
  getApprovedMessages: async (): Promise<SupporterMessage[]> => {
    const messages = await api.getMessages();
    return messages.filter(m => m.isApproved);
  },
  addMessage: async (message: Omit<SupporterMessage, 'id' | 'createdAt'>): Promise<SupporterMessage> => {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (!res.ok) throw new Error('Failed to add message');
    return res.json();
  },
  approveMessage: async (id: string, isApproved: boolean): Promise<void> => {
    const res = await fetch(`${API_URL}/messages/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isApproved })
    });
    if (!res.ok) throw new Error('Failed to approve message');
  },
  updateMessageResponse: async (id: string, creatorResponse: string): Promise<void> => {
    const res = await fetch(`${API_URL}/messages/${id}/response`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ creatorResponse })
    });
    if (!res.ok) throw new Error('Failed to update message response');
  },
  deleteMessage: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/messages/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete message');
  },

  // Discount Codes
  getDiscountCodes: async () => {
    const res = await fetch(`${API_URL}/discount-codes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch discount codes');
    return res.json();
  },
  createDiscountCode: async (data: any) => {
    const res = await fetch(`${API_URL}/discount-codes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create discount code');
    return res.json();
  },
  updateDiscountCode: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/discount-codes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update discount code');
    return res.json();
  },
  deleteDiscountCode: async (id: string) => {
    const res = await fetch(`${API_URL}/discount-codes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete discount code');
  },

  // Purchases
  getPurchases: async () => {
    const res = await fetch(`${API_URL}/purchases`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch purchases');
    return res.json();
  },
  createPurchase: async (data: any) => {
    const res = await fetch(`${API_URL}/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create purchase');
    return res.json();
  },
  deletePurchase: async (id: string) => {
    const res = await fetch(`${API_URL}/purchases/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete purchase');
  },

  // Settings
  getSettings: async (): Promise<SiteSettings> => {
    const res = await fetch(`${API_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },
  updateSettings: async (updates: Partial<SiteSettings>): Promise<SiteSettings> => {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Mercado Pago Checkout
  createPreference: async (
    amount: number,
    title: string,
    campaignId?: string,
    supporterName?: string,
    message?: string
  ): Promise<CheckoutPreferenceResponse> => {
    const res = await fetch(`${API_URL}/checkout/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, title, campaignId, supporterName, message })
    });
    if (!res.ok) throw new Error('Failed to create preference');
    return res.json();
  },
  // Mercado Pago Preapproval (recurring subscription) — usado por
  // ClubSection para que "Sumarme" cree una suscripción mensual real
  // en MP en vez de un pago one-time. El backend
  // (POST /api/subscriptions/create) valida el membershipId, crea una
  // fila en `subscriptions` (status=pending), llama a MP /preapproval,
  // y devuelve el initPoint al que redirigimos. Cuando el usuario
  // autoriza en MP, el webhook actualiza la subscription a `authorized`.
  createSubscription: async (
    membershipId: string,
    email: string
  ): Promise<{
    subscriptionId: string;
    preapprovalId?: string;
    initPoint?: string;
    sandboxInitPoint?: string;
    stub?: boolean;
  }> => {
    const res = await fetch(`${API_URL}/subscriptions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId, email })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error || 'No pudimos crear la suscripción');
    }
    return res.json();
  },
  // Usado por el banner de retorno post-MP (ClubReturnBanner) para poller
  // el estado real de la suscripción. El backend devuelve status:
  // 'pending' | 'authorized' | 'paused' | 'cancelled' | 'failed'.
  getSubscriptionStatus: async (
    subscriptionId: string
  ): Promise<{
    id: string;
    status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'failed';
    membershipId?: string;
    authorizedAt?: string | null;
  }> => {
    const res = await fetch(
      `${API_URL}/subscriptions/${encodeURIComponent(subscriptionId)}/status`
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error || 'No pudimos leer el estado de la suscripción');
    }
    return res.json();
  },
  getPaymentStatus: async (paymentId: string): Promise<CheckoutPaymentStatus> => {
    const res = await fetch(`${API_URL}/checkout/status/${paymentId}`);
    if (!res.ok) throw new Error('Failed to fetch payment status');
    return res.json();
  },

  // Media (video_ia, foto, wallpaper, cancion)
  getMedia: async (kind?: MediaKind): Promise<Media[]> => {
    const url = kind ? `${API_URL}/media?kind=${kind}` : `${API_URL}/media`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
  },
  getAdminMedia: async (kind?: MediaKind): Promise<Media[]> => {
    const url = kind ? `${API_URL}/media?kind=${kind}` : `${API_URL}/media`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
  },
  createMedia: async (m: Partial<Media>): Promise<Media> => {
    const res = await fetch(`${API_URL}/media`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(m)
    });
    if (!res.ok) throw new Error('Failed to create media');
    return res.json();
  },
  updateMedia: async (id: string, m: Partial<Media>): Promise<Media> => {
    const res = await fetch(`${API_URL}/media/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(m)
    });
    if (!res.ok) throw new Error('Failed to update media');
    return res.json();
  },
  deleteMedia: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/media/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete media');
  },

  // Socials
  getSocials: async (): Promise<Social[]> => {
    const res = await fetch(`${API_URL}/socials`);
    if (!res.ok) throw new Error('Failed to fetch socials');
    return res.json();
  },
  createSocial: async (s: Partial<Social>): Promise<Social> => {
    const res = await fetch(`${API_URL}/socials`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(s)
    });
    if (!res.ok) throw new Error('Failed to create social');
    return res.json();
  },
  updateSocial: async (id: string, s: Partial<Social>): Promise<Social> => {
    const res = await fetch(`${API_URL}/socials/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(s)
    });
    if (!res.ok) throw new Error('Failed to update social');
    return res.json();
  },
  deleteSocial: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/socials/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete social');
  },

  // File upload (admin only)
  uploadFile: async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  // Newsletter
  subscribeNewsletter: async (email: string, source?: string): Promise<{ success: boolean; duplicate?: boolean }> => {
    const res = await fetch(`${API_URL}/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to subscribe');
    }
    return res.json();
  },
  listNewsletter: async (): Promise<NewsletterSubscriber[]> => {
    const res = await fetch(`${API_URL}/newsletter`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch newsletter list');
    return res.json();
  }
};
