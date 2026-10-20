export type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  city: string;
  line: string;
  label: string;
};
export type CartLine = {
  product_id: string;
  variant_id: string;
  quantity: number;
};
export type PurchaseItem = CartLine & {
  product_name: string;
  variant_weight: string;
  unit_price: number;
  total_price: number;
};
export type Purchase = {
  id: string;
  order_number: string;
  customer_uid: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_city: string;
  delivery_address: string;
  delivery_method_code: string;
  payment_method_code: string;
  payment_status: "awaiting_payment" | "submitted" | "paid" | "refunded";
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  tracking_number: string;
  status_history?: { status: Purchase["status"]; at: string }[];
  subtotal: number;
  discount: number;
  promo_code?: string;
  promo_discount?: number;
  reward_discount?: number;
  points_redeemed?: number;
  points_earned?: number;
  delivery_fee: number | null;
  total: number | null;
  quote_pending: boolean;
  is_gift: boolean;
  gift_message: string;
  created_at: string;
  updated_at: string;
  items: PurchaseItem[];
};
export type OrderNotice = {
  id: string;
  title: string;
  body: string;
  order_id?: string;
  created_at: string;
  read: boolean;
};
