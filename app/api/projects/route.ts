import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import type { ProjectWithAggregates, CreateProjectInput } from '@/packages/shared';

const querySchema = z.object({
  category: z.string().nullable().transform(val => val || undefined).optional(),
  sort: z.enum(['newest', 'top_rated', 'most_funded']).nullable().transform(val => val || 'newest').default('newest'),
  q: z.string().nullable().transform(val => val || undefined).optional(),
  limit: z.coerce.number().int().positive().max(100).nullable().transform(val => val || 20).default(20),
  offset: z.coerce.number().int().nonnegative().nullable().transform(val => val || 0).default(0),
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(400), // Short description limited to 400 chars
  full_description: z.string().max(5000).optional(), // Full description up to 5000 chars
  category: z.string().min(1),
  x_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  discord_url: z.string().url().optional().or(z.literal('')),
  discord_username: z.string().max(100).optional().or(z.literal('')),
  website_url: z.string().url(),
  contracts_json: z.array(z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    label: z.string(),
  })).optional().default([]),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      category: searchParams.get('category'),
      sort: searchParams.get('sort'),
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured. Please check your environment variables.' },
        { status: 503 }
      );
    }

    // Build count query first (without pagination)
    let countQuery = supabaseAdmin!
      .from('arcindex_projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .is('deleted_at', null);

    // Apply filters to count query
    if (params.category) {
      countQuery = countQuery.eq('category', params.category);
    }
    if (params.q) {
      countQuery = countQuery.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
    }

    // Execute count query
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    // Build data query - query projects first
    // For top_rated and most_funded, we need to fetch ALL matching projects first,
    // then sort by aggregate data, then paginate. For newest, we can sort in the query.
    let query = supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('status', 'Approved')
      .is('deleted_at', null);

    // Category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // Search filter
    if (params.q) {
      query = query.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
    }

    // For 'newest' sort, we can apply sorting and pagination directly in the query
    // For 'top_rated' and 'most_funded', we need to fetch all projects first, then sort by aggregates
    if (params.sort === 'newest') {
      query = query.order('created_at', { ascending: false });
      // Apply pagination only for newest (where sorting happens in DB)
      query = query.range(params.offset, params.offset + params.limit - 1);
    }
    // For top_rated and most_funded, we DON'T apply pagination here - we'll do it after sorting

    const { data: projectsData, error } = await query;

    if (error) {
      throw error;
    }

    if (!projectsData || projectsData.length === 0) {
      return NextResponse.json({ 
        projects: [], 
        count: 0,
        total: 0
      });
    }

    // Fetch aggregates separately for all projects
    const projectIds = projectsData.map(p => p.id);
    const [ratingsAggResult, fundingsAggResult] = await Promise.all([
      supabaseAdmin!
        .from('arcindex_ratings_agg')
        .select('*')
        .in('project_id', projectIds),
      supabaseAdmin!
        .from('arcindex_funding_agg')
        .select('*')
        .in('project_id', projectIds),
    ]);

    // Create maps for quick lookup
    const ratingsMap = new Map(
      (ratingsAggResult.data || []).map(r => [r.project_id, r])
    );
    const fundingsMap = new Map(
      (fundingsAggResult.data || []).map(f => [f.project_id, f])
    );

    // Transform data to match ProjectWithAggregates type
    // Parse NUMERIC values correctly (Supabase returns them as strings)
    let projects: ProjectWithAggregates[] = projectsData.map((p: any) => {
      const ratingAgg = ratingsMap.get(p.id);
      const fundingAgg = fundingsMap.get(p.id);
      
      return {
        ...p,
        rating_agg: ratingAgg ? {
          ...ratingAgg,
          avg_stars: typeof ratingAgg.avg_stars === 'string' 
            ? parseFloat(ratingAgg.avg_stars) 
            : ratingAgg.avg_stars,
        } : null,
        funding_agg: fundingAgg ? {
          ...fundingAgg,
          total_usdc: typeof fundingAgg.total_usdc === 'string' 
            ? parseFloat(fundingAgg.total_usdc) 
            : fundingAgg.total_usdc,
        } : null,
      };
    });

    // Apply sorting for rating and funding (since we have aggregates now)
    if (params.sort === 'top_rated') {
      projects.sort((a, b) => {
        const aRating = a.rating_agg?.avg_stars || 0;
        const bRating = b.rating_agg?.avg_stars || 0;
        // If ratings are equal, use ratings_count as tiebreaker
        if (bRating === aRating) {
          return (b.rating_agg?.ratings_count || 0) - (a.rating_agg?.ratings_count || 0);
        }
        return bRating - aRating;
      });
    } else if (params.sort === 'most_funded') {
      projects.sort((a, b) => {
        // Values are already parsed to numbers in the transform above
        const aFunding = a.funding_agg?.total_usdc || 0;
        const bFunding = b.funding_agg?.total_usdc || 0;
        return bFunding - aFunding;
      });
    }

    // Apply pagination AFTER sorting for non-newest sorts
    if (params.sort !== 'newest') {
      projects = projects.slice(params.offset, params.offset + params.limit);
    }

    return NextResponse.json({ 
      projects, 
      count: projects.length,
      total: count || 0 
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    
    // Check if it's a table not found error
    if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
      return NextResponse.json(
        {
          error: 'Database tables not found. Please apply migrations in Supabase.',
          details: 'Run the SQL migrations from supabase/migrations/ in your Supabase dashboard.',
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();
    
    const validated = createProjectSchema.parse(body);

    // Create project
    const { data: project, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .insert({
        owner_wallet: normalizeWalletAddress(session.walletAddress),
        status: 'Draft',
        name: validated.name,
        description: validated.description,
        full_description: validated.full_description || null,
        category: validated.category,
        x_url: validated.x_url || null,
        github_url: validated.github_url || null,
        linkedin_url: validated.linkedin_url || null,
        discord_url: validated.discord_url || null,
        discord_username: validated.discord_username || null,
        website_url: validated.website_url,
        contracts_json: validated.contracts_json,
        metadata_json: validated,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required', details: 'Please connect your wallet and sign in to create a project.' },
        { status: 401 }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      
      // Format validation errors for better user experience
      const formattedErrors = error.errors.map((err) => {
        let message = err.message;
        
        // Improve specific error messages
        if (err.code === 'invalid_string' && err.validation === 'url') {
          message = 'Please include "https://" or "http://" at the beginning of the URL. Example: https://example.com';
        } else if (err.code === 'too_small') {
          message = 'This field is required';
        } else if (err.code === 'too_big') {
          message = `This field is too long (maximum ${err.maximum} characters)`;
        } else if (err.code === 'invalid_string' && err.validation === 'regex') {
          message = 'Contract address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)';
        }
        
        return {
          path: err.path,
          message,
          code: err.code,
        };
      });
      
      // Create user-friendly error message
      const fieldNames: Record<string, string> = {
        'website_url': 'Website URL',
        'x_url': 'Twitter/X URL',
        'github_url': 'GitHub URL',
        'linkedin_url': 'LinkedIn URL',
        'discord_url': 'Discord URL',
        'discord_username': 'Discord Username',
        'description': 'Short Description',
        'full_description': 'Full Description',
        'name': 'Project Name',
        'category': 'Category',
      };
      
      const errorMessages = formattedErrors.map((err) => {
        const fieldName = err.path[0] ? (fieldNames[err.path[0] as string] || err.path[0]) : 'Field';
        return `${fieldName}: ${err.message}`;
      });
      
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: errorMessages.join('; '),
          errors: formattedErrors, // Also include structured errors for programmatic access
        },
        { status: 400 }
      );
    }

    console.error('Error creating project:', error);
    
    // Check if it's a Supabase error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message || String(error);
      return NextResponse.json(
        { 
          error: 'Failed to create project',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

