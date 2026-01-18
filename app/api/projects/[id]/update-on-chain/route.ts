import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { createPublicClient, http, decodeEventLog, parseAbi } from 'viem';
import { getChainConfig, getContractAddresses, ProjectStatus } from '@/lib/contracts';
import type { Address } from 'viem';

/**
 * POST /api/projects/[id]/update-on-chain
 * Updates the database with on-chain project_id and nft_token_id after finalization
 * This endpoint is called after a successful registerApprovedProjectAndMint transaction
 */
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

  try {
    const session = await requireAuth();
    const body = await request.json();
    const { txHash } = body;

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Extract project ID from params
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;

    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    // Verify transaction and extract project_id and token_id from events
    const { rpcUrl } = getChainConfig();
    const { registry } = getContractAddresses();
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status === 'reverted') {
      return NextResponse.json(
        { error: 'Transaction was reverted', txHash },
        { status: 400 }
      );
    }

    // Extract project ID and NFT token ID from ProjectFinalized event
    const projectFinalizedEventAbi = parseAbi([
      'event ProjectFinalized(uint256 indexed projectId, address indexed owner, address indexed finalizer, uint256 certificateTokenId)',
      'event ProjectApproved(uint256 indexed projectId, address indexed curator, uint256 indexed certificateTokenId)',
    ]);

    let onChainProjectId: bigint | null = null;
    let certificateTokenId: bigint | null = null;

    try {
      const logs = receipt.logs;
      const projectRegistryLogs = logs.filter(log =>
        log.address.toLowerCase() === registry.toLowerCase()
      );

      for (const log of projectRegistryLogs) {
        try {
          const decoded = decodeEventLog({
            abi: projectFinalizedEventAbi,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'ProjectFinalized') {
            onChainProjectId = decoded.args.projectId as bigint;
            certificateTokenId = decoded.args.certificateTokenId as bigint;
            break;
          } else if (decoded.eventName === 'ProjectApproved') {
            // Fallback to ProjectApproved event
            onChainProjectId = decoded.args.projectId as bigint;
            certificateTokenId = decoded.args.certificateTokenId as bigint;
          }
        } catch (e) {
          // Not the event we're looking for, continue
        }
      }
    } catch (e) {
      console.error('Error decoding events:', e);
    }

    if (!onChainProjectId || !certificateTokenId) {
      return NextResponse.json(
        {
          error: 'Could not extract project ID or token ID from transaction',
          details: 'The transaction may not have emitted the expected events. Please verify the transaction on ArcScan.',
          txHash,
        },
        { status: 400 }
      );
    }

    // Verify on-chain project status
    try {
      const { readProject } = await import('@/lib/contracts');
      const onChainProject = await readProject(onChainProjectId);

      if (!onChainProject) {
        return NextResponse.json(
          {
            error: 'Project not found on-chain',
            details: `Project ID ${onChainProjectId} does not exist in the registry contract.`,
          },
          { status: 400 }
        );
      }

      if (onChainProject.status !== ProjectStatus.Approved) {
        return NextResponse.json(
          {
            error: 'Project is not approved on-chain',
            details: `Project status on-chain is ${onChainProject.status}, expected ${ProjectStatus.Approved}.`,
          },
          { status: 400 }
        );
      }

      // Update database with on-chain project_id and nft_token_id
      const { error: updateError } = await supabaseAdmin!
        .from('arcindex_projects')
        .update({
          project_id: Number(onChainProjectId),
          nft_token_id: Number(certificateTokenId),
          nft_contract_address: getContractAddresses().certificateNFT,
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating project:', updateError);
        return NextResponse.json(
          {
            error: 'Failed to update project in database',
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        project: {
          id: projectId,
          project_id: Number(onChainProjectId),
          nft_token_id: Number(certificateTokenId),
        },
        onChainStatus: onChainProject.status,
      });
    } catch (error: any) {
      console.error('Error verifying on-chain project:', error);
      return NextResponse.json(
        {
          error: 'Failed to verify on-chain project',
          details: error.message || 'Could not read project from contract',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error updating on-chain project:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        {
          error: error.message === 'Unauthorized' ? 'Authentication required' : error.message,
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update on-chain project',
        details: error.message || (process.env.NODE_ENV === 'development' ? String(error) : undefined),
      },
      { status: 500 }
    );
  }
}
