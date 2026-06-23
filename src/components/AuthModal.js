import React, { useState } from 'react';
import { isSupabaseConfigured, signInWithOtp, signInWithProvider } from '../lib/supabaseClient';
import './HomeFeed.css';

export default function AuthModal({ onClose, message = 'Sign in to continue' }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleGoogle() {
    await signInWithProvider('google');
    // triggers OAuth redirect; modal closes naturally
  }

  async function handleEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    await signInWithOtp(email.trim());
    setSent(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ padding: 24, textAlign: 'center', position: 'relative' }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', fontSize: 22,
            color: '#aaa', cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-0.5px' }}>Rally</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Experiences are better shared</div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: '#111' }}>{message}</div>

        {!configured ? (
          <div style={{ color: '#888', fontSize: 13, padding: 12, background: '#F7F7F7', borderRadius: 10 }}>
            Sign-in requires Supabase to be configured.<br />
            Add <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> to your .env file.
          </div>
        ) : sent ? (
          <div style={{ color: 'var(--teal)', fontWeight: 600, padding: 14, background: 'var(--light-teal)', borderRadius: 10, fontSize: 14 }}>
            Check your email for a sign-in link.
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogle}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                border: '2px solid #E8E8E8', background: '#fff',
                fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px', color: '#ccc', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#EEE' }} />
              or
              <div style={{ flex: 1, height: 1, background: '#EEE' }} />
            </div>

            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="text-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <button type="submit" className="join" style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 15 }}>
                Send magic link
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: '#ccc' }}>
          By continuing you agree to Rally's community guidelines.
        </div>
      </div>
    </div>
  );
}
