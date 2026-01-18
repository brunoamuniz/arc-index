import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCuratorOrAdmin } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  areContractsConfigured,
  getContractAddresses,
  getChainConfig,
} from '@/lib/contracts';
import {
  generateProjectApprovalSignature,
  generateApprovalNonce,
  calculateSignatureDeadline,
} from '@/lib/contracts/eip712';
import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';

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

  if (!areContractsConfigured()) {
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

    // Check if project is approved in database
    if (project.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Project must be approved before it can be registered on-chain' },
        { status: 400 }
      );
    }

    // Check if already registered with NFT
    if (project.project_id && project.nft_token_id) {
      return NextResponse.json(
        { error: 'Project is already registered on-chain and NFT has been minted' },
        { status: 400 }
      );
    }

    const metadataUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/metadata/${project.id}`;
    const approvedOwner = normalizeWalletAddress(project.owner_wallet) as Address;

    // Get curator private key for signature generation
    // Priority: 1) CURATOR_PRIVATE_KEY env var, 2) ADMIN_PRIVATE_KEY as fallback
    const curatorPrivateKey = (process.env.CURATOR_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) as `0x${string}` | undefined;
    
    if (!curatorPrivateKey) {
      return NextResponse.json(
        { 
          error: 'Curator private key not configured',
          details: 'CURATOR_PRIVATE_KEY or ADMIN_PRIVATE_KEY must be set in environment variables to generate approval signatures'
        },
        { status: 503 }
      );
    }

    // Determine on-chain project ID (0 for new projects, existing ID if already on-chain)
    const onChainProjectId = project.project_id ? BigInt(project.project_id) : BigInt(0);
    
    // Generate EIP-712 signature proving curator approval
    const nonce = generateApprovalNonce();
    const deadline = calculateSignatureDeadline(24); // 24 hours validity
    
    let approvalSignature;
    try {
      approvalSignature = await generateProjectApprovalSignature(
        curatorPrivateKey,
        onChainProjectId,
        approvedOwner,
        metadataUrl,
        deadline,
        nonce
      );
    } catch (error: any) {
      console.error('Error generating curator signature:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate curator approval signature',
          details: error.message || 'Signature generation failed'
        },
        { status: 500 }
      );
    }

    // Encode the atomic registration function call
    const { registry } = getContractAddresses();
    const { chainId } = getChainConfig();
    
    // Import ABI - use the same import path as lib/contracts/index.ts
    const { ArcIndexRegistryABI } = await import('@arc-index/contracts/abis');
    
    const finalizeTxData = encodeFunctionData({
      abi: ArcIndexRegistryABI,
      functionName: 'registerApprovedProjectAndMint',
      args: [
        approvalSignature.projectId,
        approvalSignature.approvedOwner,
        approvalSignature.metadataURI,
        approvalSignature.deadline,
        approvalSignature.nonce,
        approvalSignature.signature,
      ],
    });

    return NextResponse.json({
      success: true,
      finalizeTxData: {
        to: registry,
        data: finalizeTxData,
        chainId,
      },
      // Include signature details for debugging/verification
      signature: {
        signer: approvalSignature.signer,
        projectId: approvalSignature.projectId.toString(),
        approvedOwner: approvalSignature.approvedOwner,
        deadline: approvalSignature.deadline.toString(),
        nonce: approvalSignature.nonce.toString(),
      },
      // Contract addresses for reference
      contracts: getContractAddresses(),
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
