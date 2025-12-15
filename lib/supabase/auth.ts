import { supabaseAdmin, isSupabaseConfigured } from './server';
import type { Profile, UserRole } from '@/packages/shared';

export async function getOrCreateProfile(walletAddress: string): Promise<Profile> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    throw new Error('Database not configured. Please check your environment variables.');
  }

  const normalized = walletAddress.toLowerCase();
  
  // Check if profile exists
  const { data: existing } = await supabaseAdmin!
    .from('arcindex_profiles')
    .select('*')
    .eq('wallet_address', normalized)
    .single();

  if (existing) {
    return existing as Profile;
  }

  // Create new profile
  const { data: profile, error } = await supabaseAdmin!
    .from('arcindex_profiles')
    .insert({
      wallet_address: normalized,
      role: 'user',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return profile as Profile;
}

export async function getProfile(walletAddress: string): Promise<Profile | null> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return null;
  }

  const normalized = walletAddress.toLowerCase();
  
  const { data, error } = await supabaseAdmin!
    .from('arcindex_profiles')
    .select('*')
    .eq('wallet_address', normalized)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function isCuratorOrAdmin(walletAddress: string): Promise<boolean> {
  const profile = await getProfile(walletAddress);
  return profile?.role === 'curator' || profile?.role === 'admin';
}

export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase();
}

