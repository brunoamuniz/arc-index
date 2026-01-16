import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCuratorOrAdmin } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  encodeSubmitProject,
  encodeApproveProject,
  readProject,
  areContractsConfigured,
  getContractAddresses,
  ProjectStatus,
} from '@/lib/contracts';

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

    // With the new ArcIndexRegistry, we use submitProject which:
    // 1. Creates project in Pending status
    // 2. Then a curator calls approveProject which automatically mints the NFT

    // For projects not yet on-chain, we need to:
    // 1. Submit the project (anyone can do this for their own project)
    // 2. Approve the project (curator only, which mints the NFT)

    let submitTxData = undefined;
    let approveTxData = undefined;

    if (!project.project_id) {
      // Project not on-chain yet, need to submit first
      submitTxData = encodeSubmitProject(metadataUrl);
    } else {
      // Project exists on-chain, check its status
      try {
        const onChainProject = await readProject(BigInt(project.project_id));

        if (onChainProject) {
          const currentStatus = onChainProject.status;

          // Status: 0 = None, 1 = Pending, 2 = Approved, 3 = Rejected
          if (currentStatus === ProjectStatus.Pending) {
            // Project is Pending, need to approve (curator only)
            if (isCuratorOrAdmin) {
              approveTxData = encodeApproveProject(BigInt(project.project_id));
            } else {
              return NextResponse.json(
                { error: 'Only curators can approve projects on-chain' },
                { status: 403 }
              );
            }
          } else if (currentStatus === ProjectStatus.Approved) {
            // Already approved on-chain
            return NextResponse.json(
              { error: 'Project is already approved on-chain' },
              { status: 400 }
            );
          } else if (currentStatus === ProjectStatus.Rejected) {
            return NextResponse.json(
              { error: 'Project was rejected on-chain' },
              { status: 400 }
            );
          }
        }
      } catch (error) {
        console.error('Error checking project status on-chain:', error);
        // If we can't read the project, it might not exist yet
        submitTxData = encodeSubmitProject(metadataUrl);
      }
    }

    // Note: In the new contract, approveProject automatically mints the NFT
    // No need for separate NFT minting transaction

    return NextResponse.json({
      success: true,
      submitTxData, // Transaction to submit project on-chain (if not yet submitted)
      approveTxData, // Transaction to approve project on-chain (curator only)
      needsSubmission: !!submitTxData,
      needsApproval: !!approveTxData,
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
