'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, BookOpen, Monitor, Rocket, AlertTriangle, CalendarDays } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

const features = [
  { Icon: ClipboardList, text: 'Leave management with real-time approvals' },
  { Icon: BookOpen, text: 'Employee handbook with acknowledgement tracking' },
  { Icon: Monitor, text: 'Equipment requests routed to IT automatically' },
  { Icon: Rocket, text: '4-step automated onboarding for new hires' },
];

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [dob, setDob] = useState('');
  const [dobDisplay, setDobDisplay] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [dobFocused, setDobFocused] = useState(false);
  const [showDesktopCal, setShowDesktopCal] = useState(false);
  const [showMobileCal, setShowMobileCal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const desktopCalRef = useRef<HTMLDivElement>(null);

  // Close desktop calendar when clicking outside
  useEffect(() => {
    if (!showDesktopCal) return;
    const handleClick = (e: MouseEvent) => {
      if (desktopCalRef.current && !desktopCalRef.current.contains(e.target as Node)) {
        setShowDesktopCal(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDesktopCal]);

  const handleDobText = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let display = '';
    if (digits.length <= 2) display = digits;
    else if (digits.length <= 4) display = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDobDisplay(display);
    setError('');
    if (digits.length === 8) {
      setDob(`${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
    } else {
      setDob('');
    }
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    setSelectedDay(day);
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    setDob(`${yyyy}-${mm}-${dd}`);
    setDobDisplay(`${dd}/${mm}/${yyyy}`);
    setShowDesktopCal(false);
    setShowMobileCal(false);
  };

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
      window.location.href = '/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const dayPicker = (
    <DayPicker
      mode="single"
      selected={selectedDay}
      onSelect={handleDaySelect}
      captionLayout="dropdown"
      startMonth={new Date(1950, 0)}
      endMonth={new Date(2006, 11)}
      defaultMonth={selectedDay ?? new Date(1990, 0)}
    />
  );

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
          <img src="/aadhcode-logo.webp" alt="Aadhcode" style={{ width: 130, height: 'auto', objectFit: 'contain', marginBottom: 6 }} />
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
              <div style={{ position: 'relative' }}>
                <div inert aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 16, right: 16, display: 'flex', alignItems: 'center', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', zIndex: 0, fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textDecoration: 'none' }}>
                  <span style={{ color: 'transparent', textDecoration: 'none' }}>{code}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{'ADC00000001'.slice(code.length)}</span>
                </div>
                <input
                  type="text" placeholder="" value={code}
                  id="m-code" name="username" autoComplete="off" maxLength={11}
                  spellCheck={false} autoCorrect="off" autoCapitalize="none" data-gramm="false"
                  onChange={e => { setCode(e.target.value.slice(0, 11)); setError(''); }}
                  className="mobile-input"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em', position: 'relative', zIndex: 2, textDecoration: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#c8985e')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.14)')}
                />
              </div>
            </div>
            <div>
              <label className="mobile-label">Date of Birth</label>
              <div style={{ position: 'relative' }}>
                <div inert aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 16, right: 44, display: 'flex', alignItems: 'center', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', zIndex: 0, fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap', overflow: 'hidden', textDecoration: 'none' }}>
                  <span style={{ color: 'transparent', textDecoration: 'none' }}>{dobDisplay}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{'DD/MM/YYYY'.slice(dobDisplay.length)}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={dobDisplay}
                  autoComplete="bday"
                  onChange={e => handleDobText(e.target.value)}
                  className="mobile-input mobile-dob"
                  style={{ paddingRight: '44px', position: 'relative', zIndex: 2 }}
                  onFocus={e => (e.target.style.borderColor = '#c8985e')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.14)')}
                />
                <button
                  type="button"
                  onClick={() => setShowMobileCal(true)}
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <CalendarDays size={16} color="#c8985e" />
                </button>
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
            <div style={{ fontSize: '0.5625rem', letterSpacing: '0.22em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700 }}>Aadhcode</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, marginBottom: 52 }}>
            <img src="/aadhcode-logo.webp" alt="Aadhcode" style={{ width: 'clamp(120px, 12vw, 160px)', height: 'auto', objectFit: 'contain' }} />
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
            <div style={{ fontSize: '0.6875rem', letterSpacing: '0.2em', color: '#c8985e', textTransform: 'uppercase', fontWeight: 700 }}>Aadhcode</div>
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
              <div style={{ position: 'relative', background: '#fff', border: `1.5px solid ${codeFocused ? '#c8985e' : '#e5e7eb'}`, borderRadius: 10, transition: 'border-color .15s' }}>
                <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 16, right: 16, display: 'flex', alignItems: 'center', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', zIndex: 0, fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ color: 'transparent' }}>{code}</span>
                  <span style={{ color: '#9ca3af' }}>{'ADC00000001'.slice(code.length)}</span>
                </div>
                <input type="text" placeholder="" value={code}
                  id="d-code" name="username" autoComplete="username" maxLength={11}
                  spellCheck={false} autoCorrect="off" autoCapitalize="none"
                  onChange={e => { setCode(e.target.value.slice(0, 11)); setError(''); }}
                  style={{ width: '100%', padding: '13px 16px', background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.06em', color: '#1f2937', boxSizing: 'border-box', position: 'relative', zIndex: 2, textDecoration: 'none' }}
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Date of Birth
              </label>
              {/* Desktop calendar — dropdown below input, ghost hint shows remaining format */}
              <div ref={desktopCalRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative', background: '#fff', border: `1.5px solid ${dobFocused ? '#c8985e' : '#e5e7eb'}`, borderRadius: 10, transition: 'border-color .15s' }}>
                  {/* Ghost hint: typed text (transparent) + remaining format (gray) */}
                  <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 16, right: 44, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ color: 'transparent' }}>{dobDisplay}</span>
                    <span style={{ color: '#b0b7c3' }}>{'DD/MM/YYYY'.slice(dobDisplay.length)}</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder=""
                    value={dobDisplay}
                    autoComplete="bday"
                    onChange={e => handleDobText(e.target.value)}
                    style={{ width: '100%', padding: '13px 44px 13px 16px', background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'var(--font-geist-mono), monospace', color: '#1f2937', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}
                    onFocus={() => setDobFocused(true)}
                    onBlur={() => setDobFocused(false)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDesktopCal(s => !s)}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <CalendarDays size={16} color="#c8985e" />
                  </button>
                </div>
                {showDesktopCal && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #e5e7eb', fontSize: '0.8rem', padding: '12px' }}>
                    {dayPicker}
                  </div>
                )}
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

      {/* Mobile calendar — fixed overlay (outside mobile section to avoid overflow:hidden clipping) */}
      {showMobileCal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowMobileCal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151' }}>Select Date of Birth</span>
              <button onClick={() => setShowMobileCal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.375rem', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
            <div style={{ padding: '8px' }}>{dayPicker}</div>
          </div>
        </div>
      )}

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
        .mobile-dob::placeholder { color: rgba(255,255,255,0.2); }
        .desktop-dob::placeholder { color: #9ca3af; }
        .desktop-code::placeholder { color: #9ca3af; }
        #d-code:-webkit-autofill,
        #d-code:-webkit-autofill:hover,
        #d-code:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #fff inset;
          -webkit-text-fill-color: #1f2937;
          transition: background-color 5000s ease-in-out 0s;
        }
        #m-code:-webkit-autofill,
        #m-code:-webkit-autofill:hover,
        #m-code:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #0d1828 inset;
          -webkit-text-fill-color: #fff;
          transition: background-color 5000s ease-in-out 0s;
        }
        .rdp-root {
          --rdp-accent-color: #c8985e;
          --rdp-accent-background-color: rgba(200,152,94,0.12);
          --rdp-cell-size: 32px;
          --rdp-day-width: 32px;
          --rdp-day-height: 32px;
        }
        .rdp-root .rdp-month_caption,
        .rdp-root .rdp-caption_label,
        .rdp-root .rdp-dropdowns,
        .rdp-root .rdp-dropdowns select,
        .rdp-root .rdp-dropdown,
        .rdp-root .rdp-dropdown_month,
        .rdp-root .rdp-dropdown_year {
          font-size: 0.8rem !important;
        }
      `}</style>
    </div>
  );
}
