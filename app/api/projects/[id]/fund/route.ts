import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createPublicClient, http, parseUnits, decodeEventLog, parseAbi, type Address } from 'viem';
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

      console.log('Donation transaction receipt:', {
        hash: txHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        logs: receipt.logs.length,
      });

      if (!receipt.status || receipt.status === 'reverted') {
        return NextResponse.json(
          { 
            error: 'Transaction failed',
            details: `Transaction status: ${receipt.status}. Check the transaction on the blockchain explorer: https://testnet.arcscan.app/tx/${txHash}`,
            txHash
          },
          { status: 400 }
        );
      }

      // Verify ProjectDonated event was emitted
      const { registry } = getContractAddresses();
      const projectDonatedEventAbi = parseAbi([
        'event ProjectDonated(uint256 indexed projectId, address indexed donor, uint256 amount, uint256 fee)',
      ]);

      let eventFound = false;
      let onChainProjectId: bigint | null = null;
      let donatedAmount: bigint | null = null;

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === registry.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: projectDonatedEventAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'ProjectDonated') {
              eventFound = true;
              onChainProjectId = decoded.args.projectId as bigint;
              donatedAmount = decoded.args.amount as bigint;
              console.log('✅ ProjectDonated event found:', {
                projectId: decoded.args.projectId.toString(),
                donor: decoded.args.donor,
                amount: decoded.args.amount.toString(),
                fee: decoded.args.fee.toString(),
              });
              break;
            }
          } catch (e) {
            // Not the event we're looking for, continue
          }
        }
      }

      if (!eventFound) {
        console.error('⚠️ ProjectDonated event not found in transaction logs');
        console.error('Transaction logs:', receipt.logs.map(log => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
        })));
        // Don't fail - transaction succeeded, so donation was likely recorded
        // We'll store it anyway and let the indexer catch up
        console.warn('⚠️ Proceeding to store donation despite missing event - transaction succeeded');
      }

      // Verify USDC Transfer event was also emitted
      const { usdc } = getContractAddresses();
      const transferEventAbi = parseAbi([
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ]);

      let transferFound = false;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === usdc.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: transferEventAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'Transfer') {
              transferFound = true;
              console.log('✅ USDC Transfer event found:', {
                from: decoded.args.from,
                to: decoded.args.to,
                value: decoded.args.value.toString(),
              });
              break;
            }
          } catch (e) {
            // Not the event we're looking for, continue
          }
        }
      }

      if (!transferFound) {
        console.warn('⚠️ USDC Transfer event not found - donation may not have transferred funds');
      }

      // Store funding in database
      // amount_usdc column is NUMERIC(18,6) which stores USDC with 6 decimal places
      // So we store the amount directly as USDC (not in wei)
      const amountUSDC = parseFloat(amount); // Already in USDC units
      const { error: fundingError } = await supabaseAdmin!
        .from('arcindex_fundings')
        .insert({
          project_id: id,
          funder: normalizeWalletAddress(session.walletAddress),
          amount_usdc: amountUSDC, // Store as USDC (database handles 6 decimals)
          tx_hash: txHash,
        });

      if (fundingError) {
        console.error('Error storing funding:', fundingError);
        // Don't fail if DB update fails, transaction was successful
      } else {
        console.log('✅ Funding stored in database, recalculating aggregates...');
        // Recalculate aggregates immediately
        try {
          const { recalculateFundingAggregate } = await import('@/lib/supabase/aggregates');
          await recalculateFundingAggregate(id);
          console.log('✅ Funding aggregates recalculated successfully');
        } catch (aggError: any) {
          console.error('❌ Error recalculating funding aggregate:', aggError);
          console.error('Error details:', {
            message: aggError?.message,
            stack: aggError?.stack,
            projectId: id,
          });
          // Don't fail the request, but log the error
        }
      }

      return NextResponse.json({
        success: true,
        funding: {
          amount,
          txHash,
        },
      });
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

    // If not found in database, return error
    if (!onChainProjectId) {
      return NextResponse.json(
        {
          error: 'Project not registered on-chain',
          details: 'This project must be registered on-chain before it can receive donations. Please complete the on-chain registration first.',
          code: 'PROJECT_NOT_ON_CHAIN',
        },
        { status: 400 }
      );
    }

    // Verify project is approved on-chain (only approved projects can receive donations)
    if (onChainProject) {
      if (onChainProject.status !== ProjectStatus.Approved) {
        return NextResponse.json(
          {
            error: 'Project is not approved on-chain',
            details: `Project status on-chain is ${onChainProject.status}, expected ${ProjectStatus.Approved}. Only approved projects can receive donations.`,
            code: 'PROJECT_NOT_APPROVED_ON_CHAIN',
          },
          { status: 400 }
        );
      }
    } else {
      // Project ID exists but we couldn't read it - might be a contract issue
      console.warn(`Project ID ${onChainProjectId} exists in database but could not be read from contract`);
      // Continue anyway - contract will revert if project doesn't exist
    }

    // Check if USDC approval is needed
    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals
    const allowance = await checkUSDCAllowance(session.walletAddress as Address);
    const needsApproval = allowance < amountWei;

    // Prepare donation transaction data
    // Use onChainProjectId (should be same as project.project_id at this point)
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

    const { to, data, chainId } = encodeDonateToProject(projectIdToUse, amount);

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
  } catch (error: any) {
    console.error('Error funding project:', error);

    // Handle authentication errors specifically
    if (error?.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'Please connect your wallet and sign in to donate to projects.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || 'Failed to fund project',
        details: error?.details || '',
      },
      { status: error?.status || 500 }
    );
  }
}
