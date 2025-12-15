import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  category: z.string().nullable().transform(val => val || undefined).optional(),
  limit: z.coerce.number().int().positive().max(100).nullable().transform(val => val || 50).default(50),
  offset: z.coerce.number().int().nonnegative().nullable().transform(val => val || 0).default(0),
});

// API Key validation (optional - can be set via environment variable)
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedApiKey = process.env.PUBLIC_API_KEY;
  
  // If no API key is configured, allow public access
  if (!expectedApiKey) {
    return true;
  }
  
  // If API key is configured, require it
  return apiKey === expectedApiKey;
}

export interface PublicProject {
  id: string;
  name: string;
  description: string;
  category: string;
  website_url: string;
  x_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  rating: number | null;
  funding_total: number | null;
  created_at: string;
  project_url: string;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Validate API key if configured
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      category: searchParams.get('category'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    // Build base URL for project links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.NEXT_PUBLIC_VERCEL_URL ? 
                      `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 
                      'http://localhost:3000';

    let query = supabaseAdmin!
      .from('arcindex_projects')
      .select(`
        id,
        name,
        description,
        category,
        website_url,
        x_url,
        github_url,
        linkedin_url,
        image_url,
        image_thumb_url,
        created_at,
        arcindex_ratings_agg (avg_stars),
        arcindex_funding_agg (total_usdc)
      `)
      .eq('status', 'Approved');
    
    // Filter out deleted projects
    query = query.is('deleted_at', null);

    // Category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching public projects:', error);
      throw error;
    }

    // Transform data to match PublicProject interface
    const projects: PublicProject[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description, // Short description (max 400 chars)
      category: p.category,
      website_url: p.website_url,
      x_url: p.x_url,
      github_url: p.github_url,
      linkedin_url: p.linkedin_url,
      image_url: p.image_url,
      image_thumb_url: p.image_thumb_url || p.image_url, // Fallback to main image if thumb not available
      rating: p.arcindex_ratings_agg?.[0]?.avg_stars ? 
        parseFloat(p.arcindex_ratings_agg[0].avg_stars) : null,
      funding_total: p.arcindex_funding_agg?.[0]?.total_usdc ? 
        parseFloat(p.arcindex_funding_agg[0].total_usdc) : null,
      created_at: p.created_at,
      project_url: `${baseUrl}/project/${p.id}`,
    }));

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: projects.length,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error in public projects API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    },
  });
}

