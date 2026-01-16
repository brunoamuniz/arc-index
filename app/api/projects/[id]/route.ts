import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import type { CreateProjectInput, UpdateProjectInput, ProjectWithAggregates } from '@/packages/shared';
import { normalizeWalletAddress } from '@/lib/supabase/auth';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(400), // Short description
  full_description: z.string().max(5000).optional(), // Full description
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    // Extract project ID from params
    const { id: projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin!
      .from('arcindex_projects')
      .select(`
        *,
        arcindex_ratings_agg (*),
        arcindex_funding_agg (*)
      `)
      .eq('id', projectId);
    
    // Filter out deleted projects
    query = query.is('deleted_at', null);
    
    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project: ProjectWithAggregates = {
      ...data,
      rating_agg: data.arcindex_ratings_agg?.[0] || null,
      funding_agg: data.arcindex_funding_agg?.[0] || null,
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();

    // Extract project ID from params
    const { id: projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Get existing project
    let existingQuery = supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId);
    
    // Note: Filter by deleted_at is applied after migration 004
    // For now, we'll skip this filter to maintain backward compatibility
    // Once migration 004 is applied, uncomment the line below:
    // existingQuery = existingQuery.is('deleted_at', null);
    
    const { data: existing, error: fetchError } = await existingQuery.single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (normalizeWalletAddress(existing.owner_wallet) !== normalizeWalletAddress(session.walletAddress)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Only allow updates to Draft or Submitted (pending review) projects
    // Approved and Rejected projects cannot be edited (only deleted)
    if (existing.status !== 'Draft' && existing.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'Cannot update project in current status. Only Draft and Submitted projects can be edited.' },
        { status: 400 }
      );
    }

    // Validate and prepare update
    const updateData: UpdateProjectInput = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.full_description !== undefined) updateData.full_description = body.full_description || null;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.x_url !== undefined) updateData.x_url = body.x_url || null;
    if (body.github_url !== undefined) updateData.github_url = body.github_url || null;
    if (body.linkedin_url !== undefined) updateData.linkedin_url = body.linkedin_url || null;
    if (body.discord_url !== undefined) updateData.discord_url = body.discord_url || null;
    if (body.discord_username !== undefined) updateData.discord_username = body.discord_username || null;
    if (body.website_url !== undefined) updateData.website_url = body.website_url || null;
    if (body.contracts_json !== undefined) updateData.contracts_json = body.contracts_json;

    // Update metadata_json
    const metadataJson = {
      ...existing.metadata_json,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .update({
        ...updateData,
        metadata_json: metadataJson,
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const session = await requireAuth();

    // Extract project ID from params
    const { id: projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Get existing project
    let existingQuery = supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId);
    
    // Note: Filter by deleted_at is applied after migration 004
    // For now, we'll skip this filter to maintain backward compatibility
    // Once migration 004 is applied, uncomment the line below:
    // existingQuery = existingQuery.is('deleted_at', null);
    
    const { data: existing, error: fetchError } = await existingQuery.single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership - only the owner can delete their project
    if (normalizeWalletAddress(existing.owner_wallet) !== normalizeWalletAddress(session.walletAddress)) {
      return NextResponse.json(
        { error: 'Forbidden: Only the project owner can delete it' },
        { status: 403 }
      );
    }

    // Soft delete: set deleted_at timestamp instead of actually deleting
    // Try to update deleted_at, but handle gracefully if column doesn't exist yet
    try {
      const { error: deleteError } = await supabaseAdmin!
        .from('arcindex_projects')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      
      if (deleteError) {
        // If error is about column not existing, return helpful message
        if (deleteError.message?.includes('deleted_at') || deleteError.message?.includes('column')) {
          return NextResponse.json(
            { 
              error: 'Soft delete not available. Please apply migration 004_add_deleted_at_to_projects.sql in Supabase.',
              details: 'The deleted_at column does not exist yet. Apply the migration to enable project deletion.'
            },
            { status: 503 }
          );
        }
        throw deleteError;
      }
    } catch (error: any) {
      // If it's a column not found error, return helpful message
      if (error?.message?.includes('deleted_at') || error?.message?.includes('column')) {
        return NextResponse.json(
          { 
            error: 'Soft delete not available. Please apply migration 004_add_deleted_at_to_projects.sql in Supabase.',
            details: 'The deleted_at column does not exist yet. Apply the migration to enable project deletion.'
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

