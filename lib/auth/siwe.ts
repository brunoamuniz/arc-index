import { recoverMessageAddress } from 'viem';
import type { Address } from 'viem';

export interface SIWEMessage {
  domain: string;
  address: Address;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

export function createSIWEMessage(params: {
  domain: string;
  address: Address;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
}): string {
  const { domain, address, statement, uri, version, chainId, nonce } = params;
  const issuedAt = new Date().toISOString();

  let message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\n`;
  
  if (statement) {
    message += `${statement}\n\n`;
  }
  
  message += `URI: ${uri}\n`;
  message += `Version: ${version}\n`;
  message += `Chain ID: ${chainId}\n`;
  message += `Nonce: ${nonce}\n`;
  message += `Issued At: ${issuedAt}`;

  return message;
}

export async function verifySIWESignature(
  message: string,
  signature: `0x${string}`,
  address: Address
): Promise<boolean> {
  try {
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature,
    });
    
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

