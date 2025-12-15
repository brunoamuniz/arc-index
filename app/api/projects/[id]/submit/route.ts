import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';

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
    
    // Extract project ID from params (handle both Promise and direct object for Next.js compatibility)
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;
    
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      console.error('Project ID is missing or invalid:', projectId);
      return NextResponse.json(
        { error: 'Project ID is required', details: `Received: ${projectId}` },
        { status: 400 }
      );
    }
    
    console.log('Submitting project with ID:', projectId);
    
    // Get project
    const { data: project, error: fetchError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      console.error('Project fetch error:', fetchError);
      console.error('Project ID searched:', projectId);
      return NextResponse.json(
        { error: 'Project not found', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Verify ownership
    if (normalizeWalletAddress(project.owner_wallet) !== normalizeWalletAddress(session.walletAddress)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Only allow submission from Draft or Rejected
    if (project.status !== 'Draft' && project.status !== 'Rejected') {
      return NextResponse.json(
        { error: 'Project cannot be submitted in current status' },
        { status: 400 }
      );
    }

    // Get latest submission version
    const { data: latestSubmission } = await supabaseAdmin!
      .from('arcindex_submissions')
      .select('version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = latestSubmission ? latestSubmission.version + 1 : 1;

    // Create submission
    const { data: submission, error: submissionError } = await supabaseAdmin!
      .from('arcindex_submissions')
      .insert({
        project_id: projectId,
        version: nextVersion,
        submitted_by: normalizeWalletAddress(session.walletAddress),
        status: 'Submitted',
        snapshot_json: project,
      })
      .select()
      .single();

    if (submissionError) {
      throw submissionError;
    }

    // Update project status
    const { error: updateError } = await supabaseAdmin!
      .from('arcindex_projects')
      .update({
        status: 'Submitted',
        latest_submission_id: submission.id,
      })
      .eq('id', projectId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Error submitting project:', error);
    return NextResponse.json(
      { error: 'Failed to submit project' },
      { status: 500 }
    );
  }
}

