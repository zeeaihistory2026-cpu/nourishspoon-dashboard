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
  inventory_mode?: 'per_variant';
  legacy_stock?: number | null;
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

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_weight: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  product_image?: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_city: string;
  delivery_address: string;
  is_gift: boolean;
  gift_message?: string;
  payment_method_id?: string;
  payment_method_code: string;
  delivery_method_id?: string;
  delivery_method_code: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes?: string;
  whatsapp_generated_message?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
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

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  card: string;
  gold: string;
  text: string;
  mutedText: string;
  border: string;
};
