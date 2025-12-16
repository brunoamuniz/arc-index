import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'

// Note: Using nodejs runtime for Supabase compatibility
// Edge runtime has limitations with external API calls
export const alt = 'Arc Index Approval NFT'
export const size = {
  width: 1200,
  height: 1200,
}
export const contentType = 'image/png'

export async function GET(
  request: NextRequest,
  { params }: { params: { projectUuid: string } }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return new Response('Database not configured', { status: 503 })
  }

  try {
    const { data: project, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', params.projectUuid)
      .single()

    if (error || !project) {
      return new Response('Project not found', { status: 404 })
    }

    // Format date
    const approvalDate = project.updated_at 
      ? new Date(project.updated_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'Approved'

    return new ImageResponse(
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
          position: 'relative',
          padding: '80px',
        }}
      >
          {/* Decorative border */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '8px solid',
              borderImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899) 1',
              borderRadius: '24px',
            }}
          />

          {/* Header with Arc Index branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '60px',
            }}
          >
            <div
              style={{
                width: '80',
                height: '80',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '24px',
              }}
            >
              <span style={{ color: '#ffffff', fontSize: '40', fontWeight: 'bold' }}>AI</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#ffffff', fontSize: '48', fontWeight: 'bold' }}>Arc Index</span>
              <span style={{ color: '#a0a0a0', fontSize: '24', marginTop: '4px' }}>Approval Certificate</span>
            </div>
          </div>

          {/* Project Image or Placeholder */}
          {project.image_url ? (
            <img
              src={project.image_url}
              alt={project.name}
              width="400"
              height="400"
              style={{
                borderRadius: '24px',
                objectFit: 'cover',
                marginBottom: '40px',
                border: '4px solid #2a2a2a',
              }}
            />
          ) : (
            <div
              style={{
                width: '400',
                height: '400',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '40px',
                border: '4px solid #2a2a2a',
              }}
            >
              <span style={{ color: '#6366f1', fontSize: '120', fontWeight: 'bold' }}>
                {project.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Project Name */}
          <h1
            style={{
              color: '#ffffff',
              fontSize: '64',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '20px',
              maxWidth: '900px',
            }}
          >
            {project.name}
          </h1>

          {/* Project Description */}
          <p
            style={{
              color: '#a0a0a0',
              fontSize: '32',
              textAlign: 'center',
              marginBottom: '40px',
              maxWidth: '900px',
              lineHeight: '1.4',
            }}
          >
            {project.description}
          </p>

          {/* Badge and Info Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              marginTop: '40px',
            }}
          >
            {/* Approved Badge */}
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                padding: '16px 48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ color: '#ffffff', fontSize: '28', fontWeight: 'bold' }}>✓</span>
              <span style={{ color: '#ffffff', fontSize: '28', fontWeight: 'bold' }}>APPROVED</span>
            </div>

            {/* Category and Date */}
            <div
              style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                }}
              >
                <span style={{ color: '#a0a0a0', fontSize: '20' }}>Category: </span>
                <span style={{ color: '#ffffff', fontSize: '20', fontWeight: 'bold' }}>{project.category}</span>
              </div>
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                }}
              >
                <span style={{ color: '#a0a0a0', fontSize: '20' }}>Date: </span>
                <span style={{ color: '#ffffff', fontSize: '20', fontWeight: 'bold' }}>{approvalDate}</span>
              </div>
            </div>

            {/* Project ID */}
            {project.project_id && (
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                }}
              >
                <span style={{ color: '#a0a0a0', fontSize: '20' }}>Project ID: </span>
                <span style={{ color: '#6366f1', fontSize: '20', fontWeight: 'bold' }}>#{project.project_id}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#666',
              fontSize: '20',
            }}
          >
            arcindex.xyz
          </div>
        </div>,
      {
        ...size,
      }
    )
  } catch (error) {
    console.error('Error generating NFT image:', error)
    return new Response('Failed to generate NFT image', { status: 500 })
  }
}

