import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Project } from '@/packages/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectUuid: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const { data: project, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', params.projectUuid)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate NFT image URL (dynamically generated)
    const nftImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/nft-image/${project.id}`;
    
    // Return metadata in OpenSea/ERC-721 compatible format
    const metadata = {
      name: `${project.name} - Arc Index Approval`,
      description: `${project.description}\n\nThis NFT certifies that "${project.name}" has been reviewed and approved by Arc Index curators. It serves as an on-chain verification badge for the project.`,
      image: nftImageUrl,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/project/${project.id}`,
      attributes: [
        {
          trait_type: 'Category',
          value: project.category,
        },
        {
          trait_type: 'Status',
          value: project.status,
        },
        {
          trait_type: 'Project ID',
          value: project.project_id || project.id,
          display_type: 'number',
        },
        {
          trait_type: 'Approval Date',
          value: new Date(project.updated_at || project.created_at).toISOString(),
          display_type: 'date',
        },
      ],
      properties: {
        category: project.category,
        owner: project.owner_wallet,
        github: project.github_url,
        website: project.website_url,
        project_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/project/${project.id}`,
      },
    };

    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

