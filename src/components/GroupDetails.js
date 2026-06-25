import React, { useState, useEffect } from 'react';
import { getFriendships, searchUsersByUsername, sendGroupInvite, getOutgoingGroupInvites, isSupabaseConfigured } from '../lib/supabaseClient';
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

function isUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);
}

// Small green checkmark badge overlay for friend-members
function FriendBadge() {
  return (
    <span style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 14, height: 14, borderRadius: '50%',
      background: '#2ECC71', border: '2px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1,
    }}>✓</span>
  );
}

export default function GroupDetails({
  activeTab = 'group',
  onNavigate = () => {},
  group,
  isPreview = false,
  onUpdateGroup,
  onDeleteGroup,
  messages = [],
  onSendMessage,
  onOpenChat,
  onBack,
  user,
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState(new Set());
  const [inviting, setInviting] = useState(new Set());
  const [inviteError, setInviteError] = useState('');

  // Load friends on mount (for member checkmarks + invite panel)
  useEffect(() => {
    if (user) getFriendships(user.id).then(setFriends);
  }, [user]);

  // Load outgoing invites when invite panel opens
  useEffect(() => {
    if (!showInvite || !group || !isUUID(group.id)) return;
    getOutgoingGroupInvites(group.id).then(ids => setPendingInviteIds(new Set(ids)));
    setSearchQuery('');
    setSearchResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInvite, group?.id]);

  // Debounced username search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await searchUsersByUsername(searchQuery.trim(), user?.id);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, user?.id]);

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

  const isAdmin = !isPreview && !!user && (
    group.createdBy === user.id ||
    members.some(m => m.user_id === user.id && m.role === 'admin')
  );

  // Build sets for quick lookups
  const memberIds = new Set(members.map(m => m.user_id).filter(Boolean));
  const memberNames = new Set(members.map(m => m.name?.toLowerCase()).filter(Boolean));
  const friendIds = new Set(friends.map(f => f.other?.id).filter(Boolean));
  const friendNames = new Set(friends.map(f => (f.other?.name || f.other?.username || '').toLowerCase()).filter(Boolean));

  function isMemberFriend(member) {
    if (member.user_id) return friendIds.has(member.user_id);
    return friendNames.has(member.name?.toLowerCase() || '');
  }

  function isMember(profile) {
    if (profile.id && memberIds.size > 0) return memberIds.has(profile.id);
    const n = (profile.name || profile.username || '').toLowerCase();
    return memberNames.has(n);
  }

  async function handleSendInvite(profileId, displayName) {
    if (!group || !isUUID(group.id) || !profileId) return;
    setInviting(s => new Set([...s, profileId]));
    setInviteError('');
    try {
      await sendGroupInvite(group.id, profileId);
      setPendingInviteIds(s => new Set([...s, profileId]));
    } catch (e) {
      setInviteError(e.message || 'Failed to send invite. Check console for details.');
    }
    setInviting(s => { const next = new Set(s); next.delete(profileId); return next; });
  }

  function handleRemoveMember(memberName) {
    if (!isAdmin) return;
    const updated = { ...group, members: members.filter(m => m.name !== memberName) };
    onUpdateGroup && onUpdateGroup(updated);
  }

  // Filter non-member friends for the invite panel
  const nonMemberFriends = friends.filter(f => !isMember({ id: f.other?.id, name: f.other?.name, username: f.other?.username }));
  const nonMemberSearchResults = searchResults.filter(r => !isMember(r));
  const canInvite = !isPreview && isUUID(group.id) && isSupabaseConfigured();

  return (
    <main className="feed-root">
      <div className="scroll-area">
      {/* Header */}
      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 40 }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute', left: 0,
            background: 'rgba(83,74,183,0.1)', border: 'none', borderRadius: 10,
            padding: '8px 12px', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 }}>
            <span className="category-pill" style={{ background: bg, color }}>{TYPE_LABELS[type]}</span>
            {isPreview && (
              <span className="category-pill" style={{ background: 'var(--light-amber)', color: 'var(--amber)' }}>Preview</span>
            )}
            {privacy !== 'public' && (
              <span className="category-pill" style={{ background: '#F5F5F5', color: '#777' }}>{privacy === 'private' ? 'Private' : 'Friends Only'}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 22, color: '#111', lineHeight: 1.2 }}>{name}</h2>
            {isAdmin && onDeleteGroup && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#E74C3C', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                aria-label="Delete group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 3v1H4v2h16V4h-5V3H9zm-2 4l1 13h8l1-13H7zm2 2h2l.5 9H9.5L9 9zm4 0h2l-.5 9h-2L13 9z"/>
                </svg>
              </button>
            )}
          </div>
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
            {canInvite && (
              <button
                className="edit-btn"
                onClick={() => setShowInvite(s => !s)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                {showInvite ? 'Done' : '+ Invite'}
              </button>
            )}
          </div>
        </div>

        {showInvite && canInvite && (
          <div style={{ marginBottom: 14, padding: 12, background: 'rgba(83,74,183,0.05)', borderRadius: 10, border: '1px solid rgba(83,74,183,0.12)' }}>
            {/* Username search */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Search users</div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }}>@</span>
              <input
                className="text-input"
                placeholder="Search by username"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 24 }}
                autoFocus
              />
            </div>
            {searching && <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Searching...</div>}
            {nonMemberSearchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {nonMemberSearchResults.map(result => {
                  const displayName = result.name || result.username;
                  const invited = pendingInviteIds.has(result.id);
                  const loading = inviting.has(result.id);
                  return (
                    <InviteRow
                      key={result.id}
                      displayName={displayName}
                      username={result.username}
                      invited={invited}
                      loading={loading}
                      onInvite={() => handleSendInvite(result.id, displayName)}
                    />
                  );
                })}
              </div>
            )}
            {/* Friends quick-invite */}
            {nonMemberFriends.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Friends</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nonMemberFriends.map(f => {
                    const displayName = f.other?.name || f.other?.username || '';
                    const invited = f.other?.id ? pendingInviteIds.has(f.other.id) : false;
                    const loading = f.other?.id ? inviting.has(f.other.id) : false;
                    return (
                      <InviteRow
                        key={f.id}
                        displayName={displayName}
                        username={f.other?.username}
                        invited={invited}
                        loading={loading}
                        onInvite={() => handleSendInvite(f.other?.id, displayName)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {inviteError && (
              <div style={{ fontSize: 12, color: '#E74C3C', background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
                ⚠ {inviteError}
              </div>
            )}
            {nonMemberFriends.length === 0 && nonMemberSearchResults.length === 0 && !searching && !searchQuery && (
              <div style={{ fontSize: 13, color: '#999', textAlign: 'center', paddingTop: 4 }}>
                All your friends are already members.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m, i) => {
            const mc = m.color && m.color !== '#FFFFFF' ? m.color : avatarColor(m.name);
            const isFriend = isMemberFriend(m);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div className="avatar" style={{ backgroundColor: mc, color: '#fff', marginLeft: 0 }}>
                    {m.initials || m.name?.[0] || '?'}
                  </div>
                  {isFriend && <FriendBadge />}
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.name}</span>
                {m.role === 'admin'
                  ? <span className="category-pill" style={{ background: 'var(--light-purple)', color: 'var(--purple)', fontSize: 11 }}>Admin</span>
                  : isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(m.name)}
                      style={{ background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', borderRadius: 7, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )
                }
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
      {!isPreview && (
        <>
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
          <button className="join" onClick={onOpenChat} style={{ width: '100%', padding: '12px', borderRadius: 12, marginBottom: 20, display: 'block', fontSize: 15 }}>
            Open group chat
          </button>
        </>
      )}

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, maxWidth: 320, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#111' }}>Delete "{name}"?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', lineHeight: 1.5 }}>
              This will permanently delete the group and all its data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #ddd',
                  background: '#fff', color: '#444', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onDeleteGroup(group.id)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: '#E74C3C', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      </div>{/* end scroll-area */}
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

function InviteRow({ displayName, username, invited, loading, onInvite }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="avatar" style={{ backgroundColor: avatarColor(displayName), color: '#fff', marginLeft: 0, flexShrink: 0, width: 34, height: 34, fontSize: 13 }}>
        {displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
        {username && <div style={{ fontSize: 12, color: '#888' }}>@{username}</div>}
      </div>
      {invited
        ? <span style={{ fontSize: 12, color: '#2ECC71', fontWeight: 600 }}>✓ Invited</span>
        : (
          <button
            className="join"
            style={{ borderRadius: 8, padding: '5px 12px', fontSize: 13, opacity: loading ? 0.6 : 1 }}
            onClick={onInvite}
            disabled={loading}
          >
            {loading ? '...' : 'Invite'}
          </button>
        )
      }
    </div>
  );
}
