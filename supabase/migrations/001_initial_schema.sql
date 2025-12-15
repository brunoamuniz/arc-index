-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'curator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('Submitted', 'Approved', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role user_role NOT NULL DEFAULT 'user',
  CONSTRAINT wallet_address_lowercase CHECK (wallet_address = LOWER(wallet_address))
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_profiles_wallet ON arcindex_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_arcindex_profiles_role ON arcindex_profiles(role);

-- Projects table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT UNIQUE, -- on-chain projectId
  owner_wallet TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'Draft',
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  x_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  discord_url TEXT,
  website_url TEXT,
  contracts_json JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  image_thumb_url TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  latest_submission_id UUID,
  nft_token_id BIGINT,
  nft_contract_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT owner_wallet_lowercase CHECK (owner_wallet = LOWER(owner_wallet))
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_owner ON arcindex_projects(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_status ON arcindex_projects(status);
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_category ON arcindex_projects(category);
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_chain_id ON arcindex_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_created ON arcindex_projects(created_at DESC);

-- Submissions table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES arcindex_projects(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status submission_status NOT NULL DEFAULT 'Submitted',
  review_reason_code TEXT,
  review_reason_text TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT submitted_by_lowercase CHECK (submitted_by = LOWER(submitted_by)),
  CONSTRAINT reviewed_by_lowercase CHECK (reviewed_by IS NULL OR reviewed_by = LOWER(reviewed_by))
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_submissions_project ON arcindex_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_arcindex_submissions_status ON arcindex_submissions(status);
CREATE INDEX IF NOT EXISTS idx_arcindex_submissions_submitted_at ON arcindex_submissions(submitted_at DESC);

-- Ratings table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_ratings (
  project_id UUID NOT NULL REFERENCES arcindex_projects(id) ON DELETE CASCADE,
  rater TEXT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, rater),
  CONSTRAINT rater_lowercase CHECK (rater = LOWER(rater))
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_ratings_project ON arcindex_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_arcindex_ratings_rater ON arcindex_ratings(rater);

-- Ratings aggregate table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_ratings_agg (
  project_id UUID PRIMARY KEY REFERENCES arcindex_projects(id) ON DELETE CASCADE,
  avg_stars NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (avg_stars >= 0 AND avg_stars <= 5),
  ratings_count INT NOT NULL DEFAULT 0 CHECK (ratings_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fundings table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES arcindex_projects(id) ON DELETE CASCADE,
  funder TEXT NOT NULL,
  amount_usdc NUMERIC(18,6) NOT NULL CHECK (amount_usdc > 0),
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT funder_lowercase CHECK (funder = LOWER(funder))
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_fundings_project ON arcindex_fundings(project_id);
CREATE INDEX IF NOT EXISTS idx_arcindex_fundings_funder ON arcindex_fundings(funder);
CREATE INDEX IF NOT EXISTS idx_arcindex_fundings_tx_hash ON arcindex_fundings(tx_hash);

-- Funding aggregate table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_funding_agg (
  project_id UUID PRIMARY KEY REFERENCES arcindex_projects(id) ON DELETE CASCADE,
  total_usdc NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (total_usdc >= 0),
  funding_count INT NOT NULL DEFAULT 0 CHECK (funding_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chain events table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS arcindex_chain_events (
  id BIGSERIAL PRIMARY KEY,
  chain_id INT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INT NOT NULL,
  event_name TEXT NOT NULL,
  project_chain_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  block_number BIGINT,
  block_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (chain_id, tx_hash, log_index)
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_arcindex_chain_events_project ON arcindex_chain_events(project_chain_id);
CREATE INDEX IF NOT EXISTS idx_arcindex_chain_events_event ON arcindex_chain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_arcindex_chain_events_block ON arcindex_chain_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_arcindex_chain_events_tx ON arcindex_chain_events(tx_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_arcindex_projects_updated_at ON arcindex_projects;
CREATE TRIGGER update_arcindex_projects_updated_at
  BEFORE UPDATE ON arcindex_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_arcindex_ratings_agg_updated_at ON arcindex_ratings_agg;
CREATE TRIGGER update_arcindex_ratings_agg_updated_at
  BEFORE UPDATE ON arcindex_ratings_agg
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_arcindex_funding_agg_updated_at ON arcindex_funding_agg;
CREATE TRIGGER update_arcindex_funding_agg_updated_at
  BEFORE UPDATE ON arcindex_funding_agg
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

