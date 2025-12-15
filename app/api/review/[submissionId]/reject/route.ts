import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireCuratorOrAdmin } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { z } from 'zod';
import type { RejectSubmissionInput } from '@/packages/shared';

const rejectSchema = z.object({
  reasonCode: z.string().optional().default(""), // Optional, defaults to empty string
  reasonText: z.string().min(1, "Reason text is required"),
});

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
    
    // Extract submission ID from params (handle both Promise and direct object for Next.js compatibility)
    const resolvedParams = await Promise.resolve(params);
    const submissionId = resolvedParams.submissionId;
    
    if (!submissionId || submissionId === 'undefined' || submissionId === 'null') {
      return NextResponse.json(
        { error: 'Submission ID is required', details: `Received: ${submissionId}` },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Log request body for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Reject request body:', body);
      console.log('Submission ID:', submissionId);
    }
    
    const validated = rejectSchema.parse(body);
    const { reasonCode = "", reasonText } = validated;
    
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

    const project = Array.isArray(submission.arcindex_projects)
      ? submission.arcindex_projects[0]
      : submission.arcindex_projects;

    if (!project || !project.id) {
      return NextResponse.json(
        { error: 'Project not found for this submission' },
        { status: 404 }
      );
    }

    // Update submission
    const { error: submissionUpdateError } = await supabaseAdmin!
      .from('arcindex_submissions')
      .update({
        status: 'Rejected',
        review_reason_code: reasonCode,
        review_reason_text: reasonText,
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
        status: 'Rejected',
      })
      .eq('id', project.id);

    if (projectUpdateError) {
      throw projectUpdateError;
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        status: 'Rejected',
        review_reason_code: reasonCode,
        review_reason_text: reasonText,
        reviewed_by: session.walletAddress,
        reviewed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in reject submission:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    // Check if it's an authentication/authorization error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message: string }).message;
      if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
        return NextResponse.json(
          { error: errorMessage, details: 'You do not have permission to reject submissions' },
          { status: errorMessage === 'Unauthorized' ? 401 : 403 }
        );
      }
    }

    console.error('Error rejecting submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reject submission', details: errorMessage },
      { status: 500 }
    );
  }
}

