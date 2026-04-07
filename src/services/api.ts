import {
  AdminAuthStatus,
  Campaign,
  CheckoutPaymentStatus,
  CheckoutPreferenceResponse,
  Reward,
  SupporterMessage,
  SiteSettings,
  Product,
  Membership
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
  getPaymentStatus: async (paymentId: string): Promise<CheckoutPaymentStatus> => {
    const res = await fetch(`${API_URL}/checkout/status/${paymentId}`);
    if (!res.ok) throw new Error('Failed to fetch payment status');
    return res.json();
  }
};
