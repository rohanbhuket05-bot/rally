import React, { useState, useEffect } from 'react';
import { getFriendships } from '../lib/supabaseClient';
import './HomeFeed.css';

const TYPE_LABELS = { club: 'Club / Org', friend: 'Friend Group', event: 'Event Rally' };
const TYPE_COLORS = {
  club:   { color: 'var(--purple)', bg: 'var(--light-purple)' },
  friend: { color: 'var(--pink)',   bg: 'var(--light-pink)' },
  event:  { color: 'var(--teal)',   bg: 'var(--light-teal)' },
};

const AVATAR_COLORS = ['#534AB7','#D4537E','#1D9E75','#EF9F27','#667EEA','#9B59B6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function GroupDetails({
  activeTab = 'group',
  onNavigate = () => {},
  group,
  onUpdateGroup,
  messages = [],
  onSendMessage,
  onOpenChat,
  onBack,
  user,
}) {
  const [inviteInput, setInviteInput] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (showInvite && user) {
      getFriendships(user.id).then(setFriends);
    }
  }, [showInvite, user]);

  if (!group) {
    return (
      <main className="feed-root">
        <header className="feed-header"><h1>Group not found</h1></header>
        <div className="card">This group could not be loaded.</div>
        <button className="nav-btn" onClick={onBack}>← Back</button>
      </main>
    );
  }

  const { name, description, type = 'club', privacy = 'public', members = [], icebreaker, eventTitle, events: groupEvents = [] } = group;
  const { color, bg } = TYPE_COLORS[type] || TYPE_COLORS.club;

  function handleInvite() {
    const n = inviteInput.trim();
    if (!n || members.some(m => m.name.toLowerCase() === n.toLowerCase())) { setInviteInput(''); return; }
    const initials = n.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const updated = { ...group, members: [...members, { name: n, initials, color: avatarColor(n), role: 'member' }] };
    onUpdateGroup && onUpdateGroup(updated);
    setInviteInput('');
  }

  function handleAddFriend(friend) {
    const displayName = friend.other?.name || friend.other?.username || '';
    if (!displayName || members.some(m => m.name.toLowerCase() === displayName.toLowerCase())) return;
    const initials = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const updated = { ...group, members: [...members, { name: displayName, initials, color: avatarColor(displayName), role: 'member' }] };
    onUpdateGroup && onUpdateGroup(updated);
  }

  function handleRemoveMember(memberName) {
    const myName = localStorage.getItem('rally_name') || localStorage.getItem('rally_username') || '';
    const me = members.find(m => m.role === 'admin');
    if (me?.name !== myName) return; // only admin can remove
    const updated = { ...group, members: members.filter(m => m.name !== memberName) };
    onUpdateGroup && onUpdateGroup(updated);
  }

  return (
    <main className="feed-root" style={{ overflowY: 'auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginTop: 2,
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="category-pill" style={{ background: bg, color }}>{TYPE_LABELS[type]}</span>
            {privacy !== 'public' && (
              <span className="category-pill" style={{ background: '#F5F5F5', color: '#777' }}>{privacy === 'private' ? 'Private' : 'Friends Only'}</span>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#111', lineHeight: 1.2 }}>{name}</h2>
        </div>
      </header>

      {/* About */}
      {(description || eventTitle || icebreaker) && (
        <div className="card" style={{ marginBottom: 12 }}>
          {description && <p style={{ margin: '0 0 10px', color: '#333', fontSize: 14, lineHeight: 1.5 }}>{description}</p>}
          {eventTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--light-teal)', borderRadius: 8, marginBottom: icebreaker ? 10 : 0 }}>
              <span>🎯</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>{eventTitle}</span>
            </div>
          )}
          {icebreaker && (
            <div style={{ padding: '10px', background: 'var(--light-purple)', borderRadius: 8, marginTop: description || eventTitle ? 10 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Icebreaker</div>
              <div style={{ fontSize: 13, color: '#333' }}>{icebreaker}</div>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Members</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge" style={{ background: color }}>{members.length}</span>
            <button
              className="edit-btn"
              onClick={() => setShowInvite(s => !s)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              + Invite
            </button>
          </div>
        </div>

        {showInvite && (
          <div style={{ marginBottom: 14, padding: 12, background: 'rgba(83,74,183,0.05)', borderRadius: 10, border: '1px solid rgba(83,74,183,0.12)' }}>
            {/* Friends list */}
            {friends.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Friends</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(f => {
                    const displayName = f.other?.name || f.other?.username || '';
                    const alreadyIn = members.some(m => m.name.toLowerCase() === displayName.toLowerCase());
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ backgroundColor: avatarColor(displayName), color: '#fff', marginLeft: 0, flexShrink: 0, width: 34, height: 34, fontSize: 13 }}>
                          {displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
                          {f.other?.username && <div style={{ fontSize: 12, color: '#888' }}>@{f.other.username}</div>}
                        </div>
                        {alreadyIn
                          ? <span style={{ fontSize: 12, color: '#aaa' }}>Added</span>
                          : <button className="join" style={{ borderRadius: 8, padding: '5px 12px', fontSize: 13 }} onClick={() => handleAddFriend(f)}>Add</button>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Manual name entry */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Add by name</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="text-input"
                placeholder="Enter a name"
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="join" onClick={handleInvite} style={{ flexShrink: 0, borderRadius: 10 }}>Add</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m, i) => {
            const mc = m.color && m.color !== '#FFFFFF' ? m.color : avatarColor(m.name);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ backgroundColor: mc, color: '#fff', marginLeft: 0, flexShrink: 0 }}>
                  {m.initials || m.name?.[0] || '?'}
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.name}</span>
                {m.role === 'admin' && (
                  <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11 }}>Admin</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events (hosted by this group) */}
      {groupEvents.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>Upcoming events</h3>
          <div className="cards">
            {groupEvents.map((ev) => (
              <div key={ev.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700 }}>{ev.title}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{ev.date} · {ev.location}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Group chat */}
      <div
        className="group-chat-panel group-chat-preview"
        onClick={onOpenChat}
        style={{ marginBottom: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>💬 Group chat</h3>
          <span className="category-pill" style={{ background: 'var(--light-teal)', color: 'var(--teal)' }}>{messages.length} messages</span>
        </div>
        {messages.length > 0 ? (
          <div className="message-thread" style={{ marginTop: 12 }}>
            {messages.slice(-2).map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.me ? 'me' : ''}`}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{msg.sender}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>{msg.time}</span>
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>No messages yet. Tap to open chat.</div>
        )}
      </div>

      <button className="join" onClick={onOpenChat} style={{ width: '100%', padding: '12px', borderRadius: 12, marginBottom: 12, display: 'block', fontSize: 15 }}>
        Open group chat
      </button>

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
        <button className={`nav-btn ${activeTab === 'groups' || activeTab === 'group' ? 'active' : ''}`} onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span>
        </button>
        <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
