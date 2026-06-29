import React, { useState } from 'react';
import { createSpontaneousPost } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import './HomeFeed.css';

const MAX_CHARS = 200;

export default function SpontaneousCompose({ user, profile, onBack, onPosted }) {
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [posting, setPosting] = useState(false);

  const senderName = profile?.name || profile?.username || user?.email || 'Someone';
  const remaining = MAX_CHARS - text.length;
  const initials = getInitials(senderName);

  async function handlePost() {
    if (!text.trim() || posting) return;
    setPosting(true);
    const post = await createSpontaneousPost(text.trim(), location.trim(), senderName, profile?.avatar_url || '');
    setPosting(false);
    if (post) onPosted(post);
  }

  return (
    <main className="feed-root">
      <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer', marginBottom: 20 }}
        >
          ← Back
        </button>
        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#EEEEFF' }}>What's happening?</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#8888AA' }}>Disappears in 4 hours</p>
      </header>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: '16px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EF9F27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#EEEEFF', marginBottom: 8 }}>{senderName}</div>
            <textarea
              autoFocus
              placeholder="Share a quick update, invite people somewhere, or just say what's up..."
              value={text}
              onChange={e => { if (e.target.value.length <= MAX_CHARS) setText(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePost(); }}
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#EEEEFF', fontSize: 16, lineHeight: 1.6, resize: 'none', minHeight: 100, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <input
            placeholder="Add a location (optional)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#CCCCEE', fontSize: 14, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: remaining < 30 ? '#EF9F27' : '#555577', fontWeight: 600 }}>{remaining} left</span>
        <button
          onClick={handlePost}
          disabled={!text.trim() || posting}
          style={{ background: '#EF9F27', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: text.trim() && !posting ? 'pointer' : 'default', opacity: (!text.trim() || posting) ? 0.5 : 1, transition: 'opacity 150ms' }}
        >
          {posting ? '…' : 'Post'}
        </button>
      </div>
    </main>
  );
}
