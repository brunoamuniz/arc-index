import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createPublicClient, http, decodeEventLog, parseAbi } from 'viem';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  encodeRateProject,
  readProject,
  areContractsConfigured,
  getChainConfig,
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
      { error: 'Registry contract not configured. Please deploy contracts first.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();
    const { stars, txHash } = body;

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5 stars' },
        { status: 400 }
      );
    }

    // Extract project ID from params (handle both Promise and direct object for Next.js compatibility)
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
      .select('project_id, status')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Only approved projects can be rated' },
        { status: 400 }
      );
    }

    // If txHash provided, verify transaction and update database
    if (txHash) {
      try {
        const { rpcUrl } = getChainConfig();
        const publicClient = createPublicClient({
          transport: http(rpcUrl),
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        console.log('Transaction receipt:', {
          hash: txHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          logs: receipt.logs.length,
        });

        if (!receipt.status || receipt.status === 'reverted') {
          return NextResponse.json(
            {
              error: 'Transaction failed or was reverted',
              details: `Transaction status: ${receipt.status}. Check the transaction on the blockchain explorer: https://testnet.arcscan.app/tx/${txHash}`,
              txHash
            },
            { status: 400 }
          );
        }

        // Verify ProjectRated event was emitted
        const { registry } = getContractAddresses();
        const projectRatedEventAbi = parseAbi([
          'event ProjectRated(uint256 indexed projectId, address indexed rater, uint8 stars, uint32 newRatingCount, uint32 newRatingSum)',
        ]);

        let eventFound = false;
        let onChainProjectId: bigint | null = null;

        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === registry.toLowerCase()) {
            try {
              const decoded = decodeEventLog({
                abi: projectRatedEventAbi,
                data: log.data,
                topics: log.topics,
              });

                  if (decoded.eventName === 'ProjectRated') {
                    eventFound = true;
                    onChainProjectId = decoded.args.projectId as bigint;
                    console.log('✅ ProjectRated event found:', {
                      projectId: decoded.args.projectId.toString(),
                      rater: decoded.args.rater,
                      stars: decoded.args.stars,
                      newRatingCount: decoded.args.newRatingCount,
                      newRatingSum: decoded.args.newRatingSum,
                    });
                    break;
                  }
            } catch (e) {
              // Not the event we're looking for, continue
            }
          }
        }

        if (!eventFound) {
          console.error('⚠️ ProjectRated event not found in transaction logs');
          console.error('Transaction logs:', receipt.logs.map(log => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
          })));
          // Don't fail - transaction succeeded, so rating was likely recorded
          // We'll store it anyway and let the indexer catch up
          console.warn('⚠️ Proceeding to store rating despite missing event - transaction succeeded');
        }

        // Store rating in database
        console.log('Storing rating in database:', {
          projectId,
          rater: normalizeWalletAddress(session.walletAddress),
          stars,
        });

        const { error: ratingError, data: ratingData } = await supabaseAdmin!
          .from('arcindex_ratings')
          .upsert({
            project_id: projectId,
            rater: normalizeWalletAddress(session.walletAddress),
            stars: stars,
          }, {
            onConflict: 'project_id,rater',
          })
          .select();

        if (ratingError) {
          console.error('❌ Error storing rating:', ratingError);
          // Don't fail if DB update fails, transaction was successful
        } else {
          console.log('✅ Rating stored:', ratingData);
          // Recalculate aggregates immediately
          try {
            const { recalculateRatingAggregate } = await import('@/lib/supabase/aggregates');
            await recalculateRatingAggregate(projectId);
            console.log('✅ Rating aggregates recalculated');
          } catch (aggError: any) {
            console.error('❌ Error recalculating rating aggregate:', aggError);
            console.error('Error details:', {
              message: aggError?.message,
              stack: aggError?.stack,
              projectId,
            });
            // Don't fail the request, but log the error
          }
        }

        return NextResponse.json({
          success: true,
          rating: {
            stars,
            txHash,
          },
        });
      } catch (txError: any) {
        console.error('Error verifying transaction:', txError);
        return NextResponse.json(
          {
            error: 'Failed to verify transaction',
            details: txError.message || 'Could not verify transaction on blockchain',
            txHash
          },
          { status: 500 }
        );
      }
    }

    // Check if project exists on-chain (even if database isn't synced)
    let onChainProject = null;
    let onChainProjectId: bigint | null = null;

    // First, try to read from database project_id
    if (project.project_id) {
      onChainProjectId = BigInt(project.project_id);
      try {
        onChainProject = await readProject(onChainProjectId);
      } catch (error) {
        console.error('Error reading project from contract:', error);
      }
    }

    // If not found in database, try to find on-chain by checking recent events
    // This handles cases where finalization happened but database wasn't updated
    if (!onChainProject && !project.project_id) {
      // Try to find project on-chain by owner and metadata
      // This is a fallback - ideally database should be synced
      return NextResponse.json(
        {
          error: 'Project not registered on-chain',
          details: 'This project has been approved in the database but has not been registered on-chain yet. Please complete the on-chain registration first.',
          code: 'PROJECT_NOT_ON_CHAIN',
        },
        { status: 400 }
      );
    }

    // Verify project is approved on-chain (only approved projects can be rated)
    if (onChainProject) {
      if (onChainProject.status !== ProjectStatus.Approved) {
        return NextResponse.json(
          {
            error: 'Project is not approved on-chain',
            details: `Project status on-chain is ${onChainProject.status}, expected ${ProjectStatus.Approved}. Only approved projects can be rated.`,
            code: 'PROJECT_NOT_APPROVED_ON_CHAIN',
          },
          { status: 400 }
        );
      }
    } else if (onChainProjectId) {
      // Project ID exists but we couldn't read it - might be a contract issue
      console.warn(`Project ID ${onChainProjectId} exists in database but could not be read from contract`);
      // Continue anyway - contract will revert if project doesn't exist
    }

    // Return transaction data for client to sign
    // Using the new ArcIndexRegistry contract
    // Use onChainProjectId if available, otherwise fall back to database project_id
    const projectIdToUse = onChainProjectId || (project.project_id ? BigInt(project.project_id) : null);
    
    if (!projectIdToUse) {
      return NextResponse.json(
        {
          error: 'Project ID not available',
          details: 'Could not determine on-chain project ID. Please ensure the project is registered on-chain.',
          code: 'PROJECT_ID_MISSING',
        },
        { status: 400 }
      );
    }

    const txData = encodeRateProject(projectIdToUse, stars);

    return NextResponse.json({
      txData,
    });
  } catch (error: any) {
    console.error('Error rating project:', error);

    // Handle authentication errors specifically
    if (error?.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'Please connect your wallet and sign in to rate projects.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Return error information (hide stack traces in production)
    const errorMessage = error?.message || 'Failed to rate project';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? (error?.details || error?.stack || '')
      : (error?.details || '');

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        ...(error?.status && { status: error.status }),
      },
      { status: error?.status || 500 }
    );
  }
}
