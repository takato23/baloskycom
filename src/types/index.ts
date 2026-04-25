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
  /**
   * Mensaje anclado que aparece arriba del feed del muro (Delirio home).
   * Si `enabled` es false o el objeto está ausente, no se muestra.
   */
  pinnedMessage?: {
    enabled: boolean;
    author: string;
    text: string;
  };
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

// ===== MEDIA (video_ia, foto, wallpaper, cancion, panorama_360) =====
export type MediaKind = 'video_ia' | 'foto' | 'wallpaper' | 'cancion' | 'panorama_360';

export interface Media {
  id: string;
  kind: MediaKind;
  title: string;
  description?: string | null;
  category?: string | null;
  /** Hard-hide from non-members in public media endpoints. */
  isMemberOnly?: boolean;
  /** Direct-hosted media URL (e.g. uploaded .mp3, .mp4). */
  mediaUrl?: string | null;
  /**
   * External embed URL for `cancion` — Spotify track, YouTube video, or Apple
   * Music song. When present, the frontend prefers the platform embed over
   * the native player so plays count toward real streaming metrics.
   */
  embedUrl?: string | null;
  thumbUrl?: string | null;
  coverImage?: string | null;
  duration?: string | null;
  /**
   * AI tool/model used to generate the piece (video_ia). Examples: "Sora",
   * "Veo 3", "Runway Gen-3", "Kling", "Midjourney". Optional.
   */
  aiTool?: string | null;
  /**
   * The prompt used to generate the piece (video_ia). Shown on the
   * laboratorio page for transparency. Optional.
   */
  aiPrompt?: string | null;
  /** Images/references used to build a video_ia piece. Shown as an asset wall in Laboratorio. */
  assetUrls?: string[];
  /**
   * Aspect ratio hint for the laboratorio grid. When all visible items share
   * one ratio the grid uses it; when mixed, the grid falls back to 1:1 so
   * nothing gets cropped aggressively.
   */
  aspectRatio?: '9:16' | '16:9' | '1:1' | null;
  /** When false, hides the description in the public card/modal. */
  showDescription?: boolean;
  /** When false, hides the AI prompt block in the public modal. */
  showPrompt?: boolean;
  /** When false, hides the AI tool chip in the public card/modal. */
  showTool?: boolean;
  isLocked: boolean;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  /**
   * Early-drop timestamp (ISO). Cuando existe y todavía no pasó, el item
   * es "adelanto para Baloskiers": lo ven los miembros, pero para el
   * público general el mediaUrl viene redacted y se marca como locked.
   * Cuando el timestamp pasa, queda visible para todos automáticamente.
   * null = item normal (sin ventana early), se rige sólo por isLocked.
   */
  publicFrom?: string | null;
  /**
   * Derived flag set por el backend — indica que el item está en su
   * ventana early (`publicFrom > now`). Sólo de lectura desde el cliente.
   */
  isEarlyDrop?: boolean;
}

// ===== SOCIALS =====
export interface Social {
  id: string;
  platform: string;
  name: string;
  handle: string;
  url: string;
  icon?: string | null;
  colorFrom?: string | null;
  colorTo?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
}

// ===== NEWSLETTER =====
export interface NewsletterSubscriber {
  id: string;
  email: string;
  source?: string | null;
  active: boolean;
  createdAt: string;
}

export interface UploadResult {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}
