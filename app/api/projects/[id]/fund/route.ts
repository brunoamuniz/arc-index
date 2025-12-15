import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createPublicClient, http, parseAbi, encodeFunctionData, type Address, parseUnits } from 'viem';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';

const RPC_URL = process.env.RPC_URL || process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5042002', 10);
const FUNDING_ADDRESS = process.env.FUNDING_ADDRESS as Address;
const USDC_ADDRESS = process.env.USDC_ADDRESS as Address;

const fundingAbi = parseAbi([
  'function fund(uint256 projectId, uint256 amount) external',
  'function getTotalFunding(uint256 projectId) external view returns (uint256)',
  'function getFundingCount(uint256 projectId) external view returns (uint256)',
  'event Funded(uint256 indexed projectId, address indexed funder, uint256 amount)',
]);

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  if (!FUNDING_ADDRESS || !USDC_ADDRESS || !RPC_URL) {
    return NextResponse.json(
      { error: 'Funding contract not configured. Please deploy contracts first.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();
    const { amount, txHash } = body;

    if (!amount || Number.parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get project
    const { data: project, error: projectError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('project_id, status, owner_wallet')
      .eq('id', params.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Only approved projects can receive funding' },
        { status: 400 }
      );
    }

    // If txHash provided, verify transaction and update database
    if (txHash) {
      const publicClient = createPublicClient({
        transport: http(RPC_URL),
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt.status || receipt.status === 'reverted') {
        return NextResponse.json(
          { error: 'Transaction failed' },
          { status: 400 }
        );
      }

      // Store funding in database
      const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
      const { error: fundingError } = await supabaseAdmin!
        .from('arcindex_fundings')
        .insert({
          project_id: params.id,
          funder: normalizeWalletAddress(session.walletAddress),
          amount_usdc: amountWei.toString(),
          tx_hash: txHash,
        });

      if (fundingError) {
        console.error('Error storing funding:', fundingError);
        // Don't fail if DB update fails, transaction was successful
      }

      return NextResponse.json({
        success: true,
        funding: {
          amount,
          txHash,
        },
      });
    }

    // Return transaction data for client to sign
    // First, check if approval is needed
    const publicClient = createPublicClient({
      transport: http(RPC_URL),
    });

    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
    const allowance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [session.walletAddress as Address, FUNDING_ADDRESS],
    });

    const needsApproval = allowance < amountWei;

    const fundData = encodeFunctionData({
      abi: fundingAbi,
      functionName: 'fund',
      args: [BigInt(project.project_id || 0), amountWei],
    });

    const approvalData = needsApproval ? encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [FUNDING_ADDRESS, amountWei],
    }) : undefined;

    return NextResponse.json({
      txData: {
        to: FUNDING_ADDRESS,
        data: fundData,
        chainId: CHAIN_ID,
      },
      approvalNeeded: needsApproval,
      approvalTxData: needsApproval ? {
        to: USDC_ADDRESS,
        data: approvalData!,
        chainId: CHAIN_ID,
      } : undefined,
    });
  } catch (error) {
    console.error('Error funding project:', error);
    return NextResponse.json(
      { error: 'Failed to fund project' },
      { status: 500 }
    );
  }
}

