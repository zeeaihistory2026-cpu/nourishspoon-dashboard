/**
 * Shared types. Production shapes mirror the Nourish Spoon app's Firestore
 * schema (see src/types in the app repo). Admin-only additions are marked.
 */

export type ISODate = string;

export interface ProductVariant {
  label: string;
  price: number;
  compareAtPrice?: number;
  per100g?: string;
}

export interface ProductBenefit {
  icon: "droplet" | "sprout" | "wheat" | "sparkles" | "leaf" | "jar" | "bowl" | "shield";
  label: string;
}

export interface Ingredient {
  name: string;
  emoji?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  variants: ProductVariant[];
  weight: string;
  stock: number | null;
  images: string[];
  ingredients: Ingredient[];
  benefits: ProductBenefit[];
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: ISODate | null;
  updatedAt?: ISODate | null;
  /** admin-only */
  deletedAt?: ISODate | null;
  updatedBy?: string;
  createdBy?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  weight: string;
  image: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number | null;
  deliveryMethod: string;
  trackingNumber: string;
  quotePending: boolean;
  discount?: number;
  total: number | null;
  paymentMethod: "bank_transfer" | "easypaisa" | "jazzcash";
  paymentStatus: "awaiting_payment" | "submitted" | "paid" | "refunded";
  orderStatus: OrderStatus;
  shippingAddress: {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    city: string;
  };
  createdAt?: ISODate | null;
  updatedAt?: ISODate | null;
}

export interface OrderEvent {
  id: string;
  from?: OrderStatus | string;
  to: string;
  note?: string;
  by: string;
  byEmail?: string;
  at: ISODate;
}

export interface TrackingMilestone {
  key: string;
  label: string;
  at?: ISODate | null;
  by?: string;
}

export interface TrackingRecord {
  id: string; // order id
  orderId: string;
  orderNumber: string;
  customerName?: string;
  trackingNumber: string;
  carrier?: string;
  current: string;
  milestones: TrackingMilestone[];
  updatedAt?: ISODate | null;
  updatedBy?: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  city?: string;
  role: "customer" | "staff" | "admin";
  points?: number;
  createdAt?: ISODate | null;
  updatedAt?: ISODate | null;
  disabled?: boolean;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  isDefault: boolean;
}

export interface WishlistItem {
  id: string;
  itemId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  productId: string;
  productName?: string;
  productImage?: string;
  addedAt?: ISODate | null;
}

export type ReviewVisibility = "visible" | "hidden" | "featured" | "removed";

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  userId: string;
  userName: string;
  city?: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  visibility?: ReviewVisibility;
  moderatedBy?: string;
  moderatedAt?: ISODate | null;
  createdAt?: ISODate | null;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  isActive: boolean;
  minSubtotal?: number;
  expiresAt?: ISODate | null;
  usageCount?: number;
  createdAt?: ISODate | null;
  updatedAt?: ISODate | null;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  userName?: string;
  delta: number;
  reason: string;
  by: string;
  byEmail?: string;
  at: ISODate;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerName?: string;
  referredId?: string;
  referredName?: string;
  code?: string;
  status: "pending" | "completed" | "rewarded" | "reversed";
  rewardState?: string;
  rewardAmount?: number;
  createdAt?: ISODate | null;
  updatedAt?: ISODate | null;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  audience: "all" | "segment";
  segment?: string;
  status: "draft" | "sent" | "archived";
  createdBy: string;
  createdByEmail?: string;
  createdAt?: ISODate | null;
  sentAt?: ISODate | null;
  sentCount?: number;
  failedCount?: number;
}

export interface PaymentMethodRecord {
  id: string;
  title: string;
  icon?: string;
  instructions: string;
  accountDetails?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DeliveryInfo {
  id: string;
  title: string;
  description: string;
  icon?: string;
  charge?: number;
  freeAbove?: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface StorySection {
  heading?: string;
  body: string;
  imageUrl?: string;
}

export interface HomeContent {
  hero: {
    heading: string;
    copy: string;
    ctaLabel: string;
    ctaDestination: string;
    imageUrl?: string;
    isActive: boolean;
  };
  bestSellerIds: string[];
  productTabs: { key: string; label: string; icon?: string; isActive: boolean }[];
  sectionOrder: string[];
  updatedAt?: ISODate | null;
  updatedBy?: string;
}

export interface DashboardStats {
  totalProducts: number;
  productsDelta: number;
  pendingOrders: number;
  pendingDelta: number;
  totalOrders: number;
  ordersDelta: number;
  revenue: number;
  revenueDelta: number;
  activeOffers: number;
  offersDelta: number;
}
