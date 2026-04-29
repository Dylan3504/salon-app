CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  service_id INTEGER NOT NULL REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS works (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  customer_name TEXT,
  notes TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  completed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_label TEXT NOT NULL,
  starts_on DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
