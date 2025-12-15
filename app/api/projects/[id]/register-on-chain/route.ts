import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCuratorOrAdmin } from '@/lib/auth/session';
import { createPublicClient, http, parseAbi, encodeFunctionData, type Address } from 'viem';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';

const RPC_URL = process.env.RPC_URL || process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5042002', 10);
const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as Address;
const APPROVAL_NFT_ADDRESS = process.env.APPROVAL_NFT_ADDRESS as Address;

const projectRegistryAbi = parseAbi([
  'function createProject(string memory metadataUri) external returns (uint256)',
  'function submit(uint256 projectId) external',
  'function approve(uint256 projectId) external',
  'function mintApprovalNFT(uint256 projectId, address to, string memory tokenURI) external returns (uint256)',
  'function getProject(uint256 projectId) external view returns (address owner, uint8 status, string memory metadataUri)',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  if (!PROJECT_REGISTRY_ADDRESS || !APPROVAL_NFT_ADDRESS || !RPC_URL) {
    return NextResponse.json(
      { error: 'Contracts not configured. Please deploy contracts first.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();
    
    // Extract project ID from params
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;

    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return NextResponse.json(
        { error: 'Project ID is required', details: `Received: ${projectId}` },
        { status: 400 }
      );
    }

    // Get project
    const { data: project, error: projectError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user is owner or curator/admin
    const isOwner = normalizeWalletAddress(project.owner_wallet) === normalizeWalletAddress(session.walletAddress);
    let isCuratorOrAdmin = false;
    
    try {
      await requireCuratorOrAdmin();
      isCuratorOrAdmin = true;
    } catch {
      // Not a curator/admin, that's ok if they're the owner
    }

    if (!isOwner && !isCuratorOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only the project owner or a curator can register it on-chain' },
        { status: 403 }
      );
    }

    // Check if project is approved
    if (project.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Project must be approved before it can be registered on-chain' },
        { status: 400 }
      );
    }

    // Check if already registered
    if (project.project_id && project.nft_token_id) {
      return NextResponse.json(
        { error: 'Project is already registered on-chain and NFT has been minted' },
        { status: 400 }
      );
    }

    const metadataUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/metadata/${project.id}`;

    // Prepare transaction data
    let createTxData = undefined;
    let approveTxData = undefined;
    let nftTxData = undefined;

    if (!project.project_id) {
      // Need to create project on-chain first
      const createData = encodeFunctionData({
        abi: projectRegistryAbi,
        functionName: 'createProject',
        args: [metadataUrl],
      });

      createTxData = {
        to: PROJECT_REGISTRY_ADDRESS,
        data: createData,
        chainId: CHAIN_ID,
      };
    } else {
      // Project already exists on-chain, just approve and mint NFT
      // Check if project is already approved on-chain
      const publicClient = createPublicClient({
        transport: http(RPC_URL),
      });

      try {
        const [owner, status] = await publicClient.readContract({
          address: PROJECT_REGISTRY_ADDRESS,
          abi: projectRegistryAbi,
          functionName: 'getProject',
          args: [BigInt(project.project_id)],
        });

        const currentStatus = Number(status);
        
        // Status: 0 = Draft, 1 = Submitted, 2 = Approved, 3 = Rejected
        // Need to submit first if Draft, then approve if Submitted
        if (currentStatus === 0) {
          // Project is Draft, need to submit first
          const submitData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'submit',
            args: [BigInt(project.project_id)],
          });

          // We'll need to handle submit in the frontend, but prepare approve for after
          // For now, just prepare submit transaction
          const approveData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'approve',
            args: [BigInt(project.project_id)],
          });

          // Return both submit and approve - frontend will handle submit first
          approveTxData = {
            to: PROJECT_REGISTRY_ADDRESS,
            data: submitData, // Actually submit data, but we'll call it approveTxData for compatibility
            chainId: CHAIN_ID,
            needsSubmit: true, // Flag to indicate this is actually a submit
          } as any;
        } else if (currentStatus === 1) {
          // Project is Submitted, need to approve
          const approveData = encodeFunctionData({
            abi: projectRegistryAbi,
            functionName: 'approve',
            args: [BigInt(project.project_id)],
          });

          approveTxData = {
            to: PROJECT_REGISTRY_ADDRESS,
            data: approveData,
            chainId: CHAIN_ID,
          };
        } else if (currentStatus === 2) {
          // Already approved, skip approval step
        }
      } catch (error) {
        console.error('Error checking project status on-chain:', error);
        // Assume we need to submit and approve
        // Try submit first
        const submitData = encodeFunctionData({
          abi: projectRegistryAbi,
          functionName: 'submit',
          args: [BigInt(project.project_id)],
        });

        approveTxData = {
          to: PROJECT_REGISTRY_ADDRESS,
          data: submitData,
          chainId: CHAIN_ID,
          needsSubmit: true,
        } as any;
      }

      // Prepare NFT mint transaction through ProjectRegistry (always mint to project owner)
      const mintData = encodeFunctionData({
        abi: projectRegistryAbi,
        functionName: 'mintApprovalNFT',
        args: [BigInt(project.project_id), project.owner_wallet as Address, metadataUrl],
      });

      nftTxData = {
        to: PROJECT_REGISTRY_ADDRESS,
        data: mintData,
        chainId: CHAIN_ID,
      };
    }

    return NextResponse.json({
      success: true,
      createTxData, // Transaction to create project on-chain (if project_id is null)
      approveTxData, // Transaction to approve project on-chain (if needed)
      nftTxData, // Transaction to mint NFT (always to project owner)
      needsCreation: !project.project_id,
      needsApproval: !!approveTxData,
    });
  } catch (error: any) {
    console.error('Error preparing on-chain registration:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { 
          error: error.message === 'Unauthorized' ? 'Authentication required' : error.message,
          details: 'Please connect your wallet and ensure you are the project owner.'
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to prepare on-chain registration',
        details: error.message || (process.env.NODE_ENV === 'development' ? String(error) : undefined)
      },
      { status: 500 }
    );
  }
}

