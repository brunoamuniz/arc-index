-- Migration to check for existing tables before creating new ones
-- This is safe to run on a shared database

-- Check what tables already exist
DO $$ 
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Log existing tables (for debugging)
    RAISE NOTICE 'Checking for existing Arc Index tables...';
    
    -- Check each table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Table "profiles" already exists - will use IF NOT EXISTS';
    ELSE
        RAISE NOTICE 'Table "profiles" does not exist - will be created';
    END IF;
    
    -- Similar checks for other tables...
    -- (This is just for logging, actual creation uses IF NOT EXISTS)
END $$;

