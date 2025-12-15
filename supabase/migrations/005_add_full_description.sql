-- Add full_description column to arcindex_projects table
-- This allows storing both short description (description) and full description (full_description)

ALTER TABLE arcindex_projects 
ADD COLUMN IF NOT EXISTS full_description TEXT;

-- Update existing projects: if full_description is null, copy description to full_description
-- This ensures backward compatibility
UPDATE arcindex_projects 
SET full_description = description 
WHERE full_description IS NULL;

