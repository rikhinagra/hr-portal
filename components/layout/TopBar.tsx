'use client';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function TopBar({ title, subtitle, onMenuClick }: TopBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 32,
    }}>
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="mobile-menu-btn"
        style={{
          display: 'none',
          width: 40,
          height: 40,
          background: '#0f1a2e',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span style={{ width: 18, height: 2, background: '#c8985e', borderRadius: 1 }} />
        <span style={{ width: 18, height: 2, background: '#c8985e', borderRadius: 1 }} />
        <span style={{ width: 18, height: 2, background: '#c8985e', borderRadius: 1 }} />
      </button>
    </div>
  );
}
