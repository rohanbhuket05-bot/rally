import React, { useState, useEffect, useRef } from 'react';
import { getDmMessages, sendDmMessage, subscribeToDmMessages } from '../lib/supabaseClient';
import './HomeFeed.css';

const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function DmChat({ dmId, otherUser = {}, user, profile, onBack = () => {} }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!dmId) return;
    let cancelled = false;
    const fetch = () => getDmMessages(dmId).then(msgs => { if (!cancelled) setMessages(msgs); });
    fetch();
    const interval = setInterval(fetch, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [dmId]);

  useEffect(() => {
    if (!dmId) return;
    return subscribeToDmMessages(dmId, msg => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
  }, [dmId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    const msg = await sendDmMessage(dmId, text);
    setSending(false);
    if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
  }

  const otherName = otherUser.name || otherUser.username || 'Unknown';
  const otherInitials = otherName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  const grouped = [];
  messages.forEach(msg => {
    const last = grouped[grouped.length - 1];
    const lastMsg = last?.[last.length - 1];
    const isContinuation = lastMsg && lastMsg.userId === msg.userId &&
      msg.createdAt && lastMsg.createdAt &&
      (new Date(msg.createdAt) - new Date(lastMsg.createdAt)) < 5 * 60 * 1000;
    if (isContinuation) last.push(msg);
    else grouped.push([msg]);
  });

  return (
    <main className="feed-root">
      <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 40, flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ position: 'absolute', left: 0, background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt={otherName} referrerPolicy="no-referrer"
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(otherName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {otherInitials}
              </div>
            )}
            <span style={{ fontWeight: 700, fontSize: 15 }}>{otherName}</span>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555577', fontSize: 14, marginTop: 40 }}>
              No messages yet. Say hi!
            </div>
          ) : grouped.map(grp => {
            const isMe = grp[0].userId === user?.id;
            const displayName = isMe ? (profile?.name || 'You') : (grp[0].sender || otherName);
            const initials = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
            const color = isMe ? 'var(--purple)' : avatarColor(grp[0].sender || '');
            const avatarUrl = isMe ? profile?.avatar_url : (grp[0].avatarUrl || otherUser.avatar_url);
            return (
              <div key={grp[0].id} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-start' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{displayName}</span>
                    <span style={{ fontSize: 11, color: '#555577' }}>{grp[grp.length - 1].time}</span>
                  </div>
                  {grp.map(msg => (
                    <div key={msg.id} style={{ fontSize: 14, color: '#CCCCEE', lineHeight: 1.6, textAlign: 'left' }}>
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, flexShrink: 0 }}>
          <input
            className="text-input"
            placeholder={`Message ${otherName}…`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            style={{ background: 'var(--purple)', border: 'none', borderRadius: 12, padding: '10px 16px', color: '#fff', fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.4, transition: 'opacity 150ms', flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
