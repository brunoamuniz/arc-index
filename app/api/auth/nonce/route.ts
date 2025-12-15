import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Store nonces in memory (in production, use Redis or similar)
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

const NONCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes (increased from 5 to give users more time)

export async function GET() {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + NONCE_EXPIRY_MS;
  
  // Store nonce (in production, use Redis with expiry)
  nonces.set(nonce, { nonce, expiresAt });
  
  // Clean up expired nonces
  for (const [key, value] of nonces.entries()) {
    if (value.expiresAt < Date.now()) {
      nonces.delete(key);
    }
  }

  return NextResponse.json({ nonce });
}

export function verifyNonce(nonce: string): boolean {
  const stored = nonces.get(nonce);
  if (!stored) {
    return false;
  }
  
  if (stored.expiresAt < Date.now()) {
    nonces.delete(nonce);
    return false;
  }
  
  // Delete nonce after use (one-time use)
  nonces.delete(nonce);
  return true;
}

