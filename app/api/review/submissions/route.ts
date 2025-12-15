import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireCuratorOrAdmin } from '@/lib/auth/session';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['Submitted', 'Approved', 'Rejected']).optional().default('Submitted'),
  limit: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return 20;
      const num = Number(val);
      if (isNaN(num) || num < 1) return 20;
      if (num > 100) return 100;
      return Math.floor(num);
    },
    z.number().int().min(1).max(100)
  ).default(20),
  offset: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      if (isNaN(num) || num < 0) return 0;
      return Math.floor(num);
    },
    z.number().int().min(0)
  ).default(0),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireCuratorOrAdmin();
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Review submissions - Session:', {
        walletAddress: session.walletAddress,
        role: session.role,
      });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };
    
    // Parse with defaults for missing values
    let params;
    try {
      params = querySchema.parse({
        status: rawParams.status || undefined,
        limit: rawParams.limit || undefined,
        offset: rawParams.offset || undefined,
      });
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      // If validation fails, use defaults
      params = {
        status: 'Submitted' as const,
        limit: 20,
        offset: 0,
      };
    }

    const { data, error } = await supabaseAdmin!
      .from('arcindex_submissions')
      .select(`
        *,
        arcindex_projects (*)
      `)
      .eq('status', params.status)
      .order('submitted_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) {
      console.error('Supabase error fetching submissions:', error);
      throw error;
    }

    // Transform data - Supabase returns joined data as an array or object
    // Handle both cases: arcindex_projects as array or object
    const transformedData = (data || []).map((submission: any) => {
      // If arcindex_projects is an array, take the first element
      // If it's an object, use it directly
      const project = Array.isArray(submission.arcindex_projects)
        ? submission.arcindex_projects[0]
        : submission.arcindex_projects;
      
      return {
        ...submission,
        arcindex_projects: project,
      };
    });

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Submissions query result:', {
        count: transformedData.length,
        status: params.status,
        sample: transformedData[0] ? {
          id: transformedData[0].id,
          status: transformedData[0].status,
          hasProject: !!transformedData[0].arcindex_projects,
          projectName: transformedData[0].arcindex_projects?.name,
        } : null,
      });
    }

    return NextResponse.json({ submissions: transformedData });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Handle authentication/authorization errors
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Authentication required', details: 'Please connect your wallet and sign in.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('Forbidden') || error.message.includes('Curator or admin')) {
        return NextResponse.json(
          { 
            error: 'Access denied', 
            details: 'You need to be a curator or admin to view submissions. Your current role may not have been updated in your session. Please logout and login again, or contact an administrator to get curator access.' 
          },
          { status: 403 }
        );
      }
    }
    
    // Handle Supabase errors
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message || String(error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch submissions',
          details: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred while fetching submissions'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch submissions',
        details: process.env.NODE_ENV === 'development' ? String(error) : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

