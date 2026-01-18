import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';

/**
 * Debug endpoint to check aggregates for a project
 * GET /api/projects/[id]/debug-aggregates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    await requireAuth();
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;

    // Get individual records
    const { data: ratings, error: ratingsError } = await supabaseAdmin!
      .from('arcindex_ratings')
      .select('*')
      .eq('project_id', projectId);

    const { data: fundings, error: fundingsError } = await supabaseAdmin!
      .from('arcindex_fundings')
      .select('*')
      .eq('project_id', projectId);

    // Get aggregates
    const { data: ratingAgg, error: ratingAggError } = await supabaseAdmin!
      .from('arcindex_ratings_agg')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const { data: fundingAgg, error: fundingAggError } = await supabaseAdmin!
      .from('arcindex_funding_agg')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Get project
    const { data: project, error: projectError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('id, name, project_id, status')
      .eq('id', projectId)
      .single();

    return NextResponse.json({
      project: {
        id: project?.id,
        name: project?.name,
        project_id: project?.project_id,
        status: project?.status,
      },
      ratings: {
        individual: ratings || [],
        count: ratings?.length || 0,
        aggregate: ratingAgg || null,
        error: ratingsError?.message,
        aggError: ratingAggError?.message,
      },
      fundings: {
        individual: fundings || [],
        count: fundings?.length || 0,
        aggregate: fundingAgg || null,
        error: fundingsError?.message,
        aggError: fundingAggError?.message,
      },
      calculated: {
        ratingTotal: ratings?.reduce((sum, r) => sum + r.stars, 0) || 0,
        ratingAvg: ratings?.length ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) : 0,
        fundingTotal: fundings?.reduce((sum, f) => {
          const amount = typeof f.amount_usdc === 'string' ? parseFloat(f.amount_usdc) : f.amount_usdc;
          return sum + amount;
        }, 0) || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch debug data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
