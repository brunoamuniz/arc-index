import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySIWESignature, createSIWEMessage } from '@/lib/auth/siwe';
import { getOrCreateProfile } from '@/lib/supabase/auth';
import { verifyNonce } from '../nonce/route';
import type { Address } from 'viem';

const verifySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string(),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
  nonce: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, message, signature, nonce } = verifySchema.parse(body);

    // Verify nonce
    if (!verifyNonce(nonce)) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    // Verify signature
    const isValid = await verifySIWESignature(
      message,
      signature as `0x${string}`,
      walletAddress as Address
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get or create profile
    const profile = await getOrCreateProfile(walletAddress);

    // Create session (in production, use proper JWT or session management)
    // For MVP, we'll return a simple token that the client can use
    const sessionToken = Buffer.from(
      JSON.stringify({
        walletAddress: profile.wallet_address,
        role: profile.role,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      })
    ).toString('base64');

    const response = NextResponse.json({
      success: true,
      profile: {
        walletAddress: profile.wallet_address,
        role: profile.role,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('arc-index-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Auth verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

