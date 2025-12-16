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

    // Build data query
    let query = supabaseAdmin!
      .from('arcindex_projects')
      .select(`
        *,
        arcindex_ratings_agg (*),
        arcindex_funding_agg (*)
      `)
      .eq('status', 'Approved');
    
    // Filter out deleted projects
    query = query.is('deleted_at', null);

    // Category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // Search filter
    if (params.q) {
      query = query.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
    }

    // Sorting
    if (params.sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (params.sort === 'top_rated') {
      query = query.order('arcindex_ratings_agg.avg_stars', { ascending: false, nullsFirst: false });
    } else if (params.sort === 'most_funded') {
      query = query.order('arcindex_funding_agg.total_usdc', { ascending: false, nullsFirst: false });
    }

    // Pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match ProjectWithAggregates type
    const projects: ProjectWithAggregates[] = (data || []).map((p: any) => ({
      ...p,
      rating_agg: p.arcindex_ratings_agg?.[0] || null,
      funding_agg: p.arcindex_funding_agg?.[0] || null,
    }));

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
      return NextResponse.json(
        { error: 'Invalid request body', details: JSON.stringify(error.errors) },
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

