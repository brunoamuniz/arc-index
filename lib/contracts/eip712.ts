// EIP-712 signature generation for curator approvals
import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainConfig, getContractAddresses } from './index';

export interface ProjectApprovalSignature {
  projectId: bigint;
  approvedOwner: Address;
  metadataURI: string;
  deadline: bigint;
  nonce: bigint;
  signature: `0x${string}`;
  signer: Address;
}

/**
 * Generate EIP-712 signature for project approval
 * @param curatorPrivateKey Private key of the curator (must have CURATOR_ROLE)
 * @param projectId Project ID (0 for new projects, existing ID for existing)
 * @param approvedOwner The owner address (NFT recipient)
 * @param metadataURI Project metadata URI
 * @param deadline Signature expiration timestamp (Unix timestamp)
 * @param nonce Unique nonce to prevent replay attacks
 * @returns Signature data including the signature and signer address
 */
export async function generateProjectApprovalSignature(
  curatorPrivateKey: `0x${string}`,
  projectId: bigint,
  approvedOwner: Address,
  metadataURI: string,
  deadline: bigint,
  nonce: bigint
): Promise<ProjectApprovalSignature> {
  const { chainId, rpcUrl } = getChainConfig();
  const { registry } = getContractAddresses();
  
  const account = privateKeyToAccount(curatorPrivateKey);
  
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  // EIP-712 domain - must match contract's EIP712 domain
  const domain = {
    name: 'ArcIndexRegistry',
    version: '1',
    chainId: chainId,
    verifyingContract: registry, // Use actual contract address
  };

  // EIP-712 types - must match contract's PROJECT_APPROVAL_TYPEHASH
  const types = {
    ProjectApproval: [
      { name: 'projectId', type: 'uint256' },
      { name: 'approvedOwner', type: 'address' },
      { name: 'metadataURI', type: 'string' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  // Message to sign
  const message = {
    projectId,
    approvedOwner,
    metadataURI,
    deadline,
    nonce,
  };

  // Sign typed data
  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: 'ProjectApproval',
    message,
  });

  return {
    projectId,
    approvedOwner,
    metadataURI,
    deadline,
    nonce,
    signature,
    signer: account.address,
  };
}

/**
 * Generate a unique nonce for approval signatures
 * Uses timestamp + random to ensure uniqueness
 */
export function generateApprovalNonce(): bigint {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const random = BigInt(Math.floor(Math.random() * 1000000));
  return timestamp * BigInt(1000000) + random;
}

/**
 * Calculate signature deadline (default: 1 hour from now)
 */
export function calculateSignatureDeadline(hoursFromNow: number = 1): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}
