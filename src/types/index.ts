export type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived';

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

export interface Idea {
  id: string;
  title: string;
  description: string;
  url: string;
  coverImage?: string | null;
  category?: string | null;
  tags?: string[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
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
  darkModeDefault: boolean;
  visibleSections: string[];
  highlightedCampaignId?: string;
  supportAmountsSuggested: number[];
  legalText: string;
  content: PublicContentSettings;
  discordWebhookUrl?: string;
  availabilityStatus?: 'available' | 'busy';
}

export interface HomeHeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface HomeSupportModeContent {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export interface HomeDiscoveryCardContent {
  title: string;
  description: string;
  href: string;
}

export interface HomeSectionContent {
  supportEyebrow: string;
  supportTitle: string;
  supportSubtitle: string;
  rewardsEyebrow: string;
  rewardsTitle: string;
  rewardsSubtitle: string;
  discoveryEyebrow: string;
  discoveryTitle: string;
  discoverySubtitle: string;
}

export interface HomeSupportOfferItemContent {
  amount: number;
  label: string;
  benefit: string;
}

export interface HomeSupportOfferContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: HomeSupportOfferItemContent[];
}

export interface HomeFeaturedMissionContent {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface HomeCourseItemContent {
  badge: string;
  status: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface HomeCoursesContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: HomeCourseItemContent[];
}

export interface HomeMusicVideoContent {
  title: string;
  youtubeUrl: string;
}

export interface HomeMusicTrackContent {
  category: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverImage: string;
  accentColor: string;
}

export interface HomeMusicContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  featuredText: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeChannelUrl: string;
  tracks: HomeMusicTrackContent[];
  videos: HomeMusicVideoContent[];
}

export interface HomeCommunityContent {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface CheckoutCopy {
  title: string;
  subtitle: string;
  encargoTitle: string;
  encargoDescription: string;
}

export interface PortfolioCopy {
  heroTitle: string;
  heroSubtitle: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
}

export interface VipCopy {
  title: string;
  subtitle: string;
}

export interface HomeContentSettings {
  hero: HomeHeroContent;
  supportOffer: HomeSupportOfferContent;
  featuredMission: HomeFeaturedMissionContent;
  supportModes: HomeSupportModeContent[];
  discoveryCards: HomeDiscoveryCardContent[];
  sections: HomeSectionContent;
  courses: HomeCoursesContent;
  music: HomeMusicContent;
  community: HomeCommunityContent;
}

export interface PublicContentSettings {
  home: HomeContentSettings;
  checkout: {
    copy: CheckoutCopy;
  };
  portfolio: {
    copy: PortfolioCopy;
  };
  vip: {
    copy: VipCopy;
  };
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

export interface CheckoutPreferenceResponse {
  init_point?: string;
  sandbox_init_point?: string;
}

export interface CheckoutPaymentStatus {
  id?: number;
  status?: string;
  statusDetail?: string;
  amount?: number;
  currency?: string;
  processed?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  totalContributed: number;
  unlockedRewards: string[];
  badges: string[];
  purchases: Purchase[];
}

export interface AdminAuthStatus {
  hasAdmin: boolean;
  bootstrapAvailable: boolean;
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
