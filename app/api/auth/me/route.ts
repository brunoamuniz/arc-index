import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getProfile } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Get profile from database to get current role
    const profile = await getProfile(session.walletAddress);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      walletAddress: profile.wallet_address,
      role: profile.role,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

