import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireCuratorOrAdmin } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> | { submissionId: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireCuratorOrAdmin();
    
    // Resolve params (Next.js 16+ may return Promise)
    const resolvedParams = await Promise.resolve(params);
    const submissionId = resolvedParams.submissionId;
    
    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }
    
    // Get submission
    const { data: submission, error: fetchError } = await supabaseAdmin!
      .from('arcindex_submissions')
      .select('*, arcindex_projects(*)')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'Submission is not in Submitted status' },
        { status: 400 }
      );
    }

    const project = submission.arcindex_projects;

    // Update submission
    const { error: submissionUpdateError } = await supabaseAdmin!
      .from('arcindex_submissions')
      .update({
        status: 'Approved',
        reviewed_by: normalizeWalletAddress(session.walletAddress),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (submissionUpdateError) {
      throw submissionUpdateError;
    }

    // Update project
    const { error: projectUpdateError } = await supabaseAdmin!
      .from('arcindex_projects')
      .update({
        status: 'Approved',
      })
      .eq('id', project.id);

    if (projectUpdateError) {
      throw projectUpdateError;
    }

    // Approval is now off-chain only
    // On-chain registration (create project, approve, mint NFT) must be done separately
    // via the /projects/[id]/register-on-chain endpoint by either the owner or curator

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        status: 'Approved',
        reviewed_by: session.walletAddress,
        reviewed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { 
          error: error.message === 'Unauthorized' ? 'Authentication required' : 'Forbidden: Curator or admin access required',
          details: 'Please connect your wallet and ensure you have curator or admin role.'
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    
    // Handle validation errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to approve submission';
    const errorDetails = error instanceof Error && 'details' in error ? String(error.details) : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails || (process.env.NODE_ENV === 'development' ? String(error) : undefined)
      },
      { status: 500 }
    );
  }
}

