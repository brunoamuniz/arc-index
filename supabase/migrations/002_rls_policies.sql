-- Enable Row Level Security (only if tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_profiles') THEN
    ALTER TABLE arcindex_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_projects') THEN
    ALTER TABLE arcindex_projects ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_submissions') THEN
    ALTER TABLE arcindex_submissions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_ratings') THEN
    ALTER TABLE arcindex_ratings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_ratings_agg') THEN
    ALTER TABLE arcindex_ratings_agg ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_fundings') THEN
    ALTER TABLE arcindex_fundings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_funding_agg') THEN
    ALTER TABLE arcindex_funding_agg ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'arcindex_chain_events') THEN
    ALTER TABLE arcindex_chain_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Helper function to get current wallet from JWT
CREATE OR REPLACE FUNCTION wallet_address()
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(COALESCE(
    current_setting('request.jwt.claims', true)::json->>'wallet_address',
    ''
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is curator or admin
CREATE OR REPLACE FUNCTION is_curator_or_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  current_wallet TEXT;
BEGIN
  current_wallet := wallet_address();
  
  SELECT role INTO user_role_val
  FROM arcindex_profiles
  WHERE wallet_address = current_wallet;
  
  RETURN COALESCE(user_role_val IN ('curator', 'admin'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON arcindex_profiles;
DROP POLICY IF EXISTS "Curators and admins can view all profiles" ON arcindex_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON arcindex_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON arcindex_profiles;

CREATE POLICY "Users can view their own profile"
  ON arcindex_profiles FOR SELECT
  USING (wallet_address = wallet_address());

CREATE POLICY "Curators and admins can view all profiles"
  ON arcindex_profiles FOR SELECT
  USING (is_curator_or_admin());

CREATE POLICY "Users can insert their own profile"
  ON arcindex_profiles FOR INSERT
  WITH CHECK (LOWER(wallet_address) = wallet_address());

CREATE POLICY "Users can update their own profile"
  ON arcindex_profiles FOR UPDATE
  USING (wallet_address = wallet_address());

-- Projects RLS Policies
DROP POLICY IF EXISTS "Public can view approved projects" ON arcindex_projects;
DROP POLICY IF EXISTS "Owners can view their own projects" ON arcindex_projects;
DROP POLICY IF EXISTS "Curators and admins can view all projects" ON arcindex_projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON arcindex_projects;
DROP POLICY IF EXISTS "Owners can update draft or rejected projects" ON arcindex_projects;
DROP POLICY IF EXISTS "Curators and admins can update project status" ON arcindex_projects;

CREATE POLICY "Public can view approved projects"
  ON arcindex_projects FOR SELECT
  USING (status = 'Approved');

CREATE POLICY "Owners can view their own projects"
  ON arcindex_projects FOR SELECT
  USING (owner_wallet = wallet_address());

CREATE POLICY "Curators and admins can view all projects"
  ON arcindex_projects FOR SELECT
  USING (is_curator_or_admin());

CREATE POLICY "Authenticated users can create projects"
  ON arcindex_projects FOR INSERT
  WITH CHECK (
    wallet_address() != '' AND
    LOWER(owner_wallet) = wallet_address()
  );

CREATE POLICY "Owners can update draft or rejected projects"
  ON arcindex_projects FOR UPDATE
  USING (
    owner_wallet = wallet_address() AND
    status IN ('Draft', 'Rejected')
  );

CREATE POLICY "Curators and admins can update project status"
  ON arcindex_projects FOR UPDATE
  USING (is_curator_or_admin());

-- Submissions RLS Policies
DROP POLICY IF EXISTS "Owners can view their project submissions" ON arcindex_submissions;
DROP POLICY IF EXISTS "Curators and admins can view all submissions" ON arcindex_submissions;
DROP POLICY IF EXISTS "Owners can create submissions for their projects" ON arcindex_submissions;
DROP POLICY IF EXISTS "Curators and admins can update submissions" ON arcindex_submissions;

CREATE POLICY "Owners can view their project submissions"
  ON arcindex_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM arcindex_projects
      WHERE arcindex_projects.id = arcindex_submissions.project_id
      AND arcindex_projects.owner_wallet = wallet_address()
    )
  );

CREATE POLICY "Curators and admins can view all submissions"
  ON arcindex_submissions FOR SELECT
  USING (is_curator_or_admin());

CREATE POLICY "Owners can create submissions for their projects"
  ON arcindex_submissions FOR INSERT
  WITH CHECK (
    wallet_address() != '' AND
    LOWER(submitted_by) = wallet_address() AND
    EXISTS (
      SELECT 1 FROM arcindex_projects
      WHERE arcindex_projects.id = arcindex_submissions.project_id
      AND arcindex_projects.owner_wallet = wallet_address()
    )
  );

CREATE POLICY "Curators and admins can update submissions"
  ON arcindex_submissions FOR UPDATE
  USING (is_curator_or_admin());

-- Ratings RLS Policies
DROP POLICY IF EXISTS "Public can view ratings" ON arcindex_ratings;
DROP POLICY IF EXISTS "Authenticated users can insert their own ratings" ON arcindex_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON arcindex_ratings;

CREATE POLICY "Public can view ratings"
  ON arcindex_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own ratings"
  ON arcindex_ratings FOR INSERT
  WITH CHECK (
    wallet_address() != '' AND
    LOWER(rater) = wallet_address()
  );

CREATE POLICY "Users can update their own ratings"
  ON arcindex_ratings FOR UPDATE
  USING (LOWER(rater) = wallet_address());

-- Ratings Agg RLS Policies
DROP POLICY IF EXISTS "Public can view rating aggregates" ON arcindex_ratings_agg;
CREATE POLICY "Public can view rating aggregates"
  ON arcindex_ratings_agg FOR SELECT
  USING (true);

-- Fundings RLS Policies
DROP POLICY IF EXISTS "Public can view fundings" ON arcindex_fundings;
CREATE POLICY "Public can view fundings"
  ON arcindex_fundings FOR SELECT
  USING (true);

-- Funding Agg RLS Policies
DROP POLICY IF EXISTS "Public can view funding aggregates" ON arcindex_funding_agg;
CREATE POLICY "Public can view funding aggregates"
  ON arcindex_funding_agg FOR SELECT
  USING (true);

-- Chain Events RLS Policies
-- Only service role can access (handled by service role key, not RLS)
