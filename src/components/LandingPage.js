import React, { useState } from 'react';
import { isSupabaseConfigured, signInWithOtp, signInWithProvider } from '../lib/supabaseClient';
import logo from '../assets/Sphera Logo v2 Transparent.png';
import './HomeFeed.css';

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: 'rgba(160,130,210,0.7)',
      cursor: 'pointer', padding: '0 0 28px',
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      Back
    </button>
  );
}

export default function LandingPage() {
  const [view, setView] = useState('home');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleGoogle() {
    setLoading(true);
    await signInWithProvider('google');
  }

  async function handleEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signInWithOtp(email.trim());
    setSent(true);
    setLoading(false);
  }

  function goBack() {
    setView('home');
    setSent(false);
    setEmail('');
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 20px 48px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Large atmospheric glow behind sphere */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '42%',
        transform: 'translateX(-50%)',
        width: 520,
        height: 440,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(108,40,217,0.22) 0%, rgba(70,15,150,0.08) 45%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Branding */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 60, paddingBottom: 32,
        position: 'relative', zIndex: 1,
      }}>
        {/* Sphere + glow ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          {/* Soft outer glow */}
          <div style={{
            position: 'absolute',
            width: 320, height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(120,50,240,0.3) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }} />
          {/* Orbit ring */}
          <div style={{
            position: 'absolute',
            width: 320, height: 85,
            border: '1px solid rgba(150,90,255,0.18)',
            borderRadius: '50%',
            transform: 'rotate(-18deg) translateX(12px)',
          }} />
          {/* Logo */}
          <img
            src={logo}
            alt="Sphera"
            style={{
              width: 200, height: 200,
              objectFit: 'contain',
              position: 'relative', zIndex: 1,
              filter: 'drop-shadow(0 0 28px rgba(130,50,240,0.75)) drop-shadow(0 0 70px rgba(100,20,200,0.4))',
            }}
          />
        </div>

        <div style={{
          fontSize: 56, fontWeight: 800, color: '#FFFFFF',
          letterSpacing: '-2px', lineHeight: 1, marginBottom: 12,
          fontFamily: "'Manrope', sans-serif",
        }}>
          Sphera
        </div>
        <div style={{ fontSize: 15, color: '#9B72CF', fontWeight: 500, textAlign: 'center', lineHeight: 1.5 }}>
          Your campus. Your people. Your scene.
        </div>
      </div>

      {/* Auth area */}
      <div style={{ width: '100%', maxWidth: 390, position: 'relative', zIndex: 1 }}>
        {!configured ? (
          <div style={{ color: '#888', fontSize: 13, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, textAlign: 'center' }}>
            Supabase is not configured.
          </div>

        ) : view === 'home' ? (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <AccountCard
                icon={<PersonIcon />}
                label="I'm a Student"
                sub="Join your campus community"
                onClick={() => setView('student')}
              />
              <AccountCard
                icon={<BuildingIcon />}
                label="I'm an Organization"
                sub="Create or manage your org"
                onClick={() => setView('org')}
              />
            </div>

            {/* Bottom tagline */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 18, marginTop: 36,
              color: '#6B4FA0', fontSize: 13, fontWeight: 500,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SparkleIcon /> Real connections.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HeartIcon /> Real campus.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BoltIcon /> Real you.
              </span>
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: '#555', textAlign: 'center' }}>
              By continuing you agree to Sphera's community guidelines.
            </div>
          </>

        ) : view === 'student' ? (
          <>
            <BackButton onClick={goBack} />

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#05000F',
                  border: '1.5px solid rgba(150,90,255,0.55)',
                  boxShadow: '0 0 14px rgba(130,60,240,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A070E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#EEEEFF', marginBottom: 8 }}>Check your email</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                  We sent a sign-in link to<br />
                  <span style={{ color: '#EEEEFF', fontWeight: 600 }}>{email}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Heading */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#EEEEFF', marginBottom: 6 }}>Join as a Student</div>
                  <div style={{ fontSize: 14, color: '#888' }}>Sign in or create your account</div>
                </div>

                {/* Google button */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#111',
                    fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    color: '#EEEEFF', marginBottom: 12,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: 12, color: '#555' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    className="text-input"
                    type="email"
                    placeholder="your@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#EEEEFF', borderRadius: 14, padding: '15px',
                      fontSize: 15,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '15px', borderRadius: 14, fontSize: 15,
                      fontWeight: 700, cursor: 'pointer', border: 'none',
                      background: 'linear-gradient(to right, #3B1578, #6D28D9)',
                      color: '#fff', opacity: loading ? 0.6 : 1,
                      boxShadow: '0 4px 16px rgba(109,40,217,0.25)',
                    }}
                  >
                    Send magic link
                  </button>
                </form>
              </>
            )}

            <div style={{ marginTop: 24, fontSize: 11, color: '#555', textAlign: 'center' }}>
              By continuing you agree to Sphera's community guidelines.
            </div>
          </>

        ) : (
          <>
            <BackButton onClick={goBack} />
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(83,74,183,0.15)',
                border: '1.5px solid rgba(83,74,183,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <BuildingIcon size={26} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#EEEEFF', marginBottom: 10 }}>Register your organization</div>
              <div style={{ fontSize: 14, color: '#5A4A7A', lineHeight: 1.6 }}>Org signup coming soon.</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#555', textAlign: 'center' }}>
              By continuing you agree to Sphera's community guidelines.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AccountCard({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#000',
        cursor: 'pointer',
        padding: '20px 15px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 215,
      }}
    >
      {/* Atmospheric glow top of card */}
      <div style={{
        position: 'absolute',
        top: -10, left: '-10%',
        width: '120%', height: '55%',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(100,35,210,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 60, height: 60,
        borderRadius: '50%',
        border: '1.5px solid rgba(150,90,255,0.55)',
        background: '#05000F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
        marginBottom: 'auto',
        boxShadow: '0 0 14px rgba(130,60,240,0.35), inset 0 0 10px rgba(80,30,180,0.2)',
      }}>
        {icon}
      </div>

      {/* Text + arrow */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative', zIndex: 1,
        marginTop: 20,
        gap: 10,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF', lineHeight: 1.25, marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{sub}</div>
        </div>
        <div style={{
          width: 58, height: 32,
          alignSelf: 'flex-end',
          borderRadius: 999,
          background: 'linear-gradient(to right, rgba(40,15,100,0.5), rgba(120,70,240,0.45))',
          border: '1px solid rgba(140,80,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="14" viewBox="0 0 28 14" fill="none" stroke="#C0A0F8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 7h22M17 1l7 6-7 6"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

function PersonIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A070E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function BuildingIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A070E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="12" rx="2"/>
      <path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/>
      <line x1="9" y1="14" x2="9.01" y2="14"/>
      <line x1="12" y1="14" x2="12.01" y2="14"/>
      <line x1="15" y1="14" x2="15.01" y2="14"/>
      <line x1="9" y1="18" x2="9.01" y2="18"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
      <line x1="15" y1="18" x2="15.01" y2="18"/>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
