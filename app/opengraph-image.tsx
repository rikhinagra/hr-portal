import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SACHHSOFT — Employee Portal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0f1a2e',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 100px',
          position: 'relative',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Subtle background texture — diagonal gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(200,152,94,0.06) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Top-right corner accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle at top right, rgba(200,152,94,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Left gold accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            width: '6px',
            height: '70%',
            background: 'linear-gradient(to bottom, transparent, #c8985e, transparent)',
            borderRadius: '0 4px 4px 0',
            display: 'flex',
          }}
        />

        {/* Company tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '30px',
              letterSpacing: '4px',
              color: '#c8985e',
              textTransform: 'uppercase',
              fontFamily: 'Georgia, serif',
            }}
          >
            AadhCode Solutions Pvt. Ltd.
          </span>
        </div>

        {/* Main brand name */}
        <div
          style={{
            fontSize: '96px',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-1px',
            lineHeight: '1',
            marginBottom: '20px',
            fontFamily: 'Georgia, serif',
          }}
        >
          SACHHSOFT
        </div>

        {/* Gold underline */}
        <div
          style={{
            width: '80px',
            height: '4px',
            background: '#c8985e',
            borderRadius: '2px',
            marginBottom: '28px',
            display: 'flex',
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: 'rgba(255,255,255,0.75)',
            fontWeight: '400',
            letterSpacing: '1px',
            fontFamily: 'Georgia, serif',
          }}
        >
          Employee HR Portal
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '52px',
            left: '100px',
            right: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '30px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            Leave · Equipment · Handbook · Policies
          </span>
          <span
            style={{
              fontSize: '30px',
              color: 'rgba(200,152,94,0.7)',
              letterSpacing: '1px',
            }}
          >
            portal.sachhsoft.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
