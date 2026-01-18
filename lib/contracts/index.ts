// Arc Index Contract Service Layer
// Provides typed contract interactions for the new Arc Index V2 contracts

import { createPublicClient, http, encodeFunctionData, type Address, parseUnits } from 'viem';
import {
  ArcIndexRegistryABI,
  ArcIndexCertificateNFTABI,
  ERC20ABI,
  ProjectStatus,
} from '@arc-index/contracts/abis';

export { ProjectStatus };

// Contract addresses from environment
export const getContractAddresses = () => ({
  registry: (process.env.ARC_INDEX_REGISTRY_ADDRESS ||
    process.env.NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS) as Address,
  certificateNFT: (process.env.ARC_INDEX_CERTIFICATE_NFT_ADDRESS ||
    process.env.NEXT_PUBLIC_ARC_INDEX_CERTIFICATE_NFT_ADDRESS) as Address,
  usdc: (process.env.USDC_ADDRESS ||
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    '0x3600000000000000000000000000000000000000') as Address,
});

// Chain config
export const getChainConfig = () => ({
  rpcUrl:
    process.env.RPC_URL ||
    process.env.ARC_TESTNET_RPC_URL ||
    process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ||
    '',
  chainId: parseInt(process.env.CHAIN_ID || '5042002', 10),
});

// Create public client for reading contract state
export const createContractClient = () => {
  const { rpcUrl } = getChainConfig();
  return createPublicClient({
    transport: http(rpcUrl),
  });
};

// Project data from contract
export interface OnChainProject {
  owner: Address;
  status: ProjectStatus;
  metadataURI: string;
  submittedAt: bigint;
  approvedAt: bigint;
  approvedBy: Address;
  certificateTokenId: bigint;
  ratingCount: number;
  ratingSum: number;
  totalDonatedUSDC6: bigint;
}

// Registry functions

/**
 * Encode submitProject transaction data
 */
export function encodeSubmitProject(metadataURI: string) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'submitProject',
    args: [metadataURI],
  });

  return {
    to: registry,
    data,
    chainId,
  };
}

/**
 * Encode approveProject transaction data (curator only)
 */
export function encodeApproveProject(projectId: bigint) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'approveProject',
    args: [projectId],
  });

  return {
    to: registry,
    data,
    chainId,
  };
}

/**
 * Encode registerApprovedProjectAndMint transaction data
 * This is the atomic function that registers an already-approved project and mints NFT
 */
export function encodeRegisterApprovedProjectAndMint(
  projectId: bigint,
  approvedOwner: Address,
  metadataURI: string,
  deadline: bigint,
  nonce: bigint,
  curatorSignature: `0x${string}`
) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'registerApprovedProjectAndMint',
    args: [projectId, approvedOwner, metadataURI, deadline, nonce, curatorSignature],
  });

  return {
    to: registry,
    data,
    chainId,
  };
}

/**
 * Encode rejectProject transaction data (curator only)
 */
export function encodeRejectProject(projectId: bigint, reason: string) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'rejectProject',
    args: [projectId, reason],
  });

  return {
    to: registry,
    data,
    chainId,
  };
}

/**
 * Encode rateProject transaction data
 */
export function encodeRateProject(projectId: bigint, stars: number) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'rateProject',
    args: [projectId, stars],
  });

  return {
    to: registry,
    data,
    chainId,
  };
}

/**
 * Encode donateToProject transaction data
 */
export function encodeDonateToProject(projectId: bigint, amountUSDC: string) {
  const { registry } = getContractAddresses();
  const { chainId } = getChainConfig();

  // USDC has 6 decimals
  const amountWei = parseUnits(amountUSDC, 6);

  const data = encodeFunctionData({
    abi: ArcIndexRegistryABI,
    functionName: 'donateToProject',
    args: [projectId, amountWei],
  });

  return {
    to: registry,
    data,
    chainId,
    amountWei,
  };
}

/**
 * Encode USDC approve transaction for donations
 */
export function encodeUSDCApproval(amount: bigint) {
  const { registry, usdc } = getContractAddresses();
  const { chainId } = getChainConfig();

  const data = encodeFunctionData({
    abi: ERC20ABI,
    functionName: 'approve',
    args: [registry, amount],
  });

  return {
    to: usdc,
    data,
    chainId,
  };
}

/**
 * Read project from contract
 */
export async function readProject(projectId: bigint): Promise<OnChainProject | null> {
  const client = createContractClient();
  const { registry } = getContractAddresses();

  try {
    const result = await client.readContract({
      address: registry,
      abi: ArcIndexRegistryABI,
      functionName: 'getProject',
      args: [projectId],
    });

    const [
      owner,
      status,
      metadataURI,
      submittedAt,
      approvedAt,
      approvedBy,
      certificateTokenId,
      ratingCount,
      ratingSum,
      totalDonatedUSDC6,
    ] = result;

    return {
      owner: owner as Address,
      status: status as ProjectStatus,
      metadataURI,
      submittedAt,
      approvedAt,
      approvedBy: approvedBy as Address,
      certificateTokenId,
      ratingCount,
      ratingSum,
      totalDonatedUSDC6,
    };
  } catch (error) {
    console.error('Error reading project from contract:', error);
    return null;
  }
}

/**
 * Read user rating for a project
 */
export async function readUserRating(
  userAddress: Address,
  projectId: bigint
): Promise<number> {
  const client = createContractClient();
  const { registry } = getContractAddresses();

  try {
    const rating = await client.readContract({
      address: registry,
      abi: ArcIndexRegistryABI,
      functionName: 'getUserRating',
      args: [userAddress, projectId],
    });

    return rating;
  } catch (error) {
    console.error('Error reading user rating:', error);
    return 0;
  }
}

/**
 * Read average rating for a project (returns value * 100, e.g., 450 = 4.50 stars)
 */
export async function readAverageRating(projectId: bigint): Promise<bigint> {
  const client = createContractClient();
  const { registry } = getContractAddresses();

  try {
    const average = await client.readContract({
      address: registry,
      abi: ArcIndexRegistryABI,
      functionName: 'getAverageRating',
      args: [projectId],
    });

    return average;
  } catch (error) {
    console.error('Error reading average rating:', error);
    return BigInt(0);
  }
}

/**
 * Check USDC allowance for donations
 */
export async function checkUSDCAllowance(ownerAddress: Address): Promise<bigint> {
  const client = createContractClient();
  const { registry, usdc } = getContractAddresses();

  try {
    const allowance = await client.readContract({
      address: usdc,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [ownerAddress, registry],
    });

    return allowance;
  } catch (error) {
    console.error('Error checking USDC allowance:', error);
    return BigInt(0);
  }
}

/**
 * Get certificate token ID for a project
 */
export async function getCertificateTokenId(projectId: bigint): Promise<bigint> {
  const client = createContractClient();
  const { certificateNFT } = getContractAddresses();

  try {
    const tokenId = await client.readContract({
      address: certificateNFT,
      abi: ArcIndexCertificateNFTABI,
      functionName: 'getTokenIdForProject',
      args: [projectId],
    });

    return tokenId;
  } catch (error) {
    console.error('Error getting certificate token ID:', error);
    return BigInt(0);
  }
}

/**
 * Check if contracts are configured
 */
export function areContractsConfigured(): boolean {
  const { registry, certificateNFT } = getContractAddresses();
  const { rpcUrl } = getChainConfig();

  return Boolean(registry && certificateNFT && rpcUrl);
}
