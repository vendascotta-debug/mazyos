-- Prospecta — schema do Postgres (Supabase).
-- Opcional: a aplicação cria isso sozinha no primeiro acesso (ensureSchema).
-- Cole no SQL Editor do Supabase se preferir criar tudo antes de subir o app.
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  segment_slug TEXT NOT NULL,
  subsegment_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  cnpj TEXT,
  street TEXT, number TEXT, neighborhood TEXT, city TEXT, uf TEXT, zip TEXT,
  lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  phone TEXT, whatsapp TEXT, email TEXT, website TEXT, instagram TEXT,
  rating DOUBLE PRECISION, reviews_count INTEGER, price_level INTEGER,
  employees_range TEXT, units_count INTEGER DEFAULT 1,
  opened_at TEXT, capital_social DOUBLE PRECISION, porte TEXT, situacao TEXT,
  cnae_principal TEXT, cnae_principal_desc TEXT,
  cnae_secundarios TEXT DEFAULT '[]',
  delivery_apps TEXT DEFAULT '[]',
  hours TEXT,
  sources TEXT DEFAULT '[]',
  public_records TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_seg ON companies(segment_slug, subsegment_slug);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city, neighborhood);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'novo',
  score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'C',
  note TEXT,
  estimated_value DOUBLE PRECISION,
  owner_name TEXT,
  last_contact_at TEXT,
  next_action_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE TABLE IF NOT EXISTS lead_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_list_items (
  list_id TEXT NOT NULL REFERENCES lead_lists(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (list_id, lead_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id, created_at);

CREATE TABLE IF NOT EXISTS contacts_confirmed (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_maker_id TEXT NOT NULL,
  name TEXT, role TEXT, phone TEXT, email TEXT, linkedin TEXT,
  confirmed_at TEXT NOT NULL
);
