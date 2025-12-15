import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createPublicClient, http, parseAbi, encodeFunctionData, type Address } from 'viem';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';

const RPC_URL = process.env.RPC_URL || process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5042002', 10);
const RATINGS_ADDRESS = process.env.RATINGS_ADDRESS as Address;

const ratingsAbi = parseAbi([
  'function rate(uint256 projectId, uint8 stars) external',
  'function getRating(uint256 projectId, address rater) external view returns (uint8)',
  'function getAverageRating(uint256 projectId) external view returns (uint256)',
  'function getTotalRatings(uint256 projectId) external view returns (uint256)',
  'event Rated(uint256 indexed projectId, address indexed rater, uint8 stars)',
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

  if (!RATINGS_ADDRESS || !RPC_URL) {
    return NextResponse.json(
      { error: 'Ratings contract not configured. Please deploy contracts first.' },
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
        const publicClient = createPublicClient({
          transport: http(RPC_URL),
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        console.log('Transaction receipt:', {
          hash: txHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber,
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

        // Store rating in database
        const { error: ratingError } = await supabaseAdmin!
          .from('arcindex_ratings')
          .upsert({
            project_id: projectId,
            rater: normalizeWalletAddress(session.walletAddress),
            stars: stars,
          }, {
            onConflict: 'project_id,rater',
          });

        if (ratingError) {
          console.error('Error storing rating:', ratingError);
          // Don't fail if DB update fails, transaction was successful
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

    // Validate project_id exists - projects must be registered on-chain before they can be rated
    // The project_id is set when the project is created on-chain (via createProject) and then
    // approved on-chain. If project_id is null, it means the project hasn't been created on-chain yet.
    if (!project.project_id) {
      return NextResponse.json(
        { 
          error: 'Project not registered on-chain',
          details: 'This project has been approved in the database but has not been created on the blockchain yet. Projects must be created on-chain before they can be rated. Please contact the project owner or a curator to complete the on-chain registration process.',
          code: 'PROJECT_NOT_ON_CHAIN',
        },
        { status: 400 }
      );
    }

    // Return transaction data for client to sign
    const data = encodeFunctionData({
      abi: ratingsAbi,
      functionName: 'rate',
      args: [BigInt(project.project_id), stars],
    });

    return NextResponse.json({
      txData: {
        to: RATINGS_ADDRESS,
        data,
        chainId: CHAIN_ID,
      },
    });
  } catch (error: any) {
    console.error('Error rating project:', error);
    
    // Return more detailed error information
    const errorMessage = error?.message || 'Failed to rate project';
    const errorDetails = error?.details || error?.stack || '';
    
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

