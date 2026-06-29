import React, { useState, useEffect } from 'react';
import { avatarColor } from '../lib/avatarColor';
import { getInitials } from '../lib/utils';

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function StoryViewer({ posts, startIndex = 0, user, onClose, onDelete }) {
  const [index, setIndex] = useState(startIndex);
  const post = posts[index];

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!post) return null;

  const isOwn = post.userId === user?.id;
  const initials = getInitials(post.senderName);
  const color = avatarColor(post.senderName || '');

  function prev(e) { e.stopPropagation(); setIndex(i => Math.max(0, i - 1)); }
  function next(e) { e.stopPropagation(); if (index < posts.length - 1) setIndex(i => i + 1); else onClose(); }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#0A0A0F', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4, padding: '14px 16px 0' }}>
        {posts.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < index ? '#fff' : i === index ? '#fff' : 'rgba(255,255,255,0.25)' }}>
            {i === index && <div style={{ height: '100%', width: '100%', background: '#fff', borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }} onClick={e => e.stopPropagation()}>
        {post.avatarUrl ? (
          <img src={post.avatarUrl} alt={post.senderName} referrerPolicy="no-referrer" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #EF9F27', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', border: '2px solid #EF9F27', flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#EEEEFF' }}>{isOwn ? 'You' : post.senderName}</div>
          <div style={{ fontSize: 12, color: '#8888AA' }}>{timeAgo(post.createdAt)}</div>
        </div>
        {isOwn && (
          <button
            onClick={() => { onDelete(post.id); onClose(); }}
            style={{ background: 'rgba(255,80,80,0.12)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#FF6B6B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EEEEFF', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* Story content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px 60px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.4, marginBottom: 20 }}>
          {post.text}
        </div>
        {post.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF9F27" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{ fontSize: 16, color: '#AAAACC' }}>{post.location}</span>
          </div>
        )}
      </div>

      {/* Tap zones for prev/next */}
      <div style={{ position: 'absolute', inset: '60px 0 0 0', display: 'flex' }}>
        <div style={{ flex: 1 }} onClick={prev} />
        <div style={{ flex: 1 }} onClick={next} />
      </div>
    </div>
  );
}
