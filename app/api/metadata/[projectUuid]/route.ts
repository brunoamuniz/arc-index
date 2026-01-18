import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Project } from '@/packages/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectUuid: string }> }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured. Please check your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const { projectUuid } = await params;
    const { data: project, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectUuid)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate NFT image URL (dynamically generated)
    const nftImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/api/nft-image/${project.id}`;
    
    // Format approval date
    const approvalDate = project.updated_at || project.created_at;
    const formattedDate = approvalDate
      ? new Date(approvalDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Approved';

    // Return metadata in OpenSea/ERC-721 compatible format
    const metadata = {
      name: `Arc Index Certificate — ${project.name}`,
      description: `On-chain certificate verifying that "${project.name}" has been reviewed and approved by Arc Index curators. This NFT serves as proof of project ownership and curator certification in the Arc ecosystem.`,
      image: nftImageUrl,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://arcindex.xyz'}/project/${project.id}`,
      attributes: [
        {
          trait_type: 'Project ID',
          value: project.project_id || project.id,
          display_type: 'number',
        },
        {
          trait_type: 'Owner',
          value: project.owner_wallet,
        },
        {
          trait_type: 'Status',
          value: project.status === 'Approved' ? 'OnChainRegistered' : project.status,
        },
        {
          trait_type: 'Chain',
          value: 'Arc Testnet',
        },
        {
          trait_type: 'Category',
          value: project.category,
        },
        {
          trait_type: 'Approval Date',
          value: approvalDate ? new Date(approvalDate).toISOString() : new Date().toISOString(),
          display_type: 'date',
        },
      ],
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

