-- Add deleted_at column to projects table for soft delete
-- This allows projects to be "deleted" without actually removing them from the database

DO $$ 
BEGIN
  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'arcindex_projects' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE arcindex_projects 
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;
    
    -- Create index for filtering deleted projects
    CREATE INDEX IF NOT EXISTS idx_arcindex_projects_deleted_at 
    ON arcindex_projects(deleted_at) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

