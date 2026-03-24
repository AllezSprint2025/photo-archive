CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS albums (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  cover_image_url TEXT,
  price_album     INTEGER NOT NULL DEFAULT 4999,
  price_single    INTEGER NOT NULL DEFAULT 999,
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id         UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  title            TEXT,
  storage_path     TEXT NOT NULL,
  watermarked_path TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses         INTEGER,
  use_count        INTEGER NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                  TEXT NOT NULL,
  album_id               UUID REFERENCES albums(id),
  photo_id               UUID REFERENCES photos(id),
  purchase_type          TEXT NOT NULL CHECK (purchase_type IN ('single', 'album')),
  amount_paid            INTEGER NOT NULL,
  promo_code             TEXT,
  stripe_session_id      TEXT NOT NULL UNIQUE,
  stripe_payment_intent  TEXT,
  download_token         TEXT NOT NULL UNIQUE,
  token_expires_at       TIMESTAMPTZ NOT NULL,
  download_count         INTEGER NOT NULL DEFAULT 0,
  fulfilled              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_promo_use(promo_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE promo_codes SET use_count = use_count + 1 WHERE code = promo_code AND active = TRUE;
END;
$$;

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published albums" ON albums FOR SELECT USING (published = TRUE);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read photos" ON photos FOR SELECT USING (TRUE);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
