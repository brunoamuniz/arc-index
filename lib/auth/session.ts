import { cookies } from 'next/headers';
import type { Profile } from '@/packages/shared';

export interface Session {
  walletAddress: string;
  role: string;
  exp: number;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('arc-index-session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session: Session = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    // Check expiry
    if (session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function requireCuratorOrAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  // Check role from database to ensure it's up-to-date
  // This allows role changes to take effect without requiring re-login
  const { getProfile } = await import('@/lib/supabase/auth');
  const profile = await getProfile(session.walletAddress);
  
  const currentRole = profile?.role || session.role;
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Role check:', {
      walletAddress: session.walletAddress,
      sessionRole: session.role,
      dbRole: profile?.role,
      currentRole,
    });
  }
  
  if (currentRole !== 'curator' && currentRole !== 'admin') {
    throw new Error('Forbidden: Curator or admin access required');
  }

  // Return session with updated role if it changed
  return {
    ...session,
    role: currentRole,
  };
}

