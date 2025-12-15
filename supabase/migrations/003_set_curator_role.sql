-- Set curator/admin role for specific wallets
-- This migration sets the role for wallets specified in CURATOR_WALLETS env var
-- Run this after creating profiles for curator wallets

-- Example: Set role to 'curator' for the deployer wallet
-- Replace with actual curator wallet addresses
UPDATE arcindex_profiles
SET role = 'curator'
WHERE wallet_address = LOWER('0xCa64ddA1Cf192Ac11336DCE42367bE0099eca343')
  AND role = 'user';

-- If you want to set as admin instead, use:
-- UPDATE arcindex_profiles
-- SET role = 'admin'
-- WHERE wallet_address = LOWER('0xCa64ddA1Cf192Ac11336DCE42367bE0099eca343')
--   AND role = 'user';

-- Verify the update
SELECT wallet_address, role, created_at
FROM arcindex_profiles
WHERE wallet_address = LOWER('0xCa64ddA1Cf192Ac11336DCE42367bE0099eca343');

