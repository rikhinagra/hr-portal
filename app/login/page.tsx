'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, BookOpen, Monitor, Rocket, AlertTriangle, CalendarDays } from 'lucide-react';

const features = [
  { Icon: ClipboardList, text: 'Leave management with real-time approvals' },
  { Icon: BookOpen, text: 'Employee handbook with acknowledgement tracking' },
  { Icon: Monitor, text: 'Equipment requests routed to IT automatically' },
  { Icon: Rocket, text: '10-step automated onboarding for new hires' },
];

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !dob) { setError('Please enter both Employee Code and Date of Birth.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_code: code.trim().toUpperCase(), dob }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid Employee Code or Date of Birth.'); setLoading(false); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ═══ MOBILE — full dark page ═══ */}
      <div className="login-mobile-full" style={{
        display: 'none', flexDirection: 'column',
        background: 'linear-gradient(160deg, #080f1c 0%, #0d1828 45%, #162444 100%)',
        minHeight: '100vh', padding: '52px 28px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -90, right: -90, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(200,152,94,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -32, right: -32, width: 150, height: 150, borderRadius: '50%', border: '1px solid rgba(200,152,94,.11)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(200,152,94,.05)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 120, height: 32, marginBottom: 12,
            backgroundColor: '#fff',
            WebkitMaskImage: 'url(/sachhsoft_logo.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center',
            maskImage: 'url(/sachhsoft_logo.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left center'
          }} />
          <div style={{ fontSize: '0.625rem', letterSpacing: '0.18em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, WebkitUserSelect: 'none', userSelect: 'none' }}>
            AadhCode Solutions Pvt. Ltd.
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.3)', marginBottom: 30, WebkitUserSelect: 'none', userSelect: 'none' }}>HR Portal</div>

          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '2rem', color: '#fff', lineHeight: 1.2, fontWeight: 700, marginBottom: 36, WebkitUserSelect: 'none', userSelect: 'none' }}>
            Your Workplace,<br /><span style={{ color: '#c8985e' }}>All in One Place</span>
          </h1>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 36 }}>
            <div>
              <label className="mobile-label">Employee Code</label>
              <input
                type="text" placeholder="e.g. AC001" value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                className="mobile-input"
                style={{ fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em' }}
                onFocus={e => (e.target.style.borderColor = '#c8985e')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.14)')}
              />
            </div>
            <div>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={dob}
                  onChange={e => { setDob(e.target.value); setError(''); }}
                  className="mobile-input mobile-date"
                  style={{ color: dob ? '#fff' : 'transparent' }}
                  onFocus={e => (e.target.style.borderColor = '#c8985e')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.14)')}
                />
                {!dob && (
                  <span style={{ position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', fontSize: '1rem', pointerEvents: 'none' }}>
                    YYYY-MM-DD
                  </span>
                )}
                <CalendarDays size={16} color="#c8985e" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 8, padding: '12px 16px', fontSize: '0.875rem', color: '#f87171', display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertTriangle size={15} color="#f87171" style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '14px', background: loading ? '#a07540' : '#c8985e', color: '#0f1a2e', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: loading ? 'wait' : 'pointer', transition: 'all .2s', letterSpacing: '0.02em' }}>
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div style={{ paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.3)', lineHeight: 1.75, marginBottom: 18 }}>
              Leaves, handbooks, policies, equipment, onboarding. Manage everything from a single portal built for your team.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <f.Icon size={14} color="rgba(200,152,94,0.6)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.38)' }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: '0.5625rem', letterSpacing: '0.22em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700 }}>SACHHSOFT</div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,.18)', marginTop: 3 }}>Confidential · For Internal Use Only</div>
          </div>
        </div>
      </div>

      {/* ═══ DESKTOP LEFT PANEL ═══ */}
      <div className="login-left" style={{
        flex: '0 0 55%',
        background: 'linear-gradient(145deg, #080f1c 0%, #0f1a2e 50%, #162444 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'flex-start', padding: '60px 72px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(200,152,94,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(200,152,94,.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(200,152,94,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginBottom: 52 }}>
            <div style={{
              width: 140, height: 38,
              backgroundColor: '#fff',
              WebkitMaskImage: 'url(/sachhsoft_logo.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center',
              maskImage: 'url(/sachhsoft_logo.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left center'
            }} />
            <div>
              <div style={{ fontSize: '0.6875rem', letterSpacing: '0.18em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700 }}>AadhCode Solutions Pvt. Ltd.</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.4)', marginTop: 3 }}>HR Portal</div>
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#fff', lineHeight: 1.15, marginBottom: 20, fontWeight: 700 }}>
            Your Workplace,<br /><span style={{ color: '#c8985e' }}>All in One Place</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.85, marginBottom: 48, maxWidth: 380 }}>
            Leaves, handbooks, policies, equipment, onboarding. Manage everything from a single portal built for your team.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <f.Icon size={16} color="rgba(200,152,94,0.7)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,.5)' }}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: '0.6875rem', letterSpacing: '0.2em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700 }}>SACHHSOFT</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.2)', marginTop: 4 }}>Confidential · For Internal Use Only</div>
          </div>
        </div>
      </div>

      {/* ═══ DESKTOP RIGHT PANEL ═══ */}
      <div className="login-right" style={{ flex: 1, background: '#faf9f7', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 52px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '2rem', color: '#0f1a2e', fontWeight: 700, marginBottom: 8 }}>Welcome back</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9375rem' }}>Sign in with your employee credentials</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Employee Code
              </label>
              <input type="text" placeholder="e.g. AC001" value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', background: '#fff', color: '#1f2937', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em' }}
                onFocus={e => (e.target.style.borderColor = '#c8985e')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Date of Birth
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date"
                  value={dob}
                  onChange={e => { setDob(e.target.value); setError(''); }}
                  className="desktop-date"
                  style={{ width: '100%', padding: '13px 44px 13px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: '1rem', background: '#fff', color: dob ? '#1f2937' : 'transparent', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={e => (e.target.style.borderColor = '#c8985e')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                />
                {!dob && (
                  <span style={{ position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1rem', pointerEvents: 'none' }}>
                    YYYY-MM-DD
                  </span>
                )}
                <CalendarDays size={16} color="#c8985e" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: '0.875rem', color: '#dc2626', display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '14px', background: loading ? '#d1b896' : '#c8985e', color: '#0f1a2e', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: loading ? 'wait' : 'pointer', transition: 'all .2s', letterSpacing: '0.02em' }}>
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-mobile-full { display: flex !important; }
          .login-left { display: none !important; }
          .login-right { display: none !important; }
        }
        .mobile-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 700;
          color: rgba(255,255,255,.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .mobile-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid rgba(255,255,255,.14);
          border-radius: 10px;
          font-size: 1rem;
          background: rgba(255,255,255,.06);
          color: #fff;
          outline: none;
          box-sizing: border-box;
          transition: border-color .15s;
        }
        .mobile-input::placeholder { color: rgba(255,255,255,0.2); }
        .mobile-date {
          position: relative;
          appearance: none;
          -webkit-appearance: none;
        }
        .mobile-date::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .desktop-date {
          position: relative;
          appearance: none;
          -webkit-appearance: none;
        }
        .desktop-date::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
