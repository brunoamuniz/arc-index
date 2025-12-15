import { ImageResponse } from 'next/og'

export const alt = 'Arc Index - Curated Projects on Arc Network'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #000000 0%, #181818 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: '#181818',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 30,
            }}
          >
            <span style={{ color: '#ffffff', fontSize: 48, fontWeight: 'bold' }}>AI</span>
          </div>
          <span style={{ color: '#ffffff', fontSize: 72, fontWeight: 'bold' }}>Arc Index</span>
        </div>
        <p style={{ color: '#a0a0a0', fontSize: 32, marginTop: 20, textAlign: 'center', maxWidth: 900 }}>
          Discover, certify, and support innovative blockchain projects on Arc Network
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
}

