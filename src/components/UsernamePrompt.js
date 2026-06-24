import React, { useState, useEffect } from 'react';
import { checkUsernameAvailable } from '../lib/supabaseClient';
import { validateUsername } from '../lib/usernameValidation';
import './HomeFeed.css';

export default function UsernamePrompt({ user, onComplete }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) { setStatus('idle'); setError(null); return; }
    const { valid, error: err } = validateUsername(username);
    if (!valid) { setStatus('invalid'); setError(err); return; }
    setStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(username.toLowerCase(), user?.id);
      setStatus(available ? 'available' : 'taken');
      setError(available ? null : 'Username already taken');
    }, 400);
    return () => clearTimeout(timer);
  }, [username, user?.id]);

  function handleSubmit(e) {
    e.preventDefault();
    if (status !== 'available') return;
    onComplete(username.toLowerCase());
  }

  const canSubmit = status === 'available';

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-0.5px', marginBottom: 4 }}>Rally</div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Experiences are better shared</div>

        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#111' }}>Pick your username</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666', lineHeight: 1.5 }}>
          This is how people find you on Rally. You can change it later.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: '#aaa', fontSize: 15, pointerEvents: 'none',
            }}>@</span>
            <input
              className="text-input"
              placeholder="yourhandle"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                paddingLeft: 28,
                borderColor: status === 'available' ? 'var(--teal)'
                  : status === 'invalid' || status === 'taken' ? '#E74C3C'
                  : undefined,
              }}
            />
          </div>

          <div style={{ minHeight: 18, fontSize: 12, textAlign: 'left' }}>
            {status === 'checking' && <span style={{ color: '#999' }}>Checking availability...</span>}
            {status === 'available' && <span style={{ color: 'var(--teal)' }}>✓ Available</span>}
            {(status === 'taken' || status === 'invalid') && <span style={{ color: '#E74C3C' }}>{error}</span>}
            {status === 'idle' && username === '' && <span style={{ color: '#bbb' }}>Min 3 characters, at least 3 letters</span>}
          </div>

          <button
            type="submit"
            className="join"
            disabled={!canSubmit}
            style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, opacity: canSubmit ? 1 : 0.45 }}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
