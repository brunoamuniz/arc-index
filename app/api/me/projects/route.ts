import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']).optional(),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    let session;
    try {
      session = await requireAuth();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please connect your wallet and sign in.' },
        { status: 401 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      status: searchParams.get('status') || undefined,
    });

    const normalizedWallet = normalizeWalletAddress(session.walletAddress);

    let query = supabaseAdmin!
      .from('arcindex_projects')
      .select(`
        *,
        arcindex_ratings_agg (*),
        arcindex_funding_agg (*)
      `)
      .eq('owner_wallet', normalizedWallet);
    
    // Filter out deleted projects
    query = query.is('deleted_at', null);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching projects from database:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        wallet: normalizedWallet
      });
      throw error;
    }

    if (!data) {
      console.warn('No data returned from query, but no error');
      return NextResponse.json({ projects: [] });
    }

    // For rejected projects, fetch the rejection reason from the latest rejected submission
    const projectsWithRejection = await Promise.all((data || []).map(async (p: any) => {
      let latest_submission = null;
      
      try {
        // If project has latest_submission_id, fetch it
        if (p.latest_submission_id) {
          const { data: submissionData, error: submissionError } = await supabaseAdmin!
            .from('arcindex_submissions')
            .select('review_reason_text, review_reason_code, reviewed_at, status')
            .eq('id', p.latest_submission_id)
            .maybeSingle();
          
          if (!submissionError && submissionData) {
            latest_submission = submissionData;
          }
        }
        
        // If project is rejected but we don't have the reason yet, fetch the latest rejected submission
        if (p.status === 'Rejected' && (!latest_submission || !latest_submission.review_reason_text)) {
          const { data: rejectedSubmission, error: rejectedError } = await supabaseAdmin!
            .from('arcindex_submissions')
            .select('review_reason_text, review_reason_code, reviewed_at, status')
            .eq('project_id', p.id)
            .eq('status', 'Rejected')
            .order('reviewed_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!rejectedError && rejectedSubmission) {
            latest_submission = rejectedSubmission;
          }
        }
      } catch (submissionErr) {
        // Log but don't fail the entire request if submission fetch fails
        console.error(`Error fetching submission for project ${p.id}:`, submissionErr);
      }
      
      return {
      ...p,
      rating_agg: p.arcindex_ratings_agg?.[0] || null,
      funding_agg: p.arcindex_funding_agg?.[0] || null,
        latest_submission,
      };
    }));

    return NextResponse.json({ projects: projectsWithRejection });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
    const errorDetails = error instanceof Error && 'details' in error ? String(error.details) : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

