import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireCuratorOrAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import type { UpdateProjectInput } from '@/packages/shared';

// More flexible schema - validate manually after preprocessing
const adminUpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(400).optional(),
  full_description: z.union([z.string().max(5000), z.null(), z.literal('')]).optional(),
  category: z.string().min(1).optional(),
  x_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
  github_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
  linkedin_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
  discord_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
  discord_username: z.union([z.string().max(100), z.null(), z.literal('')]).optional(),
  website_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
  contracts_json: z.array(z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    label: z.string(),
  })).optional().nullable(),
}).passthrough();

export async function PUT(
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
    // Require curator or admin role
    const session = await requireCuratorOrAdmin();
    const body = await request.json();
    
    // Extract project ID from params
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Validate request body
    console.log('Admin edit request body:', JSON.stringify(body, null, 2));
    const validationResult = adminUpdateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors,
          received: body
        },
        { status: 400 }
      );
    }
    
    // Get existing project
    const { data: existing, error: fetchError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Prepare update data - normalize empty strings to null
    const normalizeValue = (val: any) => {
      if (val === '' || val === undefined) return null;
      return val;
    };
    
    const updateData: UpdateProjectInput = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.full_description !== undefined) updateData.full_description = normalizeValue(body.full_description);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.x_url !== undefined) updateData.x_url = normalizeValue(body.x_url);
    if (body.github_url !== undefined) updateData.github_url = normalizeValue(body.github_url);
    if (body.linkedin_url !== undefined) updateData.linkedin_url = normalizeValue(body.linkedin_url);
    if (body.discord_url !== undefined) updateData.discord_url = normalizeValue(body.discord_url);
    if (body.discord_username !== undefined) updateData.discord_username = normalizeValue(body.discord_username);
    if (body.website_url !== undefined) updateData.website_url = normalizeValue(body.website_url);
    if (body.contracts_json !== undefined) updateData.contracts_json = body.contracts_json;

    // Update metadata_json to track admin edits
    const metadataJson = {
      ...existing.metadata_json,
      ...updateData,
      updatedAt: new Date().toISOString(),
      lastEditedBy: session.walletAddress,
      lastEditedByRole: session.role,
      lastEditedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .update({
        ...updateData,
        metadata_json: metadataJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    return NextResponse.json({ 
      project: data,
      message: 'Project updated successfully by admin'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    
    // Handle authentication/authorization errors
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { 
          error: error.message === 'Unauthorized' ? 'Authentication required' : 'Forbidden: Curator or admin access required',
          details: 'Please connect your wallet and ensure you have curator or admin role.'
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

