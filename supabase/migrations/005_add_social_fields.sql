-- Add new social media fields to projects table
ALTER TABLE arcindex_projects
  ADD COLUMN IF NOT EXISTS x_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_x_username ON arcindex_projects(x_username);
CREATE INDEX IF NOT EXISTS idx_arcindex_projects_discord_username ON arcindex_projects(discord_username);

