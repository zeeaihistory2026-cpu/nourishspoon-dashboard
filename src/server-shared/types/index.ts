// ==============================================================================
// NOURISH SPOON: SHARED DOMAIN & DATABASE TYPES
// ==============================================================================

export type ProductVariant = {
  id: string;
  product_id: string;
  weight: '250g' | '500g' | string;
  regular_price: number;
  sale_price: number | null;
  price_per_100g: number | null;
  stock: number | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
};

export type Ingredient = {
  id: string;
  name: string;
  slug: string;
  category?: string;
  image_url: string;
  description?: string;
};

export type NutritionFact = {
  id: string;
  product_id: string;
  label: string;
  value: number;
  unit: string;
  per_amount: string;
  sort_order: number;
};

export type Product = {
  /** Legacy inventory shared across every size of this product. */
  legacy_stock?: number | null;
  inventory_mode?: 'per_variant';
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  short_description: string;
  description: string;
  category: 'energy_balls' | 'panjeeri' | string;
  featured_image: string;
  rating: number;
  review_count: number;
  badge_label?: string;
  benefits?: string[];
  storage_instructions?: string;
  perfect_for?: string[];
  is_featured: boolean;
  active: boolean;
  sort_order: number;
  variants: ProductVariant[];
  ingredients?: Ingredient[];
  ingredient_notes?: string;
  nutrition_facts?: NutritionFact[];
};

export type PaymentMethod = {
  id: string;
  code: 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cod';
  name: string;
  subtext: string;
  account_title: string;
  account_number: string;
  bank_name?: string | null;
  iban?: string | null;
  instructions: string;
  icon?: string;
  active: boolean;
  advance_only: boolean;
  sort_order: number;
};

export type DeliveryMethod = {
  id: string;
  code: 'sargodha_sameday' | 'tcs_nationwide' | 'foodpanda_sargodha' | 'self_pickup';
  title: string;
  subtitle: string;
  description: string;
  estimated_time: string;
  fee: number | null;
  available_cities: string[];
  icon?: string;
  active: boolean;
  sort_order: number;
};

export type Review = {
  id: string;
  product_id?: string;
  customer_name: string;
  customer_avatar?: string | null;
  location: string;
  rating: number;
  comment: string;
  product_name: string;
  whatsapp_quote?: string | null;
  screenshot_url?: string | null;
  verified: boolean;
  helpful_count: number;
  status: 'approved' | 'pending' | 'hidden';
  is_featured: boolean;
  review_date: string;
};

export type FAQ = {
  id: string;
  category: 'General' | 'Products' | 'Ordering' | 'Delivery' | 'Gifting';
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
};

export type BrandIdentity = {
  name: string;
  tagline: string;
  founder: string;
  city: string;
  province: string;
  country: string;
  address: string;
  whatsapp_phone: string;
  display_phone: string;
  email: string;
  business_hours: string;
  instagram: string;
  same_day_delivery_headline: string;
  same_day_delivery_subtext: string;
};

export type FounderStory = {
  founder_name: string;
  title: string;
  location: string;
  quote: string;
  story_heading: string;
  story_body: string;
  process: Array<{ step: number; title: string; desc: string }>;
  values: Array<{ title: string; desc: string }>;
};
