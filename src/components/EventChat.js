import React, { useState, useEffect, useRef } from 'react';
import { getGroupMessages, sendGroupMessage, subscribeToGroupMessages, isSupabaseConfigured } from '../lib/supabaseClient';
import './HomeFeed.css';

const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function EventChat({ event, user, profile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const channelId = event?.id ? `event-${event.id}` : null;
  const senderName = profile?.name || profile?.username || user?.email || 'Unknown';
  const useSupabase = isSupabaseConfigured() && !!channelId;

  useEffect(() => {
    if (!useSupabase) return;
    let cancelled = false;
    const fetch = () => getGroupMessages(channelId).then(msgs => { if (!cancelled) setMessages(msgs); });
    fetch();
    const interval = setInterval(fetch, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [channelId, useSupabase]);

  useEffect(() => {
    if (!useSupabase) return;
    return subscribeToGroupMessages(channelId, (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
  }, [channelId, useSupabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!event) return null;

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    if (useSupabase) {
      setSending(true);
      const msg = await sendGroupMessage(channelId, text, senderName);
      setSending(false);
      if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    } else {
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        sender: senderName,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userId: user?.id,
      }]);
    }
  }

  const attendeeCount = (event.attendees || []).length;

  const grouped = [];
  messages.forEach(msg => {
    const last = grouped[grouped.length - 1];
    const lastMsg = last?.[last.length - 1];
    const cont = lastMsg && lastMsg.userId === msg.userId &&
      msg.createdAt && lastMsg.createdAt &&
      (new Date(msg.createdAt) - new Date(lastMsg.createdAt)) < 5 * 60 * 1000;
    if (cont) last.push(msg);
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
          <div style={{ textAlign: 'center', padding: '0 80px' }}>
            <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.25 }}>{event.title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8888AA' }}>
              {attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'}
            </p>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555577', fontSize: 14, marginTop: 40 }}>
              No messages yet. Start the conversation!
            </div>
          ) : grouped.map(grp => {
            const isMe = grp[0].userId === user?.id;
            const displayName = isMe ? (profile?.name || profile?.username || 'You') : (grp[0].sender || 'Unknown');
            const initials = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
            const color = isMe ? 'var(--purple)' : avatarColor(grp[0].sender || '');
            const lastMsg = grp[grp.length - 1];
            return (
              <div key={grp[0].id} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{displayName}</span>
                    <span style={{ fontSize: 11, color: '#555577' }}>{lastMsg.time}</span>
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
            placeholder="Message the event chat…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1 }}
          />
          <button
            className="join"
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            style={{ borderRadius: 12, padding: '10px 18px', opacity: (!draft.trim() || sending) ? 0.5 : 1 }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>

      </div>
    </main>
  );
}
