import React, { useState, useEffect, useRef } from 'react';
import { getGroupMessages, sendGroupMessage, subscribeToGroupMessages, isSupabaseConfigured } from '../lib/supabaseClient';
import './HomeFeed.css';

export default function GroupChat({ activeTab = 'group-chat', onNavigate = () => {}, group, user, profile }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const groupId = group?.id;
  const senderName = profile?.name || profile?.username || user?.email || 'Unknown';
  const useSupabase = isSupabaseConfigured() && groupId;

  // Load messages on mount and poll every 4 seconds as a reliable fallback
  useEffect(() => {
    if (!useSupabase) return;
    let cancelled = false;
    const fetchMessages = () =>
      getGroupMessages(groupId).then(msgs => {
        if (!cancelled) setMessages(msgs);
      });
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [groupId, useSupabase]);

  // Real-time subscription for instant delivery on top of polling
  useEffect(() => {
    if (!useSupabase) return;
    const unsub = subscribeToGroupMessages(groupId, (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    });
    return unsub;
  }, [groupId, useSupabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!group) {
    return (
      <main className="feed-root">
        <header className="feed-header"><h1>Group chat not found</h1></header>
        <div className="card">This group chat could not be loaded.</div>
        <button className="nav-btn" onClick={() => onNavigate('groups')}>Back</button>
      </main>
    );
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');

    if (useSupabase) {
      setSending(true);
      const msg = await sendGroupMessage(groupId, text, senderName);
      setSending(false);
      if (msg) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
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

  return (
    <main className="feed-root">
      <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 40, flexShrink: 0 }}>
          <button
            onClick={() => onNavigate('group')}
            style={{
              position: 'absolute', left: 0,
              background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
              padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 20, color: '#111' }}>{group.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{group.members?.length || 0} members</p>
          </div>
        </header>

        {/* Message thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 32 }}>
              No messages yet. Say hello!
            </div>
          ) : (
            (() => {
              // Pre-group consecutive messages from same user within 2 minutes
              const groups = [];
              messages.forEach((msg) => {
                const last = groups[groups.length - 1];
                const lastMsg = last?.[last.length - 1];
                const isContinuation = lastMsg &&
                  lastMsg.userId === msg.userId &&
                  msg.createdAt && lastMsg.createdAt &&
                  (new Date(msg.createdAt) - new Date(lastMsg.createdAt)) < 2 * 60 * 1000;
                if (isContinuation) last.push(msg);
                else groups.push([msg]);
              });

              return groups.map((group) => {
                const isMe = group[0].userId === user?.id;
                const lastMsg = group[group.length - 1];
                return (
                  <div key={group[0].id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    border: `1.5px solid ${isMe ? 'var(--purple)' : '#CCC'}`,
                    borderRadius: 8,
                    padding: '4px 8px',
                    maxWidth: '85%',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', marginBottom: 2 }}>{isMe ? 'Me' : group[0].sender}</span>
                    {group.map((msg) => (
                      <div key={msg.id} style={{ fontSize: 14, lineHeight: 1.5, color: '#111' }}>
                        {msg.text}
                      </div>
                    ))}
                    <span style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{lastMsg.time}</span>
                  </div>
                );
              });
            })()
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, flexShrink: 0 }}>
          <input
            className="text-input"
            placeholder="Message the group…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
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

      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span><span className="nav-btn-label">Home</span>
        </button>
        <button className={`nav-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span><span className="nav-btn-label">Explore</span>
        </button>
        <button className={`nav-btn ${activeTab === 'post' ? 'active' : ''}`} onClick={() => onNavigate('post')}>
          <span className="nav-btn-icon">➕</span><span className="nav-btn-label">Create</span>
        </button>
        <button className={`nav-btn ${activeTab === 'groups' || activeTab === 'group' || activeTab === 'group-chat' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
