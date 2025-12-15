import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { normalizeWalletAddress } from '@/lib/supabase/auth';
import sharp from 'sharp';
import { Readable } from 'stream';

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '5', 10);
const BANNER_WIDTH = parseInt(process.env.BANNER_WIDTH || '1600', 10);
const BANNER_HEIGHT = parseInt(process.env.BANNER_HEIGHT || '900', 10);
const BANNER_QUALITY = parseInt(process.env.BANNER_QUALITY || '80', 10);
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'arc-index-projects';

export async function POST(
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
    const session = await requireAuth();
    
    // Extract project ID from params (handle both Promise and direct object for Next.js compatibility)
    const resolvedParams = await Promise.resolve(params);
    const projectId = resolvedParams.id;
    
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      console.error('Project ID is missing or invalid:', projectId);
      return NextResponse.json(
        { error: 'Project ID is required', details: `Received: ${projectId}` },
        { status: 400 }
      );
    }
    
    console.log('Uploading image for project ID:', projectId);
    
    // Get project
    const { data: project, error: fetchError } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      console.error('Project fetch error:', fetchError);
      console.error('Project ID searched:', projectId);
      return NextResponse.json(
        { error: 'Project not found', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Verify ownership
    if (normalizeWalletAddress(project.owner_wallet) !== normalizeWalletAddress(session.walletAddress)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Only allow image upload for Draft or Rejected projects
    if (project.status !== 'Draft' && project.status !== 'Rejected') {
      return NextResponse.json(
        { error: 'Cannot upload image for project in current status' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_UPLOAD_MB) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_UPLOAD_MB}MB limit` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process banner image (1600x900, center crop, webp)
    const bannerBuffer = await sharp(buffer)
      .resize(BANNER_WIDTH, BANNER_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: BANNER_QUALITY })
      .toBuffer();

    // Process thumbnail (800x450)
    const thumbBuffer = await sharp(buffer)
      .resize(800, 450, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: BANNER_QUALITY })
      .toBuffer();

    // Upload to Supabase Storage
    const bannerPath = `${projectId}/banner.webp`;
    const thumbPath = `${projectId}/banner_thumb.webp`;

    const { error: bannerUploadError } = await supabaseAdmin!.storage
      .from(STORAGE_BUCKET)
      .upload(bannerPath, bannerBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (bannerUploadError) {
      throw bannerUploadError;
    }

    const { error: thumbUploadError } = await supabaseAdmin!.storage
      .from(STORAGE_BUCKET)
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (thumbUploadError) {
      throw thumbUploadError;
    }

    // Get public URLs
    const { data: bannerData } = supabaseAdmin!.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(bannerPath);

    const { data: thumbData } = supabaseAdmin!.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(thumbPath);

    // Update project with image URLs
    const { error: updateError } = await supabaseAdmin!
      .from('arcindex_projects')
      .update({
        image_url: bannerData.publicUrl,
        image_thumb_url: thumbData.publicUrl,
      })
      .eq('id', projectId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      image_url: bannerData.publicUrl,
      image_thumb_url: thumbData.publicUrl,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

