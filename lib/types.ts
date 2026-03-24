export interface Album {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  price_album: number;
  price_single: number;
  published: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  title: string | null;
  storage_path: string;
  watermarked_path: string | null;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  email: string;
  album_id: string | null;
  photo_id: string | null;
  purchase_type: 'single' | 'album';
  amount_paid: number;
  promo_code: string | null;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  download_token: string;
  token_expires_at: string;
  download_count: number;
  fulfilled: boolean;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CartItem {
  type: 'single' | 'album';
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  photoId?: string;
  photoTitle?: string;
  price: number;
}
