import { NextRequest } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server'
import sharp from 'sharp'

// Using nodejs runtime for Supabase compatibility
// SVG + sharp approach works in both nodejs runtime and Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 1200
const HEIGHT = 1200

// Escape special characters for SVG
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Truncate text to fit within a certain width (approximate)
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars - 3) + '...'
}

// Wrap text into multiple lines for SVG
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  // Limit to 3 lines max
  if (lines.length > 3) {
    lines.length = 3
    lines[2] = truncateText(lines[2], maxCharsPerLine - 3) + '...'
  }

  return lines
}

// Generate SVG for the NFT certificate
function generateSvg(project: {
  name: string
  description: string
  category: string
  project_id?: number
  updated_at?: string
}): string {
  const approvalDate = project.updated_at
    ? new Date(project.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Approved'

  const projectInitial = project.name.charAt(0).toUpperCase()
  const projectName = escapeXml(truncateText(project.name, 40))
  const descriptionLines = wrapText(project.description || '', 50).map(line => escapeXml(line))
  const category = escapeXml(project.category || 'Project')

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a"/>
      <stop offset="50%" style="stop-color:#1a1a1a"/>
      <stop offset="100%" style="stop-color:#0a0a0a"/>
    </linearGradient>

    <!-- Border gradient -->
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="50%" style="stop-color:#8b5cf6"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>

    <!-- Logo gradient -->
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>

    <!-- Approved badge gradient -->
    <linearGradient id="approvedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>

    <!-- Project circle gradient -->
    <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2a2a2a"/>
      <stop offset="100%" style="stop-color:#1a1a1a"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGradient)"/>

  <!-- Decorative border -->
  <rect x="8" y="8" width="${WIDTH - 16}" height="${HEIGHT - 16}" rx="24" ry="24"
        fill="none" stroke="url(#borderGradient)" stroke-width="8"/>

  <!-- Header: Logo Box -->
  <rect x="440" y="80" width="80" height="80" rx="16" fill="url(#logoGradient)"/>
  <text x="480" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="40"
        font-weight="bold" fill="white" text-anchor="middle">AI</text>

  <!-- Header: Arc Index text -->
  <text x="600" y="120" font-family="system-ui, -apple-system, sans-serif" font-size="48"
        font-weight="bold" fill="white">Arc Index</text>
  <text x="600" y="155" font-family="system-ui, -apple-system, sans-serif" font-size="24"
        fill="#a0a0a0">Approval Certificate</text>

  <!-- Project Initial Circle -->
  <circle cx="600" cy="400" r="200" fill="url(#circleGradient)" stroke="#2a2a2a" stroke-width="4"/>
  <text x="600" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="120"
        font-weight="bold" fill="#6366f1" text-anchor="middle">${escapeXml(projectInitial)}</text>

  <!-- Project Name -->
  <text x="600" y="660" font-family="system-ui, -apple-system, sans-serif" font-size="56"
        font-weight="bold" fill="white" text-anchor="middle">${projectName}</text>

  <!-- Project Description -->
  <text x="600" y="710" font-family="system-ui, -apple-system, sans-serif" font-size="26"
        fill="#a0a0a0" text-anchor="middle">
    ${descriptionLines.map((line, i) => `<tspan x="600" dy="${i === 0 ? 0 : 32}">${line}</tspan>`).join('\n    ')}
  </text>

  <!-- Approved Badge -->
  <rect x="420" y="830" width="360" height="60" rx="12" fill="url(#approvedGradient)"/>
  <text x="600" y="872" font-family="system-ui, -apple-system, sans-serif" font-size="28"
        font-weight="bold" fill="white" text-anchor="middle">[OK] APPROVED</text>

  <!-- Category Box -->
  <rect x="280" y="920" width="280" height="50" rx="8" fill="#1a1a1a" stroke="#2a2a2a" stroke-width="1"/>
  <text x="420" y="955" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">
    <tspan fill="#a0a0a0">Category: </tspan>
    <tspan fill="white" font-weight="bold">${category}</tspan>
  </text>

  <!-- Date Box -->
  <rect x="640" y="920" width="280" height="50" rx="8" fill="#1a1a1a" stroke="#2a2a2a" stroke-width="1"/>
  <text x="780" y="955" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">
    <tspan fill="#a0a0a0">Date: </tspan>
    <tspan fill="white" font-weight="bold">${escapeXml(approvalDate)}</tspan>
  </text>

  ${project.project_id ? `
  <!-- Project ID Box -->
  <rect x="420" y="1000" width="360" height="50" rx="8" fill="#1a1a1a" stroke="#2a2a2a" stroke-width="1"/>
  <text x="600" y="1035" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">
    <tspan fill="#a0a0a0">Project ID: </tspan>
    <tspan fill="#6366f1" font-weight="bold">#${project.project_id}</tspan>
  </text>
  ` : ''}

  <!-- Footer -->
  <text x="600" y="${HEIGHT - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="20"
        fill="#666" text-anchor="middle">arcindex.xyz</text>
</svg>`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectUuid: string }> }
) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return new Response('Database not configured', { status: 503 })
  }

  try {
    const { projectUuid } = await params
    const { data: project, error } = await supabaseAdmin!
      .from('arcindex_projects')
      .select('*')
      .eq('id', projectUuid)
      .single()

    if (error || !project) {
      return new Response('Project not found', { status: 404 })
    }

    // Generate SVG
    const svg = generateSvg(project)

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(WIDTH, HEIGHT)
      .png()
      .toBuffer()

    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('Error generating NFT image:', errorMessage)
    if (errorStack) console.error('Error stack:', errorStack)

    return new Response(
      JSON.stringify({
        error: 'Failed to generate NFT image',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
