import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createPublicClient, http, parseUnits, type Address } from 'viem';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  encodeDonateToProject,
  encodeUSDCApproval,
  checkUSDCAllowance,
  readProject,
  areContractsConfigured,
  getChainConfig,
  getContractAddresses,
  ProjectStatus,
} from '@/lib/contracts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
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
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Only approved projects can receive donations' },
        { status: 400 }
      );
    }

    // If txHash provided, verify transaction and update database
    if (txHash) {
      const { rpcUrl } = getChainConfig();
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
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
          project_id: id,
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

    // Validate project_id exists
    if (!project.project_id) {
      return NextResponse.json(
        {
          error: 'Project not registered on-chain',
          details: 'This project must be registered on-chain before it can receive donations.',
          code: 'PROJECT_NOT_ON_CHAIN',
        },
        { status: 400 }
      );
    }

    // Verify project is approved on-chain (only approved projects can receive donations)
    try {
      const onChainProject = await readProject(BigInt(project.project_id));
      if (onChainProject && onChainProject.status !== ProjectStatus.Approved) {
        return NextResponse.json(
          {
            error: 'Project is not approved on-chain',
            details: 'Only projects that have been approved on-chain can receive donations.',
            code: 'PROJECT_NOT_APPROVED_ON_CHAIN',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error checking project status on-chain:', error);
      // Continue anyway, let the contract revert if needed
    }

    // Check if USDC approval is needed
    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
    const allowance = await checkUSDCAllowance(session.walletAddress as Address);
    const needsApproval = allowance < amountWei;

    // Prepare donation transaction data
    const { to, data, chainId } = encodeDonateToProject(BigInt(project.project_id), amount);

    // Prepare approval transaction if needed
    const approvalTxData = needsApproval ? encodeUSDCApproval(amountWei) : undefined;
    const { usdc } = getContractAddresses();

    return NextResponse.json({
      txData: {
        to,
        data,
        chainId,
      },
      approvalNeeded: needsApproval,
      approvalTxData: needsApproval ? {
        to: usdc,
        data: approvalTxData?.data,
        chainId: approvalTxData?.chainId,
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
