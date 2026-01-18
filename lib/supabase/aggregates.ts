import { supabaseAdmin } from './server';

/**
 * Recalculate and update rating aggregates for a project
 */
export async function recalculateRatingAggregate(projectId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Get all ratings for this project
  const { data: allRatings, error: ratingsError } = await supabaseAdmin
    .from('arcindex_ratings')
    .select('stars')
    .eq('project_id', projectId);

  if (ratingsError) {
    console.error('Error fetching ratings for aggregate:', ratingsError);
    throw ratingsError;
  }

  if (!allRatings || allRatings.length === 0) {
    // No ratings yet - ensure aggregate exists with zero values
    await supabaseAdmin
      .from('arcindex_ratings_agg')
      .upsert({
        project_id: projectId,
        avg_stars: 0,
        ratings_count: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id',
      });
    return;
  }

  // Calculate aggregate
  const totalStars = allRatings.reduce((sum, r) => sum + r.stars, 0);
  const avgStars = totalStars / allRatings.length;

  console.log('Recalculating rating aggregate:', {
    projectId,
    ratingsCount: allRatings.length,
    totalStars,
    avgStars,
    sampleRatings: allRatings.slice(0, 3).map(r => r.stars),
  });

  // Update aggregate
  const { error: aggError, data: aggData } = await supabaseAdmin
    .from('arcindex_ratings_agg')
    .upsert({
      project_id: projectId,
      avg_stars: avgStars,
      ratings_count: allRatings.length,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'project_id',
    })
    .select();

  if (aggError) {
    console.error('❌ Error updating rating aggregate:', aggError);
    throw aggError;
  }

  console.log('✅ Rating aggregate updated:', aggData);
}

/**
 * Recalculate and update funding aggregates for a project
 */
export async function recalculateFundingAggregate(projectId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Get all fundings for this project
  const { data: allFundings, error: fundingsError } = await supabaseAdmin
    .from('arcindex_fundings')
    .select('amount_usdc')
    .eq('project_id', projectId);

  if (fundingsError) {
    console.error('Error fetching fundings for aggregate:', fundingsError);
    throw fundingsError;
  }

  if (!allFundings || allFundings.length === 0) {
    // No fundings yet - ensure aggregate exists with zero values
    await supabaseAdmin
      .from('arcindex_funding_agg')
      .upsert({
        project_id: projectId,
        total_usdc: 0,
        funding_count: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id',
      });
    return;
  }

  // Calculate aggregate
  // amount_usdc is stored as NUMERIC(18,6) in USDC units (not wei)
  const totalUSDC = allFundings.reduce((sum, f) => {
    // amount_usdc is already in USDC units (database column is NUMERIC(18,6))
    const amount = typeof f.amount_usdc === 'string' 
      ? parseFloat(f.amount_usdc) 
      : typeof f.amount_usdc === 'number'
      ? f.amount_usdc
      : parseFloat(f.amount_usdc.toString());
    return sum + amount;
  }, 0);
  const fundingCount = allFundings.length;
  
  console.log('Recalculating funding aggregate:', {
    projectId,
    fundingsCount: allFundings.length,
    totalUSDC,
    fundingCount,
    sampleAmounts: allFundings.slice(0, 3).map(f => f.amount_usdc),
  });

  // Update aggregate
  const { error: aggError, data: aggData } = await supabaseAdmin
    .from('arcindex_funding_agg')
    .upsert({
      project_id: projectId,
      total_usdc: totalUSDC,
      funding_count: fundingCount,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'project_id',
    })
    .select();

  if (aggError) {
    console.error('❌ Error updating funding aggregate:', aggError);
    throw aggError;
  }

  console.log('✅ Funding aggregate updated:', aggData);
}
