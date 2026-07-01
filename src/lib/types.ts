export interface Plate {
  plate_id: number;
  subscription_id: number | null;
  plate_number: string;
  plate_language: string;
  number_of_visits: number;
  secret_key: string;
  nfc_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  subscription_id: number;
  customer_id: number;
  subscription_name: string;
  duration_in_days: number;
  is_free: boolean;
  activation_datetime: string | null;
  expiration_datetime: string | null;
  status: "pending" | "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CustomerLocation {
  location_id: number;
  subscription_id: number;
  location_name: string;
  google_business_name: string | null;
  google_business_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  google_review_link: string | null;
  google_places_id: string | null;
  support_email: string | null;
  logo_path: string | null;
  logo_link: string | null;
  linktree_slug: string | null;
  linktree_visits: number;
  has_linktree_access: boolean;
  has_promo_enabled: boolean;
  has_loyalty_enabled: boolean;
  promo_description: string | null;
  promo_banner_text: string | null;
  promo_sms_text: string | null;
  scan_redirect_mode: "review" | "linktree";
  owner_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  review_id: number;
  plate_id: number;
  scan_id: string;
  scan_time: string;
  rating: number | null;
  rating_time: string | null;
  feedback_message: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  user_name: string | null;
  feedback_time: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyCard {
  id: number;
  location_id: number;
  phone: string;
  stamps_count: number;
  last_stamp_at: string | null;
}

export interface CustomerLocationLink {
  id: number;
  customer_location_id: number;
  title: string;
  title_pl: string | null;
  title_en: string | null;
  title_de: string | null;
  url: string;
  sort_order: number;
}

export interface LoyaltyOtp {
  location_id: number;
  phone: string;
  otp_code: string;
  expires_at: string;
}

export interface Customer {
  customer_id: number;
  customer_type: "business" | "individual";
  source: string;
  company_name: string | null;
  tax_id: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  preferred_language: "en" | "de" | "pl";
  country: string | null;
  activation_token: string | null;
  is_activated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  order_id: number;
  customer_id: number;
  status: "pending" | "paid" | "cancelled";
  payment_method: "stripe" | "bank_transfer" | "cash" | null;
  stripe_payment_id: string | null;
  stripe_payment_intent_id: string | null;
  internal_payment_reference: string | null;
  created_at: string;
  fulfilled_at: string | null;
}

export interface LocationLead {
  id: number;
  location_id: number;
  phone: string;
  email: string | null;
  agreed_to_terms: boolean;
  claim_token: string;
  coupon_code: string | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface ScanToken {
  id: number;
  location_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Product {
  product_id: number;
  category: "subscription" | "plate" | "shipping";
  name: string;
  description: string | null;
  is_free: boolean;
  price: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
}

export interface Shipment {
  id: number;
  order_id: number;
  number_of_plates: number | null;
  tracking_number: string | null;
  carrier: string | null;
  shipping_status: "pending" | "shipped" | "delivered" | "cancelled";
  batch_label: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  shipping_cost: number | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}
