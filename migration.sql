-- Q-Intel — Supabase migration for Qumulo Sales Intelligence
-- Run this in the Supabase SQL Editor against a fresh project.
-- Table prefix `q_` to avoid collision with any prior StarIntel project.

-- Signal feed cache (full company list snapshots)
CREATE TABLE IF NOT EXISTS q_feed_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  companies jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_q_feed_cache_fetched ON q_feed_cache(fetched_at DESC);

-- Company intel cache (deep analysis per company)
CREATE TABLE IF NOT EXISTS q_company_intel (
  company text PRIMARY KEY,
  vertical_id text,
  vertical_label text,
  urgency text,
  top_signal text,
  why_qumulo text,
  amount text,
  signal_count int DEFAULT 1,
  intel jsonb,
  last_analyzed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Signal timeline (every unique signal per company, deduplicated)
CREATE TABLE IF NOT EXISTS q_signal_timeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company text NOT NULL,
  signal_type text,
  urgency text,
  signal_text text NOT NULL,
  signal_date text,
  first_seen_at timestamptz DEFAULT now(),
  UNIQUE(company, signal_text)
);
CREATE INDEX IF NOT EXISTS idx_q_timeline_company ON q_signal_timeline(company, first_seen_at DESC);

-- MEDDPICC deal qualification
CREATE TABLE IF NOT EXISTS q_meddpicc_deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_name text NOT NULL,
  account text,
  metrics text DEFAULT '',
  economic_buyer text DEFAULT '',
  decision_criteria text DEFAULT '',
  decision_process text DEFAULT '',
  paper_process text DEFAULT '',
  identify_pain text DEFAULT '',
  champion text DEFAULT '',
  competition text DEFAULT '',
  scores jsonb DEFAULT '{}',
  ai_coaching jsonb DEFAULT '{}',
  overall_score int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Territory plan accounts. `qumulo_fit` and `displacement_story` replace
-- the old stardog_fit/data_challenge naming; `incumbent` captures the legacy
-- vendor we are displacing.
CREATE TABLE IF NOT EXISTS q_territory_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company text NOT NULL,
  vertical text,
  revenue text,
  state text,
  city text,
  incumbent text,
  data_challenge text,
  qumulo_fit text,
  displacement_story text,
  entry_strategy text,
  key_personas text,
  est_acv text,
  priority int DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Cleanup function for old feed caches
CREATE OR REPLACE FUNCTION q_cleanup_old_caches()
RETURNS void AS $$
BEGIN
  DELETE FROM q_feed_cache WHERE fetched_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- Account Planning (contact mapping, role coverage, account intel)
-- Tenant scaffold: hardcoded single tenant for MVP, real auth later.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS q_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES q_territory_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_q_contacts_account ON q_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_q_contacts_tenant ON q_contacts(tenant_id);

CREATE TABLE IF NOT EXISTS q_contact_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES q_contacts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES q_territory_accounts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Unknown'
    CHECK (role IN ('Economic Buyer','Champion','Technical Buyer','Business User',
                    'Executive Sponsor','Financial Approver','Legal Reviewer',
                    'Security Reviewer','Influencer','Blocker','Unknown')),
  influence int NOT NULL DEFAULT 3 CHECK (influence BETWEEN 1 AND 5),
  stance text NOT NULL DEFAULT 'Unknown'
    CHECK (stance IN ('Champion','Supporter','Neutral','Skeptic','Blocker','Unknown')),
  is_ai_suggested boolean NOT NULL DEFAULT false,
  ai_confidence real,
  last_touch timestamptz,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);
CREATE INDEX IF NOT EXISTS idx_q_contact_roles_account ON q_contact_roles(account_id);
CREATE INDEX IF NOT EXISTS idx_q_contact_roles_tenant ON q_contact_roles(tenant_id);

CREATE TABLE IF NOT EXISTS q_account_plans (
  account_id uuid PRIMARY KEY REFERENCES q_territory_accounts(id) ON DELETE CASCADE,
  coverage_score int NOT NULL DEFAULT 0 CHECK (coverage_score BETWEEN 0 AND 100),
  intel_brief text NOT NULL DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  last_updated timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_q_account_plans_tenant ON q_account_plans(tenant_id);

ALTER TABLE q_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE q_contact_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE q_account_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_contacts ON q_contacts;
DROP POLICY IF EXISTS tenant_isolation_contact_roles ON q_contact_roles;
DROP POLICY IF EXISTS tenant_isolation_account_plans ON q_account_plans;

CREATE POLICY tenant_isolation_contacts ON q_contacts
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY tenant_isolation_contact_roles ON q_contact_roles
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY tenant_isolation_account_plans ON q_account_plans
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);
