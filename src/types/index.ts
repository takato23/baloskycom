export type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ThemeId = 'brutalist' | 'minimal' | 'atmospheric' | 'cybergrid' | 'terminal';

export interface StretchGoal {
  amount: number;
  description: string;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  videoUrl?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  coverImage: string;
  status: CampaignStatus;
  isFeatured: boolean;
  sortOrder: number;
  stretchGoals?: StretchGoal[];
  createdAt: string;
  updatedAt: string;
}

export type DeliveryType = 'file' | 'link' | 'manual';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  coverImage: string;
  deliveryType: DeliveryType;
  fileUrl?: string;
  externalUrl?: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
}

export interface Membership {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  description: string;
  benefits: string[];
  isHighlighted: boolean;
  active: boolean;
  sortOrder: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  minAmount: number;
  type: 'digital' | 'physical' | 'badge';
  icon: string;
}

export interface SupporterMessage {
  id: string;
  supporterName: string;
  amount: number;
  message: string;
  creatorResponse?: string;
  isAnonymous: boolean;
  isApproved: boolean;
  createdAt: string;
  campaignId?: string;
}

export interface SiteSettings {
  creatorName: string;
  creatorBio: string;
  creatorAvatar: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCTA: string;
  secondaryCTA: string;
  socialLinks: Record<string, string>;
  defaultTheme: ThemeId;
  visibleSections: string[];
  highlightedCampaignId?: string;
  supportAmountsSuggested: number[];
  legalText: string;
  discordWebhookUrl?: string;
  availabilityStatus?: 'available' | 'busy';
}

export interface Purchase {
  id: string;
  supporterName: string;
  type: 'product' | 'membership';
  itemId: string;
  title: string;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  totalContributed: number;
  unlockedRewards: string[];
  badges: string[];
  purchases: Purchase[];
}

export type Currency = 'ARS' | 'USD' | 'CRYPTO';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  active: boolean;
  createdAt: string;
  votedUsers: string[];
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  votes: number;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  createdAt: string;
  comments: Comment[];
}

export interface Project {
  id: string;
  title: string;
  category: string;
  image: string;
  videoUrl?: string;
  demoUrl?: string;
  rating: number;
  ratingCount: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  isLocked: boolean;
  minContributionRequired: number;
  createdAt: string;
  likes: number;
  comments: Comment[];
  type?: 'standard' | 'resource' | 'ai-prompt';
  aiPrompt?: string;
  downloadUrl?: string;
}

export interface Webhook {
  id: string;
  url: string;
  event: 'new_support' | 'new_purchase';
  active: boolean;
}
